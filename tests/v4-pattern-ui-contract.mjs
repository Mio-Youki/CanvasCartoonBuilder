import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const context={};
new vm.Script(read('editor/effect-registry-vnext.js'),{filename:'editor/effect-registry-vnext.js'}).runInNewContext(context);

const registry=context.EditorEffectRegistryVNext;
const texture=registry.effectById['texture-overlay'];
const halftone=registry.effectById.halftone;
const param=(definition,key)=>definition.params.find(entry=>entry.key===key);

assert.deepEqual(
  Array.from(param(texture,'shape').options),
  ['circle','triangle','square','pentagon','hexagon'],
  '纹理叠加的点形必须保留五种可辨识图样'
);
assert.equal(param(texture,'phaseX').min,0);
assert.equal(param(texture,'phaseX').max,1);
assert.equal(param(texture,'phaseY').min,0);
assert.equal(param(texture,'phaseY').max,1);
assert.equal(param(texture,'rowPhase').label,'错列偏移');
assert.equal(param(halftone,'offsetX').label,'起始偏移 X');
assert.equal(param(halftone,'rowOffset').label,'错列偏移');
assert.equal(registry.motionById['dot-drift'].name,'网点震荡');
assert.equal(registry.motionById['dot-move'].name,'网点移动');

const inspector=read('editor/classic-v4-inspector-controller.js');
assert.match(inspector,/shape,sides:point\.sides,roundness:point\.roundness/,'纹理叠加必须把 shape 映射为共用编辑器所需的 sides / roundness');
assert.match(inspector,/staleMotion=panel\.querySelector\('\.v4-inline-texture-motion'\).*staleMotion\.remove/,'图样设置中不得保留未接通的图案运动开关');

console.log('✓ V4 图样 UI 合同：点形映射、归一化偏移、命名和无效图案运动入口通过');
