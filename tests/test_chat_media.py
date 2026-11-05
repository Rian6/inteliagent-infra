import base64,io,uuid,wave
from pathlib import Path

def test_private_attachments_emoji_delivery_history_and_retries(ecosystem,monkeypatch,tmp_path):
    import json,sys
    root=Path(__file__).resolve().parents[1]
    config=json.loads((root/'.local/runtime.json').read_text())
    for key in ['JWT_SECRET','DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD']:
        monkeypatch.setenv(key,config[key])
    monkeypatch.setenv('CHAT_UPLOAD_DIR',str(tmp_path))
    sys.path.insert(0,str(root/'inteliagent-chat'))
    import server
    from chat.repository import ChatRepository
    monkeypatch.setattr(server,'repository',ChatRepository())
    agent=ecosystem['users']['agent'];colleague=ecosystem['users']['colleague'];outsider=ecosystem['users']['outsider'];admin=ecosystem['users']['admin']
    client=server.app.test_client()
    headers=lambda user:{'Authorization':'Bearer '+user['token']}
    image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAZElEQVR4nO3PUQkAIBTAwBfEjCY2jCH8OITBAtxm7fN1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY8dgGvNcjx+m6bbAAAAABJRU5ErkJggg==')
    def upload(data,name,mime,user=agent,recipient=None):
        return client.post('/attachments',headers=headers(user),data={'recipient':str(recipient or colleague['id']),'file':(io.BytesIO(data),name,mime)},content_type='multipart/form-data')
    assert client.post('/attachments').status_code==401
    assert upload(image,'imagem.png','image/png',recipient=outsider['id']).status_code==403
    assert upload(b'<script>invalid</script>','foto.jpg','image/jpeg').status_code==400
    assert upload(b'\x89PNG\r\n\x1a\n'+b'x'*(8*1024*1024),'large.png','image/png').status_code==413
    uploaded=upload(image,'imagem.png','image/png');assert uploaded.status_code==201
    attachment=uploaded.json;assert attachment['kind']=='image'
    url=attachment['url']
    assert client.get(url).status_code==401
    assert client.get(url,headers=headers(outsider)).status_code==404
    assert client.get(url,headers=headers(admin)).status_code==404
    response=client.get(url,headers=headers(colleague));assert response.status_code==200 and response.data==image
    assert response.headers['Cache-Control'].startswith('private')
    stream=io.BytesIO()
    with wave.open(stream,'wb') as output:output.setnchannels(1);output.setsampwidth(2);output.setframerate(8000);output.writeframes(b'\0\0'*8000)
    audio=upload(stream.getvalue(),'voz.wav','audio/wav');assert audio.status_code==201 and audio.json['kind']=='audio'
    assert client.get(audio.json['url'],headers={**headers(colleague),'Range':'bytes=0-9'}).status_code==206
    a=server.socketio.test_client(server.app,auth={'token':agent['token']});b=server.socketio.test_client(server.app,auth={'token':colleague['token']})
    try:
        payload={'recipient':colleague['id'],'text':'Tudo certo 👍 🦟','attachmentId':attachment['id'],'clientId':str(uuid.uuid4())}
        sent=a.emit('send_message',payload,callback=True);assert sent['success']
        replay=a.emit('send_message',payload,callback=True);assert replay['success'] and replay['id']==sent['id']
        changed=a.emit('send_message',{**payload,'text':'different'},callback=True);assert not changed['success']
        received=[event['args'][0] for event in b.get_received() if event['name']=='receive_message'];assert any(m['text']==payload['text'] and m['attachment']['id']==attachment['id'] for m in received)
        stolen=b.emit('send_message',{'recipient':agent['id'],'text':'','attachmentId':attachment['id'],'clientId':str(uuid.uuid4())},callback=True);assert not stolen['success']
        voice=a.emit('send_message',{'recipient':colleague['id'],'text':'','attachmentId':audio.json['id'],'clientId':str(uuid.uuid4())},callback=True);assert voice['success']
        contacts=client.get('/users',headers=headers(colleague))
        assert contacts.status_code==200
        preview=next(row for row in contacts.json if row['id']==agent['id'])
        assert preview['lastMessage']=='' and preview['lastAttachmentMime']=='audio/wav'
        assert preview['lastMessageAt'].endswith('+00:00')
        assert all(row['id']!=outsider['id'] for row in contacts.json)
        # Another member of the same team cannot see this conversation's preview.
        admin_contacts=client.get('/users',headers=headers(admin)).json
        private_preview=next(row for row in admin_contacts if row['id']==agent['id'])
        assert private_preview['lastMessage'] is None and private_preview['lastAttachmentMime'] is None
        loaded=b.emit('load_messages',{'recipient':agent['id']},callback=True);assert loaded['success']
        history=[event['args'][0] for event in b.get_received() if event['name']=='all_messages'][-1]
        assert any(m['id']==sent['id'] and m['text']==payload['text'] and m['attachment']['kind']=='image' for m in history)
        assert any(m['id']==voice['id'] and m['attachment']['kind']=='audio' for m in history)
    finally:
        a.disconnect();b.disconnect()

def test_contact_photos_require_authentication_and_same_team(ecosystem,monkeypatch):
    import json,sys
    root=Path(__file__).resolve().parents[1]
    config=json.loads((root/'.local/runtime.json').read_text())
    for key in ['JWT_SECRET','DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD']:
        monkeypatch.setenv(key,config[key])
    sys.path.insert(0,str(root/'inteliagent-chat'))
    import server
    from chat.repository import ChatRepository
    monkeypatch.setattr(server,'repository',ChatRepository())
    users=ecosystem['users']; agent=users['agent']; cur=ecosystem['cursor']; db=ecosystem['db']
    cur.execute('SELECT id_imagem_perfil_usuario AS photo FROM usuario WHERE id=%s',(agent['id'],))
    original=cur.fetchone()['photo']
    image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAZElEQVR4nO3PUQkAIBTAwBfEjCY2jCH8OITBAtxm7fN1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY8dgGvNcjx+m6bbAAAAABJRU5ErkJggg==')
    cur.execute("INSERT INTO imagem_perfil_usuario(image_data,image_name,image_type) VALUES (%s,'test.png','image/png')",(image,))
    photo=cur.lastrowid
    try:
        cur.execute('UPDATE usuario SET id_imagem_perfil_usuario=%s WHERE id=%s',(photo,agent['id']));db.commit()
        client=server.app.test_client(); path=f"/users/{agent['id']}/photo"
        headers=lambda role:{'Authorization':'Bearer '+users[role]['token']}
        assert client.get(path).status_code==401
        assert client.get(path,headers=headers('outsider')).status_code==404
        response=client.get(path,headers=headers('admin'))
        assert response.status_code==200 and response.data==image
        assert response.headers['Cache-Control']=='private, no-store'
        contacts=client.get('/users',headers=headers('admin')).json
        assert next(row for row in contacts if row['id']==agent['id'])['photoUrl']==path+f'?v={photo}'
        assert all('image_data' not in row for row in contacts)
        cur.execute('UPDATE usuario SET id_imagem_perfil_usuario=NULL WHERE id=%s',(agent['id'],));db.commit()
        assert client.get(path,headers=headers('admin')).status_code==404
    finally:
        cur.execute('UPDATE usuario SET id_imagem_perfil_usuario=%s WHERE id=%s',(original,agent['id']))
        cur.execute('DELETE FROM imagem_perfil_usuario WHERE id=%s',(photo,));db.commit()
