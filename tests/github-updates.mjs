import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from '../inteliagent-app/node_modules/esbuild/lib/main.js';
import { GitHubReleases,normalizeGitHubRelease,versionDecision } from '../services/github-releases.mjs';
const metadata={packageName:'com.rian3054.inteliagentapp',version:'1.0.2',versionCode:4,sha256:'a'.repeat(64),size:100,notes:'Correções'};
const apkName='inteliagent-4-aaaaaaaaaaaa.apk';
const github={tag_name:'v1.0.2+build.4',draft:false,prerelease:false,html_url:'https://github.com/Rian6/inteliagent-app/releases/tag/v1.0.2%2Bbuild.4',assets:[
  {id:1,name:'latest.json',state:'uploaded',size:400,browser_download_url:'https://github.com/Rian6/inteliagent-app/releases/download/v1.0.2%2Bbuild.4/latest.json'},
  {id:2,name:apkName,state:'uploaded',size:100,digest:'sha256:'+metadata.sha256,browser_download_url:'https://github.com/Rian6/inteliagent-app/releases/download/v1.0.2%2Bbuild.4/'+apkName},
]};
const release=normalizeGitHubRelease(github,metadata);
assert.ok(release);assert.equal(release.source,'github');
assert.equal(versionDecision(release,'0.9.0',1),'mandatory');
assert.equal(versionDecision(release,'1.0.1',3),'persistent');
assert.equal(versionDecision(release,'1.0.2',3),'normal');
assert.equal(versionDecision({...release,version:'1.1.0'},'1.0.2',3),'mandatory');
assert.equal(versionDecision({...release,version:'2.0.0'},'1.0.2',3),'mandatory');
assert.equal(versionDecision(release,'1.0.2',4),'none');
assert.equal(versionDecision(release,'2.0.0',1),'none');
assert.throws(()=>versionDecision(release,'bad',3),/Invalid/);
assert.equal(normalizeGitHubRelease({...github,draft:true},metadata),null);
assert.equal(normalizeGitHubRelease({...github,prerelease:true},metadata),null);
assert.equal(normalizeGitHubRelease(github,{...metadata,size:101}),null);
assert.equal(normalizeGitHubRelease(github,{...metadata,sha256:'b'.repeat(64)}),null);
let fail=false,calls=0;
const source=new GitHubReleases({fetcher:async url=>{
  calls++;if(fail)throw Error('offline');return {ok:true,json:async()=>url.startsWith('https://api.github.com/')?[{...github,draft:true},github]:metadata};
}});
assert.equal((await source.refresh(true)).versionCode,4);
const cachedCalls=calls;await source.refresh();assert.equal(calls,cachedCalls);
fail=true;assert.equal((await source.refresh(true)).versionCode,4);assert.equal(source.stale,true);

const bundled=await build({entryPoints:['inteliagent-app/src/service/updates/checkAppUpdate.ts'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',external:['@root/*']});
let state,store,clock=1000000,requests=0,offline=false,available=release;
const storage=new Map();
const create=initialize=>{
  state=initialize();store=selector=>selector?selector(state):state;
  store.getState=()=>state;store.setState=value=>{state={...state,...value};};return store;
};
const modules={
  zustand:{create},'react-native':{Platform:{OS:'android'}},
  'expo-constants':{expoConfig:{version:'9.9.9',android:{versionCode:999}}},
  'expo-application':{nativeApplicationVersion:'1.0.2',nativeBuildVersion:'3'},
  '@react-native-async-storage/async-storage':{getItem:async key=>storage.get(key),setItem:async(key,value)=>storage.set(key,value),removeItem:async key=>storage.delete(key)},
  '@root/constants/urls':{APP_RELEASE_URL:'http://localhost:5174/mobile/releases/latest.json'},
};
const module={exports:{}};
vm.runInNewContext(bundled.outputFiles[0].text,{
  module,exports:module.exports,__DEV__:false,require:id=>{assert.ok(id in modules,id);return modules[id];},
  fetch:async url=>{requests++;assert.match(url,/version=1.0.2&build=3/);if(offline)throw Error('offline');return {ok:true,json:async()=>({source:'github',available:true,release:available})};},
  Date:class extends Date {static now(){return clock;}},URL,AbortController,setTimeout,clearTimeout,
});
const client=module.exports;
assert.equal(client.installedRelease().version,'1.0.2','release version comes from the native package, not Expo Constants');
assert.equal(client.installedRelease().code,3,'release build comes from expo-application; Constants does not expose it');
modules['expo-application'].nativeApplicationVersion=null;
modules['expo-application'].nativeBuildVersion=null;
assert.equal(client.installedRelease().code,999,'embedded config is the fallback when native package information is unavailable');
assert.equal(client.installedRelease().version,'9.9.9');
modules['expo-application'].nativeApplicationVersion='1.0.2';
modules['expo-application'].nativeBuildVersion='3';
await client.checkForAppUpdate(true);assert.equal(state.severity,'normal');
await client.checkForAppUpdate();assert.equal(requests,1,'foreground checks are throttled');
store.setState({dismissedBuild:4});client.beginUpdateSession();assert.equal(state.dismissedBuild,null);
await client.checkForAppUpdate(true);assert.equal(requests,2,'every login checks even within the throttle window');
available={...release,version:'1.0.3',versionCode:5};await client.checkForAppUpdate(true);assert.equal(state.severity,'persistent');
available={...release,version:'1.1.0',versionCode:6};await client.checkForAppUpdate(true);assert.equal(state.severity,'mandatory');
offline=true;await client.checkForAppUpdate(true);assert.equal(state.severity,'mandatory','offline request cannot bypass known required update');

const ui=await build({entryPoints:['inteliagent-app/src/components/updates/AppUpdateBanner.tsx'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',external:['@root/*'],jsx:'automatic'});
const treeModule={exports:{}},downloads=[];
const jsx=(type,props)=>({type,props});
const uiModules={'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Text:'Text',View:'View',Pressable:'Pressable',StyleSheet:{create:value=>value},Linking:{openURL:async url=>downloads.push(url)}},'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'@root/service/updates/updateStore':{useUpdateStore:store}};
vm.runInNewContext(ui.outputFiles[0].text,{module:treeModule,exports:treeModule.exports,require:id=>{assert.ok(id in uiModules,id);return uiModules[id];}});
const flatten=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(flatten)];
const render=()=>treeModule.exports.AppUpdateBanner();
store.setState({release,severity:'normal',dismissedBuild:null});
let nodes=flatten(render());
nodes.find(node=>node.props?.accessibilityLabel==='Ocultar aviso até o próximo login').props.onPress();
assert.equal(render(),null,'build warning can be dismissed for the session');
client.beginUpdateSession();assert.ok(render(),'build warning returns on login');
store.setState({severity:'persistent'});assert.ok(render());
assert.ok(!flatten(render()).some(node=>node.props?.accessibilityLabel==='Ocultar aviso até o próximo login'),'patch warning has no dismiss button');
store.setState({severity:'mandatory'});
assert.ok(flatten(treeModule.exports.AppUpdateGate({children:'app'})).some(node=>node.props?.pointerEvents==='none'),'required update blocks app interactions');
assert.ok(!flatten(render()).some(node=>node.props?.accessibilityLabel==='Ocultar aviso até o próximo login'));
await flatten(render()).find(node=>node.props?.accessibilityLabel==='Atualizar aplicativo').props.onPress();
assert.equal(downloads[0],release.downloadUrl);
console.log('GitHub updates passed: published assets only, integrity, major/minor blocking, persistent patch banner, dismissible build/session reset, login checks and offline requirement retention.');
