/* frontend/app.js — Full frontend with Edit Profile + Resume integration
   - All handlers attached after DOMContentLoaded
   - Auth (login/register), Jobs (view/apply/post), Applications (company/candidate)
   - Toasts, confetti, ripple, skeleton
   - Edit Profile modal + resume upload (PUT /api/users/me with FormData)
*/

const API = 'http://localhost:5000/api';

/* ------------------------------
   Helpers (available outside init)
   ------------------------------ */
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function timeAgo(d){
  const secs = Math.floor((Date.now() - new Date(d))/1000);
  if(secs < 60) return `${secs}s`;
  if(secs < 3600) return `${Math.floor(secs/60)}m`;
  if(secs < 86400) return `${Math.floor(secs/3600)}h`;
  return `${Math.floor(secs/86400)}d`;
}

/* Toast (readable) */
function toast(message, { type='default', delay=2800 } = {}) {
  const area = document.getElementById('toast-area');
  if(!area){ console.log('toast:', message); return; }
  const el = document.createElement('div');
  el.className = 'toast custom ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
  el.innerHTML = `<div class="msg">${escapeHtml(message)}</div><button class="btn-close" aria-label="close"></button>`;
  area.appendChild(el);
  el.querySelector('.btn-close').onclick = ()=> el.remove();
  setTimeout(()=> { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(()=> el.remove(), 300); }, delay);
}

/* ------------------------------
   Confetti (light)
   ------------------------------ */
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas && confettiCanvas.getContext ? confettiCanvas.getContext('2d') : null;
function resizeCanvas(){ if(confettiCanvas){ confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight; } }
if(confettiCanvas) window.addEventListener('resize', resizeCanvas);
function burstConfetti(){
  if(!ctx) return;
  const pieces = [];
  for(let i=0;i<60;i++){
    pieces.push({
      x: Math.random()*confettiCanvas.width,
      y: -10 - Math.random()*200,
      w: 6 + Math.random()*8,
      h: 8 + Math.random()*8,
      vx: -3 + Math.random()*6,
      vy: 2 + Math.random()*6,
      color: ['#60a5fa','#7c3aed','#f97316','#10b981','#f43f5e'][Math.floor(Math.random()*5)],
      rot: Math.random()*360,
      vr: -6 + Math.random()*12,
      life: 0
    });
  }
  let t = 0;
  function frame(){
    t++;
    ctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
    for(const p of pieces){
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
    }
    if(t < 120) requestAnimationFrame(frame); else ctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
  }
  requestAnimationFrame(frame);
}

/* Ripple effect (delegated) */
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.ripple');
  if(!btn) return;
  const rect = btn.getBoundingClientRect();
  const circle = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  circle.style.width = circle.style.height = size + 'px';
  circle.style.left = (e.clientX - rect.left - size/2) + 'px';
  circle.style.top = (e.clientY - rect.top - size/2) + 'px';
  circle.style.position = 'absolute';
  circle.style.borderRadius = '50%';
  circle.style.background = 'rgba(255,255,255,0.18)';
  circle.style.pointerEvents = 'none';
  circle.style.transform = 'scale(0)';
  circle.style.transition = 'transform .5s ease, opacity .9s ease';
  btn.style.position = 'relative'; btn.style.overflow = 'hidden';
  btn.appendChild(circle);
  requestAnimationFrame(()=> circle.style.transform = 'scale(2)');
  setTimeout(()=> { circle.style.opacity = '0'; }, 400);
  setTimeout(()=> circle.remove(), 900);
});

/* Token storage */
function setToken(t){ if(t) localStorage.setItem('token', t); else localStorage.removeItem('token'); }
function getToken(){ return localStorage.getItem('token'); }

/* Skeleton helpers */
function showSkeleton(){ const s = document.getElementById('skeleton'); if(!s) return; s.innerHTML=''; for(let i=0;i<3;i++){ const d=document.createElement('div'); d.className='skel p-3 mb-3'; d.style.height='110px'; s.appendChild(d);} s.classList.remove('d-none'); }
function hideSkeleton(){ const s = document.getElementById('skeleton'); if(!s) return; s.innerHTML=''; s.classList.add('d-none'); }

