"""Auditable sales returns and controlled purchase amendments."""
from .store import *
from .stock import lines, move
from .commerce import flow_view, flow, voucher

def return_view(db,r):
    sale=get(db,'sales-orders',r['order_id'])
    requested={'amount':r['refund_amount'],'currency':r['currency']}
    r['refund_view']={'order_sn':sale['order_sn'],'requested':requested,'authorized':requested if r['state'] not in {'draft','cancelled'} else {'amount':0,'currency':r['currency']},'actual':requested if r['state']=='refunded' else {'amount':0,'currency':r['currency']},'evidence_status':'matched' if r['state']=='refunded' else 'not_refunded'}
    return r

def return_create(db,user,body):
    sale=scoped_get(db,user,'sales-orders',body['order_id'])
    items=lines(db,body.get('item_list'))
    require(body.get('currency')==sale['currency'] and cents(body.get('refund_amount'))>0,'退款金额和币种错误',400)
    require(len(body.get('reason',''))>=3,'请填写退货原因',400)
    def create():
        r=add(db,'sales-returns',{**body,'item_list':items,'refund_amount':amount(cents(body['refund_amount'])),'warehouse_name':sale['shipping_warehouse'],'store_name':sale.get('store_name'),'order_sn':sale['order_sn'],'state':'draft','quality_list':[],'events':[],'inbound_id':None,'finance_id':None})
        event(r,user,'create',body['reason'])
        return ok(put(db,'sales-returns',r))
    return once(db,'sales-return-create',body.get('return_no',''),body,create)

def return_action(db,user,record_id,action,body):
    r=scoped_get(db,user,'sales-returns',record_id)
    sale=scoped_get(db,user,'sales-orders',r['order_id'])
    f=flow_view(db,sale)
    def execute():
        if action=='authorize':
            if r['state'] in {'authorized','received','refunded'}:
                return ok({**return_view(db,r),'reused':True})
            require(r['state']=='draft','退货当前不能授权')
            allowed={i['sku']:i['returnable_qty'] for i in f['remaining_items']}
            require(all(i['sku'] in allowed and i['quantity']<=allowed[i['sku']] for i in r['item_list']),'退货数量超过已发减已授权数量')
            reserved=sum(cents(x['refund_amount']) for x in rows(db,'sales-returns') if x['order_id']==sale['id'] and x['state'] not in {'draft','cancelled'})
            require(reserved+cents(r['refund_amount'])<=cents(sale['amount']),'授权退款不得超过实际收款')
            for i in r['item_list']:
                f['returned'][i['sku']]=f['returned'].get(i['sku'],0)+i['quantity']
            r['state']='authorized'
            put(db,'sales-flows',f)
        elif action=='cancel':
            require(r['state'] in {'draft','authorized'} and len(body.get('reason',''))>=3,'仅未收货退货可取消，原因至少3字')
            if r['state']=='authorized':
                for i in r['item_list']:
                    f['returned'][i['sku']]-=i['quantity']
                put(db,'sales-flows',f)
            r['state']='cancelled'
        elif action=='receive':
            if r['state'] in {'received','refunded'}:
                require(r['quality_list']==body.get('quality_list'),'重复退货收货质检内容不同')
                return ok({**return_view(db,r),'reused':True})
            require(r['state']=='authorized','退货需先授权')
            quality=body.get('quality_list',[])
            require(len(quality)==len(r['item_list']) and len({i['sku'] for i in quality})==len(quality),'质检行必须完整且不重复',400)
            qmap={q['sku']:q for q in quality}
            items=[]
            for i in r['item_list']:
                require(i['sku'] in qmap,'质检明细缺失',400)
                q=qmap[i['sku']]
                good,bad=integer(q['good_qty']),integer(q['bad_qty'])
                require(good+bad==i['quantity'],'良品和次品总量不符',400)
                items.append({**i,'good_qty':good,'bad_qty':bad})
            inbound=add(db,'inbound-orders',{'order_sn':'RMA-IN-'+r['return_no'],'warehouse_name':r['warehouse_name'],'item_list':items,'quantity':sum(i['quantity'] for i in items),'status_text':'已入库','posted':True,'workflow_owner':'sales-returns','source_id':record_id,'type':'退货入库'})
            move(db,user,'inbound-orders',inbound['id'],r['warehouse_name'],items,1,'return')
            r.update(state='received',quality_list=quality,inbound_id=inbound['id'])
        elif action=='refund':
            require(r['state']=='received','退货需先收货')
            require(body.get('currency')==r['currency'] and cents(body.get('amount'))==cents(r['refund_amount']),'退款金额或币种与授权不符',400)
            v=voucher(db,user,body['reference'],-cents(body['amount']),body['currency'],order_id=sale['id'],return_id=record_id,store_name=sale.get('store_name'),warehouse_name=r['warehouse_name'])
            r.update(state='refunded',finance_id=v['id'],refund_reference=body['reference'])
            refunded=sum(cents(x['refund_amount']) for x in rows(db,'sales-returns') if x['order_id']==sale['id'] and x['state']=='refunded')+cents(r['refund_amount'])
            sale['refund_status']='已退款' if refunded==cents(sale['amount']) else '部分退款'
            sale.setdefault('economics',{})['net_cents']=cents(sale['amount'])-refunded
            sale['economics']['settlement_cents']=cents(sale['amount'])-refunded
            if refunded==cents(sale['amount']):
                sale['status_text']='已退款'
            put(db,'sales-orders',sale)
        else:
            raise Problem('未知退货动作',404)
        event(r,user,action,body.get('reason',''))
        return ok(return_view(db,put(db,'sales-returns',r)))
    if action=='refund':
        return once(db,f'return:{record_id}:refund',body.get('reference',''),body,execute)
    return execute()

