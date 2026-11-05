import copy,uuid

def test_catalog_cycle_legacy_compatibility_and_offline_sync(ecosystem):
    call=ecosystem['request'];token=ecosystem['users']['admin']['token']
    payload={'uuid':'0','nomeRegiao':'Catálogo oficial','zona':'Zona 1','situacao':2,'idCidade':4104808,'idCategoria':10001,'atividade':2,'tipo':1,'ciclo':0,'ano':'2027-01-01','catalogoVersao':'PNCD-FAD-IBGE-v1'}
    status,result=call('POST',8070,'/api/planejamento/salvar',payload,token);assert status==200,result
    plan_id=result['uuid'];payload['uuid']=plan_id
    def read():
        status,row=call('GET',8070,f'/api/find-by-uuid/{plan_id}',token=token);assert status==200,row;return row
    saved=read();assert saved['ciclo']==0 and saved['idCidade']==4104808 and saved['idCategoria']==10001 and saved['catalogoVersao']==payload['catalogoVersao']
    # A client that predates the new fields must not erase them.
    old={'uuid':plan_id,'nomeRegiao':'Atualizado pelo cliente anterior','zona':'Zona 1','situacao':2}
    assert call('POST',8070,'/api/planejamento/salvar',old,token)[0]==200
    assert read()['ciclo']==0 and read()['atividade']==2
    assert call('POST',8070,'/api/planejamento/salvar',{**payload,'ciclo':None},token)[0]==200
    assert read()['ciclo'] is None
    for patch in [{'idCidade':1},{'idCategoria':77},{'atividade':7},{'tipo':3},{'ciclo':-1}]:
        assert call('POST',8070,'/api/planejamento/salvar',{**payload,**patch},token)[0]==400
    sync_id=str(uuid.uuid4());values={'ID':sync_id,'ID_CIDADE':4104808,'ID_CATEGORIA':10002,'ATIVIDADE':6,'TIPO':2,'CICLO':0,'CATALOGO_VERSAO':'PNCD-FAD-IBGE-v1','NOME':'Catálogo offline','ZONA':'Zona 2','STATUS':2,'SITUACAO':1}
    mutation={'mutationId':str(uuid.uuid4()),'baseVersion':0,'id':sync_id,'tabela':'PLANEJAMENTO','values':values}
    status,result=call('POST',8090,'/api/sync',[mutation],token);assert status==200,result
    status,row=call('GET',8070,f'/api/find-by-uuid/{sync_id}',token=token);assert status==200 and row['ciclo']==0 and row['atividade']==6
    bad=copy.deepcopy(mutation);bad.update(mutationId=str(uuid.uuid4()),baseVersion=1);bad['values']['ID_CIDADE']=1
    assert call('POST',8090,'/api/sync',[bad],token)[0]==400
