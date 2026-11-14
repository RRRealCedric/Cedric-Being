// Run against the local preview with: node tests/smoke.cjs (requires Playwright).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({headless: true, channel: 'chrome'});
  try {
    const page = await browser.newPage({viewport: {width:1440,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8000', {waitUntil:'networkidle'});
    await page.waitForFunction(() => {
      const c = document.getElementById('dots');
      return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i) => i%4===3 && v>0) || !document.getElementById('canvas-status').hidden;
    }, {timeout:30000});
    assert.equal(await page.locator('#canvas-status').isHidden(), true, 'Hand source must load with CORS');
    await page.locator('#motion').click();
    assert.equal(await page.locator('#motion').getAttribute('aria-pressed'), 'true');
    const frames = [];
    for (const t of [0,3.2,7,11.2,15.4,20]) {
      frames.push(await page.evaluate(t => { window.__render(t); return document.getElementById('dots').toDataURL(); },t));
    }
    assert.equal(frames[0],frames[5],'Loop must wrap exactly');
    assert.notEqual(frames[0],frames[2],'Animation must change');
    await page.evaluate(() => window.__render(0));
    await page.screenshot({path:'/tmp/cedric-desktop.png'});
    await page.locator('[data-category="技术思考"]').click();
    assert.match(await page.locator('#writing-heading').textContent(),/实践/);
    for (const size of [{width:375,height:812},{width:760,height:900},{width:1024,height:768}]) {
      await page.setViewportSize(size);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'No horizontal overflow');
      assert(await page.locator('.nav-links').isVisible(),'Navigation remains accessible');
    }
    await page.setViewportSize({width:375,height:812});
    await page.locator('.brand').click();
    await page.evaluate(() => { window.scrollTo({top:0,behavior:'instant'}); window.__render(7); });
    await page.screenshot({path:'/tmp/cedric-mobile.png'});
    const reduced = await browser.newPage({reducedMotion:'reduce'});
    await reduced.goto('http://127.0.0.1:8000');
    assert.equal(await reduced.locator('#motion').getAttribute('aria-pressed'),'true');
    const failure = await browser.newPage();
    await failure.route('https://images.higgs.ai/**',route => route.abort());
    await failure.goto('http://127.0.0.1:8000');
    await failure.locator('#canvas-status').waitFor({state:'visible'});
    assert(await failure.locator('#works').isVisible(),'Image failure preserves content');
    assert.deepEqual(errors,[],'No browser runtime errors');
    console.log('PASS: image/CORS, loop, pose changes, pause, filters, responsive layout, reduced motion, image failure, runtime errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
