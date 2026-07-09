(function(){
  const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const get=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(e){return f}};
  const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  function recordRecentTool(){
    const title=document.querySelector('h1')?.textContent?.trim();
    const isTool=document.body.dataset.tool || location.pathname.includes('-generator') || location.pathname.includes('-calculator');
    if(!title || !isTool) return;
    const item={title:title.replace(' Workspace',''),url:location.pathname,type:document.body.dataset.tool?'Document tool':'Business tool',time:Date.now()};
    const list=[item,...get('doccraft:recentTools',[]).filter(x=>x.url!==item.url)].slice(0,6);
    set('doccraft:recentTools',list);
  }
  function renderRecentTools(){
    const target=$('[data-recent-tools]'); if(!target) return;
    const list=get('doccraft:recentTools',[]);
    target.innerHTML=list.length?list.map(i=>`<a href="${i.url}"><b>${i.title}</b><span>${i.type}</span></a>`).join(''):'<div class="empty-state polished-empty"><b>No recent tools yet.</b><span>Create an invoice, quotation or payslip and it will appear here.</span></div>';
  }
  function addShortcutHint(){
    const trigger=$('[data-open-search]');
    if(trigger && !trigger.querySelector('kbd')) trigger.insertAdjacentHTML('beforeend',' <kbd class="kbd">⌘K</kbd>');
  }
  function improveExternalLinks(){
    $$('a[href^="http"]').forEach(a=>{ if(!a.hostname.includes(location.hostname)){a.rel='noopener noreferrer'; a.target='_blank';}});
  }
  function markLaunchReady(){
    const blocks=$$('.aurora-checklist div');
    blocks.forEach((b,i)=>{b.setAttribute('tabindex','0'); b.dataset.status=i<3?'ready':'testing';});
  }
  document.addEventListener('DOMContentLoaded',()=>{recordRecentTool();renderRecentTools();addShortcutHint();improveExternalLinks();markLaunchReady();});
})();
