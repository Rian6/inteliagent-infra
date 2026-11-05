import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { OfflineEngine } from "../inteliagent-app/src/offline/engine.ts";
import { initializeDatabase } from "../inteliagent-app/src/offline/schema.ts";
import { Visits, newVisit } from "../inteliagent-app/src/offline/visits.ts";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { user, planId } = JSON.parse(input),
  native = new DatabaseSync(":memory:");
const connection = {
  execAsync: async (sql) => native.exec(sql),
  runAsync: async (sql, args = []) => native.prepare(sql).run(...args),
  getFirstAsync: async (sql, args = []) =>
    native.prepare(sql).get(...args) || null,
  getAllAsync: async (sql, args = []) => native.prepare(sql).all(...args),
};
const db = {
  ...connection,
  transaction: async (callback) => {
    native.exec("BEGIN IMMEDIATE");
    try {
      const result = await callback(connection);
      native.exec("COMMIT");
      return result;
    } catch (error) {
      native.exec("ROLLBACK");
      throw error;
    }
  },
};
await initializeDatabase(db);
let online = true;
const device = randomUUID();
async function request(path, data) {
  const response = await fetch(`http://127.0.0.1:8090${path}`, {
    method: data ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const text = await response.text(),
    result = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`Sync HTTP ${response.status}`);
    error.status = response.status;
    error.data = result;
    throw error;
  }
  return result;
}
const engine = new OfflineEngine({
  db,
  user,
  uuid: randomUUID,
  transport: {
    online: async () => online,
    authorized: async () => true,
    upload: (batch) => request("/api/sync", batch),
    download: (args) =>
      request(
        `/api/consumer/${user.id}?clientId=${device}&isLoadFull=${args.full}&offset=${args.offset}&downloadId=${args.downloadId}`,
      ),
    confirm: (args) =>
      request(
        `/api/consumer-confirm/${user.id}?downloadId=${args.downloadId}`,
        args.tables,
      ),
  },
});
try {
  await engine.sync();
  assert.ok(
    await db.getFirstAsync("SELECT ID FROM PLANEJAMENTO WHERE ID=?", [planId]),
  );
  online = false;
  const visits = new Visits(engine),
    id = randomUUID();
  const visit = newVisit({
    id,
    idPlanejamento: planId,
    nome: "Endereço offline",
    numero: "123",
    tipoVisita: 'R', lado: 'D', tipoImovel: 'Residencial',
    depositosInspecionados: {1:7,2:3},
    contemAmostra: true,
    amostra: { numeroInicio: 3, numeroFinal: 5, quantidade: 3, imagens: ['data:image/jpeg;base64,/9j/2Q=='] },
    contemTratamento: true,
    tratamento: { imoveisTratados: 1 },
    itensInspecionados: [1, 2],
  });
  await visits.drafts.save(visit);
  assert.equal(await visits.save(visit), id);
  assert.equal((await engine.status()).pending, 5);
  assert.deepEqual(await engine.sync(), { offline: true });
  online = true;
  await engine.sync();
  assert.equal((await engine.status()).pending, 0);
  assert.equal((await engine.status()).rejected, 0);
  const response = await fetch(`http://127.0.0.1:8070/api/visita/${id}/ficha`, {headers:{Authorization:`Bearer ${user.token}`}});
  assert.equal(response.status,200);
  const details = await response.json();
  assert.equal(details.visita.TIPO_VISITA,'R'); assert.equal(details.visita.LADO,'D');
  assert.equal(details.inspecao.find(row=>row.TIPO===1).NUMERO_DEPOSITOS,7);
  assert.deepEqual(JSON.parse(details.amostra[0].IMAGENS_JSON),visit.amostra.imagens);
  await visits.save({
    ...visit,
    nome: "Editado sem duplicar",
    itensInspecionados: [2],
    contemAmostra: false,
  });
  await engine.sync();
  assert.equal((await engine.status()).pending, 0);
  assert.equal((await engine.status()).conflicts, 0);
  assert.equal(
    (
      await db.getFirstAsync(
        "SELECT COUNT(*) AS n FROM TRATAMENTO WHERE ID_VISITA=?",
        [id],
      )
    ).n,
    1,
  );
  assert.equal((await visits.load(id)).nome, "Editado sem duplicar");
  console.log("Mobile SQLite / Java / MySQL round trip passed.");
} finally {
  engine.dispose();
  native.close();
}
