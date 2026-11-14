import http from 'node:http';
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { build, root } from './build.mjs';
import { parseDocument, categories } from './content.mjs';

const port = Number(process.env.PORT || 8000);
const origin = `http://localhost:${port}`;
let mutating=false, timer;
await build();
let queue=Promise.resolve();
function rebuild() { queue=queue.catch(()=>{}).then(build); return queue; }
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function payload(req) {
  if(req.headers.origin!==origin && req.headers.origin!==`http://127.0.0.1:${port}`) throw new Error('仅允许从本地工作台导入内容');
  if(req.headers['content-type']!=='application/json') throw new Error('请求格式应为 JSON');
  let size=0; const chunks=[];
  for await(const chunk of req) {size+=chunk.length;if(size>3*1024*1024) throw new Error('请求文件过大');chunks.push(chunk);}
  const data=JSON.parse(Buffer.concat(chunks).toString());
  if(typeof data.source!=='string' || typeof data.filename!=='string' || !categories[data.kind]) throw new Error('缺少有效的内容文件或类型');
  const allowed=['title','slug','category','date','tags','summary','featured','draft','link','source'];
  data.overrides=Object.fromEntries(Object.entries(data.overrides || {}).filter(([key])=>allowed.includes(key)));
  return data;
}
function prepare(data) {
  const item=parseDocument(data.source,data.filename,data.kind,data.overrides);
  const body=matter(data.source).content;
  const metadata=Object.fromEntries(['title','slug','category','date','tags','summary','featured','draft','link','source'].map(key=>[key,item[key]]));
  const document=matter.stringify(body,metadata);
  return {item,document};
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif'};
const server=http.createServer(async(req,res)=>{
  const host=req.headers.host;
  if(host!==`localhost:${port}` && host!==`127.0.0.1:${port}`) return json(res,403,{error:'Host 不受信任'});
  try {
    const url=new URL(req.url,origin);
    if(url.pathname==='/api/status' && req.method==='GET') return json(res,200,{local:true});
    if(['/api/preview','/api/import'].includes(url.pathname) && req.method==='POST') {
      const data=await payload(req);
      const result=prepare(data);
      if(url.pathname==='/api/preview') return json(res,200,result);
      if(mutating) return json(res,409,{error:'正在导入另一份内容，请稍后重试'});
      mutating=true;
      let target,previous=null,written=false;
      try {
        const dir=path.join(root,'content',data.kind);
        const existing=[];
        for(const name of await fs.readdir(dir)) {
          if(!/\.(md|markdown|html?)$/i.test(name)) continue;
          const item=parseDocument(await fs.readFile(path.join(dir,name),'utf8'),name,data.kind);
          if(item.slug===result.item.slug) existing.push(name);
        }
        if(existing.length && data.overwrite!==true) return json(res,409,{error:'这个页面名称已存在。需要替换时，请勾选「更新已有的同名内容」。'});
        if(existing.length>1) throw new Error('已有文件的页面名称重复，请先修复后再导入');
        const ext=/\.html?$/i.test(data.filename)?'.html':'.md';
        if(existing.length && (/\.html?$/i.test(existing[0])!==/\.html?$/i.test(data.filename))) throw new Error('更新时请保持原来的 Markdown / HTML 文件格式，或使用新的页面名称');
        target=path.join(dir,existing[0] || result.item.slug+ext);
        try {previous=await fs.readFile(target,'utf8');} catch(error) {if(error.code!=='ENOENT') throw error;}
        // A different slug must never overwrite a colliding filename.
        if(previous!==null && !existing.length) throw new Error('文件名已被其他内容占用，请换一个页面名称');
        await fs.writeFile(target,result.document);written=true;
        await rebuild();
        return json(res,201,{message:result.item.draft?'草稿已保存，不会出现在公开页面。':'已导入，本地网站已更新。提交 content/ 文件并推送到 GitHub 后，即可发布线上版本。',url:result.item.draft?'':`${data.kind}/${encodeURIComponent(result.item.slug)}/`});
      } catch(error) {
        if(written) {if(previous===null) await fs.unlink(target);else await fs.writeFile(target,previous);await rebuild().catch(()=>{});}
        throw error;
      } finally {mutating=false;}
    }
    if(url.pathname.startsWith('/api/')) return json(res,404,{error:'接口不存在'});
    if(!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'不支持此请求方法'});
    const base=path.join(root,'dist');
    let filename=path.resolve(base,'.'+decodeURIComponent(url.pathname));
    if(!filename.startsWith(base+path.sep) && filename!==base) return json(res,403,{error:'路径不受信任'});
    const stat=await fs.stat(filename);
    if(stat.isDirectory()) {
      if(!url.pathname.endsWith('/')) {res.writeHead(302,{Location:url.pathname+'/'+url.search});return res.end();}
      filename=path.join(filename,'index.html');
    }
    const buffer=await fs.readFile(filename);
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:buffer);
  } catch(error) {json(res,error.code==='ENOENT'?404:400,{error:error.code==='ENOENT'?'页面不存在':error.message});}
});
server.listen(port,'127.0.0.1',()=>console.log(`Website: ${origin}\nContent studio: ${origin}/studio.html`));
function schedule() {if(mutating)return;clearTimeout(timer);timer=setTimeout(()=>rebuild().catch(error=>console.error(error.message)),180);}
for(const folder of ['content','assets']) watch(path.join(root,folder),{recursive:true},schedule);
watch(root,(_,filename)=>{if(['index.html','studio.html'].includes(String(filename))) schedule();});
