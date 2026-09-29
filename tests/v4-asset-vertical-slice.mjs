#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), source = path => readFileSync(resolve(root, path), 'utf8');
let saved = null, rendered = null;
const host = {
  async openText() { return saved && { name:'asset-loop.tosampool.json', locator:'project/asset-loop.tosampool.json', text:saved.data }; },
  async saveFile(options) { saved=options; return { locator:'project/asset-loop.tosampool.json' }; },
};
const context = {
  EditorHost:host,
  EditorVNextAssetLoader:{ async resolve(document, options) { return Object.fromEntries(Object.entries(document.assets || {}).map(([id, descriptor]) => [id, { image:{ width:descriptor.width, height:descriptor.height }, locator:descriptor.locator, sceneLocator:options.sceneLocator }])); } },
  EditorVNextRuntimeAdapter:{ create(document, assets) { return { renderTo(canvas, time) { rendered={ canvas, time, document, assets }; return rendered; } }; } },
};
for (const file of ['editor/vnext-scene.js','editor/vnext-workspace.js','editor/vnext-asset-state.js','editor/vnext-asset-workflow.js','editor/session-facade.js','editor/asset-controller.js']) {
  new vm.Script(source(file), { filename:file }).runInNewContext(context);
}

const workspace=context.EditorVNextWorkspace.create(host); workspace.createBlank({ width:320, height:180, loop:12 });
const workflow=context.EditorVNextAssetWorkflow.create({ workspace });
const legacy=context.EditorSessionFacade.createAdapter({ id:'legacy', format:'legacy-js', domains:{ session:{ isDirty:()=>false } } });
const v4=context.EditorSessionFacade.createAdapter({ id:'v4', format:'tosampool-scene/v4', domains:{ session:{ isDirty:()=>false } } });
const router=context.EditorSessionFacade.createRouter({ adapters:[legacy,v4], initial:'legacy' }); router.activate('v4');
const controller=context.EditorAssetController.create({ router, v4Ready:()=>true, legacy:{}, v4:workflow });

const imported=await controller.importFiles([{ name:'lake.png' }], { prepare:file => ({ name:file.name, locator:'assets/lake.png', mime:'image/png', width:96, height:54, recipe:{ pixelDiv:2, palette:'gb', quant:0, bgTolerance:0 } }) });
assert.equal(imported[0].assetId, 'lake'); assert.equal(controller.selected().id, 'lake'); assert.equal(controller.list().length, 1);
const image=controller.addSelectedToScene({ x:20, y:30, w:192, h:108 }); assert.equal(image.entityId, 'image-lake');
const background=controller.openBackground({ layout:'tile' }); assert.equal(background.layerId, 'background-lake');
assert.equal(controller.removeSelected(), false, '正在被场景引用的素材不得删除');
assert.equal(JSON.stringify(workspace.current().assets.lake.recipe), JSON.stringify({ pixelDiv:2, palette:'gb', quant:0, bgTolerance:0 }));
assert.equal(workspace.current().entities[0].x, 20); assert.equal(workspace.current().background.layers[0].layout, 'tile');

await workspace.renderTo({ id:'preview' }, 3.25); assert.equal(rendered.time, 3.25); assert.equal(rendered.assets.lake.locator, 'assets/lake.png');
await workspace.save(); assert.ok(saved && saved.data.includes('tosampool-scene/v4'));
const reopened=context.EditorVNextWorkspace.create(host); await reopened.open();
assert.equal(reopened.current().entities[0].assetId, 'lake'); assert.equal(reopened.current().background.layers[0].assetId, 'lake');
assert.equal(JSON.stringify(reopened.current().assets.lake.recipe), JSON.stringify({ pixelDiv:2, palette:'gb', quant:0, bgTolerance:0 }));
await reopened.renderTo({ id:'reopened-preview' }, 3.25); assert.equal(rendered.document.entities[0].id, 'image-lake'); assert.equal(rendered.time, 3.25);

console.log('✓ v4 素材纵切片：预处理描述、入库、图片/背景放置、固定时间预览、保存重开闭环通过');
