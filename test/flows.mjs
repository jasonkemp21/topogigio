// Click-through checks of every flow. Usage: node test/flows.mjs
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
import { chromium } from './pw.mjs';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'file://' + (fs.existsSync(path.join(R, 'site/index.html')) ? path.join(R, 'site/index.html') : path.join(R, 'index.html'));
let pass = 0; const fails = [];
const ok = (c, name) => { if (c) pass++; else fails.push(name); };
const b = await chromium.launch();

async function fresh(vp, at) {
  const ctx = await b.newContext({ viewport: vp || { width: 1366, height: 850 }, timezoneId: 'America/Chicago' });
  const pg = await ctx.newPage();
  if (at) await pg.clock.install({ time: new Date(at) });
  pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') pg.errs.push(m.text()); });
  pg.on('popup', p => p.close().catch(() => {}));
  await pg.goto(FILE + '#home'); await pg.waitForTimeout(250);
  return pg;
}
const txt = (pg, sel) => pg.locator(sel).first().innerText();

/* 1. open or closed, at fixed Chicago times (CST is UTC-6 in November) */
for (const [at, want, tn] of [
  ['2026-11-17T19:00:00-06:00', 'Open now until 10:00 pm', 'Open today, 11:30 am to 10:00 pm'],      // Tuesday evening
  ['2026-11-17T09:00:00-06:00', 'Closed now. Opens today at 11:30 am', 'Open today, 11:30 am to 10:00 pm'],
  ['2026-11-17T22:30:00-06:00', 'Closed now. Opens tomorrow at 11:30 am', 'Open today, 11:30 am to 10:00 pm'],
  ['2026-11-16T13:00:00-06:00', 'Closed today. Opens tomorrow at 11:30 am', 'Closed on Mondays'],     // Monday
  ['2026-11-15T21:30:00-06:00', 'Closed now. Opens Tuesday at 11:30 am', 'Open today, 4:00 pm to 9:00 pm'], // Sunday night
  ['2026-11-21T22:15:00-06:00', 'Open now until 10:30 pm', 'Open today, 11:30 am to 10:30 pm'],      // Saturday late
  ['2026-11-22T12:00:00-06:00', 'Closed now. Opens today at 4:00 pm', 'Open today, 4:00 pm to 9:00 pm'], // Sunday noon
]) {
  const pg = await fresh(null, at);
  ok((await txt(pg, '#status')) === want, `status at ${at}: got "${await txt(pg, '#status')}" want "${want}"`);
  ok((await txt(pg, '#tn-hours')) === tn, `hours line at ${at}: got "${await txt(pg, '#tn-hours')}"`);
  ok(pg.errs.length === 0, 'errors at ' + at + ': ' + pg.errs.join('; '));
  await pg.context().close();
}

