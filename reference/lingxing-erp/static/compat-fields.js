/* Typed read-only compatibility explorer; loaded before app.js. */
let COMPAT_CATALOG_PROMISE;
async function enhanceCompatOperation(entry){
 if(entry.method!=='post')return;
 if(!COMPAT_CATALOG_PROMISE)COMPAT_CATALOG_PROMISE=fetch(BASE+'/static/compat-field-catalog.json').then(r=>{if(!r.ok)throw Error('字段目录加载失败');return r.json();});
 const catalog=await COMPAT_CATALOG_PROMISE,spec=catalog.endpoints[entry.path];
 if(!spec||!document.querySelector('#contract-query-form')||!document.querySelector('#contract-detail h2')?.textContent.includes(entry.path))return;
 const form=document.querySelector('#contract-query-form');form.id='compat-query-form';
 const fields=spec.request.filter(f=>!f.path.includes('>>'));
 const control=f=>{const choices=spec.selectors[f.path],numeric=['int','integer','number'].includes(f.type.toLowerCase());let input;
  if(choices)input='<select data-compat-key="'+esc(f.path)+'"><option value="">请选择</option>'+choices.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('')+'</select>';
  else if(f.type.toLowerCase()==='array'&&f.path!=='senior_search_list')input='<textarea data-compat-key="'+esc(f.path)+'" rows="2" placeholder="每行一个值"></textarea>';
  else if(f.path==='senior_search_list')input='<div data-advanced-host></div><button type="button" data-add-advanced>增加条件</button>';
  else if(['boolean','bool'].includes(f.type.toLowerCase()))input='<select data-compat-key="'+esc(f.path)+'"><option value="true">true</option><option value="false">false</option></select>';
  else input='<input data-compat-key="'+esc(f.path)+'" type="'+(numeric?'number':'text')+'"'+(numeric?' step="'+(f.type==='number'?'any':'1')+'"':'')+'>';
  return '<div class="compat-input"><label><input type="checkbox" data-compat-use="'+esc(f.path)+'" '+(f.support==='unsupported'?'disabled':'')+'>传入 <code>'+esc(f.path)+'</code> · '+esc(f.type)+'</label><p>'+esc(f.label_and_rules)+'</p>'+(f.support==='unsupported'?'<strong>明确不支持：'+esc(f.reason)+'</strong>':input)+'<small>官方'+(f.required==='是'?'必填':'选填')+'；本地允许省略以进行全量小页试查</small></div>';
 };
 form.innerHTML='<p>结构化只读查询 · 勾选才传入；空值不会混同为0。无来源筛选明确拒绝，不能将空列表当作已实现。'+esc(spec.write_policy)+'</p><div class="form-grid">'+fields.map(control).join('')+'</div><button class="primary" type="submit">执行只读查询</button><button type="button" data-page="'+esc(spec.page)+'">前往规范资源维护</button>';
 const output=document.querySelector('#contract-query-result');output.outerHTML='<div id="contract-query-result" aria-live="polite"></div>';
 const source=document.createElement('div');source.className='scope-notice';source.innerHTML='<a target="_blank" rel="noopener" href="'+esc(spec.source_url)+'">官方来源</a> · SHA256 <code>'+esc(spec.source_sha256)+'</code> · '+spec.response.length+' 个响应路径。协议、派生和平台同步字段只读；没有来源值显示“未维护”，不伪造为零。';form.before(source);
 const pageField=f=>['offset','length','page','page_size'].includes(f.path)&&f.support!=='unsupported';fields.filter(pageField).forEach(f=>{form.querySelector('[data-compat-use="'+f.path+'"]').checked=true;form.querySelector('[data-compat-key="'+f.path+'"]').value=f.path==='offset'?(spec.pagination_mode==='page_offset'?1:0):f.path==='page'?1:5;});
 form.querySelector('[data-add-advanced]')?.addEventListener('click',()=>{const host=form.querySelector('[data-advanced-host]'),row=document.createElement('div');row.dataset.advancedRow='';row.innerHTML='<select data-advanced-field>'+spec.advanced_fields.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select><textarea data-advanced-values placeholder="每行一个匹配值"></textarea><button type="button">删除条件</button>';row.querySelector('button').onclick=()=>row.remove();host.appendChild(row);});
 form.onsubmit=async event=>{event.preventDefault();const resultHost=document.querySelector('#contract-query-result'),button=form.querySelector('[type=submit]');try{const body={};for(const f of fields){if(!form.querySelector('[data-compat-use="'+f.path+'"]').checked)continue;let value=form.querySelector('[data-compat-key="'+f.path+'"]')?.value;
  if(f.path==='senior_search_list'){const names={sku:'SKU',product_name:'品名',seller_sku:'MSKU',fnsku:'FNSKU',asin:'ASIN',parent_asin:'父ASIN',spu:'SPU',spu_name:'款名'};value=[...form.querySelectorAll('[data-advanced-row]')].map(row=>{const key=row.querySelector('[data-advanced-field]').value;return {search_field:key,search_value:row.querySelector('[data-advanced-values]').value.split('\n').filter(x=>x!==''),...(entry.path==='/basicOpen/openapi/storage/fbaWarehouseDetail'?{name:names[key]}:{})};});if(f.type.toLowerCase()==='string')value=JSON.stringify(value);}
  else if(['int','integer','number'].includes(f.type.toLowerCase())){if(value==='')throw Error(f.path+'请填写数字');value=Number(value);if(!Number.isFinite(value))throw Error(f.path+'数字无效');}
  else if(f.type.toLowerCase()==='array')value=value.split('\n').filter(x=>x!=='').map(x=>['sid_list','sid_arr','status_arr','logistics_type','s_wid','r_wid'].includes(f.path)&&/^\d+$/.test(x)?Number(x):x);
  else if(['boolean','bool'].includes(f.type.toLowerCase()))value=value==='true';body[f.path]=value;}
  button.disabled=true;resultHost.textContent='正在查询…';const result=await api(entry.path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});resultHost.innerHTML='<h3>结构化响应 · 全字段只读</h3>'+compatValueTree(result,'',new Map(spec.response.map(f=>[f.path,f])))+compatCoverageTable(result,spec);const raw=document.createElement('details');raw.innerHTML='<summary>协议JSON（只读诊断）</summary><pre></pre>';raw.querySelector('pre').textContent=JSON.stringify(result,null,2);resultHost.appendChild(raw);
 }catch(error){resultHost.textContent='查询失败：'+error.message;}finally{button.disabled=false;}};
}
function compatValueTree(value,path,labels){
 const canonical=path.replace(/\[\d+\]/g,''),meta=labels.get(canonical),label=meta?.label_and_rules||path||'响应';
 if(value===null||typeof value!=='object')return '<div class="compat-value" data-response-path="'+esc(path)+'"><code>'+esc(path)+'</code><span>'+esc(label)+'</span><strong>'+esc(value===null?'未维护 / 无来源（NULL）':value===false?'false':value===''?'空字符串':value)+'</strong><small>只读投影</small></div>';
 const children=Array.isArray(value)?value.map((v,i)=>compatValueTree(v,path+'['+i+']',labels)).join(''):Object.entries(value).map(([key,v])=>compatValueTree(v,path?path+'>>'+key:key,labels)).join('');
 return '<details open class="compat-object" data-response-path="'+esc(path)+'"><summary>'+esc(path||'响应')+' · '+esc(label)+' · '+(Array.isArray(value)?value.length+' 行':'对象')+'</summary>'+(children||'<em>空集合</em>')+'</details>';
}

function compatCoverageTable(result,spec){
 function at(value,parts){if(!parts.length)return [value];if(Array.isArray(value))return value.flatMap(v=>at(v,parts));if(!value||typeof value!=='object'||!(parts[0] in value))return [];return at(value[parts[0]],parts.slice(1));}
 return '<details><summary>官方全部 '+spec.response.length+' 路径与当前响应覆盖（含缺失字段）</summary><div class="schema-table"><table><thead><tr><th>官方路径</th><th>字段说明</th><th>当前值来源</th><th>维护规则</th></tr></thead><tbody>'+spec.response.map(f=>{const values=at(result,f.path.split('>>'));return '<tr data-official-response="'+esc(f.path)+'"><td><code>'+esc(f.path)+'</code></td><td>'+esc(f.label_and_rules)+'</td><td>'+(!values.length?'本次响应缺失 / 无记录，未声称已维护':values.every(v=>v===null)?'NULL / 无来源':values.length+' 个对应值；见上方结构化明细')+'</td><td>'+esc(f.maintenance_reason)+'</td></tr>';}).join('')+'</tbody></table></div></details>';
}
