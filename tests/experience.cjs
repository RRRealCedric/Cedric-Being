// Run with the dev server, Playwright and Chrome available.
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async()=>{
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8000/');
    await page.waitForFunction(()=>document.querySelector('.chapter-nav').dataset.active==='home');
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.getByText('从这里开始',{exact:true}).count(),0);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollSnapType),'y mandatory');
    assert.match(await page.locator('h1').evaluate(el=>getComputedStyle(el).fontFamily),/Lora/);
    await page.screenshot({path:'/tmp/cedric-new-hero.png'});
    await page.mouse.wheel(0,760);
    await page.waitForFunction(()=>Math.abs(document.getElementById('works').getBoundingClientRect().top)<2);
    assert.equal(await page.locator('.chapter-nav').getAttribute('data-active'),'works');
    assert.match(await page.locator('#works .chapter-panel').evaluate(el=>getComputedStyle(el).backdropFilter),/blur/);
    for(const id of ['works','writing','about']) {
      await page.locator(`.chapter-nav a[href="#${id}"]`).click();
      await page.waitForFunction(id=>Math.abs(document.getElementById(id).getBoundingClientRect().top)<2,id);
      const bounds=await page.locator('#'+id+' .chapter-panel').boundingBox();
      assert(bounds.y>=0 && bounds.y+bounds.height<=1000, id+' panel fits its screen');
      await page.screenshot({path:'/tmp/cedric-glass-'+id+'.png'});
    }
    await page.setViewportSize({width:375,height:812});
    for(const id of ['works','writing','about']) {
      await page.locator(`.chapter-nav a[href="#${id}"]`).click();
      await page.waitForFunction(id=>Math.abs(document.getElementById(id).getBoundingClientRect().top)<2,id);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');
      const bounds=await page.locator('#'+id+' .chapter-panel').boundingBox();
      assert(bounds.y>=0 && bounds.y+bounds.height<=812,id+' mobile panel fits its screen');
    }
    await page.screenshot({path:'/tmp/cedric-glass-mobile.png'});
    await page.goto('http://127.0.0.1:8000/works/cedric-being/');
    assert.match(await page.locator('.prose').evaluate(el=>getComputedStyle(el).fontFamily),/Lora/);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollSnapType),'none','Detail reading remains normal scrolling');
    const reduced=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await reduced.goto('http://127.0.0.1:8000/#works');
    await reduced.waitForFunction(()=>document.querySelector('.chapter-nav').dataset.active==='works');
    assert.equal(await reduced.locator('.chapter-panel').first().evaluate(el=>getComputedStyle(el).filter),'none');
    assert.equal(await reduced.locator('.chapter-panel').first().evaluate(el=>getComputedStyle(el).transform),'none');
    assert.deepEqual(errors,[]);
    console.log('PASS: CTA removal, wheel snap, chapter anchors, glass rendering, desktop/mobile full panels, serif typography, reduced motion, normal detail scrolling');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