/* 2. home content */
{
  const pg = await fresh(null, '2026-11-17T19:00:00-06:00');
  ok(await pg.locator('#fav .dish').count() === 6, 'six house dishes');
  ok(await pg.locator('#quotes .quote').count() === 3, 'three quotes');
  ok(await pg.locator('#hours-home tr').count() === 7, 'seven hour rows');
  ok((await txt(pg, '#hours-home tr.is-today td')).startsWith('Tuesday'), 'today row is Tuesday');
  const imgs = await pg.evaluate(async () => { const out = []; for (const i of document.querySelectorAll('img')) { i.loading = 'eager'; } await new Promise(r => setTimeout(r, 900)); document.querySelectorAll('img').forEach(i => { if (!i.complete || !i.naturalWidth) out.push(i.getAttribute('src')); }); return out; });
  ok(imgs.length === 0, 'broken images: ' + imgs.join(', '));

  /* 3. menu */
  await pg.goto(FILE + '#menu'); await pg.waitForTimeout(200);
  ok((await txt(pg, '#m-title')) === 'Dinner', 'menu opens on dinner at 7 pm');
  ok(await pg.locator('#m-body .dish').count() === 81, 'dinner has 81 dishes, got ' + await pg.locator('#m-body .dish').count());
  await pg.fill('#m-q', 'clams');
  const n = await pg.locator('#m-body .dish').count();
  ok(n > 0 && n < 12, 'search for clams narrows the list, got ' + n);
  await pg.click('#m-clear'); ok(await pg.locator('#m-body .dish').count() === 81, 'show everything restores the list');
  await pg.click('#m-diet [data-diet=V]');
  const v = await pg.locator('#m-body .dish').count();
  ok(v > 0 && v < 81 && await pg.evaluate(() => Array.from(document.querySelectorAll('#m-body .dish')).every(d => Array.from(d.querySelectorAll('abbr')).some(a => a.textContent === 'V'))), 'vegetarian filter shows only V dishes');
  await pg.click('#m-diet [data-diet=GF]');
  ok(await pg.evaluate(() => Array.from(document.querySelectorAll('#m-body .dish')).every(d => { const t = Array.from(d.querySelectorAll('abbr')).map(a => a.textContent); return t.includes('V') && t.includes('GF'); })), 'two filters combine');
  await pg.fill('#m-q', 'zzzz'); ok(await pg.locator('#m-body .kempty').count() === 1, 'no-match message');
  await pg.click('#m-clear');
  await pg.click('#mtabs [data-menu=drinks]');
  ok((await txt(pg, '#m-title')) === 'Wine and cocktails' && await pg.locator('#m-diet').isHidden(), 'drinks tab hides the dietary filters');
  ok(await pg.locator('#m-body .msec').count() === 9, 'nine drink sections');
  await pg.click('#mtabs [data-menu=lunch]'); ok(await pg.locator('#m-body .msec').count() === 8, 'eight lunch sections');
  await pg.locator('#m-jump button').nth(3).click(); await pg.waitForTimeout(700);
  ok(await pg.evaluate(() => window.scrollY > 300), 'section link scrolls');
  await pg.goto(FILE + '#carryout'); await pg.waitForTimeout(1500);
  ok(await pg.evaluate(() => { const r = document.getElementById('sec-carryout').getBoundingClientRect(); return r.top < 200 && r.top > -10; }), '#carryout lands on the carry-out block');
  ok(pg.errs.length === 0, 'errors on home and menu: ' + pg.errs.join('; '));
  await pg.context().close();
}
{ const pg = await fresh(null, '2026-11-18T12:00:00-06:00'); await pg.goto(FILE + '#menu'); await pg.waitForTimeout(200); ok((await txt(pg, '#m-title')) === 'Lunch', 'menu opens on lunch at noon on Wednesday'); await pg.context().close(); }
{ const pg = await fresh(null, '2026-11-22T12:00:00-06:00'); await pg.goto(FILE + '#menu'); await pg.waitForTimeout(200); ok((await txt(pg, '#m-title')) === 'Dinner', 'menu opens on dinner on Sunday'); await pg.context().close(); }

