"""Run pinned REA CLI and preserve its raw analysis output."""
import json
import shutil
import subprocess
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
out = repo / 'analysis'
out.mkdir(exist_ok=True)
command = [shutil.which('npx.cmd') or 'npx.cmd', '--yes', 'rea-agents@6.4.0', 'analyze-javascript-application', str(repo / 'reference/lingxing-erp'), '--analysis-timeout-ms', '60000', '--format', 'json']
try:
    result = subprocess.run(command, cwd=repo, capture_output=True, timeout=240)
    (out / 'rea-application.json').write_bytes(result.stdout)
    (out / 'rea-stderr.log').write_bytes(result.stderr)
    print('REA exit code:', result.returncode)
    print('REA output bytes:', len(result.stdout))
    if result.stdout:
        try:
            data = json.loads(result.stdout)
            if isinstance(data, dict) and 'normalized_result' in data:
                normalized = data['normalized_result']
                summary = {'cliVersion': '6.4.0', 'evidence_id': data.get('evidence_id'), 'provider': data.get('provider'), 'authority': data.get('authority'), 'statistics': normalized.get('statistics'), 'graphCoverage': normalized.get('graph', {}).get('coverage'), 'semanticCoverage': normalized.get('semantic_graph', {}).get('coverage'), 'limitations': normalized.get('limitations')}
                (out / 'rea-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
            print('Envelope keys:', list(data) if isinstance(data, dict) else type(data).__name__)
            if isinstance(data, dict):
                for key, value in data.items():
                    print(key, ':', list(value)[:20] if isinstance(value, dict) else ('list length '+str(len(value)) if isinstance(value, list) else str(value)[:1000]))
        except ValueError:
            print(result.stdout[:1500].decode('utf-8', errors='replace'))
    if result.stderr:
        print(result.stderr[-2000:].decode('utf-8', errors='replace'))
except subprocess.TimeoutExpired as error:
    (out / 'rea-application.partial.log').write_bytes(error.stdout or b'')
    print('REA timed out after 240 seconds; partial output preserved.')
    raise
