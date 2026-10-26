import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const sandbox={};for(const path of['../home-scene-vnext.js','../editor/v4-pattern-registry.js'])new vm.Script(readFileSync(new URL(path,import.meta.url),'utf8')).runInNewContext(sandbox);
const registry=sandbox.EditorV4PatternRegistry,part={id:'p',type:'rect',w:30,h:20},scene={entities:[{id:'single',type:'vector',parts:[part]},{id:'multi',type:'vector',parts:[part,{id:'q',type:'line'}]},{id:'group',type:'group'},{id:'native',type:'ellipse',w:30,h:20},{id:'free',type:'vector',parts:[{id:'f',type:'poly',points:[[0,0],[1,0],[0,1]]}]}]};
const select=(ids,parts=[])=>({selectedIds:ids,selectedPartIds:parts,selectedPartId:parts.at(-1)||null});
for(const selection of[select([]),select(['multi']),select(['group']),select(['single','multi']),select(['multi'],['p','q'])]){assert.equal(registry.available(scene,selection).target,null);assert.equal(registry.available(scene,selection).entries.length,registry.entries.length);}
for(const selection of[select(['single']),select(['single'],['p']),select(['native'])])assert.ok(registry.available(scene,selection).target);
assert.equal(registry.target(scene,select(['native'])).partId,'@self');assert.equal(registry.available(scene,select(['free'])).entries.some(e=>e.id==='nested'),false);
assert.equal(registry.target(scene,select(['single'],['removed-after-undo'])).partId,'p','撤销后失效的图元引用应退回唯一有效图元');
assert.equal(registry.supportedCarriers('nested').some(c=>c.id==='free'),false);assert.ok(registry.supportedCarriers('ticks').some(c=>c.id==='free'));
part.extensions={ticks:{enabled:false,count:37}};registry.enable(part,'ticks');assert.equal(part.extensions.ticks.count,37);assert.equal(part.type,'rect');const saved=JSON.stringify(part);registry.enable(part,'ticks');assert.equal(JSON.stringify(part),saved);
console.log('✓ 图样登记合同：选择矩阵／能力筛选／载体限制／原类型保留／重复应用保持参数通过');

const fresh={type:'rect',w:80,h:60,stroke:'#fff',strokeWidth:2};
assert.deepEqual(Array.from(registry.attached(fresh)),[]);
registry.enable(fresh,'ticks');assert.deepEqual(Array.from(registry.attached(fresh)),['ticks'],'normalized defaults must not count as additions');
const normalized=sandbox.ToSampoolRuntimeVNext.modules.pathExtensions.normalize(fresh);normalized.ticks.enabled=false;normalized.ticks.count=37;registry.commit(fresh,normalized,'ticks');
assert.deepEqual(Array.from(registry.attached(JSON.parse(JSON.stringify(fresh)))),['ticks'],'disabled membership survives serialization');
registry.enable(fresh,'nested');registry.remove(fresh,'nested');assert.equal(fresh.extensions.ticks.count,37);assert.equal(fresh.extensions.ticks.enabled,false);
registry.enable(fresh,'ticks');assert.equal(fresh.extensions.ticks.count,37);registry.remove(fresh,'ticks');assert.equal(fresh.extensions,undefined);
assert.deepEqual(Array.from(registry.attached({extensions:{ticks:{enabled:true},nested:{enabled:false}}})),['ticks'],'existing enabled geometry is not lost');
console.log('✓ 添加身份：空状态／单项添加／停用保值／重开／移除／重复应用通过');
const ordered={type:'rect',w:80,h:60};registry.enable(ordered,'ticks');registry.enable(ordered,'nested');registry.enable(ordered,'brackets');
registry.reorder(ordered,'ticks','brackets','before');assert.deepEqual(Array.from(registry.attached(ordered)),['nested','brackets','ticks']);
assert.equal(ordered.extensions.ticks.enabled,true);registry.reorder(ordered,'ticks','nested','after');assert.deepEqual(Array.from(registry.attached(ordered)),['ticks','nested','brackets']);
assert.equal(registry.reorder(ordered,'ticks','missing','before'),false);
assert.deepEqual(Array.from(sandbox.ToSampoolRuntimeVNext.modules.pathExtensions.normalize(ordered).attached),['ticks','nested','brackets']);
console.log('✓ 覆盖顺序：树上／下放置映射到底到顶绘制，非法目标不变，Runtime读取同序');
