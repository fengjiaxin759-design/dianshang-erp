"""Read models computed from local source documents, not hard-coded totals."""
from collections import defaultdict
from datetime import date, timedelta
from .store import *

def accessible(db,user,resource):
    return [r for r in rows(db,resource) if visible(db,user,r)]

def net(row):
    return row.get('economics',{}).get('net_cents',0 if row.get('status_text') in {'已取消','已退款'} else cents(row.get('amount',0)))

def dashboard(db,user):
    inventory=accessible(db,user,'inventory')
    sales=accessible(db,user,'sales-orders')
    purchase=accessible(db,user,'purchase-orders')
    approvals=accessible(db,user,'approvals')
    products={p['sku']:p for p in rows(db,'products')}
    period=date.today().strftime('%Y-%m')
    current=[s for s in sales if str(s.get('order_time','')).startswith(period)]
    total=defaultdict(int)
    for s in current:
        total[s.get('currency','USD')]+=net(s)
    trend=[]
    for i in reversed(range(10)):
        day=(date.today()-timedelta(days=i)).isoformat()
        trend.append({'stat_date':day,'amount':amount(sum(net(s) for s in sales if str(s.get('order_time','')).startswith(day) and s.get('currency')=='USD'))})
    return {'cards':{'sku_count':len(products),'inventory_quantity':sum(r['quantity'] for r in inventory),'inventory_available':sum(r['available'] for r in inventory),'inventory_local_available':sum(r['available'] for r in inventory if r['warehouse_name']=='华东仓'),'inventory_value_cny':amount(sum(cents(products.get(r['sku'],{}).get('cost',0))*r['quantity'] for r in inventory)),'pending_purchase':sum(r.get('status_text')!='已完成' for r in purchase),'pending_sales':sum(r.get('status_text') in {'待审核','待发货','部分发货'} for r in sales),'pending_approvals':sum(r['status_text']=='审批中' for r in approvals),'urgent_replenishment':sum(r.get('urgency') in {'P0','P1'} for r in accessible(db,user,'replenishment')),'shipping_quantity':sum(r.get('quantity',0) for r in accessible(db,user,'shipping-plans') if r.get('status_text')!='已完成'),'sales_amount':amount(total['USD']),'sales_by_currency':[{'currency':k,'amount':amount(v)} for k,v in total.items()],'sales_basis':'原币净销售','period':period},'trend':trend,'alerts':[r for r in inventory if r['available']<100][:8],'generated_at':now()}

def report(db,user,query,ads=False):
    resource='ad-campaigns' if ads else 'sales-orders'
    selected=page(accessible(db,user,resource),{**query,'offset':0,'limit':2000,'view':'report'})['items']
    if query.get('sku') and not ads:
        selected=[r for r in selected if any(query['sku'] in i.get('sku','') for i in r.get('item_list',[]))]
    if query.get('kind')=='profit':
        shipped={f['order_id']:sum(i['quantity'] for shipment in f['shipments'] for i in shipment['item_list']) for f in rows(db,'sales-flows')}
        selected=[r for r in selected if shipped.get(r['id'],0)]
    grouped=defaultdict(lambda:{'count':0,'amount':0})
    for r in selected:
        day=str(r.get('order_time') or r.get('created_at'))[:10]
        if query.get('granularity')=='month':
            day=day[:7]
        elif query.get('granularity')=='week':
            parsed=date.fromisoformat(day)
            day=(parsed-timedelta(days=parsed.weekday())).isoformat()
        currency=r.get('currency','USD')
        group=grouped[(day,currency)]
        group['count']+=1
        value=cents(r.get('sales',0)) if ads else net(r)
        if query.get('kind')=='profit':
            e=r.get('economics',{})
            ordered=sum(i['quantity'] for i in r.get('item_list',[]))
            recognized=round(net(r)*shipped[r['id']]/max(ordered,1))
            divisor=e.get('fx_cny_per_usd',7.1) if r.get('currency')=='USD' else 1
            value=recognized-round(e.get('cogs_cny_cents',0)/divisor)
        group['amount']+=value
    totals=defaultdict(int)
    for (_,currency),g in grouped.items():
        totals[currency]+=g['amount']
    text=' / '.join(f'{c} {amount(v):.2f}' for c,v in totals.items()) or '0'
    label='广告归因销售' if ads else '贡献利润' if query.get('kind')=='profit' else '净销售额'
    metrics=[[label,text,'本地已发货数量口径；未含真实平台费用' if query.get('kind')=='profit' else '根据本地业务记录计算'],['订单/记录数',str(len(selected)),'当前筛选'],['统计期间',query.get('granularity','day'),'可导出结果']]
    if ads:
        spend=sum(cents(r.get('spend',0)) for r in selected)
        metrics.append(['广告花费',f'USD {amount(spend):.2f}','本地广告数据'])
    return {'source_count':len(selected),'metrics':metrics,'summary':{'headers':['期间','币种','记录数',label],'rows':[[d,c,g['count'],f'{amount(g["amount"]):.2f}'] for (d,c),g in sorted(grouped.items(),reverse=True)]}}

