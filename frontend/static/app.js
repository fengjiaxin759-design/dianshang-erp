const BASE = location.pathname.startsWith('/lingxing-erp/') ? '/lingxing-erp' : '';
const $ = function (selector) { return document.querySelector(selector); };
const TODAY = new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric'}).format(new Date());
const TODAY_ISO = new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const esc = function (value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
  });
};
const money = function (value, currency) {
  const number = Number(value || 0).toLocaleString('zh-CN', {minimumFractionDigits:2, maximumFractionDigits:2});
  const symbols={CNY:'¥',USD:'$',EUR:'€','$':'$','€':'€','¥':'¥'};
  return (symbols[currency] || currency || '¥') + number;
};
const field = function (key, label, type, options, required) {
  return {key:key, label:label, type:type || 'text', options:options || [], required:!!required};
};
const col = function (key, label, kind) { return {key:key, label:label, kind:kind || ''}; };

const PAGES = {
  dashboard:{id:'dashboard',module:'home',title:'首页',type:'dashboard'},
  'product-management':{id:'product-management',module:'product',title:'产品管理',resource:'products',primary:'添加产品',
    statuses:['全部','在售','停售'],columns:[col('sku','SKU','link'),col('name','品名'),col('category','分类'),col('model','型号'),col('brand','品牌'),col('supplier_name','主供应商'),col('hs_code','HSCODE'),col('status','状态','status'),col('cost','采购成本','money'),col('price','售价','money'),col('updated_at','更新时间')],
    fields:[field('name','品名','text',[],true),field('sku','SKU','text',[],true),field('product_type','产品类型','select',['普通产品','组合产品','辅料']),field('identifier','识别码'),field('status','状态','select',['在售','停售']),field('model','型号'),field('unit','单位'),field('material','产品材质'),field('category','分类'),field('brand','品牌'),field('tag','产品标签'),field('developer','开发人'),field('owner','产品负责人'),field('supplier_name','主供应商'),field('moq','起订量','number'),field('procurement_lead_days','采购交期(天)','number'),field('default_carton_qty','默认箱规','number'),field('carton_length','箱长(cm)','number'),field('carton_width','箱宽(cm)','number'),field('carton_height','箱高(cm)','number'),field('carton_weight','箱重(kg)','number'),field('hs_code','HSCODE'),field('customs_name','报关名称'),field('customs_price','申报单价','number'),field('origin_country','原产国'),field('qc_method','质检方式','select',['仓库质检','预检','免检']),field('qc_standard','质检标准'),field('image_url','图片地址'),field('cost','采购成本','number'),field('price','销售价格','number'),field('description','产品描述','textarea')]},
  'product-add':{id:'product-add',module:'product',title:'添加产品',type:'product-form'},
  listing:{id:'listing',module:'product',title:'Listing',resource:'listings',primary:'添加Listing',statuses:['全部','在线','草稿'],
    columns:[col('platform','平台'),col('store_name','店铺'),col('listing_id','Listing ID','link'),col('sku','SKU'),col('title','标题'),col('status_text','状态','status'),col('price','售价','money'),col('stock','可售库存')],
    fields:[field('platform','平台','select',['Amazon','Shopee','Temu']),field('store_name','店铺'),field('listing_id','Listing ID'),field('sku','SKU'),field('title','标题'),field('status_text','状态','select',['在线','草稿','下架']),field('price','售价','number'),field('stock','库存','number')]},
  replenishment:{id:'replenishment',module:'product',title:'补货建议',resource:'replenishment',statuses:['全部','待生成采购计划','待复核','库存充足'],
    columns:[col('recommendation_no','建议编号','link'),col('sku','SKU'),col('fnsku','FNSKU'),col('store_name','店铺'),col('urgency','紧急度','status'),col('daily_sales','日均销量'),col('local_available','本地可用'),col('overseas_available','海外仓可用'),col('fba_available','FBA可用'),col('inbound','在途'),col('suggested_qty','建议数量'),col('stockout_date','预计断货日'),col('status_text','状态','status')]},
  'sales-orders':{id:'sales-orders',module:'sales',title:'订单列表',resource:'sales-orders',primary:'新增订单',statuses:['全部','待审核','待发货','部分发货','已冻结','已发货','已完成'],
    columns:[col('order_sn','内部订单号','link'),col('platform_order_sn','平台订单号'),col('platform','平台'),col('store_name','店铺'),col('country','国家'),col('buyer','买家'),col('order_time','下单时间'),col('amount','订单金额','money'),col('payment_status','支付状态','status'),col('fulfillment_status','履约状态','status'),col('tracking_no','跟踪号'),col('status_text','订单状态','status')],
    fields:[field('order_sn','内部订单号','text',[],true),field('platform_order_sn','平台订单号'),field('platform','平台','select',['Amazon','Shopee','Temu']),field('store_name','店铺'),field('site','站点'),field('country','收货国家'),field('buyer','买家'),field('phone','联系电话'),field('shipping_address','收货地址','textarea'),field('order_time','下单时间','datetime-local'),field('currency','币种','select',['USD','CNY','EUR']),field('amount','订单金额','number'),field('payment_status','支付状态','select',['待支付','已支付','部分退款','已退款']),field('fulfillment_status','履约状态','select',['待审核','待发货','已发货','已完成']),field('shipping_warehouse','发货仓'),field('delivery_method','配送方式'),field('tracking_no','跟踪号'),field('carrier','承运商'),field('refund_status','退款状态','select',['无退款','处理中','已退款']),field('status_text','订单状态','select',['待审核','待发货','已发货','已完成']),field('remark','订单备注','textarea')]},
  'operation-logs':{id:'operation-logs',module:'sales',title:'运营日志',resource:'audit-logs',readonly:true,
    columns:[col('created_at','时间'),col('actor','操作人'),col('method','类型','status'),col('path','业务对象'),col('payload','内容')]},
  'fba-plans':{id:'fba-plans',module:'fba',title:'FBA发货计划',resource:'shipping-plans',primary:'创建FBA计划',statuses:['全部','待提交','已生成货件','已生成发货单','已完成'],
    columns:[col('plan_no','计划编号','link'),col('channel','渠道'),col('store_name','店铺'),col('warehouse_name','发货仓'),col('destination','目的仓'),col('shipment_id','货件编号'),col('sku_count','SKU数'),col('quantity','计划数量'),col('locked_quantity','锁定数量'),col('source_recommendation_no','补货来源'),col('approval_status','审批状态','status'),col('status_text','状态','status'),col('etd','预计发货'),col('eta','预计到货')],
    fields:[field('plan_no','计划编号','text',[],true),field('channel','渠道','select',['FBA','海外仓']),field('store_name','店铺'),field('warehouse_name','发货仓'),field('destination','目的仓'),field('shipment_id','货件编号'),field('sku_count','SKU数','number'),field('source_recommendation_no','补货来源'),field('quantity','计划数量','number'),field('locked_quantity','锁定数量','number'),field('approval_status','审批状态','select',['未提交','审批中','已通过']),field('status_text','状态','select',['待提交','已生成货件','已生成发货单','已完成']),field('etd','预计发货','date'),field('eta','预计到货','date')]},
  'fba-shipments':{id:'fba-shipments',module:'fba',title:'FBA货件',resource:'shipments',primary:'添加货件',
    columns:[col('shipment_id','货件编号','link'),col('shipment_name','货件名称'),col('shipment_type','货件类型'),col('warehouse_name','发货仓'),col('destination','目的地'),col('carrier','物流渠道'),col('amazon_status','Amazon状态','status'),col('box_count','箱数'),col('total_weight','总重量'),col('status_text','货件状态','status'),col('created_at','创建时间')],
    fields:[field('shipment_id','货件编号','text',[],true),field('shipment_name','Shipment Name'),field('shipment_type','货件类型','select',['FBA','内部发货']),field('warehouse_name','发货仓'),field('destination','FBA目的仓'),field('country','目的国家'),field('site','站点'),field('carrier','承运商'),field('amazon_status','Amazon状态','select',['WORKING','SHIPPED','CLOSED']),field('status_text','状态','select',['待发货','运输中','已签收']),field('tracking_no','追踪号'),field('logistics_channel','物流渠道'),field('box_count','箱数','number'),field('total_weight','总重量(kg)','number'),field('total_volume','总体积(m³)','number'),field('head_freight','头程费用','number'),field('expected_ship_date','预计发货','date'),field('expected_arrival_date','预计到达','date'),field('received_qty','平台接收数量','number')]},
  'fba-delivery-orders':{id:'fba-delivery-orders',module:'fba',title:'FBA发货单',resource:'fba-delivery-orders',primary:'创建发货单',statuses:['全部','待发货','运输中','已签收'],columns:[col('delivery_order_no','发货单号','link'),col('shipment_id','货件编号'),col('plan_no','计划编号'),col('store_name','店铺'),col('warehouse_name','发货仓'),col('destination','目的仓'),col('carrier','承运商'),col('tracking_no','追踪号'),col('shipped_qty','发货数量'),col('received_qty','接收数量'),col('box_count','箱数'),col('status_text','状态','status')],fields:[field('delivery_order_no','发货单号','text',[],true),field('shipment_id','关联货件'),field('plan_no','关联计划'),field('store_name','店铺'),field('warehouse_name','发货仓'),field('destination','目的仓'),field('carrier','承运商'),field('tracking_no','追踪号'),field('status_text','状态','select',['待发货','运输中','已签收']),field('shipped_qty','发货数量','number'),field('received_qty','接收数量','number'),field('box_count','箱数','number'),field('head_freight','头程费用','number'),field('shipped_at','发货时间','datetime-local'),field('received_at','接收时间','datetime-local'),field('remark','备注','textarea')]},
  'purchase-plans':{id:'purchase-plans',module:'purchase',title:'采购计划',resource:'replenishment',primary:'创建采购计划',statuses:['全部','待生成采购计划','待复核','库存充足','已生成采购单'],
    columns:[col('recommendation_no','计划编号','link'),col('sku','品名/SKU'),col('store_name','店铺'),col('fnsku','FNSKU'),col('urgency','标签','status'),col('local_available','仓库库存'),col('suggested_qty','计划采购量'),col('lead_days','交期(天)'),col('generated_at','创建时间'),col('status_text','状态','status')],
    fields:[field('recommendation_no','计划编号','text',[],true),field('sku','SKU','text',[],true),field('fnsku','FNSKU'),field('store_name','店铺'),field('local_available','仓库库存','number'),field('suggested_qty','计划采购量','number'),field('lead_days','交期(天)','number'),field('moq','起订量','number'),field('status_text','状态','select',['待生成采购计划','待复核','库存充足','已生成采购单'])]},
  'purchase-orders':{id:'purchase-orders',module:'purchase',title:'采购单',resource:'purchase-orders',primary:'创建采购单',statuses:['全部','待提交','待审核','已驳回','待下单','待到货','待采购','部分入库','已完成','已作废'],
    columns:[col('order_sn','采购单号','link'),col('supplier_name','供应商'),col('warehouse_name','仓库'),col('purchase_user','采购员'),col('order_time','创建时间'),col('payment_status','付款状态','status'),col('amount','总金额','money'),col('freight','运费','money'),col('tax_rate','税率'),col('purchase_currency','币种'),col('planned_arrival','预计到货'),col('received_qty','已到货'),col('pending_qty','待到货'),col('status_text','状态','status'),col('remark','备注')],
    fields:[field('order_sn','采购单号','text',[],true),field('custom_order_sn','自定义单号'),field('supplier_name','供应商','select',['宁波晨光供应链','深圳拓海电子','义乌优选家居']),field('warehouse_name','采购仓库','select',['华东仓','美西海外仓']),field('purchase_user','采购员'),field('order_time','创建时间','datetime-local'),field('purchase_currency','币种','select',['CNY','USD']),field('amount','含税金额','number'),field('tax_rate','税率(%)','number'),field('freight','运费','number'),field('other_fee','其他费用','number'),field('allocation_method','费用分摊方式','select',['按数量分摊','按金额分摊','按重量分摊']),field('logistics_provider','供应商物流商'),field('tracking_no','物流单号'),field('qc_type','质检类型','select',['仓库质检','预检','免检']),field('planned_arrival','预计到货','date'),field('received_qty','已采购量','number'),field('pending_qty','待到货量','number'),field('payment_plan','付款计划','textarea'),field('source_plan_no','来源采购计划'),field('payment_status','付款状态','select',['未付款','部分付款','已付款']),field('status_text','采购状态','select',['待提交','待审核','待采购','部分入库','已完成']),field('remark','备注','textarea')]},
  'supplier-management':{id:'supplier-management',module:'purchase',title:'供应商',resource:'suppliers',primary:'添加供应商',statuses:['全部','合作中','已停用'],
    columns:[col('supplier_code','供应商编号','link'),col('name','供应商名称'),col('level','等级','status'),col('contact','联系人'),col('phone','联系电话'),col('purchase_user','采购负责人'),col('status_text','状态','status'),col('updated_at','更新时间')],
    fields:[field('supplier_code','供应商编号','text',[],true),field('name','供应商名称','text',[],true),field('level','等级','select',['A','B','C']),field('contact','联系人'),field('phone','联系电话'),field('purchase_user','采购负责人'),field('status_text','状态','select',['合作中','已停用'])]},
  receiving:{id:'receiving',module:'purchase',title:'收货单',resource:'supplier-deliveries',statuses:['全部','未收货','已收货'],
    columns:[col('delivery_no','送货单号','link'),col('purchase_order_sn','采购单号'),col('supplier_name','供应商'),col('warehouse_name','收货仓'),col('logistics_provider','物流商'),col('tracking_no','物流单号'),col('freight','运费','money'),col('total_qty','送货数量'),col('received_qty','实收数量'),col('qc_status','质检状态','status'),col('inspection_type','质检类型'),col('status_text','收货状态','status')]},
  'purchase-approvals':{id:'purchase-approvals',module:'purchase',title:'审批工作台',resource:'approvals',statuses:['全部','审批中','已通过','已驳回'],
    columns:[col('request_no','审批编号','link'),col('business_type','业务类型'),col('business_no','业务单号'),col('applicant','申请人'),col('approver','审批人'),col('submitted_at','提交时间'),col('decided_at','处理时间'),col('status_text','审批状态','status')]},
  inventory:{id:'inventory',module:'warehouse',title:'库存明细',resource:'inventory',statuses:['全部','有库存','低库存'],
    columns:[col('batch_no','批次号','link'),col('warehouse_name','仓库'),col('sku','SKU'),col('fnsku','FNSKU'),col('store_name','店铺'),col('quantity','总库存'),col('available','可用库存'),col('source_batch_no','源批次'),col('order_sn','来源单号'),col('updated_at','更新时间')]},
  inbounds:{id:'inbounds',module:'warehouse',title:'入库单',resource:'inbound-orders',primary:'新建入库单',statuses:['全部','待入库','已入库'],
    columns:[col('order_sn','入库单号','link'),col('type','入库类型'),col('warehouse_name','仓库'),col('purchase_order_sn','采购单号'),col('supplier_name','供应商'),col('quantity','入库数量'),col('inspected_qty','待检数量'),col('available_qty','可用数量'),col('defective_qty','次品数量'),col('qc_status','质检状态','status'),col('create_time','创建时间'),col('status_text','状态','status')],
    fields:[field('order_sn','入库单号','text',[],true),field('type','入库类型','select',['1','2']),field('warehouse_name','仓库'),field('purchase_order_sn','采购单号'),field('supplier_name','供应商'),field('quantity','入库数量','number'),field('purchase_unit_price','采购单价','number'),field('freight','运费','number'),field('other_fee','其他费用','number'),field('allocation_method','费用分配方式','select',['按数量分摊','按金额分摊']),field('inspected_qty','待检量','number'),field('available_qty','可用量','number'),field('defective_qty','次品量','number'),field('qc_status','质检状态','select',['待检','合格','部分合格','不合格']),field('logistics_provider','物流商'),field('tracking_no','物流单号'),field('create_time','创建时间','datetime-local'),field('status_text','状态','select',['待入库','已入库']),field('remark','备注','textarea')]},
  outbounds:{id:'outbounds',module:'warehouse',title:'出库单',resource:'outbound-orders',primary:'新建出库单',statuses:['全部','待拣货','拣货中','已出库'],
    columns:[col('order_sn','出库单号','link'),col('warehouse_name','出库仓'),col('to_warehouse_name','目的仓'),col('quantity','出库数量'),col('create_time','创建时间'),col('status_text','状态','status')],
    fields:[field('order_sn','出库单号','text',[],true),field('warehouse_name','出库仓'),field('to_warehouse_name','目的仓'),field('quantity','出库数量','number'),field('create_time','创建时间','datetime-local'),field('status_text','状态','select',['待拣货','拣货中','已出库'])]},
  warehouses:{id:'warehouses',module:'warehouse',title:'仓库列表',resource:'warehouses',primary:'添加仓库',statuses:['全部','启用','停用'],
    columns:[col('warehouse_code','仓库编码','link'),col('name','仓库名称'),col('warehouse_type','仓库类型'),col('country','国家/地区'),col('manager','负责人'),col('status_text','状态','status'),col('updated_at','更新时间')],
    fields:[field('warehouse_code','仓库编码','text',[],true),field('name','仓库名称','text',[],true),field('warehouse_type','仓库类型','select',['本地仓','海外仓','平台仓']),field('country','国家/地区'),field('manager','负责人'),field('status_text','状态','select',['启用','停用'])]},
  shipments:{id:'shipments',module:'logistics',title:'发货计划',resource:'shipments',primary:'创建发货计划',
    columns:[col('shipment_id','发货单号','link'),col('shipment_name','发货名称'),col('shipment_type','类型'),col('warehouse_name','发货仓'),col('destination','目的地'),col('carrier','承运商'),col('tracking_no','追踪号'),col('box_count','箱数'),col('expected_ship_date','预计发货'),col('status_text','物流状态','status')],
    fields:[field('shipment_id','发货单号','text',[],true),field('shipment_name','发货名称'),field('shipment_type','类型','select',['FBA','内部发货']),field('warehouse_name','发货仓'),field('destination','目的地'),field('country','目的国家'),field('site','站点'),field('carrier','承运商'),field('tracking_no','追踪号'),field('logistics_channel','物流渠道'),field('box_count','箱数','number'),field('total_weight','总重量(kg)','number'),field('head_freight','头程费用','number'),field('expected_ship_date','预计发货','date'),field('expected_arrival_date','预计到达','date'),field('status_text','状态','select',['待发货','运输中','已签收'])]},
  'logistics-tracking':{id:'logistics-tracking',module:'logistics',title:'物流跟踪',resource:'supplier-deliveries',
    columns:[col('tracking_no','物流单号','link'),col('logistics_provider','物流商'),col('delivery_no','业务单号'),col('supplier_name','发件方'),col('warehouse_name','目的仓'),col('freight','运费','money'),col('status_text','签收状态','status')]},
  'ad-campaigns':{id:'ad-campaigns',module:'ads',title:'广告活动',resource:'ad-campaigns',primary:'创建广告活动',statuses:['全部','投放中','已暂停'],
    columns:[col('platform','平台'),col('store_name','店铺'),col('campaign_name','广告活动','link'),col('campaign_type','广告类型'),col('status_text','状态','status'),col('spend','花费','money'),col('sales','广告销售额','money'),col('acos','ACOS','percent')],
    fields:[field('platform','平台','select',['Amazon','Shopee']),field('store_name','店铺'),field('campaign_name','广告活动名称','text',[],true),field('campaign_type','广告类型','select',['SP','SB','SBV','SD']),field('status_text','状态','select',['投放中','已暂停']),field('spend','花费','number'),field('sales','广告销售额','number'),field('acos','ACOS','number')]},
  'ad-performance':{id:'ad-performance',module:'ads',title:'广告表现',type:'ad-report'},
  tickets:{id:'tickets',module:'service',title:'客服工单',resource:'customer-tickets',primary:'创建工单',statuses:['全部','待回复','处理中','已解决'],
    columns:[col('ticket_no','工单编号','link'),col('platform','平台'),col('store_name','店铺'),col('buyer','买家'),col('subject','主题'),col('owner','负责人'),col('created_time','创建时间'),col('status_text','状态','status')],
    fields:[field('ticket_no','工单编号','text',[],true),field('platform','平台','select',['Amazon','Shopee','Temu']),field('store_name','店铺'),field('buyer','买家'),field('subject','主题'),field('owner','负责人'),field('created_time','创建时间','datetime-local'),field('status_text','状态','select',['待回复','处理中','已解决'])]},
  'message-center':{id:'message-center',module:'service',title:'消息中心',resource:'customer-tickets',
    columns:[col('platform','平台'),col('store_name','店铺'),col('buyer','发件人'),col('subject','消息主题','link'),col('owner','处理人'),col('created_time','接收时间'),col('status_text','处理状态','status')]},
  'finance-flow':{id:'finance-flow',module:'finance',title:'资金流水',resource:'finance',primary:'新增流水',statuses:['全部','待审核','部分付款','已结算'],
    columns:[col('reference_no','业务编号','link'),col('type','收支类型'),col('counterparty','往来单位'),col('occurred_at','发生日期'),col('currency','币种'),col('amount','金额','money'),col('status_text','状态','status')],
    fields:[field('reference_no','业务编号','text',[],true),field('type','收支类型'),field('counterparty','往来单位'),field('occurred_at','发生日期','date'),field('currency','币种','select',['CNY','USD','EUR']),field('amount','金额','number'),field('status_text','状态','select',['待审核','部分付款','已结算'])]},
  'order-profit':{id:'order-profit',module:'finance',title:'订单利润',type:'profit-report',resource:'sales-orders'},
  'settlement-profit':{id:'settlement-profit',module:'finance',title:'结算利润',type:'profit-report',resource:'finance'},
  'sales-stat':{id:'sales-stat',module:'statistics',title:'销售统计',type:'sales-report'},
  'inventory-report':{id:'inventory-report',module:'statistics',title:'库存报表',type:'inventory-report'},
  'business-analysis':{id:'business-analysis',module:'bi',title:'经营分析',type:'bi-report'},
  'profit-dashboard':{id:'profit-dashboard',module:'bi',title:'利润看板',type:'profit-report',resource:'finance'},
  'manual-testing':{id:'manual-testing',module:'tools',title:'人工测试中心',type:'manual-testing'},
  'batch-tools':{id:'batch-tools',module:'tools',title:'批量工具',type:'tools'},
  'api-docs':{id:'api-docs',module:'tools',title:'开放接口',type:'docs'},
  'store-auth':{id:'store-auth',module:'settings',title:'店铺授权',resource:'store-authorizations',readonly:true,statuses:['全部','已授权','待配置','校验失败'],
    columns:[col('platform','平台'),col('store_name','店铺名称','link'),col('site','站点'),col('fee_rate','平台费率','percent'),col('last_checked_at','最近校验'),col('status_text','授权状态','status')]},
  users:{id:'users',module:'settings',title:'用户与角色',resource:'users',primary:'添加用户',statuses:['全部','启用','停用'],
    columns:[col('username','用户名','link'),col('name','姓名'),col('department','部门'),col('role_name','角色'),col('status_text','状态','status'),col('last_login_at','最后登录')],
    fields:[field('username','用户名','text',[],true),field('name','姓名','text',[],true),field('department','部门'),field('role_name','角色','select',['超级管理员','采购专员','仓库主管','店铺运营','财务']),field('status_text','状态','select',['启用','停用']),field('last_login_at','最后登录','datetime-local')]},
  'login-accounts':{id:'login-accounts',module:'settings',title:'登录账号',type:'access-accounts'},
  'role-permissions':{id:'role-permissions',module:'settings',title:'角色权限',type:'access-roles'},
  'warehouse-settings':{id:'warehouse-settings',module:'settings',title:'仓库设置',resource:'warehouses',primary:'添加仓库',
    columns:[col('warehouse_code','仓库编码','link'),col('name','仓库名称'),col('warehouse_type','类型'),col('country','国家/地区'),col('manager','负责人'),col('status_text','状态','status')]},
  'audit-logs':{id:'audit-logs',module:'settings',title:'操作日志',resource:'audit-logs',readonly:true,
    columns:[col('created_at','操作时间'),col('actor','操作人'),col('method','动作','status'),col('path','业务路径'),col('payload','变更内容')]}
};

