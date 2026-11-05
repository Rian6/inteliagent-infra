import json,sys,uuid
from pathlib import Path
import pytest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'inteliagent-chat'))
from chat import push

def test_push_outbox_is_transactional_and_message_replay_is_idempotent(ecosystem,monkeypatch):
    from contextlib import contextmanager
    from chat.repository import ChatRepository
    db=ecosystem['db'];cur=ecosystem['cursor'];users=ecosystem['users'];db.rollback()
    repo=ChatRepository()
    @contextmanager
    def transaction():
        yield db,cur
    monkeypatch.setattr(repo,'connection',transaction)
    agent=users['agent'];recipient=users['colleague'];device=str(uuid.uuid4())
    try:
        cur.execute('SELECT token_version,id_cede FROM usuario WHERE id=%s',(recipient['id'],));owner=cur.fetchone()
        cur.execute("""INSERT INTO chat_push_devices(id,user_id,id_cede,token_version,kind,token_hash,subscription)
            VALUES (%s,%s,%s,%s,'expo',%s,%s)""",(device,recipient['id'],owner['id_cede'],owner['token_version'],uuid.uuid4().hex*2,json.dumps('ExpoPushToken[transaction-never-committed]')))
        identity={'uid':agent['id'],'cede':owner['id_cede']}
        client_id=str(uuid.uuid4())
        message=repo.save_message(identity,recipient['id'],'Transactional notification',None,client_id)
        assert repo.save_message(identity,recipient['id'],'Transactional notification',None,client_id)==message
        cur.execute('SELECT COUNT(*) AS count FROM chat_push_outbox WHERE message_id=%s',(message,))
        assert cur.fetchone()['count']==1
        store=push.PushStore(repo);job=store.claim()
        assert job['message_id']==message and job['recipient']==recipient['id']
        store.finish(job,'SENT')
        cur.execute('SELECT state FROM chat_push_outbox WHERE message_id=%s',(message,))
        assert cur.fetchone()['state']=='SENT'
    finally:
        # The live worker cannot observe the device/job, and no test push is sent.
        db.rollback()

def test_push_subscription_validation_blocks_private_endpoints():
    with pytest.raises(ValueError): push.validate_subscription({'kind':'expo','token':'not-a-token'})
    for endpoint in ['http://127.0.0.1/private','https://127.0.0.1/private','https://fcm.googleapis.com.evil.test/private']:
        with pytest.raises(ValueError): push.validate_subscription({'kind':'web','subscription':{'endpoint':endpoint}})
    kind,value,digest=push.validate_subscription({'kind':'expo','token':'ExpoPushToken[synthetic-token-123456]'})
    assert kind=='expo' and len(digest)==64 and 'synthetic' in value

def test_push_worker_retries_without_resending_receipts_and_rejects_reassigned_accounts(monkeypatch):
    class Store:
        row={'active':1,'user_id':3,'recipient':3,'token_version':1,'current_version':1,'situacao':1,'situacao_aprovacao':1,'receipt_id':'ticket','attempts':1}
        def claim(self): return self.row
        def finish(self,*args): self.result=args
    store=Store()
    def unavailable(row): raise TimeoutError()
    monkeypatch.setattr(push,'deliver',unavailable)
    assert push.process_one(store)
    assert store.result[1:] == ('RECEIPT','ticket')
    store.row={**store.row,'user_id':4}
    assert push.process_one(store)
    assert store.result[1]=='SKIPPED'
    store.row={**store.row,'user_id':3,'current_version':2}
    assert push.process_one(store) and store.result[1]=='SKIPPED'

def test_expo_tickets_receipts_and_invalid_devices(monkeypatch):
    row={'subscription':json.dumps('ExpoPushToken[synthetic-token-123456]'),'kind':'expo','sender':2,'recipient':3,'message_id':123,'sender_name':'Agente','receipt_id':None}
    requests=[]
    def send(url,payload):
        requests.append((url,payload));return {'data':{'status':'ok','id':'ticket-123'}}
    monkeypatch.setattr(push,'expo_request',send)
    assert push.deliver(row)==('RECEIPT','ticket-123',False)
    assert requests[0][1]['data']['recipientId']==3
    assert requests[0][1]['priority']=='high'
    assert requests[0][1]['channelId']=='messages'
    assert 'text' not in requests[0][1]['data'] and 'attachment' not in requests[0][1]['data']
    monkeypatch.setattr(push,'expo_request',lambda *_:{'data':{'ticket-123':{'status':'error','details':{'error':'DeviceNotRegistered'}}}})
    assert push.deliver({**row,'receipt_id':'ticket-123'})==('FAILED',None,True)
    monkeypatch.setattr(push,'expo_request',lambda *_:{'data':{'ticket-123':{'status':'ok'}}})
    assert push.deliver({**row,'receipt_id':'ticket-123'})==('SENT',None,False)

def test_web_push_payload_and_expired_subscription(monkeypatch):
    import pywebpush
    from unittest.mock import Mock
    monkeypatch.setenv('VAPID_PRIVATE_KEY','test-key')
    monkeypatch.setenv('VAPID_SUBJECT','mailto:test@example.com')
    row={'subscription':json.dumps({'endpoint':'https://fcm.googleapis.com/fcm/send/test','keys':{}}),'kind':'web','sender':2,'recipient':3,'message_id':123,'sender_name':'Agente','receipt_id':None}
    send=Mock();monkeypatch.setattr(pywebpush,'webpush',send)
    assert push.deliver(row)==('SENT',None,False)
    assert json.loads(send.call_args.kwargs['data'])['data']['recipientId']==3
    response=Mock();response.status_code=410
    send.side_effect=pywebpush.WebPushException('expired',response=response)
    assert push.deliver(row)==('FAILED',None,True)

def test_push_registration_is_scoped_to_authenticated_user(ecosystem,monkeypatch):
    config=json.loads((ROOT/'.local/runtime.json').read_text())
    for key in ['JWT_SECRET','DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD']: monkeypatch.setenv(key,config[key])
    import server
    from chat.repository import ChatRepository
    monkeypatch.setattr(server,'repository',ChatRepository())
    client=server.app.test_client();users=ecosystem['users'];device=str(uuid.uuid4())
    headers=lambda role:{'Authorization':'Bearer '+users[role]['token']}
    data={'kind':'expo','token':'ExpoPushToken[registration-only-no-send]','userId':users['agent']['id']}
    path='/push/devices/'+device
    try:
        assert client.put(path,json=data).status_code==401
        assert client.put(path,json={**data,'userId':users['colleague']['id']},headers=headers('agent')).status_code==400
        assert client.put(path,json=data,headers=headers('agent')).status_code==200
        assert client.delete(path,headers=headers('outsider')).status_code==200
        with server.repository.connection() as (_,cur):
            cur.execute('SELECT user_id,active FROM chat_push_devices WHERE id=%s',(device,));saved=cur.fetchone()
        assert saved['user_id']==users['agent']['id'] and saved['active']==1
        assert client.delete(path,headers=headers('agent')).status_code==200
        with server.repository.connection() as (_,cur):
            cur.execute('SELECT active FROM chat_push_devices WHERE id=%s',(device,));assert cur.fetchone()['active']==0
    finally:
        ecosystem['cursor'].execute('DELETE FROM chat_push_devices WHERE id=%s',(device,));ecosystem['db'].commit()