/* 4. reserve */
{
  const pg = await fresh(null, '2026-11-17T15:10:00-06:00');
  await pg.locator('.hero [data-action=reserve]').click(); await pg.waitForTimeout(300);
  ok(await pg.locator('#sheet.on').count() === 1, 'reserve opens the panel');
  ok(await pg.inputValue('#rs-date') === '2026-11-17', 'date defaults to today');
  ok(await pg.inputValue('#rs-time') === '1140', 'time defaults to 7:00 pm');
  ok((await pg.locator('#rs-time option').first().innerText()) === '3:30 pm', 'past times are not offered today');
  ok((await pg.getAttribute('#rs-go', 'href')) === 'https://www.opentable.com/r/topo-gigio?p=2&sd=2026-11-17T19:00:00', 'OpenTable link: ' + await pg.getAttribute('#rs-go', 'href'));
  await pg.fill('#rs-date', '2026-11-22'); await pg.dispatchEvent('#rs-date', 'change');
  ok((await pg.locator('#rs-time option').first().innerText()) === '4:00 pm' && (await pg.locator('#rs-time option').last().innerText()) === '8:30 pm', 'Sunday times run 4:00 to 8:30');
  await pg.selectOption('#rs-time', '1050'); await pg.selectOption('#rs-size', '6');
  ok((await pg.getAttribute('#rs-go', 'href')) === 'https://www.opentable.com/r/topo-gigio?p=6&sd=2026-11-22T17:30:00', 'link follows the choices: ' + await pg.getAttribute('#rs-go', 'href'));
  await pg.fill('#rs-date', '2026-11-23'); await pg.dispatchEvent('#rs-date', 'change');
  ok(await pg.locator('#rs-go').isHidden() && (await txt(pg, '#rs-msg')).includes('closed on Mondays'), 'Monday shows closed and hides the OpenTable button');
  await pg.fill('#rs-date', '2026-11-27'); await pg.dispatchEvent('#rs-date', 'change');
  ok((await pg.locator('#rs-time option').last().innerText()) === '10:00 pm', 'Friday last time is 10:00');
  await pg.selectOption('#rs-size', 'big');
  ok(await pg.locator('#rs-go').isHidden() && (await txt(pg, '#rs-msg')).includes('more than 10'), 'more than 10 asks for a call');
  await pg.selectOption('#rs-size', '4');
  await pg.click('#rs-go'); await pg.waitForTimeout(300);
  const ev = await pg.evaluate(() => window.__tg.STATE.events.find(e => !e.sample));
  ok(ev && ev.kind === 'OpenTable' && ev.title === 'Table for 4, Friday, November 27 at 7:00 pm', 'click-through is logged: ' + JSON.stringify(ev && ev.title));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  ok(await pg.locator('#sheet.on').count() === 0, 'escape closes the panel');
  await pg.context().close();
  const late = await fresh(null, '2026-11-17T21:45:00-06:00');
  await late.locator('.hero [data-action=reserve]').click(); await late.waitForTimeout(300);
  ok(await late.inputValue('#rs-date') === '2026-11-18', 'after the last seating the date defaults to tomorrow');
  await late.context().close();
}

