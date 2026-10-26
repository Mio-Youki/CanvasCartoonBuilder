import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const patternSource=read('editor/classic-v4-pattern-field.js');
const colorSource=read('editor/classic-v4-color-control.js');
const cardSource=read('editor/classic-v4-inspector-effect-card.js');
const context={};
new vm.Script(read('editor/effect-registry-vnext.js'),{filename:'editor/effect-registry-vnext.js'}).runInNewContext(context);
const registry=context.EditorEffectRegistryVNext;
const effects=registry.effects;
const motion=registry.motionById;
const effect=id=>registry.effectById[id];
const param=(definition,key)=>definition.params.find(entry=>entry.key===key);

const legacyTerms=/阶数|步数|节拍数|保持次数|循环周期|错列相位|网点游移|相位幅度|单元倍数|最大颗粒/;
for(const definition of [...effects,...registry.controllers,...Object.values(motion)]){
  assert.equal(legacyTerms.test(definition.name||''),false,`名称不能残留旧术语：${definition.id}`);
  for(const entry of definition.params||[])assert.equal(legacyTerms.test(entry.label||''),false,`参数不能残留旧术语：${definition.id}.${entry.key}`);
}

for(const definition of Object.values(motion)){
  for(const entry of definition.params||[]){
    if(entry.key==='period')assert.equal(entry.label,'周期时间',`${definition.id}.period 必须统一为周期时间`);
    if(entry.key==='steps')assert.equal(entry.label,'周期帧数',`${definition.id}.steps 必须统一为周期帧数`);
    if(entry.key==='seed')assert.equal(entry.label,'随机种子',`${definition.id}.seed 必须统一为随机种子`);
  }
}

assert.equal(param(effect('texture-overlay'),'phaseX').label,'起始偏移 X');
assert.equal(param(effect('texture-overlay'),'phaseY').label,'起始偏移 Y');
assert.equal(param(effect('texture-overlay'),'rowPhase').label,'错列偏移');
assert.equal(param(effect('texture-overlay'),'size').label,'图样大小 / 线宽');
assert.equal(param(effect('halftone'),'size').label,'相对尺寸');
assert.equal(param(effect('halftone'),'offsetX').label,'起始偏移 X');
assert.equal(param(effect('halftone'),'offsetY').label,'起始偏移 Y');
assert.equal(param(effect('halftone'),'rowOffset').label,'错列偏移');
assert.equal(param(effect('uneven-sampling'),'coarseness').label,'最大采样');
assert.equal(param(effect('inner-light'),'size').label,'光效范围');
assert.equal(param(effect('outer-light'),'size').label,'光效范围');
for(const [key,label] of Object.entries({size:'相对尺寸',exposure:'亮度',attenuation:'对比',edgeSensitivity:'检测灵敏度',edgeCoverage:'显示阈值'}))assert.equal(param(effect('ascii-mapping'),key).label,label);
assert.equal(param(effect('ascii-mapping'),'size').integer,true);assert.equal(param(effect('ascii-mapping'),'size').step,1);
assert.equal(param(effect('ascii-mapping'),'edgeCharacters').default,'—|/\\');

for(const definition of effects){
  for(const entry of definition.params||[])if(entry.key==='alpha')assert.equal(entry.label,'透明度',`${definition.id}.alpha 必须统一为透明度`);
}
assert.equal(param(effect('threshold'),'dark').label,'暗色');
assert.equal(param(effect('threshold'),'light').label,'亮色');
assert.equal(param(effect('halftone'),'duotoneDark').label,'暗色');
assert.equal(param(effect('halftone'),'duotoneLight').label,'亮色');

// Shared Inspector modules are the only permitted place to introduce the
// corresponding UI words.  Keep their terminology aligned with Registry.
assert.equal(/错列相位|单元倍数|网点游移|相位幅度/.test(patternSource),false,'图样字段不能重新引入废弃术语');
for(const label of ['起始偏移 X','起始偏移 Y','错列偏移','图样大小','格距'])assert.equal(patternSource.includes(label),true,`图样字段必须使用统一术语：${label}`);
assert.equal(colorSource.includes('透明度'),true,'颜色控件必须使用透明度');
assert.equal(cardSource.includes('动态'),true,'效果卡片必须使用统一的动态入口名称');

console.log('✓ V4 术语合同：周期、随机、透明度、纹理、网点与尺寸命名一致');
