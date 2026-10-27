"""Inspect authorized GET response shapes; never save credentials or tokens."""
import concurrent.futures
import json
import ssl
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = 'https://47.107.76.124/lingxing-erp'
CONTEXT = ssl._create_unverified_context()
ROOT = Path(__file__).resolve().parents[1]

def shape(value, depth=0):
    if depth > 8:
        return type(value).__name__
    if isinstance(value, dict):
        return {key: shape(item, depth + 1) for key, item in value.items()}
    if isinstance(value, list):
        return [shape(value[0], depth + 1)] if value else []
    return type(value).__name__

def main():
    request = Request(BASE + '/api/auth-server/oauth/access-token', data=urlencode({'appId': 'admin', 'appSecret': 'admin'}).encode(), headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urlopen(request, context=CONTEXT, timeout=25) as response:
        login = json.load(response)
    token = login['data']['access_token']
    endpoints = ['me', 'dashboard', 'products?limit=1', 'purchase-orders?limit=1', 'sales-orders?limit=1', 'inventory?limit=1', 'sales-report', 'ad-report', 'accounts-receivable', 'accounts-payable', 'inventory-aging', 'supplier-quotes', 'ad-traffic', 'customer-voice', 'service-templates', 'sales-policies', 'sales-targets', 'logistics-directory', 'logistics-costs', 'exchange-rates', 'commercial-invoices', 'record-context/products/1', 'sales-workflow/1', 'stock-counts', 'purchase-amendments', 'access/catalog', 'access/roles']
    def read(endpoint):
        try:
            with urlopen(Request(BASE + '/api/v1/' + endpoint, headers={'Authorization': 'Bearer ' + token}), context=CONTEXT, timeout=25) as response:
                value = json.load(response)
                return endpoint, {'status': response.status, 'shape': shape(value)}
        except HTTPError as error:
            return endpoint, {'status': error.code, 'error': error.read(1000).decode('utf-8', errors='replace')}
        except Exception as error:
            return endpoint, {'error': str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = dict(pool.map(read, endpoints))
    (ROOT / 'analysis/reference-response-shapes.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Reference login: success; token not saved')
    for key, value in results.items():
        print(key, value.get('status', 'failed'))

if __name__ == '__main__':
    main()
