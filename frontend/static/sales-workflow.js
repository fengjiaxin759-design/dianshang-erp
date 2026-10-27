/* Explicit local payment and per-SKU shipment workflow; never submits to a carrier. */
function salesWorkflowButton(row){return '<button class="link" data-sales-flow="'+row.id+'">收款与发货</button>';}
async function openSalesWorkflow(id){
 const [row,workflow]=await Promise.all([api('/api/v1/sales-orders/'+id),api('/api/v1/sales-workflow/'+id)]),flow=workflow.data;
 let d=document.getElementById('sales-workflow-dialog');if(!d){d=document.createElement('dialog');d.id='sales-workflow-dialog';d.className='record-dialog';document.body.appendChild(d);}
 const locked=['legacy','shipped','cancelled'].includes(flow.state),freeze=flow.state.startsWith('frozen-'),canShip=['paid','partially-shipped'].includes(flow.state),items=flow.remaining_items||[];
 d.innerHTML='<form><header><h2>销售收款与分批发货 · '+esc(row.order_sn)+'</h2><button type="button" data-sales-close aria-label="关闭销售流程">×</button></header><div class="record-body"><p>状态：<strong data-sales-state>'+esc(flow.state)+'</strong> · '+esc(row.currency)+' '+esc(row.amount)+'</p><p>发货仓：'+esc(row.shipping_warehouse||'未填写（请先编辑订单）')+'</p>'+
 (flow.state==='legacy'?'<p>历史订单支付和物流状态只读；请新建独立演练销售单。</p>':'<div class="form-grid"><label>收款参考号<input name="reference" value="'+esc(flow.payment_reference||'')+'" '+(flow.payment_reference?'disabled':'')+'></label><label>订单全额<input name="amount" type="number" step="0.01" value="'+esc(row.amount)+'"></label><label>原币种<input name="currency" value="'+esc(row.currency)+'"></label><label>本批发货参考号<input name="shipment_reference" minlength="3" maxlength="100" placeholder="如 QA-SHIP-001"></label><label>承运商<input name="carrier" maxlength="120" value="'+esc(flow.carrier||'')+'"></label><label>追踪号<input name="tracking_no" maxlength="120" value="'+esc(flow.tracking_no||'')+'"></label></div>')+
 '<h3>逐SKU发货进度</h3><div style="overflow-x:auto"><table style="min-width:620px;width:100%"><thead><tr><th>SKU</th><th>订单量</th><th>累计已发</th><th>待发</th><th>可申请退货</th><th>本次发货</th></tr></thead><tbody>'+items.map((i,n)=>'<tr><td>'+esc(i.sku)+'</td><td>'+i.ordered_qty+'</td><td>'+i.shipped_qty+'</td><td>'+i.quantity+'</td><td>'+i.returnable_qty+'</td><td><input aria-label="本次发货 '+esc(i.sku)+'" data-ship-qty="'+n+'" style="width:80px" type="number" min="0" step="1" max="'+i.quantity+'" value="0" '+(!canShip||!i.quantity?'disabled':'')+'></td></tr>').join('')+'</tbody></table></div>'+
 '<h3>发货历史 / 全部出库链接</h3>'+((flow.shipments||[]).map(s=>'<article><b>'+esc(s.reference)+'</b> · '+esc(s.carrier)+' / '+esc(s.tracking_no)+' · '+esc(s.created_at)+'<p>'+s.item_list.map(i=>esc(i.sku)+' × '+i.quantity).join('；')+'</p><button type="button" data-sales-outbound="'+s.outbound_id+'">查看出库 '+s.outbound_id+' 库存流水</button></article>').join('')||'<p>尚无发货</p>')+'<p role="alert" data-sales-error></p></div><footer>'+
 (flow.state==='unpaid'?'<button type="button" data-sales-action="record-payment">登记本地收款</button>':'')+
 (canShip?'<button type="button" class="primary" data-sales-action="ship">确认本批发货并扣库存</button>':'')+
 (!locked?'<button type="button" data-sales-action="'+(freeze?'unfreeze':'freeze')+'">'+(freeze?'解除冻结':'冻结订单')+'</button>':'')+
 (['unpaid','frozen-unpaid'].includes(flow.state)?'<button type="button" data-sales-action="cancel">取消未收款订单</button>':'')+'<button type="button" data-sales-close>关闭</button></footer></form>';
 d.querySelectorAll('[data-sales-action]').forEach(b=>{if(typeof accessCan==='function'&&!accessCan('sales-orders:action:'+b.dataset.salesAction)){b.disabled=true;b.title='缺少操作权限';}});
 d.onclick=async e=>{
  if(e.target.closest('[data-sales-close]')){d.close();return;}
  const ledger=e.target.closest('[data-sales-outbound]');if(ledger){d.close();await stockLedger('outbound-orders',Number(ledger.dataset.salesOutbound));return;}
  const b=e.target.closest('[data-sales-action]');if(!b)return;
  const action=b.dataset.salesAction,form=d.querySelector('form'),data=Object.fromEntries(new FormData(form));let body={};
  if(action==='record-payment')body={reference:data.reference,amount:data.amount,currency:data.currency};
  if(action==='ship'){
   body={reference:data.shipment_reference,item_list:items.map((i,n)=>({sku:i.sku,quantity:Number(d.querySelector('[data-ship-qty="'+n+'"]').value)})).filter(i=>i.quantity!==0),carrier:data.carrier,tracking_no:data.tracking_no};
   if(!form.reportValidity()||!body.item_list.length){d.querySelector('[data-sales-error]').textContent='至少填写一个SKU的正整数本次发货数量';return;}
  }
  if(b.disabled)return;
  if(!await erpConfirm('确认执行本地销售动作？不会推送真实平台。'))return;
  b.disabled=true;try{const r=await api('/api/v1/sales-workflow/'+id+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});await openSalesWorkflow(id);toast(r.data.reused?'相同凭证已执行，未重复扣库存或记账':'销售动作已执行并更新库存/凭证');await loadTable(PAGES[state.page]);}catch(err){d.querySelector('[data-sales-error]').textContent=err.message;b.disabled=false;}
 };
 d.querySelector('form').onsubmit=e=>e.preventDefault();if(!d.open)d.showModal();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sales-flow]');if(b)openSalesWorkflow(Number(b.dataset.salesFlow)).catch(err=>toast(err.message,'error'));});
