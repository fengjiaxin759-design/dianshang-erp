/* Local simulated FBA only: no platform API or automatic Amazon receipt. */
function fbaActions(page,row){
 if(['shipping-plans','fba-delivery-orders'].includes(page.resource)&&!row.fba_workflow?.managed)return '<span>历史封存 · 不重放</span>';
 let out='';const button=(action,label)=>'<button class="link" data-fba-action="'+action+'" data-fba-resource="'+page.resource+'" data-id="'+row.id+'">'+label+'</button>';
 if(page.resource==='shipping-plans'){
  if(['未提交','已驳回'].includes(row.approval_status))out+=button('submit','提交FBA审批');
  if(row.approval_status==='已通过')out+=button('create-delivery','生成草稿发货单');
  if(row.approval_status==='已通过'&&row.status_text==='待生成发货单'&&['unallocated','released'].includes(row.fba_workflow?.allocation?.state))out+=button('lock','锁定计划库存');
  if(row.fba_workflow?.allocation?.state==='allocated')out+=button('release','释放计划库存');
 }
 if(page.resource==='fba-delivery-orders'){
  if(['待配货','待发货'].includes(row.status_text)&&row.fba_workflow?.allocation?.state!=='allocated')out+=button('allocate','分配库存');
  if(row.status_text==='待发货'&&row.fba_workflow?.allocation?.state==='allocated')out+=button('release','释放库存');
  if(row.status_text==='待发货')out+=button('dispatch','实际发货并扣库存');
  if(['运输中','部分签收'].includes(row.status_text))out+=button('receive','登记本地签收');
 }
 return out;
}
document.addEventListener('click',async event=>{
 const b=event.target.closest('[data-fba-action]');if(!b)return;
 const resource=b.dataset.fbaResource,action=b.dataset.fbaAction,id=Number(b.dataset.id);
 if(['dispatch','receive'].includes(action)){
  let receiptFields='';
  if(action==='receive'){
   let row;try{row=await api('/api/v1/fba-delivery-orders/'+id);}catch(error){toast(error.message,'error');return;}
   receiptFields='<p>逐SKU填写本次实际签收数量；未签收的行填0。</p>'+row.item_list.map((line,i)=>{const shipped=line.shipped_qty??line.quantity,received=line.received_qty??0,left=shipped-received;return '<label>'+esc(line.sku)+' · 已发 '+shipped+' / 已签 '+received+'<input data-receipt-sku="'+esc(line.sku)+'" name="receipt_qty_'+i+'" type="number" min="0" max="'+left+'" step="1" value="0" required></label>';}).join('')+'<label>签收幂等键<input name="request_key" required maxlength="80" value="'+esc('FBA-RCV-'+id+'-'+Date.now())+'"></label><small>重试使用相同键和逐SKU数量；另一批收货换新键。</small>';
  }
  const d=document.createElement('dialog');d.className='record-dialog';d.innerHTML='<form><header><h2>'+ (action==='dispatch'?'FBA发货':'登记FBA签收')+'</h2></header><div class="record-body">'+(action==='dispatch'?'<label>承运商<input name="carrier" required></label><label>追踪号<input name="tracking_no" required></label>':'<label>本次签收数量<input name="quantity" type="number" min="1" step="1" required></label><label>签收幂等键<input name="request_key" required maxlength="80" value="'+esc('FBA-RCV-'+id+'-'+Date.now())+'"></label><small>重试使用相同键和数量；另一批收货换新键。</small>')+'<p role="alert"></p></div><footer><button type="button" data-fba-close>取消</button><button class="primary" type="submit">确认'+(action==='dispatch'?'发货':'签收')+'</button></footer></form>';
  document.body.appendChild(d);d.showModal();d.querySelector('[data-fba-close]').onclick=()=>{d.close();d.remove();};
  if(action==='receive'){const first=d.querySelector('.record-body');first.innerHTML=''+receiptFields+'<p role="alert"></p>';}
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();let body=Object.fromEntries(new FormData(e.target));if(action==='receive'){const items=[...d.querySelectorAll('[data-receipt-sku]')].map(input=>({sku:input.dataset.receiptSku,quantity:Number(input.value)})).filter(item=>item.quantity>0);body={request_key:body.request_key,quantity:items.reduce((total,item)=>total+item.quantity,0),items};if(!body.quantity){d.querySelector('[role=alert]').textContent='至少填写一个SKU的本次签收数量';return;}}const submit=d.querySelector('[type=submit]');submit.disabled=true;try{await api('/api/v1/workflows/'+resource+'/'+id+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});d.close();d.remove();toast('FBA流程完成');renderPage();}catch(error){d.querySelector('[role=alert]').textContent=error.message;}finally{submit.disabled=false;}};
 }else{b.disabled=true;try{await api('/api/v1/workflows/'+resource+'/'+id+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});toast({lock:'计划库存已锁定',release:'库存已释放',allocate:'库存已分配，可执行实际发货',submit:'已提交FBA审批','create-delivery':'已生成待配货单，请分配库存后发货'}[action]||'FBA流程完成');renderPage();}catch(error){toast(error.message,'error');}finally{b.disabled=false;}}
});
