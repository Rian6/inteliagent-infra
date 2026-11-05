"""Query OSV using only public Maven dependency coordinates; no source or secrets leave the workspace."""
import json,re,urllib.request
from pathlib import Path
ROOT=Path(__file__).parent
packages=set()
for path in (ROOT/'.local').glob('dependencies-*.txt'):
    for line in path.read_text(encoding='utf-8').splitlines():
        match=re.match(r'\s*([\w.\-]+):([\w.\-]+):jar:(?:[^:\s]+:)?([^:\s]+):(compile|runtime|provided)\b',line)
        if match:
            group,artifact,version,_=match.groups()
            if not group.startswith('com.inteliagent'):packages.add((group+':'+artifact,version))
ordered=sorted(packages)
findings=[]
for start in range(0,len(ordered),50):
    batch=ordered[start:start+50]
    payload={'queries':[{'package':{'name':name,'ecosystem':'Maven'},'version':version} for name,version in batch]}
    request=urllib.request.Request('https://api.osv.dev/v1/querybatch',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=60) as response: results=json.load(response)['results']
    for (name,version),result in zip(batch,results):
        if result.get('vulns'):findings.append({'package':name,'version':version,'advisories':[v['id'] for v in result['vulns']]})
report={'ecosystem':'Maven','packagesChecked':len(ordered),'findings':findings}
(ROOT/'.local/maven-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
