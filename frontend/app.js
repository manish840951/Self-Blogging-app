// frontend/app.clean.js — minimal, single-file frontend for index.html
// Use 127.0.0.1 to avoid hostname-related server errors seen with `localhost`
const API_URL = 'http://127.0.0.1:8000';

// quick debug output to page and console to confirm script loaded
console.log('[frontend] app.clean.js loaded — API_URL=' + API_URL);
try{ const dbg = document.getElementById('frontendDebug'); if(dbg) dbg.textContent = 'frontend script loaded — API_URL=' + API_URL; }catch(e){}

// Elements (guarded)
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
const signupForm = document.getElementById('signupForm');
const signupStatus = document.getElementById('signupStatus');
const userBadge = document.getElementById('userBadge');

function token(){ return localStorage.getItem('access_token'); }
function setToken(t){ localStorage.setItem('access_token', t); }
function clearToken(){ localStorage.removeItem('access_token'); }

function setUsernameStorage(name){ if(name) localStorage.setItem('username', name); }
function clearUsernameStorage(){ localStorage.removeItem('username'); }
function setUserBadge(name){ try{ if(userBadge) userBadge.textContent = name ? ('Logged in: ' + name) : ''; }catch(e){} }
function clearUserBadge(){ try{ if(userBadge) userBadge.textContent = ''; }catch(e){} }

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
    const id = e.currentTarget.dataset.id;
    if(!confirm('Delete blog '+id+'?')) return;
    try{
      const r = await fetch(`${API_URL}/delete/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token()}`}});
      if(!r.ok) throw new Error(await r.text());
      // Show an undo prompt instead of immediately refreshing so user can undo
      try{
        let container = document.getElementById('undoContainer');
        if(!container){ container = document.createElement('div'); container.id = 'undoContainer'; container.style.position = 'fixed'; container.style.right = '16px'; container.style.bottom = '16px'; container.style.zIndex = 9999; document.body.appendChild(container); }
        const prompt = document.createElement('div'); prompt.className = 'undo-prompt'; prompt.style.background = '#222'; prompt.style.color = '#fff'; prompt.style.padding = '10px'; prompt.style.marginTop = '8px'; prompt.style.borderRadius = '6px';
        prompt.innerHTML = `Deleted blog ${id}. <button class="undo-now" data-id="${id}">Undo</button> <button class="dismiss">Dismiss</button>`;
        container.appendChild(prompt);

        // auto-dismiss after 12s and refresh list
        const to = setTimeout(()=>{ try{ prompt.remove(); fetchBlogs(); }catch(e){} }, 12000);

        prompt.querySelector('.dismiss').addEventListener('click', ()=>{ clearTimeout(to); prompt.remove(); fetchBlogs(); });

        prompt.querySelector('.undo-now').addEventListener('click', async ev=>{
          const bid = ev.currentTarget.dataset.id;
          try{
            const ru = await fetch(`${API_URL}/undo/${bid}`, { method:'PATCH', headers:{'Authorization':`Bearer ${token()}`}});
            if(!ru.ok) throw new Error(await ru.text());
            alert('Delete undone');
            clearTimeout(to);
            prompt.remove();
            fetchBlogs();
          }catch(ue){ alert('Undo error: '+ue.message); }
        });
      }catch(uierr){ console.error('undo UI error', uierr); fetchBlogs(); }
    }catch(er){ alert('Error: '+er.message) }
  }));

  document.querySelectorAll('.btn-undo').forEach(b=>b.addEventListener('click', async e=>{
    const id = e.currentTarget.dataset.id; try{ const r = await fetch(`${API_URL}/undo/${id}`, { method:'PATCH', headers:{'Authorization':`Bearer ${token()}`}}); if(!r.ok) throw new Error(await r.text()); alert('Undo applied'); fetchBlogs(); }catch(er){ alert('Error: '+er.message) }
  }));

  document.querySelectorAll('.btn-update').forEach(b=>b.addEventListener('click', e=>{
    const id = e.currentTarget.dataset.id; const art = e.currentTarget.closest('article');
    const t = art.querySelector('h3').textContent; const p = art.querySelector('p').textContent;
    const idEl = document.getElementById('blogId'); if(idEl) idEl.value = id;
    if(idEl) idEl.readOnly = true;
    const tEl = document.getElementById('title'); if(tEl) tEl.value = t;
    const cEl = document.getElementById('content'); if(cEl) cEl.value = p;
    if(postBtn){ postBtn.dataset.mode = 'update'; postBtn.textContent = 'Update'; }
    if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'inline-block';
  }));
}

if(refreshBtn) refreshBtn.addEventListener('click', fetchBlogs);

