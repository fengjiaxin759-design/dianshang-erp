/* Business document presentation. Data and transitions remain owned by the API. */
(function (root) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const internal = new Set(['id','tenant_id','extra','item_list','official_attributes','economics','fba_workflow','_version']);
  const profiles = {
    inventory: [['库存身份',['sku','fnsku','batch_no','warehouse_name','store_name']],['库存数量',['quantity','available','locked','reserved','pending_inspection','defective_qty']],['来源与追溯',['source_batch_no','order_sn','purchase_order_sn','created_at','updated_at']]],
    replenishment: [['补货对象',['recommendation_no','sku','fnsku','store_name','urgency','status_text']],['需求与供给',['daily_sales','local_available','overseas_available','fba_available','inbound','local_inbound','overseas_inbound','fba_inbound']],['补货安排',['suggested_qty','lead_days','safety_days','moq','stockout_date','suggested_purchase_date','generated_at']]],
    suppliers: [['合作资料',['supplier_code','name','level','status_text']],['联系人与责任人',['contact','phone','email','address','purchase_user']],['结算资料',['payment_method','payment_terms','currency','remark']]],
    listings: [['刊登身份',['listing_id','sku','fnsku','asin','platform','store_name','site']],['刊登内容',['title','status_text','price','currency','stock','description']]],
    'supplier-deliveries': [['送货信息',['delivery_no','purchase_order_sn','supplier_name','warehouse_name','status_text']],['到货与质检',['total_qty','received_qty','inspection_type','qc_status','received_at']],['物流信息',['logistics_provider','tracking_no','freight','remark']]],
    'outbound-orders': [['出库信息',['order_sn','warehouse_name','to_warehouse_name','type','status_text']],['货物与追溯',['quantity','source_order_sn','purchase_order_sn','create_time','remark']]],
    approvals: [['审批事项',['request_no','business_type','business_no','status_text']],['审批记录',['applicant','approver','submitted_at','decided_at','decision','remark']]],
    warehouses: [['仓库资料',['warehouse_code','name','warehouse_type','status_text','country','address']],['负责人',['manager','contact','phone','remark']]],
    'ad-campaigns': [['广告活动',['campaign_id','name','campaign_name','store_name','platform','status_text']],['投放设置',['budget','daily_budget','bid','currency','start_date','end_date','targeting_type']]],
    'customer-tickets': [['工单信息',['ticket_no','subject','type','priority','status_text']],['订单与客户',['order_sn','buyer','email','store_name','sku']],['处理内容',['content','message','reply','owner','created_at','updated_at']]],
    finance: [['财务凭证',['reference_no','transaction_no','type','status_text','store_name']],['金额信息',['amount','currency','fee','cost','profit','exchange_rate']],['关联与说明',['order_sn','purchase_order_sn','occurred_at','remark']]],
    users: [['员工资料',['username','name','department','role','role_name','status_text']],['联系方式',['phone','email','remark']]],
    'store-authorizations': [['店铺资料',['store_name','platform','site','country','status_text']],['维护信息',['owner','authorized_at','last_checked_at','remark']]]
  };
  const fallbackGroups = [
    ['业务信息', /(^name$|^title$|^subject$|^sku$|^fnsku$|^asin$|_no$|^order_sn$|^platform_order_sn$|^model$|^brand$|^category$|^type$|^product_type$)/],
    ['组织与往来方', /(supplier|warehouse|store|platform|site|country|buyer|contact|phone|email|address|owner|user|developer|department)/],
    ['数量与金额', /(amount|price|cost|profit|freight|fee|currency|quantity|_qty$|available|stock|sales|budget|weight|volume|length|height|width|moq|tax|rate|count)/],
    ['流程与时间', /(status|approval|fulfillment|payment|shipment|carrier|tracking|logistics|date|time|_at$|^etd$|^eta$|lead_days)/],
    ['说明与补充', /.*/]
  ];

  function groups(page, keys) {
    const remaining = new Set(keys);
    const result = [];
    for (const [title, fields] of page.detailSections || profiles[page.resource] || []) {
      const selected = fields.filter(key => remaining.has(key));
      selected.forEach(key => remaining.delete(key));
      if (selected.length) result.push([title, selected]);
    }
    for (const [title, pattern] of fallbackGroups) {
      const selected = [...remaining].filter(key => pattern.test(key));
      selected.forEach(key => remaining.delete(key));
      if (selected.length) result.push([title, selected]);
    }
    return result;
  }

  function parseRoute(hash) {
    const [rawPage, query = ''] = hash.replace(/^#/, '').split('?');
    let page;
    try { page = decodeURIComponent(rawPage) || 'dashboard'; } catch { page = 'dashboard'; }
    const rawId = new URLSearchParams(query).get('record');
    const id = rawId && /^[1-9]\d*$/.test(rawId) && Number.isSafeInteger(Number(rawId)) ? Number(rawId) : null;
    return {page, id};
  }

  function route(page, id) {
    return '#' + encodeURIComponent(page) + (id ? '?record=' + encodeURIComponent(id) : '');
  }

  function documentNumber(page, record) {
    const candidates = ['order_sn','recommendation_no','delivery_order_no','delivery_no','plan_no','shipment_id','request_no','reference_no','ticket_no','supplier_code','warehouse_code','listing_id','batch_no','sku','name','id'];
    return String(record[candidates.find(key => record[key] !== '' && record[key] != null)] ?? page.title);
  }

  function valueHtml(value, key, label, statusClass, depth = 0) {
    if (value == null || value === '') return '<span class="bw-missing">未填写</span>';
    if (typeof value === 'boolean') return value ? '是' : '否';
    if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)&&Number.isFinite(Date.parse(value)))return '<span title="'+escape(value)+'">'+escape(new Date(value).toLocaleString('sv-SE',{hour12:false}))+'</span>';
    if (typeof value === 'object') {
      if (!Object.keys(value).length) return '<span class="bw-missing">暂无内容</span>';
      if (depth > 2) return '<span class="bw-long">' + escape(JSON.stringify(value)) + '</span>';
      return '<dl class="bw-nested">' + Object.entries(value).map(([k,v]) => '<div><dt>' + escape(Array.isArray(value) ? '第 ' + (Number(k)+1) + ' 项' : label(k)) + '</dt><dd>' + valueHtml(v,k,label,statusClass,depth+1) + '</dd></div>').join('') + '</dl>';
    }
    if (/status|urgency|priority/.test(key)) return '<span class="state ' + escape(statusClass(value)) + '">' + escape(value) + '</span>';
    return '<span class="bw-value">' + escape(value) + '</span>';
  }

  function itemTable(items, label, resource) {
    if (!items.length) return '<div class="bw-empty">暂无商品明细</div>';
    const purchaseLines=['purchase-orders','supplier-deliveries','inbound-orders'].includes(resource);
    if(purchaseLines)items=items.map(item=>own(item,'unit_price')?item:{...item,unit_price:item.price});
    const duplicatePrice=purchaseLines&&items.every(item=>item.price==null||item.price===item.unit_price);
    const present=[...new Set(items.flatMap(item=>Object.keys(item)))].filter(k=>!k.startsWith('_')&&!['sku','name','product_name','image_url'].includes(k)&&!(k==='price'&&duplicatePrice));
    const standard={
      'purchase-orders':['store_name','fnsku','default_carton_qty','box_count','quantity','unit_price','amount','planned_arrival','remark'],
      'supplier-deliveries':['fnsku','store_name','quantity','available_qty','defective_qty','unit','remark'],
      'inbound-orders':['fnsku','quantity','available_qty','defective_qty','warehouse_name','remark'],
      'outbound-orders':['fnsku','quantity','warehouse_name','remark'],
      'fba-delivery-orders':['fnsku','quantity','shipped_qty','received_qty','box_count','remark']
    };
    const first=standard[resource]||['fnsku','quantity','unit_price','price','amount','received_qty','available_qty','defective_qty','warehouse_name'].filter(k=>present.includes(k));
    const keys=[...first,...present.filter(k=>!first.includes(k))];
    const numeric=new Set(['quantity','price','unit_price','amount','box_count','default_carton_qty','received_qty','available_qty','defective_qty','shipped_qty']);
    return '<div class="bw-table-scroll"><table class="bw-line-table"><thead><tr><th>序号</th><th>图片</th><th>品名 / SKU</th>'+keys.map(k=>'<th>'+escape(label(k))+'</th>').join('')+'</tr></thead><tbody>'+items.map((item,i)=>{
      const image=safeImage(item.image_url), product=item._product;
      const sku=product?'<button class="link" data-related-page="product-management" data-related-resource="products" data-related-id="'+escape(product.id)+'">'+escape(item.sku)+'</button>':escape(item.sku||'—');
      return '<tr><td class="bw-row-number">'+(i+1)+'</td><td class="bw-line-image">'+(image?'<img loading="lazy" src="'+escape(image)+'" alt="'+escape(item.product_name||'产品图片')+'">':'<span>—</span>')+'</td><td><span class="bw-line-product" title="'+escape(item.product_name||item.name||'')+'">'+escape(item.product_name||item.name||'—')+'</span>'+sku+'</td>'+keys.map(k=>'<td class="'+(numeric.has(k)?'bw-numeric':'')+'">'+(item[k]==null||item[k]===''?'—':typeof item[k]==='object'?'<details><summary>查看内容</summary><pre>'+escape(JSON.stringify(item[k],null,2))+'</pre></details>':escape(item[k]))+'</td>').join('')+'</tr>';
    }).join('')+'</tbody></table></div>';
  }

  function summaryFields(page, record) {
    const byResource = {
      products:['price','cost','moq','procurement_lead_days'],
      'purchase-orders':['amount','received_qty','pending_qty','planned_arrival'],
      'sales-orders':['amount','payment_status','fulfillment_status','shipping_warehouse'],
      inventory:['quantity','available','warehouse_name','updated_at'],
      replenishment:['suggested_qty','daily_sales','inbound','stockout_date'],
      'supplier-deliveries':['total_qty','received_qty','qc_status','warehouse_name'],
      'shipping-plans':['quantity','locked_quantity','approval_status','eta'],
      'fba-delivery-orders':['shipped_qty','received_qty','warehouse_name','destination'],
      shipments:['box_count','total_weight','received_qty','expected_arrival_date']
    };
    const candidates = byResource[page.resource] || ['amount','quantity','store_name','warehouse_name','supplier_name','created_at','updated_at'];
    return candidates.filter(key => own(record,key)).slice(0,4);
  }

  function actions(page, record, helpers) {
    const id = escape(record.id), resource = page.resource;
    let html = '';
    const add = (name, attributes, primary = false) => { html += '<button type="button" ' + attributes + ' class="' + (primary ? 'primary' : '') + '">' + name + '</button>'; };
    if (resource === 'purchase-orders') {
      if (['','待提交','已驳回'].includes(record.status_text || '')) add('提交审批','data-workflow="purchase-submit" data-id="'+id+'"',true);
      if (record.status_text === '待下单') add('确认下单','data-workflow="purchase-place-order" data-id="'+id+'"',true);
      html += helpers.purchaseSettlementButtons(record);
      if(['待到货','待采购','部分入库'].includes(record.status_text))add('创建收货单','data-create-receipt');
      if (!['已完成','已作废','部分入库'].includes(record.status_text)) add('作废采购单','data-workflow="purchase-void" data-id="'+id+'"');
    }
    if (resource === 'replenishment' && record.status_text !== '已生成采购单') add('生成采购单','data-workflow="purchase" data-id="'+id+'"',true);
    if (resource === 'sales-orders') html += helpers.salesWorkflowButton(record);
    if (resource === 'listings') html += helpers.listingDimensionButton(record);
    if (resource === 'supplier-deliveries') {
      html += helpers.receivingButtons(record);
      if (record.status_text !== '已收货') add('确认收货','data-workflow="receive" data-id="'+id+'"',true);
    }
    if (resource === 'approvals' && record.status_text === '审批中') {
      add('审批通过','data-workflow="approve" data-id="'+id+'"',true);
      add('驳回申请','data-workflow="reject" data-id="'+id+'"');
    }
    if (['inbound-orders','outbound-orders'].includes(resource)) {
      if (!['已入库','已出库'].includes(record.status_text)) add('确认库存过账','data-stock-confirm="'+escape(resource)+'" data-id="'+id+'"',true);
      else {
        add('冲销过账','data-stock-extension="reverse" data-resource="'+escape(resource)+'" data-id="'+id+'"');
        if(resource==='outbound-orders'&&record.to_warehouse_name)add('接收调拨','data-stock-extension="receive-transfer" data-resource="'+escape(resource)+'" data-id="'+id+'"');
      }
      add('查看库存流水','data-stock-ledger="'+escape(resource)+'" data-id="'+id+'"');
    }
    html += helpers.fbaActions(page,record);
    if (!page.readonly && page.fields?.length && !(resource === 'users' && Number(record.id) === 1)) add('编辑','data-edit="'+id+'"');
    return html;
  }


  // Only confirmed state transitions appear here; actors and times come from audit data.
  const flows = {
    'purchase-orders': [['创建',['待提交','已驳回']],['审批',['待审核']],['下单',['待下单']],['到货',['待到货','待采购','部分入库']],['完成',['已完成']]],
    'supplier-deliveries': [['创建',['未收货','待收货']],['收货',['已收货']],['质检',['已质检']]],
    'inbound-orders': [['创建',['待入库','未入库']],['入库',['已入库']]],
    'outbound-orders': [['创建',['待出库','未出库']],['出库',['已出库']]],
    'shipping-plans': [['创建',['待提交']],['审批',['待审批','审批中']],['生成发货单',['已生成货件','已生成发货单']],['完成',['已完成']]],
    'fba-delivery-orders': [['配货',['待配货']],['发货',['待发货']],['运输',['运输中','部分签收']],['签收',['已签收']]],
    'sales-orders': [['创建',['待审核','待支付']],['发货',['待发货','部分发货']],['配送',['已发货']],['完成',['已完成']]]
  };
  function flowHtml(page, record) {
    const steps=flows[page.resource]; if(!steps)return '';
    let status=record.status_text;
    if(page.resource==='supplier-deliveries'&&['已质检','合格','不合格','部分合格'].includes(record.qc_status))status='已质检';
    if(page.resource==='shipping-plans'&&record.approval_status==='审批中')status='审批中';
    const current=steps.findIndex(([,states])=>states.includes(status));
    if(current<0)return '';
    return '<ol class="bw-flow" aria-label="业务流程">'+steps.map(([name],i)=>'<li class="'+(i<current?'done':i===current?'current':'')+'"'+(i===current?' aria-current="step"':'')+'><span>'+(i<current?'✓':i+1)+'</span>'+escape(name)+'</li>').join('')+'</ol>';
  }
  function safeImage(url) {
    return typeof url==='string'&&(/^(https?:\/\/|\/(?!\/)|static\/)/i.test(url))?url:'';
  }
  function render(page,record,context,helpers) {
    if(page.resource==='listings'&&context.listingDimensions){const d=context.listingDimensions;record={...record,...Object.fromEntries(['seller_sku','fnsku','asin','parent_asin','spu','spu_name','attributes'].map(k=>[k,d[k]]))};}
    const label=helpers.label, status=record.status_text||record.status||record.approval_status;
    const number=documentNumber(page,record), items=context.items||record.item_list||[];
    const related=context.related||[],timeline=context.timeline||[];
    const fields=Object.keys(record).filter(k=>!internal.has(k)&&k!=='image_url');
    const sections=groups(page,fields),showItems=own(record,'item_list')||items.length>0;
    const tabs=[...(showItems?[['items','商品明细',items.length]]:[]),['overview','基本资料'],['related','关联单据',related.length],['timeline','操作记录',timeline.length]];
    const active=tabs.some(t=>t[0]===helpers.activeTab)?helpers.activeTab:tabs[0][0];
    const relationKeys=new Set(['purchase_order_sn','source_plan_no','plan_no','shipment_id','sku','supplier_name','warehouse_name']);
    const display=(key,value)=>{
      const link=relationKeys.has(key)&&related.find(l=>l.label===String(value)||Object.values(l.record||{}).some(v=>typeof v==='string'&&v===value));
      return link?'<button class="link" data-related-page="'+escape(link.page)+'" data-related-resource="'+escape(link.resource)+'" data-related-id="'+escape(link.id)+'">'+escape(value)+'</button>':valueHtml(value,key,label,helpers.statusClass);
    };
    const fieldHtml=keys=>keys.map(k=>'<div class="bw-field" data-response-field="'+escape(k)+'"><dt>'+escape(label(k))+'：</dt><dd>'+display(k,record[k])+'</dd></div>').join('');
    const headerKeys=sections.flatMap(s=>s[1]).filter(k=>!['created_at','updated_at','status','status_text','order_sn','delivery_no','delivery_order_no','description','synthetic','batch'].includes(k)&&typeof record[k]!=='object');
    const mainKeys=headerKeys.slice(0,18);
    const header='<header class="bw-document-header"><div><div class="bw-title-line"><button class="bw-back" data-bw-back aria-label="返回'+escape(page.title)+'列表">‹</button><h1 tabindex="-1">'+escape(number)+'</h1>'+(status?'<span class="state '+escape(helpers.statusClass(status))+'">'+escape(status)+'</span>':'')+'</div>'+flowHtml(page,record)+'</div><div class="bw-header-actions">'+actions(page,record,helpers)+'<button type="button" data-bw-print>打印</button><button type="button" data-bw-refresh aria-label="刷新单据">↻</button></div></header>';
    const overview=sections.map(([title,keys])=>'<section class="bw-section"><header><h2>'+escape(title)+'</h2></header><dl class="bw-fields">'+fieldHtml(keys)+'</dl></section>').join('')+['official_attributes','economics'].filter(k=>record[k]&&Object.keys(record[k]).length).map(k=>'<section class="bw-section"><header><h2>'+escape(label(k))+'</h2></header><div class="bw-structured">'+valueHtml(record[k],k,label,helpers.statusClass)+'</div></section>').join('');
    const tableItems=items.map(item=>{
      const product=related.find(link=>link.resource==='products'&&link.record?.sku===item.sku)?.record;
      return product?{...item,product_name:item.product_name||product.name,image_url:product.image_url,unit:item.unit||product.unit,_product:product}:item;
    });
    const itemsHtml='<section class="bw-section bw-items-section"><div class="bw-line-toolbar"><span>共 <b data-bw-line-count>'+items.length+'</b> 行</span><label><span class="sr-only">筛选商品明细</span><input type="search" data-bw-line-filter placeholder="搜索 SKU / 品名 / FNSKU" aria-label="筛选商品明细"></label></div>'+itemTable(tableItems,label,page.resource)+'<div class="bw-line-empty" hidden>无匹配商品</div></section>';
    const relatedHtml='<section class="bw-section"><div class="bw-table-scroll"><table class="bw-line-table"><thead><tr><th>业务关系</th><th>单据编号</th><th>状态</th><th>操作</th></tr></thead><tbody>'+related.map(l=>'<tr><td>'+escape(l.relationship)+'</td><td><button class="link" data-related-page="'+escape(l.page)+'" data-related-resource="'+escape(l.resource)+'" data-related-id="'+escape(l.id)+'">'+escape(l.label)+'</button></td><td>'+valueHtml(l.record?.status_text||l.record?.status,'status',label,helpers.statusClass)+'</td><td><button class="link" data-related-page="'+escape(l.page)+'" data-related-resource="'+escape(l.resource)+'" data-related-id="'+escape(l.id)+'">查看详情</button></td></tr>').join('')+'</tbody></table></div>'+(!related.length?'<div class="bw-empty">暂无关联单据</div>':'')+'</section>';
    const timelineHtml='<section class="bw-section"><div class="bw-table-scroll"><table class="bw-line-table"><thead><tr><th>操作时间</th><th>操作人</th><th>操作类型</th><th>操作内容</th></tr></thead><tbody>'+timeline.map(t=>'<tr><td>'+escape(t.created_at)+'</td><td>'+escape(t.actor||'系统')+'</td><td>'+escape(({POST:'创建 / 业务操作',PUT:'修改',DELETE:'删除',SYSTEM:'系统记录'})[t.method]||t.method||'业务节点')+'</td><td><details><summary>查看记录</summary><pre>'+escape(typeof t.payload==='object'?JSON.stringify(t.payload,null,2):t.payload||t.path||'—')+'</pre></details></td></tr>').join('')+'</tbody></table></div>'+(!timeline.length?'<div class="bw-empty">暂无操作记录</div>':'')+'</section>';
    const panels={items:itemsHtml,overview,related:relatedHtml,timeline:timelineHtml};
    const image=safeImage(record.image_url);
    const productImage=page.resource==='products'?'<div class="bw-product-image">'+(image?'<img src="'+escape(image)+'" alt="'+escape(record.name)+'" loading="lazy">':'<span>暂无图片</span>')+'</div>':'';
    return '<article class="business-workspace" data-document-resource="'+escape(page.resource)+'">'+header+'<details class="bw-master-header" open><summary>单据信息<span>展开 / 收起</span></summary><div class="bw-master-content">'+productImage+'<dl class="bw-fields">'+fieldHtml(mainKeys)+'</dl></div></details>'+(context.failed?'<div class="bw-context-error" role="alert">关联资料加载失败：'+escape(context.error)+' <button data-bw-refresh>重试</button></div>':context.pending?'<div class="bw-context-note" role="status">正在读取关联资料…</div>':'')+'<div class="bw-tabs" role="tablist" aria-label="单据内容">'+tabs.map(([id,title,count])=>'<button type="button" role="tab" id="bw-tab-'+id+'" aria-selected="'+(id===active)+'" tabindex="'+(id===active?0:-1)+'" aria-controls="bw-panel-'+id+'" data-bw-tab="'+id+'">'+title+(count==null?'':' <span>'+count+'</span>')+'</button>').join('')+'</div>'+tabs.map(([id])=>'<div role="tabpanel" id="bw-panel-'+id+'" aria-labelledby="bw-tab-'+id+'"'+(id===active?'':' hidden')+'>'+panels[id]+'</div>').join('')+'</article>';
  }

  const api = {groups,profiles,parseRoute,route,documentNumber,itemTable,valueHtml,render,actions,escape,flowHtml,safeImage};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BusinessWorkspace = api;
})(typeof window !== 'undefined' ? window : globalThis);
