const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/built.html'); await p.waitForTimeout(800);
  for (const t of process.argv.slice(2)) { await p.evaluate(async t => render(o2r(t)), Number(t)); await p.screenshot({ path: `${__dirname}/keys/k-${t}.jpg`, type: 'jpeg', quality: 80 }); }
  console.log(JSON.stringify(errs)); await b.close();
})();
