"""Transport and resource-lifecycle tests for the private chat service."""
import sys
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import Mock

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'inteliagent-chat'))

def test_database_resources_close_when_cursor_creation_or_query_fails():
    from chat.repository import ChatRepository
    repo=ChatRepository()
    connection=Mock();connection.cursor.side_effect=RuntimeError('cursor unavailable')
    pool=Mock();pool.get_connection.return_value=connection
    repo._pool=pool
    try:
        with repo.connection():pass
    except RuntimeError:pass
    else:raise AssertionError('Cursor creation must fail')
    connection.rollback.assert_called_once();connection.close.assert_called_once()
    connection.reset_mock();cursor=Mock();connection.cursor.side_effect=None;connection.cursor.return_value=cursor
    cursor.execute.side_effect=RuntimeError('query failed')
    try:repo.save(1,2,'message')
    except RuntimeError:pass
    else:raise AssertionError('Failed query must roll back')
    connection.rollback.assert_called_once();cursor.close.assert_called_once();connection.close.assert_called_once()


def test_socket_errors_are_private_and_sessions_are_rechecked(ecosystem,monkeypatch):
    import json,os
    config=json.loads((ROOT/'.local/runtime.json').read_text())
    monkeypatch.setenv('JWT_SECRET',config['JWT_SECRET'])
    import server
    identities=server.identities.copy();rates=server._rates.copy()
    class FakeRepository:
        allowed=True
        fail=False
        sends=0
        def active(self,claims):return self.allowed
        def can_contact(self,cede,recipient):return recipient==ecosystem['users']['colleague']['id']
        def save(self,sender,recipient,text):
            self.sends+=1
            if self.fail:raise RuntimeError('private database detail')
            return 42
    fake=FakeRepository();monkeypatch.setattr(server,'repository',fake)
    agent=server.socketio.test_client(server.app,auth={'token':ecosystem['users']['agent']['token']})
    colleague=server.socketio.test_client(server.app,auth={'token':ecosystem['users']['colleague']['token']})
    try:
        assert agent.is_connected() and colleague.is_connected()
        recipient=ecosystem['users']['colleague']['id']
        assert not agent.emit('send_message',{'recipient':recipient,'text':'x'*4001},callback=True)['success']
        assert fake.sends==0
        fake.fail=True
        response=agent.emit('send_message',{'recipient':recipient,'text':'valid message'},callback=True)
        assert response['success'] is False and 'private database detail' not in str(response)
        fake.fail=False;fake.allowed=False
        result=agent.emit('send_message',{'recipient':recipient,'text':'revoked'},callback=True)
        assert not result or not result['success']
        assert fake.sends==1
    finally:
        if agent.is_connected():agent.disconnect()
        if colleague.is_connected():colleague.disconnect()
        server.identities.clear();server.identities.update(identities)
        server._rates.clear();server._rates.update(rates)
