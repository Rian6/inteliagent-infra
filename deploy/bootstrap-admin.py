#!/usr/bin/env python3
"""Create the first production administrator without publishing its password."""
import argparse
import bcrypt
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import urllib.request

parser=argparse.ArgumentParser()
parser.add_argument('--email',required=True)
parser.add_argument('--name',default='Administrador')
parser.add_argument('--sede',default='Inteliagent')
args=parser.parse_args()
if not re.fullmatch(r'[^\s@\x27]+@[^\s@\x27]+\.[^\s@\x27]+',args.email):
    raise SystemExit('Invalid administrator email')
os.chdir(Path(__file__).resolve().parents[1])
target=Path('.local/production-admin.json')
if target.exists(): raise SystemExit('Administrator credentials already exist; refusing to replace them')
command=['docker','compose','-f','deploy/compose.yaml','exec','-T','mysql','sh','-c','export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysql -uroot -N inteliagent']
count=subprocess.check_output(command,input='SELECT COUNT(*) FROM usuario;\n',text=True).strip()
if count!='0': raise SystemExit('Database already contains users; bootstrap is only allowed on an empty user table')
password=secrets.token_urlsafe(32)
hashed=bcrypt.hashpw(password.encode(),bcrypt.gensalt(rounds=12)).hex()
code=secrets.randbelow(900000)+100000
def sql_string(value): return "'"+value.replace('\\','\\\\').replace("'","''")+"'"
sql=f'''START TRANSACTION;
INSERT INTO cede (codigo,nome) VALUES ({code},{sql_string(args.sede)});
SET @cede=LAST_INSERT_ID();
INSERT INTO usuario (nome,email,senha,id_cede,codigo_email,situacao_aprovacao,situacao,role)
VALUES ({sql_string(args.name)},{sql_string(args.email)},UNHEX('{hashed}'),@cede,'',1,1,'ADMIN');
COMMIT;
'''
os.umask(0o077)
# Save the random password before inserting, so a connection failure cannot lose it.
target.write_text(json.dumps({'email':args.email,'password':password,'sedeCode':code},indent=2))
subprocess.run(command,input=sql,text=True,check=True)
request=urllib.request.Request('http://127.0.0.1:8180/api/user/login',data=json.dumps({'email':args.email,'senha':password}).encode(),headers={'Content-Type':'application/json'},method='POST')
with urllib.request.urlopen(request,timeout=30) as response:
    identity=json.load(response)
    if not identity.get('token'): raise SystemExit('Administrator login verification failed')
print('Administrator created and login verified. Credentials are in .local/production-admin.json (mode 600).')
