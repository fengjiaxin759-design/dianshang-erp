# ERP 字段维护规则

来自 ui-contract.json。workflow_owned 等字段必须通过流程维护；这里只记录契约声明。

## Resource_products_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| sku | string | direct_when_allowed |  |
| name | string | direct_when_allowed |  |
| model | string | direct_when_allowed |  |
| category | string | direct_when_allowed |  |
| status | string | direct_when_allowed |  |
| price | number | direct_when_allowed |  |
| cost | number | direct_when_allowed |  |
| product_type | string | direct_when_allowed |  |
| identifier | string | direct_when_allowed |  |
| unit | string | direct_when_allowed |  |
| material | string | direct_when_allowed |  |
| brand | string | direct_when_allowed |  |
| tag | string | direct_when_allowed |  |
| developer | string | direct_when_allowed |  |
| owner | string | direct_when_allowed |  |
| description | string | direct_when_allowed |  |
| supplier_name | string | direct_when_allowed |  |
| moq | integer | direct_when_allowed |  |
| procurement_lead_days | integer | direct_when_allowed |  |
| default_carton_qty | integer | direct_when_allowed |  |
| carton_length | number | direct_when_allowed |  |
| carton_width | number | direct_when_allowed |  |
| carton_height | number | direct_when_allowed |  |
| carton_weight | number | direct_when_allowed |  |
| hs_code | string | direct_when_allowed |  |
| customs_name | string | direct_when_allowed |  |
| customs_price | number | direct_when_allowed |  |
| origin_country | string | direct_when_allowed |  |
| qc_method | string | direct_when_allowed |  |
| qc_standard | string | direct_when_allowed |  |
| image_url | string | direct_when_allowed |  |
| official_attributes | object | direct_when_allowed |  |

## Resource_inventory_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| batch_no | string | direct_when_allowed |  |
| wid | integer | direct_when_allowed |  |
| warehouse_name | string | direct_when_allowed |  |
| product_id | integer | direct_when_allowed |  |
| sku | string | direct_when_allowed |  |
| fnsku | string | direct_when_allowed |  |
| store_id | integer | direct_when_allowed |  |
| store_name | string | direct_when_allowed |  |
| quantity | integer | direct_when_allowed |  |
| available | integer | direct_when_allowed |  |
| source_batch_no | string | direct_when_allowed |  |
| order_sn | string | direct_when_allowed |  |

## Resource_purchase_orders_Write

本地采购暂存维护。新建只允许待提交；状态和实收数量只能由流程维护；审批以后供应商、SKU明细、金额等核心锁定，仅备注/付款计划/物流/预计到货可改。

| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| order_sn | string | direct_when_allowed |  |
| custom_order_sn | string | direct_when_allowed |  |
| supplier_id | integer | direct_when_allowed |  |
| supplier_name | string | direct_when_allowed |  |
| warehouse_name | string | direct_when_allowed |  |
| status_text | string | workflow_owned | 采购审批/下单/结束到货动作 |
| order_time | string | direct_when_allowed |  |
| purchase_currency | string | direct_when_allowed |  |
| amount | number | direct_when_allowed |  |
| purchase_user | string | direct_when_allowed |  |
| planned_arrival | string | direct_when_allowed |  |
| payment_status | string | workflow_owned | 付款和补偿记录 |
| tax_rate | number | direct_when_allowed |  |
| freight | number | direct_when_allowed |  |
| other_fee | number | direct_when_allowed |  |
| allocation_method | string | direct_when_allowed |  |
| logistics_provider | string | direct_when_allowed |  |
| tracking_no | string | direct_when_allowed |  |
| qc_type | string | direct_when_allowed |  |
| received_qty | integer | workflow_owned | 收货累计 |
| pending_qty | integer | workflow_owned | 采购明细、实收和结束到货 |
| payment_plan | string | direct_when_allowed |  |
| source_plan_no | string | direct_when_allowed |  |
| remark | string | direct_when_allowed |  |
| item_list | array | direct_when_allowed |  |

## Resource_sales_orders_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| order_sn | string | direct_when_allowed |  |
| platform_order_sn | string | direct_when_allowed |  |
| platform | string | direct_when_allowed |  |
| store_name | string | direct_when_allowed |  |
| site | string | direct_when_allowed |  |
| country | string | direct_when_allowed |  |
| buyer | string | direct_when_allowed |  |
| phone | string | direct_when_allowed |  |
| shipping_address | string | direct_when_allowed |  |
| status_text | string | workflow_owned | 销售流程动作 |
| fulfillment_status | string | workflow_owned | 发货流程 |
| payment_status | string | workflow_owned | 本地付款/退款证据 |
| order_time | string | direct_when_allowed |  |
| currency | string | direct_when_allowed |  |
| amount | number | direct_when_allowed |  |
| shipping_warehouse | string | direct_when_allowed |  |
| delivery_method | string | direct_when_allowed |  |
| tracking_no | string | workflow_owned | 销售发货流程 |
| carrier | string | workflow_owned | 销售发货流程 |
| refund_status | string | workflow_owned | 退货退款流程 |
| remark | string | direct_when_allowed |  |
| item_list | array | direct_when_allowed |  |

