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
    const filtered=requestedCategory
      ? documents.filter(item=>item.category===requestedCategory)
      : documents;
    const groups=filtered.reduce((map,item)=>{
      const category=item.category||'Other';
      if(!map.has(category)) map.set(category,[]);
      map.get(category).push(item);
      return map;
    },new Map());

    documentList.innerHTML=[...groups.entries()].map(([category,items])=>`
      <section class="document-group" aria-labelledby="category-${escapeHtml(category.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}">
        <div class="section-heading"><div><span class="eyebrow">${escapeHtml(category)}</span><h2 id="category-${escapeHtml(category.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}">${escapeHtml(category)} documents</h2></div><span>${items.length} ${items.length===1?'tool':'tools'}</span></div>
        <div class="grid two">
          ${items.sort((a,b)=>a.title.localeCompare(b.title)).map(item=>`
            <article class="card tool-card">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
              <a href="${escapeHtml(item.url)}">Open tool →</a>
            </article>`).join('')}
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
      <article class="card tool-card" data-search-item>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <a href="${escapeHtml(item.url)}">Open tool →</a>
      </article>`).join('');
  });
}