if(createForm) createForm.addEventListener('submit', async evt=>{
  evt.preventDefault();
  const idEl = document.getElementById('blogId');
  const isUpdate = postBtn && postBtn.dataset.mode === 'update';
  const title = document.getElementById('title').value; const content = document.getElementById('content').value;
  const now = new Date().toISOString();
  // build base body
  const body = { title, content, created_at: now, updated_at: now };
  // If creating and user supplied an id, include it so backend can use it; if empty, backend will auto-assign
  if(!isUpdate && idEl && String(idEl.value).trim() !== ''){
    const supplied = parseInt(idEl.value, 10);
    if(!Number.isNaN(supplied)) body.id = supplied;
  }
  // If updating, use the path id; ensure id field is present for consistency (backend ignores changing id)
  let pathId = null;
  if(isUpdate && idEl){ pathId = parseInt(idEl.value, 10); }
  try{
    let res;
    if(isUpdate){
      res = await fetch(`${API_URL}/update/${pathId}`, { method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`}, body: JSON.stringify(body) });
    } else {
      res = await fetch(`${API_URL}/post`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token()}`}, body: JSON.stringify(body) });
    }
    if(!res.ok){ const txt = await res.text(); throw new Error(txt||'Post failed'); }
    const created = await res.json(); const statusEl = document.getElementById('postStatus'); if(statusEl) statusEl.textContent = 'Posted — id: '+created.id;
    fetchBlogs(); if(postBtn){ postBtn.dataset.mode = ''; postBtn.textContent = 'Post'; } if(cancelUpdateBtn) cancelUpdateBtn.style.display = 'none'; if(createForm) createForm.reset();
    // after submit, make sure the id field is editable again for next create
    if(idEl) idEl.readOnly = false;
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

if(logoutBtn) logoutBtn.addEventListener('click', ()=>{ clearToken(); clearUsernameStorage(); clearUserBadge(); location.reload(); });

if(loginForm) loginForm.addEventListener('submit', async evt=>{
  evt.preventDefault(); if(!authStatus) return; authStatus.textContent = '';
  const username = document.getElementById('username').value; const password = document.getElementById('password').value;
  try{
    const body = new URLSearchParams({username, password});
    const res = await fetch(`${API_URL}/login`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
    if(!res.ok) throw new Error('Login failed');
    const data = await res.json(); setToken(data.access_token); authStatus.textContent = 'Logged in';
    setUsernameStorage(username); setUserBadge(username);
    if(createSection) createSection.style.display='block'; if(searchSection) searchSection.style.display='block'; if(blogsSection) blogsSection.style.display='block'; if(logoutBtn) logoutBtn.style.display='inline-block'; if(loginForm) loginForm.style.display='none';
    fetchBlogs();
  }catch(e){ authStatus.textContent = 'Login error: '+e.message; }
});

// Signup: create user then auto-login
if(signupForm){
  signupForm.addEventListener('submit', async e=>{
    e.preventDefault(); if(!signupStatus) return; signupStatus.textContent = '';
    const username = document.getElementById('su_username').value;
    const email = document.getElementById('su_email').value;
    const password = document.getElementById('su_password').value;
    try{
      const now = new Date().toISOString();
      if(signupStatus) signupStatus.textContent = 'Sending signup to ' + API_URL + '/create_user';
      console.log('[frontend] signup ->', { username, email, target: API_URL + '/create_user' });
      const res = await fetch(`${API_URL}/create_user`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,email,password,created_at: now}) });
      if(!res.ok) throw new Error(await res.text());
      // auto-login
      const form = new URLSearchParams({username, password});
      const r2 = await fetch(`${API_URL}/login`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: form });
      if(!r2.ok) throw new Error('Signup succeeded but login failed');
      const data = await r2.json(); setToken(data.access_token);
      setUsernameStorage(username); setUserBadge(username);
      signupStatus.textContent = 'Signed up and logged in';
      if(createSection) createSection.style.display='block'; if(searchSection) searchSection.style.display='block'; if(blogsSection) blogsSection.style.display='block'; if(logoutBtn) logoutBtn.style.display='inline-block'; if(loginForm) loginForm.style.display='none';
      fetchBlogs();
    }catch(err){ signupStatus.textContent = 'Error: '+err.message }
  });
}

function initUI(){
  if(token()){
    const stored = localStorage.getItem('username');
    if(stored) setUserBadge(stored);
    if(createSection) createSection.style.display='block'; if(searchSection) searchSection.style.display='block'; if(blogsSection) blogsSection.style.display='block'; if(logoutBtn) logoutBtn.style.display='inline-block'; if(loginForm) loginForm.style.display='none'; fetchBlogs();
  } else {
    if(createSection) createSection.style.display='none'; if(searchSection) searchSection.style.display='none'; if(blogsSection) blogsSection.style.display='none'; if(logoutBtn) logoutBtn.style.display='none'; if(loginForm) loginForm.style.display='block';
  }
}

initUI();
