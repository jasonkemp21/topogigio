/* ---------- core: helpers, clock, state, router, overlays ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => n == null ? '' : (Number.isInteger(n) ? '$' + n.toLocaleString('en-US') : '$' + n.toFixed(2));
const fmtT = m => { const h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'pm' : 'am', hh = ((h + 11) % 12) + 1; return hh + ':' + String(mm).padStart(2, '0') + ' ' + ap; };
const fmtEnd = (m, len) => fmtT(m + len);

/* The site runs on the restaurant's clock (Chicago), wherever the visitor is. */
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function chicagoNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
  const g = t => (parts.find(p => p.type === t) || {}).value;
  let h = parseInt(g('hour'), 10); if (h === 24) h = 0;
  return { d: WD[g('weekday')], mins: h * 60 + parseInt(g('minute'), 10) };
}

/* demo state, kept in memory and mirrored to localStorage as a convenience */
const STATE = { people: [], events: [], staff: false, seeded: false };
try { const s = JSON.parse(localStorage.getItem('tg-concept-1') || 'null'); if (s && Array.isArray(s.events) && Array.isArray(s.people)) Object.assign(STATE, s); } catch (e) {}
function save() { try { localStorage.setItem('tg-concept-1', JSON.stringify(STATE)); } catch (e) {} }

/* staff records: one row per person, one event per thing they asked for. Every form on the site writes here. */
const STATUSES = ['New', 'Replied', 'Booked', 'Closed'];
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function personFor(p) {
  if (!p) return null;
  const name = String(p.name || [p.first, p.last].filter(Boolean).join(' ')).trim();
  let email = String(p.email || '').trim(), phone = String(p.phone || '').trim();
  if (p.contact) { const c = String(p.contact).trim(); if (c.includes('@')) email = email || c; else phone = phone || c; }
  const key = (email || phone || name).toLowerCase(); if (!key) return null;
  let rec = STATE.people.find(x => x.key === key);
  if (!rec) { rec = { id: uid('p'), key, name, email, phone, status: 'New', notes: '', first: Date.now(), last: Date.now() }; STATE.people.push(rec); }
  else { if (name) rec.name = name; if (email) rec.email = email; if (phone) rec.phone = phone; }
  return rec;
}
function inboxAdd(kind, title, body, person) {
  const rec = personFor(person), ts = Date.now();
  STATE.events.unshift({ id: uid('e'), pid: rec ? rec.id : null, kind, title, body, ts });
  if (rec) rec.last = ts;
  save(); renderInbox(); if (currentPage === 'admin') renderAdmin();
  return rec;
}
const dayKey = ts => new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
function fmtWhen(ts) {
  const t = new Date(ts).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }).toLowerCase();
  const d = dayKey(ts);
  if (d === dayKey(Date.now())) return 'Today ' + t;
  if (d === dayKey(Date.now() - 864e5)) return 'Yesterday ' + t;
  return new Date(ts).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }) + ', ' + t;
}

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

/* overlays */
const OV = { open: null };
function openOverlay(id) {
  closeOverlay();
  const el = $('#' + id); el.classList.add('on'); el.setAttribute('aria-hidden', 'false');
  $('#scrim').classList.add('on'); document.body.classList.add('locked'); OV.open = id;
}
function closeOverlay() {
  if (!OV.open) return;
  const el = $('#' + OV.open); el.classList.remove('on'); el.setAttribute('aria-hidden', 'true');
  $('#scrim').classList.remove('on'); document.body.classList.remove('locked'); OV.open = null;
}
function openMenu() { $('#nav-menu').classList.add('on'); $('#nav-menu').setAttribute('aria-hidden', 'false'); document.body.classList.add('locked'); }
function closeMenu() { $('#nav-menu').classList.remove('on'); $('#nav-menu').setAttribute('aria-hidden', 'true'); if (!OV.open) document.body.classList.remove('locked'); }

