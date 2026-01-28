// frontend/app.js — minimal, single-file frontend for index.html
const API_URL = 'http://localhost:8000';

// Elements (may be missing depending on page state; guard all accesses)
const loginForm = document.getElementById('loginForm');
const authStatus = document.getElementById('authStatus');
const logoutBtn = document.getElementById('logoutBtn');
const createSection = document.getElementById('create');
const blogsSection = document.getElementById('blogs');
const blogsList = document.getElementById('blogsList');
const createForm = document.getElementById('createForm');
const refreshBtn = document.getElementById('refreshBtn');
const postBtn = document.getElementById('postBtn');
const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
const searchSection = document.getElementById('search');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

function token(){ return localStorage.getItem('access_token'); }
function setToken(t){ localStorage.setItem('access_token', t); }
function clearToken(){ localStorage.removeItem('access_token'); }

function escapeHtml(s){ return String(s)
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;'); }

async function fetchBlogs(){
  if(!blogsList) return;
  blogsList.textContent = 'Loading...';
  try{
    const res = await fetch(`${API_URL}/blog_user`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if(!res.ok) throw new Error('Failed to fetch blogs (check backend/CORS)');
    const data = await res.json();
    if(!data || data.length === 0){ blogsList.textContent = 'No blogs found.'; return; }
    blogsList.innerHTML = data.map(b=>`
      <article class="blog">
        <h3>${escapeHtml(b.title)}</h3>
        <div class="meta">${b.created_at}</div>
        <p>${escapeHtml(b.content)}</p>
        <div class="actions">
          <button data-id="${b.id}" class="btn-update">Update</button>
          <button data-id="${b.id}" class="btn-delete">Delete</button>
          <button data-id="${b.id}" class="btn-undo">Undo</button>
        </div>
      </article>`).join('\n');
    attachBlogButtons();
  }catch(err){ blogsList.textContent = 'Error: '+err.message; }
}

function attachBlogButtons(){
  document.querySelectorAll('.btn-delete').forEach(btn=>btn.addEventListener('click', async e=>{
    const id = e.currentTarget.dataset.id; if(!confirm('Delete blog '+id+'?')) return;
    try{ const r = await fetch(`${API_URL}/delete/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token()}`}}); if(!r.ok) throw new Error(await r.text()); alert('Deleted'); fetchBlogs(); }catch(er){ alert('Error: '+er.message); }
  }));

  document.querySelectorAll('.btn-undo').forEach(btn=>btn.addEventListener('click', async e=>{
    const id = e.currentTarget.dataset.id; try{ const r = await fetch(`${API_URL}/undo/${id}`, { method:'PATCH', headers:{'Authorization':`Bearer ${token()}`}}); if(!r.ok) throw new Error(await r.text()); alert('Undo applied'); fetchBlogs(); }catch(er){ alert('Error: '+er.message); }
  }));

  document.querySelectorAll('.btn-update').forEach(btn=>btn.addEventListener('click', e=>{
    const id = e.currentTarget.dataset.id; const art = e.currentTarget.closest('article');
    const t = art.querySelector('h3').textContent; const p = art.querySelector('p').textContent;
    const idEl = document.getElementById('blogId'); if(idEl) idEl.value = id;
    const tEl = document.getElementById('title'); if(tEl) tEl.value = t;
    const cEl = document.getElementById('content'); if(cEl) cEl.value = p;
    if(postBtn){ postBtn.dataset.mode = 'update'; postBtn.textContent = 'Update'; }
    if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'inline-block';
  }));
}

if(refreshBtn) refreshBtn.addEventListener('click', fetchBlogs);

