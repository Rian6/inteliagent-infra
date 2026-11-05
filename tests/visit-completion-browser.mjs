import { server } from './mobile-ui/server.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try {
  for(const width of [320,390]) {
    const page=await browser.newPage({viewport:{width,height:700}});
    await page.addInitScript(()=>{window.__routeParams={idPlanejamento:'plan-a'};});
    await page.goto('http://127.0.0.1:5184/#/atendimento/visitaConcluida');
    await page.getByText('Visita concluída!',{exact:true}).waitFor();
    const button=page.getByRole('button',{name:'Voltar às visitas',exact:true});
    const bounds=await button.boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=700);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`.local/visit-completed-${width}.png`});
    await button.click();
    await page.waitForURL('**/#/atendimento/visitas');
    await page.close();
  }
  console.log('Visit completion browser passed: screen, visible return button, no overflow at 320/390px.');
} finally {await browser.close();await server.close();}
