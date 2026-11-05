"""Loopback-only SMTP sink used by the local environment. Never delivers mail."""
import json
import threading
from pathlib import Path
from aiosmtpd.controller import Controller

MAILBOX=Path(__file__).parent/'.local/mailbox.json'
class Mailbox:
    async def handle_DATA(self, server, session, envelope):
        messages=json.loads(MAILBOX.read_text()) if MAILBOX.exists() else []
        messages.append({'to':envelope.rcpt_tos,'content':envelope.content.decode('utf-8',errors='replace')})
        MAILBOX.write_text(json.dumps(messages[-100:],ensure_ascii=False,indent=2),encoding='utf-8')
        return '250 Stored locally; no delivery'
if __name__=='__main__':
    controller=Controller(Mailbox(),hostname='127.0.0.1',port=1025)
    controller.start()
    threading.Event().wait()
