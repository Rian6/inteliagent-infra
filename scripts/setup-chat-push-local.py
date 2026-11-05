"""Apply the chat migration and generate private Web Push keys in the isolated local environment."""
import base64,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import runtime
config=json.loads((ROOT/'.local/runtime.json').read_text())
assert config['DB_PORT']=='3308','Only the isolated local database is supported'
env=runtime.environment()
env['MAVEN_OPTS']='-Xmx256m'
mvn=['C:/Program Files/apache-maven-3.9.5/bin/mvn.cmd','-s',str(ROOT/'maven-settings.xml'),'-gs',str(ROOT/'maven-settings.xml'),'-Dmaven.repo.local='+str(ROOT/'.cache/m2'),'-q','package','-DskipTests']
with (ROOT/'.local/chat-push-migration-build.log').open('w',encoding='utf8') as log:
    subprocess.run(mvn,cwd=ROOT/'inteliagent-migration',env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
with (ROOT/'.local/chat-push-migration.log').open('w',encoding='utf8') as log:
    subprocess.run(['java','-jar',str(next((ROOT/'inteliagent-migration/target').glob('*SNAPSHOT.jar')))],cwd=ROOT/'inteliagent-migration',env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
import mysql.connector
db=mysql.connector.connect(host=config['DB_HOST'],port=3308,user='root',password=config['MYSQL_ROOT_PASSWORD'],database=config['DB_NAME'])
cur=db.cursor()
user=config['SERVICE_DATABASES']['chat']['user']
assert user.replace('_','').isalnum()
for table in ('chat_push_devices','chat_push_outbox'):
    cur.execute(f"GRANT SELECT,INSERT,UPDATE,DELETE ON inteliagent.{table} TO '{user}'@'localhost'")
cur.close();db.close()
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
keypath=ROOT/'.local/vapid-private.pem'
if not keypath.exists():
    private=ec.generate_private_key(ec.SECP256R1())
    keypath.write_bytes(private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
else: private=serialization.load_pem_private_key(keypath.read_bytes(),password=None)
config.update(VAPID_PRIVATE_KEY=str(keypath),VAPID_PUBLIC_KEY=base64.urlsafe_b64encode(private.public_key().public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint)).rstrip(b'=').decode())
config.setdefault('VAPID_SUBJECT','mailto:admin@inteliagent.local')
(ROOT/'.local/runtime.json').write_text(json.dumps(config,indent=2))
print('Chat push migration and local Web Push keys ready. Private keys stay in .local/.')
