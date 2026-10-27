"""HTTP-independent API dispatcher for the local ERP."""
import re
from datetime import date
from .store import *
from . import commerce, stock, changes, views, extensions

WRITE_SCHEMAS={name[len('Resource_'):-len('_Write')].replace('_','-'):schema for name,schema in CONTRACT['components']['schemas'].items() if name.startswith('Resource_') and name.endswith('_Write')}
GENERIC=set(WRITE_SCHEMAS)|{'audit-logs'}

def validate(value,schema,label='字段'):
    if '$ref' in schema:
        schema=CONTRACT['components']['schemas'][schema['$ref'].split('/')[-1]]
    if value is None:
        require(schema.get('nullable'),label+'不允许为NULL',400)
        return
    kind=schema.get('type')
    matches={'object':isinstance(value,dict),'array':isinstance(value,list),'string':isinstance(value,str),'number':isinstance(value,(int,float)) and not isinstance(value,bool),'integer':isinstance(value,int) and not isinstance(value,bool),'boolean':isinstance(value,bool)}
    if kind:
        require(matches.get(kind,True),label+'类型错误',400)
    if kind in {'number','integer'}:
        require(math.isfinite(value),label+'必须为有限数字',400)
        if 'minimum' in schema:
            require(value>=schema['minimum'],label+'小于允许最小值',400)
    if kind=='object':
        require(all(key in value for key in schema.get('required',[])),label+'缺少必填字段',400)
        if schema.get('additionalProperties') is False:
            require(set(value)<=set(schema.get('properties',{})),label+'包含未知字段',400)
        for key,item in value.items():
            if key in schema.get('properties',{}):
                validate(item,schema['properties'][key],label+'.'+key)
    if kind=='array':
        for item in value:
            validate(item,schema.get('items',{}),label+'[]')

def scrub_costs(user,value):
    if '*' in user['permissions'] or 'costs:read' in user['permissions']:
        return value
    sensitive={'cost','unit_price','purchase_unit_price','profit','economics','amount','freight','other_fee','head_freight','unit_cost','customs_price','inventory_value_cny','sales_amount','price','refund_amount','net_cents','settlement_cents','cogs_cny_cents','fee_cents'}
    if isinstance(value,dict):
        return {key:scrub_costs(user,item) for key,item in value.items() if key not in sensitive}
    if isinstance(value,list):
        return [scrub_costs(user,item) for item in value]
    return value

def defaults(db,resource,body):
    record=dict(body)
    if resource in {'purchase-orders','sales-orders','shipping-plans','supplier-deliveries','inbound-orders','outbound-orders'}:
        if record.get('item_list'):
            stock.lines(db,record['item_list'])
    if resource=='purchase-orders':
        qty=sum(i['quantity'] for i in record.get('item_list',[]))
        record.update(status_text='待提交',payment_status='未付款',received_qty=0,pending_qty=qty,payments=[])
        record.setdefault('purchase_currency','CNY')
        record.setdefault('order_time',now())
    elif resource=='sales-orders':
        record.update(status_text='待审核',payment_status='待支付',fulfillment_status='待审核',refund_status='无退款')
        record.setdefault('order_time',now())
        record.setdefault('currency','USD')
        rates=[r for r in rows(db,'exchange-rates') if r['effective_date']<=str(record['order_time'])[:10]]
        fx=max(rates,key=lambda r:(r['effective_date'],r['version']))['rate'] if rates else '7.1'
        record['economics']={'net_cents':cents(record.get('amount',0)),'settlement_cents':cents(record.get('amount',0)),'cogs_cny_cents':0,'fee_cents':0,'fx_cny_per_usd':float(fx)}
    elif resource=='shipping-plans':
        record.update(status_text='待提交',approval_status='未提交',locked_quantity=0,fba_workflow={'managed':True,'allocation':{'state':'unallocated'}})
    elif resource=='supplier-deliveries':
        record.update(status_text='未收货',received_qty=0,qc_status='待检')
        record.setdefault('total_qty',sum(i['quantity'] for i in record.get('item_list',[])))
    elif resource=='inbound-orders':
        record.update(status_text='待入库')
        record.setdefault('qc_status','免检')
    elif resource=='outbound-orders':
        record.update(status_text='待拣货')
    elif resource=='products':
        record.setdefault('official_attributes',{})
        record.setdefault('status','在售')
    elif resource=='inventory':
        require(record.get('quantity',0)>=record.get('available',0),'可用库存不能超过总库存',400)
        record.setdefault('defective',0)
        record.setdefault('reserved',0)
        record.setdefault('unavailable_other',record.get('quantity',0)-record.get('available',0))
        record.setdefault('entry_time',now())
    return record

