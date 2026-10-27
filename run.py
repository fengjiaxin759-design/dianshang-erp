"""Start the independent ERP. Python 3.11+; no third-party packages."""
import argparse
from pathlib import Path
from erp.server import Server

def main():
    parser=argparse.ArgumentParser(description='本地独立电商ERP')
    parser.add_argument('--host',default='127.0.0.1',choices=['127.0.0.1','localhost'])
    parser.add_argument('--port',type=int,default=5186)
    parser.add_argument('--db',default=str(Path(__file__).resolve().parent/'data/erp.sqlite3'))
    args=parser.parse_args()
    from tools.build_frontend import build
    build()
    server=Server((args.host,args.port),args.db)
    print(f'本地ERP：http://{args.host}:{args.port}/lingxing-erp/\n默认账号：admin / admin\n数据库：{args.db}',flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__=='__main__':
    main()
