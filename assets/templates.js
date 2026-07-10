(function(){
'use strict';
const CATALOG = {
  'freelancer-invoice': {tool:'invoice', label:'Freelancer Invoice', fields:{business:'Your Freelance Business',client:'Client Company',method:'Bank transfer within 14 days',notes:'Thank you for choosing my services.'}, items:[['Project services',1,1200,0]]},
  'it-consultant-invoice': {tool:'invoice', label:'IT Consultant Invoice', fields:{business:'IT Consulting Studio',client:'Client Company',method:'Bank transfer within 15 days',notes:'Support hours beyond the agreed scope are billed separately.'}, items:[['IT consulting and implementation',20,85,0]]},
  'marketing-agency-invoice': {tool:'invoice', label:'Marketing Agency Invoice', fields:{business:'Growth Marketing Agency',client:'Campaign Client',method:'Payment due within 30 days',notes:'Monthly campaign management and reporting.'}, items:[['Campaign strategy and management',1,2500,0],['Advertising creative production',1,800,0]]},
  'web-design-invoice': {tool:'invoice', label:'Web Design Invoice', fields:{business:'Web Design Studio',client:'Website Client',method:'50% deposit, balance on launch',notes:'Includes design, development and two revision rounds.'}, items:[['Website design and development',1,3200,0]]},
  'consulting-quotation': {tool:'quotation', label:'Consulting Quotation', fields:{business:'Business Advisory Studio',client:'Prospective Client',method:'Pricing valid for 30 days',notes:'Scope changes may require a revised quotation.'}, items:[['Discovery and business analysis',1,750,0],['Implementation advisory',10,120,0]]},
  'construction-quotation': {tool:'quotation', label:'Construction Quotation', fields:{business:'Construction Services LLC',client:'Property Owner',property:'Project site and scope',method:'Valid for 21 days',notes:'Material prices are subject to supplier availability.'}, items:[['Site preparation',1,1800,0],['Construction labour',80,45,0],['Materials allowance',1,4500,0]]},
  'photography-quotation': {tool:'quotation', label:'Photography Quotation', fields:{business:'Creative Photography Studio',client:'Event Client',method:'30% booking deposit required',notes:'Final edited images delivered within 14 days.'}, items:[['Event photography package',1,950,0],['Additional coverage hour',2,125,0]]},
  'software-estimate': {tool:'estimate', label:'Software Project Estimate', fields:{business:'Software Development Studio',client:'Product Client',property:'Web application scope',method:'Estimate valid for 30 days',notes:'Final cost depends on approved requirements and integrations.'}, items:[['UX and technical planning',24,90,0],['Application development',120,110,0],['Testing and deployment',30,85,0]]},
  'renovation-estimate': {tool:'estimate', label:'Renovation Estimate', fields:{business:'Renovation & Maintenance Co.',client:'Property Owner',property:'Renovation project address',method:'Estimate valid for 14 days',notes:'Hidden structural issues are excluded until inspected.'}, items:[['Demolition and preparation',1,1200,0],['Finishing labour',60,40,0],['Materials estimate',1,3000,0]]},
  'office-purchase-order': {tool:'purchase', label:'Office Supplies Purchase Order', fields:{business:'Small Business LLC',client:'Office Supplier',property:'Main office delivery address',method:'Invoice against delivered quantities',notes:'Please confirm availability before dispatch.'}, items:[['A4 paper cartons',10,28,0],['Printer toner',4,75,0],['Desk stationery sets',12,18,0]]},
  'restaurant-purchase-order': {tool:'purchase', label:'Restaurant Purchase Order', fields:{business:'Restaurant Trading LLC',client:'Food Supplier',property:'Restaurant receiving area',method:'Payment according to supplier agreement',notes:'Deliver chilled items within the agreed temperature range.'}, items:[['Fresh produce order',1,650,0],['Dry goods order',1,900,0]]},
  'retail-purchase-order': {tool:'purchase', label:'Retail Stock Purchase Order', fields:{business:'Retail Store LLC',client:'Wholesale Supplier',property:'Store warehouse address',method:'Net 30 days',notes:'Products must match approved SKUs and packaging.'}, items:[['Retail inventory batch',50,22,0],['Display materials',5,45,0]]},
  'retail-receipt': {tool:'receipt', label:'Retail Payment Receipt', fields:{business:'Retail Store',client:'Customer',method:'Card payment',notes:'Payment received in full. Thank you.'}, items:[['Retail purchase',1,150,0]]},
  'service-receipt': {tool:'receipt', label:'Service Payment Receipt', fields:{business:'Professional Services',client:'Customer',method:'Bank transfer received',notes:'This receipt confirms full payment.'}, items:[['Professional service payment',1,500,0]]},
  'landlord-rent-receipt': {tool:'rent', label:'Monthly Rent Receipt', fields:{business:'Property Management',client:'Tenant Name',property:'Rental property address',period:'Current rental month',method:'Bank transfer received',notes:'Monthly rent received in full.'}, items:[['Monthly rent',1,2500,0]]},
  'goods-delivery-note': {tool:'delivery', label:'Goods Delivery Note', fields:{business:'Distribution Company',client:'Receiving Customer',property:'Customer delivery address',method:'Received in good condition',notes:'Please report shortages within 24 hours.'}, items:[['Delivered product batch',10,0,0]]},
  'export-proforma': {tool:'proforma', label:'Export Proforma Invoice', fields:{business:'Export Trading Company',client:'International Buyer',property:'Shipment and Incoterms reference',method:'Advance bank transfer',notes:'Proforma invoice for customs and payment preparation only.'}, items:[['Export goods',100,18,0],['Freight estimate',1,850,0]]},
  'return-credit-note': {tool:'credit', label:'Returned Goods Credit Note', fields:{business:'Supplier Company',client:'Customer Company',property:'Original invoice and return reference',method:'Credit applied to customer account',notes:'Issued for accepted returned goods.'}, items:[['Returned products',5,40,0]]},
  'underbilling-debit-note': {tool:'debit', label:'Underbilling Debit Note', fields:{business:'Service Provider',client:'Customer Company',property:'Original invoice reference',method:'Amount due with next payment',notes:'Additional amount due following billing correction.'}, items:[['Previously omitted service charge',1,350,0]]},
  'standard-invoice': {tool:'invoice', label:'Standard Business Invoice', fields:{business:'Your Company LLC',client:'Customer Company',method:'Payment due within 30 days',notes:'Thank you for your business.'}, items:[['Business service',1,1000,0]]}
};
window.DocCraftTemplates = CATALOG;
function setValue(id,value){ const el=document.getElementById(id); if(el && value !== undefined){ el.value=value; el.dispatchEvent(new Event('input',{bubbles:true})); } }
function clearItems(){ const wrap=document.getElementById('items'); if(wrap) wrap.innerHTML=''; }
function applyTemplate(key, announce=true){
  const tpl=CATALOG[key]; if(!tpl) return false;
  const current=document.body.dataset.tool;
  if(current && tpl.tool !== current){ location.href=`/${tpl.tool==='purchase'?'purchase-order-generator':tpl.tool==='rent'?'rent-receipt-generator':tpl.tool==='delivery'?'delivery-note-generator':tpl.tool==='estimate'?'estimate-generator':tpl.tool==='proforma'?'proforma-invoice-generator':tpl.tool==='credit'?'credit-note-generator':tpl.tool==='debit'?'debit-note-generator':tpl.tool+'-generator'}/?template=${encodeURIComponent(key)}`; return true;
  }
  Object.entries(tpl.fields||{}).forEach(([id,value])=>setValue(id,value));
  if(Array.isArray(tpl.items) && window.DocCraftDocument){ clearItems(); tpl.items.forEach(item=>window.DocCraftDocument.addItem(...item)); }
  window.DocCraftDocument?.renderDoc?.();
  try{ localStorage.setItem('doccraft:last-template',key); }catch(e){}
  if(announce){
    const msg=`${tpl.label} loaded. Replace the example details with your own.`;
    if(window.DocCraftToast) window.DocCraftToast(msg,'success');
    const box=document.getElementById('docStatus'); if(box) box.innerHTML=`<div class="success-state">✅ ${msg}</div>`;
  }
  return true;
}
function init(){
  document.querySelectorAll('[data-template-key]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();applyTemplate(btn.dataset.templateKey);}));
  const key=new URLSearchParams(location.search).get('template');
  if(key) setTimeout(()=>applyTemplate(key),80);
}
window.DocCraftTemplateLibrary={catalog:CATALOG,apply:applyTemplate};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