/* router: plain #names only. A few names are sections inside a page. */
const PAGES = ['home', 'menu', 'events', 'catering', 'gifts', 'story', 'visit', 'admin'];
const INSIDE = { carryout: ['menu', 'sec-carryout'], parking: ['visit', 'sec-parking'] };
const TITLES = { home: 'Topo Gigio website concept', menu: 'Menu | Topo Gigio concept', events: 'Private events | Topo Gigio concept', catering: 'Catering | Topo Gigio concept', gifts: 'Gift cards | Topo Gigio concept', story: 'Our story | Topo Gigio concept', visit: 'Hours and location | Topo Gigio concept', admin: 'Staff | Topo Gigio concept' };
let currentPage = null, afterRoute = null;
function route() {
  let h = (location.hash || '#home').slice(1), target = null;
  if (INSIDE[h]) { target = INSIDE[h][1]; h = INSIDE[h][0]; }
  if (!PAGES.includes(h)) h = 'home';
  if (h !== currentPage) {
    $$('.page').forEach(p => p.classList.toggle('on', p.dataset.page === h));
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === h));
    document.title = TITLES[h];
    currentPage = h;
    if (h === 'menu') renderMenu();
    if (h === 'home' || h === 'visit') renderStatus();
    document.body.classList.toggle('admin', h === 'admin');
    if (h === 'admin') renderAdmin();
  }
  if (target) { const el = document.getElementById(target); if (el) el.scrollIntoView(); } else window.scrollTo(0, 0);
  setOver();
  if (afterRoute) { const f = afterRoute; afterRoute = null; f(); }
}
window.addEventListener('hashchange', route);

/* the header is clear while it sits on the home hero */
function setOver() {
  const hero = $('.hero');
  const over = currentPage === 'home' && hero && window.scrollY < hero.offsetHeight - 80 - (hero.offsetTop || 0);
  document.body.classList.toggle('over', !!over);
}
window.addEventListener('scroll', setOver, { passive: true });
window.addEventListener('resize', setOver);

/* one listener for every data-action */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action], [data-ptab-go], [data-jump]');
  if (!t) return;
  if (t.dataset.ptabGo) { pitchTab(t.dataset.ptabGo); return; }
  if (t.dataset.jump) { const el = document.getElementById(t.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
  const a = t.dataset.action;
  if (a === 'menu-open') openMenu();
  else if (a === 'menu-close') closeMenu();
  else if (a === 'overlay-close') closeOverlay();
  else if (a === 'pitch-open') openOverlay('pitch');
  else if (a === 'pitch-jump') closeOverlay();
  else if (a === 'reserve') { closeMenu(); openReserve(); }
  else if (a === 'ask-event') askEvent(t);
  else if (a === 'adm') adminAction(t);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeOverlay(); closeMenu(); } });

/* pitch notes */
function pitchTab(name) {
  $$('.ptabs button').forEach(b => b.classList.toggle('on', b.dataset.ptab === name));
  $$('.pitch__body > section').forEach(s => s.classList.toggle('on', s.dataset.ptab === name));
  $('.pitch__body').scrollTop = 0;
  if (!$('#pitch').classList.contains('on')) openOverlay('pitch');
}
$$('.ptabs button').forEach(b => b.addEventListener('click', () => pitchTab(b.dataset.ptab)));
function renderInbox() {
  const box = $('#inbox'), cnt = $('#inbox-cnt'), mine = STATE.events.filter(e => !e.sample);
  if (!mine.length) { box.innerHTML = '<p class="inbox-empty">Nothing yet. Send a banquet inquiry, a catering request or a message, or use Reserve, and it shows up here and in the portal.</p>'; cnt.hidden = true; return; }
  cnt.hidden = false; cnt.textContent = mine.length;
  box.innerHTML = mine.map(e => { const p = STATE.people.find(x => x.id === e.pid); return `<div class="inbox-item"><div class="kind"><span>${esc(e.kind)}</span><span>${esc(fmtWhen(e.ts))}</span></div><b>${p ? esc(p.name) + ': ' : ''}${esc(e.title)}</b><p>${esc(e.body)}</p></div>`; }).join('');
}
