import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const context={ToSampoolRuntimeVNext:{modules:{}}};
new vm.Script(readFileSync(resolve(root,'runtime-src/vnext/55-pattern-field.js'),'utf8')).runInNewContext(context);
const pattern=context.ToSampoolRuntimeVNext.modules.pattern;
const plain=value=>JSON.parse(JSON.stringify(value));

for(const size of [2,4,8]){
  const generated=pattern.bayer(size),tones=generated.tilePixels.map(hex=>parseInt(hex.slice(1,3),16));
  assert.equal(generated.tileWidth,size);
  assert.equal(generated.tileHeight,size);
  assert.equal(new Set(tones).size,size*size,'Bayer 的每个格子必须对应独立灰阶阈值');
  assert.ok(generated.tilePixels.every(hex=>/^#[0-9a-f]{6}ff$/.test(hex)),'Bayer 格子必须是不透明灰阶');
  assert.deepEqual(plain(pattern.canonical(generated).tilePixels),plain(generated.tilePixels));
}
const tile=pattern.canonical({type:'custom',tileWidth:2,tileHeight:2,tileScale:3,tilePixels:['#ff0000ff','#00ff0080','#0000ffff','#00000000'],phaseX:.5,phaseY:.25});
assert.equal(tile.tileScale,3);
assert.equal(tile.phaseX,.5);
assert.deepEqual(plain(tile.tilePixels),['#ff0000ff','#00ff0080','#0000ffff','#00000000']);
assert.equal(pattern.overlay({texture:'custom',tileWidth:2,tileHeight:2,tileScaleMode:'sampling',_samplingSize:4,tilePixels:tile.tilePixels}).tileScale,4);
assert.equal(pattern.canonical(pattern.overlay({texture:'custom',tileWidth:2,tileHeight:2,tileScaleMode:'sampling',_samplingSize:128,tilePixels:tile.tilePixels})).tileScale,128,'跟随采样尺寸不得在 16 像素暗中截断');
console.log('✓ V4 自定义 tile：Bayer 阶数、RGBA 格子、偏移与采样尺寸联动通过');
