import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(file=>file&&existsSync(file));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  await page.addScriptTag({content:readFileSync(resolve(root,'tests/fixtures/ascii-reference-v1.js'),'utf8').replace('api.modules.ascii = Object.freeze(', 'global.AsciiGlyphReference = Object.freeze(')});
  await page.addScriptTag({content:readFileSync(resolve(root,'tests/fixtures/ascii-glyph-extension-check.js'),'utf8')});
  const result=await page.evaluate(()=>AsciiGlyphExtensionCheck.run());
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:96,loop:2});classicV4View.select(null);});
  await page.click('#global-inspector-tabs [data-global-inspector="sampling"]');
  const card=page.locator('#inspector-context [data-v4-effect-id="ascii-mapping"]');
  const field=label=>card.locator('.global-field').filter({has:page.locator('span').filter({hasText:new RegExp('^'+label+'$')})});
  await field('启用').locator('input').check();
  const original=await page.evaluate(()=>JSON.parse(JSON.stringify(ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'])));
  await field('字符集').locator('input').fill(' .:-=+*#%@Aa中界');await field('字符集').locator('input').press('Tab');
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'].glyphAtlas?.characters.includes('中'));
  const edited=await page.evaluate(()=>JSON.parse(JSON.stringify(ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'])));
  assert.equal(edited.font,'builtin');assert.equal(edited.glyphAtlas.width,8);assert.equal(edited.glyphAtlas.height,8);
  assert.equal(edited.glyphRatio,original.glyphRatio);assert.ok(edited.glyphAtlas.characters.includes('中'));
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await field('字符集').locator('input').inputValue(),original.characters);
  // Reapply through the real field, then package / restore / export the masks.
  await field('字符集').locator('input').fill(' .:-=+*#%@Aa中界');await field('字符集').locator('input').press('Tab');
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'].glyphAtlas?.characters.includes('中'));
  const html=await page.evaluate(async()=>{
    const scene=ToSampoolV4Workspace.current(),packed=await EditorVNextProjectPackage.build(scene),restored=(await EditorVNextProjectPackage.restore(packed.files)).scene;
    const before=scene.sceneEffects.sample['ascii-mapping'].glyphAtlas,after=restored.sceneEffects.sample['ascii-mapping'].glyphAtlas;
    if(JSON.stringify(before)!==JSON.stringify(after))throw Error('项目恢复改变字形');
    return EditorVNextDeliveryBuilder.embedHtml({scene:restored,name:'mixed-glyphs',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;
  });
  assert.ok(!html.includes('__TOSAMPOOL_ASCII_FONT_DATA')&&!html.includes('ChillBitmap16-default.js')&&!html.includes('ChillBitmap7-default.js'),'导出不能携带整套默认字体或其加载器');
  const exported=await browser.newPage();await exported.setContent(html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));
  assert.equal(await exported.locator('[data-tosampool-error]').count(),0);await exported.close();
  const fontSelect=card.locator('select').filter({has:page.locator('option[value="chill-16"]')});
  await fontSelect.selectOption('chill-16');
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'].glyphAtlas?.font==='chill-16');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'].glyphAtlas.width),16);
  await fontSelect.selectOption('builtin');
  await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'].glyphAtlas?.width===8);
  const unavailable=await browser.newPage();
  await unavailable.addInitScript(()=>{FontFace.prototype.load=function(){return Promise.reject(new Error('test font unavailable'));};});
  await unavailable.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href,{waitUntil:'domcontentloaded'});
  await unavailable.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const refused=await unavailable.evaluate(async()=>{
    let rejected=false,guarded=false;
    try{await EditorClassicV4AsciiControl.ensureBuiltinFont({font:'builtin',characters:'A中'});}catch{rejected=true;}
    try{ToSampoolRuntimeVNext.modules.ascii.prepare({font:'builtin',characters:'A中'});}catch{guarded=true;}
    return rejected&&guarded&&EditorClassicV4AsciiControl.fontStatus().state==='failed';
  });
  assert.ok(refused,'载入失败不能默默烘焙系统回退字体');await unavailable.close();
  assert.deepEqual(errors,[]);
  const {contactSheet,...report}=result;
  writeFileSync(resolve(root,'docs/architecture/v4-ascii-mixed-glyphs.png'),Buffer.from(contactSheet.split(',')[1],'base64'));
  writeFileSync(resolve(root,'docs/architecture/v4-ascii-mixed-glyphs.json'),JSON.stringify(report,null,2)+'\n');
  console.log('ASCII fixed mixed atlas / density / cache / Inspector / undo / export passed',JSON.stringify(report));
}finally{await browser.close();}
