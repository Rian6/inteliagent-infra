"""Refresh the offline planning reference from the official IBGE Localidades API."""
import gzip,hashlib,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
URL='https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome'
with urllib.request.urlopen(URL,timeout=45) as response:
    raw=response.read()
    rows=json.loads(gzip.decompress(raw) if raw.startswith(b'\x1f\x8b') else raw)
municipios=[]
for row in rows:
    region=row.get('microrregiao') or {}
    state=(region.get('mesorregiao') or {}).get('UF') or ((row.get('regiao-imediata') or {}).get('regiao-intermediaria') or {}).get('UF')
    if not state:raise ValueError(f'Missing state for municipality {row["id"]}')
    municipios.append({'value':row['id'],'nome':row['nome'],'uf':state['sigla'],'label':row['nome']+' — '+state['sigla']})
assert 5000<len(municipios)<6000 and len({row['value'] for row in municipios})==len(municipios)
assert any(row['value']==4104808 and row['nome']=='Cascavel' and row['uf']=='PR' for row in municipios)
catalog={
 'version':'PNCD-FAD-IBGE-v1','retrievedOn':'2026-10-30',
 'sources':{
  'municipios':URL,
  'atividadesTipos':'https://www.capanema.pr.gov.br/attachments/article/12743/16.%20RESUMO%20DO%20BOLETIM%20DE%20CAMPO%20E%20LABORAT%C3%93RIO.pdf',
  'categoriasCiclos':'https://saude.rs.gov.br/upload/arquivos/carga20190402/15170227-27095308-instrutivo-para-preenchimento-dos-boletins-de-campo.pdf',
 },
 'categorias':[{'value':10001,'code':'BIR','label':'Bairro (BIR)'},{'value':10002,'code':'PV','label':'Povoado (PV)'}],
 'atividades':[
  {'value':1,'code':'LI','label':'1 · LI — Levantamento de índice'},
  {'value':2,'code':'LI+T','label':'2 · LI+T — Levantamento de índice e tratamento'},
  {'value':3,'code':'PE','label':'3 · PE — Ponto estratégico'},
  {'value':4,'code':'T','label':'4 · T — Tratamento'},
  {'value':5,'code':'DF','label':'5 · DF — Delimitação de foco'},
  {'value':6,'code':'PVE','label':'6 · PVE — Pesquisa vetorial especial'},
 ],
 'tipos':[{'value':1,'label':'1 · Sede'},{'value':2,'label':'2 · Outros'}],
 'municipios':municipios,
}
serialized=json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n'
for path in ['data/planning-catalog.json','inteliagent-app/src/data/planning-catalog.json','inteliagent-webapp/src/data/planning-catalog.json','inteliagent-main-server/src/main/resources/catalogos/planning-catalog.json','inteliagent-load-server/src/main/resources/catalogos/planning-catalog.json']:
    target=ROOT/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(serialized,encoding='utf-8')
print(f'Official IBGE snapshot: {len(municipios)} municipalities; SHA-256 {hashlib.sha256(serialized.encode()).hexdigest()}.')
for project in ['inteliagent-app','inteliagent-webapp']:
    (ROOT/project/'src/data/planning-fields.ts').write_text((ROOT/'data/planning-fields.ts').read_text(encoding='utf-8'),encoding='utf-8')
