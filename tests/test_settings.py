import json,re,time,uuid
from pathlib import Path
from email import message_from_string
from email.policy import default

def test_registration_setting_is_scoped_and_new_accounts_remain_agents(ecosystem):
    call=ecosystem['request']; users=ecosystem['users']; token=users['outsider']['token']; admin=users['admin']['token']; agent=users['agent']['token']
    assert call('GET',8080,'/api/user/settings',token=agent)[0]==403
    assert call('PUT',8080,'/api/user/settings',{'autoApprove':True},agent)[0]==403
    original=call('GET',8080,'/api/user/settings',token=token)[1]
    other=call('GET',8080,'/api/user/settings',token=admin)[1]
    try:
        assert call('PUT',8080,'/api/user/settings',{'autoApprove':True},token)[0]==200
        assert call('GET',8080,'/api/user/settings',token=token)[1]=={'autoApprove':True}
        assert call('GET',8080,'/api/user/settings',token=admin)[1]==other
        email=f'auto-{uuid.uuid4().hex[:8]}@inteliagent.local'
        assert call('POST',8080,'/api/user/sendEmail',{'email':email})[0]==200
        code=None; path=Path(__file__).resolve().parents[1]/'.local/mailbox.json'
        for _ in range(60):
            if path.exists():
                for message in reversed(json.loads(path.read_text(encoding='utf-8'))):
                    if email in message['to']:
                        match=re.search(r'\b[0-9]{6}\b',message_from_string(message['content'],policy=default).get_content())
                        if match:code=match.group();break
            if code:break
            time.sleep(.1)
        assert code
        registration={'nome':'Cadastro automático de teste','email':email,'senha':'strong-test-password-2026','idCede':users['outsider']['idCede'],'codigoEmail':code,'role':'ADMIN'}
        assert call('POST',8080,'/api/user/validateCodeUserRegister',registration)[0]==200
        assert call('POST',8080,'/api/user/register',registration)[0]==201
        status,created=call('POST',8080,'/api/user/login',registration)
        assert status==200 and created['role']=='AGENT'
    finally:
        assert call('PUT',8080,'/api/user/settings',original,token)[0]==200
