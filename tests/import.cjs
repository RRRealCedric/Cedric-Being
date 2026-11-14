// Run with the local dev server and Playwright available: node tests/import.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const prefix='smoke-'+randomUUID();
const created=[];
const base='http://127.0.0.1:8000';
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const post=(action,data)=>page.request.post(base+'/api/'+action,{data,headers:{Origin:base}});
  try {
    await page.goto(base+'/studio.html');
    await page.waitForFunction(()=>document.getElementById('connection').textContent.includes('已连接'));
    const name=prefix+'-upload';
    await page.locator('#file').setInputFiles({name:name+'.md',mimeType:'text/markdown',buffer:Buffer.from('---\ntitle: 导入测试文章\ncategory: 社会观察\ntags: [观察]\n---\n## 一个起点\n\n正文内容。\n\n## 下一步\n\n新的思考。')});
    await page.waitForFunction(()=>!document.getElementById('import').disabled);
    assert.equal(await page.locator('#title').inputValue(),'导入测试文章');
    assert.equal(await page.locator('#category').inputValue(),'社会观察');
    created.push('articles/'+name+'.md');
    await page.locator('#import').click();
    await page.locator('#result-link').waitFor({state:'visible'});
    await page.locator('#result-link').click();
    await page.waitForURL('**/'+name+'/');
    assert.equal(await page.locator('.detail-header h1').textContent(),'导入测试文章');
    assert.equal(await page.locator('.toc a').count(),2);
    const conflict=await post('import',{filename:name+'.md',source:'# 冲突',kind:'articles'});
    assert.equal(conflict.status(),409,'Duplicate import never silently overwrites');
    const overwrite=await post('import',{filename:name+'.md',source:'# 更新后的文章\n\n内容',kind:'articles',overwrite:true,overrides:{category:'社会观察'}});
    assert.equal(overwrite.status(),201,'Explicit overwrite works');
    for(let i=0;i<10;i++) {
      const slug=prefix+'-'+i;created.push('articles/'+slug+'.md');
      const res=await post('import',{filename:slug+'.md',source:`---\ntitle: 测试文章 ${i}\ncategory: 技术思考\ndate: '2026-11-${String(i+1).padStart(2,'0')}'\ntags: [测试标签]\n---\n## 内容\n\n自动化验收的临时内容。`,kind:'articles'});
      assert.equal(res.status(),201,await res.text());
    }
    const htmlName=prefix+'-html';created.push('works/'+htmlName+'.html');
    const html=await post('import',{filename:htmlName+'.html',source:'<html><head><title>HTML 测试作品</title></head><body><h2>介绍</h2><p>HTML 正文</p><script>window.BAD=true</script><img src="x" onerror="alert(1)"></body></html>',kind:'works',overrides:{category:'设计与实验'}});
    assert.equal(html.status(),201);
    await page.goto(base+'/works/'+htmlName+'/');
    assert.match(await page.locator('.prose').textContent(),/HTML 正文/);
    assert.equal(await page.evaluate(()=>window.BAD),undefined);
    await page.goto(base+'/articles.html?category='+encodeURIComponent('技术思考'));
    assert.equal(await page.locator('.entry:visible').count(),8,'First page is bounded');
    await page.getByRole('button',{name:'下一页',exact:true}).click();
    assert.equal(await page.locator('.entry:visible').count(),2);
    assert.match(page.url(),/page=2/);
    await page.goBack();
    assert.equal(await page.locator('.entry:visible').count(),8,'Back restores list state');
    await page.locator('#search').fill('测试文章 7');
    await page.waitForFunction(()=>document.querySelectorAll('.entry:not([hidden])').length===1);
    assert.match(await page.locator('.entry:visible h2').textContent(),/测试文章 7/);
    await page.locator('#search').fill('没有这个词');
    await page.locator('#empty-results').waitFor({state:'visible'});
    await page.locator('#reset-filters').click();
    await page.screenshot({path:'/tmp/cedric-articles-populated.png',fullPage:true});
    await page.setViewportSize({width:375,height:812});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.goto(base+'/articles/'+prefix+'-7/');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'/tmp/cedric-detail-mobile.png',fullPage:true});
    const forbidden=await page.request.post(base+'/api/import',{data:{filename:'x.md',source:'# X',kind:'articles'},headers:{Origin:'https://evil.example'}});
    assert.equal(forbidden.status(),400,'Cross-origin upload is rejected');
    const draftName=prefix+'-draft';created.push('articles/'+draftName+'.md');
    await post('import',{filename:draftName+'.md',source:'---\ndraft: true\n---\n# 草稿',kind:'articles'});
    assert.equal((await page.request.get(base+'/articles/'+draftName+'/')).status(),404,'Draft is not published');
    assert.deepEqual(errors,[]);
    console.log('PASS: browser Markdown upload, HTML upload/sanitization, duplicate protection, explicit updates, category/search/pagination/history, mobile reading, origin validation, drafts');
  } finally {
    await browser.close();
    for(const filename of created) await fs.unlink(path.join(__dirname,'../content',filename)).catch(error=>{if(error.code!=='ENOENT')throw error;});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
