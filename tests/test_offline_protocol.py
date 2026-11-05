"""The mobile's actual synchronization protocol against the isolated MySQL/Java stack."""
import copy
import json
import subprocess
import uuid
from pathlib import Path


def test_visit_details_scope_and_photo_validation(ecosystem):
    call=ecosystem['request']; admin=ecosystem['users']['admin']['token']; agent=ecosystem['users']['agent']['token']; outsider=ecosystem['users']['outsider']['token']
    status,plan=call('POST',8070,'/api/planejamento/salvar',{'uuid':'0','nomeRegiao':'Ficha e fotos','zona':'Centro','situacao':2,'ano':'2027-01-01','dataUltVisita':'2026-10-30 00:00:00'},admin)
    assert status==200
    visit_id=str(uuid.uuid4()); sample_id=str(uuid.uuid4())
    def mutation(table,values):return {'mutationId':str(uuid.uuid4()),'baseVersion':0,'id':values['ID'],'tabela':table,'values':values}
    visit=mutation('VISITA',{'ID':visit_id,'ID_PLANEJAMENTO':plan['uuid'],'NOME':'Ficha restrita à sede','TIPO_VISITA':'R','LADO':'E','TIPO_IMOVEL':'Residencial','SITUACAO':1})
    sample=mutation('AMOSTRA',{'ID':sample_id,'ID_VISITA':visit_id,'NUMERO_INICIO':1,'NUMERO_FINAL':2,'QUANTIDADE':2,'IMAGENS_JSON':json.dumps(['data:image/jpeg;base64,/9j/2Q==']),'SITUACAO':1})
    assert call('POST',8090,'/api/sync',[visit,sample],agent)[0]==200
    status,details=call('GET',8070,f'/api/visita/{visit_id}/ficha',token=admin)
    assert status==200 and details['visita']['LADO']=='E'
    assert 'NUMERO' in details['visita'] and 'LATITUDE' in details['visita']
    assert json.loads(details['amostra'][0]['IMAGENS_JSON'])==['data:image/jpeg;base64,/9j/2Q==']
    assert call('GET',8070,f'/api/visita/{visit_id}/ficha',token=outsider)[0]==404
    bad=copy.deepcopy(sample);bad.update(mutationId=str(uuid.uuid4()),baseVersion=1);bad['values']['IMAGENS_JSON']='["https://external.invalid/photo.jpg"]'
    assert call('POST',8090,'/api/sync',[bad],agent)[0]==400
    saved=call('GET',8070,f'/api/visita/{visit_id}/ficha',token=admin)[1]
    assert json.loads(saved['amostra'][0]['IMAGENS_JSON'])==['data:image/jpeg;base64,/9j/2Q==']


def test_idempotency_conflict_atomicity_and_device_cursors(ecosystem):
    call=ecosystem['request'];token=ecosystem['users']['agent']['token'];admin=ecosystem['users']['admin']['token']
    status,plan=call('POST',8070,'/api/planejamento/salvar',{'uuid':'0','nomeRegiao':'Offline protocol','zona':'Norte','situacao':2},admin)
    assert status==200
    visit_id=str(uuid.uuid4())
    record={'mutationId':str(uuid.uuid4()),'baseVersion':0,'id':visit_id,'tabela':'VISITA','values':{'ID':visit_id,'ID_PLANEJAMENTO':plan['uuid'],'NOME':'Primeira versão','SITUACAO':1}}
    status,result=call('POST',8090,'/api/sync',[record],token)
    assert status==200,result
    assert result['applied']==[{'mutationId':record['mutationId'],'version':1}]
    assert call('POST',8090,'/api/sync',[record],token)==(200,result)
    changed=copy.deepcopy(record);changed['values']['NOME']='Reutilização indevida'
    assert call('POST',8090,'/api/sync',[changed],token)[0]==400
    second=copy.deepcopy(changed);second.update(mutationId=str(uuid.uuid4()),baseVersion=1)
    assert call('POST',8090,'/api/sync',[second],token)[1]['applied'][0]['version']==2
    stale=copy.deepcopy(record);stale['mutationId']=str(uuid.uuid4());stale['baseVersion']=1
    child_id=str(uuid.uuid4())
    child={'mutationId':str(uuid.uuid4()),'baseVersion':0,'id':child_id,'tabela':'INSPECAO','values':{'ID':child_id,'ID_VISITA':visit_id,'TIPO':1,'SITUACAO':1}}
    status,conflict=call('POST',8090,'/api/sync',[child,stale],token)
    assert status==409,conflict
    assert conflict['conflicts'][0]['serverVersion']==2
    cur=ecosystem['cursor'];ecosystem['db'].commit()
    cur.execute('SELECT COUNT(*) AS n FROM inspecao WHERE id=%s',(child_id,));assert cur.fetchone()['n']==0
    cur.execute('SELECT COUNT(*) AS n FROM sync_mutations WHERE mutation_id=%s',(child['mutationId'],));assert cur.fetchone()['n']==0
    user_id=ecosystem['users']['agent']['id'];device_a=str(uuid.uuid4());device_b=str(uuid.uuid4())
    def pull(device):
        status,data=call('GET',8090,f'/api/consumer/{user_id}?clientId={device}',token=token)
        assert status==200,data
        collected={item['tableName']:list(item['rows']) for item in data['consumerLoadsList']}
        while any(item['hasMore'] for item in data['consumerLoadsList']):
            status,data=call('GET',8090,f"/api/consumer/{user_id}?clientId={device}&offset={data['nextOffset']}&downloadId={data['downloadId']}",token=token)
            assert status==200,data
            for item in data['consumerLoadsList']:collected[item['tableName']]+=item['rows']
        assert call('POST',8090,f"/api/consumer-confirm/{user_id}?downloadId={data['downloadId']}",[item['tableName'] for item in data['consumerLoadsList']],token)[0]==200
        for item in data['consumerLoadsList']:item['rows']=collected[item['tableName']]
        return data
    pull(device_a)
    # A's watermark must not hide records from B, even when A is ahead of all writes.
    cur.execute('UPDATE sync_confirm SET ULTIMO_SINCRONISMO=DATE_ADD(NOW(),INTERVAL 1 HOUR) WHERE ID_USUARIO=%s AND CLIENT_ID=%s',(user_id,device_a));ecosystem['db'].commit()
    data=pull(device_b)
    assert any(row['ID']==visit_id for item in data['consumerLoadsList'] if item['tableName']=='VISITA' for row in item['rows'])
    cur.execute('SELECT COUNT(*) AS n FROM sync_confirm WHERE ID_USUARIO=%s AND CLIENT_ID IN (%s,%s)',(user_id,device_a,device_b));assert cur.fetchone()['n']==10


