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

const documentIndex=[
  {name:'Invoice Generator',keywords:'invoice billing client payment',url:'/invoice-generator/'},
  {name:'Receipt Generator',keywords:'receipt payment proof sale rent',url:'/receipt-generator/'},
  {name:'Quotation Generator',keywords:'quotation quote proposal pricing',url:'/quotation-generator/'},
  {name:'Purchase Order Generator',keywords:'purchase order supplier procurement',url:'/purchase-order-generator/'},
  {name:'VAT Calculator',keywords:'vat tax net gross calculator',url:'/vat-calculator/'},
  {name:'Business Document Guides',keywords:'guides learn invoice receipt quotation',url:'/blog/'}
];

const searchRoot=$('[data-document-search]');
if(searchRoot){
  const input=$('input[type="search"]',searchRoot);
  const button=$('[data-search-button]',searchRoot);
  const results=$('[data-search-results]',searchRoot);

  const render=()=>{
    const query=input.value.trim().toLowerCase();
    if(!query){results.hidden=true;results.innerHTML='';return;}
    const matches=documentIndex.filter(item=>`${item.name} ${item.keywords}`.toLowerCase().includes(query)).slice(0,6);
    results.innerHTML=matches.length
      ? matches.map(item=>`<a href="${item.url}"><strong>${item.name}</strong><span>Open tool →</span></a>`).join('')
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
    if(event.key==='Escape'){results.hidden=true;}
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
