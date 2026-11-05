import base64
import sys
import uuid
from pathlib import Path
import pytest

def test_unauthenticated_requests_and_forged_tokens_are_rejected(ecosystem):
    call=ecosystem['request']
    for port,path in [(8070,'/api/planejamento-list'),(8090,'/api/consumer/1'),(8080,'/api/approvals'),(5000,'/users')]:
        assert call('GET',port,path)[0] == 401
        assert call('GET',port,path,token='forged.invalid.token')[0] == 401

def test_legacy_password_upgraded_and_not_exposed(ecosystem):
    cur=ecosystem['cursor']
    cur.execute('SELECT senha FROM usuario WHERE email=%s',('admin@inteliagent.local',))
    assert bytes(cur.fetchone()['senha']).startswith(b'$2')

def test_planning_tenant_scope_and_sync_contract(ecosystem):
    call=ecosystem['request'];users=ecosystem['users']
    admin=users['admin']['token'];agent=users['agent']['token'];outsider=users['outsider']['token']
    status,plan=call('POST',8070,'/api/planejamento/salvar',{'uuid':'0','nomeRegiao':'Região de integração','zona':'Norte','situacao':2},admin)
    assert status == 200,plan
    plan_id=plan['uuid']
    assert call('POST',8070,'/api/planejamento/salvar',{'uuid':plan_id,'nomeRegiao':'Ataque','zona':'x','situacao':1},agent)[0] == 403
    assert call('GET',8070,f'/api/find-by-uuid/{plan_id}',token=outsider)[0] == 404
    assert call('POST',8070,'/api/planejamento/salvar',{'uuid':plan_id,'nomeRegiao':'Ataque','zona':'x','situacao':1},outsider)[0] == 403
    assert call('GET',8090,f"/api/consumer/{users['admin']['id']}",token=agent)[0] == 403
    assert call('POST',8090,'/api/sync',[{'id':'x','tabela':'usuario','sql':'DROP TABLE usuario'}],agent)[0] == 400
    visit_id=str(uuid.uuid4())
    record={'mutationId':str(uuid.uuid4()),'baseVersion':0,'id':visit_id,'tabela':'VISITA','values':{'ID':visit_id,'ID_PLANEJAMENTO':plan_id,'NOME':"D'Ávila; --",'SITUACAO':1}}
    status,result=call('POST',8090,'/api/sync',[record],agent)
    assert status == 200,result
    assert result['confirmedIds'] == [f'VISITA:{visit_id}']
    assert call('POST',8090,'/api/sync',[record],outsider)[0] == 403
    assert call('POST',8090,'/api/sync',[record],agent)[0] == 200
    status,loads=call('GET',8090,f"/api/consumer/{users['agent']['id']}",token=agent)
    assert status == 200,loads
    visits=next(item['rows'] for item in loads['consumerLoadsList'] if item['tableName']=='VISITA')
    while any(item['hasMore'] for item in loads['consumerLoadsList']):
        status,loads=call('GET',8090,f"/api/consumer/{users['agent']['id']}?offset={loads['nextOffset']}&downloadId={loads['downloadId']}",token=agent)
        assert status==200,loads
        visits+=next(item['rows'] for item in loads['consumerLoadsList'] if item['tableName']=='VISITA')
    assert any(v['ID']==visit_id and v['NOME']=="D'Ávila; --" for v in visits)
    assert 'data' not in next(item for item in loads['consumerLoadsList'] if item['tableName']=='VISITA')
    # An invalid second row must roll back the entire batch.
    atomic=str(uuid.uuid4())
    first={'mutationId':str(uuid.uuid4()),'baseVersion':0,'id':atomic,'tabela':'VISITA','values':{'ID':atomic,'ID_PLANEJAMENTO':plan_id,'SITUACAO':1}}
    assert call('POST',8090,'/api/sync',[first,{'id':'invalid','tabela':'usuario','values':{'ID':'invalid'}}],agent)[0] == 400
    ecosystem['cursor'].execute('SELECT COUNT(*) AS count FROM visita WHERE id=%s',(atomic,))
    assert ecosystem['cursor'].fetchone()['count'] == 0
    # The acknowledgement accepts only a completed server-issued snapshot.
    tables = [item['tableName'] for item in loads['consumerLoadsList']]
    assert call('POST',8090,f"/api/consumer-confirm/{users['agent']['id']}?downloadId=forged",tables,agent)[0] == 400
    assert call('POST',8090,f"/api/consumer-confirm/{users['agent']['id']}?downloadId={loads['downloadId']}",tables,agent)[0] == 200

def test_metrics_and_route_solver(ecosystem):
    call=ecosystem['request'];token=ecosystem['users']['admin']['token']
    for path in ['/api/visitas-por-dia','/api/visitas-por-regiao','/api/ultimas-visitas','/usuario-location']:
        status,result=call('GET',8070,path,token=token)
        assert status == 200,(path,result)
        assert isinstance(result,list)
    status,result=call('POST',8070,'/api/optimize-route',[{'id':1,'lat':-24.95,'lng':-53.45},{'id':2,'lat':-24.96,'lng':-53.46}],token)
    assert status == 200,result
    assert len(result)==2
    assert call('POST',8070,'/api/optimize-route',[{'id':1,'lat':999,'lng':0},{'id':2,'lat':0,'lng':0}],token)[0] == 400