## Resource_inbound_orders_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| order_sn | string | direct_when_allowed |  |
| type | integer | direct_when_allowed |  |
| warehouse_name | string | direct_when_allowed |  |
| purchase_order_sn | string | direct_when_allowed |  |
| supplier_name | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed | 库存过账/冲销 |
| create_time | string | direct_when_allowed |  |
| quantity | integer | direct_when_allowed |  |
| purchase_unit_price | number | direct_when_allowed |  |
| freight | number | direct_when_allowed |  |
| other_fee | number | direct_when_allowed |  |
| allocation_method | string | direct_when_allowed |  |
| inspected_qty | integer | direct_when_allowed |  |
| available_qty | integer | direct_when_allowed |  |
| defective_qty | integer | direct_when_allowed |  |
| qc_status | string | direct_when_allowed |  |
| logistics_provider | string | direct_when_allowed |  |
| tracking_no | string | direct_when_allowed |  |
| remark | string | direct_when_allowed |  |
| item_list | array | direct_when_allowed |  |

## Resource_outbound_orders_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| order_sn | string | direct_when_allowed |  |
| warehouse_name | string | direct_when_allowed |  |
| to_warehouse_name | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed | 库存过账/调拨/冲销 |
| create_time | string | direct_when_allowed |  |
| quantity | integer | direct_when_allowed |  |
| item_list | array | direct_when_allowed |  |

## Resource_listings_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| sku | string | direct_when_allowed |  |
| platform | string | direct_when_allowed |  |
| store_name | string | direct_when_allowed |  |
| listing_id | string | direct_when_allowed |  |
| title | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |
| price | number | direct_when_allowed |  |
| stock | integer | direct_when_allowed |  |

## Resource_finance_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| reference_no | string | direct_when_allowed |  |
| type | string | direct_when_allowed |  |
| counterparty | string | direct_when_allowed |  |
| currency | string | direct_when_allowed |  |
| amount | number | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |
| occurred_at | string | direct_when_allowed |  |

## Resource_shipments_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| shipment_id | string | direct_when_allowed |  |
| shipment_type | string | direct_when_allowed |  |
| shipment_name | string | direct_when_allowed |  |
| warehouse_name | string | direct_when_allowed |  |
| destination | string | direct_when_allowed |  |
| country | string | direct_when_allowed |  |
| site | string | direct_when_allowed |  |
| carrier | string | direct_when_allowed |  |
| amazon_status | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |
| tracking_no | string | direct_when_allowed |  |
| logistics_channel | string | direct_when_allowed |  |
| box_count | integer | direct_when_allowed |  |
| total_weight | number | direct_when_allowed |  |
| total_volume | number | direct_when_allowed |  |
| head_freight | number | direct_when_allowed |  |
| expected_ship_date | string | direct_when_allowed |  |
| expected_arrival_date | string | direct_when_allowed |  |
| received_qty | integer | direct_when_allowed |  |

## Resource_replenishment_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| recommendation_no | string | direct_when_allowed |  |
| sku | string | direct_when_allowed |  |
| fnsku | string | direct_when_allowed |  |
| store_name | string | direct_when_allowed |  |
| urgency | string | direct_when_allowed |  |
| daily_sales | number | direct_when_allowed |  |
| local_available | integer | direct_when_allowed |  |
| fba_available | integer | direct_when_allowed |  |
| inbound | integer | direct_when_allowed |  |
| overseas_available | integer | direct_when_allowed |  |
| overseas_inbound | integer | direct_when_allowed |  |
| pending_inspection | integer | direct_when_allowed |  |
| local_inbound | integer | direct_when_allowed |  |
| fba_inbound | integer | direct_when_allowed |  |
| lead_days | integer | direct_when_allowed |  |
| safety_days | integer | direct_when_allowed |  |
| moq | integer | direct_when_allowed |  |
| suggested_qty | integer | direct_when_allowed |  |
| suggested_purchase_date | string | direct_when_allowed |  |
| stockout_date | string | direct_when_allowed |  |
| purchase_frequency | integer | direct_when_allowed |  |
| replenishment_mode | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |
| generated_at | string | direct_when_allowed |  |

## Resource_shipping_plans_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| plan_no | string | direct_when_allowed |  |
| channel | string | direct_when_allowed |  |
| store_name | string | direct_when_allowed |  |
| warehouse_name | string | direct_when_allowed |  |
| destination | string | direct_when_allowed |  |
| shipment_id | string | direct_when_allowed |  |
| status_text | string | workflow_owned | 计划审批与发货动作 |
| approval_status | string | workflow_owned | 审批工作流 |
| locked_quantity | integer | workflow_owned | 计划锁库、释放库存及发货单接续分配 |
| quantity | integer | direct_when_allowed |  |
| sku_count | integer | direct_when_allowed |  |
| source_recommendation_no | string | direct_when_allowed |  |
| etd | string | direct_when_allowed |  |
| eta | string | direct_when_allowed |  |
| item_list | array | direct_when_allowed |  |

