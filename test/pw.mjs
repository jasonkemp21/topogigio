// Finds Playwright: the project's own install first, then a shared one.
import { createRequire } from 'module';
let pw;
try { pw = createRequire(import.meta.url)('playwright'); } catch (e) { pw = createRequire('/opt/npm-tools/node_modules/')('playwright'); }
export const chromium = pw.chromium;
