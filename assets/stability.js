(function(){
  'use strict';
  const q=(s,r=document)=>r.querySelector(s); const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function toast(message,type='info'){
    let stack=q('.toast-stack'); if(!stack){stack=document.createElement('div');stack.className='toast-stack';stack.setAttribute('aria-live','polite');document.body.appendChild(stack);}
    const item=document.createElement('div');item.className='toast is-visible toast-'+type;item.innerHTML='<span></span><button type="button" aria-label="Dismiss">×</button>';item.querySelector('span').textContent=message;item.querySelector('button').onclick=()=>item.remove();stack.appendChild(item);setTimeout(()=>item.remove(),4000);
  }
  window.DocCraftToast=window.DocCraftToast||toast;
  function markReady(){document.documentElement.classList.add('js-ready');}
  function validateEngine(){
    const body=document.body;
    if(body.dataset.tool){
      const ok=typeof window.DocCraftDocument==='object'&&q('#preview')&&q('#items');
      if(!ok) showError('The document workspace could not start. Reload the page. If the problem continues, clear the browser cache.');
    }
    if(body.dataset.calc){
      const ok=typeof window.calculate==='function'&&q('#mainResult');
      if(!ok) showError('The calculator could not start. Reload the page and try again.');
    }
    if(body.dataset.hrTool){
      const ok=q('#hrPreview');
      if(!ok) showError('The HR document preview could not start. Reload the page and try again.');
    }
  }
  function showError(message){
    if(q('.tool-runtime-error'))return; const box=document.createElement('div');box.className='tool-runtime-error';box.setAttribute('role','alert');box.textContent=message;const main=q('main');(main||document.body).prepend(box);
  }
  function safeButtons(){
    qa('button').forEach(b=>{if(!b.getAttribute('type'))b.setAttribute('type','button');});
    qa('a[target="_blank"]').forEach(a=>a.setAttribute('rel','noopener noreferrer'));
  }
  function init(){markReady();safeButtons();setTimeout(validateEngine,150);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
