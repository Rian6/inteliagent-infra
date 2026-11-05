import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createDailyReport,
  reportIssues,
  normalizeReportVisit,
} from "../inteliagent-app/src/reports/pncd.ts";
const catalog = JSON.parse(
  fs.readFileSync("inteliagent-app/src/data/planning-catalog.json", "utf8"),
);
const plan = {
  NOME: "Centro",
  ID_CIDADE: 4104808,
  ID_CATEGORIA: 10001,
  ATIVIDADE: 2,
  TIPO: 1,
  CICLO: 0,
  ANO: "2026-01-01",
  ZONA: "Urbana",
  BOLETIM_JSON: JSON.stringify({
    codigoLocalidade: "001",
    supervisorNome: "Supervisora de campo",
    concluida: true,
  }),
};
const rows = Array.from({ length: 23 }, (_, i) => ({
  ID: String(i),
  NOME:
    i === 0
      ? "Rua Presidente Doutor José da Silva " +
        "complemento extenso ".repeat(20)
      : "Rua Paraná",
  NUMERO: String(100 + i),
  COMPLEMENTO: i === 0 ? "IDENTIFICADOR".repeat(40) : "Casa",
  TIPO_IMOVEL: "Residencial",
  TIPO_VISITA: "N",
  PRIMEIRA_VISITA: "2026-11-01 08:00:00",
  SITUACAO_REFERENCIA: 3,
  CONTEM_TRATAMENTO: 1,
  BOLETIM_JSON: JSON.stringify({
    quarteirao: "12",
    ladoQuarteirao: "2",
    sequenciaQuarteirao: "1",
    sequenciaImovel: String(i + 1),
    agenteNome: "Agente de teste",
    agenteCodigo: "123",
    horaEntrada: "08:00",
    inspecionadoLI: true,
    focalGramas: "2,5",
    focal2: { tipo: "BTI", gramas: "1,5", depositos: 2 },
  }),
  inspecao: [{ TIPO: 1, NUMERO_DEPOSITOS: 3 }],
  amostra: [{ NUMERO_INICIO: 10, NUMERO_FINAL: 11, QUANTIDADE: 2 }],
  tratamento: [
    {
      TIPO: "FOCAL:BTI",
      QTD_CARGA: 2,
      QTD_TRATAMENTO: 3,
      IMOVEIS_TRATADOS: 1,
      DEPOSITOS_ELIMINADOS: 4,
    },
  ],
}));
assert.deepEqual(reportIssues(plan, rows, catalog), []);
assert.match(
  reportIssues(plan, rows, catalog, { municipioIbge: 3550308 }).join(" "),
  /município/,
);
assert.ok(reportIssues(plan, rows, catalog, { data: "inválida" }).length);
assert.ok(reportIssues(plan, [], catalog).length);
assert.equal(
  normalizeReportVisit({ ...rows[0], CONTEM_TRATAMENTO: 0 }).values.f2tipo,
  undefined,
);
const result = await createDailyReport(plan, rows, catalog);
assert.equal(result.pages, 5);
for (const b of result.boxes) {
  const c = b.cell;
  assert.ok(
    b.x >= c.x - 0.1 && b.x + b.width <= c.x + c.w + 0.1,
    JSON.stringify(b),
  );
  assert.ok(
    b.y >= 595.28 - c.top - c.h - 0.1 && b.y + b.height <= 595.28 - c.top + 0.1,
    JSON.stringify(b),
  );
}
fs.writeFileSync(".local/boletim-pncd-validacao.pdf", result.bytes);
assert.equal(
  fs.readFileSync("inteliagent-app/src/reports/pncd.ts", "utf8"),
  fs.readFileSync("inteliagent-webapp/src/reports/pncd.ts", "utf8"),
);
console.log(
  "PDF: city, zero cycle, pagination, both treatments and all " +
    result.boxes.length +
    " text boxes validated.",
);

assert.equal(
  normalizeReportVisit({ ...rows[0], CONTEM_TRATAMENTO: true }).values.f2tipo,
  "BTI",
);
const simple = rows[1];
const grouped = await createDailyReport(
  plan,
  [
    simple,
    {
      ...simple,
      BOLETIM_JSON: JSON.stringify({
        ...JSON.parse(simple.BOLETIM_JSON),
        agenteNome: "Outro agente",
      }),
    },
    { ...simple, PRIMEIRA_VISITA: "2026-11-02 09:00:00" },
  ],
  catalog,
);
assert.equal(grouped.pages, 6);
assert.ok(
  reportIssues(plan, [{ ...simple, SITUACAO_REFERENCIA: 4 }], catalog).length,
);
assert.ok(
  reportIssues(plan, [{ ...simple, SITUACAO_REFERENCIA: 5 }], catalog).length,
);
console.log(
  "Separate days/agents, boolean treatment flags and exclusion of rejected/unperformed visits passed.",
);

const backTexts=result.boxes.filter(b=>b.page===2).map(b=>b.text).join(' ');
assert.match(backTexts,/RESUMO DIÁRIO DO TRABALHO DE CAMPO/);assert.match(backTexts,/RESUMO DO LABORATÓRIO/);assert.match(backTexts,/Sem resultado/);

assert.equal(fs.readFileSync('inteliagent-app/src/reports/daily-summary.ts','utf8'),fs.readFileSync('inteliagent-webapp/src/reports/daily-summary.ts','utf8'));