def generic(db,user,method,resource,record_id,query,body):
    permit(user,resource+(':'+('read' if method=='GET' else 'delete' if method=='DELETE' else 'write')))
    require(method=='GET' or (method=='POST' and record_id is None) or (method in {'PUT','DELETE'} and record_id is not None),'HTTP方法与资源路径不匹配',405)
    if method=='GET':
        return scoped_get(db,user,resource,record_id) if record_id else page(views.accessible(db,user,resource),query)
    require(resource in WRITE_SCHEMAS,'该资源只读',405)
    require(resource not in {'approvals','fba-delivery-orders'} or method=='PUT','该资源须通过专用业务流程创建',409)
    old=scoped_get(db,user,resource,record_id) if record_id else None
    if method=='DELETE':
        require(resource not in {'sales-orders','inventory','inbound-orders','outbound-orders','finance','purchase-orders','shipping-plans','supplier-deliveries','fba-delivery-orders'},'业务单据保留审计，请通过取消或冲销处理',409)
        require(not any(r.get('sku')==old.get('sku') for r in rows(db,'inventory')) if resource=='products' else True,'产品已有库存，不能删除')
        db.execute('DELETE FROM records WHERE resource=? AND id=?',(resource,record_id))
        return ok({'id':record_id})
    require(method in {'POST','PUT'},'方法不支持',405)
    validate(body,WRITE_SCHEMAS[resource],resource)
    for key in body:
        schema=WRITE_SCHEMAS[resource]['properties'].get(key,{})
        require(schema.get('x-edit-policy')!='workflow_owned' and schema.get('x-maintenance-mode')!='workflow-managed',key+'由专用流程维护',400)
    if old:
        require(not old.get('posted') and not old.get('immutable') and not old.get('workflow_owner'),'已过账或关联凭证禁止直接编辑')
        if resource=='inventory':
            require(not any(r['inventory_id']==record_id for r in rows(db,'stock-ledger')) and not old.get('reserved'),'已进入业务流程的库存禁止直接编辑')
        if resource=='purchase-orders' and old['status_text'] not in {'待提交','已驳回'}:
            require(set(body)<={'remark','payment_plan','logistics_provider','tracking_no','planned_arrival'},'已审批采购应通过采购变更修改')
        if resource=='sales-orders':
            require(commerce.flow(db,old)['state']=='unpaid' or set(body)<={'remark'},'已收款销售只能修改备注')
        if resource=='shipping-plans':
            require(old.get('approval_status') in {'未提交','已驳回'},'已提交FBA计划禁止直接修改')
        updated={**old,**body}
    else:
        updated=defaults(db,resource,body)
    unique={'products':'sku','purchase-orders':'order_sn','sales-orders':'order_sn','suppliers':'supplier_code','warehouses':'warehouse_code','shipping-plans':'plan_no','supplier-deliveries':'delivery_no','inbound-orders':'order_sn','outbound-orders':'order_sn'}
    key=unique.get(resource)
    if key:
        require(updated.get(key),'请填写业务唯一编号：'+key,400)
        require(not any(r.get(key)==updated[key] and r['id']!=record_id for r in rows(db,resource)),'业务编号重复',409)
    require(visible(db,user,updated),'修改后的记录不在账号范围内',403)
    if resource in {'purchase-orders','sales-orders'}:
        require(cents(updated.get('amount',0))>0,'订单金额必须大于0',400)
    if resource=='inventory':
        stock.movable(db,updated['warehouse_name'])
        require(updated.get('quantity',0)>=updated.get('available',0),'库存数量必须覆盖可用量',400)
    if resource=='supplier-deliveries':
        po=next((p for p in rows(db,'purchase-orders') if p['order_sn']==updated.get('purchase_order_sn')),None)
        require(po is not None and po.get('status_text') in {'待到货','待采购','部分入库'},'来源采购未下单或不能继续到货')
        require(visible(db,user,po),'来源采购不在账号范围内',403)
    record=put(db,resource,updated) if old else add(db,resource,updated)
    if resource=='sales-orders' and not old:
        commerce.flow(db,record)
    return ok(record,id=record['id'])

