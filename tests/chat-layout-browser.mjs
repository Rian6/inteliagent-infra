import {server} from './mobile-ui/server.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const accounts=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
page.on('console',message=>{if(message.type()==='error')console.log('Console:',message.text().slice(0,200));});
try {
 await page.route('**/users',route=>route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization','Access-Control-Allow-Methods':'GET, OPTIONS'},body:JSON.stringify([{id:2,nome:'Equipe de campo',lastMessage:'Visitas concluídas',lastMessageAt:new Date().toISOString()},{id:3,nome:'Supervisão',lastMessage:'Próxima rota pronta'}])}));
 console.log('Opening mobile contacts');await page.goto('http://127.0.0.1:5184/#/chat-contacts');console.log('Contacts loaded');
 await page.getByText('Visitas concluídas',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Nova conversa',exact:true}).click();
 await page.getByLabel('Buscar pessoa',{exact:true}).fill('supervisao');
 assert.equal(await page.getByRole('button',{name:'Conversar com Supervisão',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Conversar com Equipe de campo',exact:true}).count(),0);
 await page.getByRole('button',{name:'Limpar busca',exact:true}).click();
 for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.screenshot({path:'.local/mobile-chat-contacts.png'});
 await page.unroute('**/users');
 await page.setViewportSize({width:1440,height:1000});await page.goto(accounts.webUrl);
 await page.getByLabel(/^Email/).fill(accounts.web.email);await page.getByLabel(/^Senha/).fill(accounts.web.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('link',{name:'Mensagens',exact:true}).click();
 await page.getByRole('button',{name:'Agente Mobile',exact:true}).click();await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Buscar na conversa',exact:true}).click();
 await page.getByLabel('Buscar nesta conversa',{exact:true}).fill('texto que não existe 987654321');
 assert.equal(await page.getByRole('log',{name:'Histórico da conversa'}).getByText('Bom dia',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Fechar busca na conversa',exact:true}).click();
 await page.getByRole('button',{name:'Voltar às conversas',exact:true}).click();
 await page.getByLabel('Buscar pessoa',{exact:true}).fill('Mobile');
 assert.equal(await page.getByRole('button',{name:'Agente Mobile',exact:true}).isVisible(),true);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log('Chat layout passed: mobile contact previews/search, 320px layout, web conversation search and mobile back navigation.');
} catch(error) { console.log('Browser errors:',errors); console.log((await page.locator('body').innerText()).slice(-1800)); throw error; } finally {await browser.close();await server.close();}
