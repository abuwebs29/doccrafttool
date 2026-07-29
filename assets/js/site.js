
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const navBtn=$('.nav-toggle'); if(navBtn) navBtn.addEventListener('click',()=>$('.navlinks').classList.toggle('open'));
$$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
