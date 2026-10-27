"""Purchase, sales, FBA and returns on the local transactional store."""
from .store import *
from .stock import lines, move, reserve, release, consume, warehouse

def flow(db, sale):
    existing=next((r for r in rows(db,'sales-flows') if r['order_id']==sale['id']),None)
    if not existing:
        existing=add(db,'sales-flows',{'order_id':sale['id'],'state':'unpaid','shipments':[],'payments':[],'returned':{},'local_only':True})
    return existing

def flow_view(db,sale):
    f=flow(db,sale)
    shipped={}
    for batch in f['shipments']:
        for line in batch['item_list']:
            shipped[line['sku']]=shipped.get(line['sku'],0)+line['quantity']
    f['remaining_items']=[{**i,'ordered_qty':i['quantity'],'shipped_qty':shipped.get(i['sku'],0),'quantity':i['quantity']-shipped.get(i['sku'],0),'returnable_qty':shipped.get(i['sku'],0)-f['returned'].get(i['sku'],0)} for i in sale.get('item_list',[])]
    return f

def voucher(db,user,reference,value,currency,**links):
    return add(db,'finance',{'reference_no':reference,'amount':amount(value),'currency':currency,'type':'收款' if value>=0 else '退款/付款','status_text':'已登记','occurred_at':now(),'actor':user['username'],**links,'immutable':True})

def sales_action(db,user,record_id,action,body):
    sale=scoped_get(db,user,'sales-orders',record_id)
    f=flow_view(db,sale)
    def execute():
        if action=='record-payment':
            require(f['state']=='unpaid','只允许未收款订单登记收款')
            require(body.get('currency')==sale['currency'] and cents(body.get('amount'))==cents(sale['amount']),'收款金额或币种与订单不符',400)
            v=voucher(db,user,body['reference'],cents(body['amount']),sale['currency'],order_id=record_id,store_name=sale.get('store_name'),warehouse_name=sale.get('shipping_warehouse'))
            f.update(state='paid',payment_reference=body['reference'])
            f['payments'].append({'reference':body['reference'],'amount':sale['amount'],'finance_id':v['id']})
            sale.update(payment_status='已支付',status_text='待发货',fulfillment_status='待发货')
        elif action=='ship':
            require(f['state'] in {'paid','partially-shipped'},'只有已收款且未冻结订单可发货')
            require(body.get('carrier') and body.get('tracking_no'),'请填写承运商和追踪号',400)
            items=lines(db,body.get('item_list'))
            remaining={r['sku']:r['quantity'] for r in f['remaining_items']}
            require(all(i['sku'] in remaining and i['quantity']<=remaining[i['sku']] for i in items),'本批数量超过待发数量')
            outbound=add(db,'outbound-orders',{'order_sn':body['reference'],'warehouse_name':sale['shipping_warehouse'],'status_text':'已出库','quantity':sum(i['quantity'] for i in items),'item_list':items,'workflow_owner':'sales-orders','source_id':record_id,'posted':True})
            move(db,user,'outbound-orders',outbound['id'],sale['shipping_warehouse'],items,-1)
            f['shipments'].append({'reference':body['reference'],'carrier':body['carrier'],'tracking_no':body['tracking_no'],'outbound_id':outbound['id'],'item_list':items,'created_at':now()})
            f['state']='shipped' if sum(i['quantity'] for i in items)==sum(remaining.values()) else 'partially-shipped'
            sale.update(status_text='已发货' if f['state']=='shipped' else '部分发货',fulfillment_status='已发货' if f['state']=='shipped' else '部分发货',carrier=body['carrier'],tracking_no=body['tracking_no'])
            products={p['sku']:p for p in rows(db,'products')}
            economics=sale.setdefault('economics',{'net_cents':cents(sale['amount']),'settlement_cents':cents(sale['amount']),'fee_cents':0,'fx_cny_per_usd':7.1,'cogs_cny_cents':0})
            economics['cogs_cny_cents']=economics.get('cogs_cny_cents',0)+sum(cents(products[i['sku']].get('cost',0))*i['quantity'] for i in items)
        else:
            if action=='freeze':
                require(f['state'] in {'unpaid','paid','partially-shipped'},'当前订单不能冻结')
                f['state']='frozen-'+f['state']
                sale['status_text']='已冻结'
            elif action=='unfreeze':
                require(f['state'].startswith('frozen-'),'订单尚未冻结')
                f['state']=f['state'][7:]
                sale['status_text']={'unpaid':'待审核','paid':'待发货','partially-shipped':'部分发货'}[f['state']]
            elif action=='cancel':
                require(f['state'] in {'unpaid','frozen-unpaid'},'已收款或已发货订单不能直接取消')
                f['state']='cancelled'
                sale['status_text']='已取消'
            else:
                raise Problem('未知销售动作',404)
        event(sale,user,action)
        put(db,'sales-orders',sale)
        put(db,'sales-flows',f)
        return ok({'order_id':record_id,'state':f['state'],'reused':False})
    if action in {'record-payment','ship'}:
        return once(db,f'sales:{record_id}:{action}',body.get('reference',''),body,execute)
    return execute()