// Secondary pages without a dedicated table intentionally reuse the nearest
// real resource. They still get a working list, filters, details and export;
// none of the menu entries below renders a one-line placeholder.
function mappedPage(id,module,title,base,extra){
  const source=PAGES[base];
  PAGES[id]=Object.assign({},source,{id:id,module:module,title:title,aliasOf:base,menuDescription:'复用视图 · '+source.title+'（非独立模块）'},extra||{});
  if(source.columns)PAGES[id].columns=source.columns.slice();
  if(source.fields)PAGES[id].fields=source.fields.slice();
  if(source.statuses)PAGES[id].statuses=source.statuses.slice();
}
[
 ['product-attributes','product','产品属性','product-management'],['product-category','product','产品分类','product-management'],['brand-management','product','品牌管理','product-management'],['product-tags','product','产品标签','product-management'],['supplier-quotation','product','供应商报价','supplier-management'],['product-archive','product','产品归档','product-management',{statuses:['全部','停售']}],['product-operation-log','product','产品操作日志','operation-logs'],
 ['sales-overview','sales','销售总览','sales-stat'],['listing-pairing','sales','Listing配对','listing'],['listing-quality','sales','Listing质量','listing'],['promotion-management','sales','促销活动','sales-orders'],['after-sales','sales','售后管理','tickets'],['refund-orders','sales','退款订单','sales-orders'],['order-rules','sales','订单规则','sales-orders'],
 ['fba-dashboard','fba','FBA总览','inventory-report'],['fba-reconciliation','fba','FBA对账','settlement-profit'],['fba-inventory','fba','FBA库存','inventory'],['fba-labels','fba','标签打印','fba-delivery-orders'],['overseas-plans','fba','海外仓发货计划','fba-plans'],
 ['purchase-price','purchase','采购价管理','purchase-orders'],['purchase-outsourcing','purchase','委外订单','purchase-orders'],['purchase-1688','purchase','1688下单','purchase-orders'],['purchase-requests','purchase','请款池','finance-flow'],['purchase-supplier-quotation','purchase','供应商报价','supplier-management'],['supplier-portal','purchase','供应商门户','supplier-management'],
 ['transfer-orders','warehouse','调拨单','outbounds'],['stocktaking','warehouse','盘点单','inventory'],['stock-adjustment','warehouse','库存调整单','inventory'],['quality-inspection','warehouse','质检单','inbounds'],['scan-receiving','warehouse','扫码收货','receiving'],['scan-outbound','warehouse','扫描出库','outbounds'],['warehouse-batches','warehouse','库存批次','inventory'],
 ['freight-calculator','logistics','运费试算','shipments'],['first-leg-orders','logistics','头程物流单','shipments'],['logistics-channel','logistics','物流渠道','shipments'],['logistics-cost','logistics','物流费用','finance-flow'],['carrier-management','logistics','承运商管理','shipments'],['logistics-aging','logistics','物流时效','logistics-tracking'],
 ['ad-dashboard','ads','广告仪表盘','ad-performance'],['ad-keywords','ads','广告关键词','ad-campaigns'],['ad-search-terms','ads','搜索词分析','ad-performance'],['ad-placement','ads','广告位分析','ad-performance'],['ad-structure','ads','广告结构','ad-campaigns'],['ad-budget','ads','预算管理','ad-campaigns'],
 ['email-statistics','service','邮件统计','tickets'],['after-sales-tickets','service','售后邮件','tickets'],['rma-management','service','RMA管理','tickets'],['review-management','service','评论管理','tickets'],['feedback-management','service','Feedback管理','tickets'],['service-templates','service','邮件模板','message-center'],
 ['accounts-receivable','finance','应收管理','finance-flow'],['accounts-payable','finance','应付管理','finance-flow'],['payment-requests','finance','请款管理','finance-flow'],['settlement-center','finance','亚马逊结算中心','settlement-profit'],['performance-report','finance','业绩报表','order-profit'],['cost-center','finance','成本中心','finance-flow'],['invoice-management','finance','发票管理','finance-flow'],
 ['sales-ranking','statistics','销售排行','sales-stat'],['product-performance','statistics','产品表现','sales-stat'],['store-performance','statistics','店铺表现','sales-stat'],['target-management','statistics','目标管理','sales-stat'],['inventory-aging','statistics','库龄分析','inventory-report'],['replenishment-analysis','statistics','补货分析','inventory-report'],['purchase-analysis','statistics','采购分析','purchase-orders'],
 ['bi-data-model','bi','关联数据','business-analysis'],['bi-analysis','bi','数据分析','business-analysis'],['bi-app-builder','bi','应用创作','business-analysis'],['bi-screen','bi','经营大屏','business-analysis'],['bi-report-center','bi','报表中心','profit-dashboard'],
 ['chatgpt-copy','tools','ChatGPT文案','api-docs'],['review-analysis','tools','评论分析','tickets'],['competitor-monitor','tools','竞品监控','listing'],['keyword-tool','tools','关键词工具','ad-keywords'],['download-center','tools','下载中心','batch-tools'],['import-center','tools','导入中心','batch-tools'],
 ['system-settings','settings','业务配置','warehouse-settings'],['department-settings','settings','部门管理','users'],['employee-settings','settings','员工管理','users'],['currency-settings','settings','币种汇率','finance-flow'],['approval-settings','settings','审批设置','purchase-approvals'],['notification-settings','settings','消息设置','message-center'],['data-permissions','settings','数据权限','role-permissions']
].forEach(function(item){mappedPage(item[0],item[1],item[2],item[3],item[4]);});

PAGES.stocktaking={id:'stocktaking',module:'warehouse',title:'库存盘点单',type:'stocktaking'};
PAGES['stock-adjustment']={id:'stock-adjustment',module:'warehouse',title:'盘点差异调整',type:'stocktaking'};
PAGES['purchase-amendments']={id:'purchase-amendments',module:'purchase',title:'采购变更',type:'purchase-amendments'};
PAGES['rma-management']={id:'rma-management',module:'service',title:'销售退货 / RMA',type:'sales-returns'};
PAGES['after-sales']={id:'after-sales',module:'sales',title:'销售退货',type:'sales-returns'};
PAGES['refund-orders']={id:'refund-orders',module:'sales',title:'退款订单',type:'sales-returns'};
PAGES['freight-calculator']={id:'freight-calculator',module:'logistics',title:'运费试算',type:'freight-quote'};
PAGES['logistics-cost']={id:'logistics-cost',module:'logistics',title:'物流费用',type:'logistics-costs'};
PAGES['invoice-management']={id:'invoice-management',module:'finance',title:'商业发票登记',type:'commercial-invoices'};
PAGES['currency-settings']={id:'currency-settings',module:'settings',title:'币种汇率',type:'exchange-rates'};
PAGES['accounts-receivable']={id:'accounts-receivable',module:'finance',title:'应收管理',type:'account-balances',balanceKind:'receivable'};
PAGES['accounts-payable']={id:'accounts-payable',module:'finance',title:'应付管理',type:'account-balances',balanceKind:'payable'};
PAGES['logistics-channel']={id:'logistics-channel',module:'logistics',title:'物流渠道',type:'logistics-directory',directoryKind:'channel'};
PAGES['carrier-management']={id:'carrier-management',module:'logistics',title:'承运商管理',type:'logistics-directory',directoryKind:'carrier'};
PAGES['supplier-quotation']={id:'supplier-quotation',module:'product',title:'供应商报价',type:'supplier-quotes'};
PAGES['purchase-supplier-quotation']={id:'purchase-supplier-quotation',module:'purchase',title:'供应商报价',type:'supplier-quotes'};
PAGES['ad-keywords']={id:'ad-keywords',module:'ads',title:'广告关键词',type:'ad-traffic',adDimension:'keywords'};
PAGES['ad-search-terms']={id:'ad-search-terms',module:'ads',title:'搜索词分析',type:'ad-traffic',adDimension:'search-terms'};
PAGES['ad-placement']={id:'ad-placement',module:'ads',title:'广告位分析',type:'ad-traffic',adDimension:'placement'};
PAGES['review-management']={id:'review-management',module:'service',title:'商品评论',type:'customer-voice',voiceKind:'reviews'};
PAGES['feedback-management']={id:'feedback-management',module:'service',title:'Feedback管理',type:'customer-voice',voiceKind:'feedback'};
PAGES['service-templates']={id:'service-templates',module:'service',title:'邮件模板',type:'service-templates'};
PAGES['inventory-aging']={id:'inventory-aging',module:'statistics',title:'库龄分析',type:'inventory-aging'};
PAGES['promotion-management']={id:'promotion-management',module:'sales',title:'促销活动',type:'sales-policies',policyKind:'promotion'};
PAGES['order-rules']={id:'order-rules',module:'sales',title:'订单规则',type:'sales-policies',policyKind:'rule'};
PAGES['target-management']={id:'target-management',module:'statistics',title:'目标管理',type:'sales-targets'};
const MODULES = [
 {id:'product',title:'产品',icon:'▣',groups:[{title:'产品资料',pages:['product-management','product-add','product-attributes','product-category','brand-management','product-tags']},{title:'在线商品',pages:['listing','supplier-quotation','product-archive','product-operation-log']},{title:'补货',pages:['replenishment']}]},
 {id:'sales',title:'销售',icon:'销',groups:[{title:'销售运营',pages:['sales-overview','listing-pairing','listing-quality','promotion-management']},{title:'订单',pages:['sales-orders','after-sales','refund-orders','order-rules']},{title:'日志',pages:['operation-logs']}]},
 {id:'fba',title:'FBA',icon:'F',groups:[{title:'发货流程',pages:['fba-plans','fba-shipments','fba-delivery-orders','overseas-plans']},{title:'库存与费用',pages:['fba-dashboard','fba-inventory','fba-reconciliation','fba-labels']}]},
 {id:'purchase',title:'采购',icon:'采',groups:[{title:'采购业务',pages:['purchase-plans','purchase-orders','purchase-amendments','purchase-approvals','receiving']},{title:'供应商',pages:['supplier-management','purchase-supplier-quotation','supplier-portal']},{title:'扩展采购',pages:['purchase-price','purchase-outsourcing','purchase-1688','purchase-requests']}]},
 {id:'warehouse',title:'仓库',icon:'仓',groups:[{title:'库存',pages:['inventory','warehouse-batches','stocktaking','stock-adjustment']},{title:'出入库',pages:['inbounds','outbounds','transfer-orders','quality-inspection']},{title:'仓库作业',pages:['scan-receiving','scan-outbound','warehouses']}]},
 {id:'logistics',title:'物流',icon:'物',groups:[{title:'物流业务',pages:['shipments','logistics-tracking','first-leg-orders']},{title:'物流工具',pages:['freight-calculator','logistics-channel','carrier-management','logistics-cost','logistics-aging']}]},
 {id:'ads',title:'广告',icon:'AD',groups:[{title:'广告管理',pages:['ad-dashboard','ad-campaigns','ad-performance','ad-budget']},{title:'广告分析',pages:['ad-keywords','ad-search-terms','ad-placement','ad-structure']}]},
 {id:'service',title:'客服',icon:'客',groups:[{title:'客服工作台',pages:['tickets','message-center','after-sales-tickets','email-statistics']},{title:'口碑与售后',pages:['rma-management','review-management','feedback-management','service-templates']}]},
 {id:'finance',title:'财务',icon:'¥',groups:[{title:'利润与结算',pages:['order-profit','settlement-profit','settlement-center','performance-report']},{title:'往来与资金',pages:['finance-flow','accounts-receivable','accounts-payable','payment-requests']},{title:'财务资料',pages:['cost-center','invoice-management']}]},
 {id:'statistics',title:'统计',icon:'统',groups:[{title:'经营统计',pages:['sales-stat','sales-ranking','product-performance','store-performance','target-management']},{title:'供应链分析',pages:['inventory-report','inventory-aging','replenishment-analysis','purchase-analysis']}]},
 {id:'bi',title:'BI',icon:'BI',groups:[{title:'商业智能',pages:['business-analysis','profit-dashboard','bi-data-model','bi-analysis','bi-app-builder','bi-screen','bi-report-center']}]},
 {id:'tools',title:'工具',icon:'工',groups:[{title:'效率工具',pages:['manual-testing','batch-tools','download-center','import-center','api-docs']},{title:'智能工具',pages:['chatgpt-copy','review-analysis','competitor-monitor','keyword-tool']}]},
 {id:'settings',title:'设置',icon:'设',groups:[{title:'账号与权限',pages:['store-auth','login-accounts','users','role-permissions','data-permissions','department-settings','employee-settings']},{title:'业务配置',pages:['warehouse-settings','system-settings','currency-settings','approval-settings','notification-settings']},{title:'安全审计',pages:['audit-logs']}]}
];
function modulePages(module){return (module.groups||[]).flatMap(function(group){return group.pages||[];});}

