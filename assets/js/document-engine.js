(()=>{
  const root=document.querySelector('[data-document-engine]');
  if(!root) return;

  const form=root.querySelector('[data-document-form]');
  const preview=root.querySelector('[data-document-preview]');
  const printButton=root.querySelector('[data-print-document]');
  const resetButton=root.querySelector('[data-reset-document]');

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[char]);

  const readValues=()=>Object.fromEntries(new FormData(form).entries());

  const formatDate=value=>{
    if(!value) return '';
    const date=new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',day:'numeric'}).format(date);
  };

  const render=()=>{
    const values=readValues();
    preview.querySelectorAll('[data-bind]').forEach(node=>{
      const key=node.dataset.bind;
      let value=values[key]||node.dataset.fallback||'';
      if(node.dataset.format==='date') value=formatDate(value);
      node.innerHTML=escapeHtml(value).replace(/\n/g,'<br>');
    });

    preview.querySelectorAll('[data-show-if]').forEach(node=>{
      node.hidden=!values[node.dataset.showIf];
    });
  };

  form.addEventListener('input',render);
  form.addEventListener('change',render);

  if(printButton) printButton.addEventListener('click',()=>window.print());
  if(resetButton) resetButton.addEventListener('click',()=>{
    form.reset();
    render();
    form.querySelector('input,textarea,select')?.focus();
  });

  render();
})();