def balances(db,user,kind,query):
    resource='sales-orders' if kind=='receivable' else 'purchase-orders'
    result=[]
    for r in accessible(db,user,resource):
        payments=[p for p in rows(db,'finance') if p.get('order_id' if kind=='receivable' else 'purchase_id')==r['id']]
        currency=r.get('currency') or r.get('purchase_currency','CNY')
        paid=sum(cents(p['amount']) for p in payments)
        if kind=='payable':
            paid=-paid
        refunds=sum(-cents(p['amount']) for p in payments if cents(p['amount'])<0 and kind=='receivable')
        gross=cents(r['amount'])
        result.append({'id':r['id'],'source_resource':resource,'order_sn':r['order_sn'],'counterparty':r.get('buyer') or r.get('supplier_name'),'currency':currency,'ordered_amount':f'{amount(gross):.2f}','due_amount':f'{amount(gross):.2f}','recorded_paid':f'{amount(paid+refunds):.2f}','reversed_amount':f'{amount(refunds):.2f}','balance':f'{amount(gross-paid):.2f}','evidence_status':'verified','voucher_ids':[p['id'] for p in payments],'order_status':r['status_text']})
    return {**page(result,query),'kind':kind}

def context(db,user,resource,record_id):
    record=scoped_get(db,user,resource,record_id)
    related=[]
    page_map={'products':'product-management','inventory':'inventory','sales-orders':'sales-orders','purchase-orders':'purchase-orders','inbound-orders':'inbounds','outbound-orders':'outbounds','finance':'finance-flow','supplier-deliveries':'receiving','approvals':'purchase-approvals','shipping-plans':'fba-plans','fba-delivery-orders':'fba-delivery-orders','suppliers':'supplier-management','warehouses':'warehouses','listings':'listing'}
    items=record.get('item_list',[])
    skus={i.get('sku') for i in items}|{record.get('sku')}
    skus.discard(None)
    for target in page_map:
        if '*' not in user['permissions'] and target+':read' not in user['permissions']:
            continue
        for r in accessible(db,user,target):
            if target==resource and r['id']==record_id:
                continue
            has_sku=bool(skus&({r.get('sku')}|{i.get('sku') for i in r.get('item_list',[])}))
            has_source=bool(record.get('order_sn') and record['order_sn'] in {r.get('purchase_order_sn'),r.get('source_order_sn')})
            if has_sku or has_source:
                related.append({'resource':target,'page':page_map[target],'id':r['id'],'label':r.get('order_sn') or r.get('batch_no') or r.get('name') or r.get('reference_no') or r.get('delivery_no') or str(r['id']),'relationship':'业务关联','record':r})
    timeline=[r for r in rows(db,'audit-logs') if f'/{resource}/{record_id}' in r.get('path','')][-50:]
    return {'record':record,'items':items,'related':related[:100],'timeline':timeline}

