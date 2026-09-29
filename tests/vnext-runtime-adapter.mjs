#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), source = path => readFileSync(resolve(root, path), 'utf8');
const context = { OffscreenCanvas: class { constructor(width, height) { this.width = width; this.height = height; this.ctx = { save(){}, restore(){}, clearRect(){}, fillRect(){}, strokeRect(){}, beginPath(){}, rect(){}, ellipse(){}, arc(){}, clip(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, closePath(){}, translate(){}, rotate(){}, scale(){}, transform(){}, fillText(){}, drawImage(){}, getImageData(x,y,w,h){ const data = new Uint8ClampedArray(w*h*4); for(let i=3;i<data.length;i+=4)data[i]=255; return {data}; }, putImageData(){}, globalAlpha: 1, globalCompositeOperation: 'source-over' }; } getContext(){ return this.ctx; } } };
for (const file of ['editor/runtime-bridge.js', 'editor/vnext-scene.js', 'home-scene-vnext.js', 'editor/vnext-runtime-adapter.js']) new vm.Script(source(file), { filename: file }).runInNewContext(context);
const document = context.EditorVNextScene.blank({ width: 32, height: 16, loop: 1 });
document.entities.push({ id: 'box', type: 'rect', x: 2, y: 2, w: 8, h: 8 });
assert.equal(context.EditorVNextRuntimeAdapter.issue(), '');
const player = context.EditorVNextRuntimeAdapter.create(document, {});
assert.equal(player.scene.format, 'tosampool-scene/v4');
const target = new context.OffscreenCanvas(1, 1);
assert.equal(context.EditorVNextRuntimeAdapter.renderTo(target, document, {}, .25).directObjects, 1);
console.log('✓ vNext Runtime Adapter：能力握手、Scene hydrate 与隔离预览合同通过');
