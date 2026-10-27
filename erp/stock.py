"""Explicit inventory posting, allocations, compensation and stock counts."""
from .store import *

def lines(db, items):
    require(isinstance(items, list) and items, '至少添加一行商品明细', 400)
    seen = set()
    result = []
    products = {p['sku']: p for p in rows(db, 'products')}
    for item in items:
        sku = item.get('sku', '')
        require(sku in products and products[sku].get('status') != '停售', 'SKU不存在或已停售：' + str(sku), 400)
        require(sku not in seen, '同一单据不允许重复SKU', 400)
        seen.add(sku)
        qty = integer(item.get('quantity', item.get('qty', 0)), minimum=1)
        result.append({**item, 'sku': sku, 'quantity': qty, 'product_id': products[sku]['id'], 'product_name': products[sku]['name']})
    return result

def warehouse(db, name):
    wh = next((r for r in rows(db, 'warehouses') if r['name'] == name), None)
    require(wh is not None and wh.get('status_text') != '停用', '仓库不存在或已停用', 400)
    return wh

def movable(db, name):
    warehouse(db, name)
    require(not any(c.get('warehouse_name') == name and c.get('state') in {'draft','rejected','submitted','approved'} for c in rows(db, 'stock-counts')), '仓库存在活动盘点，请先完成或取消盘点')

def ledger(db, resource, record_id, lot, before, user, operation='post', reverses_id=None):
    return add(db, 'stock-ledger', {'resource':resource,'record_id':record_id,'inventory_id':lot['id'],'batch_no':lot['batch_no'],'sku':lot['sku'],'warehouse_name':lot['warehouse_name'],'delta_quantity':lot['quantity']-before['quantity'],'before_quantity':before['quantity'],'after_quantity':lot['quantity'],'before_available':before['available'],'after_available':lot['available'],'operation':operation,'reverses_id':reverses_id,'reason':'','actor':user['username'],'order_sn':str(record_id)})

def move(db, user, resource, record_id, name, items, direction, operation='post'):
    movable(db, name)
    postings = []
    for line in lines(db, items):
        qty = line['quantity']
        if direction > 0:
            good = integer(line.get('available_qty', line.get('good_qty', qty)))
            bad = integer(line.get('defective_qty', line.get('bad_qty', qty-good)))
            require(good+bad == qty, '良品和次品合计必须等于入库数量', 400)
            wh = warehouse(db, name)
            lot = add(db, 'inventory', {'batch_no':f'{resource}-{record_id}-{line["sku"]}-{secrets.token_hex(3)}','wid':wh['id'],'warehouse_name':name,'sku':line['sku'],'product_id':line['product_id'],'quantity':qty,'available':good,'defective':bad,'reserved':0,'locked':0,'unavailable_other':0,'source_resource':resource,'source_record_id':record_id,'order_sn':str(record_id),'entry_time':now()})
            postings.append(ledger(db,resource,record_id,lot,{'quantity':0,'available':0},user,operation))
        else:
            candidates = sorted((r for r in rows(db,'inventory') if r['warehouse_name']==name and r['sku']==line['sku'] and r['available']>0), key=lambda r:r['id'])
            require(sum(r['available'] for r in candidates)>=qty, line['sku']+'可用库存不足')
            for lot in candidates:
                n = min(qty, lot['available'])
                before = dict(lot)
                lot['quantity'] -= n
                lot['available'] -= n
                lot = put(db,'inventory',lot)
                postings.append(ledger(db,resource,record_id,lot,before,user,operation))
                qty -= n
                if not qty:
                    break
    return postings

def reserve(db, name, items):
    movable(db,name)
    allocation = []
    for line in lines(db,items):
        qty=line['quantity']
        lots=sorted((r for r in rows(db,'inventory') if r['warehouse_name']==name and r['sku']==line['sku']),key=lambda r:r['id'])
        require(sum(r['available'] for r in lots)>=qty,line['sku']+'可用库存不足')
        for lot in lots:
            take=min(qty,lot['available'])
            if not take:
                continue
            lot['available']-=take
            lot['reserved']=lot.get('reserved',0)+take
            put(db,'inventory',lot)
            allocation.append({'inventory_id':lot['id'],'sku':line['sku'],'quantity':take})
            qty-=take
            if not qty:
                break
    return {'state':'allocated','items':allocation}

