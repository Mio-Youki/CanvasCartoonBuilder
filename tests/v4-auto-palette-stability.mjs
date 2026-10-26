import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context={};
for(const file of ['home-scene-vnext.js','editor/effect-registry-vnext.js','editor/vnext-inspector-model.js','editor/vnext-effect-state.js'])new vm.Script(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{filename:file}).runInNewContext(context);
const api=context.ToSampoolRuntimeVNext.modules.sampling;
const rgb=Array.from({length:64},(_,i)=>[128+i%8,128+(i>>3),128]),pixels=new Uint8ClampedArray(rgb.flatMap(p=>[...p,255]));
for(const count of [2,4,8,16,32,64]){
  const palette=api.autoPalette(pixels,count),mapped=api.paletteLut(palette),output=new Set(rgb.map(p=>palette[api.paletteIndex(mapped,...p)].join(',')));
  assert.equal(output.size,count,'同一个RGB5格内也必须分辨真实颜色');
  assert.equal(mapped.lut.length,32768);assert.ok(mapped.exact.size<=4096);
}
assert.deepEqual(api.autoPalette(pixels,16),api.autoPalette(new Uint8ClampedArray(rgb.slice().reverse().flatMap(p=>[...p,255])),16),'统计相同但像素顺序变化不能改变分组');
const large=new Uint8ClampedArray(131072*4);
for(let i=0;i<131072;i++)large.set(i<65536?[i&255,i>>8,0,255]:[0,0,255,255],i*4);
assert.ok(api.autoPalette(large,2).some(p=>p[2]>200),'不能因首65536种颜色已满而忽略后半幅图');
const dominantWhite=new Uint8ClampedArray([[10,20,30,255],[40,30,20,255],...Array.from({length:100},()=>[255,255,255,255])].flat());
assert.ok(api.autoPalette(dominantWhite,16).every(p=>p.every(Number.isInteger)),'大面积背景不能把Median Cut切出空盒／NaN色');
// Check the fast path against a brute-force reference, including close colours.
let seed=12345;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed>>>24;};
const palette=Array.from({length:64},()=>[next(),next(),next()]),mapped=api.paletteLut(palette);
for(let i=0;i<20000;i++){
  const p=[next(),next(),next()];let index=0,distance=Infinity;
  palette.forEach((entry,j)=>{const d=entry.reduce((sum,v,k)=>sum+(v-p[k])**2,0);if(d<distance){index=j;distance=d;}});
  assert.equal(api.paletteIndex(mapped,...p),index,'快速安全格／边界精算必须与完整RGB最近色一致');
}
const state=context.EditorVNextEffectState,definition=context.EditorEffectRegistryVNext.effectById['color-map'];
const extracted={colors:4,entries:[[1,2,3],[255,0,0]]},normalized=state.normalizeParam(definition,'extracted',extracted);extracted.entries[0][0]=40;assert.equal(normalized.entries[0][0],1);
assert.ok(api.extractedPalette({colors:4,extracted:normalized}));assert.equal(api.extractedPalette({colors:8,extracted:normalized}),null);
assert.throws(()=>state.normalizeParam(definition,'extracted',{colors:4,entries:[[NaN,0,0]]}));
console.log('✓ 自动取色：窄色域六档有效／全画面统计／像素顺序稳定／20000组精确最近色／缓存预算／固定色板校验');
