"""Versioned quotations, promotions, templates, invoices and currency records."""
import re
from datetime import date
from .store import *
from .views import net

VERSION_KEYS={'supplier-quotes':'quote_no','service-templates':'template_no','sales-policies':'policy_no','sales-targets':'target_no','exchange-rates':'effective_date'}

def append_version(db,user,resource,body):
    key=VERSION_KEYS[resource]
    require(body.get(key),'请填写业务编号或日期',400)
    def execute():
        previous=[r for r in rows(db,resource) if r.get(key)==body[key] and (resource!='sales-policies' or r.get('kind')==body.get('kind'))]
        version=max((r.get('version',1) for r in previous),default=0)
        require(integer(body.get('expected_version',0))==version,'版本已变化，请刷新后重试')
        record={k:v for k,v in body.items() if k not in {'request_key','expected_version'}}
        record.update(version=version+1,actor=user['username'])
        if resource=='supplier-quotes':
            product=next((r for r in rows(db,'products') if r['sku']==body['sku']),None)
            supplier=next((r for r in rows(db,'suppliers') if r['supplier_code']==body['supplier_code']),None)
            require(product and supplier,'产品或供应商不存在',400)
            value=cents(body['unit_price'])
            require(value>0 and body['valid_to']>=body['valid_from'],'单价或有效日期错误',400)
            qty=integer(body['minimum_quantity'],minimum=1)
            record.update(product_id=product['id'],product_name=product['name'],supplier_id=supplier['id'],supplier_name=supplier['name'],minimum_amount=f'{amount(value*qty):.2f}',status='disabled' if not body['enabled'] else 'future' if body['valid_from']>date.today().isoformat() else 'expired' if body['valid_to']<date.today().isoformat() else 'effective')
        elif resource=='service-templates':
            variables=sorted(set(re.findall(r'\{\{\s*(\w+)\s*\}\}',body['subject_template']+' '+body['body_template'])))
            allowed={'order_sn','buyer','tracking_no','carrier','sku','product_name','store_name','amount','currency','country'}
            require(set(variables)<=allowed,'模板包含不支持的变量',400)
            record['variable_names']=variables
        elif resource=='sales-targets':
            store=get(db,'store-authorizations',body['store_id'])
            require(visible(db,user,{'store_id':store['id']}),'店铺不在账号范围内',403)
            record.update(store_name=store['store_name'],site=store.get('site'),platform=store.get('platform'),target_cents=cents(body['target_amount']))
        elif resource=='exchange-rates':
            require(body['effective_date']>date.today().isoformat(),'新增汇率须在未来生效',400)
            value=Decimal(str(body['rate']))
            require(value.is_finite() and value>0,'汇率必须大于0',400)
            record.update(base_currency='USD',quote_currency='CNY')
        elif resource=='sales-policies':
            require(body.get('kind') in {'rule','promotion'},'策略类型错误',400)
            d=body['definition']
            if body['kind']=='promotion':
                require(cents(d['discount_value'])>0 and d['valid_to']>=d['valid_from'],'优惠值或日期错误',400)
                require(d['discount_type'] in {'fixed','percent'},'优惠类型错误',400)
                require(d['discount_type']!='percent' or Decimal(d['discount_value'])<=100,'优惠百分比不得超过100',400)
                store=get(db,'store-authorizations',d['store_id'])
                record['store_id']=store['id']
            else:
                require(d.get('conditions') and d.get('action_type') in {'tag','review_queue'},'请填写有效规则条件和动作',400)
        return ok(add(db,resource,record))
    return once(db,'version:'+resource,body.get('request_key',''),body,execute)

def template_preview(db,user,body):
    template=get(db,'service-templates',body['template_id'])
    sale=scoped_get(db,user,'sales-orders',body['order_id'])
    items=sale.get('item_list',[])
    item=next((i for i in items if i['sku']==body.get('sku')),None) or (items[0] if len(items)==1 else None)
    require(item is not None or not ({'sku','product_name'}&set(template['variable_names'])),'多SKU订单请指定SKU',400)
    variables={**sale,**(item or {})}
    selected={key:str(variables.get(key) or '') for key in template['variable_names']}
    def render(text):
        return re.sub(r'\{\{\s*(\w+)\s*\}\}',lambda match:selected.get(match[1],''),text)
    return ok({'order_id':sale['id'],'subject':render(template['subject_template']),'body':render(template['body_template']),'variables':selected,'sources':{key:'本地原订单/明细' for key in selected}})

