import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const demo = JSON.parse(fs.readFileSync('.local/demo.json', 'utf8'));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 320, height: 740 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function layout(label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: horizontal page overflow`);
  const undersized = await page.getByRole('button').evaluateAll(buttons => buttons.filter(button => {
    const rect = button.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.height < 47 || rect.width < 47);
  }).map(button => button.getAttribute('aria-label') || button.textContent));
  assert.deepEqual(undersized, [], `${label}: touch targets below 48px`);
}
async function navigate(name) {
  const menu = page.getByRole('button', { name: 'Abrir navegação' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('link', { name, exact: true }).click();
  await page.waitForTimeout(350);
  await page.getByRole('heading', { level: 1 }).waitFor();
}
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await layout('320px login');
  await page.getByLabel(/^Senha/).fill(demo.password);
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
  assert.equal(await page.getByLabel(/^Senha/).getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Ocultar senha', exact: true }).click();
  await page.screenshot({ path: '.local/ui-login-320.png', fullPage: true });
  await page.getByRole('textbox', { name: /^Email/ }).fill(demo.email);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByText('Uma visão do cuidado em campo').waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['Visão geral', 'Planejamento', 'Agentes', 'Mensagens']) {
      await navigate(name);
      await layout(`${width}px ${name}`);
      if (name === 'Visão geral') {
        await page.getByRole('button', {name:'Visitas recentes',exact:true}).click();
        await page.getByRole('table', {name:'Visitas recentes',exact:true}).waitFor();
        await layout(`${width}px recent visits`);
        await page.getByRole('button', {name:'Resumo',exact:true}).click();
      }
      if (name === 'Mensagens') {
        const contact = page.locator('main .MuiListItemButton-root').first();
        if (await contact.isVisible()) {
          await contact.click();
          await page.getByLabel('Sua mensagem').fill('Mensagem longa para validar quebra de linha e composição em telas estreitas. '.repeat(8));
          await layout(`${width}px chat composer`);
          if (width === 390) await page.screenshot({ path: '.local/ui-chat-390.png', fullPage: true });
        }
      }
      if ((width === 1440 && name === 'Visão geral') || (width === 390 && name === 'Planejamento')) {
        await page.screenshot({ path: `.local/ui-${width}.png`, fullPage: true });
      }
    }
    await navigate('Planejamento');
    await page.getByRole('link', { name: 'Novo planejamento' }).click();
    await page.getByLabel('Nome da região').waitFor();
    await layout(`${width}px planning form`);
  }
  await page.keyboard.press('Control+Home');
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Tab');
  await page.locator('.skip-link').focus();
  assert.equal(await page.locator('.skip-link').evaluate(link => link.getBoundingClientRect().top >= 0), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'conteudo');
  assert.deepEqual(errors, []);
  console.log('UI checks passed: 320/390/768/1440px, main routes, planning form, chat composition, 48px buttons, password toggle, keyboard skip link, no page overflow or uncaught errors.');
} finally { await browser.close(); }
