#!/usr/bin/env python3
"""Generate server-only credentials once. Run as root before the first startup."""
from pathlib import Path
import base64
import os
import secrets

os.umask(0o077)
directory = Path(__file__).resolve().parents[1] / '.local'
directory.mkdir(mode=0o700, exist_ok=True)
names = ['database.env', 'production.env', 'init.sql', 'auth.env', 'main-server.env', 'load-server.env', 'chat.env', 'migration.env']
if any((directory / name).exists() for name in names):
    raise SystemExit('Configuration already exists; refusing to replace credentials.')

(directory / 'database.env').write_text('MYSQL_DATABASE=inteliagent\nMYSQL_ROOT_PASSWORD=' + secrets.token_urlsafe(36) + '\n')
(directory / 'production.env').write_text(
    'DB_URL=jdbc:mysql://mysql:3306/inteliagent\nDB_HOST=mysql\nDB_PORT=3306\nDB_NAME=inteliagent\n'
    'JWT_SECRET=' + base64.b64encode(secrets.token_bytes(48)).decode() + '\n'
    'CORS_ORIGINS=https://inteliagent.com.br,https://www.inteliagent.com.br\n'
    'SMTP_HOST=127.0.0.1\nSMTP_PORT=1025\nSMTP_AUTH=false\nSMTP_TLS=false\nMAIL_FROM=noreply@inteliagent.com.br\n'
)
statements = []
for service in ['auth', 'main-server', 'load-server', 'chat', 'migration']:
    user = 'inteliagent_' + service.replace('-', '_')
    password = secrets.token_urlsafe(36)
    config = f'DB_USER={user}\nDB_PASSWORD={password}\n'
    if service == 'migration':
        config += 'DB_URL=jdbc:mysql://mysql:3306/inteliagent\n'
    (directory / (service + '.env')).write_text(config)
    privileges = 'ALL PRIVILEGES' if service == 'migration' else 'SELECT, INSERT, UPDATE, DELETE'
    statements.extend([
        f"CREATE USER IF NOT EXISTS '{user}'@'%' IDENTIFIED BY '{password}';",
        f"GRANT {privileges} ON inteliagent.* TO '{user}'@'%';",
    ])
sql = directory / 'init.sql'
sql.write_text('\n'.join(statements) + '\n')
# The official MySQL entrypoint runs as UID 999. The parent directory stays root-only.
os.chown(sql, 999, 999)
sql.chmod(0o400)
print('Private credentials generated. Configure SMTP before enabling email-dependent flows.')
