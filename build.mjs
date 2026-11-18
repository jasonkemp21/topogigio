// Assemble src/ into one page. Images sit alongside in img/.
// In the repo the page is written to ./index.html, which is what GitHub Pages serves.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const R = path.dirname(fileURLToPath(import.meta.url));
const OUT = fs.existsSync(path.join(R, 'site')) ? path.join(R, 'site', 'index.html') : path.join(R, 'index.html');
const read = d => fs.readdirSync(path.join(R, d)).filter(f => !f.startsWith('.')).sort().map(f => fs.readFileSync(path.join(R, d, f), 'utf8')).join('\n');
const css = read('src/css');
const html = read('src/html');
const js = read('src/js');

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Topo Gigio website concept</title>
<meta name="description" content="A redesign concept for Topo Gigio Ristorante, 1516 N Wells St, Chicago. Not the restaurant's live site.">
<meta name="theme-color" content="#7b1728">
<meta name="robots" content="noindex, nofollow">
<meta property="og:title" content="Topo Gigio website concept">
<meta property="og:description" content="A redesign concept for Topo Gigio Ristorante by Jason Kemp. Not the restaurant's live site. Nothing here books or charges.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Besley:ital,wght@0,400..900;1,400..900&family=Libre+Franklin:wght@400..700&display=swap">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%237b1728'/%3E%3Ctext x='16' y='23' text-anchor='middle' font-family='Georgia,serif' font-style='italic' font-weight='700' font-size='19' fill='%23fff'%3ETG%3C/text%3E%3C/svg%3E">
<style>
${css}
</style>
</head>
<body>
${html}
<script>
(function(){
${js}
})();
</script>
</body>
</html>
`;
fs.writeFileSync(OUT, page);
console.log(path.relative(R, OUT), (page.length / 1024).toFixed(0) + 'KB');