def release(db, allocation):
    for line in allocation.get('items',[]):
        lot=get(db,'inventory',line['inventory_id'])
        movable(db,lot['warehouse_name'])
        require(lot.get('reserved',0)>=line['quantity'],'预留库存不一致')
        lot['available']+=line['quantity']
        lot['reserved']-=line['quantity']
        put(db,'inventory',lot)
    return {'state':'released','items':[]}

def consume(db,user,resource,record_id,allocation):
    for line in allocation.get('items',[]):
        lot=get(db,'inventory',line['inventory_id'])
        movable(db,lot['warehouse_name'])
        before=dict(lot)
        require(lot.get('reserved',0)>=line['quantity'] and lot['quantity']>=line['quantity'],'预留库存不一致')
        lot['quantity']-=line['quantity']
        lot['reserved']-=line['quantity']
        lot=put(db,'inventory',lot)
        ledger(db,resource,record_id,lot,before,user)

def post_document(db,user,resource,record_id,action,reason=''):
    record=scoped_get(db,user,resource,record_id)
    require(not record.get('workflow_owner'),'关联业务单据必须通过来源流程处理')
    if action=='confirm':
        if record.get('posted'):
            return {'id':record_id,'reused':True}
        require(not record.get('reversed'),'已冲销单据不可重放')
        if resource=='inbound-orders':
            require(record.get('qc_status')!='待检','请先完成逐SKU质检，再确认入库')
        items=record.get('item_list') or [{'sku':record.get('sku'),'quantity':record.get('quantity'),'available_qty':record.get('available_qty',record.get('quantity')),'defective_qty':record.get('defective_qty',0)}]
        if resource=='inbound-orders' and len(items)==1 and 'available_qty' in record:
            items=[{**items[0],'available_qty':record['available_qty'],'defective_qty':record.get('defective_qty',0)}]
        moves=move(db,user,resource,record_id,record['warehouse_name'],items,1 if resource=='inbound-orders' else -1)
        record.update(posted=True,status_text='已入库' if resource=='inbound-orders' else '已出库',posted_ledger_ids=[l['id'] for l in moves])
        if resource=='outbound-orders' and record.get('to_warehouse_name'):
            warehouse(db,record['to_warehouse_name'])
            record['transfer_state']='in_transit'
    elif action=='receive-transfer':
        require(record.get('posted') and record.get('transfer_state') in {'in_transit','received'},'调拨尚未发出')
        if record['transfer_state']=='received':
            return {'id':record_id,'reused':True}
        move(db,user,resource,record_id,record['to_warehouse_name'],record['item_list'],1,'transfer-receive')
        record.update(transfer_state='received',received_at=now())
    elif action=='reverse':
        require(len(reason.strip())>=3,'冲销原因至少3字符',400)
        if record.get('reversed'):
            return {'id':record_id,'reused':True}
        require(record.get('posted') and record.get('transfer_state')!='received','仅已过账且未接收的单据可在此冲销')
        original=[get(db,'stock-ledger',i) for i in record.get('posted_ledger_ids',[])]
        for l in reversed(original):
            lot=get(db,'inventory',l['inventory_id'])
            movable(db,lot['warehouse_name'])
            subsequent=[x for x in rows(db,'stock-ledger') if x['inventory_id']==lot['id'] and x['id']>l['id'] and x.get('operation')!='reverse']
            require(not subsequent,'请先处理该批次的下游业务，不能直接冲销')
            require(lot['quantity']==l['after_quantity'] and lot['available']==l['after_available'] and not lot.get('reserved'),'批次余额已发生变化，不能直接冲销')
            before=dict(lot)
            lot['quantity']=l['before_quantity']
            lot['available']=l['before_available']
            if lot['quantity']==0:
                lot['defective']=0
            lot=put(db,'inventory',lot)
            compensation=ledger(db,resource,record_id,lot,before,user,'reverse',l['id'])
            compensation['reason']=reason
            put(db,'stock-ledger',compensation)
        record.update(reversed=True,status_text='已冲销',transfer_state='cancelled')
    else:
        raise Problem('未知库存动作',404)
    event(record,user,action,reason)
    put(db,resource,record)
    return {'id':record_id,'reused':False}

