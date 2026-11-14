import matter from 'gray-matter';
import { marked } from 'marked';
import sanitize from 'sanitize-html';
import path from 'node:path';

export const categories = {
  works: ['网站与应用', '工具与开源', '设计与实验'],
  articles: ['技术思考', '社会观察', '分享与教程']
};
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const plain = value => sanitize(String(value), {allowedTags: [], allowedAttributes: {}}).replace(/&(amp|lt|gt|quot|#39);/g, (_,entity)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[entity]));
export function safeURL(value) {
  if (!value) return '';
  const url = String(value).trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

export function parseDocument(source, filename, kind, overrides = {}) {
  source = source.replace(/^\uFEFF/, '');
  if (!categories[kind]) throw new Error('内容类型必须是 works 或 articles');
  if (!/\.(md|markdown|html?)$/i.test(filename)) throw new Error('仅支持 Markdown 或 HTML 文件');
  if (Buffer.byteLength(source) > 2 * 1024 * 1024) throw new Error('单个内容文件不能超过 2 MB');
  if (/^---[^\r\n]+/.test(source)) throw new Error('文件头仅支持 YAML，分隔行必须单独写 ---');
  const parsed = matter(source);
  const data = {...parsed.data, ...overrides};
  const raw = parsed.content;
  const isHTML = /\.html?$/i.test(filename);
  const inferredTitle = isHTML ? raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] : raw.match(/^#\s+(.+)$/m)?.[1];
  const title = plain(data.title || inferredTitle || path.basename(filename).replace(/\.(md|markdown|html?)$/i, '')).trim();
  if (!title || title.length > 200) throw new Error('标题不能为空，且不能超过 200 个字符');
  const slug = String(data.slug || path.basename(filename).replace(/\.(md|markdown|html?)$/i, '')).normalize('NFC');
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,99}$/u.test(slug)) throw new Error('文件名 / slug 只能包含文字、数字、短横线或下划线，最多 100 个字符');
  const category = String(data.category || categories[kind][0]);
  if (!categories[kind].includes(category)) throw new Error(`分类必须是：${categories[kind].join('、')}`);
  let date = '';
  if (data.date) {
    date = data.date instanceof Date ? data.date.toISOString().slice(0,10) : String(data.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('日期应为有效的 YYYY-MM-DD');
  }
  const tags = (Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(/[,，]/)).map(t => plain(t).trim()).filter(Boolean).slice(0,8);
  // HTML is normalized into the site's reading layout; executable documents are not published.
  const body = isHTML ? (raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || raw) : marked.parse(raw, {gfm:true});
  let html = sanitize(body, {
    allowedTags: [...sanitize.defaults.allowedTags, 'img', 'details', 'summary', 'del', 'input'],
    allowedAttributes: {a:['href','title'], img:['src','alt','title','width','height'], code:['class'], th:['align'], td:['align'], input:['type','checked','disabled']},
    allowedSchemes: ['http','https','mailto'], allowProtocolRelative:false,
    transformTags: {input: () => ({tagName:'input',attribs:{type:'checkbox',disabled:''}})}
  });
  html = html.replace(/^\s*<h1>([\s\S]*?)<\/h1>\s*/, (heading,text)=>plain(text).trim()===title?'':heading);
  const toc = [];
  html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_,level,text) => {
    const id = `section-${toc.length+1}`;
    toc.push({id, level:Number(level), text:plain(text)});
    const tag = Math.max(2,Number(level));
    return `<h${tag} id="${id}">${text}</h${tag}>`;
  });
  const text = plain(html).replace(/\s+/g,' ').trim();
  const summary = plain(data.summary || text.slice(0,140)).trim().slice(0,300);
  return {kind,slug,title,category,date,tags,summary,html,toc,featured:data.featured === true,draft:data.draft === true,link:safeURL(data.link),source:safeURL(data.source),minutes:Math.max(1,Math.ceil(text.length/450))};
}
