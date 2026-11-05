"""Provision independent application credentials only in the isolated local MySQL."""
import json,secrets
from pathlib import Path
import mysql.connector
root=Path(__file__).parent
path=root/'.local/runtime.json'
config=json.loads(path.read_text())
assert config['DB_PORT']=='3308'
db=mysql.connector.connect(host='127.0.0.1',port=3308,user='root',password=config['MYSQL_ROOT_PASSWORD'],database='inteliagent')
cursor=db.cursor()
accounts=config.setdefault('SERVICE_DATABASES',{})
tables={
    'auth':{'usuario':'SELECT, INSERT, UPDATE','cede':'SELECT','email_liberacao':'SELECT, INSERT, DELETE, UPDATE','imagem_perfil_usuario':'SELECT, INSERT, DELETE','password_reset':'SELECT, INSERT, UPDATE, DELETE','email_outbox':'SELECT, INSERT, UPDATE, DELETE','auth_sessions':'SELECT, INSERT, UPDATE, DELETE'},
    'main-server':{'planejamento':'SELECT, INSERT, UPDATE','visita':'SELECT, INSERT, UPDATE','inspecao':'SELECT','amostra':'SELECT','tratamento':'SELECT'},
    'load-server':{name:'SELECT, INSERT, UPDATE' for name in ['planejamento','visita','inspecao','amostra','tratamento','sync_confirm','sync_mutations']},
    'chat':{'messages':'SELECT, INSERT','chat_attachments':'SELECT, INSERT','imagem_perfil_usuario':'SELECT','chat_push_devices':'SELECT, INSERT, UPDATE, DELETE','chat_push_outbox':'SELECT, INSERT, UPDATE, DELETE'},
}
for service,grants in tables.items():
    account=accounts.setdefault(service,{'user':'inteliagent_'+service.replace('-','_'),'password':secrets.token_urlsafe(32)})
    username=account['user']
    cursor.execute(f"CREATE USER IF NOT EXISTS '{username}'@'localhost' IDENTIFIED BY %s",(account['password'],))
    for table,rights in grants.items():
        cursor.execute(f"GRANT {rights} ON inteliagent.{table} TO '{username}'@'localhost'")
    if service=='auth':
        cursor.execute(f"GRANT UPDATE (AUTO_APROVAR) ON inteliagent.cede TO '{username}'@'localhost'")
    if service!='auth':
        columns='id,email,id_cede,token_version,role,situacao,situacao_aprovacao,nome,latitude,longitude,pode_criar_planejamento,pode_editar_planejamento,pode_adicionar_visitas,pode_reordenar_visitas'
        if service=='chat': columns+=',id_imagem_perfil_usuario'
        cursor.execute(f"GRANT SELECT ({columns}) ON inteliagent.usuario TO '{username}'@'localhost'")
path.write_text(json.dumps(config,indent=2))
cursor.close();db.close()
print('Independent database credentials provisioned for auth, main, sync and chat.')
