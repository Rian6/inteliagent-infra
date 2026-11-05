import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const handlers = {},
  storage = new Map(),
  shown = [],
  opened = [];
const self = {
  location: { origin: "https://inteliagent.test" },
  addEventListener: (name, fn) => (handlers[name] = fn),
  skipWaiting: async () => {},
  clients: {
    claim: async () => {},
    matchAll: async () => [],
    openWindow: async (url) => opened.push(url),
  },
  registration: {
    showNotification: async (title, data) => shown.push({ title, ...data }),
    getNotifications: async () => [],
  },
};
const caches = {
  open: async () => ({
    match: async (key) => storage.get(key)?.clone(),
    put: async (key, value) => storage.set(key, value),
  }),
};
vm.runInNewContext(
  fs.readFileSync("inteliagent-webapp/public/message-push-sw.js", "utf8"),
  { self, caches, URL, Response, JSON, Number },
);
async function dispatch(type, value) {
  let pending;
  handlers[type]({ ...value, waitUntil: (promise) => (pending = promise) });
  await pending;
}
const payload = { data: { senderId: 2, recipientId: 3, messageId: 10 } };
await dispatch("message", {
  data: { type: "MESSAGE_PUSH_ACCOUNT", userId: 3 },
});
await dispatch("push", { data: { json: () => payload } });
assert.equal(shown.length, 1);
await dispatch("push", {
  data: { json: () => ({ data: { ...payload.data, recipientId: 99 } }) },
});
assert.equal(shown.length, 1);
await dispatch("notificationclick", {
  notification: { data: shown[0].data, close() {} },
});
assert.deepEqual(opened, ["https://inteliagent.test/mensagens?with=2"]);
await dispatch("message", {
  data: { type: "MESSAGE_PUSH_ACCOUNT", userId: 4 },
});
await dispatch("message", {
  data: { type: "MESSAGE_PUSH_ACCOUNT", userId: null, previousUserId: 3 },
});
await dispatch("push", {
  data: { json: () => ({ data: { ...payload.data, recipientId: 4 } }) },
});
assert.equal(shown.length, 2, "old account cleanup cannot disable a new login");
await dispatch("message", {
  data: { type: "MESSAGE_PUSH_ACCOUNT", userId: null, previousUserId: 4 },
});
await dispatch("push", {
  data: { json: () => ({ data: { ...payload.data, recipientId: 4 } }) },
});
assert.equal(
  shown.length,
  2,
  "logout blocks notifications for the prior account",
);
console.log(
  "Web push worker passed: private recipient gating, safe conversation URL, account switch and logout.",
);
