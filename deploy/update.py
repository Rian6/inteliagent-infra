#!/usr/bin/env python3
"""Pull only the current master commit after its CI workflow succeeds."""
import fcntl, json, pathlib, subprocess, urllib.request, os, gzip, datetime
ROOT=pathlib.Path('/opt/inteliagent')
os.chdir(ROOT)
lock=open('/run/lock/inteliagent-deploy.lock','w')
try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError: raise SystemExit(0)
def run(*args): return subprocess.check_output(args,text=True).strip()
repos=['auth','main-server','load-server','migration','chat','webapp']
def approved(repo,sha):
    request=urllib.request.Request(f'https://api.github.com/repos/Rian6/{repo}/actions/workflows/ci.yml/runs?branch=master&event=push&per_page=1',headers={'User-Agent':'Inteliagent-Deploy','Accept':'application/vnd.github+json'})
    try:
        runs=json.load(urllib.request.urlopen(request,timeout=30))['workflow_runs']
    except Exception as error:
        print(repo,'CI unavailable:',type(error).__name__); return False
    ok=bool(runs and runs[0]['head_sha']==sha and runs[0]['conclusion']=='success')
    if not ok: print(repo,'waiting for successful CI')
    return ok

# Read all targets before changing any checkout, so fetch failures cannot leave a partial deployment.
run('git','fetch','origin','master')
old_root=run('git','rev-parse','HEAD')
new_root=run('git','rev-parse','origin/master')
infra_changed=new_root!=old_root and approved('inteliagent-infra',new_root)
previous={};targets={}
for service in repos:
    repo='inteliagent-'+service
    run('git','-C',repo,'fetch','origin','master')
    sha=run('git','-C',repo,'rev-parse','origin/master')
    old=run('git','-C',repo,'rev-parse','HEAD'); previous[repo]=old
    if sha==old: continue
    if approved(repo,sha): targets[repo]=sha
if not targets and not infra_changed: raise SystemExit(0)
build_services=[repo.removeprefix('inteliagent-') for repo in targets]
if infra_changed: build_services.append('versions')
compose=['docker','compose','-f','deploy/compose.yaml']
try:
    if infra_changed: run('git','checkout','--detach',new_root)
    for repo,sha in targets.items(): run('git','-C',repo,'checkout','--detach',sha)
    # Sequential builds limit peak memory on the local server.
    for service in build_services: subprocess.run(compose+['build',service],check=True)
    backup_dir=pathlib.Path('.local/backups'); backup_dir.mkdir(mode=0o700,exist_ok=True)
    backup=backup_dir/(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.sql.gz')
    os.umask(0o077)
    with gzip.open(backup,'wb') as output:
        dump=subprocess.Popen(compose+['exec','-T','mysql','sh','-c','export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysqldump -uroot --single-transaction --routines --events --no-tablespaces inteliagent'],stdout=subprocess.PIPE)
        while chunk:=dump.stdout.read(1024*1024): output.write(chunk)
        if dump.wait()!=0: raise RuntimeError('Database backup failed; deploy cancelled')
    subprocess.run(compose+['up','-d','--force-recreate','migration'],check=True)
    subprocess.run(compose+['wait','migration'],check=True)
    subprocess.run(compose+['up','-d','--wait','--wait-timeout','240'],check=True)
    # Refresh Nginx upstream addresses after containers are recreated.
    subprocess.run(compose+['restart','webapp'],check=True)
    subprocess.run(compose+['up','-d','--no-deps','--wait','--wait-timeout','60','webapp'],check=True)
    # Every backend must respond successfully before accepting a deployment.
    for service,port in [('auth',8080),('main-server',8070),('load-server',8090)]:
        subprocess.run(compose+['exec','-T',service,'curl','--retry','20','--retry-all-errors','--retry-delay','3','-fsS',f'http://localhost:{port}/actuator/health'],check=True)
    subprocess.run(['python3','deploy/smoke.py'],check=True)
    state={r:run('git','-C',r,'rev-parse','HEAD') for r in previous}
    state['inteliagent-infra']=run('git','rev-parse','HEAD')
    pathlib.Path('.local/deployed.json').write_text(json.dumps(state,indent=2))
except Exception:
    if infra_changed: run('git','checkout','--detach',old_root)
    for repo in targets: run('git','-C',repo,'checkout','--detach',previous[repo])
    for service in build_services: subprocess.run(compose+['build',service],check=True)
    subprocess.run(compose+['up','-d','--wait','--wait-timeout','240'],check=True)
    subprocess.run(compose+['restart','webapp'],check=True)
    # Database schema changes are never reversed automatically.
    raise