def aging(db,user,query):
    result=[]
    for r in accessible(db,user,'inventory'):
        if query.get('inventory_id') and str(r['id'])!=query['inventory_id']:
            continue
        entry=str(r.get('entry_time',r['created_at']))[:10]
        age=max(0,(date.today()-date.fromisoformat(entry)).days)
        bucket=next(label for limit,label in [(30,'0–30'),(60,'31–60'),(90,'61–90'),(180,'91–180'),(365,'181–365'),(10**9,'>365')] if age<=limit)
        result.append({**r,'entry_time':entry,'age_days':age,'bucket':bucket,'reason':None})
    filtered=page(result,{**query,'offset':0,'limit':200})['items']
    grouped={}
    for r in filtered:
        summary=grouped.setdefault(r['bucket'],{'bucket':r['bucket'],'batches':0,'quantity':0,'available':0,'known_quantity':0,'known_available':0,'unknown_quantity_batches':0,'unknown_available_batches':0})
        summary['batches']+=1
        for key in ['quantity','available']:
            summary[key]+=r[key]
            summary['known_'+key]+=r[key]
    ledger_rows=[l for l in accessible(db,user,'stock-ledger') if str(l['inventory_id'])==query.get('inventory_id')]
    offset=integer(query.get('ledger_offset',0))
    return {**page(result,query),'summary':list(grouped.values()),'as_of':date.today().isoformat(),'quantity':sum(r['quantity'] for r in filtered),'known_quantity':sum(r['quantity'] for r in filtered),'unknown_quantity_batches':0,'ledger':ledger_rows[offset:offset+200],'ledger_total':len(ledger_rows)}

def directory(db,user,query):
    require(query.get('kind') in {'carrier','channel'},'目录类型无效',400)
    key='carrier' if query['kind']=='carrier' else 'logistics_channel'
    shipments=accessible(db,user,'shipments')
    if 'name' in query:
        return {**page([r for r in shipments if r.get(key,'')==query['name']],{k:v for k,v in query.items() if k not in {'name','kind'}}),'view':'shipments'}
    groups=defaultdict(list)
    for s in shipments:
        groups[s.get(key,'')].append(s)
    return {**page([{'name':name,'shipment_count':len(v),'country_count':len({r.get('country','美国') for r in v}),'in_transit_count':sum(r.get('status_text')=='运输中' for r in v),'received_count':sum(r.get('status_text')=='已签收' for r in v)} for name,v in groups.items()],{k:v for k,v in query.items() if k!='kind'}),'view':'groups'}

def target_view(db,user,r):
    orders=[s for s in accessible(db,user,'sales-orders') if s.get('store_id')==r['store_id'] and s.get('currency')==r['currency'] and str(s.get('order_time','')).startswith(r['month'])]
    actual=sum(net(s) for s in orders)
    goal=r.get('target_cents',cents(r.get('target_amount',0)))
    return {**r,'target_cents':goal,'target_amount':f'{amount(goal):.2f}','scope_valid':True,'orders':len(orders),'fallback_orders':0,'unknown_orders':0,'actual_cents':actual,'actual_net':f'{amount(actual):.2f}','achievement_percent':f'{actual/goal*100:.2f}' if goal else '0','gap':f'{amount(goal-actual):.2f}','reason':None},[{**s,'net_cents':net(s),'fallback':False} for s in orders]

def version_list(db,user,resource,query,key):
    data=accessible(db,user,resource)
    if query.get('history')!='1':
        latest={}
        for r in data:
            group=(r.get(key),r.get('kind'))
            if group not in latest or r.get('version',1)>latest[group].get('version',1):
                latest[group]=r
        data=list(latest.values())
    if resource=='sales-targets':
        if query.get('target_id'):
            data=[r for r in data if str(r['id'])==query['target_id']]
        enriched=[target_view(db,user,r) for r in data]
        result=page([r for r,_ in enriched],query)
        selected_orders=enriched[0][1] if enriched and query.get('target_id') else []
        offset=integer(query.get('orders_offset',0))
        result['orders']=selected_orders[offset:offset+50]
        return result
    return page(data,query)
