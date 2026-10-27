"""Reproducible static ERP inventory; never executes target JavaScript."""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / 'reference' / 'lingxing-erp'
OUT = REPO / 'analysis'
METHODS = {'get', 'post', 'put', 'patch', 'delete', 'head', 'options'}

def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

def main():
    OUT.mkdir(exist_ok=True)
    contract = json.loads((ROOT / 'openapi.yaml').read_text(encoding='utf-8'))
    ui = json.loads((ROOT / 'static/ui-contract.json').read_text(encoding='utf-8'))
    app = (ROOT / 'static/app.js').read_text(encoding='utf-8')
    operations = []
    for path, item in contract['paths'].items():
        for method, operation in item.items():
            if method not in METHODS:
                continue
            operations.append({'method': method.upper(), 'path': path, 'summary': operation.get('summary', ''), 'description': operation.get('description', ''), 'operationId': operation.get('operationId'), 'tags': operation.get('tags', []), 'security': operation.get('security', contract.get('security', [])), 'parameters': operation.get('parameters', item.get('parameters', [])), 'requestBody': operation.get('requestBody'), 'responses': operation.get('responses', {})})
    write_json('api-inventory.json', operations)
    schemas = contract.get('components', {}).get('schemas', {})
    write_json('schema-inventory.json', schemas)
    resources = []
    for name, schema in ui.get('components', {}).get('schemas', {}).items():
        if not name.endswith('_Write'):
            continue
        resources.append({'schema': name, 'description': schema.get('description', ''), 'required': schema.get('required', []), 'additionalProperties': schema.get('additionalProperties'), 'fields': schema.get('properties', {})})
    write_json('write-policies.json', resources)
    modules = []
    block = app.split('const MODULES = [', 1)[1].split('\n];', 1)[0]
    for line in block.splitlines():
        found = re.search(r"\{id:'([^']+)',title:'([^']+)'", line)
        if found:
            pages = []
            for page_list in re.findall(r'pages:\[([^\]]+)\]', line):
                pages.extend(re.findall(r"'([^']+)'", page_list))
            modules.append({'id': found[1], 'title': found[2], 'menuPages': pages})
    write_json('module-inventory.json', modules)
    definitions = {}
    def collect_definitions(source):
        for found in re.finditer(r"\{id:'([^']+)',module:'([^']+)',title:'([^']+)'([^\n]*)", source):
            entry = {'id': found[1], 'module': found[2], 'title': found[3], 'type': 'list', 'resource': None, 'aliasOf': None}
            for key in ('type', 'resource'):
                value = re.search(key + r":'([^']+)'", found[4])
                if value:
                    entry[key] = value[1]
            definitions[entry['id']] = entry
    collect_definitions(app.split('// Secondary pages', 1)[0])
    alias_block = app.split('function mappedPage', 1)[1].split('].forEach(function(item)', 1)[0]
    aliases = re.findall(r"\['([^']+)','([^']+)','([^']+)','([^']+)'", alias_block)
    for page_id, module, title, base in aliases:
        definitions[page_id] = {**definitions.get(base, {}), 'id': page_id, 'module': module, 'title': title, 'aliasOf': base}
    collect_definitions(app.split('].forEach(function(item)', 1)[1].split('const MODULES', 1)[0])
    pages = [definitions.get(page_id, {'id': page_id, 'missingDefinition': True}) for module in modules for page_id in module['menuPages']]
    write_json('page-inventory.json', pages)
    page_lines = ['# ERP 菜单与实际实现', '', 'aliasOf 表示代码复用了另一个页面的资源和视图，并非独立业务实现。部分页面随后被专用渲染器覆盖；这里使用覆盖后的定义。', '', '| 模块 | 页面 | 标题 | 视图类型 | 资源 | 复用来源 |', '| --- | --- | --- | --- | --- | --- |']
    for page in pages:
        page_lines.append('| ' + ' | '.join(str(page.get(key) or '') for key in ('module', 'id', 'title', 'type', 'resource', 'aliasOf')) + ' |')
    (OUT / 'PAGE-MAP.md').write_text('\n'.join(page_lines) + '\n', encoding='utf-8')
    evidence, files = [], []
    for file in sorted((ROOT / 'static').glob('*.js')):
        data = file.read_bytes()
        text = data.decode('utf-8')
        files.append({'file': str(file.relative_to(REPO)).replace('\\', '/'), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        for number, line in enumerate(text.splitlines(), 1):
            for match in re.finditer(r"(['\"`])(/api/[^'\"`\s]*)\1", line):
                evidence.append({'file': files[-1]['file'], 'line': number, 'pathLiteral': match[2], 'snippet': line.strip()[:1000]})
    write_json('frontend-api-evidence.json', evidence)
    write_json('source-manifest.json', files)
    counts = Counter(op['method'] for op in operations)
    overview = {'modules': len(modules), 'menuEntries': len(pages), 'remainingAliasedPages': sum(bool(p.get('aliasOf')) for p in pages), 'missingPageDefinitions': sum(bool(p.get('missingDefinition')) for p in pages), 'apiPaths': len(contract['paths']), 'apiOperations': len(operations), 'methods': dict(counts), 'schemas': len(schemas), 'uiPaths': len(ui['paths']), 'writeSchemas': len(resources), 'javascriptFiles': len(files), 'apiLiteralEvidence': len(evidence), 'openapiInfo': contract.get('info', {})}
    write_json('overview.json', overview)
    lines = ['# ERP 接口清单', '', '从公开 OpenAPI 契约提取；接口存在于文档不等于已完成运行验证。', '', '| 方法 | 路径 | 说明 |', '| --- | --- | --- |']
    for op in operations:
        summary = (op['summary'] or op['description']).replace('\n', ' ').replace('|', '\\|')[:180]
        lines.append(f"| {op['method']} | `{op['path']}` | {summary} |")
    (OUT / 'API-CATALOG.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    lines = ['# ERP 字段维护规则', '', '来自 ui-contract.json。workflow_owned 等字段必须通过流程维护；这里只记录契约声明。', '']
    for resource in resources:
        lines.extend(['## ' + resource['schema'], '', resource['description'], '', '| 字段 | 类型 | 编辑策略 | 维护者 |', '| --- | --- | --- | --- |'])
        for name, schema in resource['fields'].items():
            lines.append('| ' + ' | '.join(str(v).replace('|', '\\|').replace('\n', ' ') for v in [name, schema.get('type', schema.get('$ref', '')), schema.get('x-edit-policy', schema.get('x-maintenance-mode', '未声明')), schema.get('x-maintained-by', '')]) + ' |')
        lines.append('')
    (OUT / 'FIELD-POLICIES.md').write_text('\n'.join(lines), encoding='utf-8')
    print(json.dumps(overview, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
