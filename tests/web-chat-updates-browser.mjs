import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const accounts = JSON.parse(
  fs.readFileSync(".local/test-accounts.json", "utf8"),
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(accounts.webUrl);
  await page.getByLabel(/^Email/).fill(accounts.web.email);
  await page.getByLabel(/^Senha/).fill(accounts.web.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("link", { name: "Mensagens", exact: true }).click();
  await page
    .getByRole("button", { name: "Agente Mobile", exact: true })
    .click();
  const image = page.getByAltText("Imagem enviada na conversa").last();
  await image.waitFor();
  await image.evaluate(async (image) => {
    if (!image.complete) await image.decode();
  });
  assert.equal(
    await page.getByRole("button", { name: "Ver imagem", exact: true }).count(),
    0,
  );
  const play = page
    .getByRole("button", { name: "Ouvir áudio", exact: true })
    .last();
  await play.getByTestId("PlayArrowRoundedIcon").waitFor();
  await page.getByRole("button", { name: "Emojis", exact: true }).click();
  assert.equal(await page.getByRole("tab").count(), 11);
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
    ).includes("👍🏽🇧🇷"),
  );
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= innerWidth,
    );
  }
  await page.getByLabel("Sua mensagem", { exact: true }).fill("");
  assert.deepEqual(errors, []);
  await page.screenshot({ path: ".local/web-chat-updates.png" });
  console.log(
    "Web passed: automatic images, play icon before download, 11 emoji categories and responsive composer/header.",
  );
} finally {
  await browser.close();
}
