#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
const root = resolve(import.meta.dirname, '..'), context = {};
for (const file of ['editor/effect-registry-vnext.js', 'editor/vnext-inspector-model.js']) new vm.Script(readFileSync(resolve(root, file), 'utf8'), { filename: file }).runInNewContext(context);
const object = context.EditorVNextInspectorModel.create('object', { effects: { decorate: { projection: { enabled: true } }, sample: {} } });
assert.deepEqual(Array.from(object.pages), ['compose', 'decorate', 'sample']); assert.equal(object.cards.find(card => card.id === 'projection').enabled, true); assert.equal(object.cards.find(card => card.id === 'projection').editable, true);
const scene = context.EditorVNextInspectorModel.create('scene', { sceneEffects: { overlay: {}, sample: {} } });
assert.deepEqual(Array.from(scene.pages), ['compose', 'overlay', 'sample']); assert.equal(scene.cards.find(card => card.id === 'masked-inner-light').availability, 'ready'); assert.equal(scene.cards.find(card => card.id === 'masked-inner-light').editable, true);
const group = context.EditorVNextInspectorModel.create('object', { type:'group' });
assert.deepEqual(Array.from(group.pages), ['compose']); assert.equal(group.cards.length, 0, 'group transform parent must not expose effects it cannot render');
assert.deepEqual(Array.from(context.EditorVNextInspectorModel.path('scene', context.EditorEffectRegistryVNext.effectById['texture-overlay'])), ['sceneEffects', 'overlay', 'texture-overlay']);
assert.deepEqual(Array.from(context.EditorVNextInspectorModel.path('object', context.EditorEffectRegistryVNext.effectById['color-grade'])), ['effects', 'formation', 'color-grade']);
assert.equal(context.EditorVNextInspectorModel.trackKey('object', 'tree', context.EditorEffectRegistryVNext.effectById.outline), 'effect:object:tree:outline'); assert.equal(context.EditorVNextInspectorModel.trackKey('scene', 'overlay', context.EditorEffectRegistryVNext.effectById['color-grade']), 'effect:scene:overlay:color-grade');
console.log('✓ vNext Inspector Model：Registry 卡片、存储路径与 Runtime 支持度合同通过');
