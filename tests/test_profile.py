import base64,io,json,urllib.request,urllib.error
from conftest import request

PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
def upload(token,content=PNG,mime='image/png',path='/api/user/me/photo'):
    boundary='inteliagent-profile-test'
    body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="foto.png"\r\nContent-Type: {mime}\r\n\r\n'.encode()+content+f'\r\n--{boundary}--\r\n'.encode())
    req=urllib.request.Request('http://127.0.0.1:8080'+path,data=body,method='PUT',headers={'Authorization':'Bearer '+token,'Content-Type':'multipart/form-data; boundary='+boundary})
    try:response=urllib.request.urlopen(req,timeout=20)
    except urllib.error.HTTPError as error:response=error
    return response.status,json.loads(response.read())

def test_own_profile_photo_normalization_persistence_and_isolation(ecosystem):
    users=ecosystem['users']
    assert request('GET',8080,'/api/user/me')[0]==401
    for role in ['agent','admin']:
        user=users[role];token=user['token']
        status,profile=request('GET',8080,'/api/user/me',token=token)
        assert status==200 and profile['id']==user['id'] and profile['email']==user['email']
        assert all(key not in profile for key in ['senha','token','refreshToken','securityPassword','codigoEmail'])
        assert profile['codigoSede']==64001
        assert upload(token,b'<svg onload="alert(1)"></svg>','image/png')[0]==400
        assert upload(token,b'x'*1500001)[0]==400
        status,saved=upload(token)
        assert status==200 and saved['foto'].startswith('data:image/jpeg;base64,')
        assert base64.b64decode(saved['foto'].split(',')[1]).startswith(b'\xff\xd8')
        again=request('GET',8080,'/api/user/me',token=token)[1]
        assert again['foto']==saved['foto']
        other=request('GET',8080,'/api/user/me',token=users['colleague']['token'])[1]
        assert other['id']!=saved['id'] and other['foto']!=saved['foto']
        assert upload(token,path=f'/api/user/{users["colleague"]["id"]}/photo')[0] in (404,405)
        assert upload(token)[0]==200
        status,removed=request('DELETE',8080,'/api/user/me/photo',token=token)
        assert status==200 and removed['foto'] is None
        assert request('GET',8080,'/api/user/me',token=token)[1]['foto'] is None