def approval(db,user,resource,record):
    row=add(db,'approvals',{'request_no':f'APP-{resource}-{record["id"]}-{secrets.token_hex(2)}','business_type':resource,'business_no':record.get('order_sn') or record.get('plan_no'),'source_resource':resource,'source_id':record['id'],'applicant':user['username'],'approver':'admin','submitted_at':now(),'status_text':'审批中','warehouse_name':record.get('warehouse_name'),'store_name':record.get('store_name')})
    record['approval_id']=row['id']
    return row

def purchase_action(db,user,record_id,action,body):
    p=scoped_get(db,user,'purchase-orders',record_id)
    if action=='payment-history':
        payments=[r for r in rows(db,'purchase-payments') if r['purchase_id']==record_id]
        return ok({'order_sn':p['order_sn'],'ordered_amount':p['amount'],'currency':p.get('purchase_currency','CNY'),'recorded_paid_amount':amount(sum(cents(x['amount']) for x in payments if not x.get('reversal'))),'payments':payments,'arrival_closure':p.get('arrival_closure'),'legacy_payment_warning':False})
    def execute():
        if action=='submit':
            if p['status_text']=='待审核':
                return ok({**p,'reused':True})
            require(p['status_text'] in {'待提交','已驳回'},'当前状态不能提交采购审批')
            lines(db,p.get('item_list'))
            approval(db,user,'purchase-orders',p)
            p['status_text']='待审核'
        elif action=='place-order':
            require(p['status_text']=='待下单','采购必须先审批通过')
            p['status_text']='待到货'
        elif action=='void':
            require(not p.get('received_qty') and not any(r.get('purchase_order_sn')==p['order_sn'] for r in rows(db,'supplier-deliveries')),'已关联到货单的采购不可作废')
            require(p['status_text'] not in {'已完成','已作废'},'采购状态不允许作废')
            p['status_text']='已作废'
        elif action=='record-payment':
            require(p['status_text'] in {'待下单','待到货','待采购','部分入库','已完成'},'采购尚未审批通过')
            value=cents(body.get('amount'))
            require(value>0 and body.get('currency')==p.get('purchase_currency','CNY'),'付款金额或币种错误',400)
            paid=sum(cents(r['amount']) for r in rows(db,'purchase-payments') if r['purchase_id']==record_id and not r.get('reversal'))
            require(paid+value<=cents(p['amount']),'付款不得超过采购金额')
            v=voucher(db,user,body['reference'],-value,body['currency'],purchase_id=record_id,warehouse_name=p.get('warehouse_name'),counterparty=p.get('supplier_name'))
            payment=add(db,'purchase-payments',{**body,'amount':amount(value),'purchase_id':record_id,'finance_id':v['id'],'reversal':None})
            p['payment_status']='已付款' if paid+value==cents(p['amount']) else '部分付款'
        elif action=='finish-arrival':
            require(p['status_text'] in {'待到货','待采购','部分入库'} and len(body.get('reason',''))>=3,'当前采购不能结束到货')
            require(not any(r.get('purchase_order_sn')==p['order_sn'] and r['status_text']=='未收货' for r in rows(db,'supplier-deliveries')),'请先处理未收货送货单')
            p['arrival_closure']={'cancelled_qty':p.get('pending_qty',0),'reason':body['reason']}
            p.update(pending_qty=0,status_text='已完成')
        else:
            raise Problem('未知采购动作',404)
        event(p,user,action,body.get('reason',''))
        put(db,'purchase-orders',p)
        return ok(p)
    if action=='record-payment':
        return once(db,f'purchase:{record_id}:payment',body.get('reference',''),body,execute)
    return execute()

