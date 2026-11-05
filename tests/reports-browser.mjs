import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const a = JSON.parse(fs.readFileSync(".local/test-accounts.json", "utf8")),
  fixture = JSON.parse(
    fs.readFileSync(".local/pdf-permissions-fixture.json", "utf8"),
  );
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(a.webUrl);
  await page.getByLabel(/^Email/).fill(a.web.email);
  await page.getByLabel(/^Senha/).fill(a.web.password);
  assert.ok((await page.locator("svg").count()) >= 3);
  await page.screenshot({ path: ".local/final-web-login.png" });
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByText("Uma visão do cuidado em campo").waitFor();
  await page.screenshot({ path: ".local/final-web-home.png", fullPage: true });
  await page.getByRole("link", { name: "Configuração", exact: true }).click();
  await page.getByText("Permissões por usuário", { exact: true }).waitFor();
  await page.getByText("64003", { exact: false }).waitFor();
  await page.getByRole("button", {name:"Configurar permissões de agente.teste@inteliagent.local",exact:true}).click();
  const toggle = page.getByRole("switch", {
    name: "Cadastrar planejamentos · agente.teste@inteliagent.local",
    exact: true,
  });
  await toggle.waitFor();
  assert.equal(await toggle.isChecked(), true);
  assert.equal(await page.getByRole('button',{name:'Salvar permissões de Agente de teste de permissões',exact:true}).isDisabled(),true);
  await page.screenshot({
    path: ".local/final-web-permissions.png",
    fullPage: true,
  });
  await page.goto(a.webUrl + '/planejamento/cadastrar/' + fixture.planId);
  let download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Baixar PDF',exact:true}).click();
  let d=await download;assert.match(d.suggestedFilename(),/^PNCD-PR-4104808/);await d.saveAs('.local/boletim-web-baixado.pdf');
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.goto(a.webUrl+'/planejamento');
  await page.getByLabel('Buscar região ou zona').fill('Validação PDF e permissões');
  const row=page.locator('tr').filter({has:page.locator('a[href="/planejamento/cadastrar/'+fixture.planId+'?aba=visitas"]')});
  await row.waitFor();await row.getByLabel('1 visitas de Validação PDF e permissões',{exact:true}).waitFor();
  download=page.waitForEvent('download');await row.getByRole('button',{name:'Baixar PDF de Validação PDF e permissões',exact:true}).click();
  d=await download;await d.saveAs('.local/boletim-lista-web.pdf');
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.screenshot({path:'.local/duplex-planning-list.png',fullPage:true});
  await page.goto(a.webUrl+'/planejamento/cadastrar/'+fixture.planId);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page
    .getByRole("button", { name: "Baixar PDF", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.goto(a.webUrl+'/planejamento/cadastrar/'+fixture.planId+'?aba=visitas');
  await page.getByRole('button',{name:'Editar visita 1',exact:true}).click();
  await page.getByRole('button',{name:'Dados do boletim',exact:true}).click();
  await page.getByRole('button',{name:'Resultado do laboratório',exact:true}).click();
  assert.equal(await page.getByLabel('Laboratório',{exact:true}).inputValue(),'Laboratório municipal (teste)');
  await page.getByRole('button',{name:'Cancelar edição',exact:true}).click();
  const emptyId=await page.evaluate(async()=>{const {api}=await import('/src/services/api.js');const {data}=await api.get('/api/planejamento-list');return data.find(p=>p.quantidadeVisitas===0).codigo;});
  await page.goto(a.webUrl+'/planejamento/cadastrar/'+emptyId);await page.getByRole('button',{name:'Baixar PDF',exact:true}).click();
  await page.getByRole('dialog').waitFor();assert.equal(await page.getByRole('dialog').locator('input,select,textarea').count(),0);await page.getByRole('link',{name:'Revisar planejamento',exact:true}).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Web UI passed: direct PDF downloads without input, planning count, list download, login/settings and narrow layout.",
  );
} finally {
  await browser.close();
}
