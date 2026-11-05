import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { mobileReleaseMiddleware } from '../inteliagent-webapp/server/mobile-releases.mjs';
const directory=await mkdtemp(path.join(os.tmpdir(),'inteliagent-releases-'));
const release={version:'1.0.2',versionCode:3,downloadUrl:'/mobile/releases/inteliagent-3-123456abcdef.apk'};
let published=false;
const middleware=mobileReleaseMiddleware(directory,async()=>({status:published?200:404,text:async()=>JSON.stringify(published?release:{error:'No release'})}));
const server=http.createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
try {
  assert.equal((await fetch(origin+'/mobile/releases/latest.json')).status,404);
  await writeFile(path.join(directory,'latest.json'),JSON.stringify(release));
  await writeFile(path.join(directory,'inteliagent-3-123456abcdef.apk'),Buffer.from('PK123456'));
  published=true;
  const manifest=await fetch(origin+'/mobile/releases/latest.json');
  assert.equal(manifest.headers.get('cache-control'),'no-store');assert.deepEqual(await manifest.json(),release);
  for(const url of ['/mobile/releases/latest.apk','/inteliagent-push-dev.apk',release.downloadUrl]){
    const response=await fetch(origin+url);
    assert.equal(response.headers.get('content-type'),'application/vnd.android.package-archive');
    assert.match(response.headers.get('content-disposition'),/attachment; filename=".*\.apk"/);
    assert.equal((await response.arrayBuffer()).byteLength,8);
  }
  const head=await fetch(origin+'/mobile/releases/latest.apk',{method:'HEAD'});
  assert.equal(head.headers.get('content-length'),'8');assert.equal((await head.arrayBuffer()).byteLength,0);
  const range=await fetch(origin+release.downloadUrl,{headers:{Range:'bytes=2-4'}});
  assert.equal(range.status,206);assert.equal(await range.text(),'123');
  assert.equal((await fetch(origin+release.downloadUrl,{headers:{Range:'bytes=99-'}})).status,416);
  assert.equal((await fetch(origin+'/mobile/releases/not-an-apk.txt')).status,404);
  console.log('APK distribution passed: MIME, filename, legacy URL, version-service proxy, HEAD, resumed downloads and invalid paths.');
}finally{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
