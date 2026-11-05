import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const a=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8')),agent=JSON.parse(fs.readFileSync('.local/agent-permissions-test.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const controller=await browser.newContext({viewport:{width:1440,height:1000}}),target=await browser.newContext({viewport:{width:1440,height:1000}}),page=await controller.newPage(),user=await target.newPage();let original,plan,originalOrder;const errors=[];
page.on('pageerror',e=>errors.push(e.message));user.on('pageerror',e=>errors.push(e.message));
async function login(p,account){await p.goto(a.webUrl);await p.getByLabel(/^Email/).fill(account.email);await p.getByLabel(/^Senha/).fill(account.password);await p.getByRole('button',{name:'Entrar',exact:true}).click();await p.getByText('Uma visão do cuidado em campo',{exact:true}).waitFor();}
try {
 await login(page,a.web);
 const setup=await page.evaluate(async(email)=>{const {api}=await import('/src/services/api.js');const users=(await api.get('/api/user/planning-permissions')).data;const original=users.find(u=>u.email===email);const plans=(await api.get('/api/planejamento-list')).data;const plan=plans.find(p=>p.descricao==='Rota de teste - Centro');const visits=(await api.get('/api/visitas-list/'+plan.codigo)).data;return {original,plan,order:visits.map(v=>v.id)};},agent.email);
 original=setup.original;plan=setup.plan;originalOrder=setup.order;assert.ok(originalOrder.length>1);
 await page.getByRole('link',{name:'Configuração',exact:true}).click();await page.getByRole('heading',{name:'Permissões por usuário',exact:true}).waitFor();
 await page.getByLabel('Buscar usuário por nome ou email',{exact:true}).fill(agent.email);
 await page.getByRole('button',{name:'Configurar permissões de '+agent.email,exact:true}).click();
 const row=page.getByRole('article',{name:'Permissões de '+agent.email,exact:true});
 const add=row.getByRole('switch',{name:'Adicionar visitas a planejamentos · '+agent.email,exact:true}),reorder=row.getByRole('switch',{name:'Alterar a ordem das visitas · '+agent.email,exact:true});
 async function save(addFlag,orderFlag){await add.setChecked(addFlag);await reorder.setChecked(orderFlag);await row.getByRole('button',{name:/^Salvar permissões de/}).click();await page.getByText(/Permissões salvas para/).waitFor();}
 await save(false,false);await login(user,agent);await user.goto(a.webUrl+'/planejamento/cadastrar/'+plan.codigo+'?aba=visitas');await user.getByText('Visitas da rota',{exact:false}).first().waitFor();
 assert.equal(await user.getByRole('button',{name:'Adicionar visita',exact:true}).count(),0);assert.equal(await user.getByRole('button',{name:/Mover visita/}).count(),0);await user.getByRole('button',{name:'Consultar ficha da visita 1',exact:true}).waitFor();
 await save(true,false);await user.reload();await user.getByRole('button',{name:'Adicionar visita',exact:true}).waitFor();assert.equal(await user.getByRole('button',{name:/Mover visita/}).count(),0);
 await user.getByRole('button',{name:'Adicionar visita',exact:true}).click();await user.getByRole('dialog').waitFor();await user.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
 await save(false,true);await user.reload();await user.getByRole('button',{name:'Mover visita 2 para cima',exact:true}).waitFor();assert.equal(await user.getByRole('button',{name:'Adicionar visita',exact:true}).count(),0);
 await user.getByRole('button',{name:'Mover visita 2 para cima',exact:true}).click();await user.getByRole('button',{name:'Salvar visitas',exact:true}).click();await user.getByText('Visitas salvas. O aplicativo recebe as atualizações automaticamente.',{exact:true}).waitFor();
 const saved=await page.evaluate(async id=>{const {api}=await import('/src/services/api.js');return (await api.get('/api/visitas-list/'+id)).data.map(r=>r.id);},plan.codigo);assert.equal(saved[0],originalOrder[1]);assert.equal(saved[1],originalOrder[0]);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'settings overflow '+width);await user.setViewportSize({width,height:1000});assert.equal(await user.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'visits overflow '+width);}
 await page.screenshot({path:'.local/visit-permissions-settings.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('Visit permission UI passed: independent settings switches, denied/add-only/reorder-only agent views, saved route order and responsive widths.');
}finally{
 if(original)await page.evaluate(async({original,plan,ids})=>{const {api}=await import('/src/services/api.js');if(plan&&ids)await api.post('/api/visita/reordenar',{idPlanejamento:plan.codigo,ids});await api.put('/api/user/planning-permissions/'+original.id,original);},{original,plan,ids:originalOrder});
 await browser.close();
}