if(createForm) createForm.addEventListener('submit', async evt=>{
  evt.preventDefault();
  const id = parseInt(document.getElementById('blogId').value,10) || 0;
  const title = document.getElementById('title').value; const content = document.getElementById('content').value;
  const now = new Date().toISOString(); const body = { id, title, content, created_at: now, updated_at: now };
  try{
    let res;
    if(postBtn && postBtn.dataset.mode === 'update'){
      res = await fetch(`${API_URL}/update/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`}, body: JSON.stringify(body) });
    } else {
      res = await fetch(`${API_URL}/post`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`}, body: JSON.stringify(body) });
    }
    if(!res.ok){ const txt = await res.text(); throw new Error(txt||'Post failed'); }
    const created = await res.json(); const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Posted — id: '+created.id;
    fetchBlogs(); if(postBtn){ postBtn.dataset.mode = ''; postBtn.textContent = 'Post'; } if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'none'; if(createForm) createForm.reset();
  }catch(err){ const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Error: '+err.message }
});

if(cancelUpdateBtn) cancelUpdateBtn.addEventListener('click', ()=>{ if(postBtn){ postBtn.dataset.mode=''; postBtn.textContent='Post'; } if(cancelUpdateBtn) cancelUpdateBtn.style.display='none'; if(createForm) createForm.reset(); });

if(searchBtn) searchBtn.addEventListener('click', async ()=>{
  const q = (searchInput && searchInput.value || '').trim(); if(!q){ if(searchResults) searchResults.textContent='Enter id or title to search'; return }
  if(searchResults) searchResults.textContent = 'Searching...';
  try{
    if(/^\d+$/.test(q)){
      const r = await fetch(`${API_URL}/blog_by_id/${q}`); if(!r.ok) throw new Error(await r.text()); const b = await r.json(); if(searchResults) searchResults.innerHTML = `<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p></article>`; attachBlogButtons(); return;
    }
    const r2 = await fetch(`${API_URL}/title/${encodeURIComponent(q)}`); if(!r2.ok) throw new Error(await r2.text()); const list = await r2.json(); if(!list || list.length===0){ if(searchResults) searchResults.textContent='No results'; return }
    if(searchResults) searchResults.innerHTML = list.map(b=>`<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p></article>`).join('\n'); attachBlogButtons();
  }catch(err){ if(searchResults) searchResults.textContent = 'Error: '+err.message }
});

if(logoutBtn) logoutBtn.addEventListener('click', ()=>{ clearToken(); location.reload(); });

if(loginForm) loginForm.addEventListener('submit', async evt=>{
  evt.preventDefault(); if(!authStatus) return; authStatus.textContent = '';
  const username = document.getElementById('username').value; const password = document.getElementById('password').value;
  try{
    const body = new URLSearchParams({username, password});
    const res = await fetch(`${API_URL}/login`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
    if(!res.ok) throw new Error('Login failed');
    const data = await res.json(); setToken(data.access_token); authStatus.textContent = 'Logged in';
    if(createSection) createSection.style.display='block'; if(searchSection) searchSection.style.display='block'; if(blogsSection) blogsSection.style.display='block'; if(logoutBtn) logoutBtn.style.display='inline-block'; if(loginForm) loginForm.style.display='none';
    fetchBlogs();
  }catch(e){ authStatus.textContent = 'Login error: '+e.message; }
});

function initUI(){
  if(token()){
    if(createSection) createSection.style.display='block'; if(searchSection) searchSection.style.display='block'; if(blogsSection) blogsSection.style.display='block'; if(logoutBtn) logoutBtn.style.display='inline-block'; if(loginForm) loginForm.style.display='none'; fetchBlogs();
  } else {
    if(createSection) createSection.style.display='none'; if(searchSection) searchSection.style.display='none'; if(blogsSection) blogsSection.style.display='none'; if(logoutBtn) logoutBtn.style.display='none'; if(loginForm) loginForm.style.display='block';
  }
}

initUI();
// Clean frontend script matching frontend/index.html
const API_URL = 'http://localhost:8000';

const loginForm = document.getElementById('loginForm');
const authStatus = document.getElementById('authStatus');
const logoutBtn = document.getElementById('logoutBtn');
const createSection = document.getElementById('create');
const blogsSection = document.getElementById('blogs');
const blogsList = document.getElementById('blogsList');
const createForm = document.getElementById('createForm');
const refreshBtn = document.getElementById('refreshBtn');
const postBtn = document.getElementById('postBtn');
const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
const searchSection = document.getElementById('search');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

function token(){ return localStorage.getItem('access_token'); }
function setToken(t){ localStorage.setItem('access_token', t); }
function clearToken(){ localStorage.removeItem('access_token'); }

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

async function fetchBlogs(){
  if(!blogsList) return;
  blogsList.textContent = 'Loading...';
  try{
    const res = await fetch(`${API_URL}/blog_user`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if(!res.ok) throw new Error('Failed to fetch blogs');
    const data = await res.json();
    if(!data || data.length===0){ blogsList.textContent = 'No blogs found.'; return; }
    blogsList.innerHTML = data.map(b=>`<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p><div><button data-id="${b.id}" class="btn-update">Update</button> <button data-id="${b.id}" class="btn-delete">Delete</button> <button data-id="${b.id}" class="btn-undo">Undo</button></div></article>`).join('\n');
    attachBlogButtons();
  }catch(err){ blogsList.textContent = 'Error: '+err.message; }
}

function attachBlogButtons(){
  document.querySelectorAll('.btn-delete').forEach(b=>b.addEventListener('click', async e=>{
    const id = e.currentTarget.dataset.id; if(!confirm('Delete blog '+id+'?')) return;
    try{ const r = await fetch(`${API_URL}/delete/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token()}`}}); if(!r.ok) throw new Error(await r.text()); alert('Deleted'); fetchBlogs(); }catch(er){ alert('Error: '+er.message) }
  }));

  document.querySelectorAll('.btn-undo').forEach(b=>b.addEventListener('click', async e=>{
    const id = e.currentTarget.dataset.id; try{ const r = await fetch(`${API_URL}/undo/${id}`, { method:'PATCH', headers:{'Authorization':`Bearer ${token()}`}}); if(!r.ok) throw new Error(await r.text()); alert('Undo applied'); fetchBlogs(); }catch(er){ alert('Error: '+er.message) }
  }));

  document.querySelectorAll('.btn-update').forEach(b=>b.addEventListener('click', e=>{
    const id = e.currentTarget.dataset.id; const art = e.currentTarget.closest('article');
    const t = art.querySelector('h3').textContent; const p = art.querySelector('p').textContent;
    const idEl = document.getElementById('blogId'); if(idEl) idEl.value = id;
    const tEl = document.getElementById('title'); if(tEl) tEl.value = t;
    const cEl = document.getElementById('content'); if(cEl) cEl.value = p;
    if(postBtn){ postBtn.dataset.mode = 'update'; postBtn.textContent = 'Update'; }
    if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'inline-block';
  }));
}

if(refreshBtn) refreshBtn.addEventListener('click', fetchBlogs);

if(createForm) createForm.addEventListener('submit', async evt=>{
  evt.preventDefault();
  const id = parseInt(document.getElementById('blogId').value,10) || 0;
  const title = document.getElementById('title').value; const content = document.getElementById('content').value;
  const now = new Date().toISOString(); const body = { id, title, content, created_at: now, updated_at: now };
  try{
    let res;
    if(postBtn && postBtn.dataset.mode === 'update'){
      res = await fetch(`${API_URL}/update/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`}, body: JSON.stringify(body) });
    } else {
      res = await fetch(`${API_URL}/post`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`}, body: JSON.stringify(body) });
    }
    if(!res.ok){ const txt = await res.text(); throw new Error(txt||'Post failed'); }
    const created = await res.json(); const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Posted — id: '+created.id;
    fetchBlogs(); if(postBtn){ postBtn.dataset.mode = ''; postBtn.textContent = 'Post'; } if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'none'; if(createForm) createForm.reset();
  }catch(err){ const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Error: '+err.message }
});