def access(db,user,method,parts,body):
    permit(user,'*')
    kind=parts[0]
    if kind=='catalog':
        permissions={key:key for key in json.loads((ROOT/'analysis/reference-response-shapes.json').read_text(encoding='utf-8'))['access/catalog']['shape']['permissions']}
        return {'permissions':permissions,'scope_supported_resources':sorted(GENERIC),'scope':'店铺及仓库范围'}
    require(kind in {'accounts','roles'},'账号管理路径不存在',404)
    table=kind
    if method=='GET':
        return {'items':[json.loads(r[0]) for r in db.execute('SELECT body FROM '+table)]}
    require(method in {'POST','PUT'},'方法不支持',405)
    record_id=parts[1] if len(parts)>1 else body.get('id')
    if kind=='roles':
        require(record_id and body.get('name') and isinstance(body.get('permissions'),list),'角色参数不完整',400)
        require(record_id!='administrator','原管理员角色不可修改')
        if method=='POST':
            require(not db.execute('SELECT 1 FROM roles WHERE id=?',(record_id,)).fetchone(),'角色ID重复')
        else:
            require(db.execute('SELECT 1 FROM roles WHERE id=?',(record_id,)).fetchone() is not None,'角色不存在',404)
        r={'id':record_id,'name':body['name'],'permissions':body['permissions']}
        db.execute('INSERT INTO roles VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',(record_id,json.dumps(r,ensure_ascii=False)))
    else:
        existing=db.execute('SELECT * FROM accounts WHERE id=?',(record_id,)).fetchone() if method=='PUT' else None
        require(method!='PUT' or existing is not None,'账号不存在',404)
        if existing:
            require(not json.loads(existing['body']).get('original_admin'),'原管理员账号不能在此修改')
        require(body.get('username') and body.get('name') and body.get('role_id'),'账号资料不完整',400)
        require(db.execute('SELECT 1 FROM roles WHERE id=?',(body['role_id'],)).fetchone() is not None,'角色不存在',400)
        record_id=int(existing['id']) if existing else db.execute('SELECT COALESCE(MAX(id),0)+1 FROM accounts').fetchone()[0]
        password=body.get('password')
        if not existing or password:
            require(isinstance(password,str) and 12<=len(password)<=128,'密码须为12—128位',400)
            require(sum(bool(re.search(pattern,password)) for pattern in [r'[a-z]',r'[A-Z]',r'\d',r'[^a-zA-Z0-9]'])>=3,'密码至少包含三种字符类别',400)
            encoded=password_hash(password)
        else:
            encoded=existing['password']
        r={k:v for k,v in body.items() if k!='password'}
        r.update(id=record_id,enabled=int(bool(body.get('enabled'))),original_admin=False)
        scope=r.get('scope')
        require(scope is None or isinstance(scope,dict),'数据范围格式错误',400)
        if scope is not None:
            for key,resource in [('shops','store-authorizations'),('warehouses','warehouses')]:
                require(isinstance(scope.get(key,[]),list),'范围必须为数组',400)
                require(set(scope.get(key,[]))<={x['id'] for x in rows(db,resource)},'范围含不存在的店铺或仓库',400)
        db.execute('INSERT INTO accounts VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,password=excluded.password,body=excluded.body',(record_id,r['username'],encoded,json.dumps(r,ensure_ascii=False)))
        if existing and (password or r['role_id']!=json.loads(existing['body'])['role_id'] or not r['enabled']):
            db.execute('DELETE FROM sessions WHERE account_id=?',(record_id,))
    return ok(r)

