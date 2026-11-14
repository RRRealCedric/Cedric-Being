import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, safeURL } from '../scripts/content.mjs';

test('Markdown metadata, GFM, stable directory and reading time',()=>{
  const item=parseDocument(`---\ntitle: 测试文章\ncategory: 技术思考\ndate: '2026-11-15'\ntags: [前端, 实践]\nfeatured: true\n---\n## 一个问题\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n\`\`\`js\nconst a = 1;\n\`\`\`\n`, 'test.md','articles');
  assert.equal(item.title,'测试文章'); assert.equal(item.slug,'test'); assert.equal(item.featured,true);
  assert.deepEqual(item.tags,['前端','实践']);assert.equal(item.date,'2026-11-15');
  assert.match(item.html,/<table>/);assert.match(item.html,/language-js/);assert.equal(item.toc[0].id,'section-1');assert.equal(item.minutes,1);
});
test('bare Markdown / full HTML infer titles and normalize HTML',()=>{
  assert.equal(parseDocument('# 无需文件头\n\n正文','文章.md','articles').title,'无需文件头');
  const item=parseDocument('<html><head><title>HTML 作品</title><style>body{display:none}</style></head><body><h2>介绍</h2><p>内容</p><script>alert(1)</script></body></html>','work.html','works');
  assert.equal(item.title,'HTML 作品');assert.match(item.html,/id="section-1"/);assert.doesNotMatch(item.html,/script|style|display:none|alert/);
  assert.equal(parseDocument('# HTML & CSS','amp.md','articles').title,'HTML & CSS');
  assert.doesNotMatch(parseDocument('# 标题\n\n正文','title.md','articles').html,/<h[12]/,'Title is not repeated in the body');
});
test('untrusted HTML and URLs cannot execute script',()=>{
  const item=parseDocument('<p onclick="alert(1)">Hi</p><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">link</a><iframe src="https://example.com"></iframe><svg onload="alert(1)"></svg>','unsafe.html','articles');
  assert.doesNotMatch(item.html,/onclick|onerror|javascript:|iframe|svg|onload/);
  assert.equal(safeURL('javascript:alert(1)'), ''); assert.equal(safeURL('//evil.com'), '');assert.equal(safeURL('https://example.com'),'https://example.com');
});
test('file boundaries, dates and categories validate before writing',()=>{
  for(const slug of ['../x','a/b','a\\b','..','.x','x?z']) assert.throws(()=>parseDocument('body','test.md','articles',{slug}));
  assert.throws(()=>parseDocument('body','test.js','articles'));
  assert.throws(()=>parseDocument('body','test.md','other'));
  assert.throws(()=>parseDocument('body','test.md','articles',{category:'未知分类'}));
  assert.throws(()=>parseDocument('body','test.md','articles',{date:'2026-02-30'}));
  assert.throws(()=>parseDocument('x'.repeat(2*1024*1024+1),'test.md','articles'));
  assert.equal(parseDocument('body','中文名称.md','works').slug,'中文名称');
});
test('front matter cannot switch to executable JavaScript, including BOM',()=>{
  for(const prefix of ['', '\uFEFF']) assert.throws(()=>parseDocument(prefix+'---javascript\n({title: process.exit(1)})\n---\nbody','bad.md','articles'), /YAML/);
});
test('explicit false overrides draft and metadata and ignores unsafe source links',()=>{
  const item=parseDocument('---\ndraft: true\nfeatured: true\n---\n# 原标题','test.md','articles',{draft:false,featured:false,title:'新标题',source:'javascript:alert(1)'});
  assert.equal(item.draft,false);assert.equal(item.featured,false);assert.equal(item.title,'新标题');assert.equal(item.source,'');
});