if(cancelUpdateBtn) cancelUpdateBtn.addEventListener('click', ()=>{ if(postBtn){ postBtn.dataset.mode=''; postBtn.textContent='Post'; } if(cancelUpdateBtn) cancelUpdateBtn.style.display='none'; if(createForm) createForm.reset(); });

if(searchBtn) searchBtn.addEventListener('click', async ()=>{
  const q = (searchInput && searchInput.value || '').trim(); if(!q){ if(searchResults) searchResults.textContent='Enter id or title to search'; return }
  if(searchResults) searchResults.textContent = 'Searching...';
  try{
    if(/^\d+$/.test(q)){
      const r = await fetch(`${API_URL}/blog_by_id/${q}`); if(!r.ok) throw new Error(await r.text()); const b = await r.json(); if(searchResults) searchResults.innerHTML = `<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p></article>`; attachBlogButtons(); return;
    }
    const r2 = await fetch(`${API_URL}/title/${encodeURIComponent(q)}`); if(!r2.ok) throw new Error(await r2.text()); const list = await r2.json(); if(!list || list.length===0){ if(searchResults) searchResults.textContent='No results'; return }
    if(searchResults) searchResults.innerHTML = list.map(b=>`<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p></article>`).join('\n'); attachBlogButtons();
  }catch(err){ if(searchResults) searchResults.textContent = 'Error: '+err.message }
});

