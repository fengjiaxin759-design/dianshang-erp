// Recursive schema editor: every scalar, nested object and array has real controls.
// Values stay in the hidden canonical form field; no free-form JSON is required.
function officialAttributesControl(item,value){
 return '<input type="hidden" name="'+esc(item.key)+'" data-field="'+esc(item.key)+'" value="'+esc(JSON.stringify(value||{}))+'"><div class="official-attributes-editor" data-official-editor="'+esc(item.key)+'"></div>';
}
function mountOfficialEditor(form,item){
 const hidden=form.querySelector('[name="'+item.key+'"]'),host=form.querySelector('[data-official-editor="'+item.key+'"]');let value=JSON.parse(hidden.value||'{}');const schema=item.schema;
 const get=path=>path.reduce((x,k)=>x?.[k],value);
 const set=(path,v,remove=false)=>{if(!path.length){value=v;return;}let obj=value;for(let i=0;i<path.length-1;i++)obj=obj[path[i]];if(remove)delete obj[path.at(-1)];else obj[path.at(-1)]=v;hidden.value=JSON.stringify(value);};
 const encode=path=>esc(JSON.stringify(path));
 const defaultValue=s=>s.type==='object'?{}:s.type==='array'?[]:s.type==='integer'?0:'';
 function render(s,path,label){
  const v=get(path),present=v!==undefined,desc=s.description||label,required=s.required||[];
  if(s.type==='object')return '<fieldset class="official-object" data-official-path="'+encode(path)+'"><legend>'+esc(label)+'</legend><small>'+esc(desc)+'</small>'+(present?Object.entries(s.properties||{}).map(([k,child])=>render(child,path.concat(k),k)).join(''):'<button type="button" data-official-add-object="'+encode(path)+'">添加'+esc(label)+'</button>')+(path.length&&present?'<button type="button" data-official-remove="'+encode(path)+'">移除此组</button>':'')+'</fieldset>';
  if(s.type==='array')return '<fieldset class="official-array"><legend>'+esc(label)+'</legend><small>'+esc(desc)+'</small>'+(present?(v.map((_,i)=>'<section class="official-row"><b>第 '+(i+1)+' 行</b>'+render(s.items,path.concat(i),label+'['+i+']')+'<button type="button" data-official-delete-row="'+encode(path.concat(i))+'">删除第 '+(i+1)+' 行</button></section>').join('')):'<span class="muted">未设置</span>')+'<button type="button" data-official-add-row="'+encode(path)+'">增加 '+esc(label)+' 行</button>'+(present?'<button type="button" data-official-remove="'+encode(path)+'">取消设置</button>':'')+'</fieldset>';
  const attrs=' data-official-leaf="'+encode(path)+'" aria-label="'+esc(path.join('.'))+'"';
  const control=s.enum?'<select'+attrs+'><option value="">未设置</option>'+s.enum.map(x=>'<option value="'+esc(x)+'" '+(v===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select>':'<input'+attrs+' type="'+(s.type==='integer'?'number':'text')+'" value="'+esc(v??'')+'" '+(s.type==='integer'?'step="1" min="'+(s.minimum??0)+'"':'')+'>';
  return '<label class="official-leaf"><span>'+esc(label)+'</span><small>'+esc(desc)+' · '+esc(s.type)+'</small>'+control+'<button type="button" data-official-remove="'+encode(path)+'" '+(!present?'disabled':'')+'>取消设置</button></label>';
 }
 function schemaAt(path){let s=schema;for(const k of path)s=typeof k==='number'?s.items:s.properties[k];return s;}
 function redraw(){host.innerHTML=''+render(schema,[],'领星产品扩展资料');}
 host.oninput=event=>{const el=event.target;if(!el.hasAttribute('data-official-leaf'))return;const path=JSON.parse(el.dataset.officialLeaf),s=schemaAt(path);let v=el.value;if(s.type==='integer'){if(v===''){set(path,null,true);return;}v=Number(v);if(!Number.isSafeInteger(v)){el.setCustomValidity('必须为整数');return;}}else if(s.enum&&v===''){set(path,null,true);return;}el.setCustomValidity('');set(path,v);const remove=el.parentElement.querySelector('[data-official-remove]');if(remove)remove.disabled=false;};
 host.onclick=event=>{const b=event.target.closest('button');if(!b)return;let path;
  if(b.hasAttribute('data-official-add-object')){path=JSON.parse(b.dataset.officialAddObject);set(path,{});}
  else if(b.hasAttribute('data-official-add-row')){path=JSON.parse(b.dataset.officialAddRow);const arr=get(path)||[];arr.push(defaultValue(schemaAt(path).items));set(path,arr);}
  else if(b.hasAttribute('data-official-delete-row')){path=JSON.parse(b.dataset.officialDeleteRow);const i=path.pop(),arr=get(path);arr.splice(i,1);set(path,arr);}
  else if(b.hasAttribute('data-official-remove')){path=JSON.parse(b.dataset.officialRemove);set(path,null,true);}else return;
  redraw();
 };redraw();
}