## Resource_supplier_deliveries_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| delivery_no | string | direct_when_allowed |  |
| purchase_order_sn | string | direct_when_allowed |  |
| supplier_name | string | direct_when_allowed |  |
| warehouse_name | string | direct_when_allowed |  |
| logistics_provider | string | direct_when_allowed |  |
| tracking_no | string | direct_when_allowed |  |
| freight | number | direct_when_allowed |  |
| other_fee | number | direct_when_allowed |  |
| total_qty | integer | direct_when_allowed |  |
| received_qty | integer | workflow_owned | 逐行确认收货累计 |
| qc_status | string | workflow_owned | 收货与质检流程 |
| status_text | string | workflow_owned | 确认收货流程 |
| creator | string | direct_when_allowed |  |
| inspection_type | string | direct_when_allowed |  |
| remark | string | direct_when_allowed |  |
| item_list | array | direct_when_allowed |  |

## Resource_store_authorizations_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| platform | string | direct_when_allowed |  |
| store_name | string | direct_when_allowed |  |
| site | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |
| fee_rate | number | direct_when_allowed |  |
| last_checked_at | string | direct_when_allowed |  |

## Resource_approvals_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| request_no | string | workflow_owned | 来源单据与审批决定 |
| business_type | string | workflow_owned | 来源单据与审批决定 |
| business_no | string | workflow_owned | 来源单据与审批决定 |
| status_text | string | workflow_owned | 来源单据与审批决定 |
| applicant | string | workflow_owned | 来源单据与审批决定 |
| approver | string | workflow_owned | 来源单据与审批决定 |
| submitted_at | string | workflow_owned | 来源单据与审批决定 |
| decided_at | string | workflow_owned | 来源单据与审批决定 |

## Resource_audit_logs_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| method | string | 未声明 |  |
| path | string | 未声明 |  |
| actor | string | 未声明 |  |
| payload | string | 未声明 |  |
| created_at | string | 未声明 |  |

## Resource_suppliers_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| supplier_code | string | direct_when_allowed |  |
| name | string | direct_when_allowed |  |
| level | string | direct_when_allowed |  |
| contact | string | direct_when_allowed |  |
| phone | string | direct_when_allowed |  |
| purchase_user | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |

## Resource_warehouses_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| warehouse_code | string | direct_when_allowed |  |
| name | string | direct_when_allowed |  |
| warehouse_type | string | direct_when_allowed |  |
| country | string | direct_when_allowed |  |
| manager | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |

## Resource_users_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| username | string | direct_when_allowed |  |
| name | string | direct_when_allowed |  |
| department | string | direct_when_allowed |  |
| role_name | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |
| last_login_at | string | direct_when_allowed |  |

## Resource_ad_campaigns_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| platform | string | direct_when_allowed |  |
| store_name | string | direct_when_allowed |  |
| campaign_name | string | direct_when_allowed |  |
| campaign_type | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |
| spend | number | direct_when_allowed |  |
| sales | number | direct_when_allowed |  |
| acos | number | direct_when_allowed |  |
| sku | string | direct_when_allowed |  |

## Resource_customer_tickets_Write



| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| ticket_no | string | direct_when_allowed |  |
| platform | string | direct_when_allowed |  |
| store_name | string | direct_when_allowed |  |
| buyer | string | direct_when_allowed |  |
| subject | string | direct_when_allowed |  |
| status_text | string | direct_when_allowed |  |
| owner | string | direct_when_allowed |  |
| created_time | string | direct_when_allowed |  |
| order_sn | string | direct_when_allowed |  |

## Resource_fba_delivery_orders_Write

只能编辑由已审批FBA计划生成的草稿物流信息。状态/数量/来源等字段通过专用动作维护；历史只读。

| 字段 | 类型 | 编辑策略 | 维护者 |
| --- | --- | --- | --- |
| delivery_order_no | string | direct_when_allowed |  |
| shipment_id | string | workflow_owned | 来源计划与发货/签收流程 |
| plan_no | string | workflow_owned | 来源计划与发货/签收流程 |
| store_name | string | workflow_owned | 来源计划与发货/签收流程 |
| warehouse_name | string | workflow_owned | 来源计划与发货/签收流程 |
| destination | string | workflow_owned | 来源计划与发货/签收流程 |
| carrier | string | direct_when_allowed |  |
| tracking_no | string | direct_when_allowed |  |
| status_text | string | workflow_owned | 发货/签收工作流 |
| shipped_qty | integer | workflow_owned | 确认发货 |
| received_qty | integer | workflow_owned | 签收累计 |
| box_count | integer | direct_when_allowed |  |
| head_freight | number | direct_when_allowed |  |
| shipped_at | string | workflow_owned | 发货动作时间 |
| received_at | string | workflow_owned | 签收动作时间 |
| remark | string | direct_when_allowed |  |
| item_list | array | workflow_owned | 来源计划与发货/签收流程 |