def dispatch(db,method,path,query,body,token):
    if path=='/healthz':
        return {'status':'ok','service':'independent-local-erp'}
    if path=='/api/auth-server/oauth/access-token' and method=='POST':
        return login(db,body.get('appId',''),body.get('appSecret',''))
    if path=='/api/auth-server/oauth/refresh' and method=='POST':
        old=db.execute('SELECT * FROM sessions WHERE refresh=?',(token_hash(body.get('refreshToken','')),)).fetchone()
        require(old and old['refresh_expires']>time.time(),'刷新会话失效',401)
        user=identity(db,old['account_id'])
        require(user['username']==body.get('appId'),'刷新账号不一致',401)
        new,refresh=secrets.token_urlsafe(32),secrets.token_urlsafe(40)
        db.execute('DELETE FROM sessions WHERE token=?',(old['token'],))
        db.execute('INSERT INTO sessions VALUES(?,?,?,?,?)',(token_hash(new),token_hash(refresh),user['id'],time.time()+3600,time.time()+86400*7))
        return ok({'access_token':new,'refresh_token':refresh})
    user=authenticate(db,token)
    result=route(db,user,method,path,query,body)
    reused=isinstance(result.get('data'),dict) and result['data'].get('reused')
    if method not in {'GET','HEAD'} and not reused and path not in {'/api/v1/service-templates/preview','/api/v1/sales-policies/trial'}:
        sanitized={k:('***' if k in {'password','appSecret','access_token','refreshToken'} else v) for k,v in body.items()}
        audit(db,user,method,path,sanitized)
    return scrub_costs(user,result)