/* 5. forms and the staff portal */
{
  const pg = await fresh(null, '2026-11-17T15:10:00-06:00');
  await pg.locator('.roomband [data-action=ask-event]').click(); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => location.hash === '#events' && document.activeElement && document.activeElement.name === 'name'), 'ask about a date goes to the form');
  await pg.click('#ev-form button[type=submit]');
  ok(await pg.locator('#ev-form .field--err').count() === 3, 'empty inquiry marks three fields, got ' + await pg.locator('#ev-form .field--err').count());
  await pg.fill('#ev-form [name=name]', 'Test Person'); await pg.fill('#ev-form [name=email]', 'bad'); await pg.fill('#ev-form [name=guests]', '20');
  await pg.click('#ev-form button[type=submit]');
  ok((await txt(pg, '#ev-form')).includes('40 guests or more') && (await txt(pg, '#ev-form')).includes('doesn’t look right'), 'guest minimum and email are explained');
  await pg.fill('#ev-form [name=email]', 'test@example.com'); await pg.fill('#ev-form [name=guests]', '120'); await pg.click('#ev-form button[type=submit]');
  ok((await txt(pg, '#ev-form')).includes('90 at most'), 'guest maximum is explained');
  await pg.fill('#ev-form [name=guests]', '60'); await pg.fill('#ev-form [name=date]', '2027-06-12'); await pg.selectOption('#ev-form [name=format]', 'Buffet');
  await pg.click('#ev-form button[type=submit]'); await pg.waitForTimeout(200);
  ok((await txt(pg, '#ev-form')).includes('Inquiry sent') && (await txt(pg, '#ev-form')).includes('Wedding, 60 guests'), 'inquiry confirmation');
  await pg.click('#ev-form [data-again]'); ok(await pg.locator('#ev-form [name=name]').count() === 1, 'send another restores the form');

  await pg.locator('.formats [data-format="Buffet"]').click(); await pg.waitForTimeout(300);
  ok(await pg.inputValue('#ev-form [name=format]') === 'Buffet' && await pg.evaluate(() => document.activeElement.name === 'name'), 'a format button fills the style of service');
  await pg.fill('#ev-form [name=name]', 'Test Person'); await pg.fill('#ev-form [name=email]', 'test@example.com'); await pg.fill('#ev-form [name=guests]', '45'); await pg.click('#ev-form button[type=submit]'); await pg.waitForTimeout(200);
  await pg.locator('.formats [data-format="Finger-food cocktail party"]').click(); await pg.waitForTimeout(300);
  ok(await pg.inputValue('#ev-form [name=format]') === 'Finger-food cocktail party', 'a format button reopens the form after an inquiry was sent');
  await pg.goto(FILE + '#catering'); await pg.waitForTimeout(200);
  ok(await pg.locator('#trays details').count() === 5 && await pg.locator('#trays .tray:not(.tray--head)').count() === 38, 'catering menu: 5 sections, 38 dishes, got ' + await pg.locator('#trays .tray:not(.tray--head)').count());
  await pg.fill('#cat-form [name=name]', 'Cat Erer'); await pg.fill('#cat-form [name=email]', 'cat@example.com'); await pg.fill('#cat-form [name=guests]', '25'); await pg.fill('#cat-form [name=order]', 'One full pan of rigatoni');
  await pg.fill('#cat-form [name=date]', '2026-11-18'); await pg.click('#cat-form button[type=submit]');
  ok((await txt(pg, '#cat-form')).includes('at least 48 hours') && (await txt(pg, '#cat-form')).includes('Thursday, November 19'), 'catering explains the 48 hours');
  await pg.fill('#cat-form [name=date]', '2026-11-20'); await pg.click('#cat-form button[type=submit]');
  ok((await txt(pg, '#cat-form')).includes('Tuesday to Thursday and Sunday'), 'catering explains the pick-up days');
  await pg.fill('#cat-form [name=date]', '2026-11-22'); await pg.click('#cat-form button[type=submit]'); await pg.waitForTimeout(200);
  ok((await txt(pg, '#cat-form')).includes('Request sent') && (await txt(pg, '#cat-form')).includes('pick-up Sunday, November 22 at 11:30 am'), 'catering confirmation');

  await pg.goto(FILE + '#gifts'); await pg.waitForTimeout(200);
  await pg.fill('#gift-form [name=name]', 'Cat Erer'); await pg.fill('#gift-form [name=email]', 'cat@example.com'); await pg.fill('#gift-form [name=detail]', '$100');
  await pg.click('#gift-form button[type=submit]'); await pg.waitForTimeout(200);
  ok((await txt(pg, '#gift-form')).includes('Gift card, $100'), 'gift confirmation');

  await pg.goto(FILE + '#visit'); await pg.waitForTimeout(200);
  ok(await pg.locator('#hours tr').count() === 7, 'hours table on visit page');
  await pg.fill('#contact-form [name=name]', 'Phone Only'); await pg.fill('#contact-form [name=contact]', '312-555-0199'); await pg.fill('#contact-form [name=msg]', 'Is the tent open?');
  await pg.click('#contact-form button[type=submit]'); await pg.waitForTimeout(200);
  ok((await txt(pg, '#contact-form')).includes('Message sent'), 'message confirmation');
  await pg.goto(FILE + '#parking'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => { const r = document.getElementById('sec-parking').getBoundingClientRect(); return r.top < 200 && r.top > -10; }), '#parking lands on the parking block');

  // pitch notes inbox
  await pg.goto(FILE + '#home'); await pg.waitForTimeout(200);
  await pg.click('.concept button'); await pg.waitForTimeout(300);
  ok((await txt(pg, '#inbox-cnt')) === '5', 'pitch notes count five submissions, got ' + await txt(pg, '#inbox-cnt'));
  await pg.click('.ptabs [data-ptab=changed]'); await pg.locator('#pitch [data-ptab=changed] a.jumpto[href="#menu"]').click(); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => location.hash === '#menu') && await pg.locator('#pitch.on').count() === 0, 'show me jumps to the page and closes the notes');

  // portal
  await pg.goto(FILE + '#admin'); await pg.waitForTimeout(200);
  await pg.click('[data-do=in]'); await pg.waitForTimeout(200);
  ok(await pg.locator('.prow').count() === 9, 'portal lists 6 samples and 3 new people, got ' + await pg.locator('.prow').count());
  ok((await txt(pg, '.prow')).includes('Phone Only'), 'newest person is first');
  ok((await txt(pg, '.adm__stats')).replace(/\s+/g, ' ').includes('5 banquet inquiries') , 'stats count banquet inquiries: ' + (await txt(pg, '.adm__stats')).replace(/\s+/g, ' '));
  await pg.locator('.prow', { hasText: 'Cat Erer' }).click(); await pg.waitForTimeout(200);
  ok(await pg.locator('#adm-detail .pd__log li').count() === 2, 'one person, two requests in history');
  ok(await pg.evaluate(() => window.__tg.STATE.events.filter(e => !e.sample && e.kind === 'Banquet inquiry').length === 2 && window.__tg.STATE.people.filter(p => p.name === 'Test Person').length === 1), 'two inquiries from one email stay one person');
  ok((await txt(pg, '#adm-detail .pd__next')).includes('Vince'), 'next step names Vince');
  await pg.locator('#adm-detail [data-do=status][data-s=Replied]').click(); await pg.waitForTimeout(200);
  ok((await txt(pg, '#adm-detail .pd__next')).includes('Waiting on them'), 'status change updates the next step');
  await pg.fill('#adm-detail textarea', 'Called back.'); await pg.reload(); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => window.__tg.STATE.people.find(p => p.name === 'Cat Erer').notes === 'Called back.'), 'notes are kept after a reload');
  await pg.fill('#adm-q', 'phone'); ok(await pg.locator('.prow').count() === 1, 'search narrows people');
  await pg.fill('#adm-q', '');
  await pg.click('[data-do=tab][data-v=activity]'); ok(await pg.locator('.alog__row').count() === 13, 'activity lists 13 events, got ' + await pg.locator('.alog__row').count());
  await pg.click('[data-do=clear]'); await pg.waitForTimeout(200);
  ok(await pg.locator('.alog__row').count() === 5, 'removing samples leaves the five real events');
  await pg.click('[data-do=tab][data-v=people]'); await pg.click('[data-do=csv]'); await pg.waitForTimeout(300);
  ok(await pg.locator('.toast.on').count() === 1 || await pg.locator('#sheet.on textarea').count() === 1, 'CSV copies or shows the text');
  ok(pg.errs.length === 0, 'errors in forms and portal: ' + pg.errs.join('; '));
  await pg.context().close();
}

/* 6. phone */
{
  const pg = await fresh({ width: 390, height: 844 }, '2026-11-17T19:00:00-06:00');
  ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'home does not scroll sideways on a phone');
  await pg.click('.menu-btn'); await pg.waitForTimeout(300);
  ok(await pg.locator('#nav-menu.on').count() === 1, 'phone menu opens');
  await pg.locator('#nav-menu a[href="#events"]').click(); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => location.hash === '#events') && await pg.locator('#nav-menu.on').count() === 0, 'phone menu link goes to the page and closes');
  for (const p of ['menu', 'events', 'catering', 'gifts', 'story', 'visit']) { await pg.goto(FILE + '#' + p); await pg.waitForTimeout(200); ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), p + ' does not scroll sideways on a phone'); }
  await pg.locator('.bookbar [data-action=reserve]').click(); await pg.waitForTimeout(300);
  ok(await pg.locator('#sheet.on #rs-go').isVisible(), 'phone bar opens reserve');
  ok(pg.errs.length === 0, 'errors on phone: ' + pg.errs.join('; '));
  await pg.context().close();
}

await b.close();
console.log(`${pass} passed, ${fails.length} failed`); fails.forEach(f => console.log('FAIL', f));
process.exit(fails.length ? 1 : 0);
