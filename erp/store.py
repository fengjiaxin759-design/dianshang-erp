"""SQLite persistence, authentication, scopes and transactional primitives."""
import hashlib
import hmac
import json
import math
import secrets
import sqlite3
import time
from contextlib import closing
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = json.loads((ROOT / 'reference/lingxing-erp/static/ui-contract.json').read_text(encoding='utf-8'))
RESOURCES = {path.rsplit('/', 1)[-1] for path in CONTRACT['paths'] if path.startswith('/api/v1/') and '{' not in path and path.count('/') == 3}

class Problem(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status

def require(condition, message, status=409):
    if not condition:
        raise Problem(message, status)

def now():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')

def cents(value):
    try:
        value = Decimal(str(value))
        require(value.is_finite(), '金额必须为有限数值', 400)
        require(value == value.quantize(Decimal('.01')), '金额最多保留两位小数', 400)
        return int(value * 100)
    except (InvalidOperation, TypeError, ValueError):
        raise Problem('金额格式错误', 400)

def amount(value):
    return float(Decimal(value) / 100)

def integer(value, label='数量', minimum=0):
    try:
        parsed = Decimal(str(value))
        require(parsed.is_finite() and parsed == parsed.to_integral_value() and parsed >= minimum, label + '必须是有效整数', 400)
        return int(parsed)
    except (InvalidOperation, TypeError, ValueError):
        raise Problem(label + '格式错误', 400)

def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 120000).hex()
    return salt + ':' + digest

def password_matches(password, encoded):
    return hmac.compare_digest(password_hash(password, encoded.split(':')[0]), encoded)

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with closing(self.connect()) as db, db:
            db.executescript('''
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS records(resource TEXT NOT NULL,id INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(resource,id));
                CREATE TABLE IF NOT EXISTS roles(id TEXT PRIMARY KEY,body TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,body TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,refresh TEXT UNIQUE NOT NULL,account_id INTEGER NOT NULL,expires REAL NOT NULL,refresh_expires REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS idempotency(scope TEXT NOT NULL,key TEXT NOT NULL,digest TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(scope,key));
            ''')
            if not db.execute('SELECT 1 FROM accounts LIMIT 1').fetchone():
                db.execute('INSERT INTO roles VALUES(?,?)', ('administrator', json.dumps({'id': 'administrator', 'name': '超级管理员', 'permissions': ['*']})))
                account = {'id': 1, 'username': 'admin', 'name': '本地管理员', 'role_id': 'administrator', 'enabled': True, 'scope': None, 'department': '管理部', 'original_admin': True}
                db.execute('INSERT INTO accounts VALUES(?,?,?,?)', (1, 'admin', password_hash('admin'), json.dumps(account, ensure_ascii=False)))
                from .seed import seed
                seed(db)

    def connect(self):
        db = sqlite3.connect(self.path, timeout=20, isolation_level='DEFERRED')
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA busy_timeout=20000')
        return db

def rows(db, resource):
    return [json.loads(row[0]) for row in db.execute('SELECT body FROM records WHERE resource=? ORDER BY id DESC', (resource,))]

def get(db, resource, record_id):
    found = db.execute('SELECT body FROM records WHERE resource=? AND id=?', (resource, integer(record_id, 'ID', 1))).fetchone()
    require(found is not None, '记录不存在：' + resource, 404)
    return json.loads(found[0])

def put(db, resource, record):
    record = dict(record)
    record['updated_at'] = now()
    record['_version'] = int(record.get('_version', 0)) + 1
    db.execute('INSERT INTO records VALUES(?,?,?) ON CONFLICT(resource,id) DO UPDATE SET body=excluded.body', (resource, record['id'], json.dumps(record, ensure_ascii=False, allow_nan=False)))
    return record

def add(db, resource, body):
    record_id = db.execute('SELECT COALESCE(MAX(id),0)+1 FROM records WHERE resource=?', (resource,)).fetchone()[0]
    return put(db, resource, {**body, 'id': record_id, 'created_at': body.get('created_at', now())})

def audit(db, user, method, path, payload):
    add(db, 'audit-logs', {'actor': user['username'], 'method': method, 'path': path, 'payload': json.dumps(payload, ensure_ascii=False)})

def event(record, user, action, reason=''):
    record.setdefault('events', []).append({'actor': user['username'], 'action': action, 'reason': reason, 'created_at': now(), 'before_version': record.get('version', 0), 'after_version': record.get('version', 0) + 1})