def route(db,user,method,path,query,body):
    require(path.startswith('/api/v1/'),'接口不存在',404)
    parts=path[len('/api/v1/'):].split('/')
    resource=parts[0]
    record_id=integer(parts[1],'ID',1) if len(parts)>1 and parts[1].isdigit() else None
    action=parts[2] if len(parts)>2 else None
    if resource=='me':
        require(method=='GET','身份接口只支持GET',405)
        return ok(user)
    if resource=='access':
        return access(db,user,method,parts[1:],body)
    if resource=='record-context' and method=='GET' and len(parts)==3:
        permit(user,parts[1]+':read')
        return views.context(db,user,parts[1],integer(parts[2],minimum=1))
    if resource=='dashboard' and method=='GET':
        permit(user,'dashboard:read')
        return views.dashboard(db,user)
    if resource in {'sales-report','ad-report'} and method=='GET':
        permit(user,'ad-campaigns:read' if resource=='ad-report' else 'sales-orders:read')
        if query.get('kind')=='profit':
            permit(user,'costs:read')
        return views.report(db,user,query,resource=='ad-report')
    if resource in {'accounts-receivable','accounts-payable'} and method=='GET':
        permit(user,'finance:read')
        permit(user,'costs:read')
        return views.balances(db,user,'receivable' if resource.endswith('receivable') else 'payable',query)
    if resource=='sales-workflow':
        require((method=='GET' and len(parts)==2) or (method=='POST' and len(parts)==3),'销售流程请求路径或方法无效',405)
        sale=scoped_get(db,user,'sales-orders',record_id)
        permit(user,'sales-orders:read' if method=='GET' else 'sales-orders:action:'+str(action))
        return ok(commerce.flow_view(db,sale)) if method=='GET' else commerce.sales_action(db,user,record_id,action,body)
    if resource=='workflows' and method=='POST' and len(parts)==4:
        target,rid,operation=parts[1],integer(parts[2],minimum=1),parts[3]
        permit(user,target+':action:'+operation)
        return commerce.workflow(db,user,target,rid,operation,body)
    if resource=='stock':
        require(len(parts)>=2,'库存接口路径不完整',404)
        if method=='GET':
            permit(user,'stock:read')
            if parts[1]=='ledger':
                data=[r for r in views.accessible(db,user,'stock-ledger') if not query.get('resource') or r['resource']==query['resource']]
                if query.get('record_id'):
                    data=[r for r in data if str(r['record_id'])==query['record_id']]
                return page(data,{k:v for k,v in query.items() if k not in {'resource','record_id'}})
            if parts[1]=='balances':
                return page([{**r,'unavailable_other':r.get('unavailable_other',0)} for r in views.accessible(db,user,'inventory')],query)
            if parts[1]=='transfers':
                return page([{**r,'state':r['transfer_state'],'destination_name':r.get('to_warehouse_name'),'in_transit_quantity':r.get('quantity',sum(i['quantity'] for i in r.get('item_list',[]))) if r['transfer_state']=='in_transit' else 0} for r in views.accessible(db,user,'outbound-orders') if r.get('transfer_state')],query)
        if method=='POST' and len(parts)==3:
            target,operation=parts[1:]
            require(target in {'inbound-orders','outbound-orders'},'不支持的库存资源',400)
            permit(user,target+':action:'+operation)
            ids=body.get('ids',[])
            require(isinstance(ids,list) and 1<=len(ids)<=100 and len(set(ids))==len(ids),'批量须为1—100个不重复ID',400)
            result={'success':0,'fail':0,'failList':[],'successList':[]}
            for rid in ids:
                db.execute('SAVEPOINT single_post')
                try:
                    value=stock.post_document(db,user,target,integer(rid,minimum=1),operation,body.get('reason',''))
                    db.execute('RELEASE single_post')
                    result['success']+=1
                    result['successList'].append(value)
                except Problem as error:
                    db.execute('ROLLBACK TO single_post')
                    db.execute('RELEASE single_post')
                    result['fail']+=1
                    result['failList'].append({'id':rid,'message':error.message})
            return ok(result)
    if resource=='stock-counts':
        permit(user,'stock-counts:'+('read' if method=='GET' else 'write' if not action else action))
        if method=='GET':
            return stock.count_view(scoped_get(db,user,resource,record_id)) if record_id else page([stock.count_view(r) for r in views.accessible(db,user,resource)],query)
        if method=='POST' and not record_id:
            r=stock.count_create(db,user,body)
            return ok(r,id=r['id'])
        if record_id and method in {'POST','PUT'}:
            return ok(stock.count_action(db,user,record_id,action or 'update',body))
    if resource=='purchase-amendments':
        permit(user,'purchase-amendments:'+('read' if method=='GET' else action or 'create'))
        if method=='GET':
            return scoped_get(db,user,resource,record_id) if record_id else page(views.accessible(db,user,resource),query)
        if method=='POST':
            return changes.amendment_action(db,user,record_id,action,body) if record_id else changes.amendment_create(db,user,body)
    if resource=='sales-returns':
        permit(user,'sales-returns:'+('read' if method=='GET' else 'action:'+action if action else 'write'))
        if method=='GET':
            return ok(changes.return_view(db,scoped_get(db,user,resource,record_id))) if record_id else page([changes.return_view(db,r) for r in views.accessible(db,user,resource)],query)
        if method=='POST':
            return changes.return_action(db,user,record_id,action,body) if record_id else changes.return_create(db,user,body)
    if resource in extensions.VERSION_KEYS:
        permission={'supplier-quotes':'costs','service-templates':'customer-tickets','sales-policies':'sales-orders','sales-targets':'sales-orders','exchange-rates':'exchange-rates'}[resource]
        permit(user,permission+(':read' if method=='GET' else ':write'))
        if method=='GET':
            if resource=='exchange-rates' and len(parts)>1 and parts[1]=='history':
                return page([{'id':s['id'],'order_id':s['id'],'order_sn':s['order_sn'],'date':str(s['order_time'])[:10],'base_currency':'USD','quote_currency':'CNY','rate':s.get('economics',{}).get('fx_cny_per_usd'),'evidence_status':'matched'} for s in views.accessible(db,user,'sales-orders')],query)
            return views.version_list(db,user,resource,query,extensions.VERSION_KEYS[resource])
        if method=='POST':
            if resource=='service-templates' and len(parts)>1 and parts[1]=='preview':
                return extensions.template_preview(db,user,body)
            if resource=='sales-policies' and len(parts)>1 and parts[1]=='trial':
                return extensions.policy_trial(db,user,body)
            return extensions.append_version(db,user,resource,body)
    if resource=='commercial-invoices':
        permit(user,'commercial-invoices:'+('read' if method=='GET' else 'action:'+action if action else 'write'))
        permit(user,'costs:read')
        if method=='GET':
            return ok(scoped_get(db,user,resource,record_id)) if record_id else page(views.accessible(db,user,resource),query)
        if method in {'POST','PUT'}:
            return extensions.invoice_action(db,user,record_id,action or 'update',body) if record_id else extensions.invoice_create(db,user,body)
    if resource=='inventory-aging' and method=='GET':
        permit(user,'inventory:read')
        return views.aging(db,user,query)
    if resource=='logistics-directory' and method=='GET':
        permit(user,'shipments:read')
        return views.directory(db,user,query)
    if resource=='logistics-costs' and method=='GET':
        permit(user,'finance:read')
        permit(user,'costs:read')
        result=[]
        for r in views.accessible(db,user,'finance'):
            if r.get('type')!='物流费用':
                continue
            shipment=next((s for s in views.accessible(db,user,'shipments') if s['shipment_id']==r['reference_no']),None)
            result.append({**r,'expense':{'currency':r['currency'],'amount':str(r['amount'])},'estimated':{'currency':r['currency'],'amount':str(shipment.get('head_freight',0)) if shipment else None},'shipment':shipment,'link_status':'matched' if shipment else 'missing'})
        return page(result,query)
    if resource=='freight-quote' and method=='GET':
        permit(user,'freight-quote:read')
        qty=integer(query.get('quantity',0),minimum=1)
        boxes=(qty+23)//24
        volume=boxes*Decimal('.096')
        return {'box_count':boxes,'volume_cbm':float(volume),'gross_weight_kg':float(Decimal(qty)*Decimal('.48')),'currency':'CNY','rate_per_cbm':600,'fixed_fee':300,'freight_amount':float((volume*600+300).quantize(Decimal('.01')))}
    if resource=='ad-traffic' and method=='GET':
        permit(user,'ad-campaigns:read')
        dimension=query.get('dimension','keywords')
        dimensions={'keywords':['keyword_text','match_type'],'search-terms':['search_term'],'placement':['placement']}
        require(dimension in dimensions,'广告维度无效',400)
        data=views.accessible(db,user,resource)
        if query.get('group'):
            selected=json.loads(query['group'])
            require(isinstance(selected,dict),'广告分组必须为对象',400)
            data=[r for r in data if all(str(r.get(k,''))==str(v) for k,v in selected.items())]
        for r in data:
            spend,sales=r['spend_cents']/100,r['attributed_sales_cents']/100
            r.update(ctr=r['clicks']/r['impressions'] if r['impressions'] else None,cpc=spend/r['clicks'] if r['clicks'] else None,cvr=r['attributed_orders']/r['clicks'] if r['clicks'] else None,acos=spend/sales if sales else None,roas=sales/spend if spend else None,business_date=r.get('stat_date'),store_name=r.get('store_name','北美服饰店'))
            r['group']={k:r.get(k) for k in ['campaign_id','currency','attribution_window_days']+dimensions[dimension]}
        return {**page(data,query),'dimension':dimension,'view':'facts' if query.get('group') else 'groups'}
    if resource=='customer-voice':
        permit(user,'customer-tickets:read' if method=='GET' else 'customer-tickets:write')
        if method=='GET':
            if query.get('history')=='1':
                return page([r for r in rows(db,'voice-history') if str(r['record_id'])==query.get('record_id')],{})
            items=views.accessible(db,user,resource)
            items=[r for r in items if r.get('kind')==query.get('kind','reviews')]
            clean_query={k:v for k,v in query.items() if k!='visibility' or v not in {'active','all'}}
            items=page(items,{**clean_query,'offset':0,'limit':200})['items']
            distribution={str(i):sum(r['rating']==i for r in items) for i in range(1,6)}
            low=sum(r['rating']<=3 for r in items)
            return {**page(items,query if query.get('visibility') not in {'active','all'} else clean_query),'kind':query.get('kind'),'summary':{'count':len(items),'average_rating':sum(r['rating'] for r in items)/len(items) if items else None,'low_rating_count':low,'low_rating_ratio':low/len(items) if items else None,'distribution':distribution}}
        def handle():
            r=scoped_get(db,user,resource,body['record_id'])
            require(r['handling_version']==body['expected_version'],'处理版本已变化')
            require(body.get('handling_status') in {'unhandled','processing','resolved'} and body.get('note'),'处理状态或备注错误',400)
            r.update(handling_version=r['handling_version']+1,handling_status=body['handling_status'],handling_note=body['note'])
            put(db,resource,r)
            h=add(db,'voice-history',{'record_id':r['id'],'version':r['handling_version'],'handling_status':r['handling_status'],'note':r['handling_note'],'actor':user['username']})
            return ok(h)
        return once(db,'customer-voice',body.get('request_key',''),body,handle)
    if resource=='listing-dimensions' and record_id:
        permit(user,'listings:read' if method=='GET' else 'listings:write')
        listing=scoped_get(db,user,'listings',record_id)
        targets=[{'sid':r.get('store_id',1),'fnsku':r['fnsku']} for r in views.accessible(db,user,'inventory') if r.get('fnsku') and r['sku']==listing['sku']]
        target_keys={(t['sid'],t['fnsku']) for t in targets}
        if method=='PUT':
            require((body.get('sid'),body.get('fnsku')) in target_keys,'库存配对不存在',400)
            require(set(body.get('owner_ids',[]))<={r['id'] for r in rows(db,'users')},'负责人不存在',400)
            listing['dimensions']=body
            put(db,'listings',listing)
        return {**ok(listing.get('dimensions',{})),'listing':listing,'targets':list({(t['sid'],t['fnsku']):t for t in targets}.values()),'owners':rows(db,'users')}
    if resource=='manual-testing' and method=='GET':
        permit(user,'manual-testing:read')
        doc=json.loads((ROOT/'frontend/openapi.yaml').read_text(encoding='utf-8'))
        counts={'paths':len(doc['paths']),'operations':sum(len([k for k in methods if k in {'get','post','put','delete','patch'}]) for methods in doc['paths'].values())}
        return {'checked_at':now(),'contract':counts,'limitations':['本地独立实现。原契约中部分平台兼容或历史接口尚未实现；请以本地README覆盖表为准。','清单是人工操作指导，不代表自动验收通过。'],'fixtures':[],'warehouse':None,'capabilities':{}}
    if resource in GENERIC and len(parts)<=2:
        require(len(parts)==1 or record_id is not None,'资源ID无效',400)
        return generic(db,user,method,resource,record_id,query,body)
    raise Problem('该接口尚未实现：'+path,404)
