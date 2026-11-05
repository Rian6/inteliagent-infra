"""Read-only working tree and credential regression checks; never prints secret values."""
from pathlib import Path
import subprocess,json,hashlib,re
root=Path(__file__).parent
repos=sorted(root.glob('inteliagent-*'))
findings=[];report=[]
known_fingerprints={'c1888d6b5b309183e44935744bdd1f0deb3638a60e43d910cd3cb0a91385f68b', 'b29d7a76122dddddcd708176e69911b5ca76cbeea8036ff3deac59ee40a92735', '04db368f3941056bdea147ccbf9612cb3d2d74031687d302f83afe975869fcf8'}
for repo in repos:
    if not (repo/'.git').is_dir():continue
    status=subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True)
    staged=subprocess.check_output(['git','-C',str(repo),'diff','--cached','--name-only'],text=True)
    head=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
    files=subprocess.check_output(['git','-C',str(repo),'ls-files','-c','-o','--exclude-standard'],text=True).splitlines()
    for name in files:
        path=repo/name
        if not path.is_file() or path.suffix not in {'.js','.jsx','.mjs','.cjs','.ps1','.py','.xml','.properties','.sql','.json','.md','.gradle','.yaml','.yml'}:continue
        text=path.read_text(encoding='utf-8',errors='replace')
        if any(hashlib.sha256(token.encode()).hexdigest() in known_fingerprints for token in re.findall(r'[A-Za-z0-9_-]{8,64}',text)):findings.append(str(path.relative_to(root)))
    report.append({'repository':repo.name,'head':head,'changedFiles':len(status.splitlines()),'stagedFiles':len(staged.splitlines())})
result={'repositories':report,'knownCredentialLiteralsRemaining':findings}
(root/'.local/worktree-verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
if findings or any(repo['stagedFiles'] for repo in report):raise SystemExit(1)