def identity(db, account_id):
    row = db.execute('SELECT body FROM accounts WHERE id=?', (account_id,)).fetchone()
    require(row is not None, '登录账号失效', 401)
    user = json.loads(row[0])
    require(user.get('enabled'), '账号已停用', 401)
    role = db.execute('SELECT body FROM roles WHERE id=?', (user['role_id'],)).fetchone()
    require(role is not None, '角色已失效', 401)
    role = json.loads(role[0])
    return {**user, 'permissions': role['permissions'], 'role_name': role['name']}

def authenticate(db, token):
    row = db.execute('SELECT account_id,expires FROM sessions WHERE token=?', (token_hash(token),)).fetchone()
    require(row is not None and row['expires'] > time.time(), '请重新登录', 401)
    return identity(db, row['account_id'])

def login(db, username, password):
    row = db.execute('SELECT * FROM accounts WHERE username=?', (username,)).fetchone()
    require(row is not None and password_matches(password, row['password']), '账号或密码错误', 401)
    user = identity(db, row['id'])
    token, refresh = secrets.token_urlsafe(32), secrets.token_urlsafe(40)
    db.execute('INSERT INTO sessions VALUES(?,?,?,?,?)', (token_hash(token), token_hash(refresh), user['id'], time.time()+3600, time.time()+86400*7))
    return {'code': 0, 'data': {'access_token': token, 'refresh_token': refresh, 'expires_in': 3600, 'user': user}}

def permit(user, permission):
    require('*' in user['permissions'] or permission in user['permissions'], '无操作权限：' + permission, 403)

def visible(db, user, record):
    if '*' in user['permissions'] or user.get('scope') is None:
        return True
    scope = user['scope']
    dimensions = [('shops', 'store-authorizations', ('store_id', 'sid'), ('store_name',)), ('warehouses', 'warehouses', ('wid', 'warehouse_id'), ('warehouse_name', 'shipping_warehouse', 'to_warehouse_name'))]
    observed = False
    for key, resource, ids, names in dimensions:
        allowed = set(scope.get(key, []))
        allowed_names = {r.get('store_name') or r.get('name') for r in rows(db, resource) if r['id'] in allowed}
        for field in ids:
            if record.get(field) is not None:
                observed = True
                if record[field] not in allowed:
                    return False
        for field in names:
            if record.get(field):
                observed = True
                if record[field] not in allowed_names:
                    return False
    return observed

def scoped_get(db, user, resource, record_id):
    record = get(db, resource, record_id)
    require(visible(db, user, record), '记录不在账号数据范围内', 403)
    return record

def page(items, query):
    q, field = query.get('q', '').casefold(), query.get('field', 'all')
    def match(row):
        if q:
            text = str(row.get(field, '')) if field != 'all' else json.dumps(row, ensure_ascii=False)
            if (text.casefold() != q if query.get('match') == 'exact' else q not in text.casefold()):
                return False
        for key, value in query.items():
            if not value or key in {'q','field','match','limit','offset','ids','inventory_scope','view','date_from','date_to','granularity','ledger_offset','inventory_id'}:
                continue
            if key == 'status':
                if value != '全部' and value not in {str(row.get('status_text', '')), str(row.get('status', '')), str(row.get('state', ''))}:
                    return False
            elif key in row and str(row[key]) != str(value):
                return False
        date = str(row.get('order_time') or row.get('occurred_at') or row.get('created_at') or '')[:10]
        return not ((query.get('date_from') and date < query['date_from']) or (query.get('date_to') and date > query['date_to']))
    items = [row for row in items if match(row)]
    if query.get('ids'):
        ids = {integer(i, 'ID', 1) for i in query['ids'].split(',')}
        items = [row for row in items if row['id'] in ids]
    offset, limit = integer(query.get('offset', 0)), min(integer(query.get('limit', 50), minimum=1), 2000 if query.get('view')=='report' else 200)
    return {'code': 0, 'items': items[offset:offset+limit], 'total': len(items), 'offset': offset, 'limit': limit}

def once(db, scope, key, body, execute):
    require(isinstance(key, str) and 3 <= len(key) <= 160, '请填写至少3字符的唯一业务参考号', 400)
    digest = hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    old = db.execute('SELECT digest,result FROM idempotency WHERE scope=? AND key=?', (scope, key)).fetchone()
    if old:
        require(old['digest'] == digest, '相同参考号的内容不同，请核对原记录', 409)
        result = json.loads(old['result'])
        result['data'] = {**result.get('data', {}), 'reused': True}
        return result
    result = execute()
    db.execute('INSERT INTO idempotency VALUES(?,?,?,?)', (scope, key, digest, json.dumps(result, ensure_ascii=False)))
    return result

def ok(data=None, **extra):
    return {'code': 0, 'message': 'success', 'data': data if data is not None else {}, **extra}
