/* DocCraftTools Sprint 9 - Project Northstar quality layer */
(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const store={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch(e){return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  const now=()=>Math.round(performance.now());

  function lazyImages(){
    $$('img:not([loading])').forEach(img=>img.loading='lazy');
    $$('img:not([decoding])').forEach(img=>img.decoding='async');
  }

  function improveExternalSafety(){
    $$('a[target="_blank"]:not([rel])').forEach(a=>a.rel='noopener noreferrer');
  }

  function focusSearchResults(){
    const input=$('#globalSearch'), results=$('#searchResults');
    if(!input||!results||input.dataset.qualityKeys)return;
    input.dataset.qualityKeys='true';
    input.addEventListener('keydown',e=>{
      const links=$$('a',results);
      if(e.key==='ArrowDown' && links.length){e.preventDefault();links[0].focus();}
    });
    results.addEventListener('keydown',e=>{
      const links=$$('a',results); const i=links.indexOf(document.activeElement);
      if(e.key==='ArrowDown'){e.preventDefault();(links[i+1]||links[0])?.focus();}
      if(e.key==='ArrowUp'){e.preventDefault();(links[i-1]||links[links.length-1])?.focus();}
      if(e.key==='Escape') $('[data-close-search]')?.click();
    });
  }

  function betaChecklist(){
    const target=$('[data-beta-checklist]');
    if(!target)return;
    const checks=[
      ['Navigation', !!$('.site-header')],
      ['Search', !!$('#searchModal')],
      ['Workspace cards', $$('.workspace-card').length>=3],
      ['Tool cards', $$('.tool-card').length>=4],
      ['Mobile menu', !!$('.menu-toggle')],
      ['Footer', !!$('.footer')]
    ];
    const score=Math.round(checks.filter(c=>c[1]).length/checks.length*100);
    target.innerHTML=`<div class="quality-score"><strong>${score}%</strong><span>Beta readiness</span></div>`+
      checks.map(([name,ok])=>`<div class="quality-item ${ok?'ok':'warn'}"><span>${ok?'✓':'!'}</span>${name}</div>`).join('');
  }

  function taskTimer(){
    if(!document.body.dataset.tool)return;
    const key='doccraft:task-start:'+document.body.dataset.tool;
    if(!store.get(key,null)) store.set(key,Date.now());
    document.addEventListener('click',e=>{
      const action=e.target.closest('[data-action]')?.dataset.action;
      if(action==='download-pdf'||action==='print'){
        const start=store.get(key,Date.now());
        const seconds=Math.max(1,Math.round((Date.now()-start)/1000));
        const history=store.get('doccraft:task-times',[]);
        store.set('doccraft:task-times',[{tool:document.body.dataset.tool,seconds,ts:Date.now()},...history].slice(0,20));
        window.DocCraftToast&&window.DocCraftToast(`Document completed in about ${seconds} seconds.`,'success');
      }
    });
  }

  function addQualityFooter(){
    const footer=$('.footer-bottom');
    if(!footer||$('.quality-stamp'))return;
    const stamp=document.createElement('span');
    stamp.className='quality-stamp';
    stamp.textContent=' · Sprint 9 quality hardening active';
    footer.appendChild(stamp);
  }

  function init(){
    lazyImages(); improveExternalSafety(); focusSearchResults(); betaChecklist(); taskTimer(); addQualityFooter();
    document.documentElement.dataset.readyAt=String(now());
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
