// Presentation smoke test: no browser, no database writes.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const elements = new Map();
function element(selector) {
  if (!elements.has(selector)) elements.set(selector, {
    innerHTML: '', classList: {toggle(){}}, setAttribute(){}, addEventListener(){}
  });
  return elements.get(selector);
}
const calls=[];
const context={
  $:element, document:{querySelectorAll:()=>[]},
  MODULES:[{id:'product',title:'产品'},{id:'warehouse',title:'仓库'}],
  state:{module:'home'}, selectPage(){}, AbortController,
  esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  money:(value,currency)=>currency+' '+Number(value).toFixed(2),
  TODAY:'2026年10月14日', accessIdentity:{name:'测试账号'},
  api:async route=>{
    calls.push(route);
    return {cards:{sales_amount:125.5,pending_sales:3,inventory_local_available:450,sku_count:7,urgent_replenishment:2,pending_approvals:1},
      trend:[{stat_date:'2026-10-13',amount:0},{stat_date:'2026-10-14',amount:125.5}],
      alerts:[{sku:'SKU<test>',warehouse_name:'华东仓',store_name:'测试店铺',available:3}],generated_at:'2026-10-14T08:00:00Z'};
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('frontend/static/nova-theme.js','utf8'),context);
(async()=>{
  await context.renderDashboard();
  const html=element('#workspace').innerHTML;
  assert.deepEqual(calls,['/api/v1/dashboard']);
  assert.equal((html.match(/class="nova-metric /g)||[]).length,5);
  assert.ok(html.includes('USD 125.50'));
  assert.ok(html.includes('SKU&lt;test>'));
  for(const route of ['product-add','sales-orders','sales-stat','purchase-orders','fba-plans','inbounds','inventory']) assert.ok(html.includes('data-page="'+route+'"'));
  assert.ok(!/NaN|undefined/.test(html));
  assert.ok(element('#module-nav').innerHTML.includes('data-module="warehouse"'));
  assert.ok(!/NaN|undefined/.test(context.novaTrend([])));
  console.log('NOVA presentation smoke test passed (data binding, escaping, navigation, empty chart).');
})().catch(error=>{console.error(error);process.exitCode=1;});
