#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const sandbox = {};
new vm.Script(readFileSync(resolve(root, 'editor/session-facade.js'), 'utf8'), { filename:'session-facade.js' }).runInNewContext(sandbox);
const facade = sandbox.EditorSessionFacade;
assert.equal(facade.version, 1);
assert.deepEqual([...facade.DOMAINS], ['session','scene','selection','transform','structure','assets','timeline','effects','history','preview','delivery']);

let legacyDirty = false, legacyCalls = 0, v4Calls = 0, notifications = 0;
const legacy = facade.createAdapter({
  id:'legacy', format:'legacy-js', capabilities:{ programCode:true },
  domains:{ session:{ isDirty:() => legacyDirty }, scene:{ current:() => (++legacyCalls, 'legacy-scene') } }
});
const v4 = facade.createAdapter({
  id:'v4', format:'tosampool-scene/v4', capabilities:{ programCode:false },
  domains:{ session:{ isDirty:() => false }, scene:{ current:() => (++v4Calls, 'v4-scene') } }
});
const router = facade.createRouter({ adapters:[legacy,v4], initial:'legacy' });
router.subscribe(() => { notifications += 1; });
assert.equal(router.activeId, 'legacy');
assert.equal(router.call('scene','current'), 'legacy-scene');
assert.equal(router.supports('preview','renderTo'), false);
assert.equal(legacyCalls, 1);
assert.equal(v4Calls, 0, 'inactive session must not receive calls');
legacyDirty = true;
assert.throws(() => router.activate('v4'), /unsaved changes/);
assert.equal(router.activeId, 'legacy');
router.activate('v4', { force:true });
assert.equal(router.activeId, 'v4');
assert.equal(router.call('scene','current'), 'v4-scene');
assert.equal(v4Calls, 1);
assert.equal(notifications, 1);
assert.throws(() => router.call('selection','set'), /does not support/);
console.log('Classic Session Facade: strict active-session routing and dirty guard OK');
