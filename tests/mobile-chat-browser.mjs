import { server } from "./mobile-ui/server.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
  }),
  page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.addInitScript(() => {
    window.__routeParams = {
      idUsuarioMensagem: "2",
      nome: "Contato da equipe",
    };
  });
  await page.goto("http://127.0.0.1:5184/#/chat-message");
  await page.getByLabel("Sua mensagem", { exact: true }).waitFor();
  await page.evaluate(() =>
    window.__sessionStore
      .getState()
      .setProfile({ id: 1, idCede: 3, nome: "Agente de teste" }),
  );
  await page
    .getByLabel("Sua mensagem", { exact: true })
    .fill("Mensagem digitada em campo");
  await page
    .getByRole("button", { name: "Escolher emoji", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inserir emoji 👍", exact: true })
    .click();
  assert.ok(
    (
      await page.getByLabel("Sua mensagem", { exact: true }).inputValue()
    ).includes("👍"),
  );
  await page.getByRole("tab", { name: "Natureza", exact: true }).click();
  await page
    .getByRole("button", { name: "Inserir emoji 🦟", exact: true })
    .click();
  await page.getByRole("tab", { name: "Tons de pele", exact: true }).click();
  await page
    .getByRole("button", { name: "Inserir emoji 👍🏽", exact: true })
    .click();
  await page.getByRole("tab", { name: "Bandeiras", exact: true }).click();
  await page
    .getByRole("button", { name: "Inserir emoji 🇧🇷", exact: true })
    .click();
  assert.ok(
    (
      await page.getByLabel("Sua mensagem", { exact: true }).inputValue()
    ).includes("👍🦟👍🏽🇧🇷"),
  );
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const composer = await page.getByTestId("chat-composer").boundingBox();
    assert.ok(
      composer.y >= 0 && composer.y + composer.height <= 845,
      "emoji panel fits screen " + width,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no horizontal overflow " + width,
    );
  }
  await page.getByRole("tab", { name: "Objetos", exact: true }).click();
  const lastEmoji = page.getByRole("button", {
    name: "Inserir emoji 💄",
    exact: true,
  });
  await page.getByTestId("emoji-grid").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await lastEmoji.click();
  assert.ok(
    (
      await page.getByLabel("Sua mensagem", { exact: true }).inputValue()
    ).includes("💄"),
  );
  await page.screenshot({ path: ".local/mobile-large-emoji-picker.png" });
  await page
    .getByRole("button", { name: "Escolher emoji", exact: true })
    .click();
  for (const height of [600, 400, 320, 844]) {
    await page.setViewportSize({ width: 390, height });
    await page
      .getByLabel("Sua mensagem", { exact: true })
      .fill(("Mensagem longa em várias linhas " + height + "\n").repeat(6));
    const input = await page
      .getByLabel("Sua mensagem", { exact: true })
      .boundingBox();
    assert.ok(
      input.y >= 0 && input.y + input.height <= height,
      "composer outside viewport " + height,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Enviar mensagem", exact: true })
        .isVisible(),
      true,
    );
  }
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Sua mensagem", { exact: true }).inputValue(),
    "",
  );
  assert.equal(await page.evaluate(() => window.__sentMessages.length), 1);
  await page.evaluate(() => (window.__microphoneAllowed = false));
  await page.getByRole("button", { name: "Gravar áudio", exact: true }).click();
  await page.getByText(/Permita o acesso ao microfone/).waitFor();
  await page.evaluate(() => (window.__microphoneAllowed = true));
  await page.getByRole("button", { name: "Gravar áudio", exact: true }).click();
  await page.getByText(/Gravando ·/).waitFor();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(
    await page.getByText("Áudio pronto para enviar", { exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Gravar áudio", exact: true }).click();
  await page
    .getByRole("button", { name: "Concluir gravação", exact: true })
    .click();
  await page.getByText("Áudio pronto para enviar", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Remover anexo", exact: true })
    .click();
  await page.evaluate(
    () =>
      (window.__imagePick = {
        canceled: false,
        assets: [
          {
            uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
            width: 100,
            height: 100,
          },
        ],
      }),
  );
  await page
    .getByRole("button", { name: "Adicionar anexo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar imagem", exact: true })
    .click();
  await page.getByText("Imagem pronta para enviar", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Remover anexo", exact: true })
    .click();
  await page.waitForTimeout(650);
  await page.screenshot({ path: ".local/mobile-chat-composer.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Mobile chat UI passed: stable composer on typing/resizing, emoji insertion, acknowledged send, microphone denial, audio record/cancel/preview and image preview/removal. Native services are mocked.",
  );
} catch (error) {
  console.log((await page.locator("body").innerText()).slice(-2200));
  throw error;
} finally {
  await browser.close();
  await server.close();
}
