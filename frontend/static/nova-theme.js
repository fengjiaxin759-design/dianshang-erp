/* Presentation-only layer. Business requests and transitions remain in app.js. */
const NOVA_ICON_PATHS = {
  home:'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  product:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5"/>',
  sales:'<path d="M4 8h16l-1 13H5L4 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
  fba:'<path d="m21 3-6 18-4-8-8-4L21 3ZM11 13 21 3"/>',
  purchase:'<path d="M3 3h2l3 13h11l2-9H6"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
  warehouse:'<path d="m3 9 9-6 9 6v12H3V9Z"/><path d="M7 21V11h10v10M7 15h10M7 18h10"/>',
  logistics:'<path d="M3 5h11v12H3zM14 9h4l3 4v4h-7"/><circle cx="7" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>',
  ads:'<path d="m3 9 18-6v16L3 13V9ZM7 14l2 7h4l-2-6M21 8l2-1M21 14l2 1"/>',
  service:'<path d="M4 13v-1a8 8 0 0 1 16 0v1M4 12H3v7h4v-7H4ZM20 12h1v7h-4v-7h3ZM20 19c0 2-3 3-7 3"/>',
  finance:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 13h5v4h-5v-4Z"/><circle cx="17.5" cy="15" r=".5"/>',
  statistics:'<path d="M4 21V10h4v11M10 21V3h4v18M16 21V7h4v14M2 21h20"/>',
  bi:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  tools:'<path d="m14 6 4 4 4-4a7 7 0 0 1-9 9L6 22l-4-4 7-7a7 7 0 0 1 9-9l-4 4Z"/>',
  settings:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 3h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-3H9Z"/><circle cx="12" cy="12" r="3"/>',
  report:'<path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h5"/>',
  arrow:'<path d="M5 12h14M14 7l5 5-5 5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 17h3"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  money:'<circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
function novaIcon(name){return '<svg class="nova-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(NOVA_ICON_PATHS[name]||NOVA_ICON_PATHS.home)+'</svg>';}

renderRail = function(){
  $('#module-nav').innerHTML=MODULES.map(module=>'<button data-module="'+module.id+'" title="'+esc(module.title)+'"><i>'+novaIcon(module.id)+'</i><span>'+esc(module.title)+'</span><span class="rail-chevron" aria-hidden="true">›</span></button>').join('');
  document.querySelectorAll('.module-rail [data-module]').forEach(button=>button.classList.toggle('active',button.dataset.module===state.module));
  $('#nova-home').classList.toggle('active',state.module==='home');
  $('#nova-home').setAttribute('aria-current',state.module==='home'?'page':'false');
};
$('#nova-home .nova-home-icon').innerHTML=novaIcon('home');
$('#nova-home').addEventListener('click',()=>selectPage('dashboard'));
renderRail();

function novaTrend(trend){
  const maximum=Math.max(1,...trend.map(row=>Number(row.amount)||0));
  const points=trend.map((row,index)=>[18+index/Math.max(1,trend.length-1)*744,190-(Number(row.amount)||0)/maximum*152]);
  let path=points.length?'M'+points[0].join(','):'';
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],middle=(a[0]+b[0])/2;path+=' C'+middle+','+a[1]+' '+middle+','+b[1]+' '+b.join(',');}
  const area=points.length?path+' L'+points.at(-1)[0]+',210 L'+points[0][0]+',210 Z':'';
  const dots=points.map((p,index)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="white" stroke="#6b5ce7" stroke-width="2"><title>'+esc(trend[index].stat_date)+' · USD '+esc(trend[index].amount)+'</title></circle>').join('');
  return '<div class="nova-chart"><div class="nova-chart-axis"><span>'+money(maximum,'USD')+'</span><span>'+money(maximum/2,'USD')+'</span><span>0</span></div><div class="nova-chart-plot"><svg role="img" aria-label="近10天USD净销售趋势" viewBox="0 0 780 230" preserveAspectRatio="none"><defs><linearGradient id="nova-sales-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7b6def" stop-opacity=".23"/><stop offset="100%" stop-color="#7b6def" stop-opacity=".015"/></linearGradient></defs><path d="M0 38H780M0 114H780M0 190H780" stroke="#e9eaf3" stroke-dasharray="4 5" fill="none"/><path d="'+area+'" fill="url(#nova-sales-area)"/><path d="'+path+'" stroke="#6b5ce7" stroke-width="3" fill="none"/>'+dots+'</svg><div class="nova-chart-dates">'+trend.map(row=>'<span>'+esc(row.stat_date.slice(5))+'</span>').join('')+'</div></div></div>';
}

renderDashboard = async function(){
  if(state.activeRequest)state.activeRequest.abort();
  const controller=new AbortController();state.activeRequest=controller;
  $('#workspace').innerHTML='<div class="loading"><i></i>正在汇总经营数据…</div>';
  try{
    const data=await api('/api/v1/dashboard',{signal:controller.signal});
    if(controller.signal.aborted||state.activeRequest!==controller)return;
    const c=data.cards;
    const metrics=[
      ['本月净销售额',money(c.sales_amount,'USD'),'USD · 排除取消与全额退款','money','featured'],
      ['待处理订单',String(c.pending_sales),'待审核、待发货与部分发货','sales',''],
      ['本地可用库存',Number(c.inventory_local_available).toLocaleString('zh-CN'),'覆盖 '+c.sku_count+' 个 SKU','warehouse',''],
      ['紧急补货',String(c.urgent_replenishment),'P0 / P1 优先建议','product','amber'],
      ['待审批单据',String(c.pending_approvals),'采购与 FBA 审批','check','']
    ];
    const updated=new Date(data.generated_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    const cards=metrics.map(m=>'<article class="nova-metric '+m[4]+'"><div class="nova-metric-label"><span>'+m[0]+'</span><i>'+novaIcon(m[3])+'</i></div><strong>'+esc(m[1])+'</strong><small>'+esc(m[2])+'</small></article>').join('');
    const shortcuts=[['product-add','product','添加产品','维护商品与采购资料'],['purchase-orders','purchase','创建采购单','从需求开始采购流程'],['fba-plans','fba','FBA发货计划','安排配货与运输'],['inbounds','warehouse','新建入库单','登记仓库收货与库存']];
    const tasks=[['purchase-approvals','check','采购 / FBA 审批','等待你审核的业务单据',c.pending_approvals,'violet'],['replenishment','product','补货建议','关注即将不足的商品',c.urgent_replenishment,'amber'],['sales-orders','sales','订单履约','跟进订单审核与发货',c.pending_sales,'mint']];
    $('#workspace').innerHTML='<section class="home-page nova-dashboard"><div class="nova-page-eyebrow">WORKSPACE OVERVIEW</div><div class="home-heading"><div><h1>经营概览<span class="nova-heading-dot"></span></h1><p>'+esc(TODAY)+' · 欢迎回来，'+esc(accessIdentity?.name||'当前账号')+'</p></div><div><button data-page="sales-stat">'+novaIcon('report')+'销售报表与导出</button><button class="primary" data-page="business-analysis">经营分析'+novaIcon('arrow')+'</button></div></div><div class="nova-overview-label"><span>核心经营指标</span><span>'+novaIcon('clock')+'更新于 '+esc(updated)+'</span></div><div class="metric-grid">'+cards+'</div><div class="dashboard-grid nova-primary-grid"><article class="chart-card"><header><div><span class="nova-card-eyebrow">SALES PERFORMANCE</span><b>销售趋势</b><span>近 10 天 · USD 净销售，不减平台费用</span></div><button data-page="sales-stat" class="nova-card-link">查看分析 '+novaIcon('arrow')+'</button></header>'+novaTrend(data.trend)+'<footer class="nova-chart-footer"><span><i></i>净销售额</span><span>以数据库业务记录为准</span></footer></article><article class="todo-card"><header><div><span class="nova-card-eyebrow">YOUR NEXT ACTION</span><b>待办事项</b><span>把需要关注的事放在一起</span></div><span class="nova-task-total">'+(Number(c.pending_sales)+Number(c.pending_approvals)+Number(c.urgent_replenishment))+'</span></header>'+tasks.map(t=>'<button data-page="'+t[0]+'"><i class="nova-task-icon '+t[5]+'">'+novaIcon(t[1])+'</i><span><b>'+t[2]+'</b><small>'+t[3]+'</small></span><strong>'+esc(t[4])+'</strong>'+novaIcon('arrow')+'</button>').join('')+'<div class="nova-task-note">'+novaIcon('check')+'有序处理，让每一步都有记录</div></article></div><div class="dashboard-grid lower"><article class="alert-card"><header><div><span class="nova-card-eyebrow">INVENTORY WATCH</span><b>库存预警 <span class="nova-counter">'+data.alerts.length+'</span></b></div><button data-page="inventory" class="nova-card-link">查看全部 '+novaIcon('arrow')+'</button></header><table><thead><tr><th>SKU</th><th>仓库 / 店铺</th><th>可用库存</th><th>状态</th></tr></thead><tbody>'+data.alerts.map(r=>'<tr><td><button class="link nova-sku" data-page="inventory">'+esc(r.sku)+'</button></td><td>'+esc(r.warehouse_name)+'<small class="nova-table-sub">'+esc(r.store_name||'未指定店铺')+'</small></td><td class="nova-quantity">'+esc(r.available)+'</td><td><span class="state warning">低库存</span></td></tr>').join('')+'</tbody></table>'+(data.alerts.length?'':'<div class="nova-empty">当前没有库存预警</div>')+'</article><article class="quick-card"><header><div><span class="nova-card-eyebrow">QUICK ACCESS</span><b>常用操作</b><span>你的下一步，从这里开始</span></div></header><div>'+shortcuts.map(s=>'<button data-page="'+s[0]+'"><i>'+novaIcon(s[1])+'</i><span><b>'+s[2]+'</b><small>'+s[3]+'</small></span>'+novaIcon('arrow')+'</button>').join('')+'</div></article></div><footer class="nova-dashboard-footer"><span>NOVA ERP · 让业务井然有序</span><span>'+novaIcon('calendar')+'经营数据实时读取</span></footer></section>';
  }catch(error){if(controller.signal.aborted||state.activeRequest!==controller)return;$('#workspace').innerHTML='<div class="load-error"><b>经营数据加载失败</b><span>'+esc(error.message)+'</span><button class="primary" data-retry>重新加载</button></div>';}
};
