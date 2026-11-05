import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const accounts=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8'));
const base=accounts.webUrl;
const profile=path.resolve('.local/session-browser-profile-'+Date.now());
const options={headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',viewport:{width:1440,height:1000}};
let context;
const errors=[];
const watch=page=>page.on('pageerror',error=>errors.push(error.message));
try {
  context=await chromium.launchPersistentContext(profile,options);
  let page=context.pages()[0];watch(page);
  await page.goto(base);
  await page.getByRole('textbox',{name:/^Email/}).fill(accounts.web.email);
  await page.getByLabel(/^Senha/).fill(accounts.web.password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByText('Uma visão do cuidado em campo').waitFor();
  let cookie=(await context.cookies()).find(item=>item.name==='inteliagent_session');
  assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,'Strict');assert.ok(cookie.expires>Date.now()/1000+29*86400);
  assert.equal(await page.evaluate(()=>document.cookie.includes('inteliagent_session')),false);
  assert.equal(await page.evaluate(()=>Object.values(localStorage).some(value=>value.includes('eyJ'))),false);
  await page.getByRole('link',{name:'Planejamento',exact:true}).click();
  await page.reload();
  await page.getByRole('heading',{name:'Planejamento',exact:true}).waitFor();
  await context.close();
  context=await chromium.launchPersistentContext(profile,options);
  page=context.pages()[0];watch(page);
  await page.goto(base+'/planejamento');
  await page.getByRole('heading',{name:'Planejamento',exact:true}).waitFor();
  const second=await context.newPage();watch(second);await second.goto(base+'/home');
  await second.getByText('Uma visão do cuidado em campo').waitFor();
  let rejected=false,attempts=0,renewals=0;
  page.on('request',request=>{if(request.url().endsWith('/api/user/refresh/web'))renewals++;});
  await page.route(base+'/api/planejamento-list',route=>{
    attempts++;if(!rejected){rejected=true;return route.fulfill({status:401,json:{error:'expired access'}});}return route.continue();
  });
  await page.evaluate(async()=>{
    const {api}=await import('/src/services/api.js');
    await api.get('/api/planejamento-list');
  });
  assert.equal(attempts,2);assert.equal(renewals,1);
  let outage=true;
  await page.route(base+'/api/user/refresh/web',route=>{if(outage){outage=false;return route.fulfill({status:503,json:{error:'temporary outage'}});}return route.continue();});
  await page.reload();
  await page.getByRole('button',{name:'Tentar novamente',exact:true}).waitFor();
  assert.equal(await page.getByRole('textbox',{name:/^Email/}).count(),0);
  await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
  await page.getByRole('heading',{name:'Planejamento',exact:true}).waitFor();
  await page.evaluate(async()=>{
    const {api}=await import('/src/services/api.js');
    try{await api.post('/api/user/login/web',{email:'invalid@example.invalid',senha:'invalid-password'},{withCredentials:true});}catch{}
  });
  await page.getByRole('heading',{name:'Planejamento',exact:true}).waitFor();
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await page.getByRole('textbox',{name:/^Email/}).waitFor();
  await second.getByRole('textbox',{name:/^Email/}).waitFor();
  await page.reload();await page.getByRole('textbox',{name:/^Email/}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('Web sessions passed: reload, browser restart, second tab, HttpOnly persistent cookie, automatic 401 renewal, outage recovery, public login rejection, cross-tab logout and no session resurrection.');
} finally {
  if(context)await context.close();
  const root=path.resolve('.local')+path.sep;
  assert.ok(profile.startsWith(root)&&path.basename(profile).startsWith('session-browser-profile-'));
  fs.rmSync(profile,{recursive:true,force:true});
}
