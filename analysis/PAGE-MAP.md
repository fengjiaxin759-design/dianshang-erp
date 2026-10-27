# ERP 菜单与实际实现

aliasOf 表示代码复用了另一个页面的资源和视图，并非独立业务实现。部分页面随后被专用渲染器覆盖；这里使用覆盖后的定义。

| 模块 | 页面 | 标题 | 视图类型 | 资源 | 复用来源 |
| --- | --- | --- | --- | --- | --- |
| product | product-management | 产品管理 | list | products |  |
| product | product-add | 添加产品 | product-form |  |  |
| product | product-attributes | 产品属性 | list | products | product-management |
| product | product-category | 产品分类 | list | products | product-management |
| product | brand-management | 品牌管理 | list | products | product-management |
| product | product-tags | 产品标签 | list | products | product-management |
| product | listing | Listing | list | listings |  |
| product | supplier-quotation | 供应商报价 | supplier-quotes |  |  |
| product | product-archive | 产品归档 | list | products | product-management |
| product | product-operation-log | 产品操作日志 | list | audit-logs | operation-logs |
| product | replenishment | 补货建议 | list | replenishment |  |
| sales | sales-overview | 销售总览 | sales-report |  | sales-stat |
| sales | listing-pairing | Listing配对 | list | listings | listing |
| sales | listing-quality | Listing质量 | list | listings | listing |
| sales | promotion-management | 促销活动 | sales-policies |  |  |
| sales | sales-orders | 订单列表 | list | sales-orders |  |
| sales | after-sales | 销售退货 | sales-returns |  |  |
| sales | refund-orders | 退款订单 | sales-returns |  |  |
| sales | order-rules | 订单规则 | sales-policies |  |  |
| sales | operation-logs | 运营日志 | list | audit-logs |  |
| fba | fba-plans | FBA发货计划 | list | shipping-plans |  |
| fba | fba-shipments | FBA货件 | list | shipments |  |
| fba | fba-delivery-orders | FBA发货单 | list | fba-delivery-orders |  |
| fba | overseas-plans | 海外仓发货计划 | list | shipping-plans | fba-plans |
| fba | fba-dashboard | FBA总览 | inventory-report |  | inventory-report |
| fba | fba-inventory | FBA库存 | list | inventory | inventory |
| fba | fba-reconciliation | FBA对账 | profit-report | finance | settlement-profit |
| fba | fba-labels | 标签打印 | list | fba-delivery-orders | fba-delivery-orders |
| purchase | purchase-plans | 采购计划 | list | replenishment |  |
| purchase | purchase-orders | 采购单 | list | purchase-orders |  |
| purchase | purchase-amendments | 采购变更 | purchase-amendments |  |  |
| purchase | purchase-approvals | 审批工作台 | list | approvals |  |
| purchase | receiving | 收货单 | list | supplier-deliveries |  |
| purchase | supplier-management | 供应商 | list | suppliers |  |
| purchase | purchase-supplier-quotation | 供应商报价 | supplier-quotes |  |  |
| purchase | supplier-portal | 供应商门户 | list | suppliers | supplier-management |
| purchase | purchase-price | 采购价管理 | list | purchase-orders | purchase-orders |
| purchase | purchase-outsourcing | 委外订单 | list | purchase-orders | purchase-orders |
| purchase | purchase-1688 | 1688下单 | list | purchase-orders | purchase-orders |
| purchase | purchase-requests | 请款池 | list | finance | finance-flow |
| warehouse | inventory | 库存明细 | list | inventory |  |
| warehouse | warehouse-batches | 库存批次 | list | inventory | inventory |
| warehouse | stocktaking | 库存盘点单 | stocktaking |  |  |
| warehouse | stock-adjustment | 盘点差异调整 | stocktaking |  |  |
| warehouse | inbounds | 入库单 | list | inbound-orders |  |
| warehouse | outbounds | 出库单 | list | outbound-orders |  |
| warehouse | transfer-orders | 调拨单 | list | outbound-orders | outbounds |
| warehouse | quality-inspection | 质检单 | list | inbound-orders | inbounds |
| warehouse | scan-receiving | 扫码收货 | list | supplier-deliveries | receiving |
| warehouse | scan-outbound | 扫描出库 | list | outbound-orders | outbounds |
| warehouse | warehouses | 仓库列表 | list | warehouses |  |
| logistics | shipments | 发货计划 | list | shipments |  |
| logistics | logistics-tracking | 物流跟踪 | list | supplier-deliveries |  |
| logistics | first-leg-orders | 头程物流单 | list | shipments | shipments |
| logistics | freight-calculator | 运费试算 | freight-quote |  |  |
| logistics | logistics-channel | 物流渠道 | logistics-directory |  |  |
| logistics | carrier-management | 承运商管理 | logistics-directory |  |  |
| logistics | logistics-cost | 物流费用 | logistics-costs |  |  |
| logistics | logistics-aging | 物流时效 | list | supplier-deliveries | logistics-tracking |
| ads | ad-dashboard | 广告仪表盘 | ad-report |  | ad-performance |
| ads | ad-campaigns | 广告活动 | list | ad-campaigns |  |
| ads | ad-performance | 广告表现 | ad-report |  |  |
| ads | ad-budget | 预算管理 | list | ad-campaigns | ad-campaigns |
| ads | ad-keywords | 广告关键词 | ad-traffic |  |  |
| ads | ad-search-terms | 搜索词分析 | ad-traffic |  |  |
| ads | ad-placement | 广告位分析 | ad-traffic |  |  |
| ads | ad-structure | 广告结构 | list | ad-campaigns | ad-campaigns |
| service | tickets | 客服工单 | list | customer-tickets |  |
| service | message-center | 消息中心 | list | customer-tickets |  |
| service | after-sales-tickets | 售后邮件 | list | customer-tickets | tickets |
| service | email-statistics | 邮件统计 | list | customer-tickets | tickets |
| service | rma-management | 销售退货 / RMA | sales-returns |  |  |
| service | review-management | 商品评论 | customer-voice |  |  |
| service | feedback-management | Feedback管理 | customer-voice |  |  |
| service | service-templates | 邮件模板 | service-templates |  |  |
| finance | order-profit | 订单利润 | profit-report | sales-orders |  |
| finance | settlement-profit | 结算利润 | profit-report | finance |  |
| finance | settlement-center | 亚马逊结算中心 | profit-report | finance | settlement-profit |
| finance | performance-report | 业绩报表 | profit-report | sales-orders | order-profit |
| finance | finance-flow | 资金流水 | list | finance |  |
| finance | accounts-receivable | 应收管理 | account-balances |  |  |
| finance | accounts-payable | 应付管理 | account-balances |  |  |
| finance | payment-requests | 请款管理 | list | finance | finance-flow |
| finance | cost-center | 成本中心 | list | finance | finance-flow |
| finance | invoice-management | 商业发票登记 | commercial-invoices |  |  |
| statistics | sales-stat | 销售统计 | sales-report |  |  |
| statistics | sales-ranking | 销售排行 | sales-report |  | sales-stat |
| statistics | product-performance | 产品表现 | sales-report |  | sales-stat |
| statistics | store-performance | 店铺表现 | sales-report |  | sales-stat |
| statistics | target-management | 目标管理 | sales-targets |  |  |
| statistics | inventory-report | 库存报表 | inventory-report |  |  |
| statistics | inventory-aging | 库龄分析 | inventory-aging |  |  |
| statistics | replenishment-analysis | 补货分析 | inventory-report |  | inventory-report |
| statistics | purchase-analysis | 采购分析 | list | purchase-orders | purchase-orders |
| bi | business-analysis | 经营分析 | bi-report |  |  |
| bi | profit-dashboard | 利润看板 | profit-report | finance |  |
| bi | bi-data-model | 关联数据 | bi-report |  | business-analysis |
| bi | bi-analysis | 数据分析 | bi-report |  | business-analysis |
| bi | bi-app-builder | 应用创作 | bi-report |  | business-analysis |
| bi | bi-screen | 经营大屏 | bi-report |  | business-analysis |
| bi | bi-report-center | 报表中心 | profit-report | finance | profit-dashboard |
| tools | manual-testing | 人工测试中心 | manual-testing |  |  |
| tools | batch-tools | 批量工具 | tools |  |  |
| tools | download-center | 下载中心 | tools |  | batch-tools |
| tools | import-center | 导入中心 | tools |  | batch-tools |
| tools | api-docs | 开放接口 | docs |  |  |
| tools | chatgpt-copy | ChatGPT文案 | docs |  | api-docs |
| tools | review-analysis | 评论分析 | list | customer-tickets | tickets |
| tools | competitor-monitor | 竞品监控 | list | listings | listing |
| tools | keyword-tool | 关键词工具 | list | ad-campaigns | ad-keywords |
| settings | store-auth | 店铺授权 | list | store-authorizations |  |
| settings | login-accounts | 登录账号 | access-accounts |  |  |
| settings | users | 用户与角色 | list | users |  |
| settings | role-permissions | 角色权限 | access-roles |  |  |
| settings | data-permissions | 数据权限 | access-roles |  | role-permissions |
| settings | department-settings | 部门管理 | list | users | users |
| settings | employee-settings | 员工管理 | list | users | users |
| settings | warehouse-settings | 仓库设置 | list | warehouses |  |
| settings | system-settings | 业务配置 | list | warehouses | warehouse-settings |
| settings | currency-settings | 币种汇率 | exchange-rates |  |  |
| settings | approval-settings | 审批设置 | list | approvals | purchase-approvals |
| settings | notification-settings | 消息设置 | list | customer-tickets | message-center |
| settings | audit-logs | 操作日志 | list | audit-logs |  |
