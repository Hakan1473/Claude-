const { chromium } = require('/opt/node-tools/node_modules/playwright');
const [w, n] = process.argv.slice(2).map(Number); const N = 7325;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + __dirname + '/built.html'); await p.waitForTimeout(600);
  for (let i = w; i < N; i += n) {
    await p.evaluate(t => render(t), i / 30);
    await p.screenshot({ path: `${__dirname}/frames/${String(i).padStart(5,'0')}.jpg`, type: 'jpeg', quality: 93 });
  }
  await b.close();
})();
