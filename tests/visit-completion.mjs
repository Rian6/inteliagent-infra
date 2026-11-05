import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from '../inteliagent-app/node_modules/esbuild/lib/main.js';
import * as flow from '../inteliagent-app/src/data/visit-flow.ts';
import { newVisit } from '../inteliagent-app/src/offline/visits.ts';

const compile = async entry => (await build({entryPoints:[entry],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',external:['@root/*'],jsx:'automatic'})).outputFiles[0].text;
const execute = (code, modules) => {
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require:id=>{assert.ok(id in modules,id);return modules[id];}});
  return module.exports;
};
let values=[],slot=0,saved=[],navigation=[],saveFailure=false,releaseSave;
const completedVisit=()=>newVisit({id:'visit-a',idPlanejamento:'plan-a',nome:'Rua A',situacaoVisita:1,__completed:['index']});
const state={visita:completedVisit(),saving:false,setSaving(value){this.saving=value;},resetVisita(){this.visita=newVisit();this.saving=false;}};
const hooks=execute(await compile('inteliagent-app/src/hooks/useFinishVisit.ts'),{
  react:{useState:initial=>{const index=slot++;values[index]??=initial;return [values[index],value=>{values[index]=value;}];}},
  'expo-router':{router:{replace:target=>navigation.push(target)}},
  '@root/context/visitaContext':{getState:()=>state},
  '@root/data/visit-flow':flow,
  '@root/db/visitaPersistence':{inserirVisita:async visit=>{
    saved.push(visit);if(saveFailure)throw Error('Falha de armazenamento');
    await new Promise(resolve=>{releaseSave=resolve;});
  }},
});
const render=()=>{slot=0;return hooks.useFinishVisit();};
const pending=render().finish();
assert.equal(state.saving,true);
assert.equal(navigation.length,0,'completion is not shown before persistence succeeds');
await render().finish();assert.equal(saved.length,1,'double taps cannot save twice');
releaseSave();await pending;
assert.equal(navigation[0].pathname,'/atendimento/visitaConcluida');
assert.equal(navigation[0].params.idPlanejamento,'plan-a');
assert.equal(state.visita.id,'visit-a','the focused form keeps its data until navigation completes, preventing the stage guard from redirecting');
state.visita=completedVisit();saveFailure=true;navigation=[];
await render().finish();
assert.equal(navigation.length,0,'failed saves stay in the form');
assert.equal(state.visita.id,'visit-a','failed saves keep the visit data');
assert.match(render().error,/armazenamento/);
assert.equal(state.saving,false);

let hardwareBack,removed=false,planId='plan-a';
const jsx=(type,props)=>({type,props});
const screen=execute(await compile('inteliagent-app/src/app/atendimento/visitaConcluida.tsx'),{
  react:{useCallback:callback=>callback,useEffect:callback=>callback()},
  'react/jsx-runtime':{jsx,jsxs:jsx},
  'react-native':{View:'View',Platform:{OS:'android'},BackHandler:{addEventListener:(_,callback)=>{hardwareBack=callback;return {remove:()=>{removed=true;}};}}},
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
  'expo-router':{router:{dismissTo:target=>navigation.push(target),replace:target=>navigation.push(target)},useLocalSearchParams:()=>({idPlanejamento:planId}),useFocusEffect:callback=>{screenCleanup=callback();}},
  '@expo/vector-icons':{MaterialCommunityIcons:'Icon'},
  '@root/components/ui':{Button:'Button',Heading:'Heading',Text:'Text'},
  '@root/theme':{colors:{}},
  '@root/context/visitaContext':{getState:()=>state},
});
let screenCleanup;
const flatten=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(flatten)];
const tree=screen.default();
assert.notEqual(state.visita.id,'visit-a','the completion screen clears the draft only after the form route has been replaced');
flatten(tree).find(node=>node.props?.testID==='visit-completed-back').props.onPress();
assert.equal(navigation.at(-1).pathname,'/atendimento/visitas');
assert.equal(navigation.at(-1).params.idPlanejamento,'plan-a');
navigation=[];assert.equal(hardwareBack(),true);
assert.equal(navigation[0].params.idPlanejamento,'plan-a','Android back returns to the same planning');
screenCleanup();assert.equal(removed,true);
planId=undefined;screen.default();hardwareBack();
assert.equal(navigation.at(-1),'/tabs/application/planning','missing planning never reopens the completed form');
console.log('Visit completion passed: save-before-navigation, duplicate protection, failure recovery, planning identity, button and Android back.');
