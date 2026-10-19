const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/built.html'); await p.waitForTimeout(500);
  const d = await p.evaluate(() => ({ cues: window.CUES, voices: window.VOICES, total: window.TOTAL }));
  require('fs').writeFileSync(__dirname + '/timing.json', JSON.stringify(d));
  console.log(d.total, d.voices.length, d.cues.length, JSON.stringify(errs)); await b.close();
})();
