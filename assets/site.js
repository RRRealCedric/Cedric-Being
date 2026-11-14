(() => {
  const collection = document.querySelector('[data-collection]');
  if (!collection) return;
  const entries = [...collection.querySelectorAll('.entry')];
  const parent = document.getElementById('entries');
  const search = document.getElementById('search'), sort = document.getElementById('sort'), tag = document.getElementById('tag');
  const tabs = [...document.querySelectorAll('[data-filter]')];
  const pagination = document.getElementById('pagination');
  const pageSize = Number(collection.dataset.pageSize);
  let category = '全部', page = 1;
  function readURL() {
    const params = new URLSearchParams(location.search);
    category = tabs.some(t=>t.dataset.filter===params.get('category')) ? params.get('category') : '全部';
    search.value = params.get('q') || '';
    sort.value = ['newest','oldest','title'].includes(params.get('sort')) ? params.get('sort') : 'newest';
    if(tag) tag.value = [...tag.options].some(o=>o.value===params.get('tag')) ? params.get('tag') : '';
    page = Math.max(1,Number.parseInt(params.get('page'),10)||1);
  }
  function render(push = false) {
    const query = search.value.trim().toLowerCase();
    let filtered = entries.filter(entry=>(category==='全部'||entry.dataset.category===category) && (!query||entry.dataset.search.includes(query)) && (!tag?.value||entry.dataset.tags.split(',').includes(tag.value)));
    filtered.sort((a,b)=>sort.value==='title' ? a.querySelector('h2').textContent.localeCompare(b.querySelector('h2').textContent,'zh-CN') : (sort.value==='oldest'?1:-1)*a.dataset.date.localeCompare(b.dataset.date));
    const totalPages = Math.max(1,Math.ceil(filtered.length/pageSize));
    page = Math.min(totalPages,page);
    entries.forEach(entry=>entry.hidden=true);
    filtered.forEach((entry,index)=>{ parent.append(entry); entry.hidden = index<(page-1)*pageSize || index>=page*pageSize; });
    tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.filter===category)));
    document.getElementById('result-count').textContent = `${category} · ${filtered.length} 项${filtered.length?` · 第 ${page} / ${totalPages} 页`:''}`;
    const empty = document.getElementById('empty-results'); empty.hidden = filtered.length>0;
    empty.querySelector('h2').textContent = entries.length?'没有找到匹配的内容。':'文字正在路上。';
    pagination.replaceChildren(); pagination.hidden = totalPages<=1;
    if(totalPages>1) {
      const numbers = new Set([1,totalPages,page-1,page,page+1].filter(n=>n>=1&&n<=totalPages));
      const button = (text,target,disabled=false,current=false) => {
        const el = document.createElement('button'); el.type='button'; el.textContent=text; el.disabled=disabled;
        if(current) el.setAttribute('aria-current','page');
        el.addEventListener('click',()=>{page=target;render(true);collection.scrollIntoView({block:'start'});pagination.querySelector('[aria-current]')?.focus({preventScroll:true});});
        pagination.append(el);
      };
      button('上一页',page-1,page===1);
      let last=0;
      for(const n of [...numbers].sort((a,b)=>a-b)) { if(last && n-last>1) {const span=document.createElement('span');span.textContent='…';pagination.append(span);} button(String(n),n,false,n===page); last=n; }
      button('下一页',page+1,page===totalPages);
    }
    if(push) {
      const params = new URLSearchParams();
      if(category!=='全部') params.set('category',category);
      if(query) params.set('q',search.value.trim());
      if(sort.value!=='newest') params.set('sort',sort.value);
      if(tag?.value) params.set('tag',tag.value);
      if(page>1) params.set('page',page);
      history.pushState(null,'',location.pathname+(params.size?'?'+params:''));
    }
  }
  tabs.forEach(tab=>tab.addEventListener('click',()=>{category=tab.dataset.filter;page=1;render(true);}));
  let timer;
  search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;render(true);},180);});
  sort.addEventListener('change',()=>{page=1;render(true);});
  tag?.addEventListener('change',()=>{page=1;render(true);});
  document.getElementById('reset-filters').addEventListener('click',()=>{category='全部';search.value='';sort.value='newest';if(tag) tag.value='';page=1;render(true);});
  window.addEventListener('popstate',()=>{readURL();render();});
  readURL();render();
})();
