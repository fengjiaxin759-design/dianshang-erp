"""Use REA's bounded browser scenario to verify the local UI and retain proof."""
import base64
import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'analysis/local-verification'

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    base='http://127.0.0.1:5186/lingxing-erp/'
    actions=[
        {'step_id':'login-user','action':'fill','locator':{'kind':'css','selector':'#login-app-id'},'value':{'source':'secret','secret_id':'qa-user'},'timeout_ms':10000},
        {'step_id':'login-password','action':'fill','locator':{'kind':'css','selector':'#login-app-secret'},'value':{'source':'secret','secret_id':'qa-password'},'timeout_ms':10000},
        {'step_id':'login-submit','action':'click','locator':{'kind':'css','selector':'#login-submit'},'timeout_ms':10000},
        {'step_id':'login-complete','action':'wait_for','locator':{'kind':'css','selector':'#login-dialog'},'state':'hidden','timeout_ms':10000},
        {'step_id':'dashboard-ready','action':'wait_for','locator':{'kind':'css','selector':'.home-page'},'state':'visible','timeout_ms':10000},
    ]
    pages=['product-management','purchase-orders','sales-orders','inventory','fba-plans','stocktaking','rma-management','accounts-payable','supplier-quotation','inventory-aging','ad-keywords','review-management','service-templates','promotion-management','target-management','logistics-channel','invoice-management','currency-settings','login-accounts','sales-stat','dashboard']
    for index,page in enumerate(pages):
        actions.extend([{'step_id':f'page-{index}','action':'goto','destination':{'url':base+'#'+page},'wait_until':'domcontentloaded','timeout_ms':10000},{'step_id':f'ready-{index}','action':'wait_for_timeout','duration_ms':250}])
    actions.append({'step_id':'final-ready','action':'wait_for','locator':{'kind':'css','selector':'.home-page'},'state':'visible','timeout_ms':10000})
    scenario={'browser':{'mode':'launch','executable_path':'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','headless':True},'start_url':{'url':base},'environment':{'locale':'zh-CN','timezone':'Asia/Shanghai'},'actions':actions,'secrets':[{'secret_id':'qa-user','environment_variable':'ERP_QA_USER'},{'secret_id':'qa-password','environment_variable':'ERP_QA_PASSWORD'}],'capture':{'after_each_step':['dom'],'at_end':['url','dom','screenshot'],'events':['page-errors','console','network']}}
    scenario_path=OUT/'rea-browser-scenario.json'
    scenario_path.write_text(json.dumps(scenario,ensure_ascii=False,indent=2),encoding='utf-8')
    env={**os.environ,'ERP_QA_USER':os.environ.get('ERP_QA_USER','admin'),'ERP_QA_PASSWORD':os.environ.get('ERP_QA_PASSWORD','admin')}
    process=subprocess.Popen([shutil.which('npx.cmd'),'--yes','rea-agents@6.4.0','capture-browser-scenario',str(scenario_path),'--format','json'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,cwd=ROOT)
    try:
        stdout,stderr=process.communicate(timeout=150)
    except subprocess.TimeoutExpired:
        # On Windows killing only npx.cmd leaves the Node grandchildren holding these pipes.
        if os.name=='nt':
            subprocess.run(['taskkill','/PID',str(process.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False)
        else:
            process.kill()
        stdout,stderr=process.communicate(timeout=15)
        (OUT/'rea-browser.partial.log').write_bytes(stdout+stderr)
        (OUT/'summary.json').write_text(json.dumps({'tool':'REA 6.4.0 capture-browser-scenario','status':'timed-out','verified':False,'reason':'Browser scenario evidence export did not complete within 150 seconds. Independent UI and business tests are recorded separately.'},indent=2),encoding='utf-8')
        print('REA browser evidence timed out; owned process tree stopped. This is not a passing verification.')
        raise SystemExit(1)
    (OUT/'rea-browser-evidence.json').write_bytes(stdout)
    (OUT/'rea-browser.log').write_bytes(stderr)
    if not stdout:
        print('REA returned no evidence:',stderr.decode('utf-8',errors='replace')[-1200:])
        raise SystemExit(1)
    evidence=json.loads(stdout)
    value=evidence.get('normalized_result',evidence)
    print('REA exit code:',process.returncode)
    print('Result keys:',list(value) if isinstance(value,dict) else type(value).__name__)
    if 'steps' not in value:
        print(json.dumps(value,ensure_ascii=False)[:2200])
        raise SystemExit(1)
    failed=[{'step':s['step_id'],'error':s.get('error')} for s in value['steps'] if s['status']!='completed']
    errors=[e for e in value['events']['items'] if e['kind']=='page-error' or (e['kind']=='response' and e.get('status',200)>=500)]
    summary={'tool':'REA 6.4.0 capture-browser-scenario','pages':pages,'steps':len(value['steps']),'failed_steps':failed,'page_or_server_errors':errors,'completeness':value['completeness'],'evidence_id':evidence.get('evidence_id')}
    (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    screenshot=value['steps'][-1]['artifacts']['screenshot']
    if screenshot['state']=='captured':
        artifact=screenshot['value']
        binary=base64.b64decode(artifact['data_base64'])
        assert hashlib.sha256(binary).hexdigest()==artifact['sha256']
        (OUT/'dashboard.png').write_bytes(binary)
        print('Dashboard screenshot saved and SHA-256 verified')
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    if failed or errors:
        raise SystemExit(1)

if __name__=='__main__':
    main()
