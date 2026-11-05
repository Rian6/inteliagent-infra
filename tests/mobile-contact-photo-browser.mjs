import { server } from "./mobile-ui/server.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({headless:true, executablePath:"C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"});
const page = await browser.newPage({viewport:{width:390,height:844}});
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAZElEQVR4nO3PUQkAIBTAwBfEjCY2jCH8OITBAtxm7fN1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY8dgGvNcjx+m6bbAAAAABJRU5ErkJggg==","base64");
let calls = 0;
let offlineAttempt = false;
try {
  await page.addInitScript(() => { window.__accessToken="expired";window.__renewedToken="renewed"; });
  await page.route("**/users/2/photo?*", async route => {
    calls++;
    const headers={"Content-Type":"image/png","Access-Control-Allow-Origin":"*"};
    if(route.request().url().includes("v=offline") && !offlineAttempt) {
      offlineAttempt=true;
      return route.fulfill({status:503,headers,body:""});
    }
    if(calls===1) {
      assert.equal(route.request().headers().authorization,"Bearer expired");
      return route.fulfill({status:401,headers,body:""});
    }
    assert.equal(route.request().headers().authorization,"Bearer renewed");
    return route.fulfill({headers,body:png});
  });
  await page.goto("http://127.0.0.1:5184/#/contact-photo");
  await page.evaluate(() => window.__sessionStore.getState().setProfile({id:1,idCede:3,nome:"Mobile"}));
  await page.getByTestId("contact-photo").waitFor();
  await page.waitForFunction(() => [...document.images].some(i => i.complete && i.naturalWidth===64));
  assert.equal(calls,2);
  await page.evaluate(() => window.__setContactPhoto("/users/2/photo?v=updated-on-web"));
  await page.waitForFunction(() => [...document.images].some(i => i.complete && i.naturalWidth===64));
  await page.waitForFunction(() => document.querySelector('[data-testid="contact-photo"]')?.getAttribute('aria-label') === 'Foto de Contato Web');
  await page.evaluate(() => window.__setContactPhoto(null));
  await page.getByTestId("contact-photo").waitFor({state:"detached"});
  const failedRequest = page.waitForResponse(response => response.url().includes("v=offline") && response.status()===503);
  await page.evaluate(() => window.__setContactPhoto("/users/2/photo?v=offline"));
  await failedRequest;
  await page.evaluate(() => {
    Object.defineProperty(document,"visibilityState",{value:"hidden",configurable:true});
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document,"visibilityState",{value:"visible",configurable:true});
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByTestId("contact-photo").waitFor();
  await page.evaluate(() => window.__setContactPhoto("https://untrusted.example/users/2/photo"));
  await page.waitForTimeout(100);
  assert.equal(await page.getByTestId("contact-photo").count(),0);
  await page.evaluate(() => window.__setContactPhoto("/users/2/photo?v=account-check"));
  await page.getByTestId("contact-photo").waitFor();
  await page.evaluate(() => window.__sessionStore.getState().setProfile(null));
  await page.getByTestId("contact-photo").waitFor({state:"detached"});
  let contactPhoto = "/users/2/photo?v=contact-list";
  await page.route(url => url.pathname === "/users", route => route.fulfill({
    headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},
    body:JSON.stringify([{id:2,nome:"Contato Web",photoUrl:contactPhoto}]),
  }));
  await page.clock.install();
  await page.goto("http://127.0.0.1:5184/#/chat-contacts");
  await page.reload();
  await page.evaluate(() => { window.__accessToken="renewed"; window.__sessionStore.getState().setProfile({id:1,idCede:3,nome:"Mobile"}); });
  await page.getByRole("button", {name:"Conversar com Contato Web",exact:true}).getByTestId("contact-photo").waitFor();
  contactPhoto = null;
  await page.clock.fastForward(30001);
  await page.getByTestId("contact-photo").waitFor({state:"detached"});
  contactPhoto = "/users/2/photo?v=changed-in-web";
  await page.clock.fastForward(30001);
  await page.getByTestId("contact-photo").waitFor();
  console.log("Mobile contact photo passed: authenticated decoding, 401 renewal, web revision, photo removal, origin validation and logout cleanup.");
  console.log("Mobile contact list passed: API photo displayed automatically and web changes refreshed without reopening the screen.");
} finally { await browser.close(); await server.close(); }