const PAGE_SCHEMAS={
 'product-management':{filters:['category','brand','supplier_name','status'],views:[['list','列表',''],['status','状态看板','status'],['supplier','供应商','supplier_name']]},
 'sales-orders':{filters:['platform','store_name','site','country','payment_status','fulfillment_status','carrier'],views:[['list','列表',''],['status','履约看板','status_text'],['store','店铺','store_name'],['platform','平台','platform']]},
 'purchase-orders':{filters:['supplier_name','warehouse_name','purchase_user','payment_status','qc_type'],views:[['list','列表',''],['status','采购状态','status_text'],['supplier','供应商','supplier_name']]},
 inbounds:{filters:['warehouse_name','supplier_name','qc_status','status_text'],views:[['list','列表',''],['status','入库状态','status_text'],['warehouse','仓库','warehouse_name']]},
 'fba-plans':{filters:['store_name','warehouse_name','destination','approval_status','status_text'],views:[['list','列表',''],['status','计划状态','status_text'],['store','店铺','store_name']]},
 'fba-shipments':{filters:['warehouse_name','country','site','carrier','amazon_status','status_text'],views:[['list','列表',''],['status','货件状态','status_text'],['warehouse','发货仓','warehouse_name']]},
 'fba-delivery-orders':{filters:['store_name','warehouse_name','destination','carrier','status_text'],views:[['list','列表',''],['status','发货状态','status_text'],['carrier','承运商','carrier']]},
 inventory:{filters:['warehouse_name','store_name','sku','fnsku'],views:[['list','列表',''],['warehouse','仓库','warehouse_name'],['store','店铺','store_name']]},
 listing:{filters:['platform','store_name','status_text','sku'],views:[['list','列表',''],['status','状态','status_text'],['platform','平台','platform']]},
 replenishment:{filters:['store_name','sku','urgency','status_text'],views:[['list','列表',''],['urgency','紧急度','urgency'],['store','店铺','store_name']]}
};
const FILTER_LABELS={category:'分类',brand:'品牌',supplier_name:'供应商',status:'产品状态',platform:'平台',store_name:'店铺',site:'站点',country:'国家/地区',payment_status:'支付/付款状态',fulfillment_status:'履约状态',carrier:'承运商',warehouse_name:'仓库',purchase_user:'采购员',qc_type:'质检类型',qc_status:'质检状态',status_text:'业务状态',destination:'目的仓',approval_status:'审批状态',amazon_status:'Amazon状态',sku:'SKU',fnsku:'FNSKU',urgency:'紧急度'};
Object.keys(PAGES).forEach(function(id){
 const page=PAGES[id],base=PAGE_SCHEMAS[id];
 page.filters=(base&&base.filters)||((page.columns||[]).map(function(c){return c.key;}).filter(function(k){return FILTER_LABELS[k];}).slice(0,6));
 page.views=(base&&base.views)||[['list','列表',''],['status','状态看板',(page.columns||[]).some(function(c){return c.key==='status_text';})?'status_text':(page.columns||[]).some(function(c){return c.key==='status';})?'status':'']];
});
const DETAIL_SCHEMAS={
 'product-management':[['产品资料',['sku','name','product_type','category','brand','model','style','color','size','season','status']],['销售资料',['price','retail_currency']],['采购与供应商',['supplier_name','moq','procurement_lead_days','cost','cost_currency']],['包装与报关',['default_carton_qty','carton_length','carton_width','carton_height','carton_weight','hs_code','customs_name','customs_price','origin_country']],['质检',['qc_method','qc_standard']]],
 'sales-orders':[['订单信息',['order_sn','platform_order_sn','platform','store_name','site','order_time','status_text']],['买家与收货',['buyer','phone','shipping_address','country']],['金额与履约',['currency','amount','payment_status','fulfillment_status','shipping_warehouse','delivery_method']],['物流与退款',['carrier','tracking_no','refund_status','remark']]],
 'purchase-orders':[['采购信息',['order_sn','custom_order_sn','supplier_name','warehouse_name','purchase_user','order_time','status_text']],['金额与费用',['purchase_currency','amount','tax_rate','freight','other_fee','allocation_method']],['付款与审批',['payment_status','payment_plan','qc_type']],['到货与物流',['planned_arrival','received_qty','pending_qty','logistics_provider','tracking_no','source_plan_no','remark']]],
 inbounds:[['入库信息',['order_sn','type','warehouse_name','purchase_order_sn','supplier_name','create_time','status_text']],['质检结果',['quantity','inspected_qty','available_qty','defective_qty','qc_status']],['成本分摊',['purchase_unit_price','freight','other_fee','allocation_method']],['物流',['logistics_provider','tracking_no','remark']]],
 'fba-plans':[['计划信息',['plan_no','channel','store_name','warehouse_name','destination','status_text']],['数量与审批',['sku_count','quantity','locked_quantity','approval_status']],['来源与时间',['shipment_id','source_recommendation_no','etd','eta']]],
 'fba-shipments':[['货件信息',['shipment_id','shipment_name','shipment_type','amazon_status','status_text']],['仓库与站点',['warehouse_name','destination','country','site']],['物流信息',['carrier','tracking_no','logistics_channel','expected_ship_date','expected_arrival_date']],['箱件与费用',['box_count','total_weight','total_volume','head_freight','received_qty']]],
 'fba-delivery-orders':[['发货单信息',['delivery_order_no','shipment_id','plan_no','store_name','status_text']],['仓库与物流',['warehouse_name','destination','carrier','tracking_no']],['数量与费用',['shipped_qty','received_qty','box_count','head_freight']],['时间与备注',['shipped_at','received_at','remark']]]
};
Object.keys(DETAIL_SCHEMAS).forEach(function(id){PAGES[id].detailSections=DETAIL_SCHEMAS[id];});

const state = {module:'home',page:'dashboard',tabs:['dashboard'],rows:[],total:0,offset:0,pageSize:50,query:'',status:'全部',editing:null,token:sessionStorage.getItem('erp_access_token')||'',context:null,pendingRecord:null,searchField:'all',filters:{date_from:'',date_to:''},view:'list',importSummary:null,columnManagerOpen:false,columnDraft:null,selectedIds:new Set(),activeRequest:null,searchTimer:null,reportRows:[],reportGranularity:'day',reportCompact:false,reportFilters:{store_name:'',site:'',sku:'',date_from:'',date_to:''},reportExport:{headers:[],rows:[]}};
function columnStorageKey(page){return 'lingxing.columns.v2.'+page.id;}
function defaultColumnConfig(page){return {version:2,order:(page.columns||[]).map(function(c){return c.key;}),hidden:(page.columns||[]).filter(c=>c.extraColumn).map(c=>c.key),pinnedLeft:[]};}
function normalizeColumnConfig(page,input){
 const defaults=defaultColumnConfig(page),allowed=new Set(defaults.order),saved=input&&input.version===2?input:{};
 const order=(saved.order||[]).filter(function(k){return allowed.has(k);});defaults.order.forEach(function(k){if(!order.includes(k))order.push(k);});
 const hidden=(saved.hidden||defaults.hidden).filter(function(k){return allowed.has(k);});
 const pinnedLeft=(saved.pinnedLeft||[]).filter(function(k){return allowed.has(k)&&!hidden.includes(k);});
 return {version:2,order:order,hidden:hidden,pinnedLeft:pinnedLeft};
}
function getColumnConfig(page){try{return normalizeColumnConfig(page,JSON.parse(localStorage.getItem(columnStorageKey(page))||'null'));}catch(error){return defaultColumnConfig(page);}}
function saveColumnConfig(page,config){localStorage.setItem(columnStorageKey(page),JSON.stringify(normalizeColumnConfig(page,config)));state.columnDraft=null;state.columnManagerOpen=false;renderTable(page);}
function getVisibleColumns(page){const config=getColumnConfig(page),byKey=new Map((page.columns||[]).map(function(c){return [c.key,c];}));const visible=config.order.filter(function(k){return !config.hidden.includes(k);});const ordered=config.pinnedLeft.concat(visible.filter(function(k){return !config.pinnedLeft.includes(k);}));return ordered.map(function(k){const column=byKey.get(k);return column?Object.assign({},column,{pinned:config.pinnedLeft.includes(k)}):null;}).filter(Boolean);}
function columnCellAttrs(column,index,header){if(!column.pinned)return '';const pinnedIndex=getVisibleColumns(PAGES[state.page]).slice(0,index).filter(function(c){return c.pinned;}).length;return ' class="pinned-left" style="left:'+(34+pinnedIndex*160)+'px;z-index:'+(header?5:3)+'"';}
function moveColumnDraft(key,direction){const order=state.columnDraft.order,index=order.indexOf(key),next=index+direction;if(index<0||next<0||next>=order.length)return;const swap=order[next];order[next]=key;order[index]=swap;renderTable(PAGES[state.page]);}
function columnManager(page){
 const config=state.columnDraft||getColumnConfig(page);state.columnDraft=normalizeColumnConfig(page,config);const byKey=new Map((page.columns||[]).map(function(c){return [c.key,c];}));
 return '<div class="column-manager" '+(state.columnManagerOpen?'':'hidden')+'><header><b>列管理</b><button data-column-reset>恢复默认</button></header><p>显示、排序与左固定均按页面保存</p><div class="column-options">'+state.columnDraft.order.map(function(key,index){const item=byKey.get(key);if(!item)return '';const shown=!state.columnDraft.hidden.includes(key),pinned=state.columnDraft.pinnedLeft.includes(key);return '<div class="column-option"><label><input type="checkbox" data-column-key="'+esc(key)+'" '+(shown?'checked':'')+'>'+esc(item.label)+'</label><span><button data-column-move="-1" data-column-name="'+esc(key)+'" '+(index===0?'disabled':'')+' title="上移">↑</button><button data-column-move="1" data-column-name="'+esc(key)+'" '+(index===state.columnDraft.order.length-1?'disabled':'')+' title="下移">↓</button><button data-column-pin="'+esc(key)+'" class="'+(pinned?'active':'')+'">'+(pinned?'已固定':'左固定')+'</button></span></div>';}).join('')+'</div><footer><button data-column-cancel>取消</button><button class="primary" data-column-apply>应用</button></footer></div>';
}

