(() => {
  const $ = id=>document.getElementById(id);
  const categories = {works:['网站与应用','工具与开源','设计与实验'],articles:['技术思考','社会观察','分享与教程']};
  let local=false, file=null, source='', prepared='', pending=0;
  const setStatus = message => { $('status').textContent=message; $('result-link').hidden=true; };
  function setCategories(selected) {
    $('category').replaceChildren(...categories[$('kind').value].map(name=>new Option(name,name,false,name===selected)));
  }
  const metadata = () => ({title:$('title').value,slug:$('slug').value,category:$('category').value,date:$('date').value,tags:$('tags').value.split(/[,，]/).map(s=>s.trim()).filter(Boolean),summary:$('summary').value,featured:$('featured').checked,draft:$('draft').checked,link:$('link').value,source:$('source').value});
  async function request(action,data) {
    const response = await fetch('api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result = await response.json();
    if(!response.ok) throw new Error(result.error || '操作未完成，请重试');
    return result;
  }
  function preview(html) {
    const policy = "default-src 'none'; img-src https: http:; style-src 'unsafe-inline'";
    $('preview').srcdoc=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><style>body{padding:20px;color:#222;font:14px/1.9 system-ui;overflow-wrap:anywhere}h1,h2,h3{font-weight:500;line-height:1.5}pre{background:#f1f1ee;padding:16px;overflow:auto}code{font-family:monospace}img{max-width:100%;height:auto}table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid #ddd;padding:8px}blockquote{border-left:2px solid #aaa;padding-left:18px;color:#666}a{color:inherit}</style></head><body>${html}</body></html>`;
  }
  async function refresh(initial=false) {
    if(!file) return;
    const serial=++pending;
    $('import').disabled=true; $('download').disabled=true;
    if(!local) return;
    try {
      const result=await request('preview',{filename:file.name,kind:$('kind').value,source,overrides:initial?{}:metadata()});
      if(serial!==pending) return;
      if(initial) {
        for(const key of ['title','slug','date','summary','link','source']) $(key).value=result.item[key] || '';
        $('tags').value=result.item.tags.join(', ');
        $('featured').checked=result.item.featured; $('draft').checked=result.item.draft;
        setCategories(result.item.category);
      }
      prepared=result.document; preview(result.item.html);
      $('import').disabled=false; $('download').disabled=false;
      setStatus('正文已就绪。确认分类与摘要后即可导入。');
    } catch(error) { if(serial===pending) setStatus(error.message); }
  }
  async function selectFile(selected) {
    if(!selected) return;
    clearTimeout(timer); ++pending; $('import').disabled=true; $('download').disabled=true;
    file=selected;
    if(!/\.(md|markdown|html?)$/i.test(file.name)||file.size>2*1024*1024) {file=null;setStatus('请选择不超过 2 MB 的 Markdown 或 HTML 文件。');return;}
    source=await file.text(); $('filename').textContent=file.name;
    if(!local) {setStatus('当前是线上静态页面。请使用下方 GitHub 上传入口，或在本机运行 npm run dev 后导入。');return;}
    await refresh(true);
  }
  $('file').addEventListener('change',()=>selectFile($('file').files[0]));
  const zone=document.querySelector('.upload-zone');
  zone.addEventListener('dragover',event=>event.preventDefault());
  zone.addEventListener('drop',event=>{event.preventDefault();selectFile(event.dataTransfer.files[0]);});
  let timer;
  document.querySelectorAll('#import-form input:not([type=file]),#import-form textarea,#category').forEach(el=>el.addEventListener('input',()=>{clearTimeout(timer);$('import').disabled=true;$('download').disabled=true;timer=setTimeout(()=>refresh(),250);}));
  $('kind').addEventListener('change',()=>{setCategories();refresh(true);});
  $('import-form').addEventListener('submit',async event=>{
    event.preventDefault(); if(!file||!local) return;
    clearTimeout(timer); $('import').disabled=true;
    try {
      const result=await request('import',{filename:file.name,kind:$('kind').value,source,overrides:metadata(),overwrite:$('overwrite').checked});
      setStatus(result.message);
      if(result.url) {const link=$('result-link');link.href=result.url;link.hidden=false;}
    } catch(error) {setStatus(error.message);}
    finally {$('import').disabled=false;}
  });
  $('download').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([prepared],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=$('slug').value+(/\.html?$/i.test(file.name)?'.html':'.md');link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  setCategories();
  fetch('api/status').then(async response=>{if(!response.ok) throw new Error();const result=await response.json();local=result.local===true;$('connection').textContent=local?'已连接本地内容服务 · 导入文件保存在你的项目中，提交到 GitHub 后公开发布。':'请使用 GitHub 上传入口。';}).catch(()=>{$('connection').textContent='当前为线上静态网站，不能直接保存文件。请使用下方 GitHub 上传入口，或在本机运行 npm run dev。';});
})();
