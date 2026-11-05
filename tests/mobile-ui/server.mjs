import { createServer } from "../../inteliagent-webapp/node_modules/vite/dist/node/index.js";
import react from "../../inteliagent-webapp/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "node:path";
const root = path.resolve("tests/mobile-ui"),
  web = path.resolve("inteliagent-webapp/node_modules"),
  app = path.resolve("inteliagent-app/src");
const alias = [
  {find: /^(?:\.\/tokenStore|@root\/service\/default\/tokenStore)$/, replacement: root + "/platform.jsx"},
  {find: /^react-native-svg$/, replacement: root + "/svg.jsx"},
  { find: /^react(\/.*)?$/, replacement: web + "/react$1" },
  { find: /^react-dom(.*)$/, replacement: web + "/react-dom$1" },
  { find: /^react-native$/, replacement: web + "/react-native-web" },
  { find: /^expo-router\/react-navigation$/, replacement: root + "/platform.jsx" },
  ...[
    "@root/service/updates/checkAppUpdate",
    "@root/service/usuario/profileService",
    "@root/service/notifications/messagePush",
    "expo-router",
    "react-native-safe-area-context",
    "@expo/vector-icons",
    "react-native-paper",
    "@react-native-community/datetimepicker",
    "expo-image-picker",
    "react-native-webview",
    "expo-audio",
    "expo-image-manipulator",
    "expo-file-system",
    "expo-crypto",
    "socket.io-client",
  ].map((find) => ({ find, replacement: root + "/platform.jsx" })),
  ...[
    "@root/utils/imageUtil",
    "@root/offline/database",
    "@root/offline/runtime",
    "@root/service/default/tokenStore",
    "@root/hooks/useFinishVisit",
    "@root/service/usuario/usuarioService",
    "@root/db/usuarioPersistence",
    "@root/service/cede/cedeService",
  ].map((find) => ({ find, replacement: root + "/platform.jsx" })),
  { find: "@root", replacement: app },
];
export const server = await createServer({
  configFile: false,
  root,
  plugins: [
    {
      name: "native-image-requires",
      enforce: "pre",
      transform(code, id) {
        if (id.replaceAll("\\", "/").startsWith(app.replaceAll("\\", "/")))
          return code.replace(
            /require\((["'])([^"']+\.(?:png|jpg|ttf))\1\)/g,
            (_, q, file) =>
              `({uri:new URL(${JSON.stringify(file)},import.meta.url).href})`,
          );
      },
    },
    react(),
  ],
  resolve: {
    alias,
    extensions: [".web.js", ".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
    dedupe: ["react", "react-dom"],
  },
  define: { __DEV__: "true", "process.env": {} },
  server: {
    port: 5184,
    host: "127.0.0.1",
    strictPort: true,
    fs: { allow: [path.resolve(".")] },
  },
});
await server.listen();
console.log("Native UI preview: http://127.0.0.1:5184");
