#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), source = path => readFileSync(resolve(root, path), 'utf8');
const context = {};
new vm.Script(source('editor/vnext-scene.js'), { filename: 'editor/vnext-scene.js' }).runInNewContext(context);
new vm.Script(source('editor/vnext-scene-mutation.js'), { filename: 'editor/vnext-scene-mutation.js' }).runInNewContext(context);
let document = context.EditorVNextScene.blank();
const workspace = {
  requireDocument: () => document,
  mutate(operation) { return operation(document); },
  replace(next) { document = JSON.parse(JSON.stringify(next)); return document; },
};
const changes = context.EditorVNextSceneMutation.create(workspace, { limit: 2 });
changes.run('移动对象', scene => { scene.entities.push({ id: 'orb', x: 10 }); });
changes.run('调整位置', scene => { scene.entities[0].x = 24; });
assert.equal(changes.canUndo, true); assert.equal(changes.undoLabel, '调整位置');
assert.equal(changes.undo(), '调整位置'); assert.equal(document.entities[0].x, 10);
assert.equal(changes.redo(), '调整位置'); assert.equal(document.entities[0].x, 24);
changes.run('空操作', () => {}); assert.equal(changes.undoLabel, '调整位置');
const gesture = changes.begin('拖拽移动'); workspace.mutate(scene => { scene.entities[0].x = 36; }); assert.equal(changes.commit(gesture), true); assert.equal(changes.undoLabel, '拖拽移动');
assert.equal(changes.undo(), '拖拽移动'); assert.equal(document.entities[0].x, 24);
const cancelled = changes.begin('取消手势'); workspace.mutate(scene => { scene.entities[0].x = 99; }); changes.cancel(cancelled); assert.equal(document.entities[0].x, 24);
changes.clear(); assert.equal(changes.canUndo, false); assert.equal(changes.canRedo, false);
console.log('✓ vNext Scene Mutation：统一变更、可撤销与重做快照合同通过');
