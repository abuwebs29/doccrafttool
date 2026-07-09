
const byId = id => document.getElementById(id);
const num = id => parseFloat((byId(id)?.value || '0').replace(/,/g,'')) || 0;
const fmt = (n, symbol='') => `${symbol}${Number(n || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
function setText(id, value){ const el = byId(id); if(el) el.textContent = value; }
function calcType(){ return document.body.dataset.calc || ''; }
function calculate(){
  const type = calcType();
  const currency = byId('currency')?.value || '$';
  if(type === 'vat'){
    const amount = num('amount'), rate = num('rate'), mode = byId('mode')?.value || 'add';
    const vat = mode === 'remove' ? amount - (amount/(1+rate/100)) : amount * rate / 100;
    const net = mode === 'remove' ? amount - vat : amount;
    const gross = mode === 'remove' ? amount : amount + vat;
    setText('mainResult', fmt(gross, currency)); setText('netValue', fmt(net, currency)); setText('taxValue', fmt(vat, currency)); setText('grossValue', fmt(gross, currency));
  }
  if(type === 'profit'){
    const revenue = num('revenue'), cost = num('cost');
    const profit = revenue - cost; const margin = revenue ? (profit/revenue)*100 : 0; const markup = cost ? (profit/cost)*100 : 0;
    setText('mainResult', `${margin.toFixed(2)}%`); setText('profitValue', fmt(profit, currency)); setText('marginValue', `${margin.toFixed(2)}%`); setText('markupValue', `${markup.toFixed(2)}%`);
  }
  if(type === 'roi'){
    const gain = num('gain'), investment = num('investment');
    const net = gain - investment; const roi = investment ? (net/investment)*100 : 0; const multiple = investment ? gain/investment : 0;
    setText('mainResult', `${roi.toFixed(2)}%`); setText('netReturn', fmt(net, currency)); setText('roiValue', `${roi.toFixed(2)}%`); setText('multipleValue', `${multiple.toFixed(2)}x`);
  }
  if(type === 'discount'){
    const price = num('price'), discount = num('discount');
    const saved = price * discount / 100; const final = Math.max(0, price - saved);
    setText('mainResult', fmt(final, currency)); setText('originalValue', fmt(price, currency)); setText('savedValue', fmt(saved, currency)); setText('finalValue', fmt(final, currency));
  }
  if(type === 'break-even'){
    const fixed = num('fixed'), price = num('unitPrice'), variable = num('variableCost');
    const contribution = price - variable; const units = contribution > 0 ? fixed / contribution : 0; const revenue = units * price;
    setText('mainResult', contribution > 0 ? `${Math.ceil(units).toLocaleString()} units` : 'Check inputs'); setText('contributionValue', fmt(contribution, currency)); setText('unitsValue', contribution > 0 ? Math.ceil(units).toLocaleString() : '0'); setText('revenueValue', fmt(revenue, currency));
  }
}
function resetCalc(){ document.querySelectorAll('input').forEach(i => i.value = i.defaultValue || ''); document.querySelectorAll('select').forEach(s => s.selectedIndex = 0); calculate(); }
function initCalc(){ if(!calcType()) return; document.querySelectorAll('input,select').forEach(el => el.addEventListener('input', calculate)); document.querySelectorAll('[data-action="reset-calc"]').forEach(btn => btn.addEventListener('click', resetCalc)); calculate(); }
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCalc); else initCalc();
