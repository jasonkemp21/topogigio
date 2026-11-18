/* ---------- rendering: open or closed, hours, house dishes, menu, trays ---------- */
function nextOpen(now) {
  for (let i = 0; i < 8; i++) {
    const d = (now.d + i) % 7, h = HOURS[d];
    if (!h) continue;
    if (i === 0 && now.mins >= h.open) continue;
    return { d, i, h };
  }
  return null;
}
function openState() {
  const now = chicagoNow(), h = HOURS[now.d];
  if (h && now.mins >= h.open && now.mins < h.close) return { open: true, now, h, text: 'Open now until ' + fmtT(h.close) };
  const n = nextOpen(now), day = n.i === 0 ? 'today' : n.i === 1 ? 'tomorrow' : DAYS[n.d];
  const lead = !h ? 'Closed today.' : 'Closed now.';
  return { open: false, now, h, next: n, text: lead + ' Opens ' + day + ' at ' + fmtT(n.h.open) };
}
function renderStatus() {
  const s = openState(), el = $('#status');
  el.classList.toggle('is-open', s.open); $('span', el).textContent = s.text;
  const b = $('#tn-hours'), sub = $('#tn-hours-sub'), h = s.h;
  if (!h) { b.textContent = 'Closed on Mondays'; sub.textContent = 'Open Tuesday from ' + fmtT(HOURS[2].open) + '.'; }
  else {
    b.textContent = 'Open today, ' + fmtT(h.open) + ' to ' + fmtT(h.close);
    sub.textContent = h.lunch ? 'Lunch until ' + fmtT(LUNCH_END) + ', then dinner.' + (h.late ? ' The bar stays open late.' : '') : 'Dinner only on Sundays.';
  }
  renderHours();
}
function renderHours() {
  const today = chicagoNow().d, order = [2, 3, 4, 5, 6, 0, 1];
  const html = order.map(d => { const h = HOURS[d]; return `<tr class="${d === today ? 'is-today' : ''}"><td>${DAYS[d]}</td><td>${h ? fmtT(h.open) + ' to ' + fmtT(h.close) + (h.late ? '<small>Bar open late</small>' : '') : 'Closed'}</td></tr>`; }).join('');
  ['#hours', '#hours-home'].forEach(id => { const t = $(id); if (t) t.innerHTML = '<tbody>' + html + '</tbody>'; });
}

const tagsHTML = t => t && t.length ? `<span class="dt">${t.map(k => `<abbr title="${DIET[k]}">${k}</abbr>`).join('')}</span>` : '';
function dishHTML(i) {
  return `<div class="dish"><div class="dish__top"><span class="dish__name">${esc(i.n)}${i.x ? `<small>${esc(i.x)}</small>` : ''}${tagsHTML(i.t)}</span>${i.p != null ? `<span class="dish__dots"></span><span class="dish__price">${money(i.p)}</span>` : ''}</div>${i.d || i.r ? `<p>${esc(i.d || i.r)}</p>` : ''}</div>`;
}
function renderFav() {
  const all = MENU.dinner.flatMap(s => s.items);
  $('#fav').innerHTML = FAVOURITES.map(n => all.find(i => i.n === n)).filter(Boolean).map(dishHTML).join('');
}
function renderQuotes() {
  $('#quotes').innerHTML = QUOTES.map(q => `<blockquote class="quote"><p>“${esc(q)}”</p><cite>From a Google review</cite></blockquote>`).join('');
}

