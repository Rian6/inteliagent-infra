import {server} from './mobile-ui/server.mjs';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.addInitScript(()=>{window.__routeParams={idPlanejamento:'plan'};window.__routeRows=['Primeira','Segunda','Terceira'].map((NOME,index)=>({ID:String(index+1),NOME,SEQUENCIA:index+1,ID_PLANEJAMENTO:'plan',SITUACAO_REFERENCIA:5}));});
 await page.goto('http://127.0.0.1:5184/#/atendimento/rotaVisita');await page.getByText('Ordem das visitas',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Alterar ordem',exact:true}).count(),0);
 await page.evaluate(()=>{
   const profile={id:1,idCede:3,permissions:{addVisits:false,reorderVisits:true}};window.__sessionStore.getState().setProfile(profile);
   window.__permissionWrites=[];window.__permissionEngine={user:profile,transaction:async(work)=>work({db:{getAllAsync:async()=>window.__routeRows},save:async(table,value)=>{window.__permissionWrites.push({table,value});}})};
 });
 await page.getByRole('button',{name:'Alterar ordem',exact:true}).click();await page.getByRole('button',{name:'Mover visita 2 para cima',exact:true}).click();
 assert.ok((await page.locator('body').innerText()).indexOf('1. Segunda')>=0);
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.ok((await page.locator('body').innerText()).includes('1. Primeira'));assert.equal(await page.evaluate(()=>window.__permissionWrites.length),0);
 await page.getByRole('button',{name:'Alterar ordem',exact:true}).click();await page.getByRole('button',{name:'Mover visita 2 para cima',exact:true}).click();await page.getByRole('button',{name:'Salvar ordem',exact:true}).click();await page.getByRole('button',{name:'Alterar ordem',exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__permissionWrites.map(r=>[r.value.ID,r.value.SEQUENCIA])),[['2',1],['1',2]]);assert.equal(await page.evaluate(()=>window.__scheduledSync),true);
 await page.evaluate(()=>window.__sessionStore.getState().setProfile({id:1,idCede:3,permissions:{addVisits:true,reorderVisits:false}}));assert.equal(await page.getByRole('button',{name:'Alterar ordem',exact:true}).count(),0);
 await page.screenshot({path:'.local/mobile-route-permissions.png'});assert.deepEqual(errors,[]);console.log('Mobile route UI passed: permission gates, accessible move buttons, cancel without writes, save and automatic sync.');
}finally{await browser.close();await server.close();}
