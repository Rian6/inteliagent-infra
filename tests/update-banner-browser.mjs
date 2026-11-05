import { server } from './mobile-ui/server.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const page=await browser.newPage({viewport:{width:390,height:844}});
const release={version:'1.0.3',versionCode:4,packageName:'com.rian3054.inteliagentapp',sha256:'a'.repeat(64),size:100,downloadUrl:'https://github.com/Rian6/inteliagent-app/releases/download/v1.0.3/test.apk'};
try {
  await page.goto('http://127.0.0.1:5184/#/updates');
  await page.getByText('Conteúdo do aplicativo').waitFor();
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    await page.evaluate(release=>window.__updatesStore.setState({release,severity:'normal',dismissedBuild:null}),release);
    const banner=page.getByRole('alert');await banner.waitFor();
    const box=await banner.boundingBox();assert.ok(box.y<2);assert.ok(box.width<=width);
    const button=await page.getByRole('button',{name:'Atualizar aplicativo',exact:true}).boundingBox();assert.ok(button.x+button.width<=width);
    await page.getByRole('button',{name:'Ocultar aviso até o próximo login'}).click();
    await page.getByRole('alert').waitFor({state:'detached'});
    await page.evaluate(()=>window.__updatesStore.setState({severity:'persistent'}));
    await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'Ocultar aviso até o próximo login'}).count(),0);
    await page.getByTestId('underlying-action').click();
    await page.evaluate(()=>window.__updatesStore.setState({severity:'mandatory'}));
    await page.getByText('Atualização obrigatória',{exact:true}).waitFor();
    const before=await page.evaluate(()=>window.__underlyingClicks);
    await assert.rejects(page.getByTestId('underlying-action').click({timeout:300}));
    assert.equal(await page.evaluate(()=>window.__underlyingClicks),before);
  }
  await page.screenshot({path:'.local/update-banner-mandatory.png'});
  console.log('Update banner browser passed: top placement at 320/390px, update button, session dismissal, persistent patch warning and required update interaction blocking.');
}finally{await browser.close();await server.close();}
