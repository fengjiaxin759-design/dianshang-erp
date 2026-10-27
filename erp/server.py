"""Loopback HTTP server; one SQLite transaction per API request."""
import json
import mimetypes
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlsplit
from .store import Store, Problem, ROOT
from .api import dispatch

class Server(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,address,db_path):
        self.store=Store(db_path)
        super().__init__(address,Handler)

class Handler(BaseHTTPRequestHandler):
    server_version='LocalERP/0.1'
    def log_message(self,format,*args):
        # Paths contain no request bodies or authorization values.
        print(format%args,flush=True)

    def send(self,status,data,content_type='application/json; charset=utf-8'):
        raw=json.dumps(data,ensure_ascii=False,allow_nan=False).encode('utf-8') if isinstance(data,(dict,list)) else data
        self.send_response(status)
        self.send_header('Content-Type',content_type)
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store' if content_type.startswith('application/json') else 'no-cache')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','same-origin')
        self.end_headers()
        if self.command!='HEAD':
            try:
                self.wfile.write(raw)
            except (BrokenPipeError,ConnectionResetError):
                pass

    def handle_request(self):
        url=urlsplit(self.path)
        path=unquote(url.path)
        if path.startswith('/lingxing-erp'):
            path=path[len('/lingxing-erp'):] or '/'
        if not (path.startswith('/api/') or path=='/healthz'):
            if self.command not in {'GET','HEAD'}:
                return self.send(405,{'message':'静态文件只支持GET'})
            root=(ROOT/'frontend').resolve()
            target=(root/('index.html' if path=='/' else path.lstrip('/'))).resolve()
            if not target.is_relative_to(root) or not target.is_file():
                return self.send(404,{'message':'文件不存在'})
            kind=mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
            if target.suffix in {'.html','.css','.js','.svg','.json','.yaml'}:
                kind += '; charset=utf-8'
            return self.send(200,target.read_bytes(),kind)
        query={k:v[-1] for k,v in parse_qs(url.query,keep_blank_values=True).items()}
        db=self.server.store.connect()
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<=length<=2_000_000:
                raise Problem('请求体超过2MB',413)
            raw=self.rfile.read(length) if length else b''
            if raw and self.headers.get('Content-Type','').startswith('application/x-www-form-urlencoded'):
                body={k:v[-1] for k,v in parse_qs(raw.decode()).items()}
            else:
                body=json.loads(raw.decode()) if raw else {}
            if not isinstance(body,dict):
                raise Problem('请求体必须为JSON对象',400)
            auth=self.headers.get('Authorization','')
            token=auth[7:] if auth.startswith('Bearer ') else ''
            # Prevent cross-site credentialed writes, even though cookies are not used.
            origin=self.headers.get('Origin')
            if origin and origin!=f'http://{self.headers.get("Host")}':
                raise Problem('请求来源不匹配',403)
            db.execute('BEGIN IMMEDIATE' if self.command not in {'GET','HEAD'} else 'BEGIN')
            result=dispatch(db,'GET' if self.command=='HEAD' else self.command,path,query,body,token)
            db.commit()
            self.send(200,result)
        except Problem as error:
            db.rollback()
            self.send(error.status,{'code':error.status,'message':error.message,'data':None})
        except (KeyError,ValueError,TypeError,OverflowError) as error:
            db.rollback()
            self.send(400,{'code':400,'message':'请求字段缺失或格式错误：'+str(error),'data':None})
        except Exception:
            db.rollback()
            traceback.print_exc()
            self.send(500,{'code':500,'message':'本地服务内部错误，请查看终端日志','data':None})
        finally:
            db.close()

    do_GET=handle_request
    do_HEAD=handle_request
    do_POST=handle_request
    do_PUT=handle_request
    do_DELETE=handle_request

