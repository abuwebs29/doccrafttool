window.DOC_CRAFT_SEARCH=[
{title:'Invoice Generator',url:'/invoice-generator/',type:'Tool',desc:'Create professional invoices with items, totals and payment terms.'},
{title:'Receipt Generator',url:'/receipt-generator/',type:'Tool',desc:'Generate payment receipts for clients and customers.'},
{title:'Quotation Generator',url:'/quotation-generator/',type:'Tool',desc:'Prepare quotations before work starts.'},
{title:'Purchase Order Generator',url:'/purchase-order-generator/',type:'Tool',desc:'Create supplier purchase orders.'},
{title:'Estimate Generator',url:'/estimate-generator/',type:'Tool',desc:'Share project estimates before final pricing.'},
{title:'Delivery Note Generator',url:'/delivery-note-generator/',type:'Tool',desc:'Confirm delivered goods.'},
{title:'Rent Receipt Generator',url:'/rent-receipt-generator/',type:'Tool',desc:'Create rent receipts for landlords and tenants.'},
{title:'Proforma Invoice Generator',url:'/proforma-invoice-generator/',type:'Tool',desc:'Create a preliminary invoice before final billing.'},
{title:'Credit Note Generator',url:'/credit-note-generator/',type:'Tool',desc:'Create credit notes for returns or billing corrections.'},
{title:'Debit Note Generator',url:'/debit-note-generator/',type:'Tool',desc:'Create debit notes for additional charges or underbilling.'},
{title:'VAT Calculator',url:'/vat-calculator/',type:'Calculator',desc:'Calculate VAT-inclusive and VAT-exclusive amounts.'},
{title:'Profit Margin Calculator',url:'/profit-margin-calculator/',type:'Calculator',desc:'Calculate profit, cost, revenue and margin.'},
{title:'ROI Calculator',url:'/roi-calculator/',type:'Calculator',desc:'Measure return on investment.'},
{title:'Discount Calculator',url:'/discount-calculator/',type:'Calculator',desc:'Calculate discounts, savings and final prices.'},
{title:'Break-even Calculator',url:'/break-even-calculator/',type:'Calculator',desc:'Estimate units or sales needed to break even.'},
{title:'Payslip Generator',url:'/payslip-generator/',type:'HR Tool',desc:'Create a simple printable payslip for employees.'},
{title:'Offer Letter Generator',url:'/offer-letter-generator/',type:'HR Tool',desc:'Prepare a professional employment offer letter.'},
{title:'Experience Letter Generator',url:'/experience-letter-generator/',type:'HR Tool',desc:'Create an employee experience certificate.'},
{title:'Salary Certificate Generator',url:'/salary-certificate-generator/',type:'HR Tool',desc:'Generate a salary certificate for official use.'},
{title:'Leave Request Letter Generator',url:'/leave-request-letter-generator/',type:'HR Tool',desc:'Draft a professional leave request letter.'},

{title:'Learning Center',url:'/learning-center/',type:'Resource',desc:'Business document guides and practical workflows.'},
{title:'Trust Center',url:'/trust-center/',type:'Resource',desc:'Privacy, quality and product trust standards.'},
{title:'How to Create an Invoice',url:'/learning-center/invoice-guide/',type:'Guide',desc:'Invoice fields, numbering, payment terms and mistakes.'},
{title:'Invoice vs Receipt',url:'/learning-center/receipt-guide/',type:'Guide',desc:'Know when to send an invoice and when to issue a receipt.'},
{title:'Quotation Best Practices',url:'/learning-center/quotation-guide/',type:'Guide',desc:'Scope, validity, pricing and client approval tips.'},
{title:'Purchase Order Basics',url:'/learning-center/purchase-order-guide/',type:'Guide',desc:'Supplier order records and delivery workflow.'},
{title:'Business Workspace',url:'/workspace/',type:'Workspace',desc:'Quick actions, recommended tools and business workflows.'},
{title:'Roadmap',url:'/roadmap/',type:'Resource',desc:'See what is shipped, in progress and planned.'},
{title:'Changelog',url:'/changelog/',type:'Resource',desc:'Read product release notes.'},
{title:'Beta Readiness',url:'/beta/',type:'Resource',desc:'Review the launch checklist and quality standards.'},
{title:'Feedback Center',url:'/feedback/',type:'Beta',desc:'Send product feedback and test notes.'},
{title:'Launch Checklist',url:'/launch-checklist/',type:'Resource',desc:'Review DocCraftTools v2.0 launch readiness.'},
{title:'Business Templates',url:'/templates/',type:'Template',desc:'Starter workflows for freelancers, agencies, retailers, landlords and HR.'},
{title:'Freelancer Workspace',url:'/solutions/freelancers/',type:'Solution',desc:'Recommended tools for freelancers.'},
{title:'Small Business Workspace',url:'/solutions/small-business/',type:'Solution',desc:'Recommended tools for small businesses.'}
];
document.addEventListener('DOMContentLoaded',()=>{
 const btn=document.querySelector('.menu-toggle');const nav=document.getElementById('primaryNav');
 if(btn&&nav){btn.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');btn.setAttribute('aria-expanded',String(open));});}
 document.querySelectorAll('.navlinks a').forEach(a=>{if(a.pathname===location.pathname)a.setAttribute('aria-current','page');});
 document.querySelectorAll('.nav-drop').forEach(drop=>{drop.addEventListener('click',()=>{const panel=drop.nextElementSibling;const open=panel&&panel.classList.toggle('is-open');drop.setAttribute('aria-expanded',String(!!open));});});
 const modal=document.getElementById('searchModal'),input=document.getElementById('globalSearch'),results=document.getElementById('searchResults');
 const render=(query='')=>{if(!results)return;const q=query.toLowerCase().trim();const matches=window.DOC_CRAFT_SEARCH.filter(i=>!q||(`${i.title} ${i.type} ${i.desc}`).toLowerCase().includes(q)).slice(0,8);results.innerHTML=matches.map(i=>`<a class="search-result" href="${i.url}"><b>${i.title}</b><small>${i.type} · ${i.desc}</small></a>`).join('')||'<div class="empty-state">No matching tools yet. Try invoice, receipt, estimate or freelancer.</div>';};
 const openSearch=()=>{if(!modal)return;modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');render('');setTimeout(()=>input&&input.focus(),20);};
 const closeSearch=()=>{if(!modal)return;modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');};
 document.querySelectorAll('[data-open-search]').forEach(b=>b.addEventListener('click',openSearch));
 document.querySelectorAll('[data-close-search]').forEach(b=>b.addEventListener('click',closeSearch));
 input&&input.addEventListener('input',()=>render(input.value));
 document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}if(e.key==='Escape')closeSearch();});
});