/* menu page */
const MSTATE = { tab: null, q: '', diet: [] };
function defaultMenu() { const n = chicagoNow(), h = HOURS[n.d]; return h && h.lunch && n.mins < LUNCH_END ? 'lunch' : 'dinner'; }
function renderMenu() {
  if (!MSTATE.tab) MSTATE.tab = defaultMenu();
  const tab = MSTATE.tab, food = tab !== 'drinks', q = MSTATE.q.toLowerCase();
  $$('#mtabs button').forEach(b => { const on = b.dataset.menu === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  $('#m-diet').hidden = !food;
  $$('#m-diet button').forEach(b => { const on = MSTATE.diet.includes(b.dataset.diet); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  $('#m-title').textContent = MENUS[tab].title; $('#m-when').textContent = MENUS[tab].when;
  const diet = food ? MSTATE.diet : [];
  const secs = MENU[tab].map((s, n) => ({ n, s, items: s.items.filter(i => (!q || (i.n + ' ' + (i.d || '') + ' ' + (i.r || '') + ' ' + (i.x || '')).toLowerCase().includes(q)) && diet.every(k => (i.t || []).includes(k))) })).filter(x => x.items.length);
  const name = s => s.it || s.title;
  $('#m-jump').innerHTML = secs.map(x => `<button class="u" type="button" data-jump="msec-${x.n}">${esc(x.s.en || name(x.s))}</button>`).join('');
  const total = secs.reduce((a, x) => a + x.items.length, 0);
  const filtered = q || diet.length;
  $('#m-body').innerHTML = (filtered ? `<p class="note" style="padding-top:18px">${total} ${total === 1 ? 'item' : 'items'} ${q ? 'matching “' + esc(MSTATE.q) + '”' : ''}${q && diet.length ? ', ' : ''}${diet.map(k => DIET[k].toLowerCase()).join(' and ')}. <button class="u" type="button" id="m-clear">Show everything</button></p>` : '')
    + (secs.length ? secs.map(x => `<section class="msec" id="msec-${x.n}" style="scroll-margin-top:calc(var(--head) + 70px)"><h2 class="h-m">${esc(name(x.s))}${x.s.en ? `<small>${esc(x.s.en)}</small>` : ''}</h2><div class="mcols${!food && x.items.every(i => !i.d) ? ' mcols--3' : ''}">${x.items.map(dishHTML).join('')}</div></section>`).join('')
      : `<p class="kempty">Nothing on the ${esc(MENUS[tab].title.toLowerCase())} menu matches that.</p>`);
  const c = $('#m-clear'); if (c) c.addEventListener('click', () => { MSTATE.q = ''; MSTATE.diet = []; $('#m-q').value = ''; renderMenu(); });
  $('#m-notes').innerHTML = MENU_NOTES[food ? 'food' : 'drinks'].map(n => `<p><b>${n[0]}.</b> ${n[1]}</p>`).join('')
    + (food ? `<p class="mkey">${Object.keys(DIET).map(k => `<span><span class="dt" style="margin-left:0"><abbr title="${DIET[k]}">${k}</abbr></span> ${DIET[k]}</span>`).join('')}</p>` : '');
}
$$('#mtabs button').forEach(b => b.addEventListener('click', () => { MSTATE.tab = b.dataset.menu; renderMenu(); }));
$$('#m-diet button').forEach(b => b.addEventListener('click', () => { const k = b.dataset.diet, i = MSTATE.diet.indexOf(k); if (i < 0) MSTATE.diet.push(k); else MSTATE.diet.splice(i, 1); renderMenu(); }));
$('#m-q').addEventListener('input', e => { MSTATE.q = e.target.value.trim(); renderMenu(); });

/* catering trays */
function renderTrays() {
  $('#trays').innerHTML = MENU.catering.map((s, n) => `<details class="trays"${n === 0 ? ' open' : ''}><summary><span>${esc(s.title)}<small>${s.items.length} dishes</small></span></summary>
    <div class="tray tray--head"><span style="text-align:left">Dish</span><span>Half pan</span><span>Full pan</span></div>
    ${s.items.map(i => `<div class="tray"><b>${esc(i.n)}</b><span>${esc(String(i.a).replace(/\.00$/, ''))}</span><span>${esc(String(i.b).replace(/\.00$/, '').replace(/^Each$/, 'each'))}</span>${i.d ? `<p>${esc(i.d)}</p>` : ''}</div>`).join('')}</details>`).join('');
}