if(logoutBtn) logoutBtn.addEventListener('click', ()=>{ clearToken(); location.reload(); });

if(loginForm) loginForm.addEventListener('submit', async evt=>{
  evt.preventDefault();
  if(!authStatus) return;
  authStatus.textContent = '';
  const username = document.getElementById('username').value; const password = document.getElementById('password').value;
  try{
    const body = new URLSearchParams({username, password});
    const res = await fetch(`${API_URL}/login`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
    if(!res.ok) throw new Error('Login failed');
    const data = await res.json(); setToken(data.access_token); authStatus.textContent = 'Logged in';
    // show blog controls
    if(createSection) createSection.style.display='block'; if(searchSection) searchSection.style.display='block'; if(blogsSection) blogsSection.style.display='block'; if(logoutBtn) logoutBtn.style.display='inline-block';
    fetchBlogs();
  }catch(e){ authStatus.textContent = 'Login error: '+e.message; }
});

// show/hide UI based on token
function initUI(){
  if(token()){
    if(createSection) createSection.style.display='block';
    if(searchSection) searchSection.style.display='block';
    if(blogsSection) blogsSection.style.display='block';
    if(logoutBtn) logoutBtn.style.display='inline-block';
    if(loginForm) loginForm.style.display = 'none';
    fetchBlogs();
  } else {
    if(createSection) createSection.style.display='none';
    if(searchSection) searchSection.style.display='none';
    if(blogsSection) blogsSection.style.display='none';
    if(logoutBtn) logoutBtn.style.display='none';
    if(loginForm) loginForm.style.display = 'block';
  }
}

initUI();
const API_URL = 'http://localhost:8000';

const loginForm = document.getElementById('loginForm');
const authStatus = document.getElementById('authStatus');
const logoutBtn = document.getElementById('logoutBtn');
const createSection = document.getElementById('create');
const blogsSection = document.getElementById('blogs');
const blogsList = document.getElementById('blogsList');
const createForm = document.getElementById('createForm');
const refreshBtn = document.getElementById('refreshBtn');
// (signup/login handled in auth.html). The main page only shows blog controls.
const postBtn = document.getElementById('postBtn');
const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
const searchSection = document.getElementById('search');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

function token() { return localStorage.getItem('access_token'); }
function setToken(t){ localStorage.setItem('access_token', t); }
function clearToken(){ localStorage.removeItem('access_token'); }

async function login(evt){
  evt.preventDefault();
  authStatus.textContent = '';
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try{
    const body = new URLSearchParams({username, password});
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      // Minimal, clean frontend script for blog CRUD and search
      const API_URL = 'http://localhost:8000';

      const authLinkArea = document.getElementById('authLinkArea');
      const logoutBtn = document.getElementById('logoutBtn');
      const createSection = document.getElementById('create');
      const searchSection = document.getElementById('search');
      const searchInput = document.getElementById('searchInput');
      const searchBtn = document.getElementById('searchBtn');
      const searchResults = document.getElementById('searchResults');
      const blogsSection = document.getElementById('blogs');
      const blogsList = document.getElementById('blogsList');
      const createForm = document.getElementById('createForm');
      const postBtn = document.getElementById('postBtn');
      const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
      const refreshBtn = document.getElementById('refreshBtn');

      function token() { return localStorage.getItem('access_token'); }
      function setToken(t){ localStorage.setItem('access_token', t); }
      function clearToken(){ localStorage.removeItem('access_token'); }

      function escapeHtml(s){ return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;'); }

      async function fetchBlogs(){
        if(!blogsList) return;
        blogsList.textContent = 'Loading...';
        try{
          const res = await fetch(`${API_URL}/blog_user`, { headers: { 'Authorization': `Bearer ${token()}` } });
          if(!res.ok) throw new Error('Failed to fetch blogs (maybe login or CORS)');
          const data = await res.json();
          if(!data || data.length===0){ blogsList.textContent='No blogs found.'; return; }
          blogsList.innerHTML = data.map(b => (
            `<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p><div><button data-id="${b.id}" class="btn-update">Update</button> <button data-id="${b.id}" class="btn-delete">Delete</button> <button data-id="${b.id}" class="btn-undo">Undo</button></div></article>`
          )).join('\n');
          attachBlogButtons();
        }catch(e){ blogsList.textContent = 'Error: '+e.message; }
      }

      function attachBlogButtons(){
        document.querySelectorAll('.btn-delete').forEach(b=>b.addEventListener('click', async (e)=>{
          const id = e.currentTarget.dataset.id;
          if(!confirm('Delete blog '+id+'?')) return;
          try{ const res = await fetch(`${API_URL}/delete/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token()}`}}); if(!res.ok) throw new Error(await res.text()); alert('Deleted'); fetchBlogs(); }catch(err){ alert('Error: '+err.message) }
        }));

        document.querySelectorAll('.btn-undo').forEach(b=>b.addEventListener('click', async (e)=>{
          const id = e.currentTarget.dataset.id;
          try{ const res = await fetch(`${API_URL}/undo/${id}`, { method:'PATCH', headers:{'Authorization':`Bearer ${token()}`}}); if(!res.ok) throw new Error(await res.text()); alert('Undo applied'); fetchBlogs(); }catch(err){ alert('Error: '+err.message) }
        }));

        document.querySelectorAll('.btn-update').forEach(b=>b.addEventListener('click', (e)=>{
          const id = e.currentTarget.dataset.id;
          const art = e.currentTarget.closest('article');
          const t = art.querySelector('h3').textContent;
          const p = art.querySelector('p').textContent;
          document.getElementById('blogId').value = id;
          document.getElementById('title').value = t;
          document.getElementById('content').value = p;
          if(postBtn){ postBtn.dataset.mode = 'update'; postBtn.textContent = 'Update'; }
          if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'inline-block';
        }));
      }

      if(refreshBtn) refreshBtn.addEventListener('click', fetchBlogs);

      if(createForm) createForm.addEventListener('submit', async (evt)=>{
        evt.preventDefault();
        const id = parseInt(document.getElementById('blogId').value,10) || 0;
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const now = new Date().toISOString();
        const body = { id, title, content, created_at: now, updated_at: now };
        try{
          let res;
          if(postBtn && postBtn.dataset.mode === 'update'){
            res = await fetch(`${API_URL}/update/${id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token()}` }, body: JSON.stringify(body) });
          } else {
            res = await fetch(`${API_URL}/post`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token()}` }, body: JSON.stringify(body) });
          }
          if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'Post failed'); }
          const created = await res.json();
          const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Posted — id: '+created.id;
          fetchBlogs();
          if(postBtn){ postBtn.dataset.mode = ''; postBtn.textContent = 'Post'; }
          if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'none';
          if(createForm) createForm.reset();
        }catch(e){ const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Error: '+e.message; }
      });

      if(cancelUpdateBtn) cancelUpdateBtn.addEventListener('click', ()=>{ if(postBtn){ postBtn.dataset.mode = ''; postBtn.textContent = 'Post'; } if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'none'; if(createForm) createForm.reset(); });

      if(searchBtn){
        searchBtn.addEventListener('click', async ()=>{
          const q = (searchInput && searchInput.value || '').trim();
          if(!q){ if(searchResults) searchResults.textContent = 'Enter id or title to search'; return }
          if(searchResults) searchResults.textContent = 'Searching...';
          try{
            if(/^\d+$/.test(q)){
              const res = await fetch(`${API_URL}/blog_by_id/${q}`);
              if(!res.ok) throw new Error(await res.text());
              const b = await res.json();
              if(searchResults) searchResults.innerHTML = `<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p><div><button data-id="${b.id}" class="btn-update">Update</button> <button data-id="${b.id}" class="btn-delete">Delete</button> <button data-id="${b.id}" class="btn-undo">Undo</button></div></article>`;
              attachBlogButtons();
              return;
            }
            const res2 = await fetch(`${API_URL}/title/${encodeURIComponent(q)}`);
            if(!res2.ok) throw new Error(await res2.text());
            const list = await res2.json();
            if(!list || list.length===0){ if(searchResults) searchResults.textContent='No results'; return }
            if(searchResults) searchResults.innerHTML = list.map(b=>`<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p><div><button data-id="${b.id}" class="btn-update">Update</button> <button data-id="${b.id}" class="btn-delete">Delete</button> <button data-id="${b.id}" class="btn-undo">Undo</button></div></article>`).join('\n');
            attachBlogButtons();
          }catch(err){ if(searchResults) searchResults.textContent = 'Error: '+err.message }
        });
      }

      if(logoutBtn) logoutBtn.addEventListener('click', ()=>{ clearToken(); location.reload(); });

      function afterLogin(){
        if(token()){
          if(authLinkArea) authLinkArea.style.display = 'none';
          if(logoutBtn) logoutBtn.style.display='inline-block';
          if(createSection) createSection.style.display='block';
          if(searchSection) searchSection.style.display='block';
          if(blogsSection) blogsSection.style.display='block';
          fetchBlogs();
        } else {
          if(authLinkArea) authLinkArea.style.display = 'block';
        }
      }

      // initialize
      afterLogin();
          if(postBtn && postBtn.dataset.mode === 'update'){
            res = await fetch(`${API_URL}/update/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token()}` },
              body: JSON.stringify(body)
            });
          } else {
            res = await fetch(`${API_URL}/post`, {
              method: 'POST',
              headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token()}` },
              body: JSON.stringify(body)
            });
          }
          if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'Post failed'); }
          const created = await res.json();
          const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Posted — id: '+created.id;
          fetchBlogs();
          if(postBtn){ postBtn.dataset.mode = ''; postBtn.textContent = 'Post'; }
          if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'none';
          if(createForm) createForm.reset();
        }catch(e){ const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Error: '+e.message; }
      });

      if(cancelUpdateBtn) cancelUpdateBtn.addEventListener('click', ()=>{
        if(postBtn){ postBtn.dataset.mode = ''; postBtn.textContent = 'Post'; }
        if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'none';
        if(createForm) createForm.reset();
      });

      if(searchBtn){
        searchBtn.addEventListener('click', async ()=>{
          const q = (searchInput && searchInput.value || '').trim();
          if(!q){ if(searchResults) searchResults.textContent = 'Enter id or title to search'; return }
          if(searchResults) searchResults.textContent = 'Searching...';
          try{
            if(/^\\d+$/.test(q)){
              const res = await fetch(`${API_URL}/blog_by_id/${q}`);
              if(!res.ok) throw new Error(await res.text());
              const b = await res.json();
              if(searchResults) searchResults.innerHTML = `<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p><div><button data-id="${b.id}" class="btn-update">Update</button> <button data-id="${b.id}" class="btn-delete">Delete</button> <button data-id="${b.id}" class="btn-undo">Undo</button></div></article>`;
              attachBlogButtons();
              return;
            }
            const res2 = await fetch(`${API_URL}/title/${encodeURIComponent(q)}`);
            if(!res2.ok) throw new Error(await res2.text());
            const list = await res2.json();
            if(!list || list.length===0){ if(searchResults) searchResults.textContent='No results'; return }
            if(searchResults) searchResults.innerHTML = list.map(b=>`<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p><div><button data-id="${b.id}" class="btn-update">Update</button> <button data-id="${b.id}" class="btn-delete">Delete</button> <button data-id="${b.id}" class="btn-undo">Undo</button></div></article>`).join('\n');
            attachBlogButtons();
          }catch(err){ if(searchResults) searchResults.textContent = 'Error: '+err.message }
        });
      }

      if(logoutBtn) logoutBtn.addEventListener('click', ()=>{ clearToken(); location.reload(); });

      function afterLogin(){
        if(token()){
          if(authLinkArea) authLinkArea.style.display = 'none';
          if(logoutBtn) logoutBtn.style.display='inline-block';
          if(createSection) createSection.style.display='block';
          if(searchSection) searchSection.style.display='block';
          if(blogsSection) blogsSection.style.display='block';
          fetchBlogs();
        } else {
          if(authLinkArea) authLinkArea.style.display = 'block';
        }
      }

      // initialize
      afterLogin();
        alert('Undo applied'); fetchBlogs();
      }catch(err){ alert('Error: '+err.message) }
    }));

    document.querySelectorAll('.btn-update').forEach(b=>b.addEventListener('click', (e)=>{
      const id = e.currentTarget.dataset.id;
      const art = e.currentTarget.closest('article');
      const t = art.querySelector('h3').textContent;
      const p = art.querySelector('p').textContent;
      document.getElementById('blogId').value = id;
      document.getElementById('title').value = t;
      document.getElementById('content').value = p;
      postBtn.dataset.mode = 'update';
      postBtn.textContent = 'Update';
      cancelUpdateBtn.style.display = 'inline-block';
    }));
  }

  cancelUpdateBtn.addEventListener('click', ()=>{
    postBtn.dataset.mode = '';
    postBtn.textContent = 'Post';
    cancelUpdateBtn.style.display = 'none';
    document.getElementById('createForm').reset();
  });

  if(searchBtn){
    searchBtn.addEventListener('click', async ()=>{
      const q = (searchInput.value || '').trim();
      if(!q){ searchResults.textContent = 'Enter id or title to search'; return }
      searchResults.textContent = 'Searching...';
      try{
        if(/^\d+$/.test(q)){
          const res = await fetch(`${API_URL}/blog_by_id/${q}`);
          if(!res.ok) throw new Error(await res.text());
          const b = await res.json();
          searchResults.innerHTML = `<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p><div><button data-id="${b.id}" class="btn-update">Update</button> <button data-id="${b.id}" class="btn-delete">Delete</button> <button data-id="${b.id}" class="btn-undo">Undo</button></div></article>`;
          attachBlogButtons();
          return;
        }
        const res2 = await fetch(`${API_URL}/title/${encodeURIComponent(q)}`);
        if(!res2.ok) throw new Error(await res2.text());
        const list = await res2.json();
        if(!list || list.length===0){ searchResults.textContent='No results'; return }
        searchResults.innerHTML = list.map(b=>`<article class="blog"><h3>${escapeHtml(b.title)}</h3><div class="meta">${b.created_at}</div><p>${escapeHtml(b.content)}</p><div><button data-id="${b.id}" class="btn-update">Update</button> <button data-id="${b.id}" class="btn-delete">Delete</button> <button data-id="${b.id}" class="btn-undo">Undo</button></div></article>`).join('\n');
        attachBlogButtons();
      }catch(err){ searchResults.textContent = 'Error: '+err.message }
    });
  }

  function escapeHtml(s){ return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/\"/g,'&quot;')
    .replace(/'/g,'&#39;'); }

  if(token()){ afterLogin(); } else {
    if(authLinkArea) authLinkArea.style.display = 'block';
  }