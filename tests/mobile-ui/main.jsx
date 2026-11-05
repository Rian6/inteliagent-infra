import React from "react";
import { createRoot } from "react-dom/client";
import { View, Text, Pressable } from "react-native";
import { AppUpdateBanner, AppUpdateGate } from "@root/components/updates/AppUpdateBanner";
import { useUpdateStore } from "@root/service/updates/updateStore";
window.__updatesStore=useUpdateStore;
window.__underlyingClicks=0;
const UpdateFixture=()=> <View style={{height:'100vh'}}><AppUpdateBanner/><AppUpdateGate><View style={{padding:20}}><Text>Conteúdo do aplicativo</Text><Pressable testID="underlying-action" onPress={()=>window.__underlyingClicks++}><Text>Continuar atividade</Text></Pressable></View></AppUpdateGate></View>;
import { usePath } from "./platform";
import General from "@root/app/atendimento/registroServico/index";
import Inspection from "@root/app/atendimento/registroServico/inspecao";
import Sample from "@root/app/atendimento/registroServico/amostra";
import Treatment from "@root/app/atendimento/registroServico/tratamento";
import Review from "@root/app/atendimento/registroServico/revisao";
import VisitCompleted from "@root/app/atendimento/visitaConcluida";
import Login from "@root/app/login/index";
import Register from "@root/app/register/index";
import Workplace from "@root/app/register/aprovacaoId";
import Verification from "@root/app/register/verificacao";
import Confirm from "@root/app/register/confirmaCadastroScreen";
import VisitRoute from "@root/app/atendimento/rotaVisita";
import ChatMessages from "@root/app/chat-message/index";
import ChatMedia from "@root/components/chat/ChatMedia";
const ChatImageFixture = () => <ChatMedia attachment={window.__imageFixture || {id:"fixture",kind:"image",mime:"image/png",name:"foto.png",url:"/attachments/00000000-0000-4000-8000-000000000001"}} />;
import ChatContacts from "@root/app/tabs/application/chat/index";
import { ContactAvatar } from "@root/components/chat/ChatUI";
const ContactPhotoFixture = () => {
  const [photoUrl, setPhotoUrl] = React.useState("/users/2/photo?v=first");
  window.__setContactPhoto = setPhotoUrl;
  return <ContactAvatar name="Contato Web" photoUrl={photoUrl} />;
};
import Profile from "@root/app/profile/index";
import {useSessionStore} from "@root/context/sessionContext";
import store from "@root/context/visitaContext";
import userStore from "@root/context/userContext";
store
  .getState()
  .initializeVisita({ id: "ui-preview", idPlanejamento: "ui-preview-plan" });
window.__visitStore = store;
window.__userStore = userStore;
window.__sessionStore = useSessionStore;
function App() {
  const route = usePath();
  const screens = {
    "/updates": UpdateFixture,
    "/atendimento/visitaConcluida": VisitCompleted,
    "/login": Login,
    "/chat-message": ChatMessages,
    "/chat-image": ChatImageFixture,
    "/chat-contacts": ChatContacts,
    "/contact-photo": ContactPhotoFixture,
    "/profile": Profile,
    "/atendimento/rotaVisita": VisitRoute,
    "/register": Register,
    "/register/aprovacaoId": Workplace,
    "/register/verificacao": Verification,
    "/register/confirmaCadastroScreen": Confirm,
    "/atendimento/registroServico": General,
    "/atendimento/registroServico/inspecao": Inspection,
    "/atendimento/registroServico/amostra": Sample,
    "/atendimento/registroServico/tratamento": Treatment,
    "/atendimento/registroServico/revisao": Review,
  };
  const Screen = screens[route] || General;
  return <Screen key={route} />;
}
createRoot(document.getElementById("root")).render(<App />);