/* ------------------------------
   Main initializer — run after DOM ready
   ------------------------------ */
document.addEventListener('DOMContentLoaded', ()=> {

  // DOM references (safe)
  const jobsDiv = document.getElementById('jobs');
  const noJobs = document.getElementById('no-jobs');
  const skillTags = document.getElementById('skill-tags');
  const profileContent = document.getElementById('profile-content');
  const guestContent = document.getElementById('guest-content');
  const profileName = document.getElementById('profile-name');
  const profileRole = document.getElementById('profile-role');
  const profileBio = document.getElementById('profile-bio');

  const authModalEl = document.getElementById('authModal');
  const postModalEl = document.getElementById('postJobModal');
  const applyModalEl = document.getElementById('applyModal');
  const appsModalEl = document.getElementById('applicationsModal');
  const editProfileModalEl = document.getElementById('editProfileModal');

  const authModal = authModalEl ? new bootstrap.Modal(authModalEl) : null;
  const postModal = postModalEl ? new bootstrap.Modal(postModalEl) : null;
  const applyModal = applyModalEl ? new bootstrap.Modal(applyModalEl) : null;
  const appsModal = appsModalEl ? new bootstrap.Modal(appsModalEl) : null;
  const editProfileModal = editProfileModalEl ? new bootstrap.Modal(editProfileModalEl) : null;

  // Auth elements
  const authTitle = document.getElementById('authTitle');
  const authSubmit = document.getElementById('authSubmit');
  const toggleAuth = document.getElementById('toggle-auth');
  const regNameWrap = document.getElementById('reg-name-wrap');
  const regRoleWrap = document.getElementById('reg-role-wrap');

  // Edit profile elements
  const saveProfileBtn = document.getElementById('save-profile-btn');

  // Buttons
  const searchBtn = document.getElementById('search-btn');
  const clearBtn = document.getElementById('clear-btn');
  const ctaExplore = document.getElementById('cta-explore');
  const postJobBtn = document.getElementById('post-job-btn');
  const applySubmit = document.getElementById('apply-submit');
  const openAppsBtn = document.getElementById('open-apps');
  const navLogin = document.getElementById('nav-login');
  const navRegister = document.getElementById('nav-register');
  const logoutBtn = document.getElementById('logout');

  // Auth state
  let isRegister = false;

  // toggle auth modal mode
  if(toggleAuth){
    toggleAuth.addEventListener('click', (e)=>{
      e.preventDefault();
      isRegister = !isRegister;
      authTitle.textContent = isRegister ? 'Register' : 'Login';
      if(authSubmit) authSubmit.textContent = isRegister ? 'Register' : 'Login';
      if(regNameWrap) regNameWrap.classList.toggle('d-none', !isRegister);
      if(regRoleWrap) regRoleWrap.classList.toggle('d-none', !isRegister);
      toggleAuth.textContent = isRegister ? 'Already have an account? Login' : "Don't have an account? Register";
    });
  }

  // open auth modal programmatically
  function openAuthModal(mode='login'){
    isRegister = (mode === 'register');
    if(authTitle) authTitle.textContent = isRegister ? 'Register' : 'Login';
    if(authSubmit) authSubmit.textContent = isRegister ? 'Register' : 'Login';
    if(regNameWrap) regNameWrap.classList.toggle('d-none', !isRegister);
    if(regRoleWrap) regRoleWrap.classList.toggle('d-none', !isRegister);
    if(toggleAuth) toggleAuth.textContent = isRegister ? 'Already have an account? Login' : "Don't have an account? Register";
    const emailInp = document.getElementById('auth-email');
    const passInp = document.getElementById('auth-pass');
    if(emailInp) emailInp.value = '';
    if(passInp) passInp.value = '';
    const regName = document.getElementById('reg-name');
    if(isRegister && regName) regName.value = '';
    if(authModal) authModal.show();
  }

  // Auth submit (login/register)
  if(authSubmit){
    authSubmit.addEventListener('click', async ()=>{
      const email = (document.getElementById('auth-email') || {}).value?.trim() || '';
      const pass = (document.getElementById('auth-pass') || {}).value?.trim() || '';
      if(!email || !pass) return toast('Please fill Email & Password', { type:'error' });
      if(isRegister){
        const name = (document.getElementById('reg-name') || {}).value?.trim() || '';
        const role = (document.getElementById('reg-role') || {}).value || 'candidate';
        try{
          const res = await fetch(API + '/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password: pass, role }) });
          const data = await res.json();
          if(res.ok){ setToken(data.token); authModal && authModal.hide(); toast('Welcome — registered', { type:'success' }); init(); burstConfetti(); }
          else toast(data.message || 'Registration failed', { type:'error' });
        }catch(e){ toast('Network error', { type:'error' }); console.error(e); }
      } else {
        try{
          const res = await fetch(API + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password: pass }) });
          const data = await res.json();
          if(res.ok){ setToken(data.token); authModal && authModal.hide(); toast('Logged in', { type:'success' }); init(); } else toast(data.message || 'Login failed', { type:'error' });
        }catch(e){ toast('Network error', { type:'error' }); console.error(e); }
      }
    });
  }

  // logout
  if(logoutBtn) logoutBtn.addEventListener('click', ()=> { setToken(null); toast('Logged out', { type:'success' }); init(); });

  // post job
  if(postJobBtn){
    postJobBtn.addEventListener('click', async ()=>{
      const token = getToken();
      if(!token){ toast('Login as company to post', { type:'error' }); openAuthModal('login'); return; }
      const title = (document.getElementById('job-title')||{}).value?.trim() || '';
      const location = (document.getElementById('job-location')||{}).value?.trim() || '';
      const skills = ((document.getElementById('job-skills')||{}).value || '').split(',').map(s=>s.trim()).filter(Boolean);
      const description = (document.getElementById('job-desc')||{}).value?.trim() || '';
      if(!title) return toast('Enter a title', { type:'error' });
      try{
        const res = await fetch(API + '/jobs', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }, body: JSON.stringify({ title, location, skills, description }) });
        const data = await res.json();
        if(res.ok){ postModal && postModal.hide(); toast('Job posted', { type:'success' }); burstConfetti(); loadJobs(); }
        else toast(data.message || 'Failed to post job', { type:'error' });
      }catch(e){ toast('Network error', { type:'error' }); console.error(e); }
    });
  }

  // apply submit (robust)
  if(applySubmit){
    applySubmit.addEventListener('click', async ()=>{
      const token = getToken();
      if(!token){ toast('Login as candidate to apply', { type:'error' }); openAuthModal('login'); return; }
      if(!activeJobToApply) return toast('No job selected', { type:'error' });
      const message = (document.getElementById('apply-message')||{}).value?.trim() || '';
      try{
        const res = await fetch(API + `/jobs/${activeJobToApply._id}/apply`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }, body: JSON.stringify({ message }) });
        const data = await res.json();
        if(res.ok){ applyModal && applyModal.hide(); toast('Application sent', { type:'success' }); burstConfetti(); }
        else toast(data.message || 'Failed to apply', { type:'error' });
      }catch(e){ toast('Network error', { type:'error' }); console.error(e); }
    });
  }

  // search / clear / cta
  if(searchBtn) searchBtn.addEventListener('click', loadJobs);
  if(clearBtn) clearBtn.addEventListener('click', ()=> { (document.getElementById('search-q')||{}).value=''; (document.getElementById('search-skill')||{}).value=''; loadJobs(); });
  if(ctaExplore) ctaExplore.addEventListener('click', ()=> window.scrollTo({ top: 250, behavior: 'smooth' }));

  // nav login/register openers
  if(navLogin) navLogin.addEventListener('click', ()=> openAuthModal('login'));
  if(navRegister) navRegister.addEventListener('click', ()=> openAuthModal('register'));

  // open apps btn
  if(openAppsBtn) openAppsBtn.addEventListener('click', async ()=> { await loadApplications(); appsModal && appsModal.show(); });

  /* ------------------------------
     Jobs: load & render
     ------------------------------ */
  async function loadJobs(){
    showSkeleton();
    const q = (document.getElementById('search-q')||{}).value?.trim() || '';
    const skill = (document.getElementById('search-skill')||{}).value?.trim() || '';
    const url = new URL(API + '/jobs');
    if(q) url.searchParams.set('q', q);
    if(skill) url.searchParams.set('skill', skill);

    try{
      const res = await fetch(url);
      const jobs = await res.json();
      hideSkeleton();
      renderJobs(jobs);
    }catch(e){
      hideSkeleton();
      toast('Failed to load jobs', { type:'error' });
      console.error(e);
    }
  }

  function renderJobs(jobs){
    if(!jobsDiv) return;
    jobsDiv.innerHTML = '';
    if(!jobs || jobs.length === 0){ if(noJobs) noJobs.classList.remove('d-none'); return; }
    if(noJobs) noJobs.classList.add('d-none');

    const skillsSet = new Set();
    jobs.forEach((job, i) => {
      (job.skills || []).forEach(s => skillsSet.add(s.toLowerCase()));
      const col = document.createElement('div'); col.className = 'col-12';
      const card = document.createElement('div'); card.className = 'card job-card p-3';
      card.style.animation = `card-pop .35s ease ${i*60}ms both`;

      const logoLetter = (job.company && (job.company.companyName || job.company.name) || 'C').charAt(0).toUpperCase();

      card.innerHTML = `
        <div class="d-flex align-items-start justify-content-between">
          <div style="max-width:70%">
            <div class="d-flex align-items-center gap-2 mb-1">
              <div class="avatar">${escapeHtml(logoLetter)}</div>
              <div class="company small text-muted">${escapeHtml((job.company && (job.company.companyName || job.company.name)) || 'Company')}</div>
            </div>
            <div class="job-title">${escapeHtml(job.title)}</div>
            <div class="job-meta mt-1">${escapeHtml(job.location || 'Remote')} • ${timeAgo(new Date(job.createdAt))}</div>
          </div>
          <div class="text-end">
            <div class="small no-wrap">${(job.skills||[]).map(s=>`<span class="skill-tag me-1">${escapeHtml(s)}</span>`).join(' ')}</div>
            <div class="mt-3">
              <button class="btn btn-sm btn-outline-primary me-2 view-btn ripple">View</button>
              <button class="btn btn-sm btn-primary apply-btn ripple">Apply</button>
            </div>
          </div>
        </div>
        <hr class="my-2" />
        <p class="text-muted mb-1 small">${escapeHtml((job.description||'').slice(0,220))}${(job.description||'').length>220? '...':''}</p>
      `;
      col.appendChild(card); jobsDiv.appendChild(col);

      // tilt effect
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width/2, cy = r.top + r.height/2;
        const dx = (e.clientX - cx) / r.width;
        const dy = (e.clientY - cy) / r.height;
        card.style.transform = `perspective(800px) translateY(-6px) rotateX(${dy*6}deg) rotateY(${dx*6}deg) scale(1.01)`;
      });
      card.addEventListener('mouseleave', ()=> card.style.transform = '');

      // handlers
      const aBtn = card.querySelector('.apply-btn');
      const vBtn = card.querySelector('.view-btn');
      if(aBtn) aBtn.addEventListener('click', ()=> { activeJobToApply = job; openApplyModal(job); });
      if(vBtn) vBtn.addEventListener('click', ()=> { activeJobToApply = job; openApplyModal(job); (document.getElementById('apply-message')||{}).value = `Hi, I'm interested in ${job.title}.`; });
    });

    // populate skills
    if(skillTags) skillTags.innerHTML = '';
    [...skillsSet].slice(0,20).forEach(s=>{
      const t = document.createElement('button'); t.className = 'btn btn-sm skill-tag'; t.textContent = s;
      t.onclick = ()=> { (document.getElementById('search-skill')||{}).value = s; loadJobs(); };
      skillTags && skillTags.appendChild(t);
    });
  }

  /* ------------------------------
     Applications / Notifications
     ------------------------------ */
  async function loadApplications(){
    const token = getToken();
    if(!token){ toast('Login to view applications', { type:'error' }); return; }

    // get user
    let user;
    try{
      const r = await fetch(API + '/users/me', { headers: { 'Authorization': 'Bearer ' + token }});
      if(!r.ok){ setToken(null); init(); return; }
      user = await r.json();
    }catch(e){ toast('Failed to load user', { type:'error' }); return; }

    const isCompany = user.role === 'company';
    const appsContainer = document.getElementById('apps-container');
    if(!appsContainer) return;
    appsContainer.innerHTML = '';
    const loader = document.createElement('div'); loader.className = 'text-center p-4'; loader.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    appsContainer.appendChild(loader);

    try{
      const res = await fetch(API + (isCompany ? '/applications/company' : '/applications/me'), { headers: { 'Authorization': 'Bearer ' + token }});
      const data = await res.json();
      appsContainer.innerHTML = '';
      if(!Array.isArray(data) || data.length === 0){ appsContainer.innerHTML = '<div class="text-center text-muted p-3">No applications found</div>'; return; }
      data.forEach(app => {
        const card = document.createElement('div'); card.className = 'card p-3 shadow-sm';
        const candidate = app.candidate || {};
        const job = app.job || {};
        const statusBadge = `<span class="badge ${statusClass(app.status)}">${escapeHtml(app.status)}</span>`;

        if(isCompany){
          // company view — include resume link (if available)
          const resumeHtml = candidate.resumeUrl ? `<div class="small mt-2">Resume: <a href="${candidate.resumeUrl}" target="_blank" rel="noopener">View Resume</a></div>` : '';
          card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="h6 mb-1">${escapeHtml(candidate.name || candidate.email || 'Candidate')}</div>
                <div class="small text-muted mb-2">${escapeHtml(candidate.email || '')} • ${escapeHtml((candidate.skills||[]).join(', '))}</div>
                <div class="small"><strong>Applied for:</strong> ${escapeHtml(job.title || '')} <span class="small text-muted">(${escapeHtml(job.location||'')})</span></div>
                <div class="small text-muted mt-2"><strong>Candidate message:</strong> ${escapeHtml(app.message || '')}</div>
                <div class="small text-muted mt-1"><strong>Applied:</strong> ${new Date(app.appliedAt).toLocaleString()}</div>
                ${resumeHtml}
              </div>
              <div class="text-end">
                ${statusBadge}
                <div class="mt-2 small text-muted">${app.companyMessage ? 'Decision sent' : ''}</div>
              </div>
            </div>
            <div class="mt-3 d-flex gap-2">
              <input placeholder="Message to candidate (optional)" class="form-control form-control-sm app-company-message" />
              <button class="btn btn-sm btn-outline-success btn-accept">Accept</button>
              <button class="btn btn-sm btn-outline-danger btn-reject">Reject</button>
            </div>
          `;
          const input = card.querySelector('.app-company-message');
          const btnAcc = card.querySelector('.btn-accept');
          const btnRej = card.querySelector('.btn-reject');
          btnAcc.addEventListener('click', ()=> companyDecision(app._id, 'accepted', input.value));
          btnRej.addEventListener('click', ()=> companyDecision(app._id, 'rejected', input.value));
        } else {
          // candidate view
          const companyResumeHtml = app.companyMessage ? `<div class="mt-2"><strong>Message from company:</strong><div class="p-2 mt-1 bg-light rounded">${escapeHtml(app.companyMessage)}</div></div>` : '';
          card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
              <div style="max-width:75%">
                <div class="h6 mb-1">${escapeHtml(job.title || '')}</div>
                <div class="small text-muted mb-2">${escapeHtml(job.company?.companyName || job.company?.name || '')} • ${escapeHtml(job.location || '')}</div>
                <div class="small text-muted mb-2"><strong>Your message:</strong> ${escapeHtml(app.message || '')}</div>
                <div class="small text-muted mb-1"><strong>Applied:</strong> ${new Date(app.appliedAt).toLocaleString()}</div>
                ${companyResumeHtml}
              </div>
              <div class="text-end">
                ${statusBadge}
                <div class="small text-muted mt-2">${app.decisionAt ? new Date(app.decisionAt).toLocaleString() : ''}</div>
              </div>
            </div>
          `;
        }
        appsContainer.appendChild(card);
      });
    }catch(e){
      appsContainer.innerHTML = '';
      toast('Failed to load applications', { type:'error' });
      console.error(e);
    }
  }

  function statusClass(status){
    switch(status){
      case 'accepted': return 'bg-success text-white';
      case 'rejected': return 'bg-danger text-white';
      case 'reviewed': return 'bg-warning text-dark';
      default: return 'bg-secondary text-white';
    }
  }

  async function companyDecision(appId, status, message){
    const token = getToken();
    if(!token) return toast('Login required', { type:'error' });
    try{
      const res = await fetch(API + '/applications/' + appId + '/decision', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ status, message })
      });
      const data = await res.json();
      if(res.ok){ toast('Decision saved', { type:'success' }); if(status === 'accepted') burstConfetti(); await loadApplications(); await loadJobs(); }
      else toast(data.message || 'Failed to save decision', { type:'error' });
    }catch(e){ toast('Network error', { type:'error' }); console.error(e); }
  }

  /* ------------------------------
     open apply modal helper
     ------------------------------ */
  let activeJobToApply = null;
  function openApplyModal(job){
    activeJobToApply = job;
    const applyJobInfo = document.getElementById('apply-job-info');
    if(applyJobInfo) applyJobInfo.textContent = `${job.title} — ${job.company.companyName || job.company.name || 'Company'}`;
    const applyMsg = document.getElementById('apply-message');
    if(applyMsg) applyMsg.value = '';
    applyModal && applyModal.show();
  }

  /* ------------------------------
     Edit Profile integration
     ------------------------------ */
  function openEditProfile(user){
    if(!user) return;
    const nameI = document.getElementById('edit-name');
    const bioI = document.getElementById('edit-bio');
    const skillsI = document.getElementById('edit-skills');
    const compI = document.getElementById('edit-company-name');
    const companyWrap = document.getElementById('company-name-wrap');
    const currentResume = document.getElementById('current-resume');

    if(nameI) nameI.value = user.name || '';
    if(bioI) bioI.value = user.bio || '';
    if(skillsI) skillsI.value = (user.skills || []).join(', ');
    if(compI) compI.value = user.companyName || '';
    if(companyWrap) companyWrap.classList.toggle('d-none', user.role !== 'company');
    if(currentResume){
      if(user.resumeUrl) currentResume.innerHTML = `Current resume: <a href="${user.resumeUrl}" target="_blank" rel="noopener">View</a>`;
      else currentResume.innerHTML = 'No resume uploaded';
    }
    editProfileModal && editProfileModal.show();
  }

  if(saveProfileBtn){
    saveProfileBtn.addEventListener('click', async ()=>{
      const token = getToken();
      if(!token) { toast('Login to edit profile', { type:'error' }); return; }
      const fd = new FormData();
      const name = (document.getElementById('edit-name')||{}).value || '';
      const bio = (document.getElementById('edit-bio')||{}).value || '';
      const skills = (document.getElementById('edit-skills')||{}).value || '';
      const companyName = (document.getElementById('edit-company-name')||{}).value || '';
      const fileInput = document.getElementById('edit-resume');

      if(name) fd.append('name', name);
      if(bio) fd.append('bio', bio);
      if(skills) fd.append('skills', skills);
      if(companyName) fd.append('companyName', companyName);
      if(fileInput && fileInput.files && fileInput.files[0]) fd.append('resume', fileInput.files[0]);

      try{
        const res = await fetch(API + '/users/me', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
        const data = await res.json();
        if(res.ok){
          editProfileModal && editProfileModal.hide();
          toast('Profile updated', { type:'success' });
          // Refresh profile UI
          init();
        } else {
          toast(data.message || 'Failed to update profile', { type:'error' });
        }
      }catch(e){
        toast('Network error', { type:'error' });
        console.error(e);
      }
    });
  }

  /* ------------------------------
     Initialization: set auth area, inject Edit button, and load jobs
     ------------------------------ */
  async function init(){
    // ensure confetti canvas sized
    resizeCanvas();

    const token = getToken();
    const authArea = document.getElementById('auth-area');
    if(!token){
      if(authArea) authArea.innerHTML = `<button class="btn btn-sm btn-outline-light ripple" id="nav-login" data-mode="login">Login</button>
                                         <button class="btn btn-sm btn-light ripple" id="nav-register" data-mode="register">Register</button>
                                         <button class="btn btn-sm btn-light ripple" id="open-apps">Applications</button>`;
      // rebind the nav buttons we just created
      const navLogin2 = document.getElementById('nav-login');
      const navRegister2 = document.getElementById('nav-register');
      const openApps2 = document.getElementById('open-apps');
      if(navLogin2) navLogin2.onclick = ()=> openAuthModal('login');
      if(navRegister2) navRegister2.onclick = ()=> openAuthModal('register');
      if(openApps2) openApps2.onclick = async ()=> { await loadApplications(); appsModal && appsModal.show(); };

      if(profileContent) profileContent.classList.add('d-none');
      if(guestContent) guestContent.classList.remove('d-none');
    } else {
      try{
        const r = await fetch(API + '/users/me', { headers: { 'Authorization': 'Bearer ' + token }});
        if(!r.ok){ setToken(null); return init(); }
        const user = await r.json();
        if(profileName) profileName.textContent = user.name || 'User';
        if(profileRole) profileRole.textContent = (user.role || 'candidate').toUpperCase();
        if(profileBio) profileBio.textContent = user.bio || (user.role === 'company' ? user.companyName || 'Company' : 'Candidate profile');
        if(profileContent) profileContent.classList.remove('d-none');
        if(guestContent) guestContent.classList.add('d-none');

        // prepare auth area with logout & apps
        if(authArea) authArea.innerHTML = `<div class="text-white small me-3">${escapeHtml(user.name)} (${escapeHtml(user.role)})</div><button class="btn btn-sm btn-light ripple" id="nav-logout">Logout</button><button class="btn btn-sm btn-light ripple" id="open-apps">Applications</button>`;
        const navLogout2 = document.getElementById('nav-logout');
        const openApps3 = document.getElementById('open-apps');
        if(navLogout2) navLogout2.onclick = ()=> { setToken(null); toast('Logged out', { type:'success' }); init(); };
        if(openApps3) openApps3.onclick = async ()=> { await loadApplications(); appsModal && appsModal.show(); };

        // If an edit button already exists in the DOM, attach handler to it.
        const existingEditBtn = document.getElementById('edit-profile-btn');
        if(existingEditBtn){
          // ensure it has the proper class for styling if needed
          existingEditBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary', 'mt-3');
          // replace previous handler (safe)
          existingEditBtn.onclick = ()=> openEditProfile(user);
        } else if(profileContent && !existingEditBtn) {
          // Add Edit Profile button to profile content (only once) if not present
          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-sm btn-outline-secondary mt-3';
          editBtn.id = 'edit-profile-btn';
          editBtn.textContent = 'Edit Profile';
          editBtn.addEventListener('click', ()=> openEditProfile(user));
          profileContent.appendChild(editBtn);
        }
      }catch(e){ setToken(null); init(); }
    }
    await loadJobs();
  }

  // start
  init();

}); // DOMContentLoaded end
