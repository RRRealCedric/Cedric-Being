import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, escape as e, parseDocument } from './content.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root,'dist');
const route = item => `${item.kind}/${encodeURIComponent(item.slug)}/`;
const meta = item => `${e(item.category)} · ${item.date || '未标注日期'}${item.kind === 'articles' ? ` · ${item.minutes} 分钟阅读` : ''}`;
const tagHTML = item => item.tags.map(tag => `<span class="tag">${e(tag)}</span>`).join('');
export function header(prefix, active) {
  return `<header class="site-header"><a class="site-brand" href="${prefix}index.html">Cedric Being<span class="brand-dot">.</span></a><nav class="site-nav" aria-label="主导航">${[['index.html','首页','home'],['works.html','作品','works'],['articles.html','文章','articles'],['about.html','关于','about']].map(([href,label,id]) => `<a href="${prefix}${href}"${id===active?' aria-current="page"':''}>${label}</a>`).join('')}</nav><a class="header-github" href="https://github.com/RRRealCedric" target="_blank" rel="noopener noreferrer">GitHub ↗</a></header>`;
}
function footer(prefix) { return `<footer class="site-footer"><span>© ${new Date().getFullYear()} Cedric Being</span><span>念念不忘，必有回响。</span><a href="${prefix}about.html">关于这个空间 ↗</a></footer>`; }
function shell(title,body,{prefix='',active='',description='Cedric 的作品与思考。念念不忘，必有回响。'}={}) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${e(description)}"><title>${e(title)} — Cedric Being</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${prefix}assets/site.css"><script src="${prefix}assets/site.js" defer></script></head><body><a class="skip" href="#main">跳转到主要内容</a>${header(prefix,active)}<main id="main">${body}</main>${footer(prefix)}</body></html>`;
}
export function card(item,prefix='',featured=false) {
  return `<article class="entry ${item.kind==='works'?'work-card':'article-card'}" data-category="${e(item.category)}" data-tags="${e(item.tags.join(','))}" data-search="${e([item.title,item.summary,...item.tags].join(' ').toLowerCase())}" data-date="${item.date}"${featured?' data-featured="true"':''}>${item.kind==='works'?`<a class="work-art" href="${prefix}${route(item)}" aria-label="查看作品：${e(item.title)}"><span>${e(item.title)}</span><small>${e(item.category)} / CEDRIC BEING</small><span class="art-arrow" aria-hidden="true">↗</span></a>`:''}<div class="entry-body"><p class="entry-meta">${meta(item)}</p><h2><a href="${prefix}${route(item)}">${e(item.title)} <span aria-hidden="true">↗</span></a></h2><p class="entry-summary">${e(item.summary)}</p><div class="tags">${tagHTML(item)}</div></div></article>`;
}
function collection(kind,items) {
  const work = kind==='works';
  const tagSet = [...new Set(items.flatMap(i=>i.tags))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
  return shell(work?'作品':'文章', `<section class="page-intro"><p class="eyebrow">${work?'SELECTED WORK & EXPERIMENTS':'NOTES, ESSAYS & GUIDES'}</p><h1>${work?'把想法，做出来。':'让思考，留下痕迹。'}</h1><p>${work?'网站、工具与尚在生长的实验。看成果，也看每个选择背后的思考。':'关于技术的实践、社会的观察，以及可以交给下一个人的经验。'}</p></section><section class="collection" data-collection data-page-size="${work?6:8}"><div class="collection-toolbar"><div class="category-tabs" role="group" aria-label="${work?'作品':'文章'}分类">${['全部',...categories[kind]].map(cat=>`<button type="button" data-filter="${cat}" aria-pressed="${cat==='全部'}">${cat}<span>${cat==='全部'?items.length:items.filter(i=>i.category===cat).length}</span></button>`).join('')}</div><div class="search-row"><label class="search-label"><span>搜索${work?'作品':'文章'}</span><input id="search" type="search" placeholder="标题、关键词或标签" autocomplete="off"></label><label class="sort-label">排序<select id="sort"><option value="newest">最新优先</option><option value="oldest">最早优先</option><option value="title">标题顺序</option></select></label>${tagSet.length?`<label class="sort-label">标签<select id="tag"><option value="">全部标签</option>${tagSet.map(t=>`<option value="${e(t)}">${e(t)}</option>`).join('')}</select></label>`:''}</div></div><div class="collection-status"><p id="result-count" role="status">共 ${items.length} ${work?'件作品':'篇文章'}</p><button type="button" id="reset-filters" class="plain-button">重置筛选 ↺</button></div><div id="entries" class="${work?'work-grid':'article-list'}">${items.map(item=>card(item)).join('')}</div><div id="empty-results" class="empty-state"${items.length?' hidden':''}><p class="eyebrow">A LITTLE SPACE TO GROW</p><h2>${items.length?'没有找到匹配的内容。':'文字正在路上。'}</h2><p>${items.length?'试试其他关键词，或重置筛选。':'文章发布后，会按分类和日期收录在这里。'}</p></div><nav id="pagination" class="pagination" aria-label="列表分页" hidden></nav></section>`,{active:kind});
}
function detail(item,items) {
  const prefix = '../../';
  const related = items.filter(i=>i!==item && i.kind===item.kind && i.category===item.category).slice(0,3);
  return shell(item.title,`<div class="detail-wrap"><a class="back-link" href="${prefix}${item.kind}.html?category=${encodeURIComponent(item.category)}">← 返回${e(item.category)}</a><header class="detail-header"><p class="eyebrow">${meta(item)}</p><h1>${e(item.title)}</h1><p class="detail-summary">${e(item.summary)}</p><div class="tags">${tagHTML(item)}</div>${item.link||item.source?`<div class="project-links">${item.link?`<a class="pill" href="${e(item.link)}" target="_blank" rel="noopener noreferrer">访问作品 ↗</a>`:''}${item.source?`<a class="text-link" href="${e(item.source)}" target="_blank" rel="noopener noreferrer">项目源码 ↗</a>`:''}</div>`:''}</header><div class="reading-layout"><article class="prose">${item.html}</article>${item.toc.length?`<aside class="toc"><details open><summary>本文目录</summary><nav aria-label="本文目录">${item.toc.map(h=>`<a href="#${h.id}" class="toc-level-${h.level}">${e(h.text)}</a>`).join('')}</nav></details></aside>`:''}</div>${related.length?`<section class="related"><h2>继续读下去</h2>${related.map(i=>`<a href="${prefix}${route(i)}">${e(i.title)} <span>↗</span></a>`).join('')}</section>`:''}</div>`,{prefix,active:item.kind,description:item.summary});
}
export async function build() {
  const all = [], errors = [], seen = new Set();
  for (const kind of Object.keys(categories)) {
    const dir = path.join(root,'content',kind);
    await fs.mkdir(dir,{recursive:true});
    for (const filename of (await fs.readdir(dir)).sort()) {
      if (!/\.(md|markdown|html?)$/i.test(filename)) continue;
      try {
        const item = parseDocument(await fs.readFile(path.join(dir,filename),'utf8'),filename,kind);
        const key = kind+'/'+item.slug;
        if (seen.has(key)) throw new Error(`重复的 slug：${item.slug}`);
        seen.add(key);
        if (!item.draft) all.push(item);
      } catch(error) { errors.push(`${kind}/${filename}: ${error.message}`); }
    }
  }
  if(errors.length) throw new Error(errors.join('\n'));
  all.sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));
  // Validate the full collection before replacing generated output.
  await fs.mkdir(out,{recursive:true});
  for(const name of ['works','articles','assets','content']) await fs.rm(path.join(out,name),{recursive:true,force:true});
  await fs.cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
  await fs.cp(path.join(root,'content','assets'),path.join(out,'content','assets'),{recursive:true});
  const works = all.filter(i=>i.kind==='works'), articles = all.filter(i=>i.kind==='articles');
  let home = await fs.readFile(path.join(root,'index.html'),'utf8');
  const selectedWorks = works.filter(i=>i.featured).slice(0,2);
  if(!selectedWorks.length && works.length) selectedWorks.push(works[0]);
  const selectedArticles = articles.filter(i=>i.featured).slice(0,3);
  if(!selectedArticles.length) selectedArticles.push(...articles.slice(0,3));
  home = home.replace('<!-- SELECTED_WORK -->',selectedWorks.map(i=>card(i)).join(''));
  home = home.replace('<!-- SELECTED_ARTICLES -->',selectedArticles.length?selectedArticles.map(i=>card(i)).join(''):'<div class="empty-state"><h3>文字正在路上。</h3><p>技术实践、社会观察与经验分享，正在慢慢积累。</p></div>');
  await fs.writeFile(path.join(out,'index.html'),home);
  for(const kind of Object.keys(categories)) await fs.writeFile(path.join(out,`${kind}.html`),collection(kind,all.filter(i=>i.kind===kind)));
  for(const item of all) {
    const folder = path.join(out,item.kind,item.slug); await fs.mkdir(folder,{recursive:true});
    // Relative content assets resolve consistently from every generated detail page.
    item.html = item.html.replace(/(src|href)="(?:\.\.\/)?assets\//g,'$1="../../content/assets/');
    await fs.writeFile(path.join(folder,'index.html'),detail(item,all));
  }
  const about = `<section class="page-intro"><p class="eyebrow">THE PERSON BEHIND</p><h1>你好，我是 Cedric。</h1><p>欢迎来到我的互联网自留地。</p></section><section class="about-content"><h2>在创造中探索，<br>在思考中靠近。</h2><div class="prose"><p>我想在这里展示自己的作品，也留下一些关于技术、社会与生活的思考。把实践里摸索出的经验整理成分享与教程，让探索有迹可循。</p><p>这个空间会随着我一起生长。如果某个作品、某段文字让你产生共鸣，那就是一次回响。</p><h3>这里有什么</h3><p><a href="works.html">作品</a>记录成果和取舍；<a href="articles.html?category=${encodeURIComponent('技术思考')}">技术思考</a>记录实践中的判断；<a href="articles.html?category=${encodeURIComponent('社会观察')}">社会观察</a>从具体生活出发；<a href="articles.html?category=${encodeURIComponent('分享与教程')}">分享与教程</a>让经验可以被复用。</p><a class="text-link" href="https://github.com/RRRealCedric" target="_blank" rel="noopener noreferrer">在 GitHub 找到我 ↗</a></div></section>`;
  await fs.writeFile(path.join(out,'about.html'),shell('关于',about,{active:'about'}));
  await fs.copyFile(path.join(root,'studio.html'),path.join(out,'studio.html'));
  console.log(`Built ${works.length} works, ${articles.length} articles → dist/`);
  return all;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await build();
