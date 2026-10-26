import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(resolve(import.meta.dirname,'../../examples/device-check/index.html')).href);await page.locator('#run').click();await page.waitForFunction(()=>!document.querySelector('#save').disabled,{},{timeout:120000});const rows=await page.locator('#rows tr').count();assert.equal(rows,12);assert.equal(await page.locator('#rows tr').filter({hasText:'失败'}).count(),0);const cells=await page.locator('#rows tr').evaluateAll(rows=>rows.map(r=>r.children.length));assert.ok(cells.every(n=>n===6),'all benchmark cases finish without an error row');assert.deepEqual(errors,[]);console.log('✓ portable device baseline: 12 formal Runtime cases, no page errors');}finally{await browser.close();}
