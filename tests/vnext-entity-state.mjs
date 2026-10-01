#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), context = {};
new vm.Script(readFileSync(resolve(root, 'editor/vnext-entity-state.js'), 'utf8')).runInNewContext(context);
const state = context.EditorVNextEntityState, scene = { entities: [{ id: 'orb' }] };
assert.equal(state.value(scene.entities[0], 'alpha'), 1);
state.set(scene, { ownerId: 'orb', key: 'alpha', value: 2 }); assert.equal(scene.entities[0].alpha, 1);
state.set(scene, { ownerId: 'orb', key: 'w', value: -8 }); assert.equal(scene.entities[0].w, 1);
state.set(scene, { ownerId: 'orb', key: 'fill', value: '#70a8ef' }); assert.equal(scene.entities[0].fill, '#70a8ef');
state.set(scene, { ownerId: 'orb', key: 'fillAlpha', value: -1 }); assert.equal(scene.entities[0].fillAlpha, 0);
state.set(scene, { ownerId: 'orb', key: 'text', value: 'hello' }); assert.equal(scene.entities[0].text, 'hello');
assert.deepEqual(Array.from(state.fieldsFor({ type:'text' })), ['x','y','w','h','scaleX','scaleY','skewX','skewY','rot','blend','alpha','fill','fillAlpha','text','fontSize','fontId','fontFamily','letterSpacing','lineHeight']);
assert.deepEqual(Array.from(state.fieldsFor({ type:'image' })), ['x','y','w','h','scaleX','scaleY','skewX','skewY','rot','blend','alpha']);
assert.deepEqual(Array.from(state.fieldsFor({ type:'vector' })), ['x','y','w','h','scaleX','scaleY','skewX','skewY','rot','blend','alpha']);
assert.deepEqual(Array.from(state.fieldsFor({ type:'group' })), ['x','y','scaleX','scaleY','skewX','skewY','rot','blend','alpha']);
assert.deepEqual(Array.from(state.fieldsFor({ type:'line' })), ['x','y','w','h','scaleX','scaleY','skewX','skewY','rot','blend','alpha','stroke','strokeAlpha','strokeWidth']);
assert.deepEqual(Array.from(state.fieldsFor({ type:'rect' })), ['x','y','w','h','scaleX','scaleY','skewX','skewY','rot','blend','alpha','fill','fillAlpha','stroke','strokeAlpha','strokeWidth','radius']);
assert.throws(() => state.set(scene, { ownerId: 'orb', key: 'effects', value: {} }), /不允许/);
assert.throws(() => state.set(scene, { ownerId: 'orb', key: 'fill', value: 'red' }), /Hex/);
console.log('✓ vNext Entity State：基础对象字段白名单、默认值与范围合同通过');