def test_real_mobile_engine_round_trip(ecosystem):
    root=Path(__file__).resolve().parents[1]
    call=ecosystem['request'];admin=ecosystem['users']['admin']['token']
    status,plan=call('POST',8070,'/api/planejamento/salvar',{'uuid':'0','nomeRegiao':'Mobile SQLite integration','zona':'Sul','situacao':2},admin)
    assert status==200
    user=ecosystem['users']['agent']
    result=subprocess.run([str(root/'.tools/node-v26.13.0-win-x64/node.exe'),str(root/'tests/mobile-roundtrip.mjs')],input=json.dumps({'user':user,'planId':plan['uuid']}),text=True,capture_output=True,timeout=60)
    assert result.returncode==0,result.stderr
    assert result.stdout.strip()=='Mobile SQLite / Java / MySQL round trip passed.'


def test_download_pages_do_not_skip_records_when_an_earlier_row_changes(ecosystem):
    call=ecosystem['request'];user=ecosystem['users']['agent'];admin=ecosystem['users']['admin']['token']
    status,plan=call('POST',8070,'/api/planejamento/salvar',{'uuid':'0','nomeRegiao':'Pagination concurrency','zona':'Sul','situacao':2},admin)
    assert status==200
    ids=[f'00000000-0000-4000-8000-{index:012d}' for index in range(520)]
    cur=ecosystem['cursor']
    cur.executemany('INSERT INTO visita(id,id_planejamento,nome,situacao) VALUES(%s,%s,%s,1) ON DUPLICATE KEY UPDATE id_planejamento=VALUES(id_planejamento),updated_at=NOW(6)',[(id,plan['uuid'],'Pagination') for id in ids]);ecosystem['db'].commit()
    client=str(uuid.uuid4())
    status,first=call('GET',8090,f"/api/consumer/{user['id']}?clientId={client}&isLoadFull=true",token=user['token'])
    assert status==200,first
    visits=next(item for item in first['consumerLoadsList'] if item['tableName']=='VISITA')
    assert len(visits['rows'])==500 and visits['hasMore']
    assert call('POST',8090,f"/api/consumer-confirm/{user['id']}?downloadId={first['downloadId']}",[item['tableName'] for item in first['consumerLoadsList']],user['token'])[0]==400
    # Updating a row moves it beyond the snapshot's upper time bound. Offset pagination
    # would shift the next page and lose an untouched row; keyset pagination must not.
    cur.execute('UPDATE visita SET updated_at=DATE_ADD(NOW(6),INTERVAL 1 SECOND),sync_version=sync_version+1 WHERE id=%s',(ids[0],));ecosystem['db'].commit()
    status,second=call('GET',8090,f"/api/consumer/{user['id']}?clientId={client}&downloadId={first['downloadId']}&offset={first['nextOffset']}",token=user['token'])
    assert status==200,second
    received={row['ID'] for page in [first,second] for item in page['consumerLoadsList'] if item['tableName']=='VISITA' for row in item['rows']}
    assert set(ids)<=received