def test_chat_identity_and_room_isolation(ecosystem,monkeypatch):
    import json
    config = json.loads((Path(__file__).resolve().parents[1]/'.local/runtime.json').read_text())
    for name,value in config.items():
        if isinstance(value,str): monkeypatch.setenv(name,value)
    if config.get('SERVICE_DATABASES',{}).get('chat'):
        monkeypatch.setenv('DB_USER',config['SERVICE_DATABASES']['chat']['user'])
        monkeypatch.setenv('DB_PASSWORD',config['SERVICE_DATABASES']['chat']['password'])
    sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'inteliagent-chat'))
    import server
    clients={name:server.socketio.test_client(server.app,auth={'token':user['token']}) for name,user in ecosystem['users'].items()}
    assert all(client.is_connected() for client in clients.values())
    assert not server.socketio.test_client(server.app,auth={'token':'fake'}).is_connected()
    users=ecosystem['users']
    result=clients['agent'].emit('send_message',{'sender':users['outsider']['id'],'recipient':users['colleague']['id'],'text':'Conversa privada'},callback=True)
    assert result['success']
    for name in ['agent','colleague']:
        events=clients[name].get_received()
        message=next(event['args'][0] for event in events if event['name']=='receive_message')
        assert message['sender']==users['agent']['id']
        assert message['text']=='Conversa privada'
    assert clients['admin'].get_received()==[]
    assert clients['outsider'].get_received()==[]
    assert not clients['agent'].emit('send_message',{'recipient':users['outsider']['id'],'text':'Não autorizado'},callback=True)['success']
    assert not clients['agent'].emit('load_messages',{'id':users['outsider']['id']},callback=True)['success']
    assert clients['agent'].emit('load_messages',{'recipient':users['colleague']['id']},callback=True)['success']
    for client in clients.values(): client.disconnect()

def test_registration_approval_and_password_reset_revocation(ecosystem):
    import json, re, time
    from email import message_from_string
    from email.policy import default
    root=Path(__file__).resolve().parents[1]
    call=ecosystem['request']; admin=ecosystem['users']['admin']; token=admin['token']
    def code_for(email, since=0):
        for _ in range(50):
            path=root/'.local/mailbox.json'
            if path.exists():
                messages=json.loads(path.read_text(encoding='utf-8'))
                for message in reversed(messages[since:]):
                    if email in message['to']:
                        mail=message_from_string(message['content'],policy=default)
                        match=re.search(r'\b[0-9]{6}\b',mail.get_content())
                        if match:return match.group()
            time.sleep(.1)
        raise AssertionError('Local SMTP did not capture the expected verification email')
    email=f'register-{uuid.uuid4().hex[:8]}@inteliagent.local'
    assert call('POST',8080,'/api/user/sendEmail',{'email':email})[0] == 200
    code=code_for(email)
    registration={'nome':'Novo agente','email':email,'senha':'strong-test-password-2026','idCede':admin['idCede'],'codigoEmail':code,'role':'ADMIN'}
    assert call('POST',8080,'/api/user/validateCodeUserRegister',registration)[0] == 200
    assert call('POST',8080,'/api/user/register',registration)[0] == 201
    assert call('POST',8080,'/api/user/login',registration)[0] == 401
    status,pending=call('GET',8080,'/api/approvals',token=token)
    assert status==200
    created=next(row for row in pending if row['email']==email)
    assert call('POST',8080,f"/api/approvals/{created['id']}",{'approved':True},token)[0] == 200
    status,new_user=call('POST',8080,'/api/user/login',registration)
    assert status==200 and new_user['role']=='AGENT'
    assert call('POST',8080,'/api/user/password/request',{'email':'nonexistent@inteliagent.local'})[0] == 202
    mailbox=root/'.local/mailbox.json'
    before=len(json.loads(mailbox.read_text(encoding='utf-8'))) if mailbox.exists() else 0
    assert call('POST',8080,'/api/user/password/request',{'email':admin['email']})[0] == 202
    reset_code=code_for(admin['email'], before)
    # Changing to the same password still revokes every previously issued access token.
    password=json.loads((root/'.local/demo.json').read_text())['password']
    assert call('POST',8080,'/api/user/password/reset',{'email':admin['email'],'code':reset_code,'password':password})[0] == 204
    assert call('GET',8070,'/api/planejamento-list',token=token)[0] == 401
    assert call('GET',8090,f"/api/consumer/{admin['id']}",token=token)[0] == 401
    assert call('GET',5000,'/users',token=token)[0] == 401
    # Later integration cases use a fresh authenticated session after revocation.
    status,fresh=call('POST',8080,'/api/user/login',{'email':admin['email'],'senha':password})
    assert status==200
    ecosystem['users']['admin']=fresh
