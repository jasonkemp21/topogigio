/* ---------- staff portal (#admin). On the real site this sits behind a staff login. ---------- */
const ADM = { tab: 'people', filter: '', q: '', sel: null };
const ST_CLASS = { 'New': 'st-new', 'Replied': 'st-contacted', 'Booked': 'st-wl', 'Closed': 'st-member' };

/* Sample people, so the portal has something in it the first time it is opened. They are tagged and can be removed. */
function seedSamples() {
  if (STATE.seeded) return; STATE.seeded = true;
  const H = 36e5, now = Date.now();
  const rows = [
    { h: 3,  p: { name: 'Maya R.', email: 'maya.r@example.com', phone: '312-555-0142' }, status: 'New', kind: 'Banquet inquiry', title: 'Rehearsal dinner, 55 guests', body: 'A Friday in June. Plated four-course dinner. Notes: two vegetarians, would like the room from 6 pm.' },
    { h: 6,  kind: 'OpenTable', title: 'Table for 4, Friday at 7:00 pm', body: 'Left the site to book this table on OpenTable.' },
    { h: 9,  p: { name: 'Dan K.', email: 'dan.k@example.com', phone: '312-555-0117' }, status: 'New', kind: 'Catering request', title: 'For 30 people, pick-up Thursday at 12:30 pm', body: 'One full pan of Rigatoni al Filo di Fumo, one full pan of house salad, 30 cannoli.' },
    { h: 27, p: { name: 'Priya S.', email: 'priya.s@example.com' }, status: 'Replied', notes: 'Emailed her the total. She will pay and pick up on Saturday.', kind: 'Gift request', title: 'Gift card, $150', body: 'A wedding present. Would like it in an envelope.' },
    { h: 30, kind: 'OpenTable', title: 'Table for 2, Saturday at 6:30 pm', body: 'Left the site to book this table on OpenTable.' },
    { h: 52, p: { name: 'Chris L.', email: 'chris.l@example.com', phone: '312-555-0125' }, status: 'Replied', notes: 'Sent the buffet menu and two open Thursdays. Waiting to hear back.', kind: 'Banquet inquiry', title: 'Company event, 80 guests', body: 'A Thursday in December. Buffet. Notes: needs a screen for a short presentation.' },
    { h: 75, p: { name: 'Ana M.', phone: '312-555-0163' }, status: 'New', kind: 'Message', title: 'A question', body: 'Is the tent open this week, and can we bring a stroller?' },
    { h: 120, p: { name: 'Tom B.', email: 'tom.b@example.com', phone: '312-555-0188' }, status: 'Booked', notes: 'Date confirmed. Menu chosen: plated, whitefish or veal, pasta course added.', kind: 'Banquet inquiry', title: 'Anniversary or birthday, 45 guests', body: 'A Saturday in January. Plated four-course dinner.' },
  ];
  rows.forEach((r, n) => {
    const ts = now - r.h * H; let pid = null;
    if (r.p) { pid = 'ps' + n; STATE.people.push({ id: pid, key: 'sample-' + n, name: r.p.name, email: r.p.email || '', phone: r.p.phone || '', status: r.status, notes: r.notes || '', first: ts, last: ts, sample: true }); }
    STATE.events.push({ id: 'es' + n, pid, kind: r.kind, title: r.title, body: r.body, ts, sample: true });
  });
  STATE.events.sort((a, b) => b.ts - a.ts);
  save();
}

const eventsOf = p => STATE.events.filter(e => e.pid === p.id);
function nextStep(p) {
  const e = eventsOf(p)[0], k = e ? e.kind : '';
  if (p.status === 'Replied') return 'Waiting on them. Follow up if you haven’t heard back.';
  if (p.status === 'Booked') return 'Nothing to do. It is confirmed.';
  if (p.status === 'Closed') return 'Nothing to do.';
  if (k === 'Banquet inquiry') return 'Elizabeth: reply with availability and a quote.';
  if (k === 'Catering request') return 'Vince: confirm the order, the price and the pick-up time.';
  if (k === 'Gift request') return 'Vince: confirm the amount or size and how to pay. Pickup is at the restaurant.';
  return 'Reply to them.';
}
const tags = p => (p.sample ? '<span class="tag2">Sample</span>' : '');

