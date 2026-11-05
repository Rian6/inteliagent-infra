import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const accounts=JSON.parse(fs.readFileSync('.local/test-accounts.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(accounts.webUrl);await page.getByLabel(/^Email/).fill(accounts.web.email);await page.getByLabel(/^Senha/).fill(accounts.web.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('link',{name:'Meu perfil',exact:true}).click();await page.getByText(accounts.web.email,{exact:true}).waitFor();await page.getByRole('button',{name:'Adicionar foto',exact:true}).waitFor();
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;const c=canvas.getContext('2d');c.fillStyle='#E6F1FD';c.fillRect(0,0,320,320);c.fillStyle='#1C1C1C';c.font='bold 100px sans-serif';c.textAlign='center';c.fillText('AW',160,198);return canvas.toDataURL('image/png').split(',')[1];});
 const photo={name:'perfil.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 await page.getByLabel('Selecionar foto de perfil',{exact:true}).setInputFiles(photo);await page.getByAltText('Prévia da foto de perfil').waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('button',{name:'Adicionar foto',exact:true}).waitFor();
 await page.getByLabel('Selecionar foto de perfil',{exact:true}).setInputFiles(photo);await page.getByRole('button',{name:'Salvar foto',exact:true}).click();await page.getByText('Foto atualizada.',{exact:true}).waitFor();await page.getByAltText('Foto de Administrador Web',{exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'Trocar foto',exact:true}).waitFor();assert.ok((await page.getByAltText('Foto de Administrador Web',{exact:true}).getAttribute('src')).startsWith('data:image/jpeg;base64,'));
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);}
 await page.screenshot({path:'.local/profile-web.png',fullPage:true});
 await page.getByRole('button',{name:'Remover foto',exact:true}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.getByRole('button',{name:'Trocar foto',exact:true}).waitFor();
 await page.getByRole('button',{name:'Remover foto',exact:true}).click();await page.getByRole('button',{name:'Remover',exact:true}).click();await page.getByText('Foto removida.',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 console.log('Profile web passed: header entry, fields, image preview/cancel, real upload, restored photo after reload, removal and responsive widths.');
}catch(error){console.log((await page.locator('body').innerText()).slice(-1600));throw error;}finally{await browser.close();}
