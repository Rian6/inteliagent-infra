import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID as uuid} from 'node:crypto';
const accounts=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8'));
const agentAccount=JSON.parse(fs.readFileSync('.local/agent-permissions-test.json','utf8'));
async function request(port,path,user,body,method){
 const r=await fetch(`http://127.0.0.1:${port}${path}`,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+user.token}:{})},body:body?JSON.stringify(body):undefined});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data};
}
async function login(account){const r=await request(8080,'/api/user/login',null,{email:account.email,senha:account.password});assert.equal(r.status,200);return r.data;}
const admin=await login(accounts.web),agent=await login(agentAccount),otherAdmin=await login(accounts.mobile);
const listed=await request(8080,'/api/user/planning-permissions',admin);assert.equal(listed.status,200);
const originals=new Map(listed.data.map(r=>[r.id,r]));
assert.equal(originals.get(admin.id).addVisits,true);assert.equal(originals.get(admin.id).reorderVisits,true);
assert.equal(typeof agent.permissions.addVisits,'boolean');assert.equal(typeof agent.permissions.reorderVisits,'boolean');
async function flags(user,addVisits,reorderVisits){
 const p=originals.get(user.id);const r=await request(8080,'/api/user/planning-permissions/'+user.id,admin,{createPlanning:p.createPlanning,editPlanning:p.editPlanning,addVisits,reorderVisits},'PUT');assert.equal(r.status,200);
}
const list=await request(8070,'/api/planejamento-list',admin);
const plan=list.data.find(p=>p.descricao==='Planejamento sem visitas - teste do contador'&&p.quantidadeVisitas===0);assert.ok(plan,'Need existing empty local demonstration plan');
const created=[];
const visit=(id,nome='Rua de teste de permissões')=>({uuid:id,idPlanejamento:plan.codigo,nome,numero:'10',tipoVisita:'N',tipoImovel:'Residencial',sequencia:1,boletimJson:'{}'});
const mutation=(id,values,baseVersion=0)=>({id,tabela:'VISITA',mutationId:uuid(),baseVersion,values:{ID:id,ID_PLANEJAMENTO:plan.codigo,...values}});
async function detail(id){const r=await request(8070,'/api/visita/'+id+'/ficha',admin);assert.equal(r.status,200);return r.data.visita;}
try {
 assert.equal((await request(8080,'/api/user/planning-permissions/'+admin.id,agent,{createPlanning:false,editPlanning:false,addVisits:true,reorderVisits:true},'PUT')).status,403);
 for(const user of [agent,otherAdmin]){
  await flags(user,false,false);
  assert.equal((await request(8070,'/api/visita/salvar',user,[visit(uuid())])).status,403);
  assert.equal((await request(8090,'/api/sync',user,[mutation(uuid(),{NOME:'Bloqueada',SEQUENCIA:1,SITUACAO:1})])).status,403);
  assert.equal((await request(8070,'/api/visita/reordenar',user,{idPlanejamento:plan.codigo,ids:[]})).status,403);
 }
 await flags(agent,true,false);
 const first=uuid();assert.equal((await request(8070,'/api/visita/salvar',agent,[visit(first)])).status,200);created.push(first);
 const second=uuid(),insert=mutation(second,{NOME:'Segunda visita',NUMERO:'11',SEQUENCIA:1,SITUACAO:1,SITUACAO_REFERENCIA:5});
 let r=await request(8090,'/api/sync',agent,[insert]);assert.equal(r.status,200,JSON.stringify(r));created.push(second);
 assert.equal((await detail(second)).SEQUENCIA,2,'No reorder permission: append despite requested sequence 1');
 assert.equal((await request(8090,'/api/sync',agent,[insert])).status,200,'Append mutation replay must remain idempotent');
 assert.equal((await request(8090,'/api/sync',agent,[mutation(second,{SEQUENCIA:1},Number((await detail(second)).SYNC_VERSION))])).status,403);
 // No implicit administrator bypass for the original save endpoint.
 assert.equal((await request(8070,'/api/visita/salvar',otherAdmin,[{...visit(first),sequencia:9}])).status,403);
 await flags(agent,false,false);
 const current=await detail(first);
 r=await request(8090,'/api/sync',agent,[mutation(first,{NOME:'Endereço preenchido em campo',SEQUENCIA:current.SEQUENCIA},Number(current.SYNC_VERSION))]);assert.equal(r.status,200,JSON.stringify(r));
 assert.equal((await detail(first)).NOME,'Endereço preenchido em campo');
 await flags(agent,false,true);
 assert.equal((await request(8070,'/api/visita/salvar',agent,[visit(uuid())])).status,403,'Reorder must not imply create');
 assert.equal((await request(8070,'/api/visita/reordenar',agent,{idPlanejamento:plan.codigo,ids:[second,first]})).status,200);
 assert.equal((await detail(second)).SEQUENCIA,1);assert.equal((await detail(first)).SEQUENCIA,2);
 assert.equal((await request(8070,'/api/visita/reordenar',agent,{idPlanejamento:plan.codigo,ids:[first]})).status,409,'Reject stale or incomplete route');
 assert.equal((await request(8070,'/api/visita/reordenar',agent,{idPlanejamento:plan.codigo,ids:[first,first]})).status,400);
 const one=await detail(first),two=await detail(second);
 assert.equal((await request(8090,'/api/sync',agent,[mutation(first,{SEQUENCIA:1},Number(one.SYNC_VERSION)),mutation(second,{SEQUENCIA:2},Number(two.SYNC_VERSION))])).status,200);
 assert.equal((await detail(first)).SEQUENCIA,1);assert.equal((await detail(second)).SEQUENCIA,2);
 const mine=await request(8080,'/api/user/permissions',agent);assert.equal(mine.data.addVisits,false);assert.equal(mine.data.reorderVisits,true);
 // Older clients changing planning flags must preserve the new visit permissions.
 const original=originals.get(agent.id);
 await request(8080,'/api/user/planning-permissions/'+agent.id,admin,{createPlanning:original.createPlanning,editPlanning:original.editPlanning},'PUT');
 const retained=await request(8080,'/api/user/permissions',agent);assert.equal(retained.data.addVisits,false);assert.equal(retained.data.reorderVisits,true);
 console.log('Visit permissions API passed: independent flags for agents/admins, both create APIs, append-only creation, idempotent sync replay, preserved fieldwork, both reorder APIs, stale-route protection and legacy compatibility.');
} finally {
 for(const id of created)assert.equal((await request(8070,'/api/visita/'+id,admin,null,'DELETE')).status,204);
 for(const user of [agent,otherAdmin]){const p=originals.get(user.id);await flags(user,p.addVisits,p.reorderVisits);}
}
