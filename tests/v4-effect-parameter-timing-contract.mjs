import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),c=vm.createContext({});
for(const file of ['home-scene-vnext.js','editor/effect-registry-vnext.js','editor/v4-parameter-controls.js','editor/classic-v4-effect-parameter-timing.js'])vm.runInContext(readFileSync(resolve(root,file),'utf8'),c);
const api=c.EditorClassicV4EffectParameterTiming,registry=c.EditorEffectRegistryVNext;
const coverage=api.coverage(registry);assert.equal(coverage.length,registry.effects.reduce((sum,d)=>sum+d.params.length,0));
for(const def of registry.effects){assert.equal(api.supports(def),true);for(const p of def.params){const row=api.binding(def,p.key);assert.equal(row.path,p.key);assert.ok(row.control);assert.ok(['No','Step','Linear'].includes(row.timing));}}
const novel={id:'new-effect-without-whitelist',timing:'step',params:[{key:'amount',type:'number',default:1}]};assert.equal(api.supports(novel),true);assert.equal(api.binding(novel,'amount').control,'standard');
assert.throws(()=>api.binding({id:'unknown',params:[{key:'value',type:'unknown'}]},'value'),/缺少控件适配器/);
assert.equal(api.binding(registry.effectById['texture-overlay'],'tilePixels').control,'texture-editor');assert.equal(api.binding(registry.effectById['ascii-mapping'],'font').control,'ascii-font');
const motions=api.motionCoverage(registry);assert.ok(motions.length>0);for(const row of motions){assert.equal(row.timing,'Step');assert.ok(row.path.startsWith('motion.'));}
assert.deepEqual(JSON.parse(JSON.stringify(api.group(registry.effectById['texture-overlay'],'tileWidth'))),['tileWidth','tileHeight','tilePixels']);
assert.equal(api.parameter(registry.effectById.threshold,'dark').timing,'step','参数未单独声明时继承效果Step能力');
const tint=registry.effectById['tint-overlay'],context={segment:{type:'step',values:{alpha:.4,enabled:false}},wholeSegment:false,armed:key=>key==='color'};
let p=api.partition(tint,{color:'#ff0000',alpha:.6,blend:'screen'},context);assert.deepEqual(JSON.parse(JSON.stringify(p)),{base:{blend:'screen'},timed:{color:'#ff0000',alpha:.6}});
assert.equal(context.segment.values.enabled,false,'逐参数规划不能改变显隐状态');
p=api.partition(tint,{blend:'multiply'},{...context,wholeSegment:true});assert.equal(p.timed.blend,'multiply','顶部批量入口继续支持Step选项');
assert.throws(()=>api.partition(tint,{enabled:false},context),/尚未接入/,'全局开关不应伪装成时序参数');
assert.throws(()=>api.partition(tint,{alpha:.4},{...context,segment:{type:'linear'}}),/只读/);
const map=registry.effectById['color-map'];
p=api.partition(map,{colors:16,extracted:{colors:16,entries:[[0,0,0]]}},{...context,armed:key=>key==='colors'});assert.ok(p.timed.colors);assert.ok(p.timed.extracted);assert.deepEqual(Object.keys(p.base),[]);
p=api.partition(map,{colors:32,extracted:{colors:32,entries:[[0,0,0]]}},{...context,armed:()=>false,segment:{type:'step',values:{blend:'screen'}}});assert.ok(p.base.colors);assert.ok(p.base.extracted);assert.deepEqual(Object.keys(p.timed),[]);
p=api.partition(registry.effectById['crt-display'],{theme:'apple',scanline:.7},{...context,armed:key=>key==='theme',atomicKey:'theme'});assert.equal(p.timed.scanline,.7);assert.equal(p.timed.theme,'apple');assert.deepEqual(Object.keys(p.base),[]);
console.log('✓ Registry-wide effect parameter coverage: '+coverage.length+' fields, no effect whitelist, explicit adapters, derived extraction, independent routes and read-only transitions');