def amendment_create(db,user,body):
    po=scoped_get(db,user,'purchase-orders',body['purchase_id'])
    require(po['status_text'] in {'待下单','待到货','待采购','部分入库'},'当前采购不能变更')
    require(body.get('proposed') and len(body.get('reason',''))>=3,'请填写拟修改字段和原因',400)
    allowed={'supplier_id','supplier_name','warehouse_name','purchase_currency','amount','tax_rate','freight','other_fee','purchase_user','planned_arrival','item_list'}
    require(set(body['proposed'])<=allowed,'拟修改字段含流程维护字段',400)
    def create():
        r=add(db,'purchase-amendments',{**body,'original':po,'fingerprint':po['_version'],'state':'draft','approval_id':None,'review_note':'','events':[],'warehouse_name':po.get('warehouse_name')})
        event(r,user,'create',body['reason'])
        return ok(put(db,'purchase-amendments',r))
    return once(db,'purchase-amendment-create',body.get('reference',''),body,create)

def amendment_action(db,user,record_id,action,body):
    if action=='reverse-payment':
        payment=get(db,'purchase-payments',record_id)
        po=scoped_get(db,user,'purchase-orders',payment['purchase_id'])
        require(len(body.get('reason',''))>=3,'请填写冲销原因',400)
        def execute():
            require(not payment.get('reversal'),'该付款已冲销')
            v=voucher(db,user,body['reference'],cents(payment['amount']),payment['currency'],purchase_id=po['id'],warehouse_name=po.get('warehouse_name'),reverses_id=payment['finance_id'])
            payment['reversal']={**body,'id':v['id'],'finance_id':v['id'],'created_at':now()}
            put(db,'purchase-payments',payment)
            paid=sum(cents(p['amount']) for p in rows(db,'purchase-payments') if p['purchase_id']==po['id'] and not p.get('reversal'))
            po['payment_status']='未付款' if not paid else '已付款' if paid==cents(po['amount']) else '部分付款'
            put(db,'purchase-orders',po)
            return ok(payment)
        return once(db,f'purchase-payment:{record_id}:reverse',body.get('reference',''),body,execute)
    r=scoped_get(db,user,'purchase-amendments',record_id)
    po=scoped_get(db,user,'purchase-orders',r['purchase_id'])
    transitions={'submit':('draft','submitted'),'approve':('submitted','approved'),'reject':('submitted','rejected'),'apply':('approved','applied')}
    require(action in transitions,'未知变更动作',404)
    before,after=transitions[action]
    require(r['state']==before,'采购变更状态不允许此动作')
    if action in {'approve','reject'}:
        require(len(body.get('note',''))>=3,'审核说明至少3字',400)
        r['review_note']=body['note']
    if action=='apply':
        require(po['_version']==r['fingerprint'],'采购快照已失效，请重新建立变更')
        proposal=r['proposed']
        if 'item_list' in proposal:
            proposal['item_list']=lines(db,proposal['item_list'])
            qty=sum(i['quantity'] for i in proposal['item_list'])
            require(qty>=po.get('received_qty',0),'变更数量不能小于已收数量')
            po['pending_qty']=qty-po.get('received_qty',0)
        new_amount=cents(proposal.get('amount',po['amount']))
        require(new_amount>=sum(cents(p['amount']) for p in rows(db,'purchase-payments') if p['purchase_id']==po['id'] and not p.get('reversal')),'变更金额不能低于有效已付金额')
        po.update(proposal)
        event(po,user,'amendment-apply',r['reason'])
        put(db,'purchase-orders',po)
    r['state']=after
    event(r,user,action,body.get('note',''))
    return ok(put(db,'purchase-amendments',r))
