#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), source = path => readFileSync(resolve(root, path), 'utf8');
let saved = null, resolves = 0, players = 0;
const context = {
  EditorVNextRuntimeAdapter: { create(document, assets) { players += 1; return { document, assets, renderTo: () => ({ ok: true }) }; } },
  EditorVNextAssetLoader: { async resolve(document, options) { resolves += 1; return { resolved: { locator: document.assets.photo?.locator || null, sceneLocator: options.sceneLocator } }; } },
  EditorHost: {
    async openText() { return { name: 'mountain.tosampool.json', locator: 'project/mountain.tosampool.json', text: JSON.stringify({ format: 'tosampool-scene/v4', width: 32, height: 16, loop: 1, assets: { photo: { locator: 'assets/a.png' } }, entities: [], timeline: { tracks: {} }, sceneEffects: { overlay: {}, sample: {} } }) }; },
    async saveFile(options) { saved = options; return { locator: 'project/mountain.tosampool.json' }; },
  },
};
new vm.Script(source('editor/vnext-scene.js'), { filename: 'editor/vnext-scene.js' }).runInNewContext(context);
new vm.Script(source('editor/vnext-workspace.js'), { filename: 'editor/vnext-workspace.js' }).runInNewContext(context);
const workspace = context.EditorVNextWorkspace.create(), events=[]; workspace.subscribe(event => events.push([event.type,event.revision]));
assert.equal(workspace.hasDocument, false); workspace.createBlank({ width: 48, height: 24 }); assert.equal(workspace.current().width, 48);
await workspace.open(); assert.equal(workspace.locator, 'project/mountain.tosampool.json'); assert.equal((await workspace.runtimeAssets()).resolved.locator, 'assets/a.png');
workspace.mutate(scene => { scene.entities.push({ id: 'box', type: 'rect' }); }); await workspace.runtimeAssets(); assert.equal(resolves, 1); await workspace.save(); assert.equal(saved.kind, 'scene'); assert.match(saved.name, /mountain\.tosampool\.json$/); assert.equal(JSON.parse(saved.data).entities[0].id, 'box');
await workspace.createPlayer(); await workspace.createPlayer(); assert.equal(players, 1, '同 revision 连续预览必须复用 Runtime player'); workspace.mutate(scene => { scene.entities[0].x = 4; }); await workspace.createPlayer(); assert.equal(players, 2, 'Scene 修改后必须重建 Runtime player');
assert.equal(JSON.stringify(events), JSON.stringify([['replace',1],['replace',2],['mutation',3],['mutation',4]]));
console.log('✓ vNext Workspace：独立新建、打开、保存、素材解析与隔离预览会话合同通过');
