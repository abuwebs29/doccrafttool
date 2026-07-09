const $ = id => document.getElementById(id);
const labels = { invoice: 'Invoice', receipt: 'Receipt', quotation: 'Quotation', rent: 'Rent Receipt', delivery: 'Delivery Note', purchase: 'Purchase Order', estimate: 'Estimate' };
const fileNames = { invoice: 'invoice', receipt: 'receipt', quotation: 'quotation', rent: 'rent-receipt', delivery: 'delivery-note', purchase: 'purchase-order', estimate: 'estimate' };
const pdfLibs = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

function today(){ return new Date().toISOString().slice(0,10); }
function safe(s){ return String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
function money(n,c){ return `${c} ${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function val(id,fb=''){ return ($(id) && $(id).value) || fb; }
function toolType(){ return document.body.dataset.tool || 'invoice'; }
function cleanFilePart(s){ return String(s || '001').replace(/[^a-z0-9-_]/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || '001'; }
function docFileName(ext){ return `${fileNames[toolType()] || 'document'}-${cleanFilePart(val('number','001'))}.${ext}`; }
function loadScript(src){
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if(existing){
      existing.dataset.loaded ? resolve() : existing.addEventListener('load', resolve, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}
async function loadPdfLibs(){
  if(window.html2canvas && window.jspdf) return;
  await pdfLibs.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
}

function addItem(desc='Professional service', qty=1, rate=100, tax=0){
  const wrap = $('items');
  if(!wrap) return;
  const row = document.createElement('div');
  const uid = `item-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  row.className = 'itemrow';
  row.innerHTML = `
    <div class="field desc"><label for="${uid}-desc">Description</label><input id="${uid}-desc" name="item_description[]" class="i-desc" value="${safe(desc)}"></div>
    <div class="field"><label for="${uid}-qty">Qty</label><input id="${uid}-qty" name="item_quantity[]" class="i-qty" type="number" value="${safe(qty)}" min="0" step="0.01" inputmode="decimal"></div>
    <div class="field"><label for="${uid}-rate">Rate</label><input id="${uid}-rate" name="item_rate[]" class="i-rate" type="number" value="${safe(rate)}" min="0" step="0.01" inputmode="decimal"></div>
    <div class="field"><label for="${uid}-tax">Tax %</label><input id="${uid}-tax" name="item_tax[]" class="i-tax" type="number" value="${safe(tax)}" min="0" step="0.01" inputmode="decimal"></div>
    <button class="iconbtn" type="button" data-action="remove-item" aria-label="Remove line item" title="Remove item">✕</button>`;
  row.querySelector('[data-action="remove-item"]').addEventListener('click', () => { row.remove(); renderDoc(); });
  row.querySelectorAll('input').forEach(i => i.addEventListener('input', renderDoc));
  wrap.appendChild(row);
  renderDoc();
}

function getItems(){
  return [...document.querySelectorAll('.itemrow')].map(r => {
    const desc = r.querySelector('.i-desc').value || 'Item';
    const qty = parseFloat(r.querySelector('.i-qty').value) || 0;
    const rate = parseFloat(r.querySelector('.i-rate').value) || 0;
    const tax = parseFloat(r.querySelector('.i-tax').value) || 0;
    const sub = qty * rate;
    const taxAmt = sub * tax / 100;
    return { desc, qty, rate, tax, sub, taxAmt, total: sub + taxAmt };
  });
}

function getTotals(){
  const items = getItems();
  const sub = items.reduce((a,b)=>a+b.sub,0);
  const tax = items.reduce((a,b)=>a+b.taxAmt,0);
  const disc = parseFloat(val('discount','0')) || 0;
  const grand = Math.max(0, sub + tax - disc);
  return { items, sub, tax, disc, grand };
}

function renderDoc(){
  const type = toolType();
  const title = labels[type] || 'Document';
  const cur = val('currency','USD');
  const { items, sub, tax, disc, grand } = getTotals();
  let extra = '';
  if(type === 'rent') extra = `<div class="docbox"><b>Property</b>${safe(val('property','Property address'))}<br><b>Rental period</b>${safe(val('period','June 2026'))}</div>`;
  if(type === 'delivery') extra = `<div class="docbox"><b>Delivery details</b>${safe(val('property','Delivery address'))}<br><b>Delivery date</b>${safe(val('due',today()))}</div>`;
  if(type === 'purchase') extra = `<div class="docbox"><b>Supplier / delivery</b>${safe(val('property','Supplier or delivery details'))}<br><b>Required by</b>${safe(val('due',today()))}</div>`;
  if(type === 'estimate') extra = `<div class="docbox"><b>Project details</b>${safe(val('property','Project scope or location'))}<br><b>Valid until</b>${safe(val('due',today()))}</div>`;
  const rows = items.map(i => `<tr><td>${safe(i.desc)}</td><td>${i.qty}</td><td>${money(i.rate,cur)}</td><td>${i.tax}%</td><td>${money(i.total,cur)}</td></tr>`).join('');
  const label = type === 'quotation' ? 'Quoted total' : (type === 'estimate' ? 'Estimated total' : (type === 'purchase' ? 'Order total' : (type === 'receipt' || type === 'rent' ? 'Amount paid' : 'Amount due')));
  const signature = val('signature','Authorized Signature');
  const preview = $('preview');
  if(!preview) return;
  preview.innerHTML = `
    <div class="dochead">
      <div class="brandblock"><div><div class="doctitle">${title}</div><div>${safe(val('business','Your Business'))}</div></div></div>
      <div class="docmeta"><b>No: ${safe(val('number','001'))}</b><br>Date: ${safe(val('date',today()))}<br>${type==='quotation'?'Valid until': type==='receipt'||type==='rent'?'Payment date':'Due'}: ${safe(val('due',today()))}</div>
    </div>
    <div class="docgrid">
      <div class="docbox"><b>From</b>${safe(val('business','Your Business'))}<br>${safe(val('businessEmail','hello@example.com'))}<br>${safe(val('businessAddress','Business address'))}</div>
      <div class="docbox"><b>${type==='receipt'||type==='rent'?'Paid by':'Bill to'}</b>${safe(val('client','Client Name'))}<br>${safe(val('clientEmail','client@example.com'))}<br>${safe(val('clientAddress','Client address'))}</div>
      ${extra}
    </div>
    <div class="table-wrap" role="region" aria-label="${title} line items" tabindex="0"><table class="doctable"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="totals"><div class="totalrow"><span>Subtotal</span><b>${money(sub,cur)}</b></div><div class="totalrow"><span>Tax</span><b>${money(tax,cur)}</b></div><div class="totalrow"><span>Discount</span><b>${money(disc,cur)}</b></div><div class="totalrow grand"><span>${label}</span><span>${money(grand,cur)}</span></div></div>
    <div class="docnotes"><b>Payment / Notes</b><br>${safe(val('method','Bank transfer'))}<br>${safe(val('notes','Thank you for your business.'))}</div>
    <div class="signature"><span>${safe(signature)}</span></div>`;
}

function bindTool(type){
  document.body.dataset.tool = type;
  document.querySelectorAll('input,textarea,select').forEach(e => e.addEventListener('input', renderDoc));
  if($('date') && !$('date').value) $('date').value = today();
  if($('due') && !$('due').value) $('due').value = today();
  if($('items') && !document.querySelector('.itemrow')) addItem(type==='delivery'?'Delivered goods':(type==='purchase'?'Business supplies':(type==='estimate'?'Estimated service':'Professional service')),1,100,0);
  renderDoc();
}

function bindActions(){
  document.querySelectorAll('[data-action]').forEach(button => {
    const action = button.dataset.action;
    if(button.dataset.bound) return;
    button.dataset.bound = 'true';
    if(action === 'add-item') button.addEventListener('click', () => addItem());
    if(action === 'download-pdf') button.addEventListener('click', downloadPDF);
    if(action === 'download-word') button.addEventListener('click', downloadWord);
    if(action === 'download-excel') button.addEventListener('click', downloadExcel);
    if(action === 'print') button.addEventListener('click', printDocument);
  });
}

function initTool(){
  bindActions();
  const type = document.body.dataset.tool;
  if(type) bindTool(type);
}

function exportStyle(){
  return `<style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:0;background:#fff;font-size:14px}.preview{width:100%;max-width:185mm;margin:0 auto;background:#fff}.dochead{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #111827;padding-bottom:18px;margin-bottom:20px}.brandblock{display:flex;gap:14px;align-items:center}.doctitle{font-size:32px;font-weight:800;letter-spacing:0}.docmeta{text-align:right;color:#374151;line-height:1.45}.docgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}.docbox{border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#f9fafb;line-height:1.45}.docbox b{display:block;margin-bottom:6px;color:#111827}.table-wrap{overflow:visible}.doctable{width:100%;border-collapse:collapse;margin:20px 0}.doctable th,.doctable td{border-bottom:1px solid #e5e7eb;padding:11px;text-align:left}.doctable th{background:#f9fafb;text-transform:uppercase;font-size:12px;color:#374151}.totals{margin-left:auto;max-width:340px;border-top:1px solid #e5e7eb;padding-top:14px}.totalrow{display:flex;justify-content:space-between;padding:4px 0}.grand{font-size:20px;font-weight:800;color:#111827}.docnotes{margin-top:20px;background:#f9fafb;border-radius:12px;padding:14px;line-height:1.45}.signature{margin-top:50px;text-align:right}.signature span{display:inline-block;min-width:220px;border-top:1px solid #111827;padding-top:8px;font-weight:700}@media(max-width:700px){.dochead,.docgrid{display:block}.docmeta{text-align:left;margin-top:12px}.docbox{margin-bottom:12px}}
  </style>`;
}

function createExportNode(){
  const source = $('preview');
  if(!source) return null;
  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-10000px';
  holder.style.top = '0';
  holder.style.width = '794px';
  holder.style.background = '#fff';
  holder.style.padding = '0';
  holder.style.zIndex = '-1';
  holder.innerHTML = `<div class="preview export-preview">${source.innerHTML}</div>`;
  const style = document.createElement('style');
  style.textContent = `
    .export-preview{width:760px!important;max-width:760px!important;min-height:0!important;background:#fff!important;border:0!important;box-shadow:none!important;position:static!important;top:auto!important;padding:26px!important;color:#111827!important;font-family:Arial,Helvetica,sans-serif!important;font-size:14px!important;line-height:1.35!important}
    .export-preview .dochead{display:flex!important;justify-content:space-between!important;gap:18px!important;border-bottom:2px solid #111827!important;padding-bottom:14px!important;margin-bottom:16px!important}
    .export-preview .doctitle{font-size:28px!important;font-weight:800!important;letter-spacing:0!important}
    .export-preview .docmeta{text-align:right!important;color:#374151!important;line-height:1.35!important}
    .export-preview .docgrid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important;margin:16px 0!important}
    .export-preview .docbox{border:1px solid #e5e7eb!important;border-radius:10px!important;padding:10px!important;background:#f9fafb!important;line-height:1.35!important}
    .export-preview .docbox b{display:block!important;margin-bottom:5px!important;color:#111827!important}
    .export-preview .table-wrap{overflow:visible!important}
    .export-preview .doctable{width:100%!important;border-collapse:collapse!important;margin:16px 0!important;font-size:13px!important}
    .export-preview .doctable th,.export-preview .doctable td{border-bottom:1px solid #e5e7eb!important;padding:8px!important;text-align:left!important}
    .export-preview .doctable th{background:#f9fafb!important;text-transform:uppercase!important;font-size:11px!important;color:#374151!important}
    .export-preview .totals{margin-left:auto!important;max-width:310px!important;border-top:1px solid #e5e7eb!important;padding-top:10px!important;display:grid!important;gap:4px!important}
    .export-preview .totalrow{display:flex!important;justify-content:space-between!important;padding:2px 0!important;color:#334155!important}
    .export-preview .grand{font-size:18px!important;font-weight:800!important;color:#111827!important}
    .export-preview .docnotes{margin-top:14px!important;background:#f9fafb!important;border-radius:10px!important;padding:10px!important;line-height:1.35!important;color:#374151!important}
    .export-preview .signature{margin-top:32px!important;text-align:right!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .export-preview .signature span{display:inline-block!important;min-width:210px!important;border-top:1px solid #111827!important;padding-top:7px!important;font-weight:700!important;color:#334155!important}
  `;
  holder.prepend(style);
  document.body.appendChild(holder);
  return holder;
}

async function downloadPDF(){
  const btns = document.querySelectorAll('button');
  btns.forEach(b=>b.disabled=true);
  let holder = null;
  try{
    await loadPdfLibs();
    holder = createExportNode();
    const element = holder && holder.querySelector('.export-preview');
    if(!element) return;
    await new Promise(r => setTimeout(r, 80));
    const canvas = await html2canvas(element, {
      scale: 1.45,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 820
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.88);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','mm','a4', true);
    const pageWidth = 210, pageHeight = 297, margin = 10;
    const usableW = pageWidth - margin * 2;
    const usableH = pageHeight - margin * 2;
    const imgW = usableW;
    const imgH = canvas.height * imgW / canvas.width;
    const x = (pageWidth - imgW) / 2;
    let y = margin;
    let remaining = imgH;
    pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
    remaining -= usableH;
    while(remaining > 0){
      pdf.addPage();
      y = margin - (imgH - remaining);
      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH, undefined, 'FAST');
      remaining -= usableH;
    }
    pdf.save(docFileName('pdf'));
  }catch(e){
    alert('PDF download failed. Please use Print / Save as PDF.');
    console.error(e);
  }finally{
    if(holder) holder.remove();
    btns.forEach(b=>b.disabled=false);
  }
}

function downloadWord(){
  const content = $('preview')?.outerHTML || '';
  const html = `<!doctype html><html><head><meta charset="utf-8">${exportStyle()}</head><body>${content}</body></html>`;
  const blob = new Blob(['\ufeff', html], {type:'application/msword;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = docFileName('doc');
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function downloadExcel(){
  const type = toolType();
  const cur = val('currency','USD');
  const title = labels[type] || 'Document';
  const { items, sub, tax, disc, grand } = getTotals();
  const itemRows = items.map(i => `
    <tr>
      <td>${safe(i.desc)}</td>
      <td style="mso-number-format:'0.00'">${i.qty}</td>
      <td style="mso-number-format:'0.00'">${i.rate.toFixed(2)}</td>
      <td style="mso-number-format:'0.00%'">${(i.tax/100).toFixed(4)}</td>
      <td style="mso-number-format:'0.00'">${i.total.toFixed(2)}</td>
    </tr>`).join('');
  const extraRows = type === 'rent' ? `<tr><td>Property</td><td colspan="4">${safe(val('property','Property address'))}</td></tr><tr><td>Rental period</td><td colspan="4">${safe(val('period','June 2026'))}</td></tr>` : type === 'delivery' ? `<tr><td>Delivery address</td><td colspan="4">${safe(val('property','Delivery address'))}</td></tr>` : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial}td,th{border:1px solid #999;padding:8px}th{background:#eef2ff}.title{font-size:20px;font-weight:bold;background:#dbeafe}.total{font-weight:bold;background:#f8fafc}</style></head><body><table>
    <tr><th class="title" colspan="5">${safe(title)} ${safe(val('number','001'))}</th></tr>
    <tr><td>Business</td><td colspan="4">${safe(val('business','Your Business'))}</td></tr>
    <tr><td>Business Email</td><td colspan="4">${safe(val('businessEmail','hello@example.com'))}</td></tr>
    <tr><td>Client / Payer</td><td colspan="4">${safe(val('client','Client Name'))}</td></tr>
    <tr><td>Client Email</td><td colspan="4">${safe(val('clientEmail','client@example.com'))}</td></tr>
    <tr><td>Date</td><td colspan="4">${safe(val('date',today()))}</td></tr>
    <tr><td>Due / Validity / Payment Date</td><td colspan="4">${safe(val('due',today()))}</td></tr>
    <tr><td>Currency</td><td colspan="4">${safe(cur)}</td></tr>
    ${extraRows}
    <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Tax %</th><th>Total</th></tr>
    ${itemRows}
    <tr><td colspan="4">Subtotal</td><td style="mso-number-format:'0.00'">${sub.toFixed(2)}</td></tr>
    <tr><td colspan="4">Tax</td><td style="mso-number-format:'0.00'">${tax.toFixed(2)}</td></tr>
    <tr><td colspan="4">Discount</td><td style="mso-number-format:'0.00'">${disc.toFixed(2)}</td></tr>
    <tr class="total"><td colspan="4">Grand Total (${safe(cur)})</td><td style="mso-number-format:'0.00'">${grand.toFixed(2)}</td></tr>
    <tr><td>Payment / Notes</td><td colspan="4">${safe(val('method','Bank transfer'))} - ${safe(val('notes','Thank you for your business.'))}</td></tr>
  </table></body></html>`;
  const blob = new Blob(['\ufeff', html], {type:'application/vnd.ms-excel;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = docFileName('xls');
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function printDocument(){
  const content = $('preview')?.outerHTML || '';
  const w = window.open('', '_blank', 'width=900,height=700');
  if(!w){ window.print(); return; }
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safe(labels[toolType()] || 'Document')}</title>${exportStyle()}</head><body>${content}<script>window.onload=function(){setTimeout(function(){window.print();},250)}<\/script></body></html>`);
  w.document.close();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initTool);
}else{
  initTool();
}
