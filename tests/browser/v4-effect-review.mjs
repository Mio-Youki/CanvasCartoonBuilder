import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(fileURLToPath(new URL('../../examples/pattern-proposals/dual-ray/preview.html',import.meta.url))).href);await page.waitForFunction(()=>window.patternReview);
  await page.locator('[data-review-reset]').click();await page.locator('[data-parameter-reset]').click();
  const confirm=page.locator('[data-review-confirm]');assert.equal(await confirm.textContent(),'确认本轮通过');assert.equal(await page.getByText('下载提案参数',{exact:true}).count(),0);
  await confirm.click();assert.equal(await page.evaluate(()=>patternReview.review().review.confirmation.decision),'approve-proposal');
  await page.locator('[data-review-name]').fill('双色光芒');await page.locator('[data-review-label="centerX"]').fill('水平中心');
  await page.locator('[data-review-annotate="centerX"]').click();await page.getByRole('textbox',{name:'中心 X备注',exact:true}).fill('允许更大偏移');
  await page.locator('[data-review-param="pairs"]').fill('18');assert.equal(await confirm.textContent(),'确认本轮修订');
  await page.getByRole('textbox',{name:'修订备注',exact:true}).fill('颜色更温暖');await confirm.click();
  assert.equal(await page.evaluate(()=>patternReview.review().review.confirmation.decision),'request-changes');
  await page.reload();await page.waitForFunction(()=>window.patternReview);assert.equal(await page.locator('[data-review-name]').inputValue(),'双色光芒');assert.equal(await page.locator('[data-review-param="pairs"]').inputValue(),'18');
  await page.locator('[data-review-reset]').click();assert.equal(await page.locator('[data-review-param="pairs"]').inputValue(),'18');assert.equal(await confirm.textContent(),'确认本轮通过');
  await page.locator('[data-review-adopt]').click();assert.equal(await page.evaluate(()=>patternReview.review().review.defaults.pairs),18);
  await page.locator('[data-parameter-reset]').click();assert.equal(await page.evaluate(()=>patternReview.review().review.defaults.pairs),18);assert.equal(await page.locator('[data-review-param="pairs"]').inputValue(),'12');
  await page.locator('[data-review-experiment]').check();await page.locator('[data-review-segment="target"]').click();await page.locator('[data-review-clock="centerX"]').click();await page.locator('[data-review-param="centerX"]').fill('.2');await page.locator('[data-review-segment="change"]').click();assert.ok(Math.abs(await page.evaluate(()=>patternReview.values().centerX)-.41)<1e-8);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  console.log('✓ 真实审阅流程：默认可编辑／按key备注／确认与失效／刷新恢复／双重置隔离／默认值显式采用／原时序仍正常');
}finally{await browser.close();}
