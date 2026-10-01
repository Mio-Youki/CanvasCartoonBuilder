import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const context={};
new vm.Script(read('editor/effect-registry-vnext.js'),{filename:'editor/effect-registry-vnext.js'}).runInNewContext(context);
const registry=context.EditorEffectRegistryVNext;

const runtimeSources=Object.freeze({
  objectFormation:read('runtime-src/vnext/70-object-composer.js'),
  objectDecorate:read('runtime-src/vnext/65-decorate-effects.js'),
  objectSample:read('runtime-src/vnext/68-sampling-effects.js'),
  scene:read('runtime-src/vnext/69-scene-effects.js'),
});
const inspector=read('editor/classic-v4-inspector-controller.js');
const landing=read('docs/V4_EFFECT_LANDING_POINTS.md');

assert.equal(registry.lifecycle,'classic-shell-connected','Registry 必须如实声明 Classic Shell 已连接');
assert.match(inspector,/renderEffects\('object',item,'decorate'\)/,'对象加样页必须从 Registry 渲染');
assert.match(inspector,/renderEffects\('object',item,'sample'\)/,'对象采样页必须从 Registry 渲染');
assert.match(inspector,/renderEffects\('scene',null,'overlay'\)/,'场景叠加页必须从 Registry 渲染');
assert.match(inspector,/renderEffects\('scene',null,'sample'\)/,'场景采样页必须从 Registry 渲染');

function sourceFor(effect,scope){
  if(scope==='scene')return runtimeSources.scene;
  if(effect.id==='color-grade')return runtimeSources.objectFormation;
  return effect.family==='decorate'?runtimeSources.objectDecorate:runtimeSources.objectSample;
}

for(const effect of registry.effects){
  assert.match(landing,new RegExp('`'+effect.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'`'),`四层台账遗漏 ${effect.id}`);
  for(const scope of effect.scopes){
    assert.equal(registry.runtimeSupport?.[effect.id]?.[scope],'ready',`${effect.id}/${scope} 不得标为可编辑却没有 Runtime ready 状态`);
    const source=sourceFor(effect,scope);
    assert.ok(source.includes("'"+effect.id+"'")||source.includes('`'+effect.id+'`'),`${effect.id}/${scope} 缺少 Runtime 分发声明`);
  }
}

for(const controller of registry.controllers){
  assert.equal(controller.card,false,`${controller.id} 是控制器，不能伪装为效果卡`);
  assert.match(inspector,/model\.controllers/,'Inspector 必须能从 Registry 枚举控制器');
  assert.match(runtimeSources.objectSample,new RegExp(controller.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${controller.id} 缺少对象采样 Runtime 路径`);
  assert.match(runtimeSources.scene,/group && group\.controllers/,'场景采样必须把声明式控制器传入 Runtime');
  assert.match(runtimeSources.scene,/sampling\.hasBaseGrid/,'场景采样格必须能单独触发可见再采样');
}

console.log(`✓ V4 效果四层合同：${registry.effects.length} 个效果、${registry.controllers.length} 个控制器的 Registry / Inspector / Runtime / 台账一致`);
