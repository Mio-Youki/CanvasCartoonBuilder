import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const source=readFileSync(resolve(root,'editor/classic-v4-overlay-pattern-codec.js'),'utf8');
const context={};
new vm.Script(source).runInNewContext(context);
const codec=context.EditorClassicV4OverlayPatternCodec;
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

console.log('✓ V4 叠加图样编解码：点阵、网格、叠线与相位往返一致');
