import { server } from "./mobile-ui/server.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAZElEQVR4nO3PUQkAIBTAwBfEjCY2jCH8OITBAtxm7fN1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY8dgGvNcjx+m6bbAAAAABJRU5ErkJggg==",
  "base64",
);
let calls = 0;
try {
  await page.addInitScript(() => {
    window.__accessToken = "expired-token";
    window.__renewedToken = "renewed-token";
  });
  await page.route("**/attachments/*", async (route) => {
    calls++;
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "image/png",
    };
    if (calls === 1) return route.fulfill({ status: 503, headers, body: "" });
    if (calls === 2) {
      assert.equal(
        route.request().headers().authorization,
        "Bearer expired-token",
      );
      return route.fulfill({ status: 401, headers, body: "" });
    }
    assert.equal(
      route.request().headers().authorization,
      "Bearer renewed-token",
    );
    return route.fulfill({ status: 200, headers, body: png });
  });
  await page.goto("http://127.0.0.1:5184/#/chat-image");
  await page
    .getByRole("button", { name: "Carregar imagem novamente", exact: true })
    .click();
  const thumbnail = page.getByTestId("chat-received-image");
  await thumbnail.waitFor();
  // React Native Web renders the actual img inside its Image wrapper.
  await page.waitForFunction(() =>
    [...document.querySelectorAll("img")].some(
      (image) => image.complete && image.naturalWidth === 64,
    ),
  );
  assert.equal(
    calls,
    3,
    "temporary failure, rejected token and renewed download",
  );
  await page
    .getByRole("button", { name: "Ampliar imagem da mensagem", exact: true })
    .click();
  await page.getByTestId("chat-expanded-image").waitFor();
  await page
    .getByRole("button", { name: "Fechar imagem", exact: true })
    .click();
  assert.equal(
    await page.getByText(/Não foi possível carregar a imagem/).count(),
    0,
  );
  console.log(
    "Mobile image passed: automatic authenticated download, recovery from 503, 401 renewal, decoded image and full preview.",
  );
} finally {
  await browser.close();
  await server.close();
}
