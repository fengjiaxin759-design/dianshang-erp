import concurrent.futures
import json
import tempfile
import unittest
from pathlib import Path
from erp.store import Store, Problem, rows, get, identity, add, put, cents
from erp.api import dispatch

class ERPTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.store=Store(Path(self.temp.name)/'erp.sqlite3')
        response=self.call('POST','/api/auth-server/oauth/access-token',{'appId':'admin','appSecret':'admin'},token='')
        self.token=response['data']['access_token']

    def tearDown(self):
        self.temp.cleanup()

    def call(self,method,path,body=None,query=None,token=None):
        db=self.store.connect()
        try:
            db.execute('BEGIN IMMEDIATE' if method!='GET' else 'BEGIN')
            result=dispatch(db,method,path,query or {},body or {},getattr(self,'token','') if token is None else token)
            db.commit()
            return result
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def record(self,resource,record_id):
        return self.call('GET',f'/api/v1/{resource}/{record_id}')

    def total(self):
        return sum(r['quantity'] for r in self.call('GET','/api/v1/inventory',query={'limit':'200'})['items'])

    def pay(self,rid=1):
        sale=self.record('sales-orders',rid)
        body={'reference':'PAY-'+str(rid),'amount':sale['amount'],'currency':sale['currency']}
        return self.call('POST',f'/api/v1/sales-workflow/{rid}/record-payment',body)

    def ship_body(self,rid=1,qty=1,reference='SHIP-ONE'):
        sale=self.record('sales-orders',rid)
        return {'reference':reference,'item_list':[{'sku':sale['item_list'][0]['sku'],'quantity':qty}],'carrier':'演示物流','tracking_no':'TRACK-TEST'}

    def test_login_required_and_bad_password(self):
        with self.assertRaises(Problem):
            self.call('GET','/api/v1/products',token='')
        with self.assertRaises(Problem):
            self.call('POST','/api/auth-server/oauth/access-token',{'appId':'admin','appSecret':'wrong'},token='')

    def test_money_precision(self):
        self.assertEqual(cents('19.90'),1990)
        for value in ['NaN','1.001','Infinity']:
            with self.assertRaises(Problem):
                cents(value)

    def test_crud_readback_and_restart(self):
        r=self.call('POST','/api/v1/products',{'sku':'TEST-NEW','name':'测试产品','cost':12.5,'price':20.5})
        self.assertEqual(self.record('products',r['id'])['cost'],12.5)
        second=Store(self.store.path)
        db=second.connect()
        self.assertEqual(get(db,'products',r['id'])['name'],'测试产品')
        db.close()

    def test_protected_fields_cannot_be_forged(self):
        with self.assertRaises(Problem):
            self.call('PUT','/api/v1/sales-orders/1',{'payment_status':'已支付'})

    def test_sales_partial_and_idempotency(self):
        before=self.total()
        self.pay()
        body=self.ship_body()
        self.call('POST','/api/v1/sales-workflow/1/ship',body)
        self.assertEqual(self.total(),before-1)
        count=len(self.call('GET','/api/v1/stock/ledger')['items'])
        repeated=self.call('POST','/api/v1/sales-workflow/1/ship',body)
        self.assertTrue(repeated['data']['reused'])
        self.assertEqual(self.total(),before-1)
        self.assertEqual(len(self.call('GET','/api/v1/stock/ledger')['items']),count)
        with self.assertRaises(Problem):
            self.call('POST','/api/v1/sales-workflow/1/ship',{**body,'tracking_no':'DIFFERENT'})
        self.assertEqual(self.call('GET','/api/v1/sales-workflow/1')['data']['state'],'partially-shipped')
        self.call('POST','/api/v1/sales-workflow/1/ship',self.ship_body(reference='SHIP-TWO'))
        self.assertEqual(self.call('GET','/api/v1/sales-workflow/1')['data']['state'],'shipped')

    def test_atomic_insufficient_stock(self):
        self.pay()
        db=self.store.connect()
        with db:
            sale=get(db,'sales-orders',1)
            sale['item_list'].append({'sku':'SKU-002','quantity':99999,'unit_price':1})
            put(db,'sales-orders',sale)
        db.close()
        body=self.ship_body()
        body['item_list'].append({'sku':'SKU-002','quantity':99999})
        before=self.total()
        with self.assertRaises(Problem):
            self.call('POST','/api/v1/sales-workflow/1/ship',body)
        self.assertEqual(self.total(),before)
        self.assertEqual(self.call('GET','/api/v1/outbound-orders')['total'],0)
        self.assertEqual(self.call('GET','/api/v1/stock/ledger')['total'],0)

    def test_concurrent_reference_does_not_double_ship(self):
        self.pay()
        before=self.total()
        body=self.ship_body()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            responses=list(pool.map(lambda _:self.call('POST','/api/v1/sales-workflow/1/ship',body),range(2)))
        self.assertEqual(self.total(),before-1)
        self.assertEqual(sum(bool(r['data'].get('reused')) for r in responses),1)

    def test_freeze_blocks_new_shipments(self):
        self.pay()
        self.call('POST','/api/v1/sales-workflow/1/freeze')
        with self.assertRaises(Problem):
            self.call('POST','/api/v1/sales-workflow/1/ship',self.ship_body())
        self.call('POST','/api/v1/sales-workflow/1/unfreeze')
        self.call('POST','/api/v1/sales-workflow/1/ship',self.ship_body())

    def test_purchase_to_inbound(self):
        self.call('POST','/api/v1/workflows/purchase-orders/1/submit')
        approval=self.call('GET','/api/v1/approvals')['items'][0]
        self.call('POST',f'/api/v1/workflows/approvals/{approval["id"]}/decide',{'decision':'approve'})
        self.call('POST','/api/v1/workflows/purchase-orders/1/place-order')
        po=self.record('purchase-orders',1)
        delivery=self.call('POST','/api/v1/supplier-deliveries',{'delivery_no':'TEST-DELIVERY','purchase_order_sn':po['order_sn'],'supplier_name':po['supplier_name'],'warehouse_name':po['warehouse_name'],'item_list':po['item_list'],'total_qty':24})
        received=self.call('POST',f'/api/v1/workflows/supplier-deliveries/{delivery["id"]}/receive')['data']
        self.call('POST',f'/api/v1/workflows/supplier-deliveries/{delivery["id"]}/inspect',{'item_list':[{'sku':po['item_list'][0]['sku'],'available_qty':24,'defective_qty':0}]})
        before=self.total()
        self.assertEqual(self.record('purchase-orders',1)['received_qty'],24)
        self.assertEqual(self.total(),before)
        result=self.call('POST','/api/v1/stock/inbound-orders/confirm',{'ids':[received['inbound_id']]})
        self.assertEqual(result['data']['success'],1)
        self.assertEqual(self.total(),before+24)
        self.call('POST','/api/v1/stock/inbound-orders/confirm',{'ids':[received['inbound_id']]})
        self.assertEqual(self.total(),before+24)

    def test_return_quality_and_refund(self):
        self.pay()
        self.call('POST','/api/v1/sales-workflow/1/ship',self.ship_body(qty=2))
        sale=self.record('sales-orders',1)
        r=self.call('POST','/api/v1/sales-returns',{'order_id':1,'return_no':'TEST-RETURN','reason':'演示退货原因','refund_amount':sale['amount'],'currency':sale['currency'],'item_list':[{'sku':sale['item_list'][0]['sku'],'quantity':2}]})['data']
        rid=r['id']
        self.call('POST',f'/api/v1/sales-returns/{rid}/authorize')
        before=self.total()
        self.call('POST',f'/api/v1/sales-returns/{rid}/receive',{'quality_list':[{'sku':sale['item_list'][0]['sku'],'good_qty':1,'bad_qty':1}]})
        self.assertEqual(self.total(),before+2)
        self.call('POST',f'/api/v1/sales-returns/{rid}/refund',{'reference':'REFUND-ONE','amount':sale['amount'],'currency':sale['currency']})
        self.assertEqual(self.record('sales-orders',1)['economics']['net_cents'],0)

    def test_fba_allocation_dispatch_and_receipt(self):
        self.call('POST','/api/v1/workflows/shipping-plans/1/submit')
        approval=self.call('GET','/api/v1/approvals')['items'][0]
        self.call('POST',f'/api/v1/workflows/approvals/{approval["id"]}/decide',{'decision':'approve'})
        self.call('POST','/api/v1/workflows/shipping-plans/1/lock')
        self.call('POST','/api/v1/workflows/shipping-plans/1/create-delivery')
        plan=self.record('shipping-plans',1)
        rid=plan['delivery_id']
        self.call('POST',f'/api/v1/workflows/fba-delivery-orders/{rid}/allocate')
        before=self.total()
        self.call('POST',f'/api/v1/workflows/fba-delivery-orders/{rid}/dispatch',{'carrier':'演示物流','tracking_no':'FBA-TRACK'})
        self.assertEqual(self.total(),before-24)
        self.call('POST',f'/api/v1/workflows/fba-delivery-orders/{rid}/receive',{'request_key':'FBA-RECEIVE','items':[{'sku':'SKU-001','quantity':24}],'quantity':24})
        self.assertEqual(self.record('fba-delivery-orders',rid)['status_text'],'已签收')

    def test_stock_count_lock_and_version(self):
        r=self.call('POST','/api/v1/stock-counts',{'warehouse_id':1,'count_no':'TEST-COUNT','reason':'月底演示盘点'})['data']
        self.pay()
        with self.assertRaises(Problem):
            self.call('POST','/api/v1/sales-workflow/1/ship',self.ship_body())
        self.call('POST',f'/api/v1/stock-counts/{r["id"]}/submit',{'revision':1,'reason':'提交审批原因'})
        with self.assertRaises(Problem):
            self.call('POST',f'/api/v1/stock-counts/{r["id"]}/approve',{'revision':1,'reason':'过期版本审批'})
        self.call('POST',f'/api/v1/stock-counts/{r["id"]}/approve',{'revision':2,'reason':'核对盘点通过'})
        self.call('POST',f'/api/v1/stock-counts/{r["id"]}/post',{'revision':3,'reason':'核对差异过账'})
        self.call('POST',f'/api/v1/stock-counts/{r["id"]}/reverse',{'revision':4,'reason':'盘点补偿冲销'})

    def test_scope_filters_before_total(self):
        self.call('POST','/api/v1/access/roles',{'id':'limited','name':'范围只读','permissions':['inventory:read']})
        self.call('POST','/api/v1/access/accounts',{'username':'limited','name':'测试用户','department':'测试部','role_id':'limited','enabled':1,'password':'Testing-Password-2026','scope':{'shops':[1],'warehouses':[2]}})
        token=self.call('POST','/api/auth-server/oauth/access-token',{'appId':'limited','appSecret':'Testing-Password-2026'},token='')['data']['access_token']
        result=self.call('GET','/api/v1/inventory',query={'limit':'2'},token=token)
        self.assertEqual(result['total'],6)
        self.assertTrue(all(r['warehouse_name']=='美西海外仓' for r in result['items']))
        with self.assertRaises(Problem):
            self.call('GET','/api/v1/inventory/1',token=token)
        with self.assertRaises(Problem):
            self.call('POST','/api/v1/products',{'sku':'FORBIDDEN','name':'越权'},token=token)

    def test_all_read_views(self):
        endpoints=['dashboard','products','purchase-orders','sales-orders','inventory','sales-report','ad-report','accounts-receivable','accounts-payable','inventory-aging','supplier-quotes','ad-traffic','customer-voice','service-templates','sales-targets','logistics-costs','exchange-rates','commercial-invoices','stock-counts','purchase-amendments','manual-testing','access/catalog','access/roles','record-context/products/1','listing-dimensions/1']
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assertIsInstance(self.call('GET','/api/v1/'+endpoint),dict)
        self.assertIsInstance(self.call('GET','/api/v1/logistics-directory',query={'kind':'carrier'}),dict)
        self.assertIsInstance(self.call('GET','/api/v1/sales-policies',query={'kind':'promotion'}),dict)

    def approve_po(self):
        self.call('POST','/api/v1/workflows/purchase-orders/1/submit')
        a=self.call('GET','/api/v1/approvals')['items'][0]
        self.call('POST',f'/api/v1/workflows/approvals/{a["id"]}/decide',{'decision':'approve'})
        self.call('POST','/api/v1/workflows/purchase-orders/1/place-order')

    def test_payment_precision_overpayment_and_reversal(self):
        self.approve_po()
        body={'reference':'PURCHASE-PAY','amount':'100.00','currency':'CNY','paid_at':'2026-10-14','note':'本地凭证'}
        self.call('POST','/api/v1/workflows/purchase-orders/1/record-payment',body)
        repeated=self.call('POST','/api/v1/workflows/purchase-orders/1/record-payment',body)
        self.assertTrue(repeated['data']['reused'])
        with self.assertRaises(Problem):
            self.call('POST','/api/v1/workflows/purchase-orders/1/record-payment',{**body,'reference':'TOO-MUCH','amount':'999999'})
        history=self.call('POST','/api/v1/workflows/purchase-orders/1/payment-history')['data']
        self.assertEqual(history['recorded_paid_amount'],100)
        pid=history['payments'][0]['id']
        self.call('POST',f'/api/v1/purchase-amendments/{pid}/reverse-payment',{'reference':'PAY-REVERSAL','reason':'本地凭证补偿'})
        self.assertEqual(self.call('POST','/api/v1/workflows/purchase-orders/1/payment-history')['data']['recorded_paid_amount'],0)

    def test_amendment_rejects_stale_purchase_snapshot(self):
        self.approve_po()
        r=self.call('POST','/api/v1/purchase-amendments',{'purchase_id':1,'reference':'CHANGE-ONE','reason':'修改预计到货','proposed':{'planned_arrival':'2026-11-01'}})['data']
        path=f'/api/v1/purchase-amendments/{r["id"]}'
        self.call('POST',path+'/submit')
        self.call('POST',path+'/approve',{'note':'变更内容已核对'})
        self.call('POST','/api/v1/workflows/purchase-orders/1/record-payment',{'reference':'CHANGED-PAY','amount':'100','currency':'CNY'})
        with self.assertRaises(Problem):
            self.call('POST',path+'/apply')

    def test_amendment_apply(self):
        self.approve_po()
        r=self.call('POST','/api/v1/purchase-amendments',{'purchase_id':1,'reference':'CHANGE-TWO','reason':'修改预计到货','proposed':{'planned_arrival':'2026-11-01'}})['data']
        path=f'/api/v1/purchase-amendments/{r["id"]}'
        self.call('POST',path+'/submit')
        self.call('POST',path+'/approve',{'note':'变更内容已核对'})
        self.call('POST',path+'/apply')
        self.assertEqual(self.record('purchase-orders',1)['planned_arrival'],'2026-11-01')

    def test_invoice_version_confirm_and_void(self):
        r=self.call('POST','/api/v1/commercial-invoices',{'source_resource':'sales-orders','source_id':1,'invoice_no':'INV-TEST','issue_date':'2026-10-14','request_key':'INV-CREATE'})['data']
        path=f'/api/v1/commercial-invoices/{r["id"]}'
        self.call('POST',path+'/confirm',{'expected_version':1,'request_key':'INV-CONFIRM'})
        with self.assertRaises(Problem):
            self.call('PUT',path,{'expected_version':2,'invoice_no':'INV-CHANGED','issue_date':'2026-10-14'})
        self.call('POST',path+'/void',{'expected_version':2,'request_key':'INV-VOID','reason':'演示发票作废'})
        self.assertEqual(self.call('GET',path)['data']['status'],'void')

    def test_quote_versions_and_history(self):
        body={'quote_no':'QUOTE-NEW','supplier_code':'SUP-1','sku':'SKU-001','currency':'CNY','unit_price':'36.00','minimum_quantity':24,'lead_days':7,'valid_from':'2026-10-14','valid_to':'2027-10-14','enabled':True,'expected_version':0,'request_key':'QUOTE-CREATE'}
        self.call('POST','/api/v1/supplier-quotes',body)
        with self.assertRaises(Problem):
            self.call('POST','/api/v1/supplier-quotes',{**body,'request_key':'QUOTE-STALENESS'})
        self.call('POST','/api/v1/supplier-quotes',{**body,'expected_version':1,'unit_price':'37.00','request_key':'QUOTE-REVISE'})
        latest=self.call('GET','/api/v1/supplier-quotes',query={'quote_no':'QUOTE-NEW'})['items']
        history=self.call('GET','/api/v1/supplier-quotes',query={'quote_no':'QUOTE-NEW','history':'1'})['items']
        self.assertEqual(len(latest),1)
        self.assertEqual(latest[0]['version'],2)
        self.assertEqual(len(history),2)

    def test_template_preview_and_promotion_trial(self):
        d=self.call('POST','/api/v1/service-templates/preview',{'template_id':1,'order_id':1})['data']
        self.assertIn('SO-00001',d['subject'])
        promotion=next(p for p in self.call('GET','/api/v1/sales-policies')['items'] if p['id']==1)
        trial=self.call('POST','/api/v1/sales-policies/trial',{'kind':'promotion','policy_id':1,'order_id':1,'trial_date':promotion['definition']['valid_from']})['data']
        self.assertTrue(trial['applied'])
        self.assertEqual(trial['discount_amount'],'3.98')
        self.assertEqual(self.record('sales-orders',1)['amount'],39.8)

    def test_generic_item_list_exact_readback(self):
        body={'order_sn':'PO-READBACK','supplier_name':'宁波晨光供应链','warehouse_name':'华东仓','purchase_currency':'CNY','amount':35,'item_list':[{'sku':'SKU-001','quantity':1,'unit_price':35}]}
        r=self.call('POST','/api/v1/purchase-orders',body)
        self.assertEqual(self.record('purchase-orders',r['id'])['item_list'],body['item_list'])

    def test_batch_partial_failure_and_compensation(self):
        r=self.call('POST','/api/v1/inbound-orders',{'order_sn':'IN-BATCH','warehouse_name':'华东仓','quantity':5,'item_list':[{'sku':'SKU-001','quantity':5}]})
        before=self.total()
        result=self.call('POST','/api/v1/stock/inbound-orders/confirm',{'ids':[r['id'],99999]})['data']
        self.assertEqual((result['success'],result['fail']),(1,1))
        self.assertEqual(self.total(),before+5)
        self.call('POST','/api/v1/stock/inbound-orders/reverse',{'ids':[r['id']],'reason':'演示库存补偿'})
        self.assertEqual(self.total(),before)

    def test_profit_not_reported_for_unshipped_orders(self):
        result=self.call('GET','/api/v1/sales-report',query={'kind':'profit'})
        self.assertEqual(result['source_count'],0)
        self.pay()
        self.call('POST','/api/v1/sales-workflow/1/ship',self.ship_body())
        result=self.call('GET','/api/v1/sales-report',query={'kind':'profit'})
        self.assertEqual(result['source_count'],1)

    def test_ad_metrics_are_ratios(self):
        result=self.call('GET','/api/v1/ad-traffic')['items']
        self.assertAlmostEqual(result[-1]['ctr'],.05)
        self.assertAlmostEqual(result[-1]['acos'],.2)

if __name__=='__main__':
    unittest.main()