function toast(message, type) {
  const node=document.createElement('div'); node.className='toast '+(type || ''); node.textContent=message;
  $('#toast-region').appendChild(node); setTimeout(function(){node.remove();},2600);
}
async function createSession(role, appId, appSecret) {
  let response;
  if(!appId||!appSecret)throw new Error('请输入登录账号与密码');
  if(appId && appSecret){
    const body=new URLSearchParams({appId:appId,appSecret:appSecret});
    response=await fetch(BASE+'/api/auth-server/oauth/access-token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body,signal:AbortSignal.timeout(20000)});
  }else{
    response=await fetch(BASE+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:role || 'administrator'})});
  }
  const data=await response.json();
  if(!response.ok || !data.data) throw new Error(data.message || '登录失败');
  state.token=data.data.access_token; sessionStorage.setItem('erp_access_token',state.token);sessionStorage.setItem('erp_refresh_token',data.data.refresh_token||data.data.refreshToken||'');sessionStorage.setItem('erp_app_id',appId||''); if(data.data.user){accessIdentity=data.data.user;$('#account-button').textContent=data.data.user.username+' · '+data.data.user.role_name;} return state.token;
}
async function ensureSession() {
  if(state.token) return state.token;
  if(!$('#login-dialog').open) $('#login-dialog').showModal();
  throw new Error('请先登录');
}
let refreshPromise=null;
async function refreshSession(){
 if(refreshPromise)return refreshPromise;
 refreshPromise=(async()=>{const refreshToken=sessionStorage.getItem('erp_refresh_token'),appId=sessionStorage.getItem('erp_app_id');if(!refreshToken||!appId)throw Error('登录已过期');const response=await fetch(BASE+'/api/auth-server/oauth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appId,refreshToken})});const data=await response.json();if(!response.ok||!data.data)throw Error('登录已过期');state.token=data.data.access_token;sessionStorage.setItem('erp_access_token',state.token);sessionStorage.setItem('erp_refresh_token',data.data.refresh_token||data.data.refreshToken||'');})();
 try{await refreshPromise;}finally{refreshPromise=null;}
}
function clearSession(){accessIdentity=null;state.token='';['erp_access_token','erp_refresh_token','erp_app_id'].forEach(k=>sessionStorage.removeItem(k));}
const pendingWrites=new Set();
async function api(path,options){
 const method=(options?.method||'GET').toUpperCase();
 if(method==='GET'||method==='HEAD'||!path.startsWith('/api/v1/'))return apiRequest(path,options);
 const key=method+'|'+path;
 if(pendingWrites.has(key))throw Error('操作正在提交，请勿重复点击');
 pendingWrites.add(key);
 try{return await apiRequest(path,options);}finally{pendingWrites.delete(key);}
}
async function apiRequest(path,options){
 const token=await ensureSession(),config=options||{},headers=new Headers(config.headers||{});headers.set('Authorization','Bearer '+token);
 const timeout=AbortSignal.timeout(20000),signal=config.signal?AbortSignal.any([config.signal,timeout]):timeout;
 let response;
 try{response=await fetch(BASE+path,{...config,headers,signal});}
 catch(error){if(timeout.aborted)throw Error((config.method&&config.method!=='GET')?'请求超时，写入结果未知，请先查询单据，勿重复提交':'查询超时，请重试');throw error;}
 if(response.status===401&&!config._retried){try{await refreshSession();return apiRequest(path,{...config,_retried:true});}catch(error){clearSession();if(!$('#login-dialog').open)$('#login-dialog').showModal();throw Error('会话已失效，请重新登录；表单内容已保留，请勿重复提交未知结果');}}
 let data;try{data=await response.json();}catch(error){throw Error('服务暂不可用（HTTP '+response.status+'），写入结果未知时请先查询，勿重复创建');}
 if(response.status===401){clearSession();if(!$('#login-dialog').open)$('#login-dialog').showModal();}
 if(!response.ok)throw Error(data.message||data.error||'HTTP '+response.status);return data;
}

function renderRail() {
  $('#module-nav').innerHTML=MODULES.map(function(module){
    return '<button data-module="'+module.id+'" title="'+module.title+'"><i>'+module.icon+'</i><span>'+module.title+'</span></button>';
  }).join('');
  document.querySelectorAll('.module-rail [data-module]').forEach(function(button){
    button.classList.toggle('active',button.dataset.module===state.module);
  });
}
function renderTabs() {
  const tabs=['dashboard'].concat(state.tabs.filter(function(id){return id!=='dashboard';}));
  $('#page-tabs').innerHTML=tabs.map(function(id){
    const page=PAGES[id]; const active=id===state.page&&!state.detailRecordId;
    return '<button class="'+(active?'active':'')+'" data-page="'+id+'">'+esc(page.title)+(id==='dashboard'?'':'<span data-close="'+id+'">×</span>')+'</button>';
  }).join('')+DocumentWorkspace.tabsHtml()+'<button class="tab-add" data-page="api-docs" aria-label="开放接口">＋</button>';
}
function showModuleMenu(moduleId) {
  const module=MODULES.find(function(item){return item.id===moduleId;});
  if(!module){$('#module-menu').classList.remove('open');return;}
  $('#module-menu').innerHTML='<div class="menu-title"><span>'+esc(module.title)+'中心 <small>'+modulePages(module).length+' 项</small></span><button id="menu-close">×</button></div><div class="menu-scroll">'+module.groups.map(function(group){return '<section class="menu-group"><h3>'+esc(group.title)+'</h3><div class="menu-grid">'+group.pages.map(function(id){const page=PAGES[id];return '<button data-page="'+id+'" class="'+(state.page===id?'active':'')+'"><b>'+esc(page.title)+'</b><small>'+esc(page.menuDescription||'查看'+page.title)+'</small></button>';}).join('')+'</div></section>';}).join('')+'</div>';
  $('#module-menu').classList.add('open');
}
function pageHistoryState() {
  return {page:state.page,recordId:state.detailRecordId||null,list:{query:state.query,status:state.status,offset:state.offset,pageSize:state.pageSize,searchField:state.searchField,filters:{...state.filters},filtersOpen:!!state.filtersOpen,view:state.view}};
}
function rememberPageHistory() {
  DocumentWorkspace.snapshot();
  history.replaceState(pageHistoryState(),'',location.pathname+location.search+BusinessWorkspace.route(state.page,state.detailRecordId));
}
function selectPage(id, options) {
  const page=PAGES[id]; if(!page)return;
  const config=options || {};
  if(!config.skipHistory)rememberPageHistory();
  $('#workspace').removeAttribute('aria-busy');$('#workspace').dataset.tablePage='';
  if(state.detailRequest)state.detailRequest.abort();
  if($('#detail-dialog').open)$('#detail-dialog').close();
  if(state.activeRequest)state.activeRequest.abort();clearTimeout(state.searchTimer);state.page=id;state.module=page.module;state.query=config.query||'';state.status=config.status||'全部';state.offset=0;state.searchField='all';state.filters={date_from:'',date_to:''};state.filtersOpen=false;state.menuOpen=false;state.columnManagerOpen=false;state.columnDraft=null;state.view=(page.views&&page.views[0]&&page.views[0][0])||'list';state.importSummary=null;state.selectedIds=new Set();
  state.detailRecordId=config.recordId||null;state.detailRecord=null;state.detailTab=null;state.searchComposing=false;
  const saved=config.restore;
  if(saved&&typeof saved==='object'){
    state.query=typeof saved.query==='string'?saved.query:'';state.status=typeof saved.status==='string'?saved.status:'全部';
    state.pageSize=[50,100,200].includes(saved.pageSize)?saved.pageSize:50;
    state.offset=Number.isSafeInteger(saved.offset)&&saved.offset>=0?saved.offset:0;
    state.searchField=['all',...(page.columns||[]).map(c=>c.key)].includes(saved.searchField)?saved.searchField:'all';
    for(const key of ['date_from','date_to',...(page.filters||[])])if(typeof saved.filters?.[key]==='string')state.filters[key]=saved.filters[key];
    state.filtersOpen=!!saved.filtersOpen;
    if((page.views||[]).some(v=>v[0]===saved.view))state.view=saved.view;
  }
  if(state.tabs.indexOf(id)<0)state.tabs.push(id);
  if(!config.skipHistory)history.pushState(pageHistoryState(),'',location.pathname+location.search+BusinessWorkspace.route(id,state.detailRecordId));
  $('#module-menu').classList.remove('open');renderRail();renderTabs();const rendered=renderPage();
  return rendered;
}

const BULK_ACTIONS={
  products:[{label:'批量上架',field:'status',value:'在售'},{label:'批量停售',field:'status',value:'停售'}],
  replenishment:[{label:'标记待复核',field:'status_text',value:'待复核'},{label:'标记库存充足',field:'status_text',value:'库存充足'}],
  'sales-orders':[],
  'purchase-orders':[{label:'批量标记待采购',field:'status_text',value:'待采购'},{label:'批量作废',field:'status_text',value:'已作废'}],
  'inbound-orders':[{label:'批量入库',field:'status_text',value:'已入库'}],
  shipments:[{label:'批量标记运输中',field:'status_text',value:'运输中'},{label:'批量签收',field:'status_text',value:'已签收'}],
  'shipping-plans':[{label:'批量完成',field:'status_text',value:'已完成'}],
  'fba-delivery-orders':[{label:'批量标记运输中',field:'status_text',value:'运输中'},{label:'批量签收',field:'status_text',value:'已签收'}]
};
const COPY_KEYS={products:'sku',listings:'listing_id',suppliers:'supplier_code',warehouses:'warehouse_code',shipments:'shipment_id','shipping-plans':'plan_no','purchase-orders':'order_sn','sales-orders':'order_sn','inbound-orders':'order_sn','outbound-orders':'order_sn','fba-delivery-orders':'delivery_order_no'};
function pageBulkActions(page){return page.readonly||page.resource==='purchase-orders'?[]:(BULK_ACTIONS[page.resource]||[]);}
async function deleteRecord(row,page){if(!await erpConfirm('确认删除 '+page.title+' #'+row.id+'？此操作不会自动冲销关联单据或库存，请仅删除确认可清理的测试记录。'))return;try{await api('/api/v1/'+page.resource+'/'+row.id,{method:'DELETE'});toast('记录已删除');loadTable(page);}catch(error){toast(error.message,'error');}}
function copyRecord(row, page) {
  const copy=Object.assign({},row,{id:null}); const key=COPY_KEYS[page.resource];
  if(key && copy[key])copy[key]=String(copy[key])+'-COPY';
  Object.keys(copy).forEach(function(k){if(['created_at','updated_at','tenant_id','extra'].includes(k))delete copy[k];});if(copy.item_list)copy.item_list=structuredClone(copy.item_list);
  return copy;
}
function searchFieldOptions(page) {
  const columns=(page.columns||[]).filter(column=>!column.viewColumn); const available=new Set(columns.map(function(column){return column.key;}));
  const preferred=[['order_sn','单据号'],['sku','SKU'],['name','品名'],['tracking_no','物流单号']];
  const base=[['all','全部字段']].concat(preferred.filter(function(item){return available.has(item[0]);}));
  const seen=new Set(base.map(function(item){return item[0];}));
  columns.forEach(function(column){if(!seen.has(column.key)){base.push([column.key,column.label]);seen.add(column.key);}});
  return base.map(function(item){return '<option value="'+esc(item[0])+'" '+(state.searchField===item[0]?'selected':'')+'>'+esc(item[1])+'</option>';}).join('');
}
function renderSchemaFilters(page){const keys=(page.filters||[]).filter(function(k){return k!=='status'&&k!=='status_text';});return '<div class="advanced-filters" '+(state.filtersOpen?'':'hidden')+'>'+keys.map(function(key){const label=FILTER_LABELS[key]||key;const options=(page.fields||[]).find(function(f){return f.key===key;});if(options&&options.type==='select')return '<label>'+esc(label)+'<select data-filter="'+esc(key)+'"><option value="">全部</option>'+options.options.map(function(v){return '<option '+(state.filters[key]===v?'selected':'')+'>'+esc(v)+'</option>';}).join('')+'</select></label>';return '<label>'+esc(label)+'<input data-filter="'+esc(key)+'" value="'+esc(state.filters[key]||'')+'"></label>';}).join('')+'<label>开始日期<input type="date" data-filter="date_from" value="'+esc(state.filters.date_from||'')+'"></label><label>结束日期<input type="date" data-filter="date_to" value="'+esc(state.filters.date_to||'')+'"></label><button class="primary" data-apply-filters>应用筛选</button></div>';}
function renderViews(page){return (page.views||[['list','列表','']]).map(function(view){return '<button data-view="'+esc(view[0])+'" class="'+(state.view===view[0]?'active-view':'')+'">'+esc(view[1])+'</button>';}).join('');}
function renderMoreMenu(page,bulk){
  return '<span class="toolbar-dropdown"><button data-more aria-expanded="'+Boolean(state.menuOpen)+'" '+(!page.readonly&&((page.fields&&page.fields.length)||bulk.length)?'':'hidden')+'>更多⌄</button><div class="toolbar-menu" '+(state.menuOpen?'':'hidden')+'>'+((page.fields&&!page.readonly)?'<button data-copy>复制选中</button>':'')+bulk.map(action=>'<button data-bulk-field="'+esc(action.field)+'" data-bulk-status="'+esc(action.value)+'">'+esc(action.label)+'</button>').join('')+'</div></span>';
}
function tablePagination(rows){
  const total=Number(state.total),pages=Math.max(1,Math.ceil(total/state.pageSize)),current=Math.floor(state.offset/state.pageSize)+1;
  return '<div class="pagination"><b>总计 '+total+' 条</b><button data-page-prev aria-label="上一页" '+(current<=1?'disabled':'')+'>‹</button><span>第 '+current+' / '+pages+' 页</span><button data-page-next aria-label="下一页" '+(current>=pages?'disabled':'')+'>›</button><select data-page-size aria-label="每页条数">'+[50,100,200].map(n=>'<option '+(state.pageSize===n?'selected':'')+'>'+n+'</option>').join('')+'</select><label>前往 <input data-page-jump type="number" min="1" max="'+pages+'" aria-label="前往页码" value="'+current+'"> 页</label></div>';
}
function pageChrome(page, body, options) {
  const config=options || {}; const statuses=page.statuses || []; const bulk=pageBulkActions(page);
  return '<section class="page">'+
    scopeNotice(page)+(statuses.length?'<div class="status-tabs">'+statuses.map(function(status){return '<button class="'+(state.status===status?'active':'')+'" data-status="'+esc(status)+'">'+esc(status)+'</button>';}).join('')+'</div>':'')+
    (config.hideFilters?'':'<div class="filter-bar"><label>搜索字段<select id="search-field" aria-label="搜索字段">'+searchFieldOptions(page)+'</select></label><label><input id="table-search" value="'+esc(state.query)+'" placeholder="输入关键词搜索"><span>⌕</span></label><button class="filter-icon" data-advanced-filter title="高级筛选">高级筛选 ▽</button><button data-reset>重置</button></div>'+renderSchemaFilters(page))+
    '<div class="page-toolbar"><div><button class="primary" data-create '+(!page.primary?'hidden':'')+'>'+esc(page.primary || '新建')+'</button><button data-import '+(!page.fields||page.readonly?'hidden':'')+'>导入CSV</button><button data-import-template '+(!page.fields||page.readonly?'hidden':'')+'>下载模板</button><button data-export="filtered">导出筛选结果</button><button data-export="selected">导出已选</button><button data-print>打印</button>'+renderMoreMenu(page,bulk)+'</div><div>'+renderViews(page)+'<button data-column-manager>列管理</button><button class="icon-only" aria-label="刷新列表">↻</button><button class="icon-only" aria-label="筛选帮助">?</button></div></div>'+columnManager(page)+
    (state.importSummary?'<div class="import-summary '+esc(state.importSummary.type||'')+'"><b>'+esc(state.importSummary.title)+'</b><span>'+esc(state.importSummary.message)+'</span><button data-dismiss-import aria-label="关闭导入结果">×</button></div>':'')+body+'</section>';
}
function displayValue(column,row) {
  if(column.viewColumn){
    const data=row._presentation||{},dims=data.dimensions||{},product=data.product||{};
    if(column.key==='_msku')return '<div class="bw-product-cell"><div><button class="link" data-detail="'+row.id+'">'+esc(dims.seller_sku||'未维护 MSKU')+'</button><span>'+esc(dims.fnsku||'—')+'</span></div></div>';
    if(column.key==='_product')return '<div class="bw-product-cell"><div><span class="bw-product-name">'+esc(product.name||'—')+'</span><button class="link" data-smart-link="sku" data-smart-value="'+esc(row.sku)+'">'+esc(row.sku||'—')+'</button></div></div>';
    if(column.key==='_image'){const image=BusinessWorkspace.safeImage(product.image_url);return image?'<img class="bw-list-image" loading="lazy" src="'+esc(image)+'" alt="'+esc(product.name)+'">':'—';}
    return esc(dims[column.key.slice(1)]||product[column.key.slice(1)]||'—');
  }
  if(PAGES[state.page].resource==='products'&&column.key==='sku'){
    const image=BusinessWorkspace.safeImage(row.image_url);
    return '<div class="bw-product-cell">'+(image?'<img loading="lazy" src="'+esc(image)+'" alt="'+esc(row.name)+'">':'<span class="bw-thumb">无图</span>')+'<div><span class="bw-product-name" title="'+esc(row.name)+'">'+esc(row.name||'—')+'</span><button class="link" data-detail="'+row.id+'">'+esc(row.sku)+'</button></div></div>';
  }
  let value=row[column.key];
  if(value == null || value==='' || String(value).toLowerCase()==='null')value='—';
  if(state.page==='product-management' && column.key==='status')value=value==='启用'?'在售':(value==='停用'?'停售':value);
  if(value==='—')return '—';
  if(column.kind==='money'){
    const currency=row.currency||row.purchase_currency;
    if(PAGES[state.page].resource==='listings'&&!currency)return '<span class="number" title="原始记录未提供币种">'+Number(value||0).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>';
    return '<span class="number">'+money(value,currency)+'</span>';
  }
  if(column.kind==='percent')return '<span class="number">'+Number(value || 0).toFixed(2)+'%</span>';
  if(column.kind==='status')return '<span class="state '+statusClass(value)+'">'+esc(value || '—')+'</span>';
  if(column.kind==='link')return '<button class="link" data-detail="'+row.id+'">'+esc(value || '—')+'</button>';
  if(['order_sn','purchase_order_sn','shipment_id','sku','fnsku','warehouse_name','supplier_name','tracking_no','reference_no'].indexOf(column.key)>=0 && value!=='—') return '<button class="link" data-smart-link="'+esc(column.key)+'" data-smart-value="'+esc(value)+'">'+esc(value)+'</button>';
  if(column.key==='type' && typeof value==='number') value=value===1?'采购入库':'其他入库';
  if(typeof value==='object') value=JSON.stringify(value);
  return esc(value);
}
const DETAIL_LABELS={
  products:{sku:'SKU',name:'品名',supplier_name:'主供应商',hs_code:'HSCODE',customs_name:'报关名称',customs_price:'申报单价',origin_country:'原产国',qc_method:'质检方式',qc_standard:'质检标准',moq:'起订量',procurement_lead_days:'采购交期(天)'},
  sales_orders:{order_sn:'内部订单号',platform_order_sn:'平台订单号',platform:'平台',store_name:'店铺',country:'收货国家',buyer:'买家',shipping_address:'收货地址',payment_status:'支付状态',fulfillment_status:'履约状态',shipping_warehouse:'发货仓',delivery_method:'配送方式',tracking_no:'跟踪号',carrier:'承运商',amount:'订单金额'},
  purchase_orders:{order_sn:'采购单号',supplier_name:'供应商',warehouse_name:'采购仓库',purchase_user:'采购员',amount:'含税金额',tax_rate:'税率',freight:'运费',other_fee:'其他费用',allocation_method:'费用分摊方式',qc_type:'质检类型',received_qty:'已到货',pending_qty:'待到货',payment_status:'付款状态',status_text:'采购状态'},
  inbound_orders:{order_sn:'入库单号',warehouse_name:'仓库',purchase_order_sn:'采购单号',supplier_name:'供应商',quantity:'入库数量',inspected_qty:'待检量',available_qty:'可用量',defective_qty:'次品量',qc_status:'质检状态'},
  shipments:{shipment_id:'货件编号',shipment_name:'货件名称',destination:'目的仓',amazon_status:'Amazon状态',tracking_no:'追踪号',box_count:'箱数',total_weight:'总重量',head_freight:'头程费用',received_qty:'平台接收数量'},
  fba_delivery_orders:{delivery_order_no:'发货单号',shipment_id:'货件编号',plan_no:'计划编号',destination:'目的仓',tracking_no:'追踪号',shipped_qty:'发货数量',received_qty:'接收数量',box_count:'箱数',head_freight:'头程费用'},
  replenishment:{recommendation_no:'建议编号',sku:'SKU',fnsku:'FNSKU',daily_sales:'日均销量',local_available:'本地可用',overseas_available:'海外仓可用',fba_available:'FBA可用',inbound:'在途',suggested_qty:'建议数量',stockout_date:'预计断货日'}
};
function detailLabel(resource,key){
  const apparelLabels={style:'款式编码',color:'颜色',size:'尺码',season:'季节',retail_currency:'销售币种',cost_currency:'成本币种',synthetic:'拟真数据',msku:'MSKU',batch:'数据批次'};
  if(apparelLabels[key])return apparelLabels[key];
  if(['purchase-orders','supplier-deliveries','inbound-orders'].includes(resource)&&key==='price')return '采购价格（原字段）';
  const businessLabels={unit_price:'单价',price:'售价',product_name:'品名',name:'名称',fnsku:'FNSKU',asin:'ASIN',parent_asin:'父ASIN',seller_sku:'MSKU',spu:'SPU',spu_name:'款名',attributes:'变体属性',owner_ids:'负责人',official_attributes:'产品扩展资料',image_url:'产品图片',default_carton_qty:'单箱数量',carton_length:'外箱长(cm)',carton_width:'外箱宽(cm)',carton_height:'外箱高(cm)',carton_weight:'外箱重(kg)',available_qty:'良品数量',defective_qty:'次品数量',inspected_qty:'待检数量',received_qty:'已收数量',purchase_unit_price:'采购单价',unit:'单位',material:'产品材质',total_qty:'通知收货量',inspection_type:'质检类型',qc_status:'质检状态',created_by:'创建人',updated_by:'更新人',listing_id:'Listing ID',line_no:'行号',quantity:'数量',amount:'金额',remarks:'备注',customs_name:'报关名称',box_count:'箱数',box_qty:'装箱数量',tax_price:'含税单价',tax_rate:'税率(%)',planned_arrival:'预计到货时间',sid:'店铺ID',supplier_id:'供应商ID',owner:'负责人',developer:'开发人',tag:'产品标签',description:'产品描述',identifier:'识别码',status:'状态',item_list:'商品明细',purchase_currency:'采购币种',freight:'运费',other_fee:'其他费用',payment_plan:'付款计划',qc_type:'质检类型'};
  if(businessLabels[key])return businessLabels[key];
  const named=DETAIL_LABELS[resource]||DETAIL_LABELS[resource.replaceAll('-','_')];
  if(named&&named[key])return named[key];
  const page=Object.values(PAGES).find(p=>p.resource===resource&&!p.aliasOf);
  const field=page&&[...(page.columns||[]),...(page.fields||[])].find(f=>f.key===key&&f.label!==key);
  if(field)return field.label;
  const common={id:'记录ID',tenant_id:'组织ID',created_at:'创建时间',updated_at:'更新时间',extra:'扩展字段',item_list:'商品明细',
    batch_no:'库存批次',wid:'仓库ID',warehouse_name:'仓库',product_id:'商品ID',sku:'SKU',fnsku:'FNSKU',store_id:'店铺ID',store_name:'店铺',quantity:'数量',available:'可用数量',
    source_batch_no:'来源批次',order_sn:'单据编号',status_text:'状态',currency:'币种',amount:'金额',type:'业务类型',reference_no:'关联单号',counterparty:'交易对方',
    occurred_at:'发生时间',economics:'订单收益',payment_status:'付款状态',fulfillment_status:'履约状态',shipping_warehouse:'发货仓',platform_order_sn:'平台订单号',
    platform:'平台',site:'站点',buyer:'买家',phone:'联系电话',shipping_address:'收货地址',refund_status:'退款状态',remark:'备注',country:'国家/地区'};
  return common[key]||key;
}
function statusClass(value) {
  const text=String(value || '');
  if(/驳回|失败|停用|停售|作废|取消|P0/.test(text))return 'danger';
  if(/待|未|中|部分|P1|草稿/.test(text))return 'warning';
  if(/完成|通过|授权|启用|在线|合作|签收|入库|出库|解决|收货|投放/.test(text))return 'success';
  if(/驳回|失败|停用|停售|低|P0/.test(text))return 'danger';
  if(/待|中|部分|P1|草稿/.test(text))return 'warning';
  return 'neutral';
}
// Filtering is performed by the API. Keeping this renderer-side function as a
// no-op preserves a single pagination/total contract and prevents double filtering.
function filteredRows(){return state.rows;}
function replaceTableMarkup(page,html){
  const root=$('#workspace'),active=document.activeElement;
  const search=active?.id==='table-search'?{start:active.selectionStart,end:active.selectionEnd}:null;
  const left=root.querySelector('.table-shell')?.scrollLeft||0;
  root.innerHTML=html;root.dataset.tablePage=page.id;root.removeAttribute('aria-busy');
  const table=root.querySelector('.table-shell');if(table)table.scrollLeft=left;
  if(search){const input=root.querySelector('#table-search');input?.focus({preventScroll:true});input?.setSelectionRange(search.start,search.end);}
}
function pendingTable(page,message){
  const root=$('#workspace');
  if(root.dataset.tablePage!==page.id||!root.querySelector('.table-shell,.board-grid'))return false;
  root.setAttribute('aria-busy','true');
  root.querySelectorAll('.table-shell,.board-grid,.pagination,.page-toolbar').forEach(node=>{node.inert=true;});
  let notice=root.querySelector('.list-request-status');
  if(!notice){notice=document.createElement('div');notice.className='list-request-status';notice.setAttribute('role','status');root.prepend(notice);}
  notice.textContent=message||'正在更新列表…';return true;
}
function renderTable(page) {
  const rows=filteredRows(); const visibleColumns=getVisibleColumns(page);
  if(state.view!=='list'){
    const view=(page.views||[]).find(function(item){return item[0]===state.view;})||['status','看板','status_text'];const groupKey=view[2]||'status_text';
    const groupOf=row=>page.resource==='inventory'&&['status','status_text'].includes(groupKey)?(Number(row.available)<=0?'无可用库存':Number(row.available)<100?'低库存':'库存充足'):(row[groupKey]||'未分类');
    const statuses=[...new Set(rows.map(groupOf))];
    const board='<div class="board-grid">'+statuses.map(function(status){const grouped=rows.filter(function(row){return groupOf(row)===status;});return '<article class="board-column"><header><b>'+esc(status)+'</b><span>本页 '+grouped.length+' 条</span></header>'+grouped.map(function(row){return '<button class="board-card" data-detail="'+row.id+'"><b>'+esc(row[page.columns[0].key]||row.id)+'</b><span>'+esc(row[page.columns[1]&&page.columns[1].key]||'')+'</span><small>'+esc(row[page.columns[2]&&page.columns[2].key]||'')+'</small></button>';}).join('')+'</article>';}).join('')+'</div>';
    replaceTableMarkup(page,pageChrome(page,board+tablePagination(rows))); return;
  }
  const pageCount=Math.max(1,Math.ceil((state.total || rows.length)/state.pageSize));
  const currentPage=Math.floor(state.offset/state.pageSize)+1;
  const table=(['inbound-orders','outbound-orders'].includes(page.resource)?'<button data-stock-batch="'+esc(page.resource)+'">已选单据批量过账（逐单结果）</button>':'')+'<div class="table-shell"><table><thead><tr><th class="check"><input type="checkbox" aria-label="全选"></th>'+
    visibleColumns.map(function(column,index){return '<th'+columnCellAttrs(column,index,true)+'>'+esc(column.label)+(column.pinned?' <small>固定</small>':'')+'</th>';}).join('')+'<th class="actions-col">操作</th></tr></thead><tbody>'+
    rows.map(function(row){
      let actions='<button class="link" data-detail="'+row.id+'">详情</button>'+fbaActions(page,row);
      if(page.resource==='sales-orders')actions+=salesWorkflowButton(row);
      if(page.resource==='listings')actions+=listingDimensionButton(row);
      if(page.resource==='supplier-deliveries')actions+=receivingButtons(row);
      if(['inbound-orders','outbound-orders'].includes(page.resource))actions+='<button class="link" data-stock-confirm="'+esc(page.resource)+'" data-id="'+row.id+'">确认库存过账</button><button class="link" data-stock-ledger="'+esc(page.resource)+'" data-id="'+row.id+'">库存流水</button>';
      if(page.resource==='purchase-orders'){
        actions+=purchaseSettlementButtons(row);
        if(['','待提交','已驳回'].includes(row.status_text||''))actions+='<button class="link" data-workflow="purchase-submit" data-id="'+row.id+'">提交审批</button>';
        if(row.status_text==='待下单')actions+='<button class="link" data-workflow="purchase-place-order" data-id="'+row.id+'">确认下单</button>';
        if(!['已完成','已作废','部分入库'].includes(row.status_text))actions+='<button class="link danger-text" data-workflow="purchase-void" data-id="'+row.id+'">作废</button>';
      }
      if(page.id==='purchase-plans' || page.id==='replenishment')actions+='<button class="link" data-workflow="purchase" data-id="'+row.id+'">生成采购单</button>';
      else if(page.id==='fba-shipments')actions+='<span>请从已审批FBA计划生成发货单</span>';
      else if(page.id==='receiving' && row.status_text!=='已收货')actions+='<button class="link" data-workflow="receive" data-id="'+row.id+'">确认收货</button>';
      else if(page.id==='purchase-approvals' && row.status_text==='审批中')actions+='<button class="link" data-workflow="approve" data-id="'+row.id+'">通过</button><button class="link danger-text" data-workflow="reject" data-id="'+row.id+'">驳回</button>';
      if(!page.readonly && page.fields&&!(page.resource==='users'&&Number(row.id)===1))actions+='<button class="link" data-edit="'+row.id+'">编辑</button>';
      return '<tr><td class="check"><input type="checkbox" data-row-id="'+esc(row.id)+'" '+(state.selectedIds.has(String(row.id))?'checked':'')+' aria-label="选择 '+esc(row.id)+'"></td>'+visibleColumns.map(function(column,index){return '<td'+columnCellAttrs(column,index,false)+'>'+displayValue(column,row)+'</td>';}).join('')+'<td class="row-actions">'+actions+'<button class="link" data-row-menu="'+esc(row.id)+'">操作⌄</button></td></tr>';
    }).join('')+'</tbody></table>'+(rows.length?'':'<div class="empty-state"><b>暂无匹配数据</b><span>请调整筛选条件后重试</span></div>')+'</div>'+
    tablePagination(rows);
  replaceTableMarkup(page,pageChrome(page,table));
}
async function loadTable(page) {
  if(state.detailRecordId&&page.id===state.page)return showDetail({id:state.detailRecordId},page.resource);
  rememberPageHistory();
  if(state.activeRequest)state.activeRequest.abort();const controller=new AbortController();state.activeRequest=controller;
  const retained=pendingTable(page);
  if(!retained)$('#workspace').innerHTML='<div class="loading" role="status"><i></i>正在加载 '+esc(page.title)+'…</div>';
  try {
    const params=new URLSearchParams({limit:String(state.pageSize),offset:String(state.offset)});if(page.resource==='listings')params.set('workspace','1');
    if(page.id==='fba-inventory')params.set('inventory_scope','fba');
    if(state.query)params.set('q',state.query); if(state.searchField!=='all')params.set('field',state.searchField); if(state.status!=='全部')params.set('status',state.status);
    Object.keys(state.filters).forEach(function(key){if(state.filters[key])params.set(key,state.filters[key]);});
    const result=await api('/api/v1/'+page.resource+'?'+params.toString(),{signal:controller.signal});
    if(controller.signal.aborted||state.activeRequest!==controller||state.page!==page.id||state.detailRecordId)return;
    state.rows=result.items || [];state.total=Number(result.total || state.rows.length);state.activeRequest=null;renderTable(page);
    if(state.pendingRecord && state.pendingRecord.resource===page.resource){
      const pending=state.pendingRecord;state.pendingRecord=null;
      if(pending.id)showDetail({id:pending.id},page.resource);
      else if(pending.key&&pending.value){
        const lookup=await api('/api/v1/'+page.resource+'?'+new URLSearchParams({field:pending.key,q:pending.value,match:'exact',limit:'2'}),{signal:controller.signal});
        if(controller.signal.aborted||state.page!==page.id)return;
        if(lookup.items.length===1)showDetail(lookup.items[0],page.resource);
        else if(lookup.items.length>1){state.query=pending.value;state.searchField=pending.key;state.offset=0;loadTable(page);}
        else toast('未找到对应单据或无权查看','error');
      }
    }
  } catch(error) {
    if(error.name==='AbortError'||controller.signal.aborted||state.activeRequest!==controller)return;
    const errorHtml='<b>加载失败</b><span>'+esc(error.message)+'</span><button class="primary" data-retry>重新加载</button>';
    if(retained){const notice=$('#workspace').querySelector('.list-request-status');if(notice){notice.classList.add('failed');notice.setAttribute('role','alert');notice.innerHTML=errorHtml;}$('#workspace').setAttribute('aria-busy','false');}
    else $('#workspace').innerHTML='<div class="load-error" role="alert">'+errorHtml+'</div>';
  }
}

async function renderDashboard() {
  if(state.activeRequest)state.activeRequest.abort();const controller=new AbortController();state.activeRequest=controller;
  $('#workspace').innerHTML='<div class="loading"><i></i>正在汇总经营数据…</div>';
  try {
    const data=await api('/api/v1/dashboard',{signal:controller.signal});if(controller.signal.aborted||state.activeRequest!==controller)return; const cards=data.cards; const max=Math.max.apply(null,data.trend.map(function(item){return item.amount;}));
    const html='<section class="home-page"><div class="home-heading"><div><h1>经营概览</h1><p>今天是 '+esc(TODAY)+'，欢迎回来，当前登录账号</p></div><div><button data-page="sales-stat">销售报表与导出</button><button class="primary" data-page="business-analysis">经营分析</button></div></div>'+
      '<div class="metric-grid"><article><span>本月净销售（USD）</span><strong>'+money(cards.sales_amount,'$')+'</strong><em>排除取消/全额退款 · 不减平台费</em></article><article><span>待处理订单</span><strong>'+cards.pending_sales+'</strong><em>待审核与待发货</em></article><article><span>本地可用库存</span><strong>'+Number(cards.inventory_local_available).toLocaleString('zh-CN')+'</strong><em>共 '+cards.sku_count+' 个 SKU</em></article><article><span>紧急补货</span><strong>'+cards.urgent_replenishment+'</strong><em class="warn">P0 / P1 建议</em></article><article><span>待审批</span><strong>'+cards.pending_approvals+'</strong><em>采购与发货审批</em></article></div>'+
      '<div class="dashboard-grid"><article class="chart-card"><header><div><b>销售趋势</b><span>近10天USD净销售（不减平台费）</span></div><button data-page="sales-stat">按日/周/月分析</button></header><div class="chart">'+data.trend.map(function(item){const level=Math.max(1,Math.min(10,Math.round(item.amount/max*10)));return '<div><i class="bar-'+level+'"><span>$'+esc(item.amount)+'</span></i><small>'+esc(item.stat_date.slice(5))+'</small></div>';}).join('')+'</div></article>'+
      '<article class="todo-card"><header><div><b>待办事项</b><span>按优先级聚合</span></div><button data-page="purchase-approvals">查看审批</button></header><button data-page="purchase-approvals"><i class="red">审</i><span><b>采购 / FBA 审批</b><small>有 '+cards.pending_approvals+' 条等待处理</small></span><em>›</em></button><button data-page="replenishment"><i class="orange">补</i><span><b>补货建议</b><small>'+cards.urgent_replenishment+' 条紧急建议</small></span><em>›</em></button><button data-page="sales-orders"><i class="blue">单</i><span><b>订单履约</b><small>'+cards.pending_sales+' 个订单待处理</small></span><em>›</em></button></article></div>'+
      '<div class="dashboard-grid lower"><article class="alert-card"><header><b>库存预警</b><button data-page="inventory">查看全部</button></header><table><thead><tr><th>SKU</th><th>仓库</th><th>店铺</th><th>可用库存</th><th>状态</th></tr></thead><tbody>'+data.alerts.map(function(row){return '<tr><td><button class="link" data-page="inventory">'+esc(row.sku)+'</button></td><td>'+esc(row.warehouse_name)+'</td><td>'+esc(row.store_name || '—')+'</td><td>'+esc(row.available)+'</td><td><span class="state danger">低库存</span></td></tr>';}).join('')+'</tbody></table></article>'+
      '<article class="quick-card"><header><b>快捷入口</b></header><div><button data-page="product-add"><i>＋</i>添加产品</button><button data-page="purchase-orders"><i>采</i>创建采购单</button><button data-page="fba-plans"><i>F</i>FBA发货计划</button><button data-page="inbounds"><i>入</i>新建入库单</button></div></article></div></section>';
    $('#workspace').innerHTML=html;
  } catch(error) { if(controller.signal.aborted||state.activeRequest!==controller)return; $('#workspace').innerHTML='<div class="load-error"><b>经营数据加载失败</b><span>'+esc(error.message)+'</span><button class="primary" data-retry>重新加载</button></div>'; }
}

let CONTRACT=null;
const FIELD_LABELS={official_attributes:'领星产品扩展资料',wid:'仓库ID',product_id:'产品ID',store_id:'店铺ID',item_list:'商品明细',supplier_id:'供应商ID',batch_no:'批次号',source_batch_no:'源批次号',available:'可用数量',daily_sales:'日均销量',overseas_inbound:'海外仓在途',pending_inspection:'待检库存',local_inbound:'本地在途',fba_inbound:'FBA在途',safety_days:'安全天数',suggested_purchase_date:'建议采购日期',purchase_frequency:'采购频率',replenishment_mode:'补货模式',generated_at:'生成时间',creator:'创建人',submitted_at:'提交时间',decided_at:'决定时间',last_checked_at:'最近校验',fee_rate:'费率',request_no:'审批编号',business_type:'业务类型',business_no:'业务单号',applicant:'申请人',approver:'审批人'};
function resolveSchema(schema){return schema&&schema.$ref?CONTRACT.components.schemas[schema.$ref.split('/').pop()]:schema||{};}
function writeSchema(resource){return CONTRACT.components.schemas['Resource_'+resource.replaceAll('-','_')+'_Write']||{properties:{}};}
async function loadContract(){
 const response=await fetch(BASE+'/static/ui-contract.json',{cache:'no-cache',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('字段规则 HTTP '+response.status);CONTRACT=await response.json();
 const labels={};Object.values(PAGES).forEach(p=>{[...(p.fields||[]),...(p.columns||[])].forEach(f=>{if(!labels[f.key])labels[f.key]=f.label;});});
 Object.values(PAGES).forEach(page=>{
  if(!page.resource)return;const operation=CONTRACT.paths['/api/v1/'+page.resource];if(!operation)return;
  page.readonly=!operation.post;const old=new Map((page.fields||[]).map(f=>[f.key,f]));
  page.fields=Object.entries(writeSchema(page.resource).properties||{}).map(([key,schema])=>{const hint=old.get(key)||{};return {key,label:hint.label||(page.columns||[]).find(c=>c.key===key)?.label||FIELD_LABELS[key]||labels[key]||key,type:['number','integer'].includes(schema.type)?'number':schema.type==='array'?'array':schema.type==='object'?'object':hint.type==='textarea'?'textarea':'text',schema,options:hint.options||[],required:(writeSchema(page.resource).required||[]).includes(key)};});
  if(!page.readonly&&!page.type)page.primary=page.primary||'新建'+page.title;
  if(page.resource==='fba-delivery-orders'){page.readonly=false;page.primary=null;page.statuses=['全部','待配货','待发货','运输中','部分签收','已签收'];}
  const known=new Set((page.columns||[]).map(c=>c.key));page.fields.forEach(f=>{if(!known.has(f.key))(page.columns||(page.columns=[])).push({...col(f.key,f.label),extraColumn:true});});
 });
 Object.values(PAGES).forEach(page=>{
  if(page.resource==='products'){
   for(const column of page.columns||[]){if(column.key==='sku')column.label='品名 / SKU';if(column.key==='name')column.extraColumn=true;}
  }
  if(page.resource==='listings'){
   const view=(key,label)=>({key,label,viewColumn:true});
   const primary=[view('_image','图片'),view('_msku','MSKU / FNSKU'),col('status_text','状态','status'),view('_asin','ASIN'),col('title','标题'),col('store_name','店铺'),view('_parent_asin','父ASIN'),view('_product','品名 / SKU'),view('_category','分类'),view('_brand','品牌'),col('price','售价','money'),col('stock','可售库存')];
   const keys=new Set(primary.map(c=>c.key));page.columns=primary.concat((page.columns||[]).filter(c=>!keys.has(c.key)).map(c=>({...c,extraColumn:true})));
  }
 });
}
function scopeNotice(page){return '';}
function formControl(item,value){
 if(item.key==='official_attributes')return officialAttributesControl(item,value);
 const attrs=' name="'+esc(item.key)+'" data-field="'+esc(item.key)+'"'+(item.required?' required':'');
 if(item.type==='array')return '<details class="array-source"><summary>扩展字段</summary><textarea'+attrs+' class="array-json" rows="5" aria-label="'+esc(item.label)+'完整JSON">'+esc(JSON.stringify(value??[],null,2))+'</textarea><button type="button" data-item-editor="'+esc(item.key)+'">更新明细表格</button></details><div data-item-host="'+esc(item.key)+'"></div>';
 if(item.type==='object')return '<textarea'+attrs+' rows="4">'+esc(JSON.stringify(value??{},null,2))+'</textarea>';
 if(item.type==='textarea')return '<textarea'+attrs+' rows="3">'+esc(value??'')+'</textarea>';
 const numeric=item.type==='number',schema=item.schema||{};
 // Date strings remain text so timezones, seconds and legacy formats round-trip exactly.
 return '<input'+attrs+' type="'+(numeric?'number':'text')+'" value="'+esc(value??'')+'"'+(numeric?' step="'+(schema.type==='integer'?'1':'any')+'"'+(schema.minimum!==undefined?' min="'+schema.minimum+'"':''):' list="suggest-'+esc(item.key)+'"')+'><datalist id="suggest-'+esc(item.key)+'">'+(item.options||[]).map(o=>'<option value="'+esc(o)+'"></option>').join('')+'</datalist>';
}
function editorFields(page,row){
 const fields=new Map(page.fields.map(f=>[f.key,f]));
 const sections=BusinessWorkspace.groups(page,page.fields.map(f=>f.key));
 return sections.map(([title,keys])=>'<section class="bw-editor-section"><h3>'+esc(title)+'</h3><div class="form-grid">'+keys.map(key=>{
  const item=fields.get(key),schema=item.schema||{};
  return '<div class="editor-field '+(['array','object','textarea'].includes(item.type)?'wide':'')+'"><label><span>'+esc(item.label)+(item.required?'<em class="bw-required">*</em>':'')+'</span>'+formControl(item,row[key])+'</label>'+
   (schema['x-maintained-by']?'<small>流程维护：'+esc(schema['x-maintained-by'])+'</small>':'')+
   '<details class="bw-field-tech"><summary>字段设置</summary><code>'+esc(key)+'</code>'+(schema.nullable?'<label class="null-toggle"><input type="checkbox" data-null="'+esc(key)+'" '+(row[key]===null?'checked':'')+'>清空字段</label>':'')+'</details></div>';
 }).join('')+'</div></section>').join('')+'<p id="editor-error" role="alert"></p>';
}
function setupEditor(form,page,row){
 page.fields.filter(item=>item.key==='official_attributes').forEach(item=>mountOfficialEditor(form,item));
 form.querySelectorAll('.record-body,.form-scroll').forEach(el=>{el.scrollTop=0;});form._original=structuredClone(row||{});form._initial=new Map([...form.querySelectorAll('[data-field]')].map(el=>[el.name,el.value]));
 form.querySelectorAll('[data-null]').forEach(el=>{const control=form.querySelector('[name="'+el.dataset.null+'"]');control.disabled=el.checked;el.onchange=()=>{control.disabled=el.checked;};});
 if(page.resource==='sales-orders')for(const key of ['payment_status','fulfillment_status','status_text','carrier','tracking_no','refund_status']){const el=form.querySelector('[name="'+key+'"]');if(el){el.disabled=true;el.title='由收款与发货流程维护';}const nullBox=form.querySelector('[data-null="'+key+'"]');if(nullBox)nullBox.disabled=true;}
 form.onclick=event=>{const button=event.target.closest('[data-item-editor]');if(button)renderItemEditor(form,button.dataset.itemEditor);};
 if(['shipping-plans','fba-delivery-orders'].includes(page.resource)){
  const locked=page.resource==='shipping-plans'?['status_text','approval_status','locked_quantity']:['status_text','shipped_qty','received_qty','shipped_at','received_at','shipment_id','plan_no','warehouse_name','item_list','store_name','destination'];
  const allLocked=row.id&&(!row.fba_workflow?.managed||(page.resource==='shipping-plans'&&!['未提交','已驳回'].includes(row.approval_status)));
  form.querySelectorAll('[data-field]').forEach(el=>{if(allLocked||locked.includes(el.name)){el.disabled=true;el.title='由FBA审批/发货/签收流程维护';}});
 }
 populateReferences(form,page).catch(()=>{const note=document.createElement('p');note.className='scope-notice';note.textContent='关联候选加载失败；可输入准确业务值，保存仍由服务端校验。';form.appendChild(note);});
}
async function populateReferences(form,page){
 const refs={supplier_name:['suppliers','name'],warehouse_name:['warehouses','name'],to_warehouse_name:['warehouses','name'],shipping_warehouse:['warehouses','name'],store_name:['store-authorizations','store_name'],sku:['products','sku'],supplier_id:['suppliers','id'],wid:['warehouses','id'],product_id:['products','id'],store_id:['store-authorizations','id']};
 const loads=new Map();function records(resource){if(!loads.has(resource))loads.set(resource,(async()=>{const rows=[];let offset=0,total=1;while(offset<total){const data=await api('/api/v1/'+resource+'?limit=200&offset='+offset);rows.push(...data.items);offset+=data.items.length;total=data.total;if(!data.items.length)break;}return rows;})());return loads.get(resource);}
 await Promise.all(page.fields.filter(f=>refs[f.key]).map(async f=>{const [resource,key]=refs[f.key],rows=await records(resource);const list=form.querySelector('#suggest-'+f.key);if(list)list.innerHTML=[...new Set(rows.map(r=>r[key]).filter(v=>v!=null))].map(v=>'<option value="'+esc(v)+'"></option>').join('');}));
}
function renderItemEditor(form,key){
 const source=form.querySelector('[name="'+key+'"]'),host=form.querySelector('[data-item-host="'+key+'"]');let items;
 try{items=JSON.parse(source.value);if(!Array.isArray(items)||items.some(i=>!i||typeof i!=='object'||Array.isArray(i)))throw Error();}catch(e){toast('商品明细必须为对象数组','error');return;}
 const resource=form._resource||PAGES[state.page].resource,itemSchema=resolveSchema(writeSchema(resource).properties[key].items),known=itemSchema.properties||{},keys=[...new Set(['sku','product_name','fnsku','quantity','unit_price','remark',...items.flatMap(Object.keys)])];
 host.innerHTML='<fieldset class="bw-item-fieldset" '+(source.disabled?'disabled':'')+'><div class="item-editor-scroll"><table><thead><tr><th>行</th>'+keys.map(k=>'<th>'+esc(detailLabel(resource,k))+'</th>').join('')+'<th>操作</th></tr></thead><tbody>'+items.map((item,i)=>'<tr><td>'+(i+1)+'</td>'+keys.map(k=>'<td><input data-item-row="'+i+'" data-item-key="'+esc(k)+'" aria-label="明细'+(i+1)+' '+esc(k)+'" value="'+esc(item[k]===undefined?'':typeof item[k]==='object'?JSON.stringify(item[k]):item[k])+'" '+(['integer','number'].includes((known[k]||{}).type)?'type="number" step="'+(known[k].type==='integer'?'1':'any')+'" min="0"':'')+'></td>').join('')+'<td><button type="button" data-remove-item="'+i+'">删除行</button></td></tr>').join('')+'</tbody></table></div><button type="button" data-add-item>增加明细行</button></fieldset>';
 host.oninput=event=>{const el=event.target;if(!el.dataset.itemKey)return;const k=el.dataset.itemKey,i=Number(el.dataset.itemRow),type=(known[k]||{}).type;let value=el.value;if(value===''&&['number','integer'].includes(type)){delete items[i][k];}else{if(['number','integer'].includes(type)){value=Number(value);if(!Number.isFinite(value))return;}else if(typeof items[i][k]==='object'){try{value=JSON.parse(value);}catch(e){el.setCustomValidity('请输入合法JSON');return;}}el.setCustomValidity('');items[i][k]=value;}source.value=JSON.stringify(items,null,2);if(resource==='supplier-deliveries'){const total=form.querySelector('[name="total_qty"]');if(total&&!total.disabled)total.value=items.reduce((sum,item)=>sum+Number(item.quantity||0),0);}};
 host.onclick=event=>{const remove=event.target.closest('[data-remove-item]');if(remove){items.splice(Number(remove.dataset.removeItem),1);}else if(event.target.closest('[data-add-item]'))items.push({sku:'',quantity:0,unit_price:0});else return;source.value=JSON.stringify(items,null,2);if(resource==='supplier-deliveries'){const total=form.querySelector('[name="total_qty"]');if(total&&!total.disabled)total.value=items.reduce((sum,item)=>sum+Number(item.quantity||0),0);}renderItemEditor(form,key);};
 source.oninput=()=>{host.innerHTML='JSON已修改，重新展开以同步逐行编辑器';};
}
function collectPayload(form,page,editing){
 const result={},original=form._original||{};
 for(const item of page.fields){const el=form.querySelector('[name="'+item.key+'"]'),nullBox=form.querySelector('[data-null="'+item.key+'"]');if(!el)throw Error('缺少表单字段 '+item.key);const isNull=!!(nullBox&&nullBox.checked),wasNull=original[item.key]===null;
  if(editing&&el.value===form._initial.get(item.key)&&isNull===wasNull)continue;
  if(!editing&&el.value===''&&!isNull)continue;
  if(['purchase-orders','sales-orders','shipping-plans','fba-delivery-orders','supplier-deliveries'].includes(page.resource)&&el.disabled)continue;
  if(el.disabled&&!isNull)continue;
  let value=isNull?null:el.value;
  if(value!==null&&item.type==='number'){if(value==='')throw Error(item.label+'不可留空，请选择NULL或填写数字');value=Number(value);if(!Number.isFinite(value)||(item.schema.type==='integer'&&!Number.isSafeInteger(value)))throw Error(item.label+'必须是有效'+item.schema.type);if(item.schema.minimum!==undefined&&value<item.schema.minimum)throw Error(item.label+'不能小于'+item.schema.minimum);}
  if(value!==null&&item.type==='object'){try{value=JSON.parse(value);}catch(e){throw Error(item.label+'结构数据错误');}if(!value||Array.isArray(value)||typeof value!=='object')throw Error(item.label+'必须为对象');}
  if(value!==null&&item.type==='array'){try{value=JSON.parse(value);}catch(e){throw Error(item.label+' JSON格式错误');}if(!Array.isArray(value)||value.some(v=>!v||typeof v!=='object'||Array.isArray(v)))throw Error(item.label+'必须为对象数组');}
  result[item.key]=value;
 }
 return result;
}
function openRecord(row){
 const page=PAGES[state.page];if(page.readonly)return;if(page.resource==='users'&&row&&Number(row.id)===1){toast('主管理员通过独立认证机制管理，不允许普通资料编辑','error');return;}state.editing=row&&row.id?row:null;const form=$('#record-form');form._resource=page.resource;
 $('#record-dialog').classList.add('bw-editor');$('#record-kicker').textContent=page.title;$('#record-title').textContent=(state.editing?'编辑':'新建')+page.title;
 $('#record-fields').innerHTML=editorFields(page,row||{});setupEditor(form,page,row||{});
 if(page.resource==='supplier-deliveries')for(const el of form.querySelectorAll('[data-field]'))if(['status_text','received_qty','qc_status'].includes(el.name)||(row?.status_text==='已收货'&&el.name!=='remark')){el.disabled=true;const toggle=form.querySelector('[data-null="'+el.name+'"]');if(toggle)toggle.disabled=true;}
 if(page.resource==='purchase-orders'){
  const draft=!row||!row.id||['','待提交','已驳回'].includes(row.status_text||'');
  if(!row||!row.id){const s=form.querySelector('[name="status_text"]');if(s)s.value='待提交';}
  for(const el of form.querySelectorAll('[data-field]'))if(['status_text','received_qty','pending_qty','payment_status'].includes(el.name)||(!draft&&!['remark','payment_plan','logistics_provider','tracking_no','planned_arrival'].includes(el.name))){el.disabled=true;const toggle=form.querySelector('[data-null="'+el.name+'"]');if(toggle)toggle.disabled=true;}
 }
 page.fields.filter(f=>f.type==='array').forEach(f=>renderItemEditor(form,f.key));
 $('#record-dialog').showModal();
}
async function saveRecord(){
 const page=PAGES[state.page],form=$('#record-form');if($('#record-save').disabled)return;
 try{if(!form.reportValidity())return;const raw=collectPayload(form,page,!!state.editing);if(!Object.keys(raw).length){toast('没有修改，无需保存');return;}$('#record-save').disabled=true;
 const result=await api('/api/v1/'+page.resource+(state.editing?'/'+state.editing.id:''),{method:state.editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(raw)});
 const persisted=await api('/api/v1/'+page.resource+'/'+result.id);for(const key of Object.keys(raw)){if(JSON.stringify(persisted[key])!==JSON.stringify(raw[key]))throw Error('服务端已写入，但回读字段不一致：'+key+'；请检查详情，勿重复创建');}
 $('#record-dialog').close();toast(page.title+'已保存并回读核对');loadTable(page);
 }catch(error){$('#editor-error').textContent=error.message;toast(error.message,'error');}finally{$('#record-save').disabled=false;}
}
function detailFieldHtml(resource,record,key){const value=record[key];return '<div><span>'+esc(detailLabel(resource,key))+'</span><b>'+esc(value===''||value==null?'—':typeof value==='object'?JSON.stringify(value):value)+'</b></div>';}
function detailItemsHtml(items){const cols=[['sku','SKU'],['fnsku','FNSKU'],['product_name','品名'],['quantity','数量'],['unit_price','单价'],['received_qty','实收'],['warehouse_name','仓库']];return '<section class="context-block"><h3>商品明细 <small>'+items.length+' 行</small></h3><div class="item-table"><table><thead><tr>'+cols.map(function(c){return '<th>'+c[1]+'</th>';}).join('')+'</tr></thead><tbody>'+((items.length?items:[{}]).map(function(item){return '<tr>'+cols.map(function(c){const v=item[c[0]]??(c[0]==='unit_price'?item.price:'');return '<td>'+esc(v===''||v==null?'—':v)+'</td>';}).join('')+'</tr>';}).join(''))+'</tbody></table></div></section>';}
function renderDetailSections(page,resource,record,context){
  const sections=page.detailSections||[['基础信息',Object.keys(record).filter(k=>!['id','tenant_id','extra','item_list'].includes(k))]];
  let html=sections.map(section=>'<section class="context-block"><h3>'+esc(section[0])+'</h3><div class="detail-grid">'+(section[1]||[]).map(key=>detailFieldHtml(resource,record,key)).join('')+'</div></section>').join('');
  const items=Array.isArray(context.items)?context.items:[];
  if(items.length||['purchase-orders','sales-orders','inbounds','fba-plans','fba-shipments','fba-delivery-orders'].includes(page.id))html+=detailItemsHtml(items);
  if(context.pending||context.failed)return html+(context.pending?'<p class="muted" role="status">正在读取关联单据…</p>':'');
  const links=context.related||[];
  html+='<section class="context-block"><h3>业务链路 <small>'+links.length+' 条关联</small></h3><div class="related-list">'+(links.length?links.map(link=>'<button type="button" class="related-link" data-related-resource="'+esc(link.resource)+'" data-related-page="'+esc(link.page)+'" data-related-id="'+esc(link.id)+'"><b>'+esc(link.label)+'</b><span>'+esc(link.relationship)+'</span></button>').join(''):'<p class="muted">暂无关联记录</p>')+'</div></section>';
  const timeline=context.timeline||[];
  html+='<section class="context-block"><h3>业务时间线</h3><ol class="timeline">'+(timeline.length?timeline.map(item=>'<li><i></i><div><b>'+esc(item.method||'业务节点')+'</b><span>'+esc(item.created_at||'')+'</span><p>'+esc(item.payload||item.path||'')+'</p></div></li>').join(''):'<li><div class="muted">暂无时间线</div></li>')+'</ol></section>';
  return html;
}
async function showDetail(row, resourceOverride) {
  return DocumentWorkspace.open(row,resourceOverride);
}
async function stockConfirm(resource,id){
 const ids=Array.isArray(id)?id.map(Number):[Number(id)];if(!ids.length){toast('请先勾选单据','error');return;}
 if(!await erpConfirm('确认本地库存过账？仅新建待处理单据可执行，历史单据不可重放；不推送平台或付款。'))return;
 try{const result=await api('/api/v1/stock/'+resource+'/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});const data=result.data;const message='成功 '+data.success+'，失败 '+data.fail+(data.fail?'：'+data.failList.map(x=>x.id+' '+x.message).join('；'):'；已核对库存流水');toast(message,data.fail?'error':'');if(data.fail)await erpAlert(message);await loadTable(PAGES[state.page]);}catch(error){toast(error.message,'error');}
}
async function stockLedger(resource,id){
 $('#detail-title').textContent='库存过账流水';$('#detail-body').innerHTML='<p>正在查询…</p>';$('#detail-dialog').showModal();
 try{const result=await api('/api/v1/stock/ledger?resource='+encodeURIComponent(resource)+'&record_id='+id+'&limit=200');$('#detail-body').innerHTML='<p>共 '+result.total+' 条；历史封存及未过账单据无新增流水。'+(result.total>200?'显示前200条，完整数据请在接口页分页。':'')+'</p>'+simpleReportTable(['SKU','仓库','批次ID','变动','原总量','现总量','原可用','现可用','操作','冲销原流水','原因','过账时间'],result.items.map(x=>[x.sku,x.warehouse_name,x.inventory_id,x.delta_quantity,x.before_quantity,x.after_quantity,x.before_available,x.after_available,x.operation||'post',x.reverses_id||'—',x.reason||'—',x.created_at]));}catch(error){$('#detail-body').textContent=error.message;}
}
async function workflow(action,id) {
  if(!await erpConfirm('确认执行此本地业务流程？流程会修改关联单据；不调用真实平台。请在测试单据上执行。'))return;
  let path,body={};
  if(action.startsWith('purchase-')){path='/api/v1/workflows/purchase-orders/'+id+'/'+action.slice(9);if(action==='purchase-void'&&!await erpConfirm('作废保留单据，且已有收货/入库会拒绝。确定继续？'))return;}
  if(action==='purchase')path='/api/v1/workflows/replenishment/'+id+'/create-purchase';
  if(action==='create-delivery')path='/api/v1/workflows/shipments/'+id+'/create-delivery';
  if(action==='receive')path='/api/v1/workflows/supplier-deliveries/'+id+'/receive';
  if(action==='approve' || action==='reject'){path='/api/v1/workflows/approvals/'+id+'/decide';body={decision:action==='approve'?'approve':'reject'};}
  try{const result=await api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});toast(result.message==='success'?'业务处理成功':result.message);loadTable(PAGES[state.page]);}
  catch(error){toast(error.message,'error');}
}

function renderProductForm(){
 const page=PAGES['product-management'];$('#workspace').innerHTML='<section class="product-editor"><header><h1>添加产品 · 全字段维护</h1><button data-page="product-management">返回产品列表</button></header><form id="product-page-form"><div class="form-scroll">'+editorFields(page,{})+'</div><footer><button type="button" data-page="product-management">取消</button><button type="submit" class="primary">保存并核对</button></footer></form></section>';
 const form=$('#product-page-form');form._resource='products';setupEditor(form,page,{});
}
async function saveProductPage(form){
 const button=form.querySelector('[type="submit"]');if(button.disabled)return;
 try{if(!form.reportValidity())return;const payload=collectPayload(form,PAGES['product-management'],false);button.disabled=true;const result=await api('/api/v1/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const saved=await api('/api/v1/products/'+result.id);for(const key of Object.keys(payload)){if(JSON.stringify(saved[key])!==JSON.stringify(payload[key]))throw Error('已保存但回读不一致：'+key+'，请勿重复创建');}toast('产品已保存并回读核对');selectPage('product-management');}
 catch(error){$('#editor-error').textContent=error.message;toast(error.message,'error');}finally{button.disabled=false;}
}

async function reportData(resource){
 const controller=state.activeRequest,filters={...state.reportFilters};
 const params=new URLSearchParams({limit:'2000',view:'report'});Object.keys(filters).forEach(function(key){if(filters[key])params.set(key,filters[key]);});
 const read=async offset=>{const query=new URLSearchParams(params);query.set('offset',String(offset));return api('/api/v1/'+resource+'?'+query,{signal:controller.signal});};
 const first=await read(0),total=Number(first.total||0);let rows=first.items||[];
 for(let offset=2000;offset<total;offset+=6000){const offsets=[offset,offset+2000,offset+4000].filter(n=>n<total);const batches=await Promise.all(offsets.map(read));for(let i=0;i<batches.length;i++){const batch=batches[i].items||[];if(batch.length!==Math.min(2000,total-offsets[i]))throw new Error('数据已变化，请重新查询');rows.push(...batch);}}
 if(controller.signal.aborted)throw new DOMException('已切换页面','AbortError');
 if(filters.sku && resource==='sales-orders')rows=rows.filter(r=>(r.item_list||[]).some(i=>String(i.sku||'').includes(filters.sku)));
 return rows;
}
function currencyTotals(rows,key='amount'){const totals=new Map();for(const r of rows){const currency=r.currency||'未标币种';totals.set(currency,(totals.get(currency)||0)+Number(r[key]||0));}return [...totals].map(([c,v])=>c+' '+v.toLocaleString('zh-CN',{maximumFractionDigits:2})).join(' / ')||'0';}
function netSalesRows(rows){return rows.filter(r=>!['已取消','已退款'].includes(r.status_text)&&r.refund_status!=='已退款');}
function fulfilledOrder(r){return ['已发货','已完成','已退款'].includes(r.status_text)||['已发货','已完成','Shipped'].includes(r.fulfillment_status);}

function reportPeriod(row){const raw=row.order_time||row.occurred_at||row.created_time||row.expected_ship_date||row.generated_at||row.created_at||row.updated_at||TODAY_ISO;const value=String(raw).slice(0,10);if(state.reportGranularity==='month')return value.slice(0,7);if(state.reportGranularity==='week'){const date=new Date(value+'T00:00:00Z'),day=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-day);return date.toISOString().slice(0,10)+' 周';}return value;}
function periodSummary(rows,valueKey,label){const groups=new Map();rows.forEach(function(row){const period=reportPeriod(row)+(valueKey==='amount'?' · '+(row.currency||'未标币种'):''),item=groups.get(period)||{period:period,count:0,value:0,dimension:new Set()};item.count+=1;item.value+=Number(row[valueKey]||0);const dimension=row.store_name||row.warehouse_name||row.platform||row.supplier_name;if(dimension)item.dimension.add(dimension);groups.set(period,item);});const headers=['期间','记录数',label,'业务维度'];if(state.reportCompact)headers.splice(3,1);const summaryRows=[...groups.values()].sort(function(a,b){return b.period.localeCompare(a.period);}).map(function(item){const values=[item.period,item.count,item.value.toLocaleString('zh-CN',{maximumFractionDigits:2}),[...item.dimension].join('、')||'全部'];if(state.reportCompact)values.splice(3,1);return values;});return {headers:headers,rows:summaryRows};}
function reportShell(page,metrics,summary){state.reportExport=summary;const f=state.reportFilters,table=simpleReportTable(summary.headers,summary.rows);const body='<div class="report-heading"><div><h1>'+esc(page.title)+'</h1><p>数据更新时间：刚刚 · 当前维度：'+esc(state.reportGranularity==='day'?'按日':state.reportGranularity==='week'?'按周':'按月')+' · '+state.reportRows.length+' 条源记录</p></div><button data-report-granularity="day" class="'+(state.reportGranularity==='day'?'active-view':'')+'">按天</button><button data-report-granularity="week" class="'+(state.reportGranularity==='week'?'active-view':'')+'">按周</button><button data-report-granularity="month" class="'+(state.reportGranularity==='month'?'active-view':'')+'">按月</button><button data-report-columns class="'+(state.reportCompact?'active-view':'')+'">'+(state.reportCompact?'显示全部列':'精简列')+'</button><button data-report-export class="primary">导出当前报表</button></div><div class="report-metrics">'+metrics.map(function(item){return '<article><span>'+esc(item[0])+'</span><strong>'+item[1]+'</strong><em>'+esc(item[2]||'')+'</em></article>';}).join('')+'</div>'+table;$('#workspace').innerHTML='<section class="report-page">'+(page.aliasOf?scopeNotice(page):'')+'<div class="filter-bar report-filters"><label>店铺<input data-report-input="store_name" value="'+esc(f.store_name)+'" placeholder="全部店铺"></label><label>站点<input data-report-input="site" value="'+esc(f.site)+'" placeholder="全部站点"></label><label>MSKU<input data-report-input="sku" value="'+esc(f.sku)+'" placeholder="全部 MSKU"></label><label>开始日期<input type="date" data-report-input="date_from" value="'+esc(f.date_from)+'"></label><label>结束日期<input type="date" data-report-input="date_to" value="'+esc(f.date_to)+'"></label><button class="primary" data-report-query>查询</button><button data-report-reset>重置</button></div>'+body+'</section>';}
function exportReport(page){const output=state.reportExport||{headers:[],rows:[]};if(!output.rows.length){toast('当前报表无可导出数据','error');return;}const safe=function(value){const text=String(value??'');return /^[-=+@]/.test(text)?"'"+text:text;};const csv=[output.headers].concat(output.rows).map(function(r){return r.map(function(v){return csvEscape(safe(v));}).join(',');}).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=page.title+'-'+state.reportGranularity+'-'+TODAY_ISO+'.csv';a.click();URL.revokeObjectURL(a.href);toast('已导出报表 '+output.rows.length+' 行');}
async function renderReport(page) {
  if(state.activeRequest)state.activeRequest.abort();const controller=new AbortController();state.activeRequest=controller;
  $('#workspace').innerHTML='<div class="loading"><i></i>正在计算 '+esc(page.title)+'…</div>';
  try {
    if(['sales-report','profit-report','ad-report'].includes(page.type)){
      const params=new URLSearchParams({...state.reportFilters,kind:page.type==='sales-report'?'sales':page.type==='ad-report'?'ads':'profit',granularity:state.reportGranularity});
      const result=await api('/api/v1/'+(page.type==='ad-report'?'ad-report':'sales-report')+'?'+params,{signal:controller.signal});
      if(controller.signal.aborted||state.activeRequest!==controller)return;
      state.reportRows={length:result.source_count};
      if(state.reportCompact){result.summary.headers=result.summary.headers.slice(0,3);result.summary.rows=result.summary.rows.map(row=>row.slice(0,3));}
      reportShell(page,result.metrics,result.summary);return;
    }
    if(page.type==='ad-report'){
      const rows=await reportData('ad-campaigns');state.reportRows=rows;const spend=rows.reduce(function(n,r){return n+Number(r.spend||0);},0),sales=rows.reduce(function(n,r){return n+Number(r.sales||0);},0);
      reportShell(page,[['广告花费',money(spend,'$'),'USD，当前筛选'],['广告销售额',money(sales,'$'),'USD，归因销售'],['整体 ACOS',(spend/Math.max(1,sales)*100).toFixed(2)+'%','当前口径'],['ROAS',(sales/Math.max(1,spend)).toFixed(2),'广告回报']],periodSummary(rows,'sales','销售额'));return;
    }
    if(page.type==='sales-report'){
      const rows=await reportData('sales-orders');state.reportRows=rows;const net=netSalesRows(rows);
      reportShell(page,[['订单原始金额',currencyTotals(rows),'分币种，含取消/退款订单'],['净销售额',currencyTotals(net),'排除取消与全额退款，不减平台费'],['订单量',String(rows.length),'完整筛选结果'],['已履约',String(rows.filter(fulfilledOrder).length),'已发货、已完成及已退款履约订单']],periodSummary(net,'amount','净销售额（分币种）'));return;
    }
    if(page.type==='inventory-report'){
      const rows=await reportData('inventory');state.reportRows=rows;const qty=rows.reduce(function(n,r){return n+Number(r.quantity||0);},0),available=rows.reduce(function(n,r){return n+Number(r.available||0);},0);
      reportShell(page,[['库存总量',qty.toLocaleString('zh-CN'),'当前筛选'],['可用库存',available.toLocaleString('zh-CN'),'可销售库存'],['占用库存',(qty-available).toLocaleString('zh-CN'),'订单与调拨占用'],['低库存 SKU',String(rows.filter(function(r){return Number(r.available)<100;}).length),'需要关注']],periodSummary(rows,'available','可用库存'));return;
    }
    const rows=await reportData('sales-orders');state.reportRows=rows;
    const available=rows.filter(r=>r.economics),missing=rows.length-available.length;
    if(!available.length){reportShell(page,[['利润','—','未提供可核对成本/汇率，禁止按比例估算'],['订单数',String(rows.length),'完整筛选结果']],periodSummary(netSalesRows(rows),'amount','净销售额（非利润）'));return;}
    const net=available.reduce((n,r)=>n+Number(r.economics.settlement_cents||0)/100,0),cost=available.reduce((n,r)=>n+Number(r.economics.cogs_cny_cents||0)/100/Number(r.economics.fx_cny_per_usd||1),0),fees=available.reduce((n,r)=>n+Number(r.economics.fee_cents||0)/100,0);
    const profitRows=available.map(r=>({...r,currency:'USD',amount:Number(r.economics.settlement_cents||0)/100-Number(r.economics.cogs_cny_cents||0)/100/Number(r.economics.fx_cny_per_usd||1)}));
    reportShell(page,[['净结算（USD）',money(net,'$'),'含退款与平台费用'],['平台费用（USD）',money(fees,'$'),'逐单费用明细'],['售出成本（USD）',money(cost,'$'),'CNY成本按逐单汇率折算'],['贡献利润（USD）',money(net-cost,'$'),'净结算减成本；未扣广告/头程/管理费；缺经济明细 '+missing+' 单']],periodSummary(profitRows,'amount','贡献利润（USD，非净利润）'));
  } catch(error){if(controller.signal.aborted||state.activeRequest!==controller)return;$('#workspace').innerHTML='<div class="load-error"><b>报表计算失败</b><span>'+esc(error.message)+'</span></div>';}
}
function simpleReportTable(headers,rows) {
  return '<div class="table-shell report-table"><table><thead><tr>'+headers.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row){return '<tr>'+row.map(function(value){return '<td>'+esc(value)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
}
async function renderBI(page) {
  if(state.activeRequest)state.activeRequest.abort();const controller=new AbortController();state.activeRequest=controller;
  $('#workspace').innerHTML='<div class="loading"><i></i>正在生成经营分析…</div>';
  try{const data=await api('/api/v1/dashboard',{signal:controller.signal});if(controller.signal.aborted||state.activeRequest!==controller)return;const cards=data.cards;state.reportRows=[{created_at:cards.period+'-01',amount:cards.sales_amount,currency:'USD',store_name:'全部渠道'}];reportShell(page,[['本月净销售（USD）',money(cards.sales_amount,'$'),cards.period+' 排除取消/退款'],['库存采购成本（CNY）',money(cards.inventory_value_cny,'¥'),'全库数量×SKU采购成本'],['待采购',String(cards.pending_purchase),'采购单'],['在途计划数量',String(cards.shipping_quantity),'未完成发货计划']],periodSummary(state.reportRows,'amount','本月净销售'));}
  catch(error){if(controller.signal.aborted||state.activeRequest!==controller)return;$('#workspace').innerHTML='<div class="load-error"><b>分析加载失败</b><span>'+esc(error.message)+'</span></div>';}
}
function renderPermissions(){
 $('#workspace').innerHTML='<section class="settings-page"><div class="settings-header"><h1>角色与权限边界</h1></div><article class="context-block"><h3>实际认证：受保护的管理员会话</h3><p class="muted">用户与角色页面维护的是业务资料，不是登录账号或权限策略。真实登录账号由登录账号页面管理，角色动作权限与账号店铺/仓库范围叠加；未安全映射范围的接口对受限账号明确拒绝。修改业务资料role_name不授予登录与操作权。主管理员记录禁止通过普通CRUD修改或删除。</p><p class="muted">本页不提供无效的“保存权限”按钮。真实平台店铺授权同样未接通，不将资料状态误报为平台授权。</p><button data-page="users">维护用户业务资料</button><button data-page="api-docs">查看实际认证契约</button></article></section>';
}
function renderTools(){
 const tools=[['产品CSV导入','product-management'],['采购单CSV导入','purchase-orders'],['Listing资料维护','listing'],['库存资料维护','inventory'],['订单全分页导出','sales-orders'],['贡献利润核对','order-profit']];
 $('#workspace').innerHTML='<section class="tools-page"><div class="tools-heading"><h1>批量工具</h1><p>进入对应资源后下载模板、导入CSV或导出筛选结果。CSV仅新增，不自动更新或平台配对；单次最多500行，显示部分成功与逐行错误，无后台任务队列。</p></div><div class="tool-grid">'+tools.map(item=>'<article><div><b>'+item[0]+'</b><p>真实业务页面操作</p></div><button data-page="'+item[1]+'">进入</button></article>').join('')+'</div><button data-page="audit-logs">查看真实操作日志</button></section>';
}
function contractOperations(){return Object.entries(CONTRACT.paths).flatMap(([path,methods])=>Object.entries(methods).filter(([method])=>['get','post','put','delete','patch','head','options'].includes(method)).map(([method,operation])=>({path,method,operation})));}
function safeQueryOperation(entry){return entry.method==='get'&&!/auth|session/i.test(entry.path)||entry.method==='post'&&/^\/(erp\/|inventory\/center\/openapi\/|basicOpen\/)/.test(entry.path);}
function schemaTree(schema,path='',seen=new Set()){
 const reference=schema&&schema.$ref;if(reference&&seen.has(reference))return '';const next=new Set(seen);if(reference)next.add(reference);const s=resolveSchema(schema);
 let html='<tr><td><code>'+esc(path||'(根)')+'</code></td><td>'+esc(s.type||(s.oneOf?'oneOf':'object'))+(s.nullable?' / NULL':'')+'</td><td>'+esc(s.description||'')+(s['x-maintenance-mode']?' · '+esc(s['x-maintenance-mode']):'')+(s.minimum!==undefined?' 最小值 '+s.minimum:'')+'</td></tr>';
 for(const [key,value] of Object.entries(s.properties||{}))html+=schemaTree(value,path?path+'.'+key:key,next);
 if(s.items)html+=schemaTree(s.items,path+'[]',next);for(const variant of s.allOf||s.oneOf||[])html+=schemaTree(variant,path,next);return html;
}
let fullContractRequest=null;
async function renderDocs(){
 const pageId=state.page;
 if(!CONTRACT.openapi){
  $('#workspace').innerHTML='<div class="loading"><i></i>正在加载接口文档…</div>';
  try{
   if(!fullContractRequest)fullContractRequest=fetch(BASE+'/openapi.yaml',{cache:'no-cache',signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw Error('OpenAPI HTTP '+r.status);return r.json();}).catch(e=>{fullContractRequest=null;throw e;});
   CONTRACT=await fullContractRequest;
  }catch(error){if(state.page===pageId)$('#workspace').innerHTML='<div class="load-error">'+esc(error.message)+'<button data-page="api-docs">重试</button></div>';return;}
 }
 if(state.page!==pageId)return;
 const operations=contractOperations();$('#workspace').innerHTML='<section class="contract-page"><h1>开放接口 · 当前已实现契约</h1><p>'+Object.keys(CONTRACT.paths).length+' 个路径 / '+operations.length+' 个HTTP操作。依据当前发布OpenAPI自动生成，不代表全部领星官方API。凭据不在此展示，生产禁止匿名会话；本地资料CRUD不自动过账。</p><a href="'+BASE+'/openapi.yaml" download="ERP-OpenAPI.yaml">下载机器可读OpenAPI</a><div class="contract-layout"><aside><label>搜索路径、方法或说明<input id="contract-search" placeholder="例如 inventory / POST"></label><div id="contract-operations"></div></aside><main id="contract-detail"><p>选择接口查看所有请求、响应、嵌套字段及安全查询。</p></main></div></section>';
 function renderList(){const q=$('#contract-search').value.toLowerCase();$('#contract-operations').innerHTML=operations.map((entry,index)=>({entry,index})).filter(({entry})=>(entry.method+' '+entry.path+' '+entry.operation.summary).toLowerCase().includes(q)).map(({entry,index})=>'<button data-contract-operation="'+index+'"><b>'+entry.method.toUpperCase()+'</b> '+esc(entry.path)+'<small>'+esc(entry.operation.summary||'')+'</small></button>').join('');}
 $('#contract-search').oninput=renderList;renderList();$('#contract-operations').onclick=event=>{const b=event.target.closest('[data-contract-operation]');if(b)renderContractOperation(operations[Number(b.dataset.contractOperation)]);};
}
function renderContractOperation(entry){
 setTimeout(()=>enhanceCompatOperation(entry).catch(error=>toast(error.message,'error')),0);
 const {path,method,operation}=entry,parameters=operation.parameters||[],request=operation.requestBody&&operation.requestBody.content||{},responses=operation.responses||{};
 const table=schema=>'<div class="schema-table"><table><thead><tr><th>字段路径</th><th>类型</th><th>说明/限制</th></tr></thead><tbody>'+schemaTree(schema)+'</tbody></table></div>';
 $('#contract-detail').innerHTML='<h2>'+method.toUpperCase()+' '+esc(path)+'</h2><p>'+esc(operation.description||operation.summary||'')+'</p><h3>路径与查询参数</h3>'+table({type:'object',properties:Object.fromEntries(parameters.map(p=>[p.in+':'+p.name,{...p.schema,description:(p.required?'必填 · ':'')+(p.description||'')}]))})+'<h3>请求体</h3>'+Object.entries(request).map(([type,value])=>'<details open><summary>'+esc(type)+'</summary>'+table(value.schema)+'</details>').join('')+'<h3>响应字段全集</h3>'+Object.entries(responses).map(([status,response])=>'<details '+(status.startsWith('2')?'open':'')+'><summary>HTTP '+esc(status)+' · '+esc(response.description||'')+'</summary>'+Object.entries(response.content||{}).map(([type,value])=>table(value.schema)).join('')+'</details>').join('')+'<h3>安全试查</h3>'+(safeQueryOperation(entry)?'<p>只允许查询接口。使用当前会话，响应不显示令牌。默认小页查询，不自动拉取全部历史记录。</p><form id="contract-query-form">'+parameters.filter(p=>p.in==='path').map(p=>'<label>'+esc(p.name)+'<input data-path-param="'+esc(p.name)+'" required></label>').join('')+'<label>查询参数 / POST JSON请求体<textarea id="contract-query-body" rows="7">'+esc(JSON.stringify(method==='post'?{offset:0,length:5}:{limit:5},null,2))+'</textarea></label><button class="primary" type="submit">执行只读查询</button></form><pre id="contract-query-result" aria-live="polite"></pre>':'');
 const form=$('#contract-query-form');if(form)form.onsubmit=async event=>{event.preventDefault();const output=$('#contract-query-result'),button=form.querySelector('button');try{let route=path;form.querySelectorAll('[data-path-param]').forEach(el=>{if(!el.value)throw Error('请填写路径参数');route=route.replace('{'+el.dataset.pathParam+'}',encodeURIComponent(el.value));});const body=JSON.parse($('#contract-query-body').value);if(!body||Array.isArray(body)||typeof body!=='object')throw Error('参数必须是JSON对象');if(Object.keys(body).some(k=>/token|secret|password|sign|app.?key/i.test(k)))throw Error('试查不接受认证字段，使用当前会话');button.disabled=true;output.textContent='正在查询…';const result=await api(route+(method==='get'?'?'+new URLSearchParams(body):''),method==='post'?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});output.textContent=JSON.stringify(result,(key,value)=>/token|secret|password/i.test(key)?'[已隐藏]':value,2);}catch(error){output.textContent='查询失败：'+error.message;}finally{button.disabled=false;}};
}
function renderModulePlaceholder(page){return loadTable(page);}
async function renderPage() {
  state.renderEpoch=(state.renderEpoch||0)+1;
  const epoch=state.renderEpoch;
  $('#workspace').onclick=null;
  $('#workspace').innerHTML='<div class="loading" role="status"><i></i>正在加载 '+esc(PAGES[state.page]?.title||'')+'…</div>';
  if(state.token)await accessLoadIdentity();
  if(epoch!==state.renderEpoch)return;
  if(state.detailRecordId&&PAGES[state.page].resource)return showDetail({id:state.detailRecordId},PAGES[state.page].resource);
  if(PAGES[state.page]?.type==='sales-returns')return renderSalesReturns();
  if(PAGES[state.page]?.type==='freight-quote')return renderFreightQuote();
  if(PAGES[state.page]?.type==='logistics-costs')return renderLogisticsCosts();
  if(PAGES[state.page]?.type==='commercial-invoices')return renderCommercialInvoices();
  if(PAGES[state.page]?.type==='exchange-rates')return renderExchangeRates();
  if(PAGES[state.page]?.type==='account-balances')return renderAccountBalances(PAGES[state.page]);
  if(PAGES[state.page]?.type==='logistics-directory')return renderLogisticsDirectory(PAGES[state.page]);
  if(PAGES[state.page]?.type==='supplier-quotes')return renderSupplierQuotes();
  if(PAGES[state.page]?.type==='ad-traffic')return renderAdTraffic(PAGES[state.page]);
  if(PAGES[state.page]?.type==='customer-voice')return renderCustomerVoice(PAGES[state.page]);
  if(PAGES[state.page]?.type==='inventory-aging')return renderInventoryAging();
  if(PAGES[state.page]?.type==='sales-policies')return renderSalesPolicies();
  if(PAGES[state.page]?.type==='sales-targets')return renderSalesTargets();
  if(PAGES[state.page]?.type==='service-templates')return renderServiceTemplates();
  const page=PAGES[state.page];
  document.title=page.title+' · ERP';
  if(page.type==='module-placeholder')return loadTable(page);
  if(page.type==='dashboard')return renderDashboard();
  if(page.type==='product-form')return renderProductForm();
  if(page.type==='stocktaking')return renderStocktaking();
  if(page.type==='purchase-amendments')return renderPurchaseAmendments();
  if(page.type==='manual-testing')return renderManualTesting();
  if(page.type==='access-accounts')return renderAccessAdmin('accounts');
  if(page.type==='access-roles'||page.type==='permissions')return renderAccessAdmin('roles');
  if(page.type==='tools')return renderTools();
  if(page.type==='docs')return renderDocs();
  if(page.type==='ad-report' || page.type==='sales-report' || page.type==='inventory-report' || page.type==='profit-report')return renderReport(page);
  if(page.type==='bi-report')return renderBI(page);
  return loadTable(page);
}

$('#module-nav').addEventListener('click',function(event){const button=event.target.closest('[data-module]');if(!button)return;state.module=button.dataset.module;renderRail();showModuleMenu(state.module);});
$('.logo').addEventListener('click',function(){selectPage('dashboard');});
$('#module-menu').addEventListener('click',function(event){if(event.target.id==='menu-close'){$('#module-menu').classList.remove('open');return;}const button=event.target.closest('[data-page]');if(button)selectPage(button.dataset.page);});
$('#page-tabs').addEventListener('click',function(event){if(DocumentWorkspace.tabClick(event))return;const close=event.target.closest('[data-close]');if(close){event.stopPropagation();const id=close.dataset.close;state.tabs=state.tabs.filter(function(tab){return tab!==id;});if(state.page===id)selectPage(state.tabs[state.tabs.length-1] || 'dashboard');else renderTabs();return;}const button=event.target.closest('[data-page]');if(button)selectPage(button.dataset.page);});
$('#workspace').addEventListener('click',async function(event){
  if(DocumentWorkspace.click(event))return;
  const granularity=event.target.closest('[data-report-granularity]');if(granularity){state.reportGranularity=granularity.dataset.reportGranularity;renderPage();return;}
  const reportExport=event.target.closest('[data-report-export]');if(reportExport){exportReport(PAGES[state.page]);return;}
  const reportColumns=event.target.closest('[data-report-columns]');if(reportColumns){state.reportCompact=!state.reportCompact;toast(state.reportCompact?'已切换精简列':'已显示全部列');renderPage();return;}
  const reportQuery=event.target.closest('[data-report-query]');if(reportQuery){toast('正在应用报表筛选');renderPage();return;}
  const reportReset=event.target.closest('[data-report-reset]');if(reportReset){state.reportGranularity='day';state.reportCompact=false;state.reportFilters={store_name:'',site:'',sku:'',date_from:'',date_to:''};toast('报表筛选已重置');renderPage();return;}
  const pageButton=event.target.closest('[data-page]');if(pageButton){selectPage(pageButton.dataset.page);return;}
  if(event.target.closest('[data-retry]')){renderPage();return;}
  const status=event.target.closest('[data-status]');if(status){state.status=status.dataset.status;state.offset=0;loadTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-reset]')){state.query='';state.searchField='all';state.status='全部';state.offset=0;state.filters={date_from:'',date_to:''};state.filtersOpen=false;state.menuOpen=false;loadTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-advanced-filter]')){state.filtersOpen=!state.filtersOpen;renderTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-apply-filters]')){state.filtersOpen=false;state.offset=0;loadTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-more]')){state.menuOpen=!state.menuOpen;renderTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-column-manager]')){state.columnManagerOpen=!state.columnManagerOpen;state.columnDraft=state.columnManagerOpen?getColumnConfig(PAGES[state.page]):null;renderTable(PAGES[state.page]);return;}
  const move=event.target.closest('[data-column-move]');if(move){moveColumnDraft(move.dataset.columnName,Number(move.dataset.columnMove));return;}
  const pin=event.target.closest('[data-column-pin]');if(pin){const key=pin.dataset.columnPin;const list=state.columnDraft.pinnedLeft;const at=list.indexOf(key);if(at>=0)list.splice(at,1);else if(!state.columnDraft.hidden.includes(key))list.push(key);renderTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-column-cancel]')){state.columnManagerOpen=false;state.columnDraft=null;renderTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-column-reset]')){state.columnDraft=defaultColumnConfig(PAGES[state.page]);renderTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-column-apply]')){const draft=state.columnDraft||getColumnConfig(PAGES[state.page]);draft.hidden=[].slice.call(document.querySelectorAll('[data-column-key]')).filter(function(input){return !input.checked;}).map(function(input){return input.dataset.columnKey;});if(!draft.order.some(function(key){return !draft.hidden.includes(key);}))return toast('至少保留一列','error');saveColumnConfig(PAGES[state.page],draft);return;}
  const rowBox=event.target.closest('input[data-row-id]');if(rowBox){if(rowBox.checked)state.selectedIds.add(String(rowBox.dataset.rowId));else state.selectedIds.delete(String(rowBox.dataset.rowId));return;}
  const exportButton=event.target.closest('[data-export]');if(exportButton){downloadCSV(exportButton.dataset.export);return;}
  const rowMenu=event.target.closest('[data-row-menu]');
  if(rowMenu){const row=state.rows.find(function(item){return String(item.id)===rowMenu.dataset.rowMenu;}); if(!row)return; const page=PAGES[state.page]; const old=rowMenu.parentElement.querySelector('.row-menu-popover'); if(old){old.remove();return;} const buttons=[...rowMenu.parentElement.querySelectorAll(':scope > button:not([data-detail]):not([data-row-menu]):not([data-edit])')].map(button=>button.outerHTML); buttons.push('<button data-row-action="detail" data-row-id="'+esc(row.id)+'">查看详情</button>'); if(page.fields&&!page.readonly&&!(page.resource==='users'&&Number(row.id)===1)){buttons.push('<button data-row-action="edit" data-row-id="'+esc(row.id)+'">编辑</button>');buttons.push('<button data-row-action="copy" data-row-id="'+esc(row.id)+'">复制</button>');if(!(page.resource==='users'&&Number(row.id)===1))buttons.push('<button class="danger-text" data-row-action="delete" data-row-id="'+esc(row.id)+'">删除本地记录</button>');} const menu=document.createElement('div'); menu.className='row-menu-popover'; menu.innerHTML=buttons.join(''); rowMenu.parentElement.appendChild(menu); return;}
  const rowAction=event.target.closest('[data-row-action]');
  if(rowAction){const row=state.rows.find(function(item){return String(item.id)===rowAction.dataset.rowId;}),page=PAGES[state.page]; if(!row)return; const action=rowAction.dataset.rowAction; if(action==='detail')showDetail(row); else if(action==='edit')openRecord(row); else if(action==='copy')openRecord(copyRecord(row,page)); else if(action==='delete')deleteRecord(row,page); const popover=rowAction.closest('.row-menu-popover'); if(popover)popover.remove(); return;}
  if(event.target.closest('[data-view]')){state.view=event.target.closest('[data-view]').dataset.view;renderTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-print]')){window.print();return;}
  if(event.target.closest('[data-import-template]')){downloadCSV(true);return;}
  if(event.target.closest('[data-import]')){selectCSVFile(PAGES[state.page]);return;}
  if(event.target.closest('[data-dismiss-import]')){state.importSummary=null;renderTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-copy]')){const checked=[].slice.call(document.querySelectorAll('.table-shell tbody input[data-row-id]:checked'));const id=checked[0]&&checked[0].dataset.rowId;const page=PAGES[state.page];const selected=state.rows.find(function(row){return String(row.id)===String(id);});if(selected)openRecord(copyRecord(selected,page));else toast('请先选择一条记录','error');return;}
  const bulk=event.target.closest('[data-bulk-status]');if(bulk){const checked=[].slice.call(document.querySelectorAll('.table-shell tbody input[data-row-id]:checked'));if(!checked.length){toast('请先选择记录','error');return;}if(!await erpConfirm('批量操作仅修改状态字段，不自动过账、收付款或出入库。确认修改所选本地记录？'))return;const page=PAGES[state.page];const statusKey=bulk.dataset.bulkField || 'status_text';Promise.all(checked.map(function(box){return api('/api/v1/'+page.resource+'/'+box.dataset.rowId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify((function(){const value={};value[statusKey]=bulk.dataset.bulkStatus;return value;})())});})).then(function(){toast('已更新 '+checked.length+' 条记录');state.menuOpen=false;loadTable(page);}).catch(function(error){toast(error.message,'error');});return;}
  const selectAll=event.target.closest('.table-shell thead input[type="checkbox"]');if(selectAll){document.querySelectorAll('.table-shell tbody input[data-row-id]').forEach(function(box){box.checked=selectAll.checked;if(box.checked)state.selectedIds.add(String(box.dataset.rowId));else state.selectedIds.delete(String(box.dataset.rowId));});return;}
  if(event.target.closest('[data-create]')){if(state.page==='product-management')selectPage('product-add');else openRecord();return;}
  const filterButton=event.target.closest('.filter-bar>button');if(filterButton && !filterButton.dataset.reset){toast('筛选条件：可使用关键词、状态标签和重置；此演示保留字段筛选入口');return;}
  const detail=event.target.closest('[data-detail]');if(detail){showDetail(state.rows.find(function(row){return String(row.id)===detail.dataset.detail;}));return;}
  const related=event.target.closest('[data-related-id]');if(related){selectPage(related.dataset.relatedPage,{recordId:Number(related.dataset.relatedId)});return;}
  const smart=event.target.closest('[data-smart-link]');if(smart){const key=smart.dataset.smartLink;const target=key==='sku'?'product-management':key==='warehouse_name'?'warehouses':key==='supplier_name'?'supplier-management':key==='shipment_id'?'fba-shipments':key==='reference_no'?'finance-flow':key==='purchase_order_sn'?'purchase-orders':key==='tracking_no'?'logistics-tracking':'sales-orders';const targetResource=PAGES[target]&&PAGES[target].resource;const targetKey={warehouse_name:'name',supplier_name:'name',purchase_order_sn:'order_sn'}[key]||key;state.pendingRecord={resource:targetResource,key:targetKey,value:smart.dataset.smartValue};selectPage(target);return;}
  if(event.target.closest('[data-page-prev]')){state.offset=Math.max(0,state.offset-state.pageSize);loadTable(PAGES[state.page]);return;}
  if(event.target.closest('[data-page-next]')){state.offset+=state.pageSize;loadTable(PAGES[state.page]);return;}
  const edit=event.target.closest('[data-edit]');if(edit){const record=state.detailRecordId?state.detailRecord:state.rows.find(row=>String(row.id)===edit.dataset.edit);if(record)openRecord(record);return;}
  const batchPosting=event.target.closest('[data-stock-batch]');if(batchPosting){stockConfirm(batchPosting.dataset.stockBatch,[...state.selectedIds]);return;}
  const posting=event.target.closest('[data-stock-confirm]');if(posting){stockConfirm(posting.dataset.stockConfirm,posting.dataset.id);return;}
  const ledger=event.target.closest('[data-stock-ledger]');if(ledger){stockLedger(ledger.dataset.stockLedger,ledger.dataset.id);return;}
  const action=event.target.closest('[data-workflow]');if(action){workflow(action.dataset.workflow,action.dataset.id);}
});
$('#detail-dialog').addEventListener('click',function(event){const related=event.target.closest('[data-related-id]');if(!related)return;$('#detail-dialog').close();state.pendingRecord={resource:related.dataset.relatedResource,id:Number(related.dataset.relatedId)};selectPage(related.dataset.relatedPage);});
function queueTableSearch(input,composing=false){
  state.query=input.value;state.offset=0;if(state.activeRequest)state.activeRequest.abort();
  pendingTable(PAGES[state.page]);clearTimeout(state.searchTimer);
  if(!composing&&!state.searchComposing)state.searchTimer=setTimeout(function(){loadTable(PAGES[state.page]);},300);
}
$('#workspace').addEventListener('compositionstart',function(event){if(event.target.id==='table-search'){state.searchComposing=true;queueTableSearch(event.target,true);}});
$('#workspace').addEventListener('compositionend',function(event){if(event.target.id==='table-search'){state.searchComposing=false;queueTableSearch(event.target);}});
$('#workspace').addEventListener('input',function(event){DocumentWorkspace.input(event);if(event.target.id==='table-search')queueTableSearch(event.target,event.isComposing);if(event.target.id==='search-field'){state.searchField=event.target.value;}if(event.target.dataset.filter){state.filters[event.target.dataset.filter]=event.target.value;}if(event.target.dataset.reportInput){state.reportFilters[event.target.dataset.reportInput]=event.target.value;}});
function jumpTablePage(input){const max=Math.max(1,Math.ceil(state.total/state.pageSize));const n=Math.min(max,Math.max(1,Math.floor(Number(input.value)||1)));state.offset=(n-1)*state.pageSize;loadTable(PAGES[state.page]);}
$('#workspace').addEventListener('keydown',function(event){DocumentWorkspace.keydown(event);if(event.target.hasAttribute('data-page-jump')&&event.key==='Enter'){event.preventDefault();jumpTablePage(event.target);}});
$('#workspace').addEventListener('change',function(event){
  if(event.target.hasAttribute('data-column-key')){const key=event.target.dataset.columnKey,draft=state.columnDraft;if(draft){draft.hidden=draft.hidden.filter(k=>k!==key);if(!event.target.checked){draft.hidden.push(key);draft.pinnedLeft=draft.pinnedLeft.filter(k=>k!==key);}}return;}
  if(event.target.id==='search-field'){state.searchField=event.target.value;state.offset=0;loadTable(PAGES[state.page]);}
  if(event.target.hasAttribute('data-page-size')){state.pageSize=Number(event.target.value);state.offset=0;loadTable(PAGES[state.page]);}
  if(event.target.hasAttribute('data-page-jump'))jumpTablePage(event.target);
  if(event.target.dataset.filter&&event.target.tagName==='SELECT'){state.filters[event.target.dataset.filter]=event.target.value;state.offset=0;loadTable(PAGES[state.page]);}
});
$('#detail-dialog').addEventListener('click',event=>{if(event.target.closest('[data-detail-retry]')){event.preventDefault();showDetail(state.detailTarget.row,state.detailTarget.resource);}});
document.addEventListener('click',event=>{if(state.menuOpen&&!event.target.closest('[data-more],.toolbar-menu')){state.menuOpen=false;const menu=$('.toolbar-menu');if(menu)menu.hidden=true;}});
$('#workspace').addEventListener('scroll',()=>{if(state.menuOpen){state.menuOpen=false;const menu=$('.toolbar-menu');if(menu)menu.hidden=true;}});
$('#workspace').addEventListener('submit',function(event){if(event.target.id==='product-page-form'){event.preventDefault();saveProductPage(event.target);}});
$('#record-save').addEventListener('click',saveRecord);
$('#workspace').addEventListener('click',function(event){const button=event.target.closest('.page-toolbar .icon-only');if(!button)return;if(button.textContent.trim()==='↻'){toast('正在刷新数据');loadTable(PAGES[state.page]);}else if(button.textContent.trim()==='?'){toast('筛选支持关键词、状态与分页');}});
function csvEscape(value){return '"'+String(value??'').replaceAll('"','""')+'"';}
async function downloadCSV(mode){
  if(state.exportRequest)return toast('已有导出任务，请等待完成或取消','error');
  const page=PAGES[state.page],template=mode===true;const definitions=template?(page.fields||[]):getVisibleColumns(page);let rows=[];
  if(!template){
    const params=new URLSearchParams({limit:'200',offset:'0'});if(mode==='selected'){const ids=[...state.selectedIds];if(!ids.length){toast('请先选择记录','error');return;}params.set('ids',ids.join(','));}else{if(state.query)params.set('q',state.query);if(state.searchField!=='all')params.set('field',state.searchField);if(state.status!=='全部')params.set('status',state.status);Object.keys(state.filters).forEach(function(key){if(state.filters[key])params.set(key,state.filters[key]);});}
    if(page.id==='fba-inventory')params.set('inventory_scope','fba');
    const controller=new AbortController();state.exportRequest=controller;
    const progress=document.createElement('div');progress.className='export-progress';progress.setAttribute('role','status');
    const label=document.createElement('span');label.textContent='正在准备导出…';
    const cancel=document.createElement('button');cancel.textContent='取消导出';cancel.type='button';cancel.onclick=()=>controller.abort();
    progress.append(label,cancel);$('#toast-region').append(progress);
    try{
      const first=await api('/api/v1/'+page.resource+'?'+params,{signal:controller.signal});
      const total=Number(first.total||0);
      if(total>10000)throw Error('当前匹配 '+total+' 条；单次导出上限10000条，请缩小日期或筛选范围');
      rows=(first.items||[]).slice();label.textContent='已读取 '+rows.length+' / '+total+' 条';
      for(let offset=200;offset<total;offset+=200){
        params.set('offset',String(offset));const next=await api('/api/v1/'+page.resource+'?'+params,{signal:controller.signal});
        if(next.total!==first.total)throw Error('导出期间记录数量变化，请重新导出');
        rows=rows.concat(next.items||[]);label.textContent='已读取 '+rows.length+' / '+total+' 条';
      }
      if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
      if(rows.length!==total||new Set(rows.map(r=>r.id)).size!==total)throw Error('分页记录不完整或重复，请重新导出');
    }catch(error){toast(controller.signal.aborted?'导出已取消':'导出失败：'+error.message,'error');return;}
    finally{progress.remove();if(state.exportRequest===controller)state.exportRequest=null;}
  }
  const safe=function(value){const text=String(value??'');return /^[-=+@]/.test(text)?"'"+text:text;};const csv=[definitions.map(function(item){return item.label;})].concat(rows.map(function(row){return definitions.map(function(item){return safe(row[item.key]??'');});})).map(function(row){return row.map(csvEscape).join(',');}).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=page.title+(template?'-导入模板':'')+'-'+TODAY_ISO+'.csv';a.click();URL.revokeObjectURL(a.href);toast(template?'已下载可填写的 CSV 导入模板':'已导出 '+rows.length+' 条');
}
function parseCSV(text){
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i+=1){const char=text[i];if(quoted){if(char==='"'&&text[i+1]==='"'){cell+='"';i+=1;}else if(char==='"')quoted=false;else cell+=char;}else if(char==='"')quoted=true;else if(char===','){row.push(cell);cell='';}else if(char==='\n'){row.push(cell);rows.push(row);row=[];cell='';}else if(char!=='\r')cell+=char;}
  if(quoted)throw new Error('CSV 引号未闭合'); if(cell!==''||row.length){row.push(cell);rows.push(row);} return rows.filter(function(item){return item.some(function(value){return value.trim()!=='';});});
}
function selectCSVFile(page){
  const input=document.createElement('input'); input.type='file'; input.accept='.csv,text/csv'; input.hidden=true; document.body.appendChild(input);
  input.addEventListener('change',function(){const file=input.files&&input.files[0];input.remove();if(file)importCSVFile(file,page);},{once:true}); input.addEventListener('cancel',function(){input.remove();},{once:true}); input.click();
}
async function importCSVFile(file,page){
  try{
    if(!page.fields||page.readonly)throw new Error('当前页面不支持导入'); if(file.size>2_000_000)throw new Error('CSV 文件不能超过 2MB');
    const rows=parseCSV((await file.text()).replace(/^\ufeff/,'')); if(rows.length<2)throw new Error('CSV 至少需要表头和一行数据'); if(rows.length>501)throw new Error('单次最多导入 500 行');
    const fields=page.fields||[]; const aliases=new Map(); fields.forEach(function(item){aliases.set(item.key,item);aliases.set(item.label,item);}); (page.columns||[]).forEach(function(item){const definition=fields.find(function(fieldItem){return fieldItem.key===item.key;});if(definition)aliases.set(item.label,definition);});
    const headers=rows[0].map(function(value){return value.trim();}); const mapped=headers.map(function(header){return aliases.get(header)||null;}); if(!mapped.some(Boolean))throw new Error('表头未匹配当前页面字段，请先下载模板');if(mapped.some(item=>!item))throw new Error('未知CSV字段：'+headers.filter((h,i)=>!mapped[i]).join('、')+'；未执行导入');
    const duplicates=mapped.filter(Boolean).map(function(item){return item.key;}).filter(function(key,index,list){return list.indexOf(key)!==index;}); if(duplicates.length)throw new Error('CSV 存在重复字段：'+[...new Set(duplicates)].join('、'));
    const valid=[],invalid=[];
    rows.slice(1).forEach(function(values,index){const payload={};let rowInvalid=false; mapped.forEach(function(item,column){if(!item)return;const raw=String(values[column]??'').trim();if(raw==='')return;if(item.type==='number'){const number=Number(raw);if(!Number.isFinite(number)||(item.schema.type==='integer'&&!Number.isSafeInteger(number))||(item.schema.minimum!==undefined&&number<item.schema.minimum)){rowInvalid=true;invalid.push('第 '+(index+2)+' 行 '+item.label+' 数字不符合接口类型/范围');}else payload[item.key]=number;}else if(item.type==='object'){try{const parsed=JSON.parse(raw);if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error();payload[item.key]=parsed;}catch(e){rowInvalid=true;invalid.push('第 '+(index+2)+' 行 '+item.label+' 必须为JSON对象');}}else if(item.type==='array'){try{const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||parsed.some(v=>!v||typeof v!=='object'||Array.isArray(v)))throw Error();payload[item.key]=parsed;}catch(e){rowInvalid=true;invalid.push('第 '+(index+2)+' 行 '+item.label+' 必须为JSON对象数组');}}else payload[item.key]=raw;}); const missing=fields.filter(function(item){return item.required&&(payload[item.key]===undefined||payload[item.key]==='');});if(missing.length)invalid.push('第 '+(index+2)+' 行缺少 '+missing.map(function(item){return item.label;}).join('、'));if(!rowInvalid&&!missing.length)valid.push({line:index+2,payload:payload});});
    let success=0; const failures=invalid.slice();
    for(const item of valid){try{await api('/api/v1/'+page.resource,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item.payload)});success+=1;}catch(error){failures.push('第 '+item.line+' 行：'+error.message);}}
    if(!valid.length && failures.length)throw new Error('校验失败：'+failures.slice(0,3).join('；')+(failures.length>3?'；另有 '+(failures.length-3)+' 项错误':''));
    state.importSummary={type:failures.length?'warning':'success',title:failures.length?'导入部分完成':'导入完成',message:'成功 '+success+' 行，失败 '+failures.length+' 行'+(failures.length?'；'+failures.slice(0,3).join('；'):'')};
    if(state.page===page.id)await loadTable(page); toast(failures.length?'CSV 导入部分完成':'CSV 导入成功',failures.length?'error':'');
  }catch(error){state.importSummary={type:'error',title:'导入失败',message:error.message};if(state.page===page.id)renderTable(page);toast(error.message,'error');}
}
window.addEventListener('popstate',function(event){if($('#detail-dialog').open)$('#detail-dialog').close();if($('#record-dialog').open)$('#record-dialog').close();state.pendingRecord=null;const route=BusinessWorkspace.parseRoute(location.hash),id=PAGES[route.page]?route.page:'dashboard';selectPage(id,{recordId:route.id,skipHistory:true,restore:event.state?.page===id?event.state.list:null});});
// Initial routing waits for the versioned OpenAPI contract below.
$('#rail-collapse').addEventListener('click',()=>{if($('#module-menu').classList.contains('open'))$('#module-menu').classList.remove('open');else showModuleMenu(state.module==='home'?'product':state.module);});
$('#contract-help').addEventListener('click',()=>selectPage('api-docs'));
$('#account-button').addEventListener('click',function(){if(!$('#login-dialog').open)$('#login-dialog').showModal();});
$('#login-submit').addEventListener('click',async function(){
  const button=$('#login-submit');if(button.disabled)return;
  const label=button.textContent;button.disabled=true;button.textContent='登录中…';button.setAttribute('aria-busy','true');
  $('#login-error').textContent='';
  try{await createSession($('#login-role').value,$('#login-app-id').value.trim(),$('#login-app-secret').value);$('#login-app-secret').value='';$('#login-dialog').close();toast('登录成功');if(!$('#record-dialog').open&&!$('#product-page-form'))renderPage();}
  catch(error){$('#login-error').textContent=error.message;}
  finally{button.disabled=false;button.textContent=label;button.removeAttribute('aria-busy');}
});
$('#login-dialog').addEventListener('cancel',function(event){if(!state.token)event.preventDefault();});
$('#login-dialog form').addEventListener('submit',function(event){event.preventDefault();$('#login-submit').click();});
$('#record-form').addEventListener('submit',function(event){if(!event.submitter){event.preventDefault();saveRecord();}});
document.addEventListener('keydown',function(event){if(event.key==='Escape'){ $('#module-menu').classList.remove('open'); state.columnManagerOpen=false; const page=PAGES[state.page]; if(page&&page.columns&&!page.type&&!state.detailRecordId&&!$('#record-dialog').open&&!$('#detail-dialog').open)renderTable(page); }});

async function boot(){
  renderRail();renderTabs();
  try{await loadContract();const route=BusinessWorkspace.parseRoute(location.hash),bootPage=route.page;if(bootPage&&PAGES[bootPage])selectPage(bootPage,{recordId:route.id,skipHistory:true});else renderPage();}
  catch(error){$('#workspace').innerHTML='<div class="load-error"><b>接口契约加载失败：维护入口已禁用</b><span>'+esc(error.message)+'</span><button id="contract-retry">重试</button></div>';$('#contract-retry').onclick=boot;}
}
boot();
