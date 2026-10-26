import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const context={};
new vm.Script(read('editor/effect-registry-vnext.js')).runInNewContext(context);
new vm.Script(read('editor/classic-v4-inspector-effect-parameters.js')).runInNewContext(context);

const registry=context.EditorEffectRegistryVNext;
const planner=context.EditorClassicV4EffectParameters;
const effect=id=>registry.effectById[id];
const keys=plan=>plan.params.map(param=>param.key);

const bands=planner.plan({id:'offset-sampling'},effect('offset-sampling'),{type:'bands',bands:{orientation:'horizontal'}});
assert.equal(bands.special,null,'偏移采样应使用通用参数渲染器');
assert.ok(keys(bands).includes('bands.count'),'条带模式必须显示条带参数');
assert.equal(keys(bands).includes('boil.bias'),false,'条带模式不能显示沸腾偏置');

const boil=planner.plan({id:'offset-sampling'},effect('offset-sampling'),{type:'boil',boil:{bias:1},edge:{mode:'contour'}});
assert.ok(keys(boil).includes('boil.bias'),'沸腾模式必须显示偏置');
assert.ok(keys(boil).includes('edge.width'),'轮廓保护必须显示保护宽度');

const map=planner.plan({id:'color-map'},effect('color-map'),{mode:'discrete',palette:'auto',colors:16});
assert.ok(keys(map).includes('colors'),'自动提取必须显示最大颜色数');
const tint=planner.plan({id:'tint-overlay'},effect('tint-overlay'),{color:'#ffffff',alpha:.5});
assert.equal(keys(tint).includes('alpha'),false,'带颜色参数的效果不能额外生成重复透明度字段');
const vignette=planner.plan({id:'masked-inner-light'},effect('masked-inner-light'),{color:'#000000',strength:.38});
assert.equal(keys(vignette).includes('strength'),false,'蒙版暗角的透明度应归入同一颜色控件，而非独立强度字段');

const texture=planner.plan({id:'texture-overlay'},effect('texture-overlay'),{texture:'dots'});
assert.equal(texture.special,'texture','纹理叠加必须进入专用图样编辑器');
const uneven=planner.plan({id:'uneven-sampling'},effect('uneven-sampling'),{});
assert.equal(uneven.special,'uneven','不均采样必须进入专用采样编辑器');

const unevenObject=planner.unevenPlan(effect('uneven-sampling'),{field:{type:'radial'},edge:{mode:'contour'}},'object');
assert.deepEqual(Array.from(unevenObject.params,param=>param.key),['amount','coarseness','field.type','field.contrast','field.scale','field.centerX','field.centerY','edge.mode','edge.width']);
const unevenScene=planner.unevenPlan(effect('uneven-sampling'),{field:{type:'noise'}},'scene');
assert.ok(unevenScene.params.map(param=>param.key).includes('field.seed'),'噪声场必须显示随机种子');
assert.equal(unevenScene.params.map(param=>param.key).includes('edge.mode'),false,'场景级不均采样不得暴露对象边缘保护');

console.log('✓ V4 效果参数计划：可见性、专用编辑器和颜色透明度规则通过');