def policy_trial(db,user,body):
    sale=scoped_get(db,user,'sales-orders',body['order_id'])
    if body['kind']=='promotion':
        p=get(db,'sales-policies',body['policy_id'])
        d=p['definition']
        eligible=sum(cents(i.get('unit_price',0))*i['quantity'] for i in sale.get('item_list',[]) if i['sku'] in d['eligible_skus'])
        checks={'enabled':p['enabled'],'store':sale.get('store_id')==d['store_id'],'currency':sale['currency']==d['currency'],'date':d['valid_from']<=body['trial_date']<=d['valid_to'],'threshold':eligible>=cents(d['minimum_eligible_amount'])}
        applied=all(checks.values())
        discount=min(eligible,cents(d['discount_value']) if d['discount_type']=='fixed' else int((Decimal(eligible)*Decimal(d['discount_value'])/100).quantize(Decimal('1'),rounding=ROUND_HALF_UP))) if applied else 0
        return ok({'order_id':sale['id'],'version':p['version'],'currency':sale['currency'],'applied':applied,'checks':checks,'original_amount':f'{amount(cents(sale["amount"])):.2f}','eligible_amount':f'{amount(eligible):.2f}','discount_amount':f'{amount(discount):.2f}','trial_total':f'{amount(cents(sale["amount"])-discount):.2f}'})
    latest={}
    for r in rows(db,'sales-policies'):
        if r.get('kind')=='rule' and (r['policy_no'] not in latest or r['version']>latest[r['policy_no']]['version']):
            latest[r['policy_no']]=r
    results=[]
    winner=None
    for r in sorted(latest.values(),key=lambda x:(x.get('priority',0),x['id'])):
        conditions=[]
        for c in r['definition']['conditions']:
            actual=[i['sku'] for i in sale.get('item_list',[])] if c['field']=='sku' else sale.get(c['field'])
            operator,value=c['operator'],c['value']
            if operator=='eq':
                matched=str(actual)==str(value) if not isinstance(actual,list) else value in actual
            elif operator=='in':
                matched=any(x in value for x in actual) if isinstance(actual,list) else actual in value
            elif operator in {'gte','lte'}:
                try:
                    matched=Decimal(str(actual))>=Decimal(str(value)) if operator=='gte' else Decimal(str(actual))<=Decimal(str(value))
                except InvalidOperation:
                    matched=False
            else:
                raise Problem('不支持的规则比较符',400)
            conditions.append({**c,'actual':actual,'matched':matched,'result':matched})
        matched=r['enabled'] and all(c['matched'] for c in conditions)
        results.append({**r,'conditions':conditions,'matched':matched})
        if matched and winner is None:
            winner={**r,'action_value':r['definition']['action_value']}
    return ok({'order_id':sale['id'],'rules':results,'winner':winner})

def invoice_create(db,user,body):
    require(body.get('source_resource') in {'sales-orders','purchase-orders'},'发票来源类型错误',400)
    source=scoped_get(db,user,body['source_resource'],body['source_id'])
    def execute():
        require(not any(r['invoice_no']==body['invoice_no'] for r in rows(db,'commercial-invoices')),'发票号已存在')
        items=[]
        for index,i in enumerate(source.get('item_list',[]),1):
            items.append({'line_no':index,'sku':i['sku'],'description':i.get('product_name',i['sku']),'quantity':i['quantity'],'unit_price':str(i.get('unit_price',0)),'amount':f'{amount(cents(i.get("unit_price",0))*i["quantity"]):.2f}'})
        r={**body,'source_order_no':source['order_sn'],'source_version':source['_version'],'direction':'sales' if body['source_resource']=='sales-orders' else 'purchase','counterparty_name':source.get('buyer') or source.get('supplier_name'),'currency':source.get('currency') or source.get('purchase_currency','CNY'),'amount':source['amount'],'item_list':items,'status':'draft','version':1,'events':[],'warehouse_name':source.get('warehouse_name') or source.get('shipping_warehouse'),'store_name':source.get('store_name')}
        event(r,user,'create')
        return ok(add(db,'commercial-invoices',r))
    return once(db,'invoice-create',body.get('request_key',''),body,execute)

def invoice_action(db,user,record_id,action,body):
    r=scoped_get(db,user,'commercial-invoices',record_id)
    def execute():
        require(integer(body.get('expected_version'))==r['version'],'发票版本已变化')
        if action=='update':
            require(r['status']=='draft','仅草稿发票可编辑')
            require(not any(x['invoice_no']==body['invoice_no'] and x['id']!=record_id for x in rows(db,'commercial-invoices')),'发票号重复')
            r.update(invoice_no=body['invoice_no'],issue_date=body['issue_date'])
        elif action=='confirm':
            require(r['status']=='draft','仅草稿发票可确认')
            source=scoped_get(db,user,r['source_resource'],r['source_id'])
            require(source['_version']==r['source_version'],'来源单据已变化，请重新登记发票')
            r.update(status='confirmed',confirmed_at=now())
        elif action=='void':
            require(r['status']!='void' and len(body.get('reason',''))>=3,'发票已作废或缺少原因')
            r.update(status='void',void_reason=body['reason'],voided_at=now())
        else:
            raise Problem('未知发票动作',404)
        event(r,user,action,body.get('reason',''))
        r['version']+=1
        return ok(put(db,'commercial-invoices',r))
    return execute() if action=='update' else once(db,f'invoice:{record_id}:{action}',body.get('request_key',''),body,execute)
