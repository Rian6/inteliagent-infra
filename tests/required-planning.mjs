import assert from 'node:assert/strict';import fs from 'node:fs';import {randomUUID} from 'node:crypto';import {planningReportErrors,requirePlanningReport} from '../inteliagent-app/src/data/planning-report.ts';
const catalog=JSON.parse(fs.readFileSync('inteliagent-app/src/data/planning-catalog.json','utf8')),account=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8'));
const valid={nome:'Criação completa para boletim',zona:'Urbana',ano:'2026-01-01',ciclo:0,idCidade:4104808,idCategoria:10001,atividade:2,tipo:1,boletim:{codigoLocalidade:'001'}};
assert.deepEqual(planningReportErrors(valid,catalog),{});assert.doesNotThrow(()=>requirePlanningReport(valid,catalog));
for(const key of ['nome','zona','ano','ciclo','idCidade','idCategoria','atividade','tipo'])assert.ok(planningReportErrors({...valid,[key]:null},catalog)[key],key);
assert.ok(planningReportErrors({...valid,boletim:{codigoLocalidade:'  '}},catalog).codigoLocalidade);assert.ok(planningReportErrors({...valid,boletim:{...valid.boletim,municipioIbge:3550308}},catalog).idCidade);
let token;async function request(port,path,body){const r=await fetch('http://127.0.0.1:'+port+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const text=await r.text();return {status:r.status,data:text?JSON.parse(text):null};}
let r=await request(8080,'/api/user/login',{email:account.web.email,senha:account.web.password});assert.equal(r.status,200);token=r.data.token;
const body={uuid:randomUUID(),nomeRegiao:valid.nome,zona:valid.zona,ano:valid.ano,ciclo:0,idCidade:valid.idCidade,idCategoria:valid.idCategoria,atividade:valid.atividade,tipo:valid.tipo,situacao:2,catalogoVersao:catalog.version,boletimJson:JSON.stringify(valid.boletim)};
for(const key of ['ciclo','idCidade','idCategoria','atividade','tipo','boletimJson','zona','ano']){r=await request(8070,'/api/planejamento/salvar',{...body,uuid:randomUUID(),[key]:null});assert.equal(r.status,400,key+': '+JSON.stringify(r));}
r=await request(8070,'/api/planejamento/salvar',body);assert.equal(r.status,200,JSON.stringify(r));
const values={ID:randomUUID(),NOME:valid.nome+' via app',ZONA:valid.zona,ANO:valid.ano,CICLO:0,ID_CIDADE:valid.idCidade,ID_CATEGORIA:valid.idCategoria,ATIVIDADE:valid.atividade,TIPO:valid.tipo,STATUS:2,SITUACAO:1,CATALOGO_VERSAO:catalog.version,BOLETIM_JSON:JSON.stringify(valid.boletim)};
for(const key of ['CICLO','ID_CIDADE','ID_CATEGORIA','ATIVIDADE','TIPO','BOLETIM_JSON','ZONA','ANO']){const id=randomUUID();r=await request(8090,'/api/sync',[{id,tabela:'PLANEJAMENTO',mutationId:randomUUID(),baseVersion:0,values:{...values,ID:id,[key]:null}}]);assert.equal(r.status,400,key+': '+JSON.stringify(r));}
r=await request(8090,'/api/sync',[{id:values.ID,tabela:'PLANEJAMENTO',mutationId:randomUUID(),baseVersion:0,values}]);assert.equal(r.status,200);assert.equal(r.data.applied.length,1);
const saved=await request(8070,'/api/find-by-uuid/'+body.uuid);assert.equal(saved.data.ciclo,0);assert.equal(JSON.parse(saved.data.boletimJson).codigoLocalidade,'001');
console.log('Required planning data passed: client fields, zero cycle, both APIs reject missing header data, complete web/mobile creates and persisted code.');

r=await request(8070,'/api/planejamento/salvar',{...body,uuid:randomUUID(),boletimJson:JSON.stringify({...valid.boletim,municipioIbge:4104808.5})});assert.equal(r.status,400);
