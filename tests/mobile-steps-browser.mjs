import { server } from "./mobile-ui/server.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function screenshot(name) {
  await page.waitForTimeout(150);
  await page.screenshot({ path: ".local/snow-mobile-" + name + ".png" });
}
async function step(n) {
  await page.getByText(`ETAPA ${n} DE 5`, { exact: true }).waitFor();
}
try {
  await page.goto("http://127.0.0.1:5184/#/login");
  await page.getByRole("heading", { name: "Bom ter você de volta" }).waitFor();
  await screenshot("login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByText("Informe seu email.", { exact: true }).waitFor();
  await page.getByLabel("Email", { exact: true }).fill("agente@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-teste");
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .click();
  assert.equal(
    await page
      .getByLabel("Senha", { exact: true })
      .evaluate((input) => input.type),
    "text",
  );
  await page
    .getByRole("button", { name: "Criar uma conta", exact: true })
    .click();
  await screenshot("register");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByText("Informe um email válido.").waitFor();
  await page.getByLabel("Nome", { exact: true }).fill("Agente de teste");
  await page.getByLabel("Email", { exact: true }).fill("agente@exemplo.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste-123");
  await page
    .getByLabel("Confirmar senha", { exact: true })
    .fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("heading", { name: "Qual é a sua sede?" }).waitFor();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByText("Informe os 5 dígitos do código da sede.").waitFor();
  await page.getByLabel("Código da sede", { exact: true }).fill("64003");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("heading", { name: "Confira seu email" }).waitFor();
  await page
    .getByLabel("Código de verificação", { exact: true })
    .fill("123456");
  await page
    .getByRole("button", { name: "Validar e continuar", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Tudo pronto para começar" })
    .waitFor();
  await screenshot("register-review");
  await page.goto("http://127.0.0.1:5184");
  await step(1);
  await screenshot("property");
  assert.equal(
    await page.getByRole("button", { name: /5\. Revisão/ }).isDisabled(),
    true,
  );
  await page.getByTestId("visit-general-next").click();
  assert.match(await page.locator("body").innerText(), /Informe o endereço/);
  await page.getByLabel("Endereço", { exact: true }).fill("Rua do Campo");
  await page.getByLabel("Número do imóvel", { exact: true }).fill("123");
  await page.getByTestId("visit-general-next").click();
  await step(2);
  await screenshot("inspection-question");
  await page.getByTestId("inspecao-next").click();
  await page
    .getByText("Informe se encontrou depósitos para inspecionar.")
    .waitFor();
  await page.getByRole("radio", { name: "Sim", exact: true }).click();
  await page.getByTestId("inspection-1").click();
  await page
    .getByLabel("Depósitos inspecionados A1", { exact: true })
    .fill("-1");
  await page.getByTestId("inspecao-next").click();
  assert.match(await page.locator("body").innerText(), /número inteiro/);
  await page
    .getByLabel("Depósitos inspecionados A1", { exact: true })
    .fill("2");
  await screenshot("inspection");
  await page.getByTestId("inspecao-next").click();
  await step(3);
  await page.getByTestId("amostra-next").click();
  await page.getByText("Informe se houve coleta de amostras.").waitFor();
  await page.getByRole("radio", { name: "Sim", exact: true }).click();
  await page.getByLabel("Número inicial", { exact: true }).fill("10");
  await page.getByLabel("Número final", { exact: true }).fill("8");
  await page.getByLabel("Quantidade de tubitos", { exact: true }).fill("3");
  await page.getByTestId("amostra-next").click();
  await page
    .getByText("O número final deve ser maior ou igual ao inicial.")
    .first()
    .waitFor();
  await page.getByLabel("Número final", { exact: true }).fill("12");
  await screenshot("sample");
  await page.getByTestId("amostra-next").click();
  await step(4);
  await page.getByTestId("tratamento-next").click();
  await page.getByText("Informe se foi realizado tratamento.").waitFor();
  await page.getByRole("radio", { name: "Sim", exact: true }).click();
  await page.getByTestId('treatment-focal').click();
  await page.getByTestId('tratamento-next').click();
  await page.getByText('Informe o produto utilizado.').first().waitFor();
  await page.getByTestId('treatment-focal-type').fill('Larvicida de teste');
  await page.getByTestId('treatment-focal-load').fill('2');
  await page.getByLabel('Depósitos tratados focal', {exact:true}).fill('3');
  await page.getByTestId('treatment-perifocal').click();
  await page.getByTestId('treatment-perifocal-type').fill('Adulticida de teste');
  await page.getByTestId('treatment-perifocal-load').fill('4');
  await page.getByLabel('Depósitos tratados perifocal', {exact:true}).fill('5');
  await screenshot('treatment');
  await page.getByTestId("tratamento-next").click();
  await step(5);
  await screenshot("review");
  assert.equal(
    await page.getByRole("button", { name: /3\. Amostras/ }).isDisabled(),
    false,
  );
  await page.getByTestId("visit-save").click();
  assert.equal(await page.evaluate(() => window.__saved), 1);
  await page
    .getByRole("button", { name: "Editar imóvel", exact: true })
    .click();
  await step(1);
  await page.getByLabel("Endereço", { exact: true }).fill("Rua Corrigida");
  assert.equal(
    await page.getByRole("button", { name: /5\. Revisão/ }).isDisabled(),
    true,
  );
  await page.getByTestId("visit-general-next").click();
  await step(2);
  assert.equal(
    await page
      .getByLabel("Depósitos inspecionados A1", { exact: true })
      .inputValue(),
    "2",
  );
  await page.getByRole("button", { name: "1. Imóvel, concluída" }).click();
  await step(1);
  await page.getByRole("radio", { name: "Fechado", exact: true }).click();
  await page.getByTestId("visit-general-next").click();
  await page.getByText("ETAPA 2 DE 2", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Editar imóvel", exact: true })
    .click();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page
      .getByRole("button", { name: "Detalhes do imóvel", exact: true })
      .click();
    await page.getByLabel("Complemento", { exact: true }).fill("Fundos");
    await page
      .getByRole("button", { name: "Detalhes do imóvel", exact: true })
      .click();
  }
  assert.deepEqual(errors, []);
  console.log(
    "Mobile UI browser checks passed: real screen components, login/register, gated steps, field errors, sample interval, editing invalidation, retained data, closed property branch, 320/390/768px. Device-only services are mocked in this preview.",
  );
} catch (error) {
  console.log(
    JSON.stringify({
      errors,
      url: page.url(),
      body: (await page.locator("body").innerText()).slice(-2500),
    }),
  );
  await screenshot("failure");
  throw error;
} finally {
  await browser.close();
  await server.close();
}
