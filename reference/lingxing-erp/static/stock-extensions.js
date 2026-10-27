/* Local stock controls: immutable ledger + explicit compensations. */
function stockResponsiveTable(headers,rows){
 if(innerWidth>600)return simpleReportTable(headers,rows);
 return rows.map(row=>'<article class="business-panel" style="display:block;margin:10px 0">'+headers.map((h,i)=>'<div style="display:flex;gap:12px;justify-content:space-between;margin:6px 0"><b>'+esc(h)+'</b><span style="overflow-wrap:anywhere;text-align:right">'+esc(row[i])+'</span></div>').join('')+'</article>').join('');
}
async function stockExtensionAction(resource,id,action){
 let payload={ids:[Number(id)]};
 if(action==='reverse'){
  const reason=await erpPrompt('冲销将新增补偿流水并保留原记录；已使用库存须先逆序冲销下游。',{label:'冲销原因'});
  if(reason===null)return;if(reason.trim().length<3||reason.trim().length>500){toast('冲销原因须为3至500字','error');return;}payload.reason=reason.trim();
 }else if(!await erpConfirm('确认接收整单调拨？源仓已扣减的在途量将增加到目的仓；重复点击不重复入账。'))return;
 try{const result=await api('/api/v1/stock/'+resource+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=result.data;
  const message='成功 '+d.success+'，失败 '+d.fail+(d.fail?'：'+d.failList.map(x=>x.id+' '+x.message).join('；'):'；记录和流水已保留');toast(message,d.fail?'error':'');if(d.fail)await erpAlert(message);await loadTable(PAGES[state.page]);
 }catch(e){toast(e.message,'error');}
}
async function stockExtensionView(kind,offset=0){
 $('#detail-dialog').showModal();$('#detail-title').textContent=kind==='balances'?'库存质量分类':'调拨在途与接收';$('#detail-body').innerHTML='<div class="loading">正在读取…</div>';
 try{const d=await api('/api/v1/stock/'+kind+'?limit=50&offset='+offset);const headers=kind==='balances'?['批次','SKU','仓库','总库存','可用','次品','其他不可用（历史未细分）']:['出库单号','源仓','目的仓','状态','在途数量','发出时间','接收时间'];
 const rows=d.items.map(x=>kind==='balances'?[x.batch_no,x.sku,x.warehouse_name,x.quantity,x.available,x.defective,x.unavailable_other]:[x.order_sn,x.warehouse_name,x.destination_name,{in_transit:'在途',received:'已接收',cancelled:'已冲销'}[x.state],x.in_transit_quantity,x.created_at,x.received_at||'—']);
 $('#detail-body').innerHTML='<p>'+ (kind==='balances'?'总库存 = 可用 + 次品 + 其他不可用；不把历史未知不可用量伪装成次品或锁定。':'在途不计入目的仓现存；完整接收后在途归零。整单冲销保留原流水，须先冲销下游。')+'</p>'+stockResponsiveTable(headers,rows)+'<p>共 '+d.total+' 条 · '+(offset+1)+'—'+(offset+d.items.length)+'</p><button data-stock-view="'+kind+'" data-offset="'+Math.max(0,offset-50)+'" '+(offset===0?'disabled':'')+'>上一页</button><button data-stock-view="'+kind+'" data-offset="'+(offset+50)+'" '+(offset+50>=d.total?'disabled':'')+'>下一页</button>';
 }catch(e){$('#detail-body').textContent=e.message;}
}
document.addEventListener('click',async e=>{const action=e.target.closest('[data-stock-extension]');if(action){if(action.disabled)return;action.disabled=true;try{await stockExtensionAction(action.dataset.resource,action.dataset.id,action.dataset.stockExtension);}finally{action.disabled=!accessCan(action.dataset.resource+':action:'+action.dataset.stockExtension);}return;}const view=e.target.closest('[data-stock-view]');if(view){if($('#detail-dialog').open)$('#detail-dialog').close();stockExtensionView(view.dataset.stockView,Number(view.dataset.offset||0));}});
// Add controls after each table redraw; no polling and no mutation of page data.
const stockObserver=new MutationObserver(()=>{
 const page=PAGES[state.page];if(!page)return;
 if(['inventory','inbound-orders','outbound-orders'].includes(page.resource)&&!$('#workspace [data-stock-extension-toolbar]')){
  const bar=document.createElement('div');bar.className='business-panel';bar.dataset.stockExtensionToolbar='1';bar.innerHTML='<b>库存业务：</b><button data-stock-view="balances">库存质量分类</button> <button data-stock-view="transfers">调拨在途与接收</button>';$('#workspace').prepend(bar);
 }
 document.querySelectorAll('[data-stock-confirm]').forEach(b=>{if(b.dataset.extensionReady)return;b.dataset.extensionReady='1';const resource=b.dataset.stockConfirm,id=b.dataset.id;
 const r=document.createElement('button');r.className='link';r.dataset.stockExtension='reverse';r.dataset.resource=resource;r.dataset.id=id;r.textContent='冲销过账';b.parentElement.appendChild(r);
 if(resource==='outbound-orders'){const t=document.createElement('button');t.className='link';t.dataset.stockExtension='receive-transfer';t.dataset.resource=resource;t.dataset.id=id;t.textContent='接收调拨';b.parentElement.appendChild(t);}
 });
 document.querySelectorAll('[data-stock-extension]').forEach(b=>{if(!accessCan(b.dataset.resource+':action:'+b.dataset.stockExtension)){b.disabled=true;b.title='缺少操作权限';}});
});
stockObserver.observe(document.querySelector('#workspace'),{childList:true,subtree:true});
