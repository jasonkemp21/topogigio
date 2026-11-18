/* ---------- reserve panel and request forms ---------- */
function sheetSet(label, title, body, foot) {
  $('#sheet-label').textContent = label; $('#sheet-title').textContent = title;
  $('#sheet-body').innerHTML = body; $('#sheet-foot').innerHTML = foot || '';
  $('#sheet-body').scrollTop = 0;
  delete $('#sheet').dataset.person;
}
const todayKey = () => dayKey(Date.now());
const parseDay = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
const niceDay = k => parseDay(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

/* Reserve: three questions, then OpenTable with them filled in. OpenTable stays the reservation book. */
function slotsFor(k) {
  const h = HOURS[parseDay(k).getDay()]; if (!h) return [];
  const out = [], now = chicagoNow(), today = k === todayKey();
  for (let m = h.open; m <= h.close - 30; m += 30) if (!today || m > now.mins) out.push(m);
  return out;
}
function firstBookable() { let k = todayKey(); for (let i = 0; i < 8; i++) { if (slotsFor(k).length) return k; k = addDays(k, 1); } return todayKey(); }
function openReserve() {
  const k = firstBookable();
  sheetSet('Dining room', 'Reserve a table', `
    <div class="form-grid">
      <label class="field span2"><span>Date</span><input type="date" id="rs-date" min="${todayKey()}" value="${k}"></label>
      <label class="field"><span>Time</span><select id="rs-time"></select></label>
      <label class="field"><span>Party size</span><select id="rs-size">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}"${n === 2 ? ' selected' : ''}>${n} ${n === 1 ? 'person' : 'people'}</option>`).join('')}<option value="big">More than 10</option></select></label>
    </div>
    <div id="rs-msg"></div>
    <div class="rnote"><b>The garden, the tent and the bars can't be booked</b>They are first come, first served. Just come by.</div>
    <div class="rnote"><b>Planning for 40 to 90 guests?</b>That's the private room upstairs. <a class="u" href="#events" data-action="overlay-close">See private events</a></div>
    <p class="note" style="margin-top:18px">The button below opens Topo Gigio's real OpenTable page in a new tab. Unlike the rest of this concept, a table booked there is a real reservation.</p>`,
    `<a class="btn btn-line" href="tel:+13122669355"><svg class="ic"><use href="#i-tel"/></svg>Call</a><a class="btn btn-red" id="rs-go" target="_blank" rel="noopener">Find this table on OpenTable</a>`);
  const date = $('#rs-date'), time = $('#rs-time'), size = $('#rs-size'), go = $('#rs-go'), msg = $('#rs-msg');
  let label = '';
  function sync(keepTime) {
    const kk = date.value || k, slots = slotsFor(kk), prev = keepTime ? Number(time.value) : 0;
    time.innerHTML = slots.map(m => `<option value="${m}">${fmtT(m)}</option>`).join('');
    const pick = slots.includes(prev) ? prev : slots.includes(1140) ? 1140 : slots[0];
    if (pick != null) time.value = String(pick);
    time.disabled = !slots.length;
    const big = size.value === 'big', closed = !HOURS[parseDay(kk).getDay()];
    msg.innerHTML = closed ? `<p class="rclosed">We're closed on Mondays. Pick another day.</p>`
      : !slots.length ? `<p class="rclosed">The kitchen has closed for today. Pick another day.</p>`
      : big ? `<p class="rclosed">For more than 10, call us at <a class="tel" href="tel:+13122669355">${PHONE}</a> and we'll work it out.</p>` : '';
    const ok = slots.length && !big;
    go.hidden = !ok;
    if (ok) {
      const m = Number(time.value), n = Number(size.value);
      go.href = OPENTABLE + '?p=' + n + '&sd=' + kk + 'T' + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') + ':00';
      label = 'Table for ' + n + ', ' + niceDay(kk) + ' at ' + fmtT(m);
    }
  }
  date.addEventListener('change', () => sync(true)); time.addEventListener('change', () => sync(true)); size.addEventListener('change', () => sync(true));
  go.addEventListener('click', () => { inboxAdd('OpenTable', label, 'Left the site to book this table on OpenTable.'); toast('Opening OpenTable in a new tab'); });
  sync(false);
  openOverlay('sheet');
}

