import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('找不到 Edge；请设置 TOSAMPOOL_EDGE_PATH');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error&&error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?e2e=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const modules=await page.evaluate(()=>({
    pattern:typeof window.EditorClassicV4PatternField?.render,
    color:typeof window.EditorClassicV4ColorControl?.controls,
    effectCard:typeof window.EditorClassicV4InspectorEffectCard?.adopt,
    effectParameters:typeof window.EditorClassicV4EffectParameters?.plan,
    overlayPattern:typeof window.EditorClassicV4OverlayPatternCodec?.toEffect,
    inspector:typeof window.EditorClassicV4InspectorController?.create,
  }));
  assert.deepEqual(modules,{pattern:'function',color:'function',effectCard:'function',effectParameters:'function',overlayPattern:'function',inspector:'function'},'Classic 页面必须加载 Inspector 的已拆分模块');
  assert.deepEqual(errors,[],'拆分模块不能引入页面运行时异常');
  console.log('✓ V4 Inspector 模块加载：颜色、图样与主 Inspector 已正确连接');
}finally{await browser.close();}
