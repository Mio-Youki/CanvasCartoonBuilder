import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const source=readFileSync(resolve(root,'editor/classic-v4-overlay-pattern-codec.js'),'utf8');
const context={};
new vm.Script(source).runInNewContext(context);
const codec=context.EditorClassicV4OverlayPatternCodec;

const screenNoise=codec.fromEffect({texture:'noise',noiseDensity:.32,noiseSize:2,noiseSeed:17,color:'#aabbcc'});
assert.deepEqual(JSON.parse(JSON.stringify(screenNoise)),{phaseX:0,phaseY:0,color:'#aabbcc',type:'noise',density:.32,size:2,seed:17},'屏幕噪点必须从效果参数还原为图样设置可预览的噪点图案');
assert.deepEqual(JSON.parse(JSON.stringify(codec.toEffect(screenNoise))),{phaseX:0,phaseY:0,texture:'noise',noiseDensity:.32,noiseSize:2,noiseSeed:17},'屏幕噪点从图样设置写回时不得回退为单线');
const plain=value=>JSON.parse(JSON.stringify(value));

const dots=codec.fromEffect({texture:'dots',shape:'hexagon',size:3,spacing:9,angle:20,layout:'stagger',rowPhase:.25,phaseX:.4,phaseY:.6,color:'#d97706'});
assert.equal(dots.type,'dots');
assert.equal(dots.sides,6);
assert.equal(dots.roundness,0);
assert.deepEqual(plain(codec.toEffect(dots)),{texture:'dots',size:3,spacing:9,angle:20,shape:'hexagon',layout:'stagger',rowPhase:.25,phaseX:.4,phaseY:.6});

const grid=codec.fromEffect({texture:'grid',size:2,spacing:8,angle:15,phaseX:.2,phaseY:.8});
assert.equal(grid.lineMode,'grid');
assert.equal(grid.layers.length,2);
assert.equal(grid.layers[1].angle,105);
assert.deepEqual(plain(codec.toEffect(grid)),{texture:'grid',angle:15,size:2,spacing:8,phaseX:.2,phaseY:.8});

const layers=codec.fromEffect({texture:'lines-layers',size:1,spacing:5,angle:0,layer2Angle:37,layer2Width:2,layer2Spacing:7,layer3Angle:123,layer3Width:3,layer3Spacing:11});
assert.equal(layers.layers.length,3);
assert.equal(codec.toEffect(layers).layer3Spacing,11);

const custom={texture:'custom',tileWidth:2,tileHeight:2,tileScale:3,tileScaleMode:'pixel',tilePixels:['#f0f0f0ff','#808080ff','#00000000','#20202080'],phaseX:.25,phaseY:.75};
const customPattern=codec.fromEffect(custom);
assert.equal(customPattern.type,'custom');
assert.deepEqual(plain(codec.toEffect(customPattern)),custom,'自定义格子颜色、透明度、尺寸与偏移必须往返保留');
const changed=plain(codec.editPatch(codec.fromEffect({texture:'lines-horizontal',size:2,spacing:8}),codec.fromEffect({texture:'lines-horizontal',size:12,spacing:12}),'size'));
assert.deepEqual(changed,{size:12,spacing:12},'纹理操作仅写变化和联动字段，不提交整份参数快照');
const resized=codec.fromEffect({...custom,tileWidth:3,tilePixels:[...custom.tilePixels,'#00000000','#00000000']});
assert.deepEqual(Object.keys(codec.editPatch(customPattern,resized,'tileWidth')).sort(),['tileHeight','tilePixels','tileWidth']);
assert.deepEqual(plain(codec.editPatch(customPattern,customPattern,'tileWidth')),{},'无变化的操作不产生时序或历史');

console.log('✓ V4 叠加图样编解码：点阵、网格、叠线与相位往返一致');
