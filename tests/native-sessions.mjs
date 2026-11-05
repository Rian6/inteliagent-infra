import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Credentials, ACCESS_KEY } from '../inteliagent-app/src/offline/credentials.ts';
const account=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8'));
const base=account.webUrl;
async function post(path,data) {
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!response.ok){const error=new Error('Session HTTP '+response.status);error.status=response.status;throw error;}
  return response.status===204?null:response.json();
}
const user=await post('/api/user/login',{email:account.mobile.email,senha:account.mobile.password});
assert.equal(user.refreshToken.length,43);
const values=new Map();
const store={get:async key=>values.get(key)||null,set:async(key,value)=>values.set(key,value),remove:async key=>values.delete(key)};
let renewals=0;
const renew=async refreshToken=>{renewals++;return post('/api/user/refresh',{refreshToken});};
const initial=new Credentials({store,renew});
await initial.save(user.token,user.refreshToken);
values.set('offline-work','preserved');
// Recreate the same manager used by SecureStore; an expired access credential
// must be recoverable without a password and without destroying offline work.
const reopened=new Credentials({store,renew});
values.set(ACCESS_KEY,'expired-access');
const tokens=await Promise.all(Array.from({length:10},()=>reopened.valid()));
assert.equal(renewals,1);assert.ok(tokens.every(token=>token===tokens[0]));
const protectedResponse=await fetch(base+'/api/planejamento-list',{headers:{Authorization:'Bearer '+tokens[0]}});
assert.equal(protectedResponse.status,200);
await post('/api/user/logout',{refreshToken:user.refreshToken});
await reopened.invalidate(tokens[0]);
await assert.rejects(reopened.valid(),error=>error.status===401);
assert.equal(values.get('offline-work'),'preserved');
console.log('Native credentials / live server passed: re-created credential store, expired access, shared renewal, authenticated request, server logout and offline preservation.');
