/* Full-page record navigation; existing domain operations retain their API contracts. */
function erpConfirm(message){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='erp-confirm';
    dialog.innerHTML='<form method="dialog"><header><h2>确认操作</h2><button value="cancel" aria-label="关闭">×</button></header><p>'+esc(message)+'</p><footer><button value="cancel">取消</button><button value="confirm" class="primary">确认</button></footer></form>';
    dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='confirm';dialog.remove();resolve(confirmed);},{once:true});
    document.body.append(dialog);dialog.showModal();dialog.querySelector('footer [value="cancel"]').focus();
  });
}
function erpPrompt(message,{label='原因',minLength=3,maxLength=500}={}){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='erp-confirm';
    dialog.innerHTML='<form method="dialog"><header><h2>'+esc(label)+'</h2><button value="cancel" formnovalidate aria-label="关闭">×</button></header><p>'+esc(message)+'</p><label class="erp-prompt-field">'+esc(label)+'<textarea name="reason" required minlength="'+minLength+'" maxlength="'+maxLength+'"></textarea></label><footer><button value="cancel" formnovalidate>取消</button><button value="confirm" class="primary">确认</button></footer></form>';
    const input=dialog.querySelector('textarea');
    dialog.querySelector('form').addEventListener('submit',event=>{
      if(event.submitter?.value!=='confirm')return;
      input.setCustomValidity(input.value.trim().length<minLength?'请填写至少'+minLength+'字的'+label:'');
      if(!input.reportValidity())event.preventDefault();
    });
    input.oninput=()=>input.setCustomValidity('');
    dialog.addEventListener('close',()=>{const value=dialog.returnValue==='confirm'?input.value.trim():null;dialog.remove();resolve(value);},{once:true});
    document.body.append(dialog);dialog.showModal();input.focus();
  });
}
function erpAlert(message){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='erp-confirm';
    dialog.innerHTML='<form method="dialog"><header><h2>操作结果</h2></header><p role="alert">'+esc(message)+'</p><footer><button class="primary">关闭</button></footer></form>';
    dialog.addEventListener('close',()=>{dialog.remove();resolve();},{once:true});document.body.append(dialog);dialog.showModal();
  });
}
const DocumentWorkspace = (() => {
  function snapshot() {
    state.listSnapshots ||= {};
    if(!state.detailRecordId)state.listSnapshots[state.page]=pageHistoryState().list;
  }
  function tabsHtml() {
    return (state.documentTabs||[]).map(tab=>'<button class="'+(state.page===tab.page&&state.detailRecordId===tab.id?'active':'')+'" data-document-page="'+esc(tab.page)+'" data-document-id="'+tab.id+'" title="'+esc(tab.label)+'">'+esc(tab.title)+' · '+esc(tab.label)+'<span role="button" tabindex="0" aria-label="关闭 '+esc(tab.label)+'" data-document-close="'+esc(tab.key)+'">×</span></button>').join('');
  }
  function tabClick(event) {
    const close=event.target.closest('[data-document-close]');
    if(close){const tab=state.documentTabs.find(t=>t.key===close.dataset.documentClose);state.documentTabs=state.documentTabs.filter(t=>t!==tab);if(tab&&state.page===tab.page&&state.detailRecordId===tab.id)back();else renderTabs();return true;}
    const button=event.target.closest('[data-document-id]');
    if(button){selectPage(button.dataset.documentPage,{recordId:Number(button.dataset.documentId),restore:state.listSnapshots?.[button.dataset.documentPage]});return true;}
    return false;
  }
  function back(){selectPage(state.page,{restore:state.listSnapshots?.[state.page]});}
  function activateTab(id,focus=false){
    const root=$('#workspace'),target=root.querySelector('[data-bw-tab="'+id+'"]');if(!target)return;
    state.detailTab=id;
    root.querySelectorAll('[data-bw-tab]').forEach(b=>{const active=b===target;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
    root.querySelectorAll('[role="tabpanel"]').forEach(p=>{p.hidden=p.id!=='bw-panel-'+id;});
    if(focus)target.focus();
  }
  function render(page,record,context){
    const scroll=$('#workspace').scrollTop;
    $('#workspace').innerHTML=BusinessWorkspace.render(page,record,context,{label:key=>detailLabel(page.resource,key),statusClass,activeTab:state.detailTab,purchaseSettlementButtons,salesWorkflowButton,listingDimensionButton,receivingButtons,fbaActions});
    $('#workspace').scrollTop=scroll;
    accessApplyPermissions();
  }
  async function open(row,resourceOverride){
    if(!row?.id)return;
    const resource=resourceOverride||PAGES[state.page].resource;
    const page=PAGES[state.page]?.resource===resource?PAGES[state.page]:Object.values(PAGES).find(p=>p.resource===resource&&!p.aliasOf);
    if(!page)return;
    if(page.id!==state.page)return selectPage(page.id,{recordId:Number(row.id)});
    const same=state.detailRecordId===Number(row.id);
    snapshot();
    if(!same){rememberPageHistory();state.detailTab=null;}
    if(state.activeRequest)state.activeRequest.abort();clearTimeout(state.searchTimer);
    if(state.detailRequest)state.detailRequest.abort();
    state.detailRecordId=Number(row.id);state.detailRecord=null;
    if(!same)history.pushState(pageHistoryState(),'',location.pathname+location.search+BusinessWorkspace.route(page.id,row.id));
    const controller=new AbortController();state.detailRequest=controller;
    const current=()=>state.detailRequest===controller&&!controller.signal.aborted&&state.page===page.id&&state.detailRecordId===Number(row.id);
    const key=resource+':'+row.id;
    state.documentTabs ||= [];
    let tab=state.documentTabs.find(t=>t.key===key);
    if(!tab){tab={key,page:page.id,id:Number(row.id),title:page.title,label:String(row.id)};state.documentTabs.push(tab);}
    renderTabs();
    $('#workspace').removeAttribute('aria-busy');
    $('#workspace').innerHTML='<div class="loading" role="status"><i></i>正在读取单据…</div>';
    let record;
    try{
      // Settle background reads even when the primary record fails or navigation aborts.
      const settle=promise=>promise.then(value=>({value}),error=>({error}));
      const recordRead=api('/api/v1/'+encodeURIComponent(resource)+'/'+row.id,{signal:controller.signal});
      const contextRead=settle(api('/api/v1/record-context/'+encodeURIComponent(resource)+'/'+row.id,{signal:controller.signal}));
      const dimensionsRead=resource==='listings'&&!accessScoped()
        ?settle(api('/api/v1/listing-dimensions/'+row.id,{signal:controller.signal})):null;
      record=await recordRead;
      if(!current())return;
      state.detailRecord=record;tab.label=BusinessWorkspace.documentNumber(page,record);renderTabs();document.title=tab.label+' · '+page.title+' · ERP';
      render(page,record,{items:record.item_list||[],pending:true});
      const contextResult=await contextRead;
      if(!current())return;
      if(contextResult.error)throw contextResult.error;
      const context=contextResult.value;
      if(dimensionsRead){
        const dimensions=await dimensionsRead;
        if(!current())return;
        if(dimensions.error)context.dimensionError=dimensions.error.message;
        else context.listingDimensions=dimensions.value.data;
      }
      if(!current())return;
      state.context=context;render(page,record,context);
      if(!same)$('#workspace').querySelector('h1')?.focus({preventScroll:true});
    }catch(error){
      if(!current())return;
      if(record)render(page,record,{items:record.item_list||[],failed:true,error:error.message});
      else $('#workspace').innerHTML='<div class="load-error" role="alert"><b>单据加载失败</b><span>'+esc(error.message)+'</span><button data-bw-refresh>重新加载</button><button data-bw-back>返回列表</button></div>';
    }
  }
  function click(event){
    if(event.target.closest('[data-create-receipt]')){createReceipt().catch(error=>toast(error.message,'error'));return true;}
    if(event.target.closest('[data-bw-back]')){back();return true;}
    if(event.target.closest('[data-bw-refresh]')){open({id:state.detailRecordId});return true;}
    if(event.target.closest('[data-bw-print]')){window.print();return true;}
    const tab=event.target.closest('[data-bw-tab]');if(tab){activateTab(tab.dataset.bwTab);return true;}
    return false;
  }
  function input(event){
    if(!event.target.hasAttribute('data-bw-line-filter'))return;
    const q=event.target.value.trim().toLocaleLowerCase(),section=event.target.closest('.bw-items-section');let count=0;
    section.querySelectorAll('tbody tr').forEach(row=>{row.hidden=!row.textContent.toLocaleLowerCase().includes(q);if(!row.hidden)count++;});
    section.querySelector('[data-bw-line-count]').textContent=count;
    section.querySelector('.bw-line-empty').hidden=count>0;
  }
  async function createReceipt(){
    if(!state.detailRecord||!accessCan('supplier-deliveries:write'))throw Error('无收货单新增权限');
    const purchase=state.detailRecord,items=structuredClone(purchase.item_list||[]);
    if(!items.length)throw Error('采购单缺少商品明细，请先补全采购资料');
    const sourcePage=state.page,sourceId=state.detailRecordId;
    let notifications=[],offset=0;
    while(true){
      const data=await api('/api/v1/supplier-deliveries?'+new URLSearchParams({field:'purchase_order_sn',q:purchase.order_sn,match:'exact',limit:'200',offset:String(offset)}));
      notifications.push(...data.items);offset+=data.items.length;
      if(offset>=data.total)break;if(!data.items.length||offset>10000)throw Error('收货记录读取不完整，请先核对关联单据');
    }
    const used=new Map();
    for(const receipt of notifications){
      let lines=receipt.item_list||[];
      if(!lines.length&&items.length===1)lines=[{sku:items[0].sku,quantity:receipt.total_qty}];
      if(!lines.length)throw Error('历史收货单缺少逐 SKU 明细，无法确定剩余通知量');
      for(const line of lines)used.set(line.sku,(used.get(line.sku)||0)+Number(line.quantity||0));
    }
    const remaining=items.map(line=>({...line,quantity:Math.max(0,Number(line.quantity)-(used.get(line.sku)||0))})).filter(line=>line.quantity>0);
    if(!remaining.length)throw Error('采购数量已全部生成收货通知，请查看关联收货单');
    if(state.page!==sourcePage||state.detailRecordId!==sourceId)return;
    await selectPage('receiving');if(state.page!=='receiving'||state.detailRecordId)return;
    openRecord({delivery_no:'CR-'+new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,17),purchase_order_sn:purchase.order_sn,supplier_name:purchase.supplier_name,warehouse_name:purchase.warehouse_name,inspection_type:purchase.qc_type||'仓库质检',total_qty:remaining.reduce((sum,item)=>sum+item.quantity,0),item_list:remaining,logistics_provider:purchase.logistics_provider||'',tracking_no:purchase.tracking_no||''});
  }
  function keydown(event){
    const tab=event.target.closest('[data-bw-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const tabs=[...tab.parentElement.querySelectorAll('[data-bw-tab]')],index=tabs.indexOf(tab);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    activateTab(tabs[next].dataset.bwTab,true);
  }
  function custom(id,number,status,content,metadata={}){
    const page=PAGES[state.page],same=state.detailRecordId===Number(id);
    snapshot();if(!same){rememberPageHistory();state.detailTab=null;}
    state.detailRecordId=Number(id);
    if(!same)history.pushState(pageHistoryState(),'',location.pathname+location.search+BusinessWorkspace.route(page.id,id));
    const key=page.type+':'+id;state.documentTabs ||= [];
    if(!state.documentTabs.some(t=>t.key===key))state.documentTabs.push({key,page:page.id,id:Number(id),title:page.title,label:number});
    renderTabs();document.title=number+' · '+page.title+' · ERP';
    const previous=$('#bw-custom-document');
    const host=document.createElement('article');host.id='bw-custom-document';host.className='business-workspace bw-custom-document';
    const root=$('#workspace');
    const errorPanels=[...root.querySelectorAll('#count-error,#amend-error')];
    [...root.children].filter(el=>el!==host).forEach(el=>el.hidden=true);
    host.innerHTML='<header class="bw-document-header"><div class="bw-title-line"><button class="bw-back" data-bw-back aria-label="返回列表">‹</button><h1>'+esc(number)+'</h1><span class="state '+statusClass(status)+'">'+esc(status)+'</span></div><div class="bw-header-actions"><button data-bw-print>打印</button><button data-custom-refresh>刷新</button></div></header><section class="bw-master-header"><dl class="bw-fields">'+Object.entries(metadata).map(([label,value])=>'<div class="bw-field"><dt>'+esc(label)+'：</dt><dd>'+esc(value??'—')+'</dd></div>').join('')+'</dl></section><div class="bw-tabs" role="tablist" aria-label="单据内容"><button data-bw-tab="items" id="bw-tab-items" role="tab" aria-selected="true" aria-controls="bw-panel-items">业务明细</button></div><section class="bw-section bw-custom-content" id="bw-panel-items" role="tabpanel" aria-labelledby="bw-tab-items"></section>';
    if(typeof content==='string')host.querySelector('.bw-custom-content').innerHTML=content;else host.querySelector('.bw-custom-content').append(content);
    const body=host.querySelector('.bw-custom-content');
    const historyPanel=document.createElement('section');historyPanel.id='bw-panel-timeline';historyPanel.className='bw-section bw-custom-content';historyPanel.setAttribute('role','tabpanel');historyPanel.setAttribute('aria-labelledby','bw-tab-timeline');historyPanel.hidden=true;
    const heading=[...body.querySelectorAll('h3')].find(h=>/操作历史|操作记录/.test(h.textContent));
    if(heading){while(heading.nextSibling)historyPanel.append(heading.nextSibling);heading.remove();}
    if(!historyPanel.childNodes.length)historyPanel.innerHTML='<div class="bw-empty">暂无操作记录</div>';
    host.append(historyPanel);
    host.querySelector('.bw-tabs').insertAdjacentHTML('beforeend','<button data-bw-tab="timeline" id="bw-tab-timeline" role="tab" aria-selected="false" aria-controls="bw-panel-timeline" tabindex="-1">操作记录</button>');
    for(const source of body.querySelectorAll('[data-count-action],[data-amend-action],[data-rma-action],[data-invoice-confirm],[data-invoice-void]')){
      const proxy=document.createElement('button');proxy.type='button';proxy.textContent=source.textContent;proxy.className=source.className;proxy.disabled=source.disabled;source.hidden=true;
      if(source.dataset.rmaAction)proxy.disabled=!accessCan('sales-returns:action:'+source.dataset.rmaAction);
      proxy.onclick=()=>source.click();host.querySelector('.bw-header-actions').prepend(proxy);
    }
    for(const panel of [...errorPanels,...host.querySelectorAll('.register-error,#rma-error')]){panel.classList.add('bw-document-error');host.append(panel);}
    previous?.remove();root.append(host);host.querySelector('[data-custom-refresh]').onclick=()=>renderPage();
    activateTab(state.detailTab==='timeline'?'timeline':'items');
    host.close=()=>back();return host;
  }
  return {snapshot,tabsHtml,tabClick,open,click,input,keydown,back,custom};
})();
