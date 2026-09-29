#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const runtimeNamespace=readFileSync(resolve(root,'runtime-src/vnext/00-namespace.js'),'utf8'),builtinSource=readFileSync(resolve(root,'runtime-src/vnext/15-builtin-registry.js'),'utf8');
const source = readFileSync(resolve(root, 'editor/vnext-preview-scheduler.js'), 'utf8');
const sandbox = {};
new vm.Script(runtimeNamespace,{filename:'00-namespace.js'}).runInNewContext(sandbox);
new vm.Script(builtinSource,{filename:'15-builtin-registry.js'}).runInNewContext(sandbox);
new vm.Script(source, { filename:'vnext-preview-scheduler.js' }).runInNewContext(sandbox);
const schedulerApi = sandbox.EditorVNextPreviewScheduler;

const staticScene = { format:'tosampool-scene/v4', width:1920, height:1080, loop:12, assets:{ photo:{ locator:'assets/photo.png' } }, entities:[{ id:'photo', type:'image', assetId:'photo', x:0, y:0, w:1920, h:1080 }], timeline:{ tracks:{} } };
const scheduler = schedulerApi.create();
let request = scheduler.shouldRender(staticScene, 0);
assert.equal(request.render, true, '初始静态场景必须首帧绘制'); scheduler.rendered(request.state);
request = scheduler.shouldRender(staticScene, 4.2);
assert.equal(request.render, false, '静态场景播放时不得重绘 Canvas');
assert.equal(scheduler.snapshot().staticSkips, 1);

const stepScene = { loop:10, timeline:{ tracks:{ object:{ segments:[{ f:[0,.5], values:{ x:1 } },{ f:[.5,1], values:{ x:2 } }] } } }, entities:[] };
const steps = schedulerApi.create();
request = steps.shouldRender(stepScene, 1); steps.rendered(request.state);
assert.equal(steps.shouldRender(stepScene, 3).render, false, 'Step 同段内不应连续重绘');
assert.equal(steps.shouldRender(stepScene, 6).render, true, 'Step 跨段必须重绘');

const localSceneBackground = { loop:10, timeline:{ scenes:[{id:'early',f:[0,.5]},{id:'late',f:[.5,1]}], tracks:{ 'scene-background:late':{ segments:[{f:[0,.5],values:{color:'#112233'}},{f:[.5,1],values:{color:'#445566'}}] } } }, entities:[] };
const localBackground = schedulerApi.create();
request = localBackground.shouldRender(localSceneBackground, 5.5); localBackground.rendered(request.state);
assert.equal(localBackground.shouldRender(localSceneBackground, 6.5).render, false, '新增 Scene 的本地背景 Step 同段内不得连续重绘');
assert.equal(localBackground.shouldRender(localSceneBackground, 8).render, true, '新增 Scene 的本地背景轨跨段必须重绘，不能沿用全局时间索引');

const baseSceneOnly = { loop:10, timeline:{ scenes:[{id:'base-a',f:[0,.5],background:{color:'#112233'}},{id:'base-b',f:[.5,1],background:{color:'#445566'}}], tracks:{} }, entities:[] };
const baseSceneScheduler = schedulerApi.create();
request = baseSceneScheduler.shouldRender(baseSceneOnly, 1); baseSceneScheduler.rendered(request.state);
assert.equal(baseSceneScheduler.shouldRender(baseSceneOnly, 7).render, true, '仅有不同基础背景的新 Scene 切换时也必须使 Canvas 缓存失效');

const linearScene = { loop:10, timeline:{ tracks:{ object:{ segments:[{ f:[0,1], type:'linear', from:{ x:0 }, to:{ x:10 } }] } } }, entities:[] };
const linear = schedulerApi.create();
request = linear.shouldRender(linearScene, 1); linear.rendered(request.state);
assert.equal(linear.shouldRender(linearScene, 2).render, true, 'Linear 轨必须持续重绘');
assert.equal(schedulerApi.profile({ loop:4, entities:[{ id:'emitter', type:'particle-emitter' }] }, 1).continuous, true, '粒子必须视为时间相关');
assert.equal(schedulerApi.profile({ loop:4, entities:[{ id:'star', type:'builtin', builtin:{id:'pixel-star',version:1,params:{twinkle:.2}} }] }, 1).continuous, true, '启用内建时间参数的构件必须连续预览');
assert.equal(schedulerApi.profile({ loop:4, entities:[{ id:'cloud', type:'builtin', builtin:{id:'pixel-cloud',version:1} }] }, 1).continuous, false, '静态内建构件必须保持跳绘能力');
assert.equal(schedulerApi.profile({ loop:4, assets:{ loop:{ frames:[{},{}], fps:8 } }, entities:[{ id:'image', type:'image', assetId:'loop' }] }, 1).continuous, true, '多帧图片必须视为时间相关');
assert.equal(schedulerApi.profile({ loop:4, timeline:{ scenes:[{ id:'scene-a', f:[0,1], transition:{type:'scan',duration:.4} }], tracks:{} }, entities:[] }, 1).continuous, true, '静态 Scene 的入口过渡也必须持续重绘，不能残留上一帧');
console.log('✓ v4 Preview Scheduler：静态跳绘、Step 边界、Linear/粒子/多帧连续重绘合同通过');
