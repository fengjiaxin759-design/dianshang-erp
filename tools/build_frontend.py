"""Initialize editable frontend from the captured reference; preserve later edits."""
import json
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def build():
    source=ROOT/'reference/lingxing-erp'
    target=ROOT/'frontend'
    for file in source.rglob('*'):
        if file.is_file():
            dest=target/file.relative_to(source)
            if not dest.exists():
                dest.parent.mkdir(parents=True,exist_ok=True)
                shutil.copyfile(file,dest)
    # The API document is an implementation-owned artifact rather than the original full contract.
    doc=json.loads((source/'openapi.yaml').read_text(encoding='utf-8'))
    excluded={'/api/session','/api/v1/data-contract','/api/v1/warehouse-export','/api/v1/warehouse-export/{snapshot_id}/{table}','/api/v1/warehouse-export/{snapshot_id}'}
    paths={p:m for p,m in doc['paths'].items() if (p.startswith('/api/v1/') or p.startswith('/api/auth-server/') or p=='/healthz') and p not in excluded}
    doc['paths']=paths
    doc['info']={'title':'本地独立电商 ERP','version':'0.1.0','description':'独立Python/SQLite实现。界面和字段结构参考导师演示。外部平台兼容路径不提供实际平台服务；部分请求约束与原版有差异，见README。'}
    (target/'openapi.yaml').write_text(json.dumps(doc,ensure_ascii=False),encoding='utf-8')
    return target

if __name__=='__main__':
    print(build())
