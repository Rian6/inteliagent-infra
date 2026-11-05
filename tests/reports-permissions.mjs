import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID as uuid } from "node:crypto";
const account = JSON.parse(
    fs.readFileSync(".local/test-accounts.json", "utf8"),
  ),
  agent = JSON.parse(
    fs.readFileSync(".local/agent-permissions-test.json", "utf8"),
  );
async function request(port, path, user, body, method) {
  const r = await fetch(`http://127.0.0.1:${port}` + path, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Authorization: "Bearer " + user.token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  const t = await r.text();
  try {
    data = JSON.parse(t);
  } catch {
    data = t;
  }
  return { status: r.status, data };
}
const login = async (a) => {
  const r = await request(8080, "/api/user/login", null, {
    email: a.email,
    senha: a.password,
  });
  assert.equal(r.status, 200);
  return r.data;
};
const admin = await login(account.mobile),
  user = await login(agent);
assert.equal(user.role, "AGENT");
const set = async (createPlanning, editPlanning) => {
  const r = await request(
    8080,
    "/api/user/agent-permissions/" + agent.id,
    admin,
    { createPlanning, editPlanning },
    "PUT",
  );
  assert.equal(r.status, 200);
};
const plan = {
  uuid: uuid(),
  nomeRegiao: "Validação PDF e permissões",
  zona: "Urbana",
  situacao: 3,
  idCidade: 4104808,
  idCategoria: 10001,
  atividade: 2,
  tipo: 1,
  ciclo: 0,
  ano: "2026-01-01",
  catalogoVersao: "PNCD-FAD-IBGE-v1",
  boletimJson: JSON.stringify({
    codigoLocalidade: "001",
    supervisorNome: "Supervisora de campo",
  }),
};
await set(false, false);
assert.equal(
  (await request(8070, "/api/planejamento/salvar", user, plan)).status,
  403,
);
assert.equal(
  (await request(8080, "/api/user/agent-permissions", user)).status,
  403,
);
await set(true, false);
assert.equal(
  (await request(8080, "/api/user/permissions", user)).data.createPlanning,
  true,
);
assert.equal(
  (await request(8070, "/api/planejamento/salvar", user, plan)).status,
  200,
);
assert.equal(
  (await request(8070, "/api/planejamento/salvar", user, plan)).status,
  403,
);
const mobileId = uuid(),
  syncValues = {
    ID: mobileId,
    NOME: "Planejamento criado pelo app - validação",
    ZONA: "Urbana",
    STATUS: 3,
    SITUACAO: 1,
    ID_CIDADE: 4104808,
    ID_CATEGORIA: 10001,
    ATIVIDADE: 2,
    TIPO: 1,
    CICLO: 0,
    ANO: "2026-01-01",
    CATALOGO_VERSAO: "PNCD-FAD-IBGE-v1",
    BOLETIM_JSON: plan.boletimJson,
  };
let sync = await request(8090, "/api/sync", user, [
  {
    id: mobileId,
    tabela: "PLANEJAMENTO",
    values: syncValues,
    mutationId: uuid(),
    baseVersion: 0,
  },
]);
assert.equal(sync.status, 200, JSON.stringify(sync));
assert.equal(sync.data.applied.length, 1);
await set(false, false);
assert.equal(
  (
    await request(8070, "/api/planejamento/salvar", user, {
      ...plan,
      uuid: uuid(),
    })
  ).status,
  403,
);
assert.equal(
  (
    await request(8090, "/api/sync", user, [
      {
        id: uuid(),
        tabela: "PLANEJAMENTO",
        values: syncValues,
        mutationId: uuid(),
        baseVersion: 0,
      },
    ])
  ).status,
  400,
);
const deniedId = uuid();
assert.equal(
  (
    await request(8090, "/api/sync", user, [
      {
        id: deniedId,
        tabela: "PLANEJAMENTO",
        values: { ...syncValues, ID: deniedId },
        mutationId: uuid(),
        baseVersion: 0,
      },
    ])
  ).status,
  403,
);
await set(true, true);
assert.equal(
  (
    await request(8070, "/api/planejamento/salvar", user, {
      ...plan,
      boletimJson: "[]",
    })
  ).status,
  400,
);
assert.equal(
  (await request(8070, "/api/planejamento/salvar", user, plan)).status,
  200,
);
const visitId = uuid(),
  visitValues = {
    ID: visitId,
    ID_PLANEJAMENTO: plan.uuid,
    NOME: "Rua Paraná",
    NUMERO: "123",
    TIPO_IMOVEL: "Residencial",
    TIPO_VISITA: "N",
    PRIMEIRA_VISITA: "2026-11-01 08:30:00",
    SITUACAO_REFERENCIA: 3,
    SITUACAO: 1,
    CONTEM_AMOSTRA: 0,
    CONTEM_TRATAMENTO: 0,
    BOLETIM_JSON: JSON.stringify({
      quarteirao: "12",
      ladoQuarteirao: "2",
      agenteNome: user.nome,
      agenteCodigo: String(user.id),
      horaEntrada: "08:30",
      focalGramas: "0,75",
      focal2: { tipo: "BTI", gramas: 1.5, depositos: 2 },
    }),
  };
sync = await request(8090, "/api/sync", user, [
  {
    id: visitId,
    tabela: "VISITA",
    values: visitValues,
    mutationId: uuid(),
    baseVersion: 0,
  },
]);
assert.equal(sync.status, 200, JSON.stringify(sync));
assert.equal(sync.data.applied.length, 1);
const report = await request(
  8070,
  "/api/planejamento/" + plan.uuid + "/boletim",
  admin,
);
assert.equal(report.status, 200);
assert.equal(report.data.visits.length, 1);
assert.equal(JSON.parse(report.data.visits[0].BOLETIM_JSON).quarteirao, "12");
assert.equal(report.data.plan.CICLO, 0);
assert.equal(JSON.parse(report.data.visits[0].BOLETIM_JSON).focal2.gramas, 1.5);
const metrics = await request(8070, "/api/indicadores", admin);
assert.equal(metrics.status, 200);
assert.ok(Number(metrics.data.planejamentos) > 0);
const sede = await request(8080, "/api/user/sede-info", admin);
assert.equal(sede.data.codigo, 64003);
await set(true, false);
fs.writeFileSync(
  ".local/pdf-permissions-fixture.json",
  JSON.stringify({
    planId: plan.uuid,
    visitId,
    mobilePlanId: mobileId,
    agentId: agent.id,
  }),
);
console.log(
  "Live API passed: grant/revoke, separate create/edit, both server write paths, metadata sync/report, metrics and sede.",
);