def count_view(record):
    counts={r['inventory_id']:r for r in record['counts']}
    record['lines']=[]
    for original in record['snapshot']['rows']:
        counted=counts[original['id']]
        good,bad=counted['good'],counted['defective']
        record['lines'].append({**original,'inventory_id':original['id'],'good':good,'defective':bad,'expected_good':original['available'],'expected_defective':original.get('defective',0),'unavailable_other':original.get('unavailable_other',0),'delta_good':good-original['available'],'delta_defective':bad-original.get('defective',0),'delta_quantity':good+bad-original['available']-original.get('defective',0),'counted_quantity':good+bad+original.get('unavailable_other',0)})
    record['totals']={key:sum(r.get(key,0) for r in record['lines']) for key in ['quantity','counted_quantity','delta_quantity','delta_good','delta_defective']}
    return record

def count_create(db,user,body):
    wh=get(db,'warehouses',body['warehouse_id'])
    require(visible(db,user,{'warehouse_name':wh['name']}),'仓库不在账号范围内',403)
    movable(db,wh['name'])
    require(len(body.get('reason','').strip())>=3,'请填写盘点原因',400)
    require(not any(r['count_no']==body.get('count_no') for r in rows(db,'stock-counts')),'盘点单号重复')
    snapshot=[dict(r) for r in rows(db,'inventory') if r['warehouse_name']==wh['name']]
    record={'count_no':body['count_no'],'warehouse_id':wh['id'],'warehouse_name':wh['name'],'state':'draft','revision':1,'reason':body['reason'],'snapshot':{'rows':snapshot,'warehouse_id':wh['id'],'warehouse_name':wh['name']},'counts':[{'inventory_id':r['id'],'good':r['available'],'defective':r.get('defective',0)} for r in snapshot],'created_by':user['username'],'events':[]}
    event(record,user,'create',body['reason'])
    return add(db,'stock-counts',count_view(record))

def count_action(db,user,record_id,action,body):
    r=scoped_get(db,user,'stock-counts',record_id)
    require(integer(body.get('revision',0))==r['revision'],'盘点版本已变化，请刷新')
    reason=body.get('reason','')
    require(len(reason.strip())>=3,'操作原因至少3字符',400)
    if action=='update':
        require(r['state'] in {'draft','rejected'},'当前盘点不允许编辑')
        counts=body.get('counts',[])
        require({x['inventory_id'] for x in counts}=={x['id'] for x in r['snapshot']['rows']} and len(counts)==len(r['snapshot']['rows']),'实盘行必须完整且不重复',400)
        r['counts']=[{'inventory_id':x['inventory_id'],'good':integer(x['good']),'defective':integer(x['defective'])} for x in counts]
        r['reason']=reason
    else:
        transitions={'submit':({'draft','rejected'},'submitted'),'approve':({'submitted'},'approved'),'reject':({'submitted'},'rejected'),'post':({'approved'},'posted'),'reverse':({'posted'},'reversed'),'cancel':({'draft','rejected','submitted','approved'},'cancelled')}
        require(action in transitions,'未知盘点动作',404)
        allowed,state=transitions[action]
        require(r['state'] in allowed,'盘点状态不允许此动作')
        if action in {'post','reverse'}:
            for line in count_view(r)['lines']:
                lot=get(db,'inventory',line['id'])
                original=next(x for x in r['snapshot']['rows'] if x['id']==line['id'])
                expected=original['_version'] if action=='post' else line.get('posted_version')
                if action=='reverse':
                    expected=r['posted_versions'][str(line['id'])]
                require(lot['_version']==expected,'盘点快照已失效，库存发生变化')
                before=dict(lot)
                lot['available']=line['good'] if action=='post' else original['available']
                lot['defective']=line['defective'] if action=='post' else original.get('defective',0)
                lot['quantity']=lot['available']+lot['defective']+lot.get('unavailable_other',0)+lot.get('reserved',0)
                lot=put(db,'inventory',lot)
                ledger(db,'stock-counts',record_id,lot,before,user,'count-'+action)
                if action=='post':
                    r.setdefault('posted_versions',{})[str(lot['id'])]=lot['_version']
        r['state']=state
    r['revision']+=1
    event(r,user,action,reason)
    return put(db,'stock-counts',count_view(r))