def workflow(db,user,resource,record_id,action,body):
    if resource=='purchase-orders':
        return purchase_action(db,user,record_id,action,body)
    r=scoped_get(db,user,resource,record_id)
    if resource=='approvals':
        require(action=='decide' and body.get('decision') in {'approve','reject'},'审批动作错误',400)
        target=scoped_get(db,user,r['source_resource'],r['source_id'])
        desired='已通过' if body['decision']=='approve' else '已驳回'
        if r['status_text']!='审批中':
            require(r['status_text']==desired,'已完成审批不能反转')
            return ok({**r,'reused':True})
        r.update(status_text=desired,decided_at=now())
        target['approval_status']=desired
        if r['source_resource']=='purchase-orders':
            target['status_text']='待下单' if desired=='已通过' else '已驳回'
        else:
            target['status_text']='待生成发货单' if desired=='已通过' else '已驳回'
        event(target,user,'approve' if desired=='已通过' else 'reject')
        put(db,r['source_resource'],target)
    elif resource=='replenishment' and action=='create-purchase':
        if r.get('purchase_id'):
            return ok(get(db,'purchase-orders',r['purchase_id']))
        p=next((x for x in rows(db,'products') if x['sku']==r['sku']),None)
        require(p is not None,'SKU不存在',400)
        q=integer(r['suggested_qty'],minimum=1)
        po=add(db,'purchase-orders',{'order_sn':'PO-REP-'+str(record_id),'supplier_name':p.get('supplier_name'),'warehouse_name':'华东仓','purchase_currency':'CNY','amount':amount(cents(p['cost'])*q),'item_list':[{'sku':p['sku'],'quantity':q,'unit_price':p['cost']}],'source_plan_no':r['recommendation_no'],'received_qty':0,'pending_qty':q,'payment_status':'未付款','status_text':'待提交','order_time':now(),'payments':[]})
        r.update(status_text='已生成采购单',purchase_id=po['id'])
    elif resource=='supplier-deliveries':
        po=next((p for p in rows(db,'purchase-orders') if p['order_sn']==r.get('purchase_order_sn')),None)
        require(po is not None,'来源采购不存在',400)
        require(visible(db,user,po),'来源采购不在账号范围内',403)
        if action=='receive':
            if r.get('inbound_id'):
                return ok(get(db,'inbound-orders',r['inbound_id']))
            require(po['status_text'] in {'待到货','待采购','部分入库'} and not po.get('arrival_closure'),'采购当前不能继续收货')
            items=lines(db,r.get('item_list'))
            ordered={i['sku']:i['quantity'] for i in lines(db,po['item_list'])}
            prior={}
            for delivery in rows(db,'supplier-deliveries'):
                if delivery.get('purchase_order_sn')==po['order_sn'] and delivery.get('inbound_id'):
                    for i in delivery['item_list']:
                        prior[i['sku']]=prior.get(i['sku'],0)+i['quantity']
            require(all(i['sku'] in ordered and prior.get(i['sku'],0)+i['quantity']<=ordered[i['sku']] for i in items),'累计收货超过采购明细')
            inbound=add(db,'inbound-orders',{'order_sn':'IN-'+r['delivery_no'],'purchase_order_sn':po['order_sn'],'supplier_name':po['supplier_name'],'warehouse_name':r['warehouse_name'],'quantity':sum(i['quantity'] for i in items),'item_list':items,'status_text':'待入库','qc_status':'待检','available_qty':sum(i['quantity'] for i in items),'defective_qty':0,'type':'采购入库','create_time':now()})
            r.update(inbound_id=inbound['id'],received_qty=inbound['quantity'],status_text='已收货',received_at=now())
            po['received_qty']=po.get('received_qty',0)+inbound['quantity']
            po['pending_qty']=sum(ordered.values())-po['received_qty']
            po['status_text']='部分入库' if po['pending_qty'] else '已完成'
            put(db,'purchase-orders',po)
        elif action=='inspect':
            require(r.get('inbound_id'),'请先收货生成待入库单')
            inbound=get(db,'inbound-orders',r['inbound_id'])
            require(not inbound.get('posted'),'已过账入库不可重新质检')
            qualities={i['sku']:i for i in body.get('item_list',[])}
            require(set(qualities)=={i['sku'] for i in inbound['item_list']},'质检明细必须完整',400)
            for i in inbound['item_list']:
                q=qualities[i['sku']]
                i['available_qty']=integer(q['available_qty'])
                i['defective_qty']=integer(q['defective_qty'])
                require(i['available_qty']+i['defective_qty']==i['quantity'],'良品次品合计与收货量不符',400)
            inbound.update(available_qty=sum(i['available_qty'] for i in inbound['item_list']),defective_qty=sum(i['defective_qty'] for i in inbound['item_list']),qc_status='合格' if not any(i['defective_qty'] for i in inbound['item_list']) else '部分合格')
            put(db,'inbound-orders',inbound)
            r['qc_status']=inbound['qc_status']
        else:
            raise Problem('未知收货动作',404)
    elif resource in {'shipping-plans','fba-delivery-orders'}:
        return fba_action(db,user,resource,r,action,body)
    elif resource=='shipments' and action=='create-delivery':
        if r.get('delivery_id'):
            return ok(get(db,'fba-delivery-orders',r['delivery_id']))
        d=add(db,'fba-delivery-orders',{**{k:v for k,v in r.items() if k not in {'id','_version'}},'delivery_order_no':'FD-'+r['shipment_id'],'item_list':r.get('item_list',[]),'quantity':sum(i['quantity'] for i in r.get('item_list',[])),'received_qty':0,'shipped_qty':0,'status_text':'待配货','fba_workflow':{'managed':True,'allocation':{'state':'unallocated'}}})
        r['delivery_id']=d['id']
    else:
        raise Problem('未知业务动作',404)
    event(r,user,action)
    put(db,resource,r)
    return ok(r)

