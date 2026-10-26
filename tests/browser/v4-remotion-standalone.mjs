import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {existsSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1100,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route(/^https?:/,route=>route.abort());
  await page.goto(pathToFileURL(resolve(root,'tests/experiments/remotion-adapter/dist/standalone.html')).href);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('官方效果链')).catch(async error=>{console.error(JSON.stringify({errors,status:await page.locator('#status').textContent()}));throw error;});
  const before=await page.locator('#output').evaluate(canvas=>canvas.toDataURL());
  await page.locator('[data-field="brightness.amount"]').fill('.55');
  await page.waitForFunction(before=>document.querySelector('#output').toDataURL()!==before,before);
  await page.screenshot({path:resolve(root,'docs/architecture/v4-remotion-adapter-2026-10-25.png'),fullPage:true});
  assert.deepEqual(errors,[]);const report={offlineHttpBlocked:true,uiLivePreview:true,controls:await page.locator('[data-field]').count(),errors};
  writeFileSync(resolve(root,'docs/architecture/v4-remotion-adapter-standalone-2026-10-25-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
