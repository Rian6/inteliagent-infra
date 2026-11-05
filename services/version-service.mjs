import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GitHubReleases, githubToken, versionDecision } from './github-releases.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=new GitHubReleases({directory:path.join(root,'.local/version-service'),token:githubToken()});
await source.restore();
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
const server=http.createServer(async(req,res)=>{
  if(req.url==='/internal/refresh'&&req.method==='POST') {
    if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return send(res,403,{error:'Acesso local apenas'});
    try {await source.refresh(true);return send(res,200,{refreshed:true});} catch{return send(res,503,{refreshed:false});}
  }
  if (req.method!=='GET') return send(res,405,{error:'Método inválido'});
  const url=new URL(req.url,'http://localhost');
  if (url.pathname==='/health') return send(res,200,{status:'UP',service:'inteliagent-version-service',source:'github',repository:source.repository,stale:source.stale,checkedAt:source.checkedAt});
  if (!['/mobile/releases/check','/mobile/releases/latest.json'].includes(url.pathname)) return send(res,404,{error:'Não encontrado'});
  try {
    const latest=await source.refresh();
    if (url.pathname.endsWith('latest.json')) return latest?send(res,200,latest):send(res,404,{error:'Nenhuma release publicada no GitHub'});
    const severity=versionDecision(latest,url.searchParams.get('version')||'',Number(url.searchParams.get('build')));
    console.info(JSON.stringify({event:'version-check',version:url.searchParams.get('version'),build:Number(url.searchParams.get('build')),severity}));
    send(res,200,{available:severity!=='none',required:severity==='mandatory',severity,release:latest,source:'github',stale:source.stale,checkedAt:source.checkedAt});
  } catch(error) { send(res,error.message==='Invalid installed version'?400:503,{error:error.message==='Invalid installed version'?'Versão instalada inválida':'Consulta ao GitHub temporariamente indisponível'}); }
});
server.listen(Number(process.env.VERSION_SERVICE_PORT||5174),'0.0.0.0',()=>console.info('Version service listening on 0.0.0.0:5174; source GitHub '+source.repository));
const refresh=()=>source.refresh().catch(()=>console.warn('GitHub refresh unavailable; preserving last validated release.'));
void refresh();setInterval(refresh,300000);
