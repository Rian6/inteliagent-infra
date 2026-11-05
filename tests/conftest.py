import base64
import hashlib
import json
import secrets
import sys
import urllib.request
import urllib.error
from pathlib import Path
import mysql.connector
import pytest

ROOT = Path(__file__).resolve().parents[1]

def request(method, port, path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(f'http://127.0.0.1:{port}{path}', data=body, headers=headers, method=method)
    try: response = urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError as error: response = error
    raw = response.read()
    try: result = json.loads(raw) if raw else None
    except ValueError: result = raw.decode()
    return response.status, result

@pytest.fixture(scope='session')
def ecosystem():
    config = json.loads((ROOT/'.local/runtime.json').read_text())
    assert config['DB_PORT'] == '3308', 'Run integration checks only against the isolated workspace database'
    db = mysql.connector.connect(host='127.0.0.1', port=3308, database='inteliagent', user=config['DB_USER'], password=config['DB_PASSWORD'])
    cur = db.cursor(dictionary=True)
    demo = ROOT/'.local/demo.json'
    credentials = json.loads(demo.read_text()) if demo.exists() else {'password': secrets.token_urlsafe(18)}
    cur.execute("INSERT INTO cede (codigo,nome) SELECT 64001,'Sede de demonstração' WHERE NOT EXISTS (SELECT 1 FROM cede WHERE codigo=64001)")
    cur.execute("INSERT INTO cede (codigo,nome) SELECT 64002,'Outra sede de teste' WHERE NOT EXISTS (SELECT 1 FROM cede WHERE codigo=64002)")
    cur.execute('SELECT id,codigo FROM cede WHERE codigo IN (64001,64002)')
    cedes = {row['codigo']: row['id'] for row in cur.fetchall()}
    for name, role, code in [('admin','ADMIN',64001), ('agent','AGENT',64001), ('colleague','AGENT',64001), ('outsider','ADMIN',64002)]:
        email = f'{name}@inteliagent.local'
        cur.execute('SELECT id FROM usuario WHERE email=%s', (email,))
        if not cur.fetchone():
            cur.execute('INSERT INTO usuario (nome,email,senha,id_cede,codigo_email,situacao_aprovacao,role) VALUES (%s,%s,%s,%s,1,1,%s)', (name.title(),email,hashlib.sha256(credentials['password'].encode()).digest(),cedes[code],role))
    db.commit()
    users={}
    for name in ['admin','agent','colleague','outsider']:
        status, body = request('POST',8080,'/api/user/login',{'email':f'{name}@inteliagent.local','senha':credentials['password']})
        assert status == 200, (status,body)
        assert body['token'] and 'senha' not in body and 'securityPassword' not in body and 'codigoEmail' not in body
        users[name]=body
    credentials.update({'email':'admin@inteliagent.local','agentEmail':'agent@inteliagent.local'})
    demo.write_text(json.dumps(credentials,indent=2))
    yield {'users':users,'db':db,'cursor':cur,'request':request}
    cur.close();db.close()