function detailHTML(p, withName) {
  const ev = eventsOf(p);
  return `<div class="pd">
    ${withName ? `<h2 class="h-m">${esc(p.name || 'No name given')}</h2>` : ''}
    <div class="pd__tags">${tags(p)}</div>
    <dl class="pd__info">
      <div><dt>Email</dt><dd>${p.email ? `<a class="u" href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : 'Not given'}</dd></div>
      <div><dt>Phone</dt><dd>${p.phone ? `<a class="u" href="tel:${esc(p.phone.replace(/[^0-9+]/g, ''))}">${esc(p.phone)}</a>` : 'Not given'}</dd></div>
      <div><dt>First seen</dt><dd>${esc(fmtWhen(p.first))}</dd></div>
    </dl>
    <p class="q">Status</p>
    <div class="pd__status">${STATUSES.map(s => `<button type="button" class="${p.status === s ? 'on' : ''}" data-action="adm" data-do="status" data-id="${p.id}" data-s="${s}" aria-pressed="${p.status === s}">${s}</button>`).join('')}</div>
    <div class="pd__next"><b>Next step</b>${esc(nextStep(p))}</div>
    <label class="field"><span>Notes</span><textarea data-adm-notes="${p.id}" placeholder="Anything the next person to pick this up should know">${esc(p.notes)}</textarea></label>
    <p class="q" style="margin-top:22px">History</p>
    <ol class="pd__log">${ev.map(e => `<li><span>${esc(fmtWhen(e.ts))}</span><b>${esc(e.kind)}</b> ${esc(e.title)}<p>${esc(e.body)}</p></li>`).join('')}</ol>
  </div>`;
}

function peopleList() {
  const q = ADM.q.toLowerCase();
  return STATE.people.filter(p => (!ADM.filter || p.status === ADM.filter) && (!q || (p.name + ' ' + p.email + ' ' + p.phone).toLowerCase().includes(q))).sort((a, b) => b.last - a.last);
}
const wide = () => window.matchMedia('(min-width: 1021px)').matches;
function renderPeople() {
  const list = peopleList(), box = $('#adm-list'); if (!box) return;
  if (wide() && (!ADM.sel || !list.some(p => p.id === ADM.sel))) ADM.sel = list[0] ? list[0].id : null;
  box.innerHTML = list.length ? list.map(p => { const e = eventsOf(p)[0]; return `<button type="button" class="prow${ADM.sel === p.id ? ' on' : ''}" data-action="adm" data-do="open" data-id="${p.id}">
      <span class="prow__name">${esc(p.name || 'No name given')}${tags(p)}</span>
      <span class="prow__last">${e ? `<b>${esc(e.kind)}</b> ${esc(e.title)}` : ''}</span>
      <span class="prow__status ${ST_CLASS[p.status]}">${esc(p.status)}</span>
      <span class="prow__when">${esc(fmtWhen(p.last))}</span>
    </button>`; }).join('') : `<p class="kempty">${STATE.people.length ? 'Nobody matches that. Clear the search or pick another status.' : 'Nobody yet. Inquiries, requests and messages from the site appear here.'}</p>`;
  const d = $('#adm-detail'), p = STATE.people.find(x => x.id === ADM.sel);
  if (d) d.innerHTML = p ? detailHTML(p, true) : '<p class="kempty" style="border:0">Pick a person to see their details.</p>';
  if (p && !wide() && OV.open === 'sheet' && $('#sheet').dataset.person === p.id) personSheet(p);
}
function personSheet(p) {
  sheetSet('Staff portal', p.name || 'No name given', detailHTML(p, false), `<span></span><button class="btn btn-red" type="button" data-action="overlay-close">Done</button>`);
  $('#sheet').dataset.person = p.id;
  if (OV.open !== 'sheet') openOverlay('sheet');
}

function renderAdmin() {
  const root = $('#adm-root');
  $('#adm-out').hidden = !STATE.staff;
  if (!STATE.staff) {
    root.innerHTML = `<div class="wrap adm__gate">
      <h1 class="h-xl">Staff portal</h1>
      <p class="lead">The staff side of the site. Every banquet inquiry, catering request, gift card request and message lands here, one row per person, so nothing sits unanswered in one person's inbox.</p>
      <div class="btn-row" style="margin-top:28px"><button class="btn btn-red" type="button" data-action="adm" data-do="in">Open the portal</button></div>
      <p class="note" style="margin-top:18px;max-width:34em">On the live site this page is at /admin behind a staff login. This concept has no password.</p>
    </div>`;
    return;
  }
  const ev = STATE.events, ppl = STATE.people, cnt = s => ppl.filter(p => p.status === s).length;
  const samples = ppl.filter(p => p.sample).length;
  const stats = [
    [cnt('New'), 'people to reply to'],
    [ev.filter(e => e.kind === 'Banquet inquiry').length, 'banquet inquiries'],
    [ev.filter(e => e.kind === 'Catering request' || e.kind === 'Gift request').length, 'catering and gift requests'],
    [ev.filter(e => e.kind === 'OpenTable').length, 'click-throughs to OpenTable'],
  ];
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' });
  root.innerHTML = `<div class="wrap adm__in">
    <div class="adm__head"><h1 class="h-l">Staff portal</h1><span>${esc(today)}</span></div>
    <p class="adm__note">Concept portal. It shows what was submitted in this browser${samples ? ', plus ' + samples + ' sample people so it isn’t empty' : ''}. The live portal reads from the site’s database, so Elizabeth, Vince and the host stand all see the same list.${samples ? ' <button class="u" type="button" data-action="adm" data-do="clear">Remove the samples</button>' : ''}</p>
    <div class="adm__stats">${stats.map(s => `<div><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
    <div class="adm__tabs" role="tablist">
      <button type="button" role="tab" class="${ADM.tab === 'people' ? 'on' : ''}" data-action="adm" data-do="tab" data-v="people">People <small>${ppl.length}</small></button>
      <button type="button" role="tab" class="${ADM.tab === 'activity' ? 'on' : ''}" data-action="adm" data-do="tab" data-v="activity">Activity <small>${ev.length}</small></button>
    </div>
    ${ADM.tab === 'people' ? `<div class="adm__tools">
        <div class="cats">${['', ...STATUSES].map(s => `<button type="button" class="${ADM.filter === s ? 'on' : ''}" data-action="adm" data-do="filter" data-s="${s}">${s || 'Everyone'} <small>${s ? cnt(s) : ppl.length}</small></button>`).join('')}</div>
        <div class="adm__find"><input type="search" id="adm-q" placeholder="Search name, email or phone" aria-label="Search people" value="${esc(ADM.q)}"><button class="btn btn-s btn-line" type="button" data-action="adm" data-do="csv">Copy as CSV</button></div>
      </div>
      <div class="adm__split"><div class="ptable" id="adm-list"></div><aside class="adm__detail" id="adm-detail" aria-live="polite"></aside></div>`
    : `<div class="alog">${ev.length ? ev.map(e => { const p = ppl.find(x => x.id === e.pid); return `<div class="alog__row">
          <span class="alog__when">${esc(fmtWhen(e.ts))}</span>
          <span class="alog__kind${e.kind === 'OpenTable' ? ' is-wl' : ''}">${esc(e.kind)}</span>
          <span class="alog__what"><b>${p ? esc(p.name) : 'No details left'}</b> ${esc(e.title)}<small>${esc(e.body)}</small></span>
          ${p ? `<button class="u" type="button" data-action="adm" data-do="open" data-id="${p.id}">Open</button>` : '<span></span>'}
        </div>`; }).join('') : '<p class="kempty">Nothing yet.</p>'}</div>`}
  </div>`;
  if (ADM.tab === 'people') { renderPeople(); $('#adm-q').addEventListener('input', e => { ADM.q = e.target.value.trim(); renderPeople(); }); }
}

function csvText() {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [['Name', 'Email', 'Phone', 'Status', 'Latest', 'When', 'Notes']];
  peopleList().forEach(p => { const e = eventsOf(p)[0]; rows.push([p.name, p.email, p.phone, p.status, e ? e.kind + ': ' + e.title : '', fmtWhen(p.last), p.notes]); });
  return rows.map(r => r.map(q).join(',')).join('\n');
}
function adminAction(t) {
  const d = t.dataset.do, p = STATE.people.find(x => x.id === t.dataset.id);
  if (d === 'in') { STATE.staff = true; save(); renderAdmin(); window.scrollTo(0, 0); }
  else if (d === 'out') { STATE.staff = false; save(); renderAdmin(); }
  else if (d === 'clear') { STATE.people = STATE.people.filter(x => !x.sample); STATE.events = STATE.events.filter(x => !x.sample); ADM.sel = null; save(); renderAdmin(); renderInbox(); toast('Samples removed'); }
  else if (d === 'tab') { ADM.tab = t.dataset.v; renderAdmin(); }
  else if (d === 'filter') { ADM.filter = t.dataset.s; renderAdmin(); }
  else if (d === 'open' && p) {
    ADM.sel = p.id;
    if (ADM.tab !== 'people') { ADM.tab = 'people'; ADM.filter = ''; ADM.q = ''; renderAdmin(); } else renderPeople();
    if (!wide()) personSheet(p);
  }
  else if (d === 'status' && p) { p.status = t.dataset.s; save(); renderAdmin(); if (!wide() && OV.open === 'sheet') personSheet(p); toast(p.name + ' marked ' + p.status); }
  else if (d === 'csv') {
    const text = csvText(), n = peopleList().length;
    const fallback = () => { sheetSet('Staff portal', 'People as CSV', `<p style="margin-bottom:14px">Select all of this and copy it into a spreadsheet.</p><label class="field"><span class="sr">CSV</span><textarea readonly style="min-height:320px;font-size:13.5px;white-space:pre">${esc(text)}</textarea></label>`, `<span></span><button class="btn btn-red" type="button" data-action="overlay-close">Done</button>`); delete $('#sheet').dataset.person; openOverlay('sheet'); };
    try { navigator.clipboard.writeText(text).then(() => toast('Copied ' + n + ' ' + (n === 1 ? 'person' : 'people') + ' as CSV'), fallback); } catch (e) { fallback(); }
  }
}
document.addEventListener('input', e => {
  const t = e.target.closest('[data-adm-notes]'); if (!t) return;
  const p = STATE.people.find(x => x.id === t.dataset.admNotes); if (p) { p.notes = t.value; save(); }
});
