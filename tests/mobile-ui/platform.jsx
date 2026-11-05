import React, { useEffect, useSyncExternalStore } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import {useRef} from 'react';
export {ActivityIndicator, Text};
import glyphs from "../../inteliagent-app/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json";
let current = location.hash.slice(1) || "/atendimento/registroServico";
const listeners = new Set();
const setPath = (value) => {
  current = typeof value === "string" ? value : value.pathname;
  location.hash = current;
  listeners.forEach((cb) => cb());
};
export const usePath = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
export const router = {
  replace: setPath,
  push: setPath,
  navigate: setPath,
  dismissTo: setPath,
  back: () => setPath("/atendimento/registroServico"),
  canGoBack: () => true,
};
export const useFocusEffect = (callback) => useEffect(callback, [callback]);
export const useLocalSearchParams = () => (window.__routeParams || {});
const navigation={setOptions:value=>{window.__navigationOptions=value;}};
export const useNavigation=()=>navigation;
export const useHeaderHeight=()=>56;
export const getValidToken=async(options={})=> {if(options.force) window.__accessToken=window.__renewedToken || 'test-token';return window.__accessToken || 'test-token';};
export const setNotificationConversation=()=>{};
export const registerMessagePush=async()=>false;
export const Paths={cache:{uri:"file:///cache/"},document:{uri:"file:///documents/"}};
export const randomUUID=()=>crypto.randomUUID();
export const manipulateAsync=async uri=>({uri});
export const SaveFormat={JPEG:'jpeg'};
export class File {constructor(uri){this.uri=uri;this.size=128;}}
export const RecordingPresets={HIGH_QUALITY:{}};
export const AudioModule={requestRecordingPermissionsAsync:async()=>({granted:window.__microphoneAllowed!==false})};
export const setAudioModeAsync=async()=>{};
export function useAudioRecorder(options,callback){
 const listener=useRef(callback);listener.current=callback;
 const ref=useRef(null);
 if(!ref.current){const listeners=new Set();const recorder={isRecording:false,uri:'file:///voice.m4a',state:{isRecording:false,durationMillis:1000},listeners,prepareToRecordAsync:async()=>{},record:()=>{recorder.isRecording=true;recorder.state={isRecording:true,durationMillis:1000};listeners.forEach(f=>f());},stop:async()=>{recorder.isRecording=false;recorder.state={isRecording:false,durationMillis:1000};listeners.forEach(f=>f());listener.current?.({isFinished:true,url:recorder.uri});}};ref.current=recorder;}
 return ref.current;
}
export const useAudioRecorderState=recorder=>useSyncExternalStore(callback=>{recorder.listeners.add(callback);return()=>recorder.listeners.delete(callback);},()=>recorder.state);
export const useAudioPlayer=()=>({play:()=>{},pause:()=>{},seekTo:async()=>{}});
export const useAudioPlayerStatus=()=>({playing:false,currentTime:0,duration:1});
export function io(){
 const handlers={},connection={connected:false,on:(name,callback)=>{handlers[name]=callback;return connection;},disconnect:()=>{connection.connected=false;},timeout:()=>connection,emit:(event,payload,callback)=>{
  if(event==='load_messages'){handlers.all_messages?.([]);callback?.(null,{success:true,hasMore:false});}
  if(event==='send_message'){window.__sentMessages=[...(window.__sentMessages||[]),payload];handlers.receive_message?.({id:window.__sentMessages.length,sender:1,recipient:2,text:payload.text,timestamp:new Date().toISOString()});callback?.(null,{success:true});}
 }};setTimeout(()=>{connection.connected=true;handlers.connect?.();},50);return connection;
}
export function Redirect({ href }) {
  useEffect(() => setPath(href), [href]);
  return null;
}
export const SafeAreaView = ({ edges, ...props }) => <View {...props} />;
export const beginUpdateSession = () => {};
export const checkForAppUpdate = async () => {};
export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});
export function MaterialCommunityIcons({ name, size, color }) {
  return (
    <Text
      style={{ fontFamily: "MaterialCommunityIcons", fontSize: size, color }}
    >
      {String.fromCodePoint(glyphs[name] || glyphs.circle)}
    </Text>
  );
}
export const FontAwesome = MaterialCommunityIcons;
export const MD3LightTheme = { colors: {} };
export const configureFonts = () => ({});
export const HelperText = ({ type, children, ...props }) => (
  <Text {...props}>{children}</Text>
);
export const Button = ({ onPress, children, disabled, accessibilityLabel }) => (
  <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
    <Text>{children}</Text>
  </Pressable>
);
export default function DateTimePicker({ value, onChange }) {
  return (
    <input
      aria-label="Escolher data"
      type="date"
      value={value.toISOString().slice(0, 10)}
      onChange={(e) =>
        onChange({ type: "set" }, new Date(e.target.value + "T12:00:00"))
      }
    />
  );
}
export const database = { getAllAsync: async () => window.__routeRows || [] };
export const currentEngine = () => window.__permissionEngine;
export const scheduleSync = () => { window.__scheduledSync = true; };
export const WebView = () => <View accessibilityLabel="Mapa da rota" />;
export const List = {Item: ({title, description, onPress}) => <Pressable onPress={onPress}><Text>{title}</Text><Text>{description}</Text></Pressable>};
export const useFinishVisit = () => ({
  busy: false,
  error: "",
  finish: () => {
    window.__saved = (window.__saved || 0) + 1;
  },
});
export const launchImageLibraryAsync = async () => window.__imagePick || ({ canceled: true });
export const useMediaLibraryPermissions = () => [{ granted: true }, () => {}];
export const login = async () => {
  throw Error("Preview only");
};
export const insertUsuario = async () => {};
export const validateUsuariosCede = async () => ({
  data: [{ id: 3, nome: "Sede de teste" }],
});
export const enviaEmailValidacaoCodigo = async () => ({ status: 200 });
export const validateRegisterUser = async () => ({ status: 200 });
export const registrarUsuario = async () => ({ status: 201 });
export const uriToBase64 = async () => "";

export const invalidateAccessToken=async()=>{};

export async function loadProfile(){return window.__sessionStore?.getState().profile;}
export async function saveProfilePhoto(uri){if(window.__profileSaveFails)throw Error('offline');const state=window.__sessionStore.getState();state.setProfile({...state.profile,fotoUri:uri});window.__profilePhotoSaved=true;}
export async function removeProfilePhoto(){const state=window.__sessionStore.getState();state.setProfile({...state.profile,fotoUri:null});window.__profilePhotoRemoved=true;}
export const requestMediaLibraryPermissionsAsync=async()=>({granted:window.__photoAllowed!==false});
