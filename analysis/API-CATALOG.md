# ERP 接口清单

从公开 OpenAPI 契约提取；接口存在于文档不等于已完成运行验证。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/v1/inventory-aging` | 当前仓库批次库龄 |
| GET | `/api/v1/sales-policies` | 促销与订单规则版本 |
| POST | `/api/v1/sales-policies` | 追加促销或订单规则版本 |
| POST | `/api/v1/sales-policies/trial` | 促销只读试算或订单规则验证 |
| GET | `/api/v1/sales-targets` | 净销售目标及精确范围订单核对 |
| POST | `/api/v1/sales-targets` | 登记或修订净销售目标 |
| GET | `/api/v1/service-templates` | 邮件模板及版本历史 |
| POST | `/api/v1/service-templates` | 追加模板版本 |
| POST | `/api/v1/service-templates/preview` | 使用原订单预览指定模板版本 |
| GET | `/api/v1/customer-voice` | 商品评论、卖家反馈与处理历史 |
| POST | `/api/v1/customer-voice` | 追加本地评价处理记录 |
| GET | `/api/v1/ad-traffic` | 广告关键词、搜索词、广告位及日事实 |
| GET | `/api/v1/supplier-quotes` | 供应商报价及版本历史 |
| POST | `/api/v1/supplier-quotes` | 登记新报价或修订版本 |
| GET | `/api/v1/logistics-directory` | 承运商与物流渠道目录及货件穿透 |
| GET | `/api/v1/accounts-receivable` | 订单应收与实际收款凭证 |
| GET | `/api/v1/accounts-payable` | 采购应付与有效付款凭证 |
| GET | `/api/v1/commercial-invoices` | 商业发票登记列表 |
| POST | `/api/v1/commercial-invoices` | 从完整原单登记发票草稿 |
| GET | `/api/v1/commercial-invoices/{id}` | 发票明细及事件 |
| PUT | `/api/v1/commercial-invoices/{id}` | 修改草稿号码或日期 |
| POST | `/api/v1/commercial-invoices/{id}/{action}` | 确认或作废发票 |
| GET | `/api/v1/exchange-rates` | 独立汇率配置版本 |
| POST | `/api/v1/exchange-rates` | 登记未来日期的新汇率版本 |
| GET | `/api/v1/exchange-rates/history` | 每笔销售实际保存的USD兑CNY汇率 |
| GET | `/api/v1/freight-quote` | 服装海运拼箱运费试算 |
| GET | `/api/v1/logistics-costs` | 已登记头程费用及货件关联 |
| GET | `/healthz` | 健康检查 |
| POST | `/api/auth-server/oauth/access-token` | 本地认证 access-token |
| POST | `/erp/sc/routing/storage/shipment/getInboundShipmentList` | 查询发货单列表 |
| POST | `/erp/sc/data/fba_report/shipmentPlanLists` | 查询FBA发货计划 |
| POST | `/erp/sc/routing/restocking/analysis/getSummaryList` | 查询补货列表 |
| POST | `/erp/sc/routing/data/local_inventory/purchaseOrderList` | 查询采购单列表 |
| POST | `/erp/sc/routing/data/local_inventory/getPurchasePlans` | 查询采购计划列表 |
| POST | `/erp/sc/data/mws/orders` | 查询亚马逊订单列表 |
| POST | `/inventory/center/openapi/storageReport/overseas/detail/page` | 库存报表-海外仓-新报表-明细 |
| POST | `/basicOpen/openapi/storage/fbaWarehouseDetail` | 查询FBA库存列表-v2 |
| POST | `/erp/sc/routing/data/local_inventory/inventoryDetails` | 查询仓库库存明细 |
| POST | `/basicOpen/overSeaWarehouse/stockOrder/detail` | 查询备货单详情 |
| POST | `/erp/sc/routing/wms/order/wmsOrderList` | 查询销售出库单列表 |
| POST | `/erp/sc/routing/inventoryReceipt/StorageAllocation/getStorageAllocationList` | 查询调拨单列表 |
| POST | `/erp/sc/routing/storage/inbound/getOrders` | 查询入库单列表 |
| POST | `/erp/sc/routing/owms/inbound/listInbound` | 查询海外仓备货单列表 |
| POST | `/erp/sc/routing/storage/outbound/getOrders` | 查询出库单列表 |
| GET | `/api/v1/products` | 查询 products |
| POST | `/api/v1/products` | 创建 products |
| GET | `/api/v1/products/{id}` | 详情 products |
| PUT | `/api/v1/products/{id}` | 局部更新 products |
| DELETE | `/api/v1/products/{id}` | 删除 products |
| GET | `/api/v1/record-context/products/{id}` | 业务关联 products |
| GET | `/api/v1/inventory` | 查询 inventory |
| POST | `/api/v1/inventory` | 创建 inventory |
| GET | `/api/v1/inventory/{id}` | 详情 inventory |
| PUT | `/api/v1/inventory/{id}` | 局部更新 inventory |
| DELETE | `/api/v1/inventory/{id}` | 删除 inventory |
| GET | `/api/v1/record-context/inventory/{id}` | 业务关联 inventory |
| GET | `/api/v1/purchase-orders` | 查询 purchase-orders |
| POST | `/api/v1/purchase-orders` | 创建 purchase-orders |
| GET | `/api/v1/purchase-orders/{id}` | 详情 purchase-orders |
| PUT | `/api/v1/purchase-orders/{id}` | 局部更新 purchase-orders |
| DELETE | `/api/v1/purchase-orders/{id}` | 删除 purchase-orders |
| GET | `/api/v1/record-context/purchase-orders/{id}` | 业务关联 purchase-orders |
| GET | `/api/v1/sales-orders` | 查询 sales-orders |
| POST | `/api/v1/sales-orders` | 创建 sales-orders |
| GET | `/api/v1/sales-orders/{id}` | 详情 sales-orders |
| PUT | `/api/v1/sales-orders/{id}` | 局部更新 sales-orders |
| DELETE | `/api/v1/sales-orders/{id}` | 保留的拒绝入口：单据保留审计，不允许直接删除 |
| GET | `/api/v1/record-context/sales-orders/{id}` | 业务关联 sales-orders |
| GET | `/api/v1/inbound-orders` | 查询 inbound-orders |
| POST | `/api/v1/inbound-orders` | 创建 inbound-orders |
| GET | `/api/v1/inbound-orders/{id}` | 详情 inbound-orders |
| PUT | `/api/v1/inbound-orders/{id}` | 局部更新 inbound-orders |
| DELETE | `/api/v1/inbound-orders/{id}` | 删除 inbound-orders |
| GET | `/api/v1/record-context/inbound-orders/{id}` | 业务关联 inbound-orders |
| GET | `/api/v1/outbound-orders` | 查询 outbound-orders |
| POST | `/api/v1/outbound-orders` | 创建 outbound-orders |
| GET | `/api/v1/outbound-orders/{id}` | 详情 outbound-orders |
| PUT | `/api/v1/outbound-orders/{id}` | 局部更新 outbound-orders |
| DELETE | `/api/v1/outbound-orders/{id}` | 删除 outbound-orders |
| GET | `/api/v1/record-context/outbound-orders/{id}` | 业务关联 outbound-orders |
| GET | `/api/v1/listings` | 查询 listings |
| POST | `/api/v1/listings` | 创建 listings |
| GET | `/api/v1/listings/{id}` | 详情 listings |
| PUT | `/api/v1/listings/{id}` | 局部更新 listings |
| DELETE | `/api/v1/listings/{id}` | 删除 listings |
| GET | `/api/v1/record-context/listings/{id}` | 业务关联 listings |
| GET | `/api/v1/finance` | 查询 finance |
| POST | `/api/v1/finance` | 创建 finance |
| GET | `/api/v1/finance/{id}` | 详情 finance |
| PUT | `/api/v1/finance/{id}` | 局部更新 finance |
| DELETE | `/api/v1/finance/{id}` | 删除 finance |
| GET | `/api/v1/record-context/finance/{id}` | 业务关联 finance |
| GET | `/api/v1/shipments` | 查询 shipments |
| POST | `/api/v1/shipments` | 创建 shipments |
| GET | `/api/v1/shipments/{id}` | 详情 shipments |
| PUT | `/api/v1/shipments/{id}` | 局部更新 shipments |
| DELETE | `/api/v1/shipments/{id}` | 删除 shipments |
| GET | `/api/v1/record-context/shipments/{id}` | 业务关联 shipments |
| GET | `/api/v1/replenishment` | 查询 replenishment |
| POST | `/api/v1/replenishment` | 创建 replenishment |
| GET | `/api/v1/replenishment/{id}` | 详情 replenishment |
| PUT | `/api/v1/replenishment/{id}` | 局部更新 replenishment |
| DELETE | `/api/v1/replenishment/{id}` | 删除 replenishment |
| GET | `/api/v1/record-context/replenishment/{id}` | 业务关联 replenishment |
| GET | `/api/v1/shipping-plans` | 查询 shipping-plans |
| POST | `/api/v1/shipping-plans` | 创建 shipping-plans |
| GET | `/api/v1/shipping-plans/{id}` | 详情 shipping-plans |
| PUT | `/api/v1/shipping-plans/{id}` | 局部更新 shipping-plans |
| DELETE | `/api/v1/shipping-plans/{id}` | 删除 shipping-plans |
| GET | `/api/v1/record-context/shipping-plans/{id}` | 业务关联 shipping-plans |
| GET | `/api/v1/supplier-deliveries` | 查询 supplier-deliveries |
| POST | `/api/v1/supplier-deliveries` | 创建 supplier-deliveries |
| GET | `/api/v1/supplier-deliveries/{id}` | 详情 supplier-deliveries |
| PUT | `/api/v1/supplier-deliveries/{id}` | 局部更新 supplier-deliveries |
| DELETE | `/api/v1/supplier-deliveries/{id}` | 删除 supplier-deliveries |
| GET | `/api/v1/record-context/supplier-deliveries/{id}` | 业务关联 supplier-deliveries |
| GET | `/api/v1/store-authorizations` | 查询 store-authorizations |
| POST | `/api/v1/store-authorizations` | 创建 store-authorizations |
| GET | `/api/v1/store-authorizations/{id}` | 详情 store-authorizations |
| PUT | `/api/v1/store-authorizations/{id}` | 局部更新 store-authorizations |
| DELETE | `/api/v1/store-authorizations/{id}` | 删除 store-authorizations |
| GET | `/api/v1/record-context/store-authorizations/{id}` | 业务关联 store-authorizations |
| GET | `/api/v1/approvals` | 查询 approvals |
| POST | `/api/v1/approvals` | 创建 approvals |
| GET | `/api/v1/approvals/{id}` | 详情 approvals |
| PUT | `/api/v1/approvals/{id}` | 局部更新 approvals |
| DELETE | `/api/v1/approvals/{id}` | 删除 approvals |
| GET | `/api/v1/record-context/approvals/{id}` | 业务关联 approvals |
| GET | `/api/v1/audit-logs` | 查询 audit-logs |
| GET | `/api/v1/audit-logs/{id}` | 详情 audit-logs |
| GET | `/api/v1/record-context/audit-logs/{id}` | 业务关联 audit-logs |
| GET | `/api/v1/suppliers` | 查询 suppliers |
| POST | `/api/v1/suppliers` | 创建 suppliers |
| GET | `/api/v1/suppliers/{id}` | 详情 suppliers |
| PUT | `/api/v1/suppliers/{id}` | 局部更新 suppliers |
| DELETE | `/api/v1/suppliers/{id}` | 删除 suppliers |
| GET | `/api/v1/record-context/suppliers/{id}` | 业务关联 suppliers |
| GET | `/api/v1/warehouses` | 查询 warehouses |
| POST | `/api/v1/warehouses` | 创建 warehouses |
| GET | `/api/v1/warehouses/{id}` | 详情 warehouses |
| PUT | `/api/v1/warehouses/{id}` | 局部更新 warehouses |
| DELETE | `/api/v1/warehouses/{id}` | 删除 warehouses |
| GET | `/api/v1/record-context/warehouses/{id}` | 业务关联 warehouses |
| GET | `/api/v1/users` | 查询 users |
| POST | `/api/v1/users` | 创建 users |
| GET | `/api/v1/users/{id}` | 详情 users |
| PUT | `/api/v1/users/{id}` | 局部更新 users |
| DELETE | `/api/v1/users/{id}` | 删除 users |
| GET | `/api/v1/record-context/users/{id}` | 业务关联 users |
| GET | `/api/v1/ad-campaigns` | 查询 ad-campaigns |
| POST | `/api/v1/ad-campaigns` | 创建 ad-campaigns |
| GET | `/api/v1/ad-campaigns/{id}` | 详情 ad-campaigns |
| PUT | `/api/v1/ad-campaigns/{id}` | 局部更新 ad-campaigns |
| DELETE | `/api/v1/ad-campaigns/{id}` | 删除 ad-campaigns |
| GET | `/api/v1/record-context/ad-campaigns/{id}` | 业务关联 ad-campaigns |
| GET | `/api/v1/customer-tickets` | 查询 customer-tickets |
| POST | `/api/v1/customer-tickets` | 创建 customer-tickets |
| GET | `/api/v1/customer-tickets/{id}` | 详情 customer-tickets |
| PUT | `/api/v1/customer-tickets/{id}` | 局部更新 customer-tickets |
| DELETE | `/api/v1/customer-tickets/{id}` | 删除 customer-tickets |
| GET | `/api/v1/record-context/customer-tickets/{id}` | 业务关联 customer-tickets |
| GET | `/api/v1/fba-delivery-orders` | 查询 fba-delivery-orders |
| GET | `/api/v1/fba-delivery-orders/{id}` | 详情 fba-delivery-orders |
| PUT | `/api/v1/fba-delivery-orders/{id}` | 局部更新 fba-delivery-orders |
| DELETE | `/api/v1/fba-delivery-orders/{id}` | 保留的拒绝入口：单据保留审计，不允许直接删除 |
| GET | `/api/v1/record-context/fba-delivery-orders/{id}` | 业务关联 fba-delivery-orders |
| POST | `/api/auth-server/oauth/refresh` | 本地认证 refresh |
| GET | `/health` | 健康检查 |
| GET | `/api/health` | 健康检查 |
| POST | `/api/session` | 演示会话（受保护环境禁用） |
| GET | `/api/v1/me` | 当前管理员；必须Bearer头 |
| GET | `/api/v1/dashboard` | 本月分币种净销售、近10日USD净销售及全库库存成本 |
| POST | `/api/v1/workflows/replenishment/{id}/create-purchase` | replenishment / create-purchase |
| POST | `/api/v1/workflows/shipments/{id}/create-delivery` | 保留的拒绝入口：请从FBA计划提交审批并生成发货单 |
| POST | `/api/v1/workflows/supplier-deliveries/{id}/receive` | supplier-deliveries / receive |
| POST | `/api/v1/workflows/approvals/{id}/decide` | approvals / decide |
| POST | `/erp/sc/routing/data/local_inventory/getBatchDetailList` | 本地兼容扩展 getBatchDetailList |
| POST | `/erp/sc/routing/data/local_inventory/batchGetProductInfo` | 本地兼容扩展 batchGetProductInfo |
| POST | `/erp/sc/routing/data/local_inventory/getBatchStatementList` | 本地兼容扩展 getBatchStatementList |
| POST | `/basicOpen/platformStatisticsV2/saleStat/pageList` | 本地兼容扩展 pageList |
| POST | `/erp/sc/routing/storage/shipment/getInboundShipmentListMwsDetailList` | 本地兼容扩展 getInboundShipmentListMwsDetailList |
| POST | `/amzStaServer/openapi/inbound-shipment/shipmentDetailList` | 本地兼容扩展 shipmentDetailList |
| POST | `/erp/sc/routing/data/local_inventory/productList` | 本地兼容扩展 productList |
| POST | `/api/v1/stock/inbound-orders/confirm` | 显式本地库存确认 inbound-orders |
| POST | `/api/v1/stock/outbound-orders/confirm` | 显式本地库存确认 outbound-orders |
| GET | `/api/v1/stock/ledger` | 只读库存过账流水（历史基线不重建） |
| POST | `/api/v1/workflows/purchase-orders/{id}/void` | 作废无到货或入库的采购单 |
| POST | `/api/v1/workflows/purchase-orders/{id}/submit` | 提交采购审批（驳回可重提） |
| POST | `/api/v1/workflows/purchase-orders/{id}/place-order` | 采购审批通过后确认下单 |
| GET | `/api/v1/sales-workflow/{id}` | 读取销售流程状态；历史单只读 |
| POST | `/api/v1/sales-workflow/{id}/record-payment` | 本地销售 record-payment（不可重放历史，不调用平台） |
| POST | `/api/v1/sales-workflow/{id}/ship` | 逐SKU分批发货 / 兼容旧全量ship，事务扣减可用库存 |
| POST | `/api/v1/sales-workflow/{id}/freeze` | 本地销售 freeze（不可重放历史，不调用平台） |
| POST | `/api/v1/sales-workflow/{id}/unfreeze` | 本地销售 unfreeze（不可重放历史，不调用平台） |
| POST | `/api/v1/sales-workflow/{id}/cancel` | 本地销售 cancel（不可重放历史，不调用平台） |
| POST | `/api/v1/workflows/purchase-orders/{id}/payment-history` | 采购付款记录与到货结案 |
| POST | `/api/v1/workflows/purchase-orders/{id}/record-payment` | 登记实际采购付款凭证 |
| POST | `/api/v1/workflows/purchase-orders/{id}/finish-arrival` | 结束采购剩余到货 |
| GET | `/api/v1/manual-testing` | 人工测试中心只读就绪检查 |
| GET | `/api/v1/access/accounts` | 查看登录账号 |
| POST | `/api/v1/access/accounts` | 创建登录账号 |
| PUT | `/api/v1/access/accounts/{id}` | 更新登录账号 |
| GET | `/api/v1/access/roles` | 查看角色权限 |
| POST | `/api/v1/access/roles` | 创建角色权限 |
| PUT | `/api/v1/access/roles/{id}` | 更新角色权限 |
| GET | `/api/v1/access/catalog` | 登录权限目录 |
| POST | `/api/v1/stock/inbound-orders/reverse` | 本地库存冲销（补偿流水，保留原记录） |
| POST | `/api/v1/stock/outbound-orders/reverse` | 本地库存冲销（补偿流水，保留原记录） |
| POST | `/api/v1/stock/outbound-orders/receive-transfer` | 完整接收已发出调拨（幂等） |
| GET | `/api/v1/stock/balances` | 库存批次质量分类：次品不可用，历史未知量不猜测 |
| GET | `/api/v1/stock/transfers` | 调拨在途与接收状态 |
| POST | `/api/v1/workflows/shipping-plans/{id}/submit` | 本地FBA计划提交审批 |
| POST | `/api/v1/workflows/shipping-plans/{id}/create-delivery` | 审批通过后生成待配货单；分配库存后方可从页面发货 |
| POST | `/api/v1/workflows/fba-delivery-orders/{id}/dispatch` | 本地FBA实际发货；库存与流水同事务 |
| POST | `/api/v1/workflows/fba-delivery-orders/{id}/receive` | 本地FBA签收，不更新Amazon平台库存 |
| GET | `/api/v1/stock-counts` | 库存盘点 list |
| POST | `/api/v1/stock-counts` | 库存盘点 create |
| GET | `/api/v1/stock-counts/{id}` | 库存盘点 detail |
| PUT | `/api/v1/stock-counts/{id}` | 库存盘点 update |
| POST | `/api/v1/stock-counts/{id}/submit` | 库存盘点 submit |
| POST | `/api/v1/stock-counts/{id}/approve` | 库存盘点 approve |
| POST | `/api/v1/stock-counts/{id}/reject` | 库存盘点 reject |
| POST | `/api/v1/stock-counts/{id}/post` | 库存盘点 post |
| POST | `/api/v1/stock-counts/{id}/reverse` | 库存盘点 reverse |
| POST | `/api/v1/stock-counts/{id}/cancel` | 库存盘点 cancel |
| GET | `/api/v1/purchase-amendments` | 查询采购变更 |
| POST | `/api/v1/purchase-amendments` | 新建采购变更 |
| GET | `/api/v1/purchase-amendments/{id}` | 读取采购变更详情及操作记录 |
| POST | `/api/v1/purchase-amendments/{id}/submit` | submit |
| POST | `/api/v1/purchase-amendments/{id}/approve` | approve |
| POST | `/api/v1/purchase-amendments/{id}/reject` | reject |
| POST | `/api/v1/purchase-amendments/{id}/apply` | apply |
| POST | `/api/v1/purchase-amendments/{id}/reverse-payment` | reverse-payment |
| GET | `/api/v1/listing-dimensions/{id}` | 读取Listing本地FBA维度与有效绑定候选 |
| PUT | `/api/v1/listing-dimensions/{id}` | 维护Listing本地FBA查询维度 |
| GET | `/api/v1/sales-returns` | 退货单查询（只读） |
| POST | `/api/v1/sales-returns` | 创建本地退货草稿，业务单号幂等 |
| GET | `/api/v1/sales-returns/{id}` | 退货完整明细与操作历史 |
| POST | `/api/v1/sales-returns/{id}/authorize` | 授权退货并占用数量和退款额度 |
| POST | `/api/v1/sales-returns/{id}/cancel` | 取消未收货申请并释放额度 |
| POST | `/api/v1/sales-returns/{id}/receive` | 整张退货收货质检并原子入库 |
| POST | `/api/v1/sales-returns/{id}/refund` | 登记本地退款负数凭证，不调用银行 |
| POST | `/api/v1/workflows/supplier-deliveries/{id}/inspect` | 逐SKU确认预检/仓库质检（不重复记账） |
| GET | `/api/v1/data-contract` | 管理员读取模拟数据来源与完整业务资源契约 |
| POST | `/api/v1/workflows/shipping-plans/{id}/lock` | 锁定已批准计划的库存 |
| POST | `/api/v1/workflows/shipping-plans/{id}/release` | 释放计划库存 |
| POST | `/api/v1/workflows/fba-delivery-orders/{id}/allocate` | 按明细分配库存；原计划锁定在同一事务中接续 |
| POST | `/api/v1/workflows/fba-delivery-orders/{id}/release` | 释放配货库存并回到待配货 |
| POST | `/api/v1/warehouse-export` | 创建一致性业务数据快照 |
| GET | `/api/v1/warehouse-export/{snapshot_id}/{table}` | 按行游标读取业务快照 |
| DELETE | `/api/v1/warehouse-export/{snapshot_id}` | 删除已消费业务快照 |
| GET | `/api/v1/sales-report` | 服务端销售与贡献利润汇总 |
| GET | `/api/v1/ad-report` | 广告服务端汇总 |
