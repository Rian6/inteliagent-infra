import { chromium } from 'playwright';
import fs from 'node:fs';

const demo = JSON.parse(fs.readFileSync('.local/demo.json', 'utf8'));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe' });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://localhost:5173');
await page.getByRole('textbox', { name: /^Email/ }).fill(demo.email);
await page.getByLabel(/^Senha/).fill(demo.password);
await page.getByRole('button', { name: 'Entrar', exact: true }).click();
await page.getByText('Uma visão do cuidado em campo').waitFor();
await page.getByRole('button', { name: 'Atualizar' }).waitFor({ state: 'visible' });
await page.screenshot({ path: '.local/dashboard-desktop.png', fullPage: true });
for (const name of ['Planejamento', 'Agentes', 'Mensagens', 'Visão geral']) {
  await page.getByRole('link', { name, exact: true }).click();
  await page.waitForTimeout(400);
}
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: 'Abrir navegação' }).click();
await page.getByRole('link', { name: 'Planejamento', exact: true }).click();
await page.waitForTimeout(500);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (overflow) throw new Error('Mobile viewport has horizontal overflow');
await page.screenshot({ path: '.local/dashboard-mobile.png', fullPage: true });
// Exercise the real Socket.IO transport between two authenticated browsers.
const agentPage = await browser.newPage();
const colleaguePage = await browser.newPage();
for (const [actor,email] of [[agentPage,demo.agentEmail],[colleaguePage,'colleague@inteliagent.local']]) {
  actor.on('pageerror', error => errors.push(error.message));
  await actor.goto('http://localhost:5173');
  await actor.getByRole('textbox', { name: /^Email/ }).fill(email);
  await actor.getByLabel(/^Senha/).fill(demo.password);
  await actor.getByRole('button', { name: 'Entrar', exact: true }).click();
  await actor.getByRole('link', { name: 'Mensagens', exact: true }).click();
}
await agentPage.getByRole('button', { name: 'Colleague', exact: true }).click();
await colleaguePage.getByRole('button', { name: 'Agent', exact: true }).click();
const message = `Mensagem de validação local ${Date.now()}`;
await agentPage.getByLabel('Sua mensagem').fill(message);
await agentPage.getByRole('button', { name: 'Enviar', exact: true }).click();
await colleaguePage.getByText(message, { exact: true }).waitFor();
await agentPage.close(); await colleaguePage.close();
await page.getByRole('button', { name: 'Sair', exact: true }).click();
await page.getByRole('heading', {name:'Entre na sua conta',exact:true}).waitFor();
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
console.log('Browser checks passed: login, navigation, mobile layout, private chat delivery, logout, and no uncaught errors.');
