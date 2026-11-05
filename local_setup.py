from pathlib import Path
import secrets, base64, json, os, subprocess
import mysql.connector
root=Path(__file__).parent
(root/'.local').mkdir(parents=True,exist_ok=True)
path=root/'.local/runtime.json'
if path.exists():
    config=json.loads(path.read_text())
else:
    config={'DB_PASSWORD':secrets.token_urlsafe(32),'MYSQL_ROOT_PASSWORD':secrets.token_urlsafe(32),'JWT_SECRET':base64.b64encode(secrets.token_bytes(48)).decode(), 'DB_URL':'jdbc:mysql://127.0.0.1:3308/inteliagent','DB_USER':'inteliagent','DB_HOST':'127.0.0.1','DB_PORT':'3308','DB_NAME':'inteliagent','CORS_ORIGINS':'http://localhost:5173','SMTP_HOST':'localhost','SMTP_PORT':'1025'}
    db=mysql.connector.connect(host='127.0.0.1',port=3308,user='root',password='')
    cursor=db.cursor()
    cursor.execute('CREATE DATABASE IF NOT EXISTS inteliagent')
    cursor.execute("CREATE USER IF NOT EXISTS 'inteliagent'@'localhost' IDENTIFIED BY %s",(config['DB_PASSWORD'],))
    cursor.execute("GRANT ALL PRIVILEGES ON inteliagent.* TO 'inteliagent'@'localhost'")
    cursor.execute("ALTER USER 'root'@'localhost' IDENTIFIED BY %s",(config['MYSQL_ROOT_PASSWORD'],))
    cursor.close();db.close()
    path.write_text(json.dumps(config,indent=2))
print('Isolated local database configured on 127.0.0.1:3308. Secrets saved in .local/runtime.json.')
