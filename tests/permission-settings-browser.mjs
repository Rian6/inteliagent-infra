import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const a=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));let originals,selected,other;
async function users(){return page.evaluate(async()=>{const {api}=await import('/src/services/api.js');return (await api.get('/api/user/planning-permissions')).data;});}
const choose=email=>page.getByRole('button',{name:'Configurar permissões de '+email,exact:true});
const panel=email=>page.getByRole('article',{name:'Permissões de '+email,exact:true});
try {
 await page.goto(a.webUrl);await page.getByLabel(/^Email/).fill(a.web.email);await page.getByLabel(/^Senha/).fill(a.web.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByText('Uma visão do cuidado em campo',{exact:true}).waitFor();
 await page.getByRole('link',{name:'Configuração',exact:true}).click();await page.getByRole('heading',{name:'Permissões por usuário',exact:true}).waitFor();await page.getByText('Escolha um usuário',{exact:true}).waitFor();
 originals=await users();selected=originals.find(r=>r.email==='agente.teste@inteliagent.local');other=originals.find(r=>r.id!==selected.id);assert.ok(selected&&other);
 await page.getByLabel('Buscar usuário por nome ou email',{exact:true}).fill('AGENTE.TESTE');await choose(selected.email).click();
 const editor=panel(selected.email),toggle=editor.getByRole('switch',{name:'Cadastrar planejamentos · '+selected.email,exact:true}),save=editor.getByRole('button',{name:'Salvar permissões de '+selected.nome,exact:true});
 assert.equal(await editor.getByRole('switch').count(),4);await editor.getByRole('group',{name:'Planejamentos',exact:true}).waitFor();await editor.getByRole('group',{name:'Visitas e rota',exact:true}).waitFor();assert.equal(await save.isDisabled(),true);
 await toggle.setChecked(!selected.createPlanning);await editor.getByText('Alterações não salvas',{exact:true}).waitFor();
 // Searching cannot throw away the current draft or silently switch the selected user.
 await page.getByLabel('Buscar usuário por nome ou email',{exact:true}).fill(other.email);assert.equal(await toggle.isChecked(),!selected.createPlanning);
 await choose(other.email).click();let dialog=page.getByRole('dialog');await dialog.getByText('Salvar antes de trocar de usuário?',{exact:true}).waitFor();await dialog.getByRole('button',{name:'Continuar editando',exact:true}).click();assert.equal(await toggle.isChecked(),!selected.createPlanning);
 await choose(other.email).click();await page.getByRole('dialog').getByRole('button',{name:'Descartar e trocar',exact:true}).click();await panel(other.email).waitFor();assert.equal((await users()).find(r=>r.id===selected.id).createPlanning,selected.createPlanning);
 await page.getByLabel('Buscar usuário por nome ou email',{exact:true}).fill(selected.email);await choose(selected.email).click();assert.equal(await toggle.isChecked(),selected.createPlanning);
 await toggle.setChecked(!selected.createPlanning);await editor.getByRole('button',{name:'Descartar',exact:true}).click();assert.equal(await toggle.isChecked(),selected.createPlanning);assert.equal(await save.isDisabled(),true);
 await toggle.setChecked(!selected.createPlanning);
 await page.route('**/api/user/planning-permissions/'+selected.id,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Falha temporária de teste'})}),{times:1});
 await save.click();await editor.getByText(/Suas alterações foram mantidas/).waitFor();assert.equal(await toggle.isChecked(),!selected.createPlanning);assert.equal(await save.isEnabled(),true);
 await save.click();await editor.getByText('Permissões salvas para '+selected.nome+'.',{exact:true}).waitFor();assert.equal(await save.isDisabled(),true);
 let current=await users();assert.equal(current.find(r=>r.id===selected.id).createPlanning,!selected.createPlanning);assert.deepEqual(current.find(r=>r.id===other.id),other);
 // Saving from the switch-user dialog persists the original selection before opening the next person.
 await toggle.setChecked(selected.createPlanning);await page.getByLabel('Buscar usuário por nome ou email',{exact:true}).fill(other.email);await choose(other.email).click();await page.getByRole('dialog').getByRole('button',{name:'Salvar e trocar',exact:true}).click();await panel(other.email).waitFor();assert.equal((await users()).find(r=>r.id===selected.id).createPlanning,selected.createPlanning);
 await page.getByLabel('Buscar usuário por nome ou email',{exact:true}).fill(selected.email);await choose(selected.email).click();
 for(const width of [320,390,768,1280,1440]){await page.setViewportSize({width,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);await save.scrollIntoViewIfNeeded();assert.ok((await save.boundingBox()).width>=120);}
 await page.setViewportSize({width:1440,height:1100});await page.getByLabel('Buscar usuário por nome ou email',{exact:true}).fill('');await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);document.activeElement?.blur();});await page.screenshot({path:'.local/permission-settings-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'.local/permission-settings-mobile.png',fullPage:true});
 // Loading failure has its own retry and does not turn a save failure into a destructive refresh.
 await page.route('**/api/user/planning-permissions',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}),{times:1});await page.reload();await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await choose(selected.email).waitFor();
 assert.deepEqual(errors,[]);console.log('Permission settings passed: individual selection, grouped permissions, pending state, discard, protected switching, failed-save recovery, persistence, untouched other users, loading retry and responsive widths.');
} catch(error) {await page.screenshot({path:'.local/permission-settings-failure.png',fullPage:true});console.log((await page.locator('body').innerText()).slice(-2800));throw error;}
finally {
 if(originals&&selected)await page.evaluate(async original=>{const {api}=await import('/src/services/api.js');await api.put('/api/user/planning-permissions/'+original.id,original);},selected);
 await browser.close();
}
