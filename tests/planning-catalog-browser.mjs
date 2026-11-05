import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const accounts = JSON.parse(
  fs.readFileSync(".local/test-accounts.json", "utf8"),
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }),
  errors = [],
  external = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("servicodados.ibge.gov.br"))
    external.push(request.url());
});
async function waitValue(locator, expected) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if ((await locator.inputValue()) === expected) return;
    await page.waitForTimeout(100);
  }
  assert.equal(await locator.inputValue(), expected);
}
try {
  await page.goto(accounts.webUrl);
  await page.getByLabel(/^Email/).fill(accounts.web.email);
  await page.getByLabel(/^Senha/).fill(accounts.web.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("link", { name: "Planejamento", exact: true }).click();
  await page.getByRole("link", { name: "Novo planejamento" }).click();
  const name = "Catalogo PNCD " + Date.now();
  await page.getByLabel("Nome da região").fill(name);
  await page.getByLabel(/^Zona/).fill("Zona 1");
  await page.getByLabel(/^Ciclo/).fill("1");
  await page.getByLabel(/^Código da localidade/).fill("001");
  await page
    .getByRole("combobox", { name: /^Município/ })
    .fill("Cascavel");
  await page
    .getByRole("option", { name: "Cascavel — PR", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: /^Categoria da localidade/ })
    .click();
  await page.getByRole("option", { name: "Bairro (BIR)", exact: true }).click();
  await page.getByRole("combobox", { name: /^Atividade/ }).click();
  await page
    .getByRole("option", {
      name: "2 · LI+T — Levantamento de índice e tratamento",
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", { name: /^Tipo da localidade/ })
    .click();
  await page.getByRole("option", { name: "1 · Sede", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar planejamento", exact: true })
    .click();
  await page.waitForURL(/cadastrar\/(?!0(?:\?|$))[^?]+\?aba=visitas/);
  await page.waitForFunction(
    () =>
      document.querySelector("#tab-visitas")?.getAttribute("aria-selected") ===
      "true",
  );
  await page.getByRole("tab", { name: "Geral", exact: true }).click();
  await page.waitForURL(/\?aba=geral$/);
  await page.getByLabel(/^Ciclo/).waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Classificação do planejamento", exact: true })
    .click();
  await waitValue(
    page.getByRole("combobox", { name: /^Município/ }),
    "Cascavel — PR",
  );
  await waitValue(page.getByLabel(/^Ciclo/), "1");
  assert.equal(
    await page
      .getByRole("combobox", { name: /^Categoria da localidade/ })
      .innerText(),
    "Bairro (BIR)",
  );
  await page.screenshot({
    path: ".local/catalog-web-planning.png",
    fullPage: true,
  });
  await page.getByLabel(/^Ciclo/).fill("0");
  await page
    .getByRole("button", { name: "Salvar planejamento", exact: true })
    .click();
  await page.getByText("Planejamento salvo.").waitFor();
  await page.reload();
  await waitValue(page.getByLabel(/^Ciclo/), "0");
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Planning catalog overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({
    path: ".local/catalog-web-planning-390.png",
    fullPage: true,
  });
  fs.writeFileSync(
    ".local/catalog-web-flow.json",
    JSON.stringify({
      planName: name,
      planId: new URL(page.url()).pathname.split("/").pop(),
    }),
  );
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  console.log(
    "Planning catalog UI passed: offline IBGE lookup, PNCD selection, cycle 1 and 0, save/reload and widths 360/390/768/1440.",
  );
} catch (error) {
  console.error(
    JSON.stringify({
      url: page.url(),
      errors,
      body: (await page.locator("body").innerText()).slice(0, 1000),
    }),
  );
  await page.screenshot({
    path: ".local/catalog-web-failure.png",
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