def fba_action(db,user,resource,r,action,body):
    allocation=r.setdefault('fba_workflow',{'managed':True,'allocation':{'state':'unallocated'}})['allocation']
    def execute():
        nonlocal allocation
        if action=='submit':
            require(resource=='shipping-plans' and r['approval_status'] in {'未提交','已驳回'},'FBA计划不能提交')
            lines(db,r['item_list'])
            approval(db,user,resource,r)
            r.update(approval_status='审批中',status_text='待审核')
        elif action=='create-delivery':
            require(r.get('approval_status')=='已通过','FBA计划必须审批通过')
            if r.get('delivery_id'):
                return ok(get(db,'fba-delivery-orders',r['delivery_id']))
            d=add(db,'fba-delivery-orders',{'delivery_order_no':'FD-'+r['plan_no'],'plan_no':r['plan_no'],'plan_id':r['id'],'store_name':r.get('store_name'),'warehouse_name':r['warehouse_name'],'destination':r['destination'],'quantity':sum(i['quantity'] for i in lines(db,r['item_list'])),'item_list':r['item_list'],'received_qty':0,'shipped_qty':0,'status_text':'待配货','fba_workflow':{'managed':True,'allocation':{'state':'unallocated'}}})
            r['delivery_id']=d['id']
        elif action in {'lock','allocate'}:
            if resource=='shipping-plans':
                require(r.get('approval_status')=='已通过','只能锁定已批准计划')
            else:
                require(r['status_text'] in {'待配货','待发货'},'当前发货单不能配货')
            if allocation.get('state')=='allocated':
                return ok({**r,'reused':True})
            inherited=None
            if resource=='fba-delivery-orders' and r.get('plan_id'):
                plan=get(db,'shipping-plans',r['plan_id'])
                if plan['fba_workflow']['allocation']['state']=='allocated':
                    inherited=plan['fba_workflow']['allocation']
                    plan['fba_workflow']['allocation']={'state':'transferred','items':[]}
                    plan['locked_quantity']=0
                    put(db,'shipping-plans',plan)
            allocation=inherited or reserve(db,r['warehouse_name'],r['item_list'])
            r['fba_workflow']['allocation']=allocation
            if resource=='shipping-plans':
                r['locked_quantity']=sum(i['quantity'] for i in allocation['items'])
            else:
                r['status_text']='待发货'
        elif action=='release':
            require(allocation['state']=='allocated','无可释放库存')
            r['fba_workflow']['allocation']=release(db,allocation)
            r['locked_quantity']=0
            if resource=='fba-delivery-orders':
                r['status_text']='待配货'
        elif action=='dispatch':
            if r['status_text'] in {'运输中','部分签收','已签收'}:
                require(r.get('carrier')==body.get('carrier') and r.get('tracking_no')==body.get('tracking_no'),'重复发货物流信息不同')
                return ok({**r,'reused':True})
            require(r['status_text']=='待发货' and allocation['state']=='allocated','请先分配库存')
            require(body.get('carrier') and body.get('tracking_no'),'承运商和追踪号必填',400)
            consume(db,user,resource,r['id'],allocation)
            r.update(status_text='运输中',shipped_qty=sum(i['quantity'] for i in r['item_list']),shipped_at=now(),carrier=body['carrier'],tracking_no=body['tracking_no'])
            r['fba_workflow']['allocation']={'state':'consumed','items':[]}
        elif action=='receive':
            require(r['status_text'] in {'运输中','部分签收'},'当前不能签收')
            received=lines(db,body.get('items'))
            original={i['sku']:i for i in r['item_list']}
            for i in received:
                require(i['sku'] in original,'签收SKU不在货件中',400)
                line=original[i['sku']]
                require(line.get('received_qty',0)+i['quantity']<=line['quantity'],'签收超过已发数量')
                line['received_qty']=line.get('received_qty',0)+i['quantity']
            r['received_qty']=sum(i.get('received_qty',0) for i in r['item_list'])
            r['status_text']='已签收' if r['received_qty']==r['shipped_qty'] else '部分签收'
            r['received_at']=now()
        else:
            raise Problem('未知FBA动作',404)
        event(r,user,action)
        put(db,resource,r)
        return ok(r)
    if action=='receive':
        return once(db,f'fba:{r["id"]}:receive',body.get('request_key',''),body,execute)
    return execute()
