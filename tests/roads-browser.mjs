import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { routeMapHtml } from "../inteliagent-app/src/components/visitas/routeMapHtml.ts";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage();
try {
  await page.route("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: fs.readFileSync(
        "inteliagent-webapp/node_modules/leaflet/dist/leaflet.js",
        "utf8",
      ),
    }),
  );
  await page.route("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", (r) =>
    r.fulfill({
      contentType: "text/css",
      body: fs.readFileSync(
        "inteliagent-webapp/node_modules/leaflet/dist/leaflet.css",
        "utf8",
      ),
    }),
  );
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
  const rows = [
    { ID: "1", NOME: "Rua um", LATITUDE: -24.9555, LONGITUDE: -53.4552 },
    { ID: "2", NOME: "Rua dois", LATITUDE: -24.9568, LONGITUDE: -53.452 },
  ];
  let requested = "";
  await page.route("https://router.project-osrm.org/**", (r) => {
    requested = r.request().url();
    return r.fulfill({
      json: {
        code: "Ok",
        routes: [
          {
            geometry: {
              coordinates: [
                [-53.4552, -24.9555],
                [-53.455, -24.9559],
                [-53.4525, -24.9559],
                [-53.452, -24.9568],
              ],
            },
          },
        ],
      },
    });
  });
  await page.setContent(routeMapHtml(rows));
  await page
    .getByRole("status")
    .filter({ hasText: "Trajeto viário" })
    .waitFor();
  assert.match(requested, /-53.4552,-24.9555;-53.452,-24.9568/);
  assert.equal(await page.locator("path.leaflet-interactive").count(), 1);
  const path = await page.locator("path.leaflet-interactive").getAttribute("d");
  assert.ok(path.split("L").length >= 4, path);
  await page.unroute("https://router.project-osrm.org/**");
  await page.route("https://router.project-osrm.org/**", (r) => r.abort());
  await page.goto("about:blank");
  await page.setContent(routeMapHtml(rows));
  await page.getByRole("status").filter({ hasText: "indisponível" }).waitFor();
  assert.equal(await page.locator("path.leaflet-interactive").count(), 0);
  assert.equal(await page.locator(".number").count(), 2);
  console.log(
    "Street route browser passed: server geometry, lng/lat ordering, no straight-line fallback and retained stops on failure.",
  );
} finally {
  await browser.close();
}
