const API_URL = 'http://localhost:8000';

const loginFormAuth = document.getElementById('loginFormAuth');
const loginStatus = document.getElementById('loginStatus');

// helper to store token and redirect to main app
function storeTokenAndRedirect(token){
  localStorage.setItem('access_token', token);
  window.location.href = 'index.html';
}

// Login only
if(loginFormAuth){
  loginFormAuth.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(loginStatus) loginStatus.textContent='';
    const username = document.getElementById('li_username').value;
    const password = document.getElementById('li_password').value;
    try{
      const body = new URLSearchParams({username, password});
      const res = await fetch(`${API_URL}/login`, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
      if(!res.ok) throw new Error('Login failed');
      const data = await res.json();
      storeTokenAndRedirect(data.access_token);
    }catch(err){ if(loginStatus) loginStatus.textContent = 'Error: '+err.message }
  });
}

// show login section by default (signup removed)
const loginSection = document.getElementById('login');
if(loginSection) loginSection.style.display = 'block';