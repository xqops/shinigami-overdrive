// Writes assets/sounds/CREDITS.md from tools/sounds.json (who made each recorded sound).
// Usage: node tools/sound-credits.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const list = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'sounds.json'), 'utf8')).sounds;
const esc = (s) => String(s).replace(/\|/g, '\|');
const rows = list.map((x) => x.fs
  ? `| ${x.name} | [freesound ${x.fs}](https://freesound.org/s/${x.fs}/) | ${esc(x.user)} | ${esc(x.title)} |`
  : `| ${x.name} | [Kenney.nl](https://kenney.nl) | Kenney | ${path.basename(x.kenney)} |`);
const md = `# Créditos dos sons

Todos os ${list.length} sons são **CC0 (domínio público)**. Crédito não é obrigatório, mas fica aqui por gentileza.

| Arquivo | Origem | Autor | Título |
|---|---|---|---|
${rows.join('\n')}

Cortados, normalizados e convertidos por \`tools/fetch-sounds.js\` (lista em \`tools/sounds.json\`).
`;
fs.writeFileSync(path.join(root, 'assets', 'sounds', 'CREDITS.md'), md);
console.log(list.length + ' sounds credited');
