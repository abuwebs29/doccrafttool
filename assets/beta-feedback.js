/* DocCraftTools Sprint 10 - Launchpad beta feedback system */
(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const key='doccraft:beta-feedback';
  const get=()=>{try{return JSON.parse(localStorage.getItem(key))||[]}catch(e){return[]}};
  const set=v=>{try{localStorage.setItem(key,JSON.stringify(v))}catch(e){}};
  function toast(msg,type='success'){window.DocCraftToast?window.DocCraftToast(msg,type):alert(msg)}
  function renderList(){
    const list=$('[data-feedback-list]'); if(!list)return;
    const items=get();
    list.innerHTML=items.length?items.map((f,i)=>`<div class="feedback-item"><strong>${escapeHtml(f.area)} · ${escapeHtml(f.rating)}/5</strong><small>${new Date(f.ts).toLocaleString()} · ${escapeHtml(f.page)}</small><p>${escapeHtml(f.message)}</p><button class="btn small secondary" type="button" data-delete-feedback="${i}">Remove</button></div>`).join(''):'<div class="empty-state">No beta notes yet. Add the first testing note after reviewing a page or tool.</div>';
  }
  function escapeHtml(str=''){return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function saveFeedback(area,rating,message,page=location.pathname){
    if(!message.trim()){toast('Please write a short feedback note.','warning');return false}
    const items=get(); items.unshift({area,rating,message:message.trim(),page,ts:Date.now()}); set(items.slice(0,100)); renderList(); toast('Feedback saved locally.','success'); return true;
  }
  function setupPageForm(){
    const form=$('[data-feedback-form]'); if(!form)return;
    renderList();
    form.addEventListener('submit',e=>{e.preventDefault(); const fd=new FormData(form); if(saveFeedback(fd.get('area'),fd.get('rating'),fd.get('message'),fd.get('page')||location.pathname)) form.reset();});
    document.addEventListener('click',e=>{const btn=e.target.closest('[data-delete-feedback]'); if(!btn)return; const items=get(); items.splice(Number(btn.dataset.deleteFeedback),1); set(items); renderList();});
    $('[data-export-feedback]')?.addEventListener('click',()=>{const box=$('[data-feedback-export]'); if(box) box.textContent=JSON.stringify(get(),null,2);});
    $('[data-clear-feedback]')?.addEventListener('click',()=>{if(confirm('Clear all locally saved beta feedback?')){set([]);renderList();toast('Feedback cleared.','success')}});
  }
  function setupFloatingWidget(){
    if(document.body.dataset.noFeedbackWidget==='true')return;
    if($('.sticky-feedback'))return;
    const btn=document.createElement('button'); btn.className='sticky-feedback'; btn.type='button'; btn.textContent='Feedback';
    const panel=document.createElement('div'); panel.className='feedback-mini'; panel.innerHTML=`<h3>Beta feedback</h3><p class="muted">Save a quick note about this page.</p><label>Area<select data-mini-area><option>UX</option><option>Bug</option><option>Content</option><option>Mobile</option><option>Performance</option></select></label><label>Note<textarea data-mini-message placeholder="What should be improved?"></textarea></label><div class="feedback-actions"><button class="btn small" type="button" data-mini-save>Save note</button><a class="btn small secondary" href="/feedback/">Open center</a></div>`;
    document.body.append(btn,panel); btn.addEventListener('click',()=>panel.classList.toggle('is-open'));
    panel.querySelector('[data-mini-save]').addEventListener('click',()=>{const area=panel.querySelector('[data-mini-area]').value; const msg=panel.querySelector('[data-mini-message]').value; if(saveFeedback(area,3,msg)){panel.querySelector('[data-mini-message]').value='';panel.classList.remove('is-open')}});
  }
  function setupLaunchChecklist(){
    const wrap=$('[data-launch-checklist]'); if(!wrap)return;
    const ckey='doccraft:launch-checklist';
    const saved=(()=>{try{return JSON.parse(localStorage.getItem(ckey))||{}}catch(e){return{}}})();
    $$('input[type="checkbox"]',wrap).forEach(input=>{input.checked=!!saved[input.name]; input.addEventListener('change',()=>{saved[input.name]=input.checked; localStorage.setItem(ckey,JSON.stringify(saved)); updateProgress();});});
    function updateProgress(){const boxes=$$('input[type="checkbox"]',wrap); const done=boxes.filter(b=>b.checked).length; const pct=boxes.length?Math.round(done/boxes.length*100):0; const bar=$('[data-launch-progress]'); const label=$('[data-launch-progress-label]'); if(bar)bar.style.width=pct+'%'; if(label)label.textContent=pct+'% ready';}
    updateProgress();
  }
  function init(){setupPageForm();setupFloatingWidget();setupLaunchChecklist();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
