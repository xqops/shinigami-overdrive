// Bundles the game into single HTML files:
//   dist/shinigami-overdrive.html  standalone page (share it, opens with a double click)
//   dist/artifact.html             body-only version for hosts that supply their own <head>
// Usage: node tools/build.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const body = html.slice(html.indexOf('<!--BODY-->') + 11, html.indexOf('<!--/BODY-->'));
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const css = read('styles.css');
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap">';
const js = scripts.map((s) => `<script>/* ${s} */\n${read(s).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const standalone = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Shinigami Overdrive</title>
<link rel="icon" href="data:,">
${fonts}
<style>${css}</style>
</head>
<body>
${body}
${js}
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'dist', 'shinigami-overdrive.html'), standalone);

const fragment = `<title>Shinigami Overdrive</title>
${fonts}
<style>${css}</style>
${body}
${js}
`;
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), fragment);
console.log('dist/shinigami-overdrive.html', (standalone.length / 1024).toFixed(0), 'KB');
console.log('dist/artifact.html', (fragment.length / 1024).toFixed(0), 'KB');
