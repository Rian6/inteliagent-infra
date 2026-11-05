import mysql.connector,json
from pathlib import Path
r=Path(__file__).resolve().parents[1];c=json.loads((r/'.local/runtime.json').read_text());a=json.loads((r/'.local/test-accounts.json').read_text());assert c['DB_PORT']=='3308'
db=mysql.connector.connect(host='127.0.0.1',port=3308,user='root',password=c['MYSQL_ROOT_PASSWORD'],database='inteliagent');q=db.cursor()
q.execute("INSERT INTO USUARIO(NOME,EMAIL,SENHA,ID_CEDE,SITUACAO_APROVACAO,CODIGO_EMAIL,SITUACAO,ROLE) SELECT 'Agente de teste de permissões','agente.teste@inteliagent.local',SENHA,ID_CEDE,1,'local',1,'AGENT' FROM USUARIO WHERE EMAIL=%s ON DUPLICATE KEY UPDATE SITUACAO=1,SITUACAO_APROVACAO=1",(a['mobile']['email'],));db.commit()
q.execute("SELECT ID FROM USUARIO WHERE EMAIL='agente.teste@inteliagent.local'");uid=q.fetchone()[0]
(r/'.local/agent-permissions-test.json').write_text(json.dumps({'id':uid,'email':'agente.teste@inteliagent.local','password':a['mobile']['password']}));print('Local AGENT fixture ready.')
