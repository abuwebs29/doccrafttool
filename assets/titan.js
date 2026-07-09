/* DocCraftTools Sprint 7 - Project Titan polish layer */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const storage = {
    get(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch(e){ return fallback; } },
    set(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){} }
  };

  function toast(message, type='info'){
    let wrap = $('.toast-stack');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'toast-stack';
      wrap.setAttribute('aria-live','polite');
      document.body.appendChild(wrap);
    }
    const item = document.createElement('div');
    item.className = `toast toast-${type}`;
    item.innerHTML = `<span>${message}</span><button type="button" aria-label="Dismiss notification">×</button>`;
    item.querySelector('button').addEventListener('click',()=>item.remove());
    wrap.appendChild(item);
    setTimeout(()=>item.classList.add('is-visible'),20);
    setTimeout(()=>{ item.classList.remove('is-visible'); setTimeout(()=>item.remove(),220); },4200);
  }
  window.DocCraftToast = toast;

  function enhanceSearchTrigger(){
    $$('[data-open-search]').forEach(btn=>{
      if(btn.dataset.titanSearch) return;
      btn.dataset.titanSearch = 'true';
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      btn.innerHTML = `Search <kbd>${isMac ? '⌘' : 'Ctrl'} K</kbd>`;
    });
  }

  function recordRecentTool(){
    const path = location.pathname;
    const ignore = ['/', '/privacy/', '/terms/', '/disclaimer/', '/contact/', '/about/'];
    if(ignore.includes(path)) return;
    const title = (document.title || 'DocCraftTools').replace(' | DocCraftTools','').replace('Free ','').trim();
    const type = document.body.dataset.tool ? 'Document' : (path.includes('calculator') ? 'Calculator' : 'Workspace');
    const item = { title, url:path, type, ts:Date.now() };
    const list = storage.get('doccraft:recent', []).filter(i=>i.url !== path);
    storage.set('doccraft:recent', [item, ...list].slice(0,6));
  }

  function injectRecentTools(){
    const board = $('.workspace-board');
    if(!board || $('.recent-panel')) return;
    const recent = storage.get('doccraft:recent', []);
    const panel = document.createElement('div');
    panel.className = 'recent-panel';
    const rows = recent.length ? recent.map(i=>`<a href="${i.url}"><b>${i.title}</b><span>${i.type}</span></a>`).join('') : `<div class="empty-state polished-empty"><b>No recent tools yet.</b><span>Start with an invoice, quotation or VAT calculator and it will appear here.</span><a class="btn secondary" href="/invoice-generator/">Create invoice</a></div>`;
    panel.innerHTML = `<span class="eyebrow">Recently used</span><h2>Continue where you left off</h2><div class="recent-list">${rows}</div>`;
    const quick = $('.quick-panel');
    if(quick && quick.nextSibling) board.insertBefore(panel, quick.nextSibling); else board.appendChild(panel);
  }

  function getDraftKey(){ return document.body.dataset.tool ? `doccraft:draft:${document.body.dataset.tool}` : null; }
  function collectItems(){
    return $$('.itemrow').map(row=>({
      desc: $('.i-desc',row)?.value || '',
      qty: $('.i-qty',row)?.value || '0',
      rate: $('.i-rate',row)?.value || '0',
      tax: $('.i-tax',row)?.value || '0'
    }));
  }
  function collectFields(){
    const fields = {};
    $$('input, textarea, select').forEach(el=>{
      if(el.id && !['globalSearch','workspaceSearch'].includes(el.id)) fields[el.id] = el.value;
    });
    return fields;
  }
  function activeTemplate(){ return $('[data-template].is-active')?.dataset.template || 'modern'; }
  function saveDraft(){
    const key = getDraftKey();
    if(!key) return;
    storage.set(key, { fields: collectFields(), items: collectItems(), template: activeTemplate(), savedAt: Date.now() });
    updateAutosaveStatus('Saved just now');
  }
  let draftTimer;
  function scheduleDraft(){ clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 350); }

  function updateAutosaveStatus(text){
    let status = $('.autosave-status');
    const toolbar = $('.doc-toolbar');
    if(!toolbar) return;
    if(!status){
      status = document.createElement('span');
      status.className = 'autosave-status';
      const first = toolbar.querySelector('div');
      if(first) first.appendChild(status);
    }
    status.textContent = text;
  }

  function restoreDraft(){
    const key = getDraftKey();
    if(!key) return;
    const draft = storage.get(key, null);
    if(!draft || !draft.fields) return;
    Object.entries(draft.fields).forEach(([id,value])=>{
      const el = document.getElementById(id);
      if(el) el.value = value;
    });
    if(Array.isArray(draft.items) && draft.items.length && typeof window.addItem === 'function'){
      const wrap = document.getElementById('items');
      if(wrap){
        wrap.innerHTML = '';
        draft.items.forEach(i=>window.addItem(i.desc || 'Professional service', i.qty || 1, i.rate || 0, i.tax || 0));
      }
    }
    if(draft.template){
      const btn = document.querySelector(`[data-template="${draft.template}"]`);
      if(btn) btn.click();
    }
    if(typeof window.renderDoc === 'function') window.renderDoc();
    updateAutosaveStatus(`Draft restored`);
  }

  function enhanceDocumentWorkspace(){
    if(!document.body.dataset.tool) return;
    restoreDraft();
    updateAutosaveStatus('Autosave on');
    $$('input, textarea, select').forEach(el=>el.addEventListener('input', scheduleDraft));
    document.addEventListener('click', e=>{
      const action = e.target.closest('[data-action]')?.dataset.action;
      const template = e.target.closest('[data-template]')?.textContent?.trim();
      if(action === 'add-item'){ setTimeout(()=>{ $$('.itemrow input').forEach(i=>i.removeEventListener('input', scheduleDraft)); $$('.itemrow input').forEach(i=>i.addEventListener('input', scheduleDraft)); saveDraft(); },50); }
      if(action === 'remove-item') setTimeout(saveDraft,50);
      if(action === 'download-pdf') toast('Preparing your PDF export...', 'success');
      if(action === 'print') toast('Opening print preview...', 'info');
      if(action === 'new-doc') toast('New document workspace ready.', 'success');
      if(template) toast(`${template} template applied.`, 'success');
    });
    addFormHints();
    addValidation();
  }

  function addFormHints(){
    const hints = {
      business:'Example: Acme Studio LLC',
      client:'Example: Client or customer name',
      number:'Use a clear sequence such as INV-001 or QTN-001',
      method:'Example: Bank transfer, cash, card, cheque',
      discount:'Enter a fixed discount amount, not a percentage',
      notes:'Add payment terms, delivery notes or important instructions'
    };
    Object.entries(hints).forEach(([id,text])=>{
      const el = document.getElementById(id);
      if(!el || el.dataset.hinted) return;
      el.dataset.hinted = 'true';
      const hint = document.createElement('small');
      hint.className = 'field-hint';
      hint.textContent = text;
      el.insertAdjacentElement('afterend', hint);
    });
  }

  function addValidation(){
    const required = ['business','client','number'];
    const validate = el => {
      const invalid = !String(el.value || '').trim();
      el.toggleAttribute('aria-invalid', invalid);
      el.classList.toggle('is-invalid', invalid);
      return !invalid;
    };
    required.forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.setAttribute('required','required');
      el.addEventListener('blur',()=>validate(el));
      el.addEventListener('input',()=>validate(el));
    });
    $$('[data-action="download-pdf"], [data-action="print"], [data-action="download-word"], [data-action="download-excel"]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const ok = required.map(id=>document.getElementById(id)).filter(Boolean).every(validate);
        if(!ok){
          e.preventDefault();
          toast('Please complete business name, client name and document number first.', 'warning');
        }
      }, true);
    });
  }

  function polishExternalLinks(){
    $$('a[href^="http"]').forEach(a=>{ a.rel = 'noopener noreferrer'; });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    enhanceSearchTrigger();
    recordRecentTool();
    injectRecentTools();
    enhanceDocumentWorkspace();
    polishExternalLinks();
  });
})();
