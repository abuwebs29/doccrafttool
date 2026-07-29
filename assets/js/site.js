const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];

const navBtn=$('.nav-toggle');
if(navBtn){
  navBtn.addEventListener('click',()=>{
    const nav=$('.navlinks');
    const open=nav.classList.toggle('open');
    navBtn.setAttribute('aria-expanded',String(open));
  });
}

$$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

const registryPromise=fetch('/assets/data/documents.json',{cache:'no-cache'})
  .then(response=>{
    if(!response.ok) throw new Error(`Registry request failed: ${response.status}`);
    return response.json();
  })
  .then(data=>Array.isArray(data.documents)?data.documents:[])
  .catch(error=>{
    console.error('Unable to load document registry.',error);
    return [];
  });

const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[char]));
const slugify=value=>String(value??'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

$$('[data-breadcrumbs]').forEach(root=>{
  const current=root.dataset.breadcrumbLabel||document.querySelector('h1')?.textContent?.trim()||document.title.split('|')[0].trim();
  const parentLabel=root.dataset.breadcrumbParentLabel;
  const parentUrl=root.dataset.breadcrumbParentUrl;
  const crumbs=[{label:'Home',url:'/'}];
  if(parentLabel&&parentUrl) crumbs.push({label:parentLabel,url:parentUrl});
  crumbs.push({label:current});
  root.setAttribute('aria-label','Breadcrumb');
  root.innerHTML=crumbs.map((crumb,index)=>{
    const isCurrent=index===crumbs.length-1;
    return `${index?'<span aria-hidden="true">/</span> ':''}${isCurrent?`<span aria-current="page">${escapeHtml(crumb.label)}</span>`:`<a href="${escapeHtml(crumb.url)}">${escapeHtml(crumb.label)}</a>`}`;
  }).join('');
});

const searchRoot=$('[data-document-search]');
if(searchRoot){
  const input=$('input[type="search"]',searchRoot);
  const button=$('[data-search-button]',searchRoot);
  const results=$('[data-search-results]',searchRoot);
  let documentIndex=[];

  registryPromise.then(documents=>{documentIndex=documents;});

  const render=()=>{
    const query=input.value.trim().toLowerCase();
    if(!query){results.hidden=true;results.innerHTML='';return;}
    const terms=query.split(/\s+/).filter(Boolean);
    const matches=documentIndex
      .map(item=>{
        const haystack=[item.title,item.shortTitle,item.category,item.description,...(item.keywords||[])].join(' ').toLowerCase();
        const score=terms.reduce((total,term)=>total+(haystack.includes(term)?1:0),0);
        return {item,score};
      })
      .filter(result=>result.score>0)
      .sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title))
      .slice(0,8)
      .map(result=>result.item);

    results.innerHTML=matches.length
      ? matches.map(item=>`<a href="${escapeHtml(item.url)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.category)} · Open tool →</span></a>`).join('')
      : '<p>No exact match yet. Browse all available documents.</p><a href="/tools/"><strong>View all documents</strong><span>Browse →</span></a>';
    results.hidden=false;
  };

  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'){
      event.preventDefault();
      render();
      const first=$('a',results);
      if(first) window.location.href=first.href;
    }
    if(event.key==='Escape') results.hidden=true;
  });
  button.addEventListener('click',()=>{
    render();
    const first=$('a',results);
    if(first) window.location.href=first.href;
  });
  document.addEventListener('click',event=>{
    if(!searchRoot.contains(event.target)) results.hidden=true;
  });
}

const documentList=$('[data-document-list]');
if(documentList){
  registryPromise.then(documents=>{
    if(!documents.length){
      documentList.innerHTML='<p>Document tools are temporarily unavailable. Please refresh the page.</p>';
      return;
    }

    const requestedCategory=documentList.dataset.category;
    const filtered=requestedCategory?documents.filter(item=>item.category===requestedCategory):documents;
    const groups=filtered.reduce((map,item)=>{
      const category=item.category||'Other';
      if(!map.has(category)) map.set(category,[]);
      map.get(category).push(item);
      return map;
    },new Map());

    documentList.innerHTML=[...groups.entries()].map(([category,items])=>`
      <section class="document-group" aria-labelledby="category-${slugify(category)}">
        <div class="section-heading"><div><span class="eyebrow">${escapeHtml(category)}</span><h2 id="category-${slugify(category)}">${escapeHtml(category)} documents</h2></div><span>${items.length} ${items.length===1?'tool':'tools'}</span></div>
        <div class="grid two">
          ${items.sort((a,b)=>a.title.localeCompare(b.title)).map(item=>`
            <article class="card tool-card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><a href="${escapeHtml(item.url)}">Open tool →</a></article>`).join('')}
        </div>
      </section>`).join('');
  });
}

const featuredList=$('[data-featured-documents]');
if(featuredList){
  registryPromise.then(documents=>{
    const featured=documents.filter(item=>item.featured).slice(0,6);
    if(!featured.length) return;
    featuredList.innerHTML=featured.map(item=>`
      <article class="card tool-card" data-search-item><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><a href="${escapeHtml(item.url)}">Open tool →</a></article>`).join('');
  });
}

const categoryDirectory=$('[data-category-directory]');
if(categoryDirectory){
  const categoryDescriptions={
    'Business':'Documents for billing, sales, purchasing and commercial communication.',
    'Human Resources':'Employment letters, workplace notices, certificates and employee records.',
    'Finance':'Calculators and documents for taxes, payments and financial administration.'
  };
  registryPromise.then(documents=>{
    if(!documents.length){
      categoryDirectory.innerHTML='<p>Categories are temporarily unavailable. Please refresh the page.</p>';
      return;
    }
    const groups=documents.reduce((map,item)=>{
      const category=item.category||'Other';
      if(!map.has(category)) map.set(category,[]);
      map.get(category).push(item);
      return map;
    },new Map());
    categoryDirectory.innerHTML=[...groups.entries()]
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([category,items])=>`
        <article class="directory-card" id="${slugify(category)}">
          <div class="directory-head"><div><h2>${escapeHtml(category)} documents</h2><p>${escapeHtml(categoryDescriptions[category]||'Professional browser-based documents and utilities.')}</p></div><span class="status-badge">${items.length} available</span></div>
          <div class="document-links">${items.sort((a,b)=>a.title.localeCompare(b.title)).map(item=>`<a href="${escapeHtml(item.url)}">${escapeHtml(item.shortTitle||item.title)}</a>`).join('')}</div>
        </article>`).join('');
  });
}