/* request forms. Each one writes a row to the staff portal and shows what happens next. */
function clearErrs(form) { $$('.field--err', form).forEach(f => f.classList.remove('field--err')); $$('.err', form).forEach(e => e.remove()); }
function fieldErr(form, name, text) {
  const f = form.elements[name].closest('.field'); f.classList.add('field--err');
  const s = document.createElement('small'); s.className = 'err'; s.textContent = text; f.appendChild(s);
}
function validate(form) {
  clearErrs(form); let ok = true;
  $$('[required]', form).forEach(i => {
    const bad = !i.value.trim() || (i.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value.trim()));
    if (bad) { ok = false; fieldErr(form, i.name, i.type === 'email' && i.value.trim() ? 'That email address doesn’t look right.' : 'Please fill this in.'); }
  });
  return ok;
}
function bindForm(id, build) {
  const form = $(id), orig = form.innerHTML;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form).entries());
    let ok = validate(form);
    const r = build(v, form, ok);
    if (!ok || !r) { const bad = $('.field--err input, .field--err select, .field--err textarea', form); if (bad) bad.focus(); toast('Check the fields marked in red'); return; }
    inboxAdd(r.kind, r.title, r.body, r.person);
    form.innerHTML = `<h2 class="h-m">${esc(r.done)}</h2>
      <div class="ok-box" style="margin-top:14px"><b>${esc(r.title)}</b><br>${esc(r.next)}</div>
      <p class="note" style="margin-top:14px">This is a concept, so nothing was emailed. On the real site this goes to ${esc(r.to)} and into the staff portal.</p>
      <div class="btn-row" style="margin-top:20px"><a class="btn btn-ink" href="#admin">See it in the staff portal</a><button class="u" type="button" data-again>Send another</button></div>`;
    form.scrollIntoView({ block: 'nearest' });
  });
  form.addEventListener('click', e => { if (e.target.closest('[data-again]')) { form.innerHTML = orig; setDateMins(); } });
  form.addEventListener('input', e => { const f = e.target.closest('.field--err'); if (f) { f.classList.remove('field--err'); const s = $('.err', f); if (s) s.remove(); } });
}
function setDateMins() { $$('main input[type="date"]').forEach(i => { i.min = todayKey(); }); }

bindForm('#ev-form', (v, form, ok) => {
  const g = Number(v.guests);
  if (v.guests && (g < 40 || g > 90)) { fieldErr(form, 'guests', g < 40 ? 'The room is for 40 guests or more. For a smaller group, reserve a table or call us.' : 'The room holds 90 at most. Call Elizabeth and we’ll talk it through.'); return null; }
  if (!ok) return null;
  return { kind: 'Banquet inquiry', title: v.type + ', ' + g + ' guests', person: v, done: 'Inquiry sent', to: 'Elizabeth',
    body: (v.date ? niceDay(v.date) : 'No date given') + '. ' + (v.format === 'Not sure yet' ? 'Style of service not decided' : v.format) + '.' + (v.notes.trim() ? ' Notes: ' + v.notes.trim() : ''),
    next: 'Elizabeth replies with availability and a quote.' };
});
bindForm('#cat-form', (v, form, ok) => {
  if (v.date) {
    const wd = parseDay(v.date).getDay(), ahead = daysBetween(todayKey(), v.date);
    if (ahead < 2) { fieldErr(form, 'date', 'We need at least 48 hours. The earliest we can do is ' + niceDay(addDays(todayKey(), 2)) + '.'); return null; }
    if (![0, 2, 3, 4].includes(wd)) { fieldErr(form, 'date', 'Catering pick-up is Tuesday to Thursday and Sunday.'); return null; }
  }
  if (!ok) return null;
  return { kind: 'Catering request', title: 'For ' + v.guests + ' people, pick-up ' + niceDay(v.date) + ' at ' + v.time, person: v, done: 'Request sent', to: 'Vince',
    body: v.order.trim(), next: 'Vince confirms the order and the price with you before anything is cooked.' };
});
bindForm('#gift-form', (v, form, ok) => {
  if (!ok) return null;
  return { kind: 'Gift request', title: v.what + ', ' + v.detail.trim(), person: v, done: 'Request sent', to: 'Vince',
    body: v.notes.trim() || 'Pickup at the restaurant.', next: 'Vince replies to confirm it and how to pay. Pickup is at the restaurant.' };
});
bindForm('#contact-form', (v, form, ok) => {
  if (!ok) return null;
  return { kind: 'Message', title: v.about, person: v, done: 'Message sent', to: 'the restaurant’s inbox',
    body: v.msg.trim(), next: 'We reply by email or phone.' };
});

function askEvent(t) {
  const fmt = t && t.dataset.format;
  const go = () => {
    const f = $('#ev-form'); if (!f.elements.name) f.querySelector('[data-again]').click();
    if (fmt) f.elements.format.value = fmt;
    f.scrollIntoView({ block: 'center' }); f.elements.name.focus({ preventScroll: true });
    if (fmt) toast('Style of service set to ' + fmt.toLowerCase());
  };
  if (currentPage === 'events') go(); else { afterRoute = go; location.hash = '#events'; }
}

function init() {
  seedSamples();
  renderFav(); renderQuotes(); renderTrays(); renderInbox(); setDateMins();
  setInterval(() => { if (currentPage === 'home' || currentPage === 'visit') renderStatus(); }, 60000);
  route();
}
init();

/* for the test harness */
window.__tg = { STATE, MENU, HOURS, chicagoNow, openState, slotsFor, todayKey, addDays, parseDay };
