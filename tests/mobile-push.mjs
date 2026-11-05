import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "../inteliagent-app/node_modules/esbuild/lib/main.js";

const result = await build({entryPoints:["inteliagent-app/src/service/notifications/messagePush.ts"],bundle:true,write:false,format:"cjs",platform:"node",packages:"external",external:["../default/defaultHTTPService","@root/*"],plugins:[{name:"native-notifications",setup(builder){
  builder.onResolve({filter:/^expo-notifications$/},()=>({path:"notifications",namespace:"mock"}));
  builder.onLoad({filter:/.*/,namespace:"mock"},()=>({contents:"module.exports = globalThis.nativeNotifications;"}));
}}]});
const native = { Platform:{OS:"android"}, AppState:{currentState:"active"} };
const constants = {executionEnvironment:"bare",expoConfig:{extra:{eas:{projectId:"15c0d89f-a3ef-4ea0-bb25-346c6f119af7"}}}};
const state = {profile:{id:7}};
let permission = {granted:false,canAskAgain:true};
let prompts=0, tokenCalls=0, failure="";
const registrations=[];
const notifications = {
  setNotificationHandler(value){this.handler=value;}, AndroidImportance:{HIGH:4},
  setNotificationChannelAsync:async()=>{},
  getPermissionsAsync:async()=>permission,
  requestPermissionsAsync:async()=>{prompts++;return permission={granted:true,canAskAgain:true};},
  getExpoPushTokenAsync:async()=>{tokenCalls++;if(failure==="token")throw Error("provider offline");return {data:"ExpoPushToken[test-token-1234]"};},
};
const modules = {
  "react-native":native,
  "expo-modules-core":{requireOptionalNativeModule:()=>({})},
  "expo-constants":constants,
  "@react-native-async-storage/async-storage":{getItem:async()=>"installation",setItem:async()=>{}},
  "expo-crypto":{randomUUID:()=>"uuid"},
  "../default/defaultHTTPService":{api:{put:async(url,body)=>{if(failure==="server")throw Error("503");registrations.push({url,body});}}},
  "@root/constants/urls":{SOCKETSERVICEURL:"http://localhost:5000"},
  "@root/context/sessionContext":{useSessionStore:{getState:()=>state}},
};
const module = {exports:{}};
vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,__DEV__:false,nativeNotifications:notifications,require:id=>{assert.ok(id in modules,id);return modules[id];},process:{env:{}},console});
const push = module.exports;
push.setMessageNotificationHandler(notifications);
push.setNotificationConversation("2");
const decision = async recipientId => notifications.handler.handleNotification({request:{content:{data:{senderId:2,recipientId}}}});
assert.equal((await decision(7)).shouldShowBanner,false,"do not interrupt open conversation");
native.AppState.currentState="background";
assert.equal((await decision(7)).shouldShowBanner,true,"notify when backgrounded with that conversation open");
assert.equal((await decision(8)).shouldShowBanner,false,"do not show another account's messages");
state.profile=null;
assert.equal((await decision(7)).shouldShowBanner,false);
state.profile={id:7};constants.executionEnvironment="storeClient";
assert.equal(push.nativePushAvailable(),false);
assert.equal(await push.registerMessagePush(),false);
await assert.rejects(push.registerMessagePush(true),/Expo Go/);
constants.executionEnvironment="bare";
assert.equal(await push.registerMessagePush(),false,"background refresh must not open permission dialog");
assert.equal(prompts,0);
assert.deepEqual(await Promise.all([push.registerMessagePush(true),push.registerMessagePush(true),push.registerMessagePush()]),[true,true,true]);
assert.equal(prompts,1,"concurrent login/foreground/token events share one permission dialog");
assert.equal(tokenCalls,1);
assert.equal(registrations.length,1);
assert.equal(registrations[0].body.userId,7);
permission={granted:false,canAskAgain:false};
assert.equal(await push.registerMessagePush(true),false);
assert.equal(prompts,1,"blocked permission must use system settings instead of prompting again");
permission={granted:true,canAskAgain:true};failure="token";
await assert.rejects(push.registerMessagePush(true),/Google\/Expo/);
failure="server";
await assert.rejects(push.registerMessagePush(),/servidor/);
failure="";
assert.equal(await push.registerMessagePush(),true,"failed registration must allow automatic retry");
assert.equal(prompts,1,"existing permission does not require another prompt");
state.profile=null;
assert.equal(await push.registerMessagePush(true),false,"no permission request before login");
permission={granted:false,canAskAgain:true};constants.executionEnvironment="storeClient";
const beforeStartupPrompts=prompts;
const beforeStartupRegistrations=registrations.length;
assert.deepEqual(await Promise.all([push.ensureNotificationPermission(true),push.ensureNotificationPermission(true)]),[true,true]);
assert.equal(prompts,beforeStartupPrompts+1,"startup display permission is independent of login and remote push availability");
assert.equal(registrations.length,beforeStartupRegistrations,"display permission alone must not register an unauthenticated device");
await push.ensureNotificationPermission(true);
assert.equal(prompts,beforeStartupPrompts+1,"already granted permission must not display another dialog");
permission={granted:false,canAskAgain:true};
notifications.requestPermissionsAsync=async()=>{prompts++;return permission={granted:false,canAskAgain:true};};
const beforeDenialPrompts=prompts;
assert.deepEqual(await Promise.all([push.ensureNotificationPermission(true),push.ensureNotificationPermission(true)]),[false,false]);
assert.equal(prompts,beforeDenialPrompts+1,"simultaneous startup/login requests must not repeat a denied dialog");
notifications.setNotificationChannelAsync=async()=>{throw Error("Native channel NullPointerException");};
notifications.requestPermissionsAsync=async()=>{prompts++;return permission={granted:true,canAskAgain:true};};
permission={granted:false,canAskAgain:true};
const beforeChannelFailurePrompts=prompts;
assert.equal(await push.ensureNotificationPermission(true),true,"native channel failure must not block permission request");
assert.equal(prompts,beforeChannelFailurePrompts+1);
console.log("Native push passed: app-opening permission without login, runtime independence, duplicate/denied prompts, concurrent registration, recovery, conversation suppression and recipient isolation.");
