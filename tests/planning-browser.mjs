import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const a = JSON.parse(fs.readFileSync(".local/test-accounts.json", "utf8"));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [],
  warnings = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    /does not recognize|Invalid DOM|invalid hook/i.test(message.text())
  )
    warnings.push(message.text());
});
const saveMessage =
  "Visitas salvas. O aplicativo recebe as atualizações automaticamente.";
async function waitValue(locator, value) {
  await page.waitForFunction(
    ({ label, value }) =>
      [...document.querySelectorAll("input")].some(
        (input) => input.value === value && (!label || input.id === label),
      ),
    { label: await locator.getAttribute("id"), value },
  );
  assert.equal(await locator.inputValue(), value);
}
async function saved() {
  await page
    .getByRole("button", { name: "Salvar visitas", exact: true })
    .click();
  await page.getByText(saveMessage, { exact: true }).waitFor();
}
async function apiRows() {
  await page
    .getByRole("button", { name: "Editar visita 1", exact: true })
    .waitFor();
  return page.evaluate(async (id) => {
    const { api } = await import("/src/services/api.js");
    return (await api.get("/api/visitas-list/" + id)).data;
  }, planId);
}
let planId;
try {
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("/PR/Cascavel/")
        ? [
            {
              cep: "85801-000",
              logradouro: "Rua do Teste de Interface",
              bairro: "Centro",
              localidade: "Cascavel",
              uf: "PR",
            },
          ]
        : {
            cep: "85801-000",
            logradouro: "Rua do Teste de Interface",
            bairro: "Centro",
            localidade: "Cascavel",
            uf: "PR",
          },
    }),
  );
  await page.route("https://brasilapi.com.br/api/cep/v2/**", (route) =>
    route.fulfill({
      json: {
        location: {
          coordinates: { latitude: "-24.9555", longitude: "-53.4552" },
        },
      },
    }),
  );
  await page.goto(a.webUrl);
  await page.getByLabel(/^Email/).fill(a.web.email);
  await page.getByLabel(/^Senha/).fill(a.web.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByText("Uma visão do cuidado em campo").waitFor();
  await page.getByRole("button", { name: "Atualizar", exact: true }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: ".local/web-green-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Planejamento", exact: true }).click();
  await page
    .getByRole("link", { name: "Novo planejamento", exact: true })
    .click();
  await page.getByRole('button',{name:'Salvar planejamento',exact:true}).click();
  await page.getByText('Preencha os campos obrigatórios do planejamento.',{exact:true}).waitFor();
  const name = "UX web " + Date.now();
  await page.getByLabel("Nome da região").fill(name);
  await page.getByLabel(/^Zona/).fill("Centro");
  await page.getByLabel(/^Ano/).fill("2028");
  await page.getByLabel(/^Ciclo/).fill("0");
  await page.getByLabel(/^Data da visita/).fill("2027-02-10");
  await page.getByLabel(/^Código da localidade/).fill("001");
  await page
    .getByRole("combobox", { name: /^Município/ })
    .fill("Cascavel");
  await page
    .getByRole("option", { name: "Cascavel — PR", exact: true })
    .click();
  for (const label of [
    "Categoria da localidade",
    "Atividade",
    "Tipo da localidade",
  ]) {
    await page.getByRole("combobox", { name: new RegExp("^"+label) }).click();
    await page.getByRole("option").first().click();
  }
  await page
    .getByRole("button", { name: "Salvar planejamento", exact: true })
    .click();
  await page.waitForURL(/cadastrar\/(?!0(?:\?|$))[^?]+\?aba=visitas/);
  await page.waitForFunction(
    () =>
      document.querySelector("#tab-visitas")?.getAttribute("aria-selected") ===
      "true",
  );
  planId = new URL(page.url()).pathname.split("/").at(-1);
  await page.getByRole("tab", { name: "Geral", exact: true }).click();
  await waitValue(page.getByLabel(/^Ano/), "2028");
  await waitValue(page.getByLabel(/^Ciclo/), "0");
  await waitValue(page.getByLabel(/^Data da visita/), "2027-02-10");
  await page.reload();
  await waitValue(page.getByLabel(/^Ano/), "2028");
  await page.screenshot({
    path: ".local/web-green-planning.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Visitas", exact: true }).click();
  await page.waitForURL(/\?aba=visitas$/);
  await page.reload();
  assert.equal(
    await page
      .getByRole("tab", { name: "Visitas", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(await page.getByLabel(/^Endereço/).count(), 0);
  await page
    .getByRole("button", { name: "Adicionar visita", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Buscar endereço", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Buscar imóvel por endereço", exact: true })
    .fill("Rua do Teste");
  await page.getByRole("option").first().click();
  await waitValue(page.getByLabel(/^Endereço/), "Rua do Teste de Interface");
  await page.getByLabel("Número do imóvel").fill("123");
  await page
    .getByRole("button", { name: "Dados complementares", exact: true })
    .click();
  await page.getByLabel("Complemento", { exact: true }).fill("Casa dos fundos");
  await page
    .getByRole("combobox", { name: "Tipo da visita", exact: true })
    .click();
  await page.getByRole("option", { name: "Retorno", exact: true }).click();
  await page
    .getByRole("button", { name: "Fechar cadastro de visita", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("tab", { name: "Geral", exact: true }).click();
  await page.getByRole("tab", { name: "Visitas", exact: true }).click();
  await page
    .getByRole("button", { name: "Continuar cadastro", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dados complementares", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Complemento", { exact: true }).inputValue(),
    "Casa dos fundos",
  );
  await page
    .getByRole("button", { name: "Adicionar à lista", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByText("1. Rua do Teste de Interface, 123", { exact: true })
    .waitFor();
  await saved();
  await page
    .getByRole("button", { name: "Adicionar visita", exact: true })
    .click();
  await page.getByLabel(/^Endereço/).fill("Rua Secundária");
  await page.getByLabel("Número do imóvel").fill("22");
  await page
    .getByRole("button", { name: "Localização no mapa", exact: true })
    .click();
  await page.getByLabel("Latitude", { exact: true }).fill("-24.9565");
  await page.getByLabel("Longitude", { exact: true }).fill("-53.4561");
  await page
    .getByRole("button", { name: "Adicionar à lista", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await saved();
  await page
    .getByRole("button", { name: "Mover visita 2 para cima", exact: true })
    .click();
  await page.getByText("1. Rua Secundária, 22", { exact: true }).waitFor();
  await saved();
  await page.getByRole("button", { name: "Ver mapa", exact: true }).click();
  await page
    .getByRole("region", { name: "Mapa da ordem das visitas", exact: true })
    .waitFor();
  const optimized = page.waitForResponse(
    (response) =>
      response.url().includes("/api/optimize-route") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Ordenar por proximidade", exact: true })
    .click();
  assert.equal((await optimized).status(), 200);
  await page
    .getByText("Ordem por proximidade calculada. Salve para confirmar.")
    .waitFor();
  await saved();
  await page
    .getByRole("button", { name: "Editar visita 1", exact: true })
    .click();
  await page.getByLabel("Número do imóvel").fill("321");
  await page
    .getByRole("button", { name: "Dados complementares", exact: true })
    .click();
  await page.getByLabel("Complemento", { exact: true }).fill("Casa editada");
  await page
    .getByRole("combobox", { name: "Tipo da visita", exact: true })
    .click();
  await page.getByRole("option", { name: "Retorno", exact: true }).click();
  await page
    .getByRole("button", { name: "Atualizar visita na lista", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await saved();
  await page.reload();
  let rows = await apiRows();
  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((row) => row.id)).size, 2);
  assert.ok(
    rows.some(
      (row) =>
        row.numero === "321" &&
        row.complemento === "Casa editada" &&
        row.tipoVisita === "R",
    ),
  );
  await page
    .getByRole("button", { name: "Consultar ficha da visita 1", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText(/^Retorno ·/)
    .waitFor();
  await page.waitForTimeout(350);
  await page.screenshot({ path: ".local/web-green-visit-details.png" });
  await page.getByRole("button", { name: "Fechar ficha", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar visita 1", exact: true })
    .click();
  await page.getByLabel("Número do imóvel").fill("888");
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.ok((await apiRows()).some((row) => row.numero === "321"));
  await page
    .getByRole("button", { name: "Excluir visita 1", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  assert.equal((await apiRows()).length, 2);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `List overflow at ${width}`,
    );
    await page
      .getByRole("button", { name: "Editar visita 1", exact: true })
      .click();
    await page.getByLabel(/^Endereço/).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Editor overflow at ${width}`,
    );
    await page.waitForTimeout(250);
    if (width === 390)
      await page.screenshot({ path: ".local/web-green-editor-390.png" });
    await page
      .getByRole("button", { name: "Cancelar edição", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    if (width === 390)
      await page.screenshot({
        path: ".local/web-green-visits-390.png",
        fullPage: true,
      });
  }
  await page.screenshot({
    path: ".local/web-green-visits.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Excluir visita 2", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir visita", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await saved();
  await page.reload();
  assert.equal((await apiRows()).length, 1);
  await page.getByRole("link", { name: "Planejamento", exact: true }).click();
  await page.getByLabel("Buscar região ou zona").fill(name);
  await page.getByRole("link", { name, exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get("aba"), "visitas");
  await page.getByRole("link", { name: "Agentes", exact: true }).click();
  await page
    .getByRole("region", { name: "Última localização dos agentes" })
    .waitFor();
  await page
    .getByRole("heading", { name: "Solicitações de cadastro" })
    .waitFor();
  await page.screenshot({
    path: ".local/web-green-agents.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Configuração", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar configuração", exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Mensagens", exact: true }).click();
  await page.getByRole("heading", { name: "Mensagens", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  console.log(
    "Planning/visits passed: create and classification/cycle persistence, automatic visit tab, form resume, CEP, coordinates, add/edit/save/reload, map, manual and optimized order, clinical details, cancel/delete, responsive 320/390/768/1440, agents, approvals and settings.",
  );
} catch (error) {
  await page.screenshot({
    path: ".local/web-green-failure.png",
    fullPage: true,
  });
  console.error(JSON.stringify({ errors, warnings }));
  throw error;
} finally {
  await browser.close();
}
