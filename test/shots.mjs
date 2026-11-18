// Screenshots of every page at laptop and phone width. Usage: node test/shots.mjs [outdir] [page,page]
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
import { chromium } from './pw.mjs';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = 'file://' + (fs.existsSync(path.join(R, 'site/index.html')) ? path.join(R, 'site/index.html') : path.join(R, 'index.html'));
const out = path.resolve(process.argv[2] || path.join(R, 'shots')); fs.mkdirSync(out, { recursive: true });
const only = process.argv[3] ? process.argv[3].split(',') : null;
const pages = ['home', 'menu', 'events', 'catering', 'gifts', 'story', 'visit', 'admin'].filter(p => !only || only.includes(p));
const b = await chromium.launch();
const errs = [];
for (const [tag, vp] of [['d', { width: 1366, height: 850 }], ['m', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: tag === 'm' ? 2 : 1, isMobile: tag === 'm', hasTouch: tag === 'm' });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(tag + ' ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(tag + ' console: ' + m.text()); });
  for (const p of pages) {
    await pg.goto(FILE + '#' + p); await pg.waitForTimeout(500);
    if (p === 'admin') { const g = pg.locator('[data-do="in"]'); if (await g.count()) await g.click(); await pg.waitForTimeout(200); }
    await pg.evaluate(async () => { for (const i of document.querySelectorAll('img[loading="lazy"]')) i.loading = 'eager'; await document.fonts.ready; });
    await pg.waitForTimeout(500);
    await pg.screenshot({ path: path.join(out, `${tag}-${p}.png`), fullPage: true });
    if (p === 'home') await pg.screenshot({ path: path.join(out, `${tag}-home-fold.png`) });
  }
  await pg.goto(FILE + '#home'); await pg.waitForTimeout(300);
  await pg.locator('.hero [data-action="reserve"]').click(); await pg.waitForTimeout(500);
  await pg.screenshot({ path: path.join(out, `${tag}-reserve.png`) });
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  await pg.locator('[data-action="pitch-open"]').first().click(); await pg.waitForTimeout(500);
  await pg.screenshot({ path: path.join(out, `${tag}-pitch.png`) });
  await ctx.close();
}
await b.close();
console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors'); console.log('saved to', out);
