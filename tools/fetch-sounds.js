// Downloads the CC0 sound bank listed in tools/sounds.json and prepares it for the game:
// leading silence trimmed, cut to `max` seconds with a short fade, loudness-normalized, mono MP3.
// Needs ffmpeg on PATH. Kenney packs must be unzipped in the folder given as the first argument.
// Usage: node tools/fetch-sounds.js <kenney-dir> [only-name]
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'sounds.json'), 'utf8')).sounds;
const kenney = process.argv[2];
const only = process.argv[3];
const outDir = path.join(root, 'assets', 'sounds');
const tmp = path.join(require('os').tmpdir(), 'so-sounds');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmp, { recursive: true });

async function fsUrl(id) {
  // the hq preview link is on the sound page (license checked there too)
  const html = await (await fetch('https://freesound.org/s/' + id + '/', { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  if (!/creativecommons\.org\/publicdomain\/zero/.test(html)) throw new Error(id + ' is not CC0');
  const m = html.match(/https:\/\/cdn\.freesound\.org\/previews\/\d+\/\d+_\d+-hq\.mp3/);
  if (!m) throw new Error(id + ': preview not found');
  return m[0];
}

(async () => {
  for (const s of spec) {
    if (only && s.name !== only) continue;
    let src;
    if (s.fs) {
      src = path.join(tmp, s.fs + '.mp3');
      if (!fs.existsSync(src)) {
        const url = await fsUrl(s.fs);
        fs.writeFileSync(src, Buffer.from(await (await fetch(url)).arrayBuffer()));
      }
    } else src = path.join(kenney, s.kenney);
    const out = path.join(outDir, s.name + '.mp3');
    const wav = path.join(tmp, s.name + '.wav');
    // loops (s.loop) only get tiny fades so the seam does not dip in volume
    const fade = s.loop ? 0.04 : Math.min(0.15, s.max * 0.3);
    // pass 1: cut (leading and trailing silence, then max length with a fade) to a temp wav
    const af = [
      s.start ? 'atrim=start=' + s.start : null,
      'silenceremove=start_periods=1:start_threshold=-38dB:start_silence=0.005',
      'atrim=0:' + s.max,
      s.loop ? null : 'areverse', s.loop ? null : 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02', s.loop ? null : 'areverse',
      s.loop ? 'afade=t=in:d=0.04' : null,
      'afade=t=out:st=' + (s.max - fade).toFixed(3) + ':d=' + fade.toFixed(3),
    ].filter(Boolean).join(',');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-af', af, '-ac', '1', '-ar', '32000', wav]);
    // pass 2: peak-normalize to -1 dBFS (loudness normalization would pump up the noise floor)
    const log = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-i', wav, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    const peak = +(log.match(/max_volume: (-?[\d.]+) dB/) || [0, 0])[1];
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'volume=' + (-1 - peak).toFixed(2) + 'dB', '-b:a', '72k', out]);
    console.log(s.name.padEnd(16), (fs.statSync(out).size / 1024).toFixed(1) + ' KB');
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
