"""Start/stop only the processes owned by this local workspace."""
import ipaddress, json, os, subprocess, sys, time, urllib.request, urllib.error
from pathlib import Path
ROOT=Path(__file__).parent
STATE=ROOT/'.local/processes.json'
CHILDREN={}
def environment():
    config=json.loads((ROOT/'.local/runtime.json').read_text())
    values={**os.environ,**{k:v for k,v in config.items() if isinstance(v,str) and k!='MYSQL_ROOT_PASSWORD'},'DEBUG':'false','HOST':'127.0.0.1','SERVER_ADDRESS':'127.0.0.1'}
    values.pop('MYSQL_ROOT_PASSWORD',None)
    return values

def public_environment(base):
    return {key:value for key,value in base.items() if not key.startswith(('DB_','MYSQL_','JWT_','SMTP_')) and key not in ('VAPID_PRIVATE_KEY','EXPO_ACCESS_TOKEN')}
def service_environment(base,name):
    config=json.loads((ROOT/'.local/runtime.json').read_text())
    credentials=config.get('SERVICE_DATABASES',{}).get(name)
    return {**base,**({'DB_USER':credentials['user'],'DB_PASSWORD':credentials['password']} if credentials else {})}
def launch(label,args,cwd,env):
    log=open(ROOT/f'.local/{label}.log','w',encoding='utf-8')
    process=subprocess.Popen(args,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    CHILDREN[process.pid]=process
    return {'pid':process.pid,'label':label}
def process_records(value):
    """Accept old PowerShell-wrapped state without losing owned process IDs."""
    if isinstance(value,list):
        return [record for item in value for record in process_records(item)]
    if isinstance(value,dict):
        if 'pid' in value and 'label' in value: return [value]
        return process_records(value.get('value',[]))
    return []

def start(lan_host=None):
    if STATE.exists():
        raise SystemExit('Process state exists. Run python runtime.py stop before restarting.')
    env=environment()
    if lan_host:
        ipaddress.IPv4Address(lan_host)
        env['CORS_ORIGINS']=','.join(dict.fromkeys([*env.get('CORS_ORIGINS','http://localhost:5173').split(','),f'http://{lan_host}:5173']))
        env.update(VITE_USE_API_PROXY='true',VITE_AUTH_URL=f'http://{lan_host}:5173',VITE_MAIN_URL=f'http://{lan_host}:5173',VITE_CHAT_URL=f'http://{lan_host}:5173')
    processes=[]
    processes.append(launch('mail',[str(ROOT/'inteliagent-chat/.venv/Scripts/python.exe'),str(ROOT/'local_mail.py')],ROOT,public_environment(env)))
    for name in ['auth','main-server','load-server']:
        jar=next((ROOT/f'inteliagent-{name}/target').glob('*-SNAPSHOT.jar'))
        processes.append(launch(name,['java','-jar',str(jar)],ROOT/f'inteliagent-{name}',service_environment(env,name)))
    processes.append(launch('chat',[str(ROOT/'inteliagent-chat/.venv/Scripts/python.exe'),'server.py'],ROOT/'inteliagent-chat',service_environment(env,'chat')))
    node=next((ROOT/'.tools').glob('node-*-win-x64/node.exe'))
    processes.append(launch('web',[str(node),'node_modules/vite/bin/vite.js','--host','0.0.0.0' if lan_host else '127.0.0.1','--port','5173','--strictPort'],ROOT/'inteliagent-webapp',public_environment(env)))
    STATE.write_text(json.dumps(processes,indent=2))
    pending={'auth':8080,'main-server':8070,'load-server':8090,'chat':5000,'web':5173}
    deadline=time.monotonic()+60
    print('Waiting for local services. Logs: .local/.',flush=True)
    while pending and time.monotonic()<deadline:
        if any(process.poll() is not None for process in CHILDREN.values()):
            raise SystemExit('An application exited during startup. Inspect .local/ logs; run runtime.py stop before retrying.')
        for name,port in list(pending.items()):
            path='/health' if name=='chat' else '/' if name=='web' else '/actuator/health'
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}',timeout=1) as response:
                    if response.status==200:pending.pop(name)
            except (OSError,urllib.error.URLError):pass
        if pending:time.sleep(.25)
    if pending:raise SystemExit('Services still unavailable: '+', '.join(pending)+'. Inspect .local/ logs.')
    print('Local services ready; dashboard: http://localhost:5173.')
def stop():
    if not STATE.exists(): return
    for item in process_records(json.loads(STATE.read_text())):
        # Verify command line before acting on a recycled PID.
        command=subprocess.run(['powershell','-NoProfile','-Command',f'(Get-CimInstance Win32_Process -Filter "ProcessId={item["pid"]}").CommandLine'],capture_output=True,text=True).stdout
        if str(ROOT).lower() in command.lower():
            subprocess.run(['taskkill','/PID',str(item['pid']),'/T','/F'],capture_output=True)
    STATE.unlink()
    print('Owned application processes stopped. Isolated database retained.')
if __name__=='__main__':
    if sys.argv[1] == 'restart-chat':
        records=json.loads(STATE.read_text())
        old=next(item for item in records if item['label']=='chat')
        command=subprocess.run(['powershell','-NoProfile','-Command',f'(Get-CimInstance Win32_Process -Filter "ProcessId={old["pid"]}").CommandLine'],capture_output=True,text=True).stdout
        if str(ROOT).lower() in command.lower():
            subprocess.run(['taskkill','/PID',str(old['pid']),'/T','/F'],capture_output=True)
        replacement=launch('chat',[str(ROOT/'inteliagent-chat/.venv/Scripts/python.exe'),'server.py'],ROOT/'inteliagent-chat',service_environment(environment(),'chat'))
        STATE.write_text(json.dumps([replacement if item['label']=='chat' else item for item in records],indent=2))
        print('Chat restarted.')
    else:
        if sys.argv[1]=='start':
            start(sys.argv[3] if len(sys.argv)>3 and sys.argv[2]=='--lan' else None)
        else:
            {'stop':stop}[sys.argv[1]]()
