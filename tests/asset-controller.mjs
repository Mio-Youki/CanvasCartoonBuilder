#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), sandbox = {};
for (const file of ['editor/session-facade.js','editor/asset-controller.js']) {
  new vm.Script(readFileSync(resolve(root, file), 'utf8'), { filename:file }).runInNewContext(sandbox);
}
const sessions = sandbox.EditorSessionFacade;
const legacyAdapter = sessions.createAdapter({ id:'legacy', format:'legacy-js', domains:{ session:{ isDirty:() => false } } });
const v4Adapter = sessions.createAdapter({ id:'v4', format:'tosampool-scene/v4', domains:{ session:{ isDirty:() => false } } });
const router = sessions.createRouter({ adapters:[legacyAdapter,v4Adapter], initial:'legacy' });
const events = [];
const controller = sandbox.EditorAssetController.create({
  router, v4Ready:() => false,
  legacy:{
    importFiles:files => events.push(['legacy-import', files.length]),
    addToScene:source => events.push(['legacy-add-source', source.id]),
    addSelectedToScene:() => events.push(['legacy-add']),
    openBackground:options => events.push(['legacy-background', options.intent]),
    removeSelected:() => events.push(['legacy-remove']),
    list:() => ['legacy-asset'], selected:() => 'legacy-asset'
  },
  v4:{ importFiles:files => events.push(['v4-import', files.length]) }
});
controller.importFiles([{ name:'one.png' }, { name:'two.png' }]);
controller.addToScene({ id:'source-1' });
controller.addSelectedToScene();
controller.openBackground({ intent:'existing' });
controller.removeSelected();
assert.deepEqual(events, [['legacy-import',2],['legacy-add-source','source-1'],['legacy-add'],['legacy-background','existing'],['legacy-remove']]);
assert.deepEqual(controller.list(), ['legacy-asset']);
assert.equal(controller.selected(), 'legacy-asset');
router.activate('v4');
assert.throws(() => controller.importFiles([{ name:'blocked.png' }]), error => error.code === 'V4_ASSET_WORKFLOW_NOT_READY');
assert.equal(events.some(event => event[0] === 'v4-import'), false);
console.log('Asset Controller: Legacy routing and unopened-v4 safety OK');
