import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const a=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8'));let token;
async function request(port,path,body,method){const r=await fetch('http://127.0.0.1:'+port+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const t=await r.text();return {status:r.status,data:t?JSON.parse(t):null};}
const login=await request(8080,'/api/user/login',{email:a.web.email,senha:a.web.password});assert.equal(login.status,200);token=login.data.token;
const before=(await request(8070,'/api/indicadores')).data;const planId=randomUUID();
let r=await request(8070,'/api/planejamento/salvar',{uuid:planId,nomeRegiao:'Indicadores home - validação',zona:'Urbana',ano:'2026-01-01',situacao:3,idCidade:4104808,idCategoria:10001,atividade:2,tipo:1,ciclo:0,catalogoVersao:'PNCD-FAD-IBGE-v1',boletimJson:JSON.stringify({codigoLocalidade:'001'})});assert.equal(r.status,200);
const ids=[randomUUID(),randomUUID(),randomUUID()];const batch=ids.map((id,i)=>({id,tabela:'VISITA',mutationId:randomUUID(),baseVersion:0,values:{ID:id,ID_PLANEJAMENTO:planId,NOME:'Rua de teste dos indicadores',NUMERO:String(i+1),SITUACAO:1,SITUACAO_REFERENCIA:[3,1,5][i],CONTEM_AMOSTRA:i===0?1:0,CONTEM_TRATAMENTO:i===0?1:0,PRIMEIRA_VISITA:i===0?'2026-11-01 10:00:00':null}}));
r=await request(8090,'/api/sync',batch);assert.equal(r.status,200);assert.equal(r.data.applied.length,3);
const after=(await request(8070,'/api/indicadores')).data;
for(const [key,delta] of [['planejamentos',1],['emAndamento',1],['totalVisitas',3],['realizadas',1],['fechados',1],['aVisitar',1],['comAmostra',1],['comTratamento',1]])assert.equal(Number(after[key])-Number(before[key]),delta,key);
for(const key of ['planosPendentes','planosConcluidos','recusados'])assert.equal(Number(after[key]),Number(before[key]),key);
assert.equal((await request(8070,'/api/visita/'+ids[2],null,'DELETE')).status,204);const removed=(await request(8070,'/api/indicadores')).data;assert.equal(Number(removed.totalVisitas),Number(after.totalVisitas)-1);assert.equal(Number(removed.aVisitar),Number(after.aVisitar)-1);
console.log('Home metrics API passed: controlled plan/visit deltas, distinct statuses, samples/treatment and exclusion of removed visits.');
