#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(import.meta.dirname, '../..');
const legacyPath = resolve(root, 'img2asset-layout-v1.html');
const candidatePath = resolve(root, 'img2asset-v4-classic.html');
const displayFontPath = resolve(root, 'assets/fonts/PressStart2P-Regular.ttf');
const displayFontLicensePath = resolve(root, 'assets/fonts/PressStart2P-OFL.txt');
const artifactDir = mkdtempSync(join(tmpdir(), 'tosampool-classic-parity-'));
const edgeCandidates = [
  process.env.TOSAMPOOL_EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const executablePath = edgeCandidates.find(existsSync);
const fontPath = [
  'C:\\Windows\\Fonts\\arial.ttf',
  'C:\\Windows\\Fonts\\segoeui.ttf',
  'C:\\Windows\\Fonts\\msyh.ttc'
].find(existsSync);
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const facadeTag = /<script src="editor\/session-facade\.js"><\/script>\r?\n/;
const v4ColorControlTag = /<script src="\.\/editor\/classic-v4-color-control\.js"><\/script>\r?\n/;
const v4PatternFieldTag = /<script src="\.\/editor\/classic-v4-pattern-field\.js"><\/script>\r?\n/;
const v4EffectCardTag = /<script src="\.\/editor\/classic-v4-inspector-effect-card\.js"><\/script>\r?\n/;
const v4EffectParametersTag = /<script src="\.\/editor\/classic-v4-inspector-effect-parameters\.js"><\/script>\r?\n/;
const v4OverlayPatternCodecTag = /<script src="\.\/editor\/classic-v4-overlay-pattern-codec\.js"><\/script>\r?\n/;
const v4RuntimeTag = /<script src="home-scene-vnext\.js"><\/script>\r?\n/;
const v4RuntimeInlineTag = /<script src="runtime-vnext-inline\.js"><\/script>\r?\n/;
const v4ExporterTag = /<script src="editor\/vnext-exporter\.js"><\/script>\r?\n/;
const v4PreviewSchedulerTag = /<script src="editor\/vnext-preview-scheduler\.js"><\/script>\r?\n/;
const v4CanvasHitTag = /<script src="editor\/vnext-canvas-hit\.js"><\/script>\r?\n/;
const v4ViewControllerTag = /<script src="editor\/classic-v4-view-controller\.js"><\/script>\r?\n/;
const v4SceneMutationTag = /<script src="editor\/vnext-scene-mutation\.js"><\/script>\r?\n/;
const v4MaskStateTag = /<script src="editor\/vnext-mask-state\.js"><\/script>\r?\n/;
const v4MaskControllerTag = /<script src="editor\/classic-v4-mask-controller\.js"><\/script>\r?\n/;
const v4EffectPanelControllerTag = /<script src="editor\/classic-v4-effect-panel-controller\.js"><\/script>\r?\n/;
const v4ParticleStateTag = /<script src="editor\/vnext-particle-state\.js"><\/script>\r?\n/;
const v4ParticleControllerTag = /<script src="editor\/classic-v4-particle-controller\.js"><\/script>\r?\n/;
const v4TimelineStateTag = /<script src="editor\/vnext-timeline-state\.js"><\/script>\r?\n/;
const v4TimelineControllerTag = /<script src="editor\/classic-v4-timeline-controller\.js"><\/script>\r?\n/;
const v4StructureStateTag = /<script src="editor\/vnext-structure-state\.js"><\/script>\r?\n/;
const v4PartsStateTag = /<script src="editor\/vnext-parts-state\.js"><\/script>\r?\n/;
const v4TextStateTag = /<script src="editor\/vnext-text-state\.js"><\/script>\r?\n/;
const v4FontStateTag = /<script src="editor\/vnext-font-state\.js"><\/script>\r?\n/;
const v4FontControllerTag = /<script src="editor\/classic-v4-font-controller\.js"><\/script>\r?\n/;
const v4TransformControllerTag = /<script src="editor\/classic-v4-transform-controller\.js"><\/script>\r?\n/;
const v4PartTransformControllerTag = /<script src="editor\/classic-v4-part-transform-controller\.js"><\/script>\r?\n/;
const v4InspectorControllerTag = /<script src="editor\/classic-v4-inspector-controller\.js"><\/script>\r?\n/;
const v4DrawingControllerTag = /<script src="editor\/classic-v4-drawing-controller\.js"><\/script>\r?\n/;
const v4ShortcutControllerTag = /<script src="editor\/classic-v4-shortcut-controller\.js"><\/script>\r?\n/;
const fileControllerTag = /<script src="editor\/scene-file-controller\.js"><\/script>\r?\n/;
const legacyConverterTag = /<script src="editor\/legacy-v4-converter\.js"><\/script>\r?\n/;
const fileControllerBlock = /\/\* V4_CLASSIC_FILE_CONTROLLER_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_FILE_CONTROLLER_END \*\/\r?\n/;
const assetControllerTag = /<script src="editor\/asset-controller\.js"><\/script>\r?\n/;
const assetRecipeTag = /<script src="editor\/vnext-asset-recipe\.js"><\/script>\r?\n/;
const assetStateTag = /<script src="editor\/vnext-asset-state\.js"><\/script>\r?\n/;
const assetWorkflowTag = /<script src="editor\/vnext-asset-workflow\.js"><\/script>\r?\n/;
const assetControllerBlock = /\/\* V4_CLASSIC_ASSET_CONTROLLER_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_ASSET_CONTROLLER_END \*\/\r?\n/;
const v4ViewStartBlock = /\/\* V4_CLASSIC_VIEW_START_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_VIEW_START_END \*\/\r?\n/;
const v4PaintStyleBlock = /\s*\/\* V4_CLASSIC_PAINT_STYLE_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_PAINT_STYLE_END \*\/\r?\n/;
const v4MaskStyleBlock = /\s*\/\* V4_CLASSIC_MASK_STYLE_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_MASK_STYLE_END \*\/\r?\n/;
const v4EffectPanelStyleBlock = /\s*\/\* V4_CLASSIC_EFFECT_PANEL_STYLE_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_EFFECT_PANEL_STYLE_END \*\/\r?\n/;
const v4EffectPanelHtmlBlock = /\s*<!-- V4_CLASSIC_EFFECT_PANEL_HTML_BEGIN -->[\s\S]*?<!-- V4_CLASSIC_EFFECT_PANEL_HTML_END -->\r?\n/;
const v4PlaybackBlock = /\s*\/\* V4_CLASSIC_PLAYBACK_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_PLAYBACK_END \*\/\r?\n/;
const v4PerformanceUiBlock = /\/\* V4_CLASSIC_PERFORMANCE_UI_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_PERFORMANCE_UI_END \*\/\r?\n/;
const v4TestArtifactBlock = /\/\* V4_CLASSIC_TEST_ARTIFACT_BEGIN \*\/[\s\S]*?\/\* V4_CLASSIC_TEST_ARTIFACT_END \*\/\r?\n/;
const legacySource = readFileSync(legacyPath, 'utf8');
const candidateSource = readFileSync(candidatePath, 'utf8');

/* Visual-language contract: V4 must remain a product surface, not a migration
 * workbench. Keep readable UI tokens and do not reintroduce permanent tips. */
assert.ok(candidateSource.includes('<title>ToSampool · 图森破</title>'), 'V4 must use the product title');
assert.ok(existsSync(displayFontPath) && existsSync(displayFontLicensePath), 'V4 display font and its OFL notice must be self-hosted together');
assert.ok(candidateSource.includes('./assets/fonts/PressStart2P-Regular.ttf'), 'V4 must load the self-hosted display font rather than a remote CDN');
assert.ok(candidateSource.includes('--ui-xs:11px; --ui-sm:12px; --ui-md:13px; --ui-lg:14px; --ui-xl:16px;'), 'V4 must retain the readable UI type scale');
assert.ok(candidateSource.includes('--left-rail-w:clamp(264px, 18vw, 304px);'), 'V4 must retain the resizable-left-rail baseline');
assert.ok(candidateSource.includes('--right-rail-w:clamp(320px, 22vw, 360px);'), 'V4 must retain the resizable-right-rail baseline');
for (const removedCopy of ['功能副本 · 原始编辑器未改动', '空场景：从素材库拖入图片，或用绘制工具创建元素。', '在右侧 Inspector 启用效果后会显示在这里。']) {
  assert.ok(!candidateSource.includes(removedCopy), `V4 must not expose permanent implementation guidance: ${removedCopy}`);
}

/* Historical source-diff parity was useful while the candidate was a dual
 * session wrapper.  v4 is now a product-only entry, so it must not be forced
 * to load the converter or HOME_SCENE merely to satisfy this old comparison.
 * Keep the capture helper below for a future explicit visual-diff fixture; the
 * executable gate in this file is now the v4 Classic Shell integration flow. */
if (false) {
assert.ok(facadeTag.test(candidateSource), 'Classic Shell must load the approved Session Facade');
assert.ok(v4ColorControlTag.test(candidateSource) && v4PatternFieldTag.test(candidateSource), 'Classic Shell must load shared v4 color and pattern controls');
assert.ok(v4EffectCardTag.test(candidateSource) && v4EffectParametersTag.test(candidateSource) && v4OverlayPatternCodecTag.test(candidateSource), 'Classic Shell must load shared v4 effect card helpers');
assert.ok(v4RuntimeTag.test(candidateSource), 'Classic Shell must load the isolated v4 Runtime');
assert.ok(v4RuntimeInlineTag.test(candidateSource), 'Classic Shell must load the self-contained v4 Runtime source mirror');
assert.ok(v4ExporterTag.test(candidateSource), 'Classic Shell must load the isolated v4 fixed-time artifact exporter');
assert.ok(v4PreviewSchedulerTag.test(candidateSource), 'Classic Shell must load the approved v4 Preview Scheduler');
assert.ok(v4CanvasHitTag.test(candidateSource) && v4ViewControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 view boundary');
assert.ok(v4SceneMutationTag.test(candidateSource) && v4StructureStateTag.test(candidateSource) && v4TransformControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 transform boundary');
assert.ok(v4MaskStateTag.test(candidateSource), 'Classic Shell must load the approved unified v4 mask boundary');
assert.ok(v4MaskControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 Canvas mask editor');
assert.ok(v4EffectPanelControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 effect index');
assert.ok(v4ParticleStateTag.test(candidateSource) && v4ParticleControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 particle boundary');
assert.ok(v4PerformanceUiBlock.test(candidateSource), 'Classic Shell must expose the approved v4 performance readout');
assert.ok(v4PartTransformControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 part transform boundary');
assert.ok(v4TextStateTag.test(candidateSource), 'Classic Shell must load the approved v4 text boundary');
assert.ok(v4FontStateTag.test(candidateSource) && v4FontControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 font reference boundary');
assert.ok(v4PartsStateTag.test(candidateSource), 'Classic Shell must load the approved v4 parts boundary');
assert.ok(v4InspectorControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 Inspector boundary');
assert.ok(v4DrawingControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 drawing boundary');
assert.ok(v4ShortcutControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 shortcut and history boundary');
assert.ok(v4TimelineStateTag.test(candidateSource) && v4TimelineControllerTag.test(candidateSource), 'Classic Shell must load the approved v4 timeline boundary');
assert.ok(fileControllerTag.test(candidateSource), 'Classic Shell must load the approved Scene File Controller');
assert.ok(legacyConverterTag.test(candidateSource), 'Classic Shell must load the explicit Legacy to v4 converter');
assert.ok(assetControllerTag.test(candidateSource), 'Classic Shell must load the approved Asset Controller');
assert.ok(assetRecipeTag.test(candidateSource) && assetStateTag.test(candidateSource) && assetWorkflowTag.test(candidateSource), 'Classic Shell must load the approved v4 asset boundary');
const normalizedCandidate = candidateSource
  .replace(facadeTag, '')
  .replace(v4ColorControlTag, '')
  .replace(v4PatternFieldTag, '')
  .replace(v4EffectCardTag, '')
  .replace(v4EffectParametersTag, '')
  .replace(v4OverlayPatternCodecTag, '')
  .replace(v4RuntimeTag, '')
  .replace(v4RuntimeInlineTag, '')
  .replace(v4ExporterTag, '')
  .replace(v4PreviewSchedulerTag, '')
  .replace(v4CanvasHitTag, '')
  .replace(v4ViewControllerTag, '')
  .replace(v4SceneMutationTag, '')
  .replace(v4MaskStateTag, '')
  .replace(v4MaskControllerTag, '')
  .replace(v4EffectPanelControllerTag, '')
  .replace(v4ParticleStateTag, '')
  .replace(v4ParticleControllerTag, '')
  .replace(v4TimelineStateTag, '')
  .replace(v4TimelineControllerTag, '')
  .replace(v4StructureStateTag, '')
  .replace(v4PartsStateTag, '')
  .replace(v4TextStateTag, '')
  .replace(v4FontStateTag, '')
  .replace(v4FontControllerTag, '')
  .replace(v4TransformControllerTag, '')
  .replace(v4PartTransformControllerTag, '')
  .replace(v4InspectorControllerTag, '')
  .replace(v4DrawingControllerTag, '')
  .replace(v4ShortcutControllerTag, '')
  .replace(fileControllerTag, '')
  .replace(legacyConverterTag, '')
  .replace(fileControllerBlock, '')
  .replace(assetControllerTag, '')
  .replace(assetRecipeTag, '')
  .replace(assetStateTag, '')
  .replace(assetWorkflowTag, '')
  .replace(assetControllerBlock, '')
  .replace(v4ViewStartBlock, '')
  .replace(v4PaintStyleBlock, '\n')
  .replace(v4MaskStyleBlock, '\n')
  .replace(v4EffectPanelStyleBlock, '\n')
  .replace(v4EffectPanelHtmlBlock, '\n')
  .replace(v4PlaybackBlock, '\n')
  .replace(v4PerformanceUiBlock, '')
  .replace(v4TestArtifactBlock, '')
  .replace("$('preview-quality').addEventListener('change',ev=>{previewPerformance.setMode(ev.target.value);previewRuntimeMultiplier=0;state.runtimePaintAt=0;if(classicV4Vertical&&classicV4View){classicV4View.scheduleRender('quality-change');updateClassicV4PerformanceUi(performance.now(),true);return;}syncPreviewRuntimeOptions();updatePreviewPerformanceUi(performance.now(),true);if(!state.playing)paintRuntimePreview(state.t);});", "$('preview-quality').addEventListener('change',ev=>{previewPerformance.setMode(ev.target.value);previewRuntimeMultiplier=0;syncPreviewRuntimeOptions();state.runtimePaintAt=0;updatePreviewPerformanceUi(performance.now(),true);if(!state.playing)paintRuntimePreview(state.t);});")
  .replace("  if (classicV4Vertical && window.ToSampoolSession && ToSampoolSession.activeId === 'v4') return saveArtifact(await currentV4TestArtifact(), true);\n", '')
  .replace("['scene.new', '新建场景', () => classicSceneFiles.newDocument()]", "['scene.new', '新建场景', () => openNewSceneChoice()]")
  .replace("['scene.open', '打开场景', () => classicSceneFiles.open()]", "['scene.open', '打开场景', () => openSceneCommand()]")
  .replace("['scene.save', '保存场景', () => classicSceneFiles.save()]", "['scene.save', '保存场景', () => saveSceneCommand()]")
  .replace('drop.addEventListener(\'drop\', ev => { ev.preventDefault(); drop.classList.remove(\'over\'); classicAssets.importFiles(ev.dataTransfer.files); });', 'drop.addEventListener(\'drop\', ev => { ev.preventDefault(); drop.classList.remove(\'over\'); loadFiles(ev.dataTransfer.files); });')
  .replace("$('file').addEventListener('change', () => classicAssets.importFiles($('file').files));", "$('file').addEventListener('change', () => loadFiles($('file').files));")
  .replace('if(files&&files.length)classicAssets.importFiles(files);', 'if(files&&files.length)loadFiles(files);')
  .replace('add.addEventListener(\'click\', ev => { ev.stopPropagation(); state.selSrc=s.id; classicAssets.addToScene(s); });', 'add.addEventListener(\'click\', ev => { ev.stopPropagation(); state.selSrc=s.id; addElement(s); });')
  .replace("$('btn-add').addEventListener('click', () => classicAssets.addSelectedToScene());", "$('btn-add').addEventListener('click', () => { const s = selSource(); if (s) addElement(s); });")
  .replace("$('btn-background').addEventListener('click', () => classicAssets.openBackground({ intent:'existing' }));", "$('btn-background').addEventListener('click', () => openBackgroundWizard('existing'));")
  .replace('if(classicV4Vertical)commitClassicV4PreparedSource(src);', '')
  .replace("    if(classicV4Vertical){ToSampoolV4Assets.openBackground({source:src,layout,createScene:!existing,canvasWidth:w,canvasHeight:h});mask.remove();$('m-stage').textContent='已建立 v4 背景层：'+(layout==='none'?'保持原状':layout==='stretch'?'拉伸图片':'重复纹理')+'。';return;}\n", '')
  .replace("    const layout = box.querySelector('input[name=bg-layout]:checked').value;\n    if (!existing)", "    if (!existing)")
  .replace("    const scopeMode = existing ?", "    const layout = box.querySelector('input[name=bg-layout]:checked').value;\n    const scopeMode = existing ?")
  .replace(/\r\n/g, '\n');
const normalizedLegacy = legacySource.replace(/\r\n/g, '\n');
if (normalizedCandidate !== normalizedLegacy) {
  let index = 0;
  while (index < normalizedCandidate.length && index < normalizedLegacy.length && normalizedCandidate[index] === normalizedLegacy[index]) index += 1;
  throw new Error(`Classic Shell source differs outside approved controller seams at ${index}: candidate=${JSON.stringify(normalizedCandidate.slice(index,index+140))} legacy=${JSON.stringify(normalizedLegacy.slice(index,index+140))}`);
}
}

const browser = await chromium.launch(executablePath ? { headless: true, executablePath } : { headless: true, channel: 'msedge' });

async function capture(filePath) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('requestfailed', request => errors.push(`request failed: ${request.url()} (${request.failure()?.errorText || 'unknown'})`));
  console.log(`Opening ${basename(filePath)}...`);
  const query=filePath===candidatePath?'?e2e=1&legacy=1':'?e2e=1';
  await page.goto(`${pathToFileURL(filePath).href}${query}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.__PATCHARIUM_TEST__ && document.querySelector('#structure-tree'), null, { timeout: 15000 });
  console.log(`Freezing ${basename(filePath)} at t=0...`);
  await page.evaluate(() => {
    window.__PATCHARIUM_TEST__.setTime(0);
    if (window.HomeScene && window.HomeScene.setExternalPlayback) window.HomeScene.setExternalPlayback(true);
    if (window.HomeScene && window.HomeScene.seek) window.HomeScene.seek(0);
  });
  await page.waitForTimeout(100);
  const snapshot = await page.evaluate(() => {
    const selectors = [
      '.app-toolbar', '#left-panel', '#structure-tree', '#asset-pane', '#stage-meta-bar',
      '#stage-wrap', '#home-scene', '#stage', '#editor-overlay', '#right', '#timeline-dock'
    ];
    const round = value => Math.round(value * 100) / 100;
    const rects = Object.fromEntries(selectors.map(selector => {
      const node = document.querySelector(selector);
      if (!node) return [selector, null];
      const rect = node.getBoundingClientRect();
      return [selector, { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) }];
    }));
    const canvases = [...document.querySelectorAll('canvas')].map(canvas => ({
      id: canvas.id,
      width: canvas.width,
      height: canvas.height,
      cssWidth: round(canvas.getBoundingClientRect().width),
      cssHeight: round(canvas.getBoundingClientRect().height)
    }));
    const buttons = [...document.querySelectorAll('button:not(#effect-pane button)')].map(button => ({
      id: button.id,
      text: button.textContent.trim(),
      disabled: button.disabled,
      hidden: button.hidden
    }));
    const sceneCanvas = document.querySelector('#home-scene');
    const editorCanvas = document.querySelector('#stage');
    return {
      title: document.title,
      bodyClass: document.body.className,
      rects,
      canvases,
      buttons,
      scenePixels: sceneCanvas ? sceneCanvas.toDataURL('image/png') : null,
      editorPixels: editorCanvas ? editorCanvas.toDataURL('image/png') : null,
      selection: window.__PATCHARIUM_TEST__.selection(),
      scene: window.__PATCHARIUM_TEST__.scene()
        ? { w: window.__PATCHARIUM_TEST__.scene().w, h: window.__PATCHARIUM_TEST__.scene().h, loop: window.__PATCHARIUM_TEST__.scene().loop }
        : null
    };
  });
  const session = await page.evaluate(() => window.ToSampoolSession ? {
    active: window.ToSampoolSession.snapshot(),
    adapters: window.ToSampoolSession.list().map(item => ({ id:item.id, format:item.format })),
    v4HasDocument: !!(window.ToSampoolV4Workspace && window.ToSampoolV4Workspace.hasDocument)
  } : null);
  snapshot.scenePixelsHash = createHash('sha256').update(snapshot.scenePixels || '').digest('hex');
  snapshot.editorPixelsHash = createHash('sha256').update(snapshot.editorPixels || '').digest('hex');
  delete snapshot.scenePixels;
  delete snapshot.editorPixels;
  await page.click('#btn-new');
  await page.waitForSelector('.wizard-mask');
  snapshot.newSceneDialog = await page.evaluate(() => {
    const dialog = document.querySelector('.wizard-mask .wizard'), rect = dialog.getBoundingClientRect();
    return {
      title: dialog.querySelector('h2')?.textContent.trim() || '',
      buttons: [...dialog.querySelectorAll('button')].map(button => button.textContent.trim()),
      rect: { x:Math.round(rect.x), y:Math.round(rect.y), width:Math.round(rect.width), height:Math.round(rect.height) }
    };
  });
  await page.getByRole('button', { name:'取消', exact:true }).click();
  await page.waitForSelector('.wizard-mask', { state:'detached' });
  await page.setInputFiles('#file', {
    name:'fixture.png', mimeType:'image/png',
    buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+ZQw0WQAAAABJRU5ErkJggg==', 'base64')
  });
  await page.waitForSelector('.wizard-mask .asset-process-grid');
  snapshot.assetProcessDialog = await page.evaluate(() => {
    const dialog = document.querySelector('.wizard-mask .wizard'), preview = dialog.querySelector('canvas');
    return {
      title:dialog.querySelector('h2')?.textContent.trim() || '',
      controls:[...dialog.querySelectorAll('input,select')].map(control => ({ type:control.type || control.tagName.toLowerCase(), value:control.value })),
      buttons:[...dialog.querySelectorAll('button')].map(button => button.textContent.trim()),
      preview:{ width:preview?.width || 0, height:preview?.height || 0 }
    };
  });
  await page.getByRole('button', { name:'确认入库', exact:true }).click();
  await page.waitForSelector('.wizard-mask', { state:'detached' });
  await page.click('#lib .asset-card-action.add');
  await page.waitForFunction(() => (window.__PATCHARIUM_TEST__.scene()?.images || []).length === 1);
  snapshot.assetPlacement = await page.evaluate(() => ({
    cards:document.querySelectorAll('#lib .lib-item').length,
    images:(window.__PATCHARIUM_TEST__.scene()?.images || []).length,
    selectedElement:!!window.__PATCHARIUM_TEST__.selection().elementId
  }));
  await page.evaluate(() => window.ToSampoolSession ? classicAssets.openBackground({ intent:'existing' }) : openBackgroundWizard('existing'));
  await page.waitForSelector('.wizard-mask .wizard');
  snapshot.backgroundDialog = await page.evaluate(() => {
    const dialog = document.querySelector('.wizard-mask .wizard');
    return {
      title:dialog.querySelector('h2')?.textContent.trim() || '',
      buttons:[...dialog.querySelectorAll('button')].map(button => button.textContent.trim()),
      choices:[...dialog.querySelectorAll('input[type=radio]')].map(input => ({ value:input.value, checked:input.checked }))
    };
  });
  await page.getByRole('button', { name:'取消', exact:true }).click();
  await page.waitForSelector('.wizard-mask', { state:'detached' });
  await page.evaluate(() => {
    const perf = document.querySelector('#preview-perf');
    if (perf) perf.textContent = '固定性能读数';
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
    document.head.appendChild(style);
    document.activeElement?.blur?.();
  });
  await page.waitForTimeout(50);
  const screenshotPath = join(artifactDir, `${basename(filePath, '.html')}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await context.close();
  console.log(`Captured ${basename(filePath)}.`);
  return { snapshot, errors, screenshotPath, session };
}

async function verifyV4AssetVertical() {
  const context = await browser.newContext({ viewport:{ width:1600, height:1000 }, deviceScaleFactor:1, acceptDownloads:true });
  await context.addInitScript(() => { try { delete window.showOpenFilePicker; delete window.showSaveFilePicker; } catch (_) {} });
  const ordinaryPage=await context.newPage();
  await ordinaryPage.goto(pathToFileURL(candidatePath).href,{waitUntil:'domcontentloaded',timeout:15000});
  await ordinaryPage.waitForFunction(()=>window.ToSampoolSession?.activeId==='v4'&&window.ToSampoolV4Workspace?.hasDocument,null,{timeout:15000});
  assert.equal(await ordinaryPage.locator('#effect-pane:not([hidden])').count(),1,'ordinary Classic v4 entry must expose the effect index container');
  assert.deepEqual(await ordinaryPage.locator('#global-inspector-tabs [data-global-inspector]:visible').allTextContents(),['成样','叠加滤镜','采样滤镜'],'ordinary Classic v4 entry must expose the scene information architecture');
  await ordinaryPage.close();
  const page = await context.newPage(), errors=[];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('requestfailed', request => errors.push(`request failed: ${request.url()} (${request.failure()?.errorText || 'unknown'})`));
  await page.goto(`${pathToFileURL(candidatePath).href}?e2e=1`, { waitUntil:'domcontentloaded', timeout:15000 });
  await page.waitForFunction(() => window.ToSampoolSession?.activeId === 'v4' && window.ToSampoolV4Workspace?.hasDocument, null, { timeout:15000 });
  const toolbarBands=await page.evaluate(()=>{
    const rect=selector=>{const box=document.querySelector(selector)?.getBoundingClientRect();return box&&{x:box.x,y:box.y,width:box.width,height:box.height,bottom:box.bottom};};
    return {tools:rect('.workbench-tools'),left:rect('.scene-file-actions'),main:rect('.toolbar-main'),right:rect('.toolbar-output-actions'),stage:rect('.p-stage'),inspector:rect('.p-props'),caption:getComputedStyle(document.querySelector('.p-props > .panel-caption')).display,head:getComputedStyle(document.querySelector('.p-props > .props-head')).display};
  });
  assert.equal(Math.round(toolbarBands.left.x),0,'scene commands must begin at the left rail');
  assert.equal(Math.round(toolbarBands.main.x),Math.round(toolbarBands.stage.x),'drawing tools must align with the stage column');
  assert.equal(Math.round(toolbarBands.right.x),Math.round(toolbarBands.inspector.x),'output commands must align with the Inspector column');
  assert.equal(Math.round(toolbarBands.inspector.y),Math.round(toolbarBands.tools.bottom),'Inspector tabs must begin immediately beneath the output command band');
  assert.equal(toolbarBands.caption,'none','obsolete Inspector caption must not consume visual space');
  assert.equal(toolbarBands.head,'none','obsolete Inspector heading must not consume visual space');
  assert.equal(await page.locator('#effect-pane:not([hidden])').count(),1,'active Classic v4 session must expose the effect index container');
  assert.deepEqual(await page.locator('#global-inspector-tabs [data-global-inspector]:visible').allTextContents(),['成样','叠加滤镜','采样滤镜'],'scene Inspector must expose the v4 information architecture');
  await page.setInputFiles('#file', {
    name:'v4-fixture.png', mimeType:'image/png',
    buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+ZQw0WQAAAABJRU5ErkJggg==', 'base64')
  });
  await page.waitForSelector('.wizard-mask .asset-process-grid');
  assert.equal(await page.locator('.wizard-mask .palette').count(),0,'asset preprocessing no longer exposes palette quantization');
  await page.fill('.wizard-mask .sw', '32');
  await page.locator('.wizard-mask .sw').dispatchEvent('change');
  await page.waitForFunction(() => document.querySelector('.wizard-mask .sh')?.value === '32');
  await page.getByRole('button', { name:'确认入库', exact:true }).click();
  await page.waitForFunction(() => Object.keys(window.ToSampoolV4Workspace.current().assets || {}).length === 1);
  assert.equal(await page.locator('#lib .lib-item').count(), 1, 'v4 import must keep the Legacy asset-card UI');
  await page.click('#lib .asset-card-action.add');
  await page.waitForFunction(() => window.ToSampoolV4Workspace.current().entities.length === 1);
  await page.waitForFunction(() => document.querySelectorAll('#structure-tree [data-v4-entity-id]').length === 1 && document.querySelector('#v4-classic-stage')?.width === 320);
  const visibleProjection = await page.evaluate(() => ({
    canvas:document.querySelector('#v4-classic-stage').toDataURL('image/png'),
    tree:document.querySelector('#structure-tree [data-v4-entity-id]')?.dataset.v4EntityId || null,
    legacyStageHidden:document.querySelector('#stage').style.visibility === 'hidden'
  }));
  assert.ok(visibleProjection.canvas.startsWith('data:image/png;base64,'));
  assert.equal(visibleProjection.tree, await page.evaluate(() => window.ToSampoolV4Workspace.current().entities[0].id));
  assert.equal(visibleProjection.legacyStageHidden, true);
  const staticPlayersBefore=await page.evaluate(()=>ToSampoolV4Workspace.getRuntimeMetrics().playerCreates);await page.click('#tl-play');await page.waitForTimeout(120);await page.click('#tl-play');const scheduledStatic=await page.evaluate(()=>({scheduler:classicV4PreviewScheduler.snapshot(),players:ToSampoolV4Workspace.getRuntimeMetrics().playerCreates}));assert.ok(scheduledStatic.scheduler.staticSkips>0,'Classic Shell playback must let the shared Preview Scheduler skip static frames');assert.ok(scheduledStatic.players<=staticPlayersBefore+1,'static playback must reuse the hydrated Runtime player instead of rebuilding it per tick');
  const performanceFixture=await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current(),item=scene.entities[0],snapshot={width:scene.width,height:scene.height,x:item.x,y:item.y,w:item.w,h:item.h};ToSampoolV4Workspace.mutate(value=>{value.width=1920;value.height=1080;const target=value.entities[0];target.x=0;target.y=0;target.w=1920;target.h=1080;});return snapshot;});await page.waitForFunction(()=>document.querySelector('#v4-classic-stage')?.width===1920&&classicV4View.performance().lastRender);const performanceBefore=await page.evaluate(()=>classicV4View.performance());await page.click('#tl-play');await page.waitForFunction(count=>classicV4View.performance().scheduler.staticSkips>=count+300,performanceBefore.scheduler.staticSkips,{timeout:10000});await page.click('#tl-play');const performanceAfter=await page.evaluate(()=>classicV4View.performance());assert.ok(performanceAfter.scheduler.staticSkips-performanceBefore.scheduler.staticSkips>=300,'1920×1080 static playback must skip the main Canvas for every measured visible RAF');assert.ok(performanceAfter.scheduler.renders-performanceBefore.scheduler.renders<=1,'1920×1080 static playback must not repeatedly redraw the main Canvas');assert.ok(performanceAfter.runtime.playerCreates-performanceBefore.runtime.playerCreates<=1,'1920×1080 static playback must reuse one hydrated Runtime player');assert.equal(performanceAfter.frameSamples,300,'Classic v4 performance readout must retain a rolling 300-frame window');assert.ok(performanceAfter.frameP95>0,'Classic v4 must expose a measured playback RAF P95');console.log(`Classic v4 1920x1080 static baseline: RAF P95 ${performanceAfter.frameP95.toFixed(2)}ms, render P95 ${performanceAfter.renderP95.toFixed(2)}ms, draws ${performanceAfter.scheduler.renders-performanceBefore.scheduler.renders}, skips ${performanceAfter.scheduler.staticSkips-performanceBefore.scheduler.staticSkips}`);await page.evaluate(snapshot=>ToSampoolV4Workspace.mutate(scene=>{scene.width=snapshot.width;scene.height=snapshot.height;const item=scene.entities[0];Object.assign(item,{x:snapshot.x,y:snapshot.y,w:snapshot.w,h:snapshot.h});}),performanceFixture);await page.waitForFunction(snapshot=>ToSampoolV4Workspace.current().width===snapshot.width,performanceFixture);
  await page.click('#structure-tree [data-v4-entity-id]');
  assert.equal(await page.locator('#structure-tree [data-v4-entity-id].sel').count(), 1, 'tree selection must highlight the v4 entity');
  assert.deepEqual(await page.locator('#element-inspector-tabs [data-element-inspector]:visible').allTextContents(),['成样','加样','采样'],'object Inspector must replace the Legacy dynamic/local-FX/sampling tabs');
  await page.evaluate(()=>classicV4View.select(null));
  const box=await page.locator('#v4-classic-stage').boundingBox(), hit=await page.evaluate(() => {const item=window.ToSampoolV4Workspace.current().entities[0],scene=window.ToSampoolV4Workspace.current();return{x:(item.x+item.w/2)/scene.width,y:(item.y+item.h/2)/scene.height,id:item.id};});
  await page.mouse.click(box.x+box.width*hit.x,box.y+box.height*hit.y);
  assert.equal(await page.locator(`#structure-tree [data-v4-entity-id="${hit.id}"].sel`).count(), 1, 'Canvas selection must synchronize back to the v4 tree');
  const clipboardBefore=await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length);
  await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');
  await page.waitForFunction(count=>ToSampoolV4Workspace.current().entities.length===count+1,clipboardBefore);
  const pastedId=await page.evaluate(()=>classicV4View.selectedId);
  assert.notEqual(pastedId,hit.id,'v4 paste must create a new object id');
  assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'粘贴','v4 paste must be recorded by the unified v4 history');
  await page.keyboard.press('Control+z');await page.waitForFunction(({count,id})=>ToSampoolV4Workspace.current().entities.length===count&&!ToSampoolV4Workspace.current().entities.some(item=>item.id===id),{count:clipboardBefore,id:pastedId});
  await page.keyboard.press('Control+Shift+z');await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.some(item=>item.id===id),pastedId);
  await page.keyboard.press('Control+z');
  await page.waitForFunction(count=>ToSampoolV4Workspace.current().entities.length===count,clipboardBefore);
  const positionMotionButton=page.locator('#inspector-context .global-field').filter({hasText:'Y'}).first().locator('.v4-motion-button');await positionMotionButton.click();const bobRow=page.locator('#inspector-context .global-section').filter({hasText:'动态 · 位置'}).locator('.global-field').filter({hasText:'漂浮'});await bobRow.locator('input[type="checkbox"]').check();await page.waitForFunction(id=>!!ToSampoolV4Workspace.current().entities.find(item=>item.id===id).anim?.bob,hit.id);assert.equal(await page.locator('#inspector-context .global-section').filter({hasText:'动态 · 位置'}).locator('input[type="number"]').count(),3,'基础静态参数右侧必须披露其对应动态参数');await bobRow.locator('input[type="checkbox"]').uncheck();await page.waitForFunction(id=>!ToSampoolV4Workspace.current().entities.find(item=>item.id===id).anim,hit.id);
  await page.evaluate(()=>classicV4View.select(null));const backgroundColor=page.locator('#inspector-context .global-section').filter({hasText:'背景'}).locator('input[type="color"]').first();await backgroundColor.fill('#123456');await backgroundColor.dispatchEvent('input');await page.waitForFunction(()=>ToSampoolV4Workspace.current().background.color==='#123456');assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().background.alpha),1,'新场景背景颜色必须默认可见');const transitionSelect=page.locator('#inspector-context .global-section').filter({hasText:'过渡'}).locator('select');await transitionSelect.selectOption('scan');await page.waitForFunction(()=>ToSampoolV4Workspace.current().timeline.scenes?.[0]?.transition?.type==='scan');assert.equal(await page.locator('#inspector-context .global-section').filter({hasText:'过渡'}).locator('input[type="color"]').count(),1,'Scene 成样页必须提供过渡颜色');await transitionSelect.selectOption('none');await page.mouse.click(box.x+box.width*hit.x,box.y+box.height*hit.y);
  assert.equal(await page.locator('#scene-bar .scene-chip').count(),1,'a blank v4 scene must project one implicit Scene label without writing data');
  await page.locator('#scene-bar .scene-add').last().click();await page.waitForFunction(()=>document.querySelectorAll('#scene-bar .scene-chip').length===2);
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().timeline.scenes.length),2,'the Legacy edge plus gesture must create a persisted v4 Scene segment');
  const topTimelineBox=await page.locator('#tl').boundingBox();await page.mouse.move(topTimelineBox.x+topTimelineBox.width*.65,topTimelineBox.y+topTimelineBox.height/2);await page.mouse.down();await page.mouse.move(topTimelineBox.x+topTimelineBox.width*.55,topTimelineBox.y+topTimelineBox.height/2,{steps:4});await page.mouse.up();
  assert.ok(Math.abs(await page.evaluate(()=>ToSampoolV4Workspace.current().timeline.scenes[0].f[1])-.55)<.03,'dragging the top-axis boundary must resize adjacent v4 Scene segments');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'调整 Scene 边界');
  page.once('dialog',dialog=>dialog.accept('第二幕'));await page.locator('#scene-bar .scene-label').nth(1).dblclick();await page.waitForFunction(()=>ToSampoolV4Workspace.current().timeline.scenes[1].name==='第二幕');
  await page.locator('#scene-bar .scene-chip').nth(1).locator('.x').click();await page.waitForFunction(()=>document.querySelectorAll('#scene-bar .scene-chip').length===1);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().timeline.scenes.length),1,'deleting a v4 Scene label must leave one full-loop segment');
  await page.waitForFunction(id=>document.querySelector('#tl-context-note')?.textContent.includes(id)||document.querySelector('#tl-context-note')?.textContent.includes('显示时段'),hit.id);
  const timelineBox=await page.locator('#tl-context').boundingBox();
  await page.keyboard.down('Alt');await page.mouse.click(timelineBox.x+timelineBox.width*.4,timelineBox.y+timelineBox.height/2);await page.keyboard.up('Alt');
  assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.visibility[id].segments.length,hit.id),2,'Alt+click must explicitly split the selected v4 object visibility lane');
  assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'切分显示时段');
  await page.mouse.dblclick(timelineBox.x+timelineBox.width*.75,timelineBox.y+timelineBox.height/2);
  assert.equal(await page.evaluate(id=>EditorVNextTimelineState.visibilityAt(ToSampoolV4Workspace.current(),id,.75),hit.id),false,'double click must turn the selected visibility segment off');
  assert.equal(await page.evaluate(async id=>{const canvas=document.createElement('canvas'),stats=await ToSampoolV4Workspace.renderTo(canvas,ToSampoolV4Workspace.current().loop*.75);return stats.directObjects;},hit.id),0,'the v4 Runtime must skip an entity outside its visible segment');
  assert.equal(await page.evaluate(()=>classicV4Changes.undo()),'切换显示时段');
  await page.mouse.move(timelineBox.x+timelineBox.width*.4,timelineBox.y+timelineBox.height/2);await page.mouse.down();await page.mouse.move(timelineBox.x+timelineBox.width*.55,timelineBox.y+timelineBox.height/2,{steps:4});await page.mouse.up();
  assert.ok(Math.abs(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.visibility[id].segments[0].f[1],hit.id)-.55)<.03,'dragging the shared boundary must resize both adjacent visibility segments');
  assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'调整显示时段边界','one boundary drag must create one shared history entry');
  await page.evaluate(()=>classicV4Changes.undo());
  await page.evaluate(id=>classicV4Changes.run('清理时间轴验收数据',scene=>EditorVNextTimelineState.clearVisibility(scene,id)),hit.id);
  const baseTimedX=await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).x,hit.id),setInspectorX=next=>page.evaluate(value=>{const row=[...document.querySelectorAll('#inspector-context .global-field')].find(item=>item.querySelector('span')?.textContent==='X'),input=row.querySelector('input');input.value=String(value);input.dispatchEvent(new Event('change',{bubbles:true}));},next);
  await page.click('#btn-timing-mode');assert.equal(await page.evaluate(()=>classicV4Timeline.mode),'property');assert.equal(await page.locator('#btn-timing-mode.active').count(),1,'first timing click must provide immediate armed feedback');
  await setInspectorX(baseTimedX+9);assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[id].segments[0].values.x,hit.id),baseTimedX+9,'armed Inspector write must create a Step overlay instead of mutating the base object');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).x,hit.id),baseTimedX);
  await page.click('#btn-timing-mode');assert.deepEqual(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[id].segments[0].values,hit.id),{},'clicking an active timed segment must clear its overlay');
  const propertyBox=await page.locator('#tl-context').boundingBox();for(const fraction of [.25,.75]){await page.keyboard.down('Alt');await page.mouse.click(propertyBox.x+propertyBox.width*fraction,propertyBox.y+propertyBox.height/2);await page.keyboard.up('Alt');}assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[id].segments.length,hit.id),3,'property lane must use explicit Alt splits');
  await page.mouse.click(propertyBox.x+propertyBox.width*.1,propertyBox.y+propertyBox.height/2);await page.click('#btn-timing-mode');await setInspectorX(baseTimedX);
  await page.mouse.click(propertyBox.x+propertyBox.width*.9,propertyBox.y+propertyBox.height/2);await page.click('#btn-timing-mode');await setInspectorX(baseTimedX+40);
  await page.evaluate(()=>classicV4Timeline.seek(ToSampoolV4Workspace.current().loop*.5));await page.mouse.move(propertyBox.x+propertyBox.width*.5,propertyBox.y+propertyBox.height/2);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#tl-linear-toggle')).display!=='none');await page.evaluate(()=>{const button=document.querySelector('#tl-linear-toggle');if(!button||getComputedStyle(button).display==='none')throw new Error('Linear toggle disappeared before activation');button.click();});
  assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[id].segments[1].type,hit.id),'linear');assert.ok(Math.abs(await page.evaluate(id=>ToSampoolRuntimeVNext.modules.frame.create(ToSampoolV4Workspace.current(),ToSampoolV4Workspace.current().loop*.5).valuesFor(ToSampoolV4Workspace.current().entities.find(item=>item.id===id)).x,hit.id)-(baseTimedX+20))<.001,'middle Linear segment must interpolate neighboring Step values');
  await page.mouse.click(propertyBox.x+propertyBox.width*.9,propertyBox.y+propertyBox.height/2);await setInspectorX(baseTimedX+60);assert.ok(Math.abs(await page.evaluate(id=>ToSampoolRuntimeVNext.modules.frame.create(ToSampoolV4Workspace.current(),ToSampoolV4Workspace.current().loop*.5).valuesFor(ToSampoolV4Workspace.current().entities.find(item=>item.id===id)).x,hit.id)-(baseTimedX+30))<.001,'editing a Step endpoint must update Linear without rebuilding it');
  await page.evaluate(id=>classicV4Changes.run('清理属性时序验收数据',scene=>EditorVNextTimelineState.clear(scene,id)),hit.id);await page.evaluate(id=>classicV4View.select(id),hit.id);await page.click('#btn-timing-mode');
  const timedBase=await page.evaluate(id=>{const item=ToSampoolV4Workspace.current().entities.find(entry=>entry.id===id);return{x:item.x,y:item.y};},hit.id);let timedTransformBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();await page.mouse.move(timedTransformBox.x+timedTransformBox.width/2,timedTransformBox.y+timedTransformBox.height/2);await page.mouse.down();await page.mouse.move(timedTransformBox.x+timedTransformBox.width/2+18,timedTransformBox.y+timedTransformBox.height/2+11,{steps:4});await page.mouse.up();
  const timedCanvasResult=await page.evaluate(id=>{const item=ToSampoolV4Workspace.current().entities.find(entry=>entry.id===id),values=ToSampoolV4Workspace.current().timeline.tracks[id].segments[0].values;return{base:{x:item.x,y:item.y},timed:{x:values.x,y:values.y}};},hit.id);assert.deepEqual(timedCanvasResult.base,timedBase,'Canvas timing must leave base values untouched');assert.ok(timedCanvasResult.timed.x>timedBase.x&&timedCanvasResult.timed.y>timedBase.y,'Canvas move while timing is armed must write the current Step');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'移动对象');await page.evaluate(()=>classicV4Changes.undo());
  await page.evaluate(id=>classicV4Changes.run('清理 Canvas 时序验收数据',scene=>EditorVNextTimelineState.clear(scene,id)),hit.id);await page.evaluate(id=>classicV4View.select(id),hit.id);
  await page.click('#element-inspector-tabs [data-element-inspector="fx"]');const projectionCard=page.locator('#inspector-context [data-v4-effect-id="projection"]');await projectionCard.locator('input[type="checkbox"]').check();await page.waitForFunction(id=>!!ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.decorate.projection,hit.id);
  await page.waitForFunction(()=>document.querySelector('#effect-pane')?.classList.contains('open')&&document.querySelector('#effect-list [data-id="projection"]'));assert.equal(await page.locator('#effect-list [data-id="projection"]').count(),1,'enabling an object effect must add one Registry-backed effect index card');
  await page.click('#element-inspector-tabs [data-element-inspector="props"]');await page.locator('#effect-list [data-id="projection"]').click();assert.equal(await page.locator('#element-inspector-tabs [data-element-inspector="fx"].active').count(),1,'effect index card must focus the matching Inspector page');assert.equal(await page.evaluate(()=>classicV4Timeline.trackKey),`effect:object:${hit.id}:projection`,'effect index card must synchronize the lower timeline');
  const sampleStage=page.locator('#effect-list section[data-stage="sample"] .v4-effect-stage-title'),maskStage=page.locator('#effect-list section[data-stage="mask"]');const sampleStageBox=await sampleStage.boundingBox(),maskStageBox=await maskStage.boundingBox();await page.mouse.move(sampleStageBox.x+sampleStageBox.width/2,sampleStageBox.y+sampleStageBox.height/2);await page.mouse.down();await page.mouse.move(maskStageBox.x+maskStageBox.width/2,maskStageBox.y+2,{steps:5});await page.mouse.up();await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.pipeline[0]==='sample',hit.id);assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'调整对象处理阶段','dragging an object stage must create one history entry');await page.evaluate(()=>classicV4Changes.undo());await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.pipeline.join(',')==='mask,decorate,sample',hit.id);
  await page.click('#btn-timing-mode');const distanceRow=projectionCard.locator('.global-field').filter({hasText:'距离'});await distanceRow.locator('input[type="number"]').fill('9');await distanceRow.locator('input[type="number"]').dispatchEvent('change');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[`effect:object:${id}:projection`].segments[0].values.distance,hit.id),9,'effect parameter timing must write the focused effect track');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.decorate.projection.distance,hit.id),3,'effect Step overlay must not mutate its base configuration');await page.click('#btn-timing-mode');await page.locator('#effect-list [data-id="projection"] .effect-card-remove').click();await page.waitForFunction(id=>!ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.decorate.projection,hit.id);assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[`effect:object:${id}:projection`],hit.id),undefined,'removing an effect index card must disable the effect and remove its sparse timing track');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'停用 投影','effect index removal must create one shared history entry');await page.click('#element-inspector-tabs [data-element-inspector="props"]');
  await page.click('#element-inspector-tabs [data-element-inspector="sampling"]');const gridCard=page.locator('#inspector-context [data-v4-controller-id="sampling-grid"]'),gridSize=gridCard.locator('.global-field').filter({hasText:'尺寸'}).locator('input[type="number"]');assert.equal(await gridCard.locator('input[type="checkbox"]').count(),0,'共享采样规则不得伪装成可启用效果卡');await gridSize.fill('7');await gridSize.dispatchEvent('change');await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.sample.controllers['sampling-grid']?.size===7,hit.id);await gridCard.click();assert.equal(await page.evaluate(()=>classicV4Timeline.trackKey),`controller:object:${hit.id}:sampling-grid`,'共享采样规则选择必须同步自己的 Step 轨道');await page.click('#btn-timing-mode');await gridSize.fill('8');await gridSize.dispatchEvent('change');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[`controller:object:${id}:sampling-grid`].segments[0].values.size,hit.id),8,'控制器时序必须写入稀疏 Step 覆层');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.sample.controllers['sampling-grid'].size,hit.id),7,'控制器 Step 覆层不得改写基础规则值');assert.equal(await page.locator('#tl-linear-toggle').isVisible(),false,'Step-only 共享规则不得暴露 Linear');await page.click('#btn-timing-mode');await page.click('#element-inspector-tabs [data-element-inspector="props"]');assert.equal(await page.locator('#effect-list [data-kind="controller"][data-id="sampling-grid"]').count(),0,'共享规则不得在对象效果容器中生成效果卡');
  await page.evaluate(()=>classicV4View.select(null));await page.click('#global-inspector-tabs [data-global-inspector="overlay"]');const tintCard=page.locator('#inspector-context [data-v4-effect-id="tint-overlay"]');await tintCard.locator('.global-field').filter({hasText:'启用'}).locator('input[type="checkbox"]').check();await page.waitForFunction(()=>!!ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay']);await tintCard.locator('.v4-motion-title-button').click();await tintCard.locator('.global-field').filter({hasText:'动态'}).locator('input[type="checkbox"]').check();await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay'].motion?.enabled===true);assert.equal(await tintCard.locator('.global-field').filter({hasText:'动态方式'}).locator('select').inputValue(),'fade','效果标题右侧动态入口必须按 Registry 默认运动展开');assert.equal(await page.evaluate(()=>classicV4Timeline.trackKey),'effect:scene:overlay:tint-overlay','scene effect selection must synchronize the lower timeline without an entity selection');await page.click('#global-inspector-tabs [data-global-inspector="props"]');await page.locator('#effect-list [data-id="tint-overlay"]').click();assert.equal(await page.locator('#global-inspector-tabs [data-global-inspector="overlay"].active').count(),1,'scene effect index card must focus the scene overlay Inspector');assert.equal(await page.evaluate(()=>classicV4Timeline.trackKey),'effect:scene:overlay:tint-overlay','scene effect index card must restore the matching effect track');
  const sceneRangeMask=tintCard.locator('.global-field').filter({hasText:'范围蒙版'}).locator('select');await sceneRangeMask.selectOption('rect');await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay'].mask?.type==='rect');const sceneMaskInvert=tintCard.locator('.global-field').filter({hasText:'反相'}).locator('input[type="checkbox"]');await sceneMaskInvert.check();assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay'].mask.invert),true,'scene effect range mask must use the shared mask mutation path');
  await tintCard.locator('button').filter({hasText:'编辑'}).click();await page.waitForFunction(()=>classicV4Masks?.active?.scope==='scene');const sceneMaskCanvas=await page.locator('#v4-mask-overlay').boundingBox(),sceneMaskBefore=await page.evaluate(()=>ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay'].mask);await page.mouse.move(sceneMaskCanvas.x+1,sceneMaskCanvas.y+1);await page.mouse.down();await page.mouse.move(sceneMaskCanvas.x+21,sceneMaskCanvas.y+13,{steps:4});await page.mouse.up();await page.waitForFunction(before=>{const mask=ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay'].mask;return mask.w<before.w&&mask.h<before.h;},sceneMaskBefore);assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'缩放蒙版');await tintCard.locator('button').filter({hasText:'完成'}).click();await page.waitForFunction(()=>!classicV4Masks.active);
  await sceneRangeMask.selectOption('none');await page.waitForFunction(()=>ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay'].mask===null);
  await page.click('#btn-timing-mode');const tintAlpha=tintCard.locator('.global-field').filter({hasText:'透明度'}).locator('input[type="number"]');await tintAlpha.fill('0.45');await tintAlpha.dispatchEvent('change');assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().timeline.tracks['effect:scene:overlay:tint-overlay'].segments[0].values.alpha),.45);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay'].alpha),0,'scene effect Step overlay must not mutate its base configuration');await page.click('#btn-timing-mode');await page.locator('#effect-list [data-id="tint-overlay"] .effect-card-remove').click();await page.waitForFunction(()=>!ToSampoolV4Workspace.current().sceneEffects.overlay['tint-overlay']);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().timeline.tracks['effect:scene:overlay:tint-overlay']),undefined,'removing a scene effect index card must clear its sparse track');await page.click('#global-inspector-tabs [data-global-inspector="props"]');await page.evaluate(id=>classicV4View.select(id),hit.id);await page.click('#element-inspector-tabs [data-element-inspector="props"]');
  await page.waitForFunction(() => document.querySelector('#v4-transform-layer .v4-transform-box')?.style.display === 'block');
  const entitySnapshot = () => page.evaluate(() => { const item=window.ToSampoolV4Workspace.current().entities[0]; return { x:item.x,y:item.y,scaleX:item.scaleX??1,scaleY:item.scaleY??1,rot:item.rot??0 }; });
  const initialTransform=await entitySnapshot();
  let transformBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();
  await page.mouse.move(transformBox.x+transformBox.width/2,transformBox.y+transformBox.height/2);
  await page.mouse.down();await page.mouse.move(transformBox.x+transformBox.width/2+30,transformBox.y+transformBox.height/2+18,{steps:4});await page.mouse.up();
  const movedTransform=await entitySnapshot();
  assert.ok(movedTransform.x>initialTransform.x&&movedTransform.y>initialTransform.y,'v4 box drag must move the selected entity');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'移动对象','one move gesture must create one history entry');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undo()),'移动对象');
  await page.waitForFunction(expected => {const item=window.ToSampoolV4Workspace.current().entities[0];return item.x===expected.x&&item.y===expected.y;},initialTransform);
  transformBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();
  const se=await page.locator('#v4-transform-layer .v4-transform-handle.se').boundingBox();
  await page.mouse.move(se.x+se.width/2,se.y+se.height/2);await page.mouse.down();await page.mouse.move(se.x+se.width/2+24,se.y+se.height/2+16,{steps:4});await page.mouse.up();
  const scaledTransform=await entitySnapshot();
  assert.ok(scaledTransform.scaleX>initialTransform.scaleX&&scaledTransform.scaleY>initialTransform.scaleY,'v4 corner drag must scale the selected entity');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'缩放对象','one scale gesture must create one history entry');
  await page.evaluate(() => classicV4Transforms.changes.undo());
  await page.waitForFunction(expected => {const item=window.ToSampoolV4Workspace.current().entities[0];return (item.scaleX??1)===expected.scaleX&&(item.scaleY??1)===expected.scaleY;},initialTransform);
  transformBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();
  const rotateHandle=await page.locator('#v4-transform-layer .v4-transform-rotate').boundingBox();
  await page.mouse.move(rotateHandle.x+rotateHandle.width/2,rotateHandle.y+rotateHandle.height/2);await page.mouse.down();await page.mouse.move(transformBox.x+transformBox.width+25,transformBox.y+transformBox.height/2,{steps:5});await page.mouse.up();
  const rotatedTransform=await entitySnapshot();
  assert.ok(Math.abs(rotatedTransform.rot-initialTransform.rot)>30,'v4 rotate handle must rotate the selected entity');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'旋转对象','one rotate gesture must create one history entry');
  await page.evaluate(() => classicV4Transforms.changes.undo());
  await page.waitForFunction(expected => (window.ToSampoolV4Workspace.current().entities[0].rot??0)===expected.rot,initialTransform);
  transformBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();
  await page.mouse.move(transformBox.x+transformBox.width/2,transformBox.y+transformBox.height/2);await page.mouse.down();await page.mouse.move(transformBox.x+transformBox.width/2+35,transformBox.y+transformBox.height/2,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();
  assert.deepEqual(await entitySnapshot(),initialTransform,'Escape must restore the transform snapshot without adding history');
  await page.click('#v4-transform-layer .v4-transform-mirror.h');
  assert.equal((await entitySnapshot()).scaleX,-initialTransform.scaleX,'v4 horizontal mirror must use the Runtime scale transform');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'水平镜像');
  await page.evaluate(() => classicV4Transforms.changes.undo());
  await page.waitForFunction(expected => (window.ToSampoolV4Workspace.current().entities[0].scaleX??1)===expected.scaleX,initialTransform);
  await page.click('#v4-transform-layer .v4-transform-mirror.v');
  assert.equal((await entitySnapshot()).scaleY,-initialTransform.scaleY,'v4 vertical mirror must use the Runtime scale transform');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'垂直镜像');
  await page.evaluate(() => classicV4Transforms.changes.undo());
  await page.click('#v4-transform-layer .v4-transform-pivot');
  assert.equal(await page.evaluate(() => classicV4Transforms.pivotEditing),true,'pivot control must enter an explicit Canvas placement mode');
  const pivotLayer=await page.locator('#v4-transform-layer').boundingBox(),pivotTarget=await page.evaluate(() => {const item=window.ToSampoolV4Workspace.current().entities[0],scene=window.ToSampoolV4Workspace.current();return{x:(item.x+item.w*.25)/scene.width,y:(item.y+item.h*.75)/scene.height};});
  await page.mouse.click(pivotLayer.x+pivotLayer.width*pivotTarget.x,pivotLayer.y+pivotLayer.height*pivotTarget.y);
  const customPivot=await page.evaluate(() => window.ToSampoolV4Workspace.current().entities[0].pivot);
  assert.ok(Math.abs(customPivot.x-.25)<.02&&Math.abs(customPivot.y-.75)<.02,'Canvas pivot placement must persist normalized local coordinates');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'设置旋转中心');
  await page.waitForFunction(() => document.querySelector('#props-title')?.textContent === '对象 Inspector');
  const inspectorX=await page.evaluate(() => {const row=[...document.querySelectorAll('#inspector-context .global-field')].find(item=>item.querySelector('span')?.textContent==='X'),input=row&&row.querySelector('input'),before=+input.value;input.value=String(before+7);input.dispatchEvent(new Event('change',{bubbles:true}));return before;});
  assert.equal(await page.evaluate(() => window.ToSampoolV4Workspace.current().entities[0].x),inspectorX+7,'v4 Inspector must write object fields through the shared Scene Mutation');
  assert.equal(await page.evaluate(() => classicV4Changes.undoLabel),'设置对象 X');await page.evaluate(() => classicV4Changes.undo());
  const drawingCanvas=await page.locator('#v4-classic-stage').boundingBox();
  await page.click('[data-toolbar-mode="rect"]');await page.fill('#draw-radius','7');await page.check('#draw-strokeon');await page.fill('#line-width','3');
  await page.mouse.move(drawingCanvas.x+drawingCanvas.width*.12,drawingCanvas.y+drawingCanvas.height*.16);await page.mouse.down();await page.mouse.move(drawingCanvas.x+drawingCanvas.width*.28,drawingCanvas.y+drawingCanvas.height*.38,{steps:4});await page.mouse.up();
  const drawnRect=await page.evaluate(() => window.ToSampoolV4Workspace.current().entities.at(-1));
  assert.equal(drawnRect.type,'vector');assert.equal(drawnRect.parts.length,1);assert.equal(drawnRect.parts[0].type,'rect');assert.equal(drawnRect.parts[0].radius,7);assert.equal(drawnRect.parts[0].strokeWidth,3);assert.equal(await page.evaluate(() => classicV4Changes.undoLabel),'绘制矩形','one draw gesture must create one shared history entry');
  assert.equal(await page.evaluate(() => classicV4Drawing.mode),'select','drawing a closed primitive must return to select mode');
  await page.waitForFunction(()=>document.querySelector('#props-title')?.textContent==='对象 Inspector');const primitivePaintBefore=await page.locator('#v4-classic-stage').evaluate(canvas=>canvas.toDataURL());await page.evaluate(()=>{const row=[...document.querySelectorAll('#inspector-context .v4-paint-field')].find(node=>node.firstElementChild?.textContent==='纹理填充');row.querySelector('input[type="checkbox"]').click();});await page.waitForFunction(id=>!!ToSampoolV4Workspace.current().entities.find(item=>item.id===id)?.parts?.[0]?.fillPattern,drawnRect.id);await page.waitForTimeout(40);const primitivePaintAfter=await page.locator('#v4-classic-stage').evaluate(canvas=>canvas.toDataURL());assert.notEqual(primitivePaintAfter,primitivePaintBefore,'single-part vectors must use the same visible texture Paint path as internal parts');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'启用图元纹理');await page.evaluate(()=>classicV4Changes.undo());await page.waitForFunction(id=>!ToSampoolV4Workspace.current().entities.find(item=>item.id===id)?.parts?.[0]?.fillPattern,drawnRect.id);
  const partsFixture=await page.evaluate(id=>{classicV4Changes.run('追加内部图元',scene=>EditorVNextPartsState.add(scene,{ownerId:id,part:{id:'badge',name:'徽记',type:'ellipse',x:4,y:3,w:10,h:10,fill:'#ffffff'},normalize:false}));const owner=ToSampoolV4Workspace.current().entities.find(item=>item.id===id);return{ownerId:owner.id,basePartId:owner.parts[0].id,partId:owner.parts[1].id,type:owner.type};},drawnRect.id);assert.equal(partsFixture.type,'vector','adding a second shape must promote one primitive to a vector owner instead of creating a group');
  await page.evaluate(value=>classicV4View.selectPart(value.ownerId,value.partId),partsFixture);await page.waitForFunction(value=>document.querySelector(`#structure-tree [data-v4-part-id="${value.partId}"].sel`)&&document.querySelector('#props-title')?.textContent==='图元 Inspector',partsFixture);assert.equal(await page.locator(`#structure-tree [data-v4-entity-id="${partsFixture.ownerId}"] + [data-v4-part-id]`).count()>0,true,'expanded v4 owner must expose internal parts in the structure tree');
  const paintBefore=await page.locator('#v4-classic-stage').evaluate(canvas=>canvas.toDataURL());await page.evaluate(()=>{const row=[...document.querySelectorAll('#inspector-context .v4-paint-field')].find(node=>node.firstElementChild?.textContent==='纹理填充');row.querySelector('input[type="checkbox"]').click();});await page.waitForFunction(value=>!!ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.find(item=>item.id===value.partId).fillPattern,partsFixture);const textureRow=page.locator('#inspector-context .v4-paint-field').filter({hasText:'纹理填充'});await textureRow.locator('.v4-inline-texture-grid select').first().selectOption('dots');await page.waitForFunction(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.find(item=>item.id===value.partId).fillPattern?.type==='dots',partsFixture);await page.waitForTimeout(40);const paintAfter=await page.locator('#v4-classic-stage').evaluate(canvas=>canvas.toDataURL());assert.notEqual(paintAfter,paintBefore,'enabling a part texture in Inspector must immediately change the shared Runtime canvas');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'设置纹理类型');await textureRow.locator('.v4-inline-texture-grid select').first().selectOption('layers');await page.waitForFunction(value=>{const pattern=ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.find(item=>item.id===value.partId).fillPattern;return pattern?.lineMode==='layers'&&pattern.layers?.length===2;},partsFixture);assert.equal(await textureRow.locator('.v4-inline-texture-grid select').first().inputValue(),'layers','叠线不得因前两条正交线自动回退为网格');await page.getByRole('button',{name:'+ 线层',exact:true}).click();await page.waitForFunction(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.find(item=>item.id===value.partId).fillPattern?.layers?.length===3,partsFixture);
  const partBefore=await page.evaluate(value=>{const owner=ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId),part=owner.parts.find(item=>item.id===value.partId);return{x:part.x,y:part.y};},partsFixture),partBox=await page.locator('#v4-part-transform-layer .v4-transform-box').boundingBox();await page.mouse.move(partBox.x+partBox.width/2,partBox.y+partBox.height/2);await page.mouse.down();await page.mouse.move(partBox.x+partBox.width/2+18,partBox.y+partBox.height/2+9,{steps:4});await page.mouse.up();const partAfter=await page.evaluate(value=>{const owner=ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId),part=owner.parts.find(item=>item.id===value.partId);return{x:part.x,y:part.y};},partsFixture);assert.notDeepEqual(partAfter,partBefore,'blue part box must move the selected internal part');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'移动图元');await page.evaluate(()=>classicV4Changes.undo());
  await page.locator(`#structure-tree [data-v4-part-id="${partsFixture.basePartId}"]`).click({modifiers:['Control']});await page.waitForFunction(()=>classicV4View.selectedPartIds.length===2&&document.querySelector('#props-title')?.textContent==='图元多选 Inspector');assert.equal(await page.locator('#structure-tree .struct-node.part.sel').count(),2,'Ctrl-click must visibly add one sibling part to the same selection set');const multiPartsBefore=await page.evaluate(value=>{const owner=ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId);return{x:owner.x,y:owner.y,parts:owner.parts.map(part=>({id:part.id,x:part.x,y:part.y}))};},partsFixture),multiPartBox=await page.locator('#v4-part-transform-layer .v4-transform-box').boundingBox();await page.mouse.move(multiPartBox.x+multiPartBox.width/2,multiPartBox.y+multiPartBox.height/2);await page.mouse.down();await page.mouse.move(multiPartBox.x+multiPartBox.width/2+12,multiPartBox.y+multiPartBox.height/2+7,{steps:4});await page.mouse.up();const multiPartsAfter=await page.evaluate(value=>{const owner=ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId);return{x:owner.x,y:owner.y,parts:owner.parts.map(part=>({id:part.id,x:part.x,y:part.y}))};},partsFixture);assert.ok(multiPartsAfter.x!==multiPartsBefore.x||multiPartsAfter.y!==multiPartsBefore.y||multiPartsAfter.parts.every((part,index)=>part.x!==multiPartsBefore.parts[index].x||part.y!==multiPartsBefore.parts[index].y),'joint cyan box must move the selected visual set; vector normalization may transfer the delta to its owner');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'移动多图元');await page.evaluate(()=>classicV4Changes.undo());
  const multiScaleBefore=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>[part.scaleX??1,part.scaleY??1]),partsFixture),multiScaleHandle=await page.locator('#v4-part-transform-layer .v4-transform-handle.se').boundingBox();await page.mouse.move(multiScaleHandle.x+multiScaleHandle.width/2,multiScaleHandle.y+multiScaleHandle.height/2);await page.mouse.down();await page.mouse.move(multiScaleHandle.x+multiScaleHandle.width/2+16,multiScaleHandle.y+multiScaleHandle.height/2+12,{steps:4});await page.mouse.up();const multiScaleAfter=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>[part.scaleX??1,part.scaleY??1]),partsFixture);assert.ok(multiScaleAfter.every((scale,index)=>scale[0]!==multiScaleBefore[index][0]||scale[1]!==multiScaleBefore[index][1]),'joint cyan corners must scale every selected part');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'缩放多图元');await page.evaluate(()=>classicV4Changes.undo());
  const multiRotateBefore=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>part.rot??0),partsFixture),multiRotateBox=await page.locator('#v4-part-transform-layer .v4-transform-box').boundingBox(),multiRotateHandle=await page.locator('#v4-part-transform-layer [aria-label="旋转图元"]').boundingBox();await page.mouse.move(multiRotateHandle.x+multiRotateHandle.width/2,multiRotateHandle.y+multiRotateHandle.height/2);await page.mouse.down();await page.mouse.move(multiRotateBox.x+multiRotateBox.width+24,multiRotateBox.y+multiRotateBox.height/2,{steps:5});await page.mouse.up();const multiRotateAfter=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>part.rot??0),partsFixture);assert.ok(multiRotateAfter.every((rot,index)=>Math.abs(rot-multiRotateBefore[index])>1),'joint cyan rotate must rotate every selected part around the union center');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'旋转多图元');await page.evaluate(()=>classicV4Changes.undo());
  const multiMirrorBefore=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>part.scaleX??1),partsFixture);await page.click('#v4-part-transform-layer [aria-label="水平镜像图元"]');const multiMirrorAfter=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>part.scaleX??1),partsFixture);assert.ok(multiMirrorAfter.every((scale,index)=>scale===-multiMirrorBefore[index]),'joint mirror must reflect every selected part');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'水平镜像多图元');await page.evaluate(()=>classicV4Changes.undo());
  await page.evaluate(value=>ToSampoolV4Workspace.mutate(scene=>{const owner=scene.entities.find(item=>item.id===value.ownerId);scene.entities.push({id:'v4-part-grandparent',name:'图元祖父组夹具',type:'group',x:-9,y:16,w:110,h:88,scaleX:.78,scaleY:1.37,rot:-19,alpha:1},{id:'v4-part-parent',name:'图元父组夹具',type:'group',parentId:'v4-part-grandparent',x:18,y:12,w:80,h:60,scaleX:1.25,scaleY:.8,rot:23,alpha:1});owner.parentId='v4-part-parent';}),partsFixture);await page.evaluate(value=>{classicV4View.selectPart(value.ownerId,value.partId);classicV4View.selectPart(value.ownerId,value.basePartId,true);},partsFixture);await page.waitForFunction(()=>classicV4View.selectedPartIds.length===2);const nestedPartBefore=await page.evaluate(value=>{const owner=ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId);return{x:owner.x,y:owner.y};},partsFixture),nestedPartPixels=await page.locator('#v4-classic-stage').evaluate(canvas=>canvas.toDataURL()),nestedPartBox=await page.locator('#v4-part-transform-layer .v4-transform-box').boundingBox();await page.mouse.move(nestedPartBox.x+nestedPartBox.width/2,nestedPartBox.y+nestedPartBox.height/2);await page.mouse.down();await page.mouse.move(nestedPartBox.x+nestedPartBox.width/2+13,nestedPartBox.y+nestedPartBox.height/2+8,{steps:4});await page.mouse.up();const nestedPartAfter=await page.evaluate(value=>{const owner=ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId);return{x:owner.x,y:owner.y};},partsFixture);assert.notDeepEqual(nestedPartAfter,nestedPartBefore,'joint part move must write through two inverse world matrices with rotated non-uniform parent groups');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'移动多图元');await page.evaluate(()=>classicV4Changes.undo());await page.waitForTimeout(30);assert.equal(await page.locator('#v4-classic-stage').evaluate(canvas=>canvas.toDataURL()),nestedPartPixels,'undo after nested joint move must restore fixed-time pixels');
  const nestedScaleBefore=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>[part.scaleX??1,part.scaleY??1]),partsFixture),nestedScaleHandle=await page.locator('#v4-part-transform-layer .v4-transform-handle.se').boundingBox();await page.mouse.move(nestedScaleHandle.x+nestedScaleHandle.width/2,nestedScaleHandle.y+nestedScaleHandle.height/2);await page.mouse.down();await page.mouse.move(nestedScaleHandle.x+nestedScaleHandle.width/2+14,nestedScaleHandle.y+nestedScaleHandle.height/2+10,{steps:4});await page.mouse.up();const nestedScaleAfter=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>[part.scaleX??1,part.scaleY??1]),partsFixture);assert.ok(nestedScaleAfter.every((scale,index)=>scale[0]!==nestedScaleBefore[index][0]||scale[1]!==nestedScaleBefore[index][1]),'nested joint scale must update every selected part');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'缩放多图元');await page.evaluate(()=>classicV4Changes.undo());
  const nestedRotateBefore=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>part.rot??0),partsFixture),nestedRotateBox=await page.locator('#v4-part-transform-layer .v4-transform-box').boundingBox(),nestedRotateHandle=await page.locator('#v4-part-transform-layer [aria-label="旋转图元"]').boundingBox();await page.mouse.move(nestedRotateHandle.x+nestedRotateHandle.width/2,nestedRotateHandle.y+nestedRotateHandle.height/2);await page.mouse.down();await page.mouse.move(nestedRotateBox.x+nestedRotateBox.width+18,nestedRotateBox.y+nestedRotateBox.height/2,{steps:5});await page.mouse.up();const nestedRotateAfter=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>part.rot??0),partsFixture);assert.ok(nestedRotateAfter.every((rot,index)=>Math.abs(rot-nestedRotateBefore[index])>1),'nested joint rotate must update every selected part');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'旋转多图元');await page.evaluate(()=>classicV4Changes.undo());
  const nestedMirrorBefore=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>part.scaleX??1),partsFixture);await page.click('#v4-part-transform-layer [aria-label="水平镜像图元"]');const nestedMirrorAfter=await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.map(part=>part.scaleX??1),partsFixture);assert.ok(nestedMirrorAfter.every((scale,index)=>scale===-nestedMirrorBefore[index]),'nested joint mirror must update every selected part');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'水平镜像多图元');await page.evaluate(()=>classicV4Changes.undo());await page.evaluate(value=>ToSampoolV4Workspace.mutate(scene=>{const owner=scene.entities.find(item=>item.id===value.ownerId);delete owner.parentId;scene.entities=scene.entities.filter(item=>!['v4-part-parent','v4-part-grandparent'].includes(item.id));}),partsFixture);
  const partsRoundTrip=await page.evaluate(async value=>{const scene=ToSampoolV4Workspace.current(),owner=scene.entities.find(item=>item.id===value.ownerId),canvas=document.createElement('canvas');canvas.width=scene.width;canvas.height=scene.height;await ToSampoolV4Workspace.renderTo(canvas,state.t);return{serialized:EditorVNextScene.serialize(scene),ids:owner.parts.map(part=>part.id),styles:owner.parts.map(part=>({fill:part.fill,stroke:part.stroke,fillPattern:part.fillPattern||null})),pixels:canvas.toDataURL()};},partsFixture);await page.evaluate(text=>ToSampoolV4Workspace.replace(JSON.parse(text)),partsRoundTrip.serialized);const reopenedParts=await page.evaluate(async value=>{const scene=ToSampoolV4Workspace.current(),owner=scene.entities.find(item=>item.id===value.ownerId),canvas=document.createElement('canvas');canvas.width=scene.width;canvas.height=scene.height;await ToSampoolV4Workspace.renderTo(canvas,state.t);return{ids:owner.parts.map(part=>part.id),styles:owner.parts.map(part=>({fill:part.fill,stroke:part.stroke,fillPattern:part.fillPattern||null})),pixels:canvas.toDataURL()};},partsFixture);assert.deepEqual(reopenedParts.ids,partsRoundTrip.ids,'parts save/reopen must preserve stable ids and draw order');assert.deepEqual(reopenedParts.styles,partsRoundTrip.styles,'parts save/reopen must preserve Paint data');assert.equal(reopenedParts.pixels,partsRoundTrip.pixels,'parts save/reopen must preserve fixed-time pixels');await page.evaluate(value=>{classicV4View.selectPart(value.ownerId,value.partId);classicV4View.selectPart(value.ownerId,value.basePartId,true);},partsFixture);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>classicV4View.selectedPartIds.length===0&&classicV4View.selectedIds.length===1);await page.evaluate(value=>classicV4View.selectPart(value.ownerId,value.partId),partsFixture);await page.keyboard.press('Control+A');await page.waitForFunction(()=>classicV4View.selectedPartIds.length===2);await page.keyboard.press('Escape');await page.waitForFunction(()=>classicV4View.selectedPartIds.length===0);await page.evaluate(value=>classicV4View.selectPart(value.ownerId,value.partId),partsFixture);
  await page.waitForFunction(value=>document.querySelector(`#structure-tree [data-v4-part-id="${value.basePartId}"]`)&&document.querySelector(`#structure-tree [data-v4-part-id="${value.partId}"]`),partsFixture);const reorderSource=await page.locator(`#structure-tree [data-v4-part-id="${partsFixture.basePartId}"]`).boundingBox(),reorderTarget=await page.locator(`#structure-tree [data-v4-part-id="${partsFixture.partId}"]`).boundingBox();await page.mouse.move(reorderSource.x+35,reorderSource.y+reorderSource.height/2);await page.mouse.down();await page.mouse.move(reorderTarget.x+35,reorderTarget.y+2,{steps:5});await page.mouse.up();assert.equal(await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.at(-1).id,partsFixture),partsFixture.basePartId,'part tree foreground order must write the same last-drawn array order');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'调整图元顺序');await page.evaluate(()=>classicV4Changes.undo());
  await page.keyboard.press('Delete');assert.equal(await page.evaluate(value=>ToSampoolV4Workspace.current().entities.find(item=>item.id===value.ownerId).parts.length,partsFixture),1,'Delete in part context must remove only the selected internal part');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'删除所选图元');await page.evaluate(()=>classicV4Changes.undo());await page.evaluate(()=>classicV4Changes.undo());await page.evaluate(()=>classicV4Changes.undo());
  await page.click('[data-toolbar-mode="ellipse"]');await page.mouse.move(drawingCanvas.x+drawingCanvas.width*.36,drawingCanvas.y+drawingCanvas.height*.18);await page.mouse.down();await page.mouse.move(drawingCanvas.x+drawingCanvas.width*.48,drawingCanvas.y+drawingCanvas.height*.42,{steps:4});await page.keyboard.down('Shift');await page.mouse.move(drawingCanvas.x+drawingCanvas.width*.48,drawingCanvas.y+drawingCanvas.height*.42);await page.mouse.up();await page.keyboard.up('Shift');
  const drawnEllipse=await page.evaluate(() => window.ToSampoolV4Workspace.current().entities.at(-1));assert.equal(drawnEllipse.type,'vector');assert.equal(drawnEllipse.parts?.[0]?.type,'ellipse');assert.ok(Math.abs(drawnEllipse.parts[0].w-drawnEllipse.parts[0].h)<.01,'Shift must constrain ellipse drawing to a circle');await page.evaluate(() => classicV4Changes.undo());
  await page.click('[data-toolbar-mode="poly"]');for(const point of [[.58,.20],[.72,.24],[.66,.43]])await page.mouse.click(drawingCanvas.x+drawingCanvas.width*point[0],drawingCanvas.y+drawingCanvas.height*point[1]);
  assert.equal(await page.evaluate(() => classicV4Drawing.polygon.length),3,'polygon vertices must stay visible before commit');await page.keyboard.press('Enter');
  const drawnPoly=await page.evaluate(() => window.ToSampoolV4Workspace.current().entities.at(-1));assert.equal(drawnPoly.type,'vector');assert.equal(drawnPoly.parts?.[0]?.type,'poly');assert.equal(drawnPoly.parts[0].points.length,3);assert.ok(drawnPoly.parts[0].points.every(point=>point.every(value=>value>=0&&value<=1)),'v4 polygon points must be normalized inside entity bounds');await page.evaluate(() => classicV4Changes.undo());
  await page.click('#toolbar-text');await page.mouse.click(drawingCanvas.x+drawingCanvas.width*.18,drawingCanvas.y+drawingCanvas.height*.62);await page.waitForSelector('textarea[aria-label="编辑文字"]');await page.locator('textarea[aria-label="编辑文字"]').fill('HELLO\nV4');await page.locator('textarea[aria-label="编辑文字"]').press('Control+Enter');
  await page.waitForFunction(() => window.ToSampoolV4Workspace.current().entities.at(-1)?.type === 'text' && !!window.ToSampoolV4Workspace.current().entities.at(-1)?.rasterAssetId);
  const drawnText=await page.evaluate(() => {const scene=window.ToSampoolV4Workspace.current(),entity=scene.entities.at(-1);return{entity,asset:scene.assets[entity.rasterAssetId],visibleAssets:ToSampoolV4Assets.list()};});assert.equal(drawnText.entity.text,'HELLO\nV4');assert.equal(drawnText.entity.lineHeight,1.25);assert.ok(drawnText.asset.locator.startsWith('data:image/png;base64,'),'editable text must carry a portable transparent raster fallback without embedding the font file');assert.equal(drawnText.asset.internal,true,'文字栅格回退必须标记为工程内部资源');assert.ok(!drawnText.visibleAssets.some(asset=>asset.id===drawnText.entity.rasterAssetId),'内部文字 PNG 不得出现在素材库 API 中');await page.waitForFunction(id=>!state.sources.some(source=>source.assetId===id),drawnText.entity.rasterAssetId);assert.equal(await page.evaluate(() => classicV4Changes.undoLabel),'创建文字');await page.evaluate(() => classicV4Changes.undo());
  if(fontPath){
    await page.setInputFiles('#text-font-file',fontPath);await page.waitForFunction(()=>Object.keys(ToSampoolV4Workspace.current().fonts||{}).length===1);const importedFont=await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current(),id=Object.keys(scene.fonts)[0];return{id,descriptor:scene.fonts[id],selected:document.querySelector('#text-font').value};});assert.equal(importedFont.selected,importedFont.id);assert.equal(importedFont.descriptor.locator,null,'browser font import must not embed a multi-megabyte font binary in the Scene');assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'导入字体');
    await page.click('#toolbar-text');await page.mouse.click(drawingCanvas.x+drawingCanvas.width*.35,drawingCanvas.y+drawingCanvas.height*.62);await page.waitForSelector('textarea[aria-label="编辑文字"]');await page.locator('textarea[aria-label="编辑文字"]').fill('FONT V4');await page.locator('textarea[aria-label="编辑文字"]').press('Control+Enter');await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.at(-1)?.fontId===id,importedFont.id);const fontText=await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current(),entity=scene.entities.at(-1);return{entity,serialized:EditorVNextScene.serialize(scene)};});assert.equal(fontText.entity.fontId,importedFont.id);assert.ok(fontText.entity.rasterAssetId,'custom-font text must retain its portable raster fallback');assert.ok(!/data:font\//i.test(fontText.serialized),'saved v4 Scene must not embed the complete font binary');await page.evaluate(()=>classicV4Changes.undo());await page.evaluate(()=>classicV4Changes.undo());await page.waitForFunction(()=>!ToSampoolV4Workspace.current().fonts||Object.keys(ToSampoolV4Workspace.current().fonts).length===0);
  }
  const originalAssetId=await page.evaluate(() => Object.keys(window.ToSampoolV4Workspace.current().assets)[0]),frameBuffer=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+ZQw0WQAAAABJRU5ErkJggg==','base64');
  await page.setInputFiles('#file',[{name:'frame-01.png',mimeType:'image/png',buffer:frameBuffer},{name:'frame-02.png',mimeType:'image/png',buffer:frameBuffer}]);await page.waitForSelector('.wizard-mask .asset-process-grid');assert.equal(await page.evaluate(() => state.sources.at(-1).frames),2,'multiple imported files must enter one animated preprocessing source');await page.getByRole('button',{name:'确认入库',exact:true}).click();await page.waitForFunction(() => Object.keys(window.ToSampoolV4Workspace.current().assets).length===2);
  const multiAssetId=await page.evaluate(id=>Object.keys(window.ToSampoolV4Workspace.current().assets).find(value=>value!==id),originalAssetId),multiDescriptor=await page.evaluate(id=>window.ToSampoolV4Workspace.current().assets[id],multiAssetId);assert.equal(multiDescriptor.frames.length,2);assert.equal(multiDescriptor.fps,8);assert.ok(multiDescriptor.frames.every(frame=>frame.locator.startsWith('data:image/png;base64,')),'v4 multi-frame assets must persist ordered frame locators instead of one concatenated sheet');
  await page.locator('#lib .asset-card-action.add').last().click();await page.waitForFunction(id=>window.ToSampoolV4Workspace.current().entities.some(item=>item.assetId===id),multiAssetId);const multiEntityId=await page.evaluate(id=>window.ToSampoolV4Workspace.current().entities.find(item=>item.assetId===id).id,multiAssetId);assert.equal(await page.evaluate(id=>window.ToSampoolV4Workspace.current().entities.find(item=>item.id===id).frames,multiEntityId),2);await page.evaluate(id=>classicV4View.select(id),multiEntityId);await page.waitForFunction(()=>document.querySelector('#inspector-context')?.innerText.includes('2 帧'));const fpsBefore=await page.evaluate(()=>{const row=[...document.querySelectorAll('#inspector-context .global-field')].find(item=>item.querySelector('span')?.textContent==='帧率'),input=row.querySelector('input'),before=+input.value;input.value='12';input.dispatchEvent(new Event('change',{bubbles:true}));return before;});assert.equal(await page.evaluate(id=>window.ToSampoolV4Workspace.current().entities.find(item=>item.id===id).fps,multiEntityId),12);assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'设置多帧帧率');await page.evaluate(()=>classicV4Changes.undo());assert.equal(await page.evaluate(id=>window.ToSampoolV4Workspace.current().entities.find(item=>item.id===id).fps,multiEntityId),fpsBefore);await page.keyboard.press('Delete');await page.waitForFunction(id=>!window.ToSampoolV4Workspace.current().entities.some(item=>item.id===id),multiEntityId);await page.evaluate(id=>{ToSampoolV4Assets.select(id);ToSampoolV4Assets.removeSelected();},multiAssetId);await page.waitForFunction(()=>window.ToSampoolV4Assets.list().length===1);assert.equal(await page.evaluate(id=>window.ToSampoolV4Workspace.current().assets[id].libraryHidden,multiAssetId),true);await page.evaluate(id=>{ToSampoolV4Assets.select(id);const source=state.sources.find(item=>item.assetId===id);if(source)state.selSrc=source.id;},originalAssetId);
  await page.evaluate(() => classicV4View.select(null));await page.waitForFunction(() => document.querySelector('#props-title')?.textContent === '场景 Inspector');
  assert.ok((await page.locator('#inspector-context').innerText()).includes('画布与背景'),'clearing Canvas selection must switch the v4 Inspector to scene context');
  await page.evaluate(id => classicV4View.select(id),await page.evaluate(() => window.ToSampoolV4Workspace.current().entities[0].id));
  const multiFixture=await page.evaluate(() => {const scene=window.ToSampoolV4Workspace.current(),first=scene.entities[0],second={id:'v4-second',name:'第二对象',type:'rect',x:first.x+48,y:first.y+8,w:20,h:18,fill:'#ff4f91',scaleX:1,scaleY:1,rot:0,alpha:1};window.ToSampoolV4Workspace.mutate(value=>value.entities.push(second));return{first:first.id,second:second.id,expectedCount:scene.entities.length};});
  await page.waitForFunction(expected => document.querySelectorAll('#structure-tree [data-v4-entity-id]').length === expected,multiFixture.expectedCount);
  await page.evaluate(id=>classicV4View.select(id),multiFixture.first);
  const objectMaskSection=page.locator('#inspector-context .global-section').filter({has:page.locator('.global-section-title',{hasText:'蒙版'})});
  const objectMaskType=objectMaskSection.locator('.global-field').filter({hasText:'蒙版'}).locator('select').first();
  await objectMaskType.selectOption('element');
  await page.waitForFunction(owner=>ToSampoolV4Workspace.current().entities.find(item=>item.id===owner)?.effects?.mask?.type==='element',multiFixture.first);
  await page.waitForFunction(()=>!!document.querySelector('#effect-list [data-kind="mask"]'));
  await page.locator('#effect-list [data-kind="mask"]').click();
  assert.equal(await page.locator('#element-inspector-tabs [data-element-inspector="props"].active').count(),1,'mask index card must focus the object properties Inspector');
  assert.equal(await page.evaluate(()=>classicV4Timeline.mode),'visibility','mask index focus must leave the lower lane on the owning object visibility context');
  const maskSource=objectMaskSection.locator('.global-field').filter({hasText:'引用对象'}).locator('select');
  await maskSource.selectOption(multiFixture.second);
  await page.waitForFunction(({owner,source})=>ToSampoolV4Workspace.current().entities.find(item=>item.id===owner)?.effects?.mask?.targetId===source,{owner:multiFixture.first,source:multiFixture.second});
  assert.equal(await objectMaskSection.locator('.global-field').filter({hasText:'来源显示'}).count(),0,'reference visibility choice must be absent');
  assert.deepEqual(await page.evaluate(({owner,source})=>{const scene=ToSampoolV4Workspace.current(),mask=scene.entities.find(item=>item.id===owner).effects.mask,target=scene.entities.find(item=>item.id===source);return{mask,hidden:!!target.hidden,runtimeHidden:ToSampoolRuntimeVNext.modules.masks.maskOnlySources(scene).has(source)};},{owner:multiFixture.first,source:multiFixture.second}),{mask:{type:'element',targetId:multiFixture.second,invert:false},hidden:false,runtimeHidden:true},'referenced element must be mask-only without changing its hidden property');
  const maskRoundTrip=await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current()));
  await page.evaluate(text=>ToSampoolV4Workspace.replace(JSON.parse(text)),maskRoundTrip);
  await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id)?.effects?.mask?.targetId&&!!document.querySelector('#effect-list [data-kind="mask"]'),multiFixture.first);
  await page.evaluate(id=>classicV4View.select(id),multiFixture.first);
  const reopenedMaskType=page.locator('#inspector-context .global-section').filter({has:page.locator('.global-section-title',{hasText:'蒙版'})}).locator('.global-field').filter({hasText:'蒙版'}).locator('select').first();
  await page.locator('#effect-list [data-kind="mask"] .effect-card-remove').click();
  await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id)?.effects?.mask===null,multiFixture.first);
  assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'清除对象蒙版','mask index removal must use the shared mask mutation boundary');
  await reopenedMaskType.selectOption('rect');
  await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id)?.effects?.mask?.type==='rect',multiFixture.first);
  await objectMaskSection.locator('button').filter({hasText:'编辑'}).click();
  await page.waitForFunction(()=>classicV4Masks?.active?.scope==='object'&&getComputedStyle(document.querySelector('#v4-mask-overlay')).display!=='none');
  const maskCanvas=await page.locator('#v4-mask-overlay').boundingBox(),rectMaskBefore=await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.mask,multiFixture.first),sceneSize=await page.evaluate(()=>({w:ToSampoolV4Workspace.current().width,h:ToSampoolV4Workspace.current().height})),sePoint={x:maskCanvas.x+(rectMaskBefore.x+rectMaskBefore.w)/sceneSize.w*maskCanvas.width,y:maskCanvas.y+(rectMaskBefore.y+rectMaskBefore.h)/sceneSize.h*maskCanvas.height};
  await page.mouse.move(sePoint.x,sePoint.y);await page.mouse.down();await page.mouse.move(sePoint.x+18,sePoint.y+12,{steps:4});await page.mouse.up();
  await page.waitForFunction(({id,w,h})=>{const mask=ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.mask;return mask.w>w&&mask.h>h;},{id:multiFixture.first,w:rectMaskBefore.w,h:rectMaskBefore.h});
  assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'缩放蒙版','one green-box resize gesture must create one shared history entry');
  await objectMaskSection.locator('button').filter({hasText:'完成'}).click();await page.waitForFunction(()=>!classicV4Masks.active);
  await reopenedMaskType.selectOption('poly');
  await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id)?.effects?.mask?.type==='poly',multiFixture.first);
  await objectMaskSection.locator('button').filter({hasText:'点选重绘'}).click();await page.waitForFunction(()=>classicV4Masks?.active?.scope==='object');
  for(const point of [[.18,.18],[.42,.22],[.31,.48]])await page.mouse.click(maskCanvas.x+maskCanvas.width*point[0],maskCanvas.y+maskCanvas.height*point[1]);
  assert.equal(await page.evaluate(()=>classicV4Masks.draftPoints.length),3,'polygon mask vertices must remain visible before commit');await page.keyboard.press('Enter');
  await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).effects.mask.points.length===3,multiFixture.first);
  assert.equal(await page.evaluate(()=>classicV4Changes.undoLabel),'点选重绘多边形蒙版');await objectMaskSection.locator('button').filter({hasText:'完成'}).click();await page.waitForFunction(()=>!classicV4Masks.active);
  await reopenedMaskType.selectOption('none');await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id)?.effects?.mask===null,multiFixture.first);
  await page.evaluate(() => window.ToSampoolV4Workspace.mutate(scene=>{for(let i=0;i<12;i++)scene.entities.push({id:'scroll-fixture-'+i,name:'滚动夹具 '+i,type:'rect',x:4+i,y:4+i,w:4,h:4,fill:'#ffffff',scaleX:1,scaleY:1,rot:0,alpha:1});}));
  await page.waitForFunction(expected => document.querySelectorAll('#structure-tree [data-v4-entity-id]').length===expected,multiFixture.expectedCount+12);const treeMetrics=await page.evaluate(()=>{const tree=document.querySelector('#structure-tree');return{scrollHeight:tree.scrollHeight,clientHeight:tree.clientHeight,count:tree.querySelectorAll('[data-v4-entity-id]').length};});assert.ok(treeMetrics.scrollHeight>treeMetrics.clientHeight,`structure tree must overflow for drag auto-scroll (${JSON.stringify(treeMetrics)})`);
  await page.evaluate(() => document.querySelector('#structure-tree').scrollTop=0);const scrollSource=await page.locator(`#structure-tree [data-v4-entity-id="${multiFixture.first}"]`).boundingBox(),treeBox=await page.locator('#structure-tree').boundingBox();await page.mouse.move(scrollSource.x+30,scrollSource.y+scrollSource.height/2);await page.mouse.down();await page.mouse.move(treeBox.x+30,treeBox.y+treeBox.height-3,{steps:8});assert.ok(await page.evaluate(() => document.querySelector('#structure-tree').scrollTop>0),'Pointer tree drag near the edge must auto-scroll the tree');await page.mouse.up();
  await page.evaluate(ids=>window.ToSampoolV4Workspace.mutate(scene=>{const map=new Map(scene.entities.map(item=>[item.id,item]));scene.entities=ids.map(id=>map.get(id));scene.entities.forEach(item=>delete item.parentId);}),[multiFixture.first,multiFixture.second]);
  await page.waitForFunction(() => document.querySelectorAll('#structure-tree [data-v4-entity-id]').length === 2);
  await page.click(`#structure-tree [data-v4-entity-id="${multiFixture.second}"] [data-act="lock"]`);
  assert.equal(await page.evaluate(id=>window.ToSampoolV4Workspace.current().entities.find(item=>item.id===id).locked,multiFixture.second),true,'tree lock must persist on the v4 entity');
  const lockedPoint=await page.evaluate(id=>{const item=window.ToSampoolV4Workspace.current().entities.find(entry=>entry.id===id),canvas=document.querySelector('#v4-classic-stage'),rect=canvas.getBoundingClientRect(),scene=window.ToSampoolV4Workspace.current();return{x:rect.left+(item.x+item.w/2)/scene.width*rect.width,y:rect.top+(item.y+item.h/2)/scene.height*rect.height};},multiFixture.second);
  await page.mouse.click(lockedPoint.x,lockedPoint.y);
  assert.notEqual(await page.evaluate(() => classicV4View.selectedId),multiFixture.second,'locked entity must be skipped by Canvas hit testing');
  await page.click(`#structure-tree [data-v4-entity-id="${multiFixture.second}"] [data-act="lock"]`);
  await page.click(`#structure-tree [data-v4-entity-id="${multiFixture.second}"] [data-act="hide"]`);
  assert.equal(await page.evaluate(id=>window.ToSampoolV4Workspace.current().entities.find(item=>item.id===id).hidden,multiFixture.second),true,'tree hide must use the persistent v4 hidden field');
  await page.click(`#structure-tree [data-v4-entity-id="${multiFixture.second}"] [data-act="hide"]`);
  await page.click(`#structure-tree [data-v4-entity-id="${multiFixture.second}"] [data-act="isolate"]`);
  assert.equal(await page.evaluate(() => classicV4View.isolatedId),multiFixture.second,'tree isolate must enter an editor-only preview state');
  assert.equal(await page.evaluate(() => window.ToSampoolV4Workspace.current().entities.some(item=>item.hidden)),false,'tree isolate must not write temporary hidden flags into the scene');
  await page.click(`#structure-tree [data-v4-entity-id="${multiFixture.second}"] [data-act="isolate"]`);
  await page.waitForTimeout(120);
  const dragSourceNode=page.locator(`#structure-tree [data-v4-entity-id="${multiFixture.second}"]`),dragTargetNode=page.locator(`#structure-tree [data-v4-entity-id="${multiFixture.first}"]`);await dragSourceNode.waitFor({state:'visible'});await dragTargetNode.waitFor({state:'visible'});await dragSourceNode.scrollIntoViewIfNeeded();await dragTargetNode.scrollIntoViewIfNeeded();
  const dragSource=await dragSourceNode.boundingBox(),dragTarget=await dragTargetNode.boundingBox();
  await page.mouse.move(dragSource.x+32,dragSource.y+dragSource.height/2);await page.mouse.down();await page.mouse.move(dragTarget.x+32,dragTarget.y+3,{steps:5});await page.mouse.up();
  await page.waitForFunction(id=>window.ToSampoolV4Workspace.current().entities[0].id===id,multiFixture.second);
  assert.equal(await page.evaluate(() => classicV4Changes.undoLabel),'调整结构顺序','Pointer tree reorder must create one shared history entry without HTML5 drag mode');
  await page.click(`#structure-tree [data-v4-entity-id="${multiFixture.first}"]`);
  await page.click(`#structure-tree [data-v4-entity-id="${multiFixture.second}"]`,{modifiers:['Control']});
  assert.equal(await page.locator('#structure-tree [data-v4-entity-id].sel').count(),2,'Ctrl tree selection must highlight both v4 objects');
  assert.deepEqual(await page.evaluate(() => classicV4View.selectedIds.sort()),[multiFixture.first,multiFixture.second].sort());
  const beforeMulti=await page.evaluate(ids=>Object.fromEntries(window.ToSampoolV4Workspace.current().entities.filter(item=>ids.includes(item.id)).map(item=>[item.id,{x:item.x,y:item.y,scaleX:item.scaleX??1,scaleY:item.scaleY??1,rot:item.rot??0}])),[multiFixture.first,multiFixture.second]);
  let unionBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();
  await page.mouse.move(unionBox.x+unionBox.width/2,unionBox.y+unionBox.height/2);await page.mouse.down();await page.mouse.move(unionBox.x+unionBox.width/2+28,unionBox.y+unionBox.height/2+14,{steps:4});await page.mouse.up();
  const afterMultiMove=await page.evaluate(ids=>Object.fromEntries(window.ToSampoolV4Workspace.current().entities.filter(item=>ids.includes(item.id)).map(item=>[item.id,{x:item.x,y:item.y}])),[multiFixture.first,multiFixture.second]);
  assert.ok(afterMultiMove[multiFixture.first].x>beforeMulti[multiFixture.first].x&&afterMultiMove[multiFixture.second].x>beforeMulti[multiFixture.second].x,'union-box move must transform every selected object');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'移动多个对象');await page.evaluate(() => classicV4Transforms.changes.undo());
  await page.waitForFunction(({ids,before})=>ids.every(id=>{const item=window.ToSampoolV4Workspace.current().entities.find(entry=>entry.id===id);return Math.abs(item.x-before[id].x)<1e-8&&Math.abs(item.y-before[id].y)<1e-8;}),{ids:[multiFixture.first,multiFixture.second],before:beforeMulti});
  unionBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();const unionSe=await page.locator('#v4-transform-layer .v4-transform-handle.se').boundingBox();
  await page.mouse.move(unionSe.x+unionSe.width/2,unionSe.y+unionSe.height/2);await page.mouse.down();await page.mouse.move(unionSe.x+unionSe.width/2+22,unionSe.y+unionSe.height/2+14,{steps:4});await page.mouse.up();
  assert.ok(await page.evaluate(ids=>ids.every(id=>{const item=window.ToSampoolV4Workspace.current().entities.find(entry=>entry.id===id);return Math.abs((item.scaleX??1)-1)>.01||Math.abs((item.scaleY??1)-1)>.01;}),[multiFixture.first,multiFixture.second]),'union-box scale must update every selected object');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'缩放多个对象');await page.evaluate(() => classicV4Transforms.changes.undo());
  unionBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();const unionRotate=await page.locator('#v4-transform-layer .v4-transform-rotate').boundingBox();
  await page.mouse.move(unionRotate.x+unionRotate.width/2,unionRotate.y+unionRotate.height/2);await page.mouse.down();await page.mouse.move(unionBox.x+unionBox.width+25,unionBox.y+unionBox.height/2,{steps:5});await page.mouse.up();
  assert.ok(await page.evaluate(ids=>ids.every(id=>Math.abs(window.ToSampoolV4Workspace.current().entities.find(entry=>entry.id===id).rot??0)>1),[multiFixture.first,multiFixture.second]),'union-box rotation must update every selected object');
  assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'旋转多个对象');await page.evaluate(() => classicV4Transforms.changes.undo());
  await page.click('#v4-transform-layer .v4-transform-mirror.h');assert.equal(await page.evaluate(() => classicV4Transforms.changes.undoLabel),'水平镜像多个对象');await page.evaluate(() => classicV4Transforms.changes.undo());
  const beforeGroupPixels=await page.evaluate(async()=>{const canvas=document.createElement('canvas');await window.ToSampoolV4Workspace.renderTo(canvas,0);return canvas.toDataURL('image/png');});
  await page.keyboard.press('Control+g');
  const groupId=await page.evaluate(() => classicV4View.selectedId);
  assert.equal(await page.evaluate(() => classicV4Changes.undoLabel),'编组对象','Ctrl+G must use the shared v4 history');
  await page.waitForFunction(() => document.querySelector('#props-title')?.textContent === '编组 Inspector');
  await page.waitForFunction(id=>document.querySelector(`#structure-tree [data-v4-entity-id="${id}"]`),groupId);
  const groupState=await page.evaluate(id=>{const scene=window.ToSampoolV4Workspace.current(),group=scene.entities.find(item=>item.id===id);return{w:group.w,h:group.h,children:scene.entities.filter(item=>item.parentId===id).length};},groupId);
  assert.ok(groupState.w>1&&groupState.h>1&&groupState.children===2,'group must own a real member bounds and hierarchy');
  const afterGroupPixels=await page.evaluate(async()=>{const canvas=document.createElement('canvas');await window.ToSampoolV4Workspace.renderTo(canvas,0);return canvas.toDataURL('image/png');});
  assert.equal(afterGroupPixels,beforeGroupPixels,'creating an identity group must not change fixed-time pixels');
  const groupBefore=await page.evaluate(id=>{const item=window.ToSampoolV4Workspace.current().entities.find(entry=>entry.id===id);return{x:item.x,y:item.y};},groupId),groupBox=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();
  await page.mouse.move(groupBox.x+groupBox.width/2,groupBox.y+groupBox.height/2);await page.mouse.down();await page.mouse.move(groupBox.x+groupBox.width/2+20,groupBox.y+groupBox.height/2+10,{steps:3});await page.mouse.up();
  const groupAfter=await page.evaluate(id=>{const item=window.ToSampoolV4Workspace.current().entities.find(entry=>entry.id===id);return{x:item.x,y:item.y};},groupId);assert.ok(groupAfter.x>groupBefore.x&&groupAfter.y>groupBefore.y,'group box must transform the parent group');await page.evaluate(() => classicV4Transforms.changes.undo());
  const groupScaleHandle=await page.locator('#v4-transform-layer .v4-transform-handle.se').boundingBox();await page.mouse.move(groupScaleHandle.x+groupScaleHandle.width/2,groupScaleHandle.y+groupScaleHandle.height/2);await page.mouse.down();await page.mouse.move(groupScaleHandle.x+groupScaleHandle.width/2+18,groupScaleHandle.y+groupScaleHandle.height/2+12,{steps:3});await page.mouse.up();assert.ok(await page.evaluate(id=>(window.ToSampoolV4Workspace.current().entities.find(item=>item.id===id).scaleX??1)>1,groupId),'group corner scale must update the transform parent');await page.evaluate(() => classicV4Transforms.changes.undo());
  const groupRotateHandle=await page.locator('#v4-transform-layer .v4-transform-rotate').boundingBox(),groupBoxAfterUndo=await page.locator('#v4-transform-layer .v4-transform-box').boundingBox();await page.mouse.move(groupRotateHandle.x+groupRotateHandle.width/2,groupRotateHandle.y+groupRotateHandle.height/2);await page.mouse.down();await page.mouse.move(groupBoxAfterUndo.x+groupBoxAfterUndo.width+20,groupBoxAfterUndo.y+groupBoxAfterUndo.height/2,{steps:4});await page.mouse.up();assert.ok(Math.abs(await page.evaluate(id=>window.ToSampoolV4Workspace.current().entities.find(item=>item.id===id).rot??0,groupId))>1,'group rotation must update the transform parent');await page.evaluate(() => classicV4Transforms.changes.undo());
  await page.keyboard.press('Control+Shift+g');
  assert.equal(await page.evaluate(() => classicV4Changes.undoLabel),'解组对象','Ctrl+Shift+G must dissolve through the shared v4 history');
  await page.evaluate(id=>classicV4View.select(id),multiFixture.second);await page.keyboard.press('Delete');
  assert.equal(await page.evaluate(() => classicV4Changes.undoLabel),'删除所选对象','Delete must route to v4 structure mutation');
  await page.evaluate(id=>classicV4View.select(id),multiFixture.first);
  await page.waitForFunction(() => window.ToSampoolV4Workspace.current().entities.length === 1);
  await page.evaluate(() => classicAssets.openBackground({ intent:'existing' }));
  await page.waitForSelector('.wizard-mask input[name=bg-layout]');
  await page.check('.wizard-mask input[name=bg-layout][value=tile]');
  await page.getByRole('button', { name:'创建背景层', exact:true }).click();
  await page.waitForFunction(() => window.ToSampoolV4Workspace.current().background?.layers?.length === 1);
  await page.evaluate(()=>ToSampoolV4Workspace.mutate(scene=>{const entity=scene.entities[0];entity.effects.decorate.projection={enabled:true,color:'#000000',alpha:.5,distance:3,angle:45};entity.effects.sample.controllers={'sampling-grid':{size:2,phaseX:0,phaseY:0,rotation:0}};scene.sceneEffects.overlay['tint-overlay']={enabled:true,color:'#ffffff',alpha:.1,blend:'screen'};scene.timeline.tracks[`effect:object:${entity.id}:projection`]={segments:[{f:[0,1],type:'step',values:{distance:6}}]};scene.timeline.tracks[`controller:object:${entity.id}:sampling-grid`]={segments:[{f:[0,1],type:'step',values:{size:3}}]};}));
  const beforeSave = await page.evaluate(async () => {
    const scene=window.ToSampoolV4Workspace.current(), canvas=document.createElement('canvas');
    await window.ToSampoolV4Workspace.renderTo(canvas, 1.25);
    return { format:scene.format, width:scene.width, height:scene.height, assetIds:Object.keys(scene.assets), entity:scene.entities[0], background:scene.background.layers[0], recipe:scene.assets[Object.keys(scene.assets)[0]].recipe, trackKeys:Object.keys(scene.timeline.tracks).sort(), sceneTint:scene.sceneEffects.overlay['tint-overlay'], pixels:canvas.toDataURL('image/png') };
  });
  assert.equal(beforeSave.format, 'tosampool-scene/v4');
  assert.equal(beforeSave.entity.type, 'image');
  assert.equal(beforeSave.background.layout, 'tile');
  assert.equal(beforeSave.recipe.palette, 'gb');
  assert.ok(beforeSave.pixels.startsWith('data:image/png;base64,'), 'v4 fixed-time preview must render in the browser');

  const downloadEvent = page.waitForEvent('download');
  await page.click('#btn-save');
  const download = await downloadEvent, downloadPath = await download.path();
  assert.ok(downloadPath, 'v4 save must create a browser artifact');
  await page.evaluate(() => window.ToSampoolV4Workspace.createBlank({ width:8, height:8, loop:1 }));
  const chooserEvent = page.waitForEvent('filechooser');
  await page.click('#btn-open');
  const chooser = await chooserEvent; await chooser.setFiles(downloadPath);
  await page.waitForFunction(() => window.ToSampoolV4Workspace.current()?.entities?.length === 1);
  const reopened = await page.evaluate(async () => {
    const scene=window.ToSampoolV4Workspace.current(), canvas=document.createElement('canvas');
    await window.ToSampoolV4Workspace.renderTo(canvas, 1.25);
    return { format:scene.format, assets:Object.keys(scene.assets).length, entities:scene.entities.length, backgrounds:scene.background?.layers?.length || 0, pivot:scene.entities[0].pivot, projection:scene.entities[0].effects.decorate.projection, controller:scene.entities[0].effects.sample.controllers['sampling-grid'], trackKeys:Object.keys(scene.timeline.tracks).sort(), sceneTint:scene.sceneEffects.overlay['tint-overlay'], pixels:canvas.toDataURL('image/png') };
  });
  assert.deepEqual(reopened, { format:'tosampool-scene/v4', assets:1, entities:1, backgrounds:1, pivot:beforeSave.entity.pivot, projection:beforeSave.entity.effects.decorate.projection, controller:beforeSave.entity.effects.sample.controllers['sampling-grid'], trackKeys:beforeSave.trackKeys, sceneTint:beforeSave.sceneTint, pixels:beforeSave.pixels }, 'saved v4 scene must reopen with the same assets, effects, controller tracks and fixed-time pixels');
  await page.evaluate(()=>classicV4View.select(ToSampoolV4Workspace.current().entities[0].id));await page.waitForFunction(()=>!!document.querySelector('#effect-list [data-id="projection"]'));assert.equal(await page.locator('#effect-list .v4-effect-index-card').count(),1,'reopening a v4 Scene must rebuild active effect cards but omit shared rules');assert.equal(await page.locator('#effect-list [data-id="sampling-grid"]').count(),0,'reopened shared rules must remain Inspector-only');await page.evaluate(()=>classicV4View.select(null));await page.waitForFunction(()=>!!document.querySelector('#effect-list [data-id="tint-overlay"]'));assert.equal(await page.locator('#effect-list [data-id="tint-overlay"]').count(),1,'reopening a v4 Scene must rebuild scene effect cards from persisted data');
  const testDownloadEvent=page.waitForEvent('download');
  await page.click('#btn-test-scene');
  const testDownload=await testDownloadEvent,testPath=await testDownload.path();
  assert.ok(testPath,'v4 test scene must create a self-contained HTML artifact');
  const stableTestPath=join(artifactDir,'v4-self-contained-test.html');
  copyFileSync(testPath,stableTestPath);
  const testSource=readFileSync(testPath,'utf8');
  assert.ok(testSource.includes('ToSampoolRuntimeVNext')&&testSource.includes('data:image/png;base64,'),'v4 test HTML must embed both Runtime and frozen assets');
  const testPage=await context.newPage(),testErrors=[];
  testPage.on('pageerror',error=>testErrors.push(String(error)));
  await testPage.goto(pathToFileURL(stableTestPath).href,{waitUntil:'domcontentloaded'});
  await testPage.waitForFunction(()=>document.documentElement.dataset.runtimeReady==='1'||!!document.documentElement.dataset.runtimeError,null,{timeout:10000});
  const testState=await testPage.evaluate(()=>({ready:document.documentElement.dataset.runtimeReady,error:document.documentElement.dataset.runtimeError,width:document.querySelector('#scene-canvas')?.width,height:document.querySelector('#scene-canvas')?.height}));
  assert.equal(testState.error,undefined,`self-contained v4 test HTML failed: ${testState.error||''}`);
  assert.equal(testState.ready,'1','self-contained v4 test HTML must reach its first rendered frame');
  assert.equal(testState.width,beforeSave.width,'self-contained v4 test HTML must preserve scene width');
  assert.equal(testState.height,beforeSave.height,'self-contained v4 test HTML must preserve scene height');
  assert.deepEqual(testErrors,[],'self-contained v4 test HTML must run directly from file://');
  await testPage.close();
  const particleSourceId=await page.evaluate(()=>ToSampoolV4Workspace.current().entities.find(item=>item.type==='image').id);await page.evaluate(id=>classicV4View.select(id),particleSourceId);await page.click('#btn-particle');await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.some(item=>item.type==='particle-emitter'));
  const emitterId=await page.evaluate(()=>ToSampoolV4Workspace.current().entities.find(item=>item.type==='particle-emitter').id);await page.waitForFunction(()=>document.querySelector('#props-title')?.textContent==='粒子 Inspector');assert.equal(await page.locator('#element-inspector-tabs [data-element-inspector="props"]').textContent(),'粒子','particle selection must expose one dedicated Inspector page');assert.equal(await page.locator('#element-inspector-tabs [data-element-inspector="fx"]:visible').count(),0,'particle emitters must not expose duplicate object effect pages');
  const countInput=page.locator('#inspector-context .global-section').filter({has:page.locator('.global-section-title',{hasText:'发射'})}).locator('.global-field').filter({hasText:'数量'}).locator('input[type="number"]');await countInput.fill('18');await countInput.dispatchEvent('change');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).particle.count,emitterId),18,'particle Inspector must write base emission values');
  await page.click('#btn-timing-mode');const speedInput=page.getByRole('spinbutton',{name:'速度',exact:true});await speedInput.fill('77');await speedInput.dispatchEvent('change');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[id].segments[0].values['particle.speed'],emitterId),77,'particle timing must write a dotted Step value');assert.notEqual(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).particle.speed,emitterId),77,'particle Step timing must not overwrite its base value');assert.equal(await page.locator('#tl-linear-toggle').isVisible(),false,'particle parameter tracks must remain Step-only');
  const particleStats=await page.evaluate(async()=>{const canvas=document.createElement('canvas');return ToSampoolV4Workspace.renderTo(canvas,0);});assert.equal(particleStats.particleEmitters,1);assert.equal(particleStats.particlesDrawn,18,'Runtime must evaluate the current particle Inspector state');
  const particleDownloadEvent=page.waitForEvent('download');await page.click('#btn-save');const particleDownload=await particleDownloadEvent,particlePath=await particleDownload.path();await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:8,height:8,loop:1}));const particleChooserEvent=page.waitForEvent('filechooser');await page.click('#btn-open');const particleChooser=await particleChooserEvent;await particleChooser.setFiles(particlePath);await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.some(item=>item.type==='particle-emitter'));assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[id].segments[0].values['particle.speed'],emitterId),77,'particle Step track must survive save and reopen');
  await page.evaluate(()=>classicV4View.select(null));await page.click('#btn-particle');await page.waitForFunction(()=>ToSampoolV4Workspace.current().entities.filter(item=>item.type==='particle-emitter').length===2);const defaultParticle=await page.evaluate(()=>{const emitters=ToSampoolV4Workspace.current().entities.filter(item=>item.type==='particle-emitter'),emitter=emitters[emitters.length-1];return{id:emitter.id,sourceId:emitter.particle.sourceId,sourceOnly:ToSampoolV4Workspace.current().entities.find(item=>item.id===emitter.particle.sourceId)?.particleSourceOnly,tree:!!document.querySelector(`#structure-tree [data-v4-entity-id="${emitter.particle.sourceId}"]`)};});assert.equal(defaultParticle.sourceOnly,true,'default particle creation must own a preset entity');assert.equal(defaultParticle.tree,false,'private preset entities must not clutter the structure tree');await page.evaluate(id=>classicV4View.select(id),defaultParticle.id);await page.keyboard.press('Delete');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.some(item=>item.id===id),defaultParticle.sourceId),false,'deleting a default emitter must remove its private source');
  const builtinId=await page.evaluate(()=>{const id='builtin-star-browser';classicV4Changes.run('添加内建组件夹具',scene=>scene.entities.push({id,name:'内建星光',type:'builtin',x:20,y:20,w:28,h:28,scaleX:1,scaleY:1,rot:0,alpha:1,builtin:{id:'pixel-star',version:1,params:{rays:4,twinkle:.1,period:2}}}));classicV4View.select(id);return id;});await page.waitForFunction(()=>[...document.querySelectorAll('#inspector-context .global-section-title')].some(node=>node.textContent==='内建组件'));assert.equal(await page.locator('#structure-tree [data-v4-entity-id="builtin-star-browser"]').count(),1,'registered builtin must remain an ordinary selectable structure row');
  const raysInput=page.locator('#inspector-context .global-section').filter({has:page.locator('.global-section-title',{hasText:'内建组件'})}).locator('.global-field').filter({hasText:'星芒数量'}).locator('input[type="number"]');await raysInput.fill('7');await raysInput.dispatchEvent('change');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).builtin.params.rays,builtinId),7,'Builtin Inspector must write registry-backed base params');
  await page.click('#btn-timing-mode');const radiusInput=page.locator('#inspector-context .global-section').filter({has:page.locator('.global-section-title',{hasText:'内建组件'})}).locator('.global-field').filter({hasText:'内径'}).locator('input[type="number"]');await radiusInput.fill('0.7');await radiusInput.dispatchEvent('change');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[id].segments[0].values['builtin.params.innerRadius'],builtinId),.7,'Builtin timing must use a dotted declarative parameter path');assert.deepEqual(await page.evaluate(()=>({mode:classicV4Timeline.mode,key:classicV4Timeline.trackKey})),{mode:'property',key:builtinId},'Builtin parameters must reuse the existing property timeline; Linear appears after a valid adjacent Step endpoint exists');
  const builtinStats=await page.evaluate(async()=>{const canvas=document.createElement('canvas');return ToSampoolV4Workspace.renderTo(canvas,0);});assert.equal(builtinStats.unsupportedEffects.length,0,'Builtin must render through the normal object pipeline without unsupported fallbacks');
  const builtinDownloadEvent=page.waitForEvent('download');await page.click('#btn-save');const builtinDownload=await builtinDownloadEvent,builtinPath=await builtinDownload.path();await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:8,height:8,loop:1}));const builtinChooserEvent=page.waitForEvent('filechooser');await page.click('#btn-open');const builtinChooser=await builtinChooserEvent;await builtinChooser.setFiles(builtinPath);await page.waitForFunction(id=>ToSampoolV4Workspace.current().entities.some(item=>item.id===id),builtinId);assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().entities.find(item=>item.id===id).builtin.id,builtinId),'pixel-star','registered Builtin id/version must survive save and reopen');assert.equal(await page.evaluate(id=>ToSampoolV4Workspace.current().timeline.tracks[id].segments[0].values['builtin.params.innerRadius'],builtinId),.7,'Builtin timing data must survive save and reopen');
  const resetMetrics=await page.evaluate(()=>{ToSampoolV4Workspace.resetRuntimeMetrics();return ToSampoolV4Workspace.getRuntimeMetrics();});
  assert.deepEqual(resetMetrics,{assetResolves:0,playerCreates:0,playerReuses:0},'opening a new benchmark must be able to reset document-session Runtime metrics');
  assert.deepEqual(errors, [], `v4 vertical browser errors:\n${errors.join('\n')}`);
  await context.close();
}

try {
  await verifyV4AssetVertical();
  console.log(`Classic v4 real-browser integration OK (Edge; artifacts ${artifactDir})`);
} finally {
  await browser.close();
}
