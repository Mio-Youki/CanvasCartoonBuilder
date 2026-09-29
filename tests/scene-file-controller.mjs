#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), sandbox = {};
for (const file of ['editor/session-facade.js','editor/scene-file-controller.js']) {
  new vm.Script(readFileSync(resolve(root, file), 'utf8'), { filename:file }).runInNewContext(sandbox);
}
const sessions = sandbox.EditorSessionFacade, files = sandbox.EditorSceneFileController;
assert.equal(files.classify({ name:'old.json', text:'{"name":"legacy"}' }).kind, 'legacy');
assert.equal(files.classify({ name:'scene.tosampool.json', text:'{"format":"tosampool-scene/v4"}' }).kind, 'v4');
assert.equal(files.classify({ name:'scene.js', text:'window.HOME_SCENE={};' }).kind, 'legacy');

let opened = null, saved = 0, legacyNew = 0, v4Loaded = 0;
const legacy = sessions.createAdapter({ id:'legacy', format:'legacy-js', domains:{ session:{ isDirty:() => false } } });
const v4 = sessions.createAdapter({ id:'v4', format:'tosampool-scene/v4', domains:{ session:{ isDirty:() => false } } });
const router = sessions.createRouter({ adapters:[legacy,v4], initial:'legacy' });
const host = { openText:async () => opened };
const controller = files.create({
  router, host, v4Ready:() => false,
  legacy:{ newDocument:() => { legacyNew += 1; }, openDocument:value => value.name, saveDocument:() => { saved += 1; } },
  v4:{ openDocument:() => { v4Loaded += 1; } }
});
await controller.newDocument();
assert.equal(legacyNew, 1);
opened = { name:'scene.js', text:'window.HOME_SCENE={};' };
assert.equal(await controller.open(), 'scene.js');
await controller.save();
assert.equal(saved, 1);
opened = { name:'scene.tosampool.json', text:'{"format":"tosampool-scene/v4","version":4}' };
await assert.rejects(() => controller.open(), error => error.code === 'V4_SESSION_NOT_READY');
assert.equal(router.activeId, 'legacy', 'blocked v4 open must not switch the active session');
assert.equal(v4Loaded, 0, 'blocked v4 open must not mutate the v4 workspace');
console.log('Scene File Controller: format routing, legacy parity and blocked-v4 safety OK');
