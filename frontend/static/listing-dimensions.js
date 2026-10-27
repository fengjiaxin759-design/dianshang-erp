/* Local Listing mapping editor; existing exact stock binding rules stay authoritative. */
function listingDimensionButton(row){return '<button class="link" data-listing-dimensions="'+row.id+'">配对与刊登资料</button>';}
async function showListingDimensions(id){
 let dialog=document.querySelector('#listing-dimensions-dialog');if(dialog)dialog.remove();
 dialog=document.createElement('dialog');dialog.id='listing-dimensions-dialog';dialog.className='record-dialog bw-editor';
 dialog.innerHTML='<header><h2>配对与刊登资料</h2></header><div class="loading">正在读取…</div><button data-ld-close>关闭</button>';
 document.body.appendChild(dialog);dialog.showModal();dialog.onclick=e=>{if(e.target.closest('[data-ld-close]'))dialog.close();};
 try{
  const result=await api('/api/v1/listing-dimensions/'+id),row=result.data||{};
  const matched=result.targets.findIndex(t=>t.sid===row.sid&&t.fnsku===row.fnsku);
  const input=(key,label,value)=>'<label>'+label+'<input name="'+key+'" value="'+esc(value??'')+'" maxlength="200"></label>';
  dialog.innerHTML='<form id="listing-dimensions-form"><header><div><small>Listing</small><h2>配对与刊登资料</h2></div><button type="button" data-ld-close aria-label="关闭">×</button></header><div class="record-body"><section class="bw-editor-section"><h3>刊登身份</h3><div class="form-grid"><label>本地 SKU<input value="'+esc(result.listing.sku)+'" readonly></label><label>店铺 / FNSKU<select name="target" required><option value="">请选择库存配对</option>'+result.targets.map((t,i)=>'<option value="'+i+'" '+(i===matched?'selected':'')+'>'+esc(t.sid)+' / '+esc(t.fnsku)+'</option>').join('')+'</select></label>'+[['seller_sku','MSKU'],['asin','ASIN'],['parent_asin','父ASIN'],['spu','SPU'],['spu_name','款名']].map(([k,l])=>input(k,l,row[k])).join('')+input('attributes','变体属性（逗号分隔）',(row.attributes||[]).join(','))+'</div></section><section class="bw-editor-section"><h3>负责人</h3><div class="bw-owner-options">'+result.owners.map(u=>'<label><input type="checkbox" name="owner_ids" value="'+u.id+'" '+((row.owner_ids||[]).includes(u.id)?'checked':'')+'>'+esc(u.name)+'</label>').join('')+'</div></section><p role="alert" id="listing-dimensions-error">'+(!result.targets.length?'没有可配对的 FBA 库存记录':'')+'</p></div><footer><button type="button" data-ld-close>取消</button><button class="primary" type="submit" '+(!result.targets.length||!accessCan('listings:write')?'disabled':'')+'>保存</button></footer></form>';
  const form=dialog.querySelector('form');
  form.onsubmit=async event=>{
   event.preventDefault();const save=form.querySelector('[type=submit]');if(save.disabled)return;
   const fd=new FormData(form),target=result.targets[Number(fd.get('target'))];if(!target)return;
   const body=Object.fromEntries(['asin','parent_asin','seller_sku','spu','spu_name'].map(k=>[k,fd.get(k)]));
   Object.assign(body,{sid:target.sid,fnsku:target.fnsku,attributes:String(fd.get('attributes')).trim()?String(fd.get('attributes')).split(',').map(x=>x.trim()):[],owner_ids:fd.getAll('owner_ids').map(Number)});
   save.disabled=true;
   try{await api('/api/v1/listing-dimensions/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const saved=await api('/api/v1/listing-dimensions/'+id);if(!saved.data||saved.data.fnsku!==body.fnsku||saved.data.seller_sku!==body.seller_sku)throw Error('保存回读不一致，请刷新核对');toast('刊登资料已保存');dialog.close();await loadTable(PAGES[state.page]);}
   catch(error){dialog.querySelector('#listing-dimensions-error').textContent=error.message;}
   finally{save.disabled=false;}
  };
 }catch(error){dialog.innerHTML='<header><h2>刊登资料加载失败</h2></header><p role="alert">'+esc(error.message)+'</p><button data-ld-close>关闭</button>';}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-listing-dimensions]');if(b&&!b.disabled)showListingDimensions(Number(b.dataset.listingDimensions));});
