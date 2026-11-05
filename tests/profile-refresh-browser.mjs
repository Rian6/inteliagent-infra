import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const accounts = JSON.parse(fs.readFileSync('.local/test-accounts.json', 'utf8'));
const browser = await chromium.launch({headless: true, executablePath: 'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
let photo = null;
let contactPhoto = true;
try {
  // Simulate a profile changed on another device without modifying anyone's photo.
  await page.route(url => url.pathname === '/api/user/me', async route => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({response, json: {...data, foto: photo}});
  });
  await page.route(url => url.pathname === '/users', async route => {
    const response = await route.fetch();
    const data = await response.json();
    const contact = data.find(user => user.nome === 'Agente Mobile');
    assert.ok(contact);
    await route.fulfill({response, json: data.map(user => ({...user, photoUrl: user.id === contact.id && contactPhoto ? `/users/${user.id}/photo?v=regression` : null}))});
  });
  await page.route(url => /^\/users\/\d+\/photo$/.test(url.pathname), async route => {
    assert.ok(route.request().headers().authorization?.startsWith('Bearer '));
    await route.fulfill({contentType: 'image/png', body: Buffer.from(png.split(',')[1], 'base64')});
  });
  await page.goto(accounts.webUrl);
  await page.getByLabel(/^Email/).fill(accounts.web.email);
  await page.getByLabel(/^Senha/).fill(accounts.web.password);
  await page.getByRole('button', {name: 'Entrar', exact: true}).click();
  const avatar = page.getByRole('link', {name: 'Meu perfil', exact: true});
  await avatar.waitFor();
  photo = png;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await avatar.locator('img').waitFor();
  assert.equal(await avatar.locator('img').getAttribute('src'), png);
  photo = null;
  const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/user/me');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await refreshed;
  await avatar.locator('img').waitFor({state: 'detached'});
  await page.getByRole('link', {name: 'Mensagens', exact: true}).click();
  const contact = page.getByRole('button', {name: 'Agente Mobile', exact: true});
  await contact.locator('img').waitFor();
  await contact.click();
  await page.waitForFunction(() => [...document.querySelectorAll('img')].filter(image => image.src.startsWith('blob:') && image.naturalWidth > 0).length >= 2);
  contactPhoto = false;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await contact.locator('img').waitFor({state: 'detached'});
  await page.waitForFunction(() => ![...document.querySelectorAll('img')].some(image => image.src.startsWith('blob:')));
  console.log('Profile refresh passed: photo added and removed on another device is reflected without reloading.');
  console.log('Contact photos passed: authenticated images in contact list and conversation header, removal reflected on focus.');
} finally {
  await browser.close();
}
