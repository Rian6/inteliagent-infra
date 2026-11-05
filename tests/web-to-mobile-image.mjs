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
const page = await browser.newPage();
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAZElEQVR4nO3PUQkAIBTAwBfEjCY2jCH8OITBAtxm7fN1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY8dgGvNcjx+m6bbAAAAABJRU5ErkJggg==",
  "base64",
);
try {
  await page.goto(accounts.webUrl);
  await page.getByLabel(/^Email/).fill(accounts.web.email);
  await page.getByLabel(/^Senha/).fill(accounts.web.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("link", { name: "Mensagens", exact: true }).click();
  await page
    .getByRole("button", { name: "Agente Mobile", exact: true })
    .click();
  const uploaded = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/attachments" &&
      response.request().method() === "POST",
  );
  await page.getByLabel("Selecionar imagem", { exact: true }).setInputFiles({
    name: "validacao-web-mobile.png",
    mimeType: "image/png",
    buffer: image,
  });
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  const response = await uploaded;
  assert.equal(response.status(), 201);
  const attachment = await response.json();
  const delivered = page.locator(
    '[data-attachment-id="' + attachment.id + '"] img',
  );
  await delivered.waitFor();
  await delivered.evaluate(async (image) => {
    if (!image.complete) await image.decode();
  });
  fs.writeFileSync(
    ".local/web-to-mobile-image.json",
    JSON.stringify(attachment, null, 2),
  );
  console.log(
    "Valid PNG uploaded through the web composer without a caption; attachment:",
    attachment.id,
  );
} finally {
  await browser.close();
}
