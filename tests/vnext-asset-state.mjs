#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), context = {};
new vm.Script(readFileSync(resolve(root, 'editor/vnext-asset-state.js'), 'utf8')).runInNewContext(context);
const state = context.EditorVNextAssetState, scene = { width: 100, height: 80, assets: {}, entities: [] };
const first = state.addImage(scene, { name: 'Sky Photo.png', locator: 'data:image/png;base64,AA==', mime: 'image/png', width: 30, height: 20 });
assert.equal(first.assetId, 'sky-photo'); assert.equal(scene.entities[0].x, 35); assert.equal(scene.entities[0].y, 30);
const second = state.addImage(scene, { name: 'Sky Photo.png', locator: 'assets/sky.png', width: 10, height: 10 }); assert.equal(second.assetId, 'sky-photo-2');
const third = state.addImage(scene, { name: 'Processed.png', locator: 'assets/processed.png', width: 10, height: 10, recipe: { pixelDiv:2, palette:'pico8' } }); assert.equal(JSON.stringify(scene.assets[third.assetId].recipe), JSON.stringify({ pixelDiv:2, palette:'pico8' }));
const sequence = state.addImage(scene, { name:'Wind Loop', frames:[{ locator:'assets/wind-01.png' }, { locator:'assets/wind-02.png' }], width:12, height:8, fps:6 }); assert.equal(sequence.frames, 2); assert.equal(scene.assets[sequence.assetId].frames.length, 2); assert.equal(scene.entities.at(-1).fps, 6);
const fitted = state.addImage(scene, { name:'Large Photograph', locator:'assets/large.png', width:300, height:120 }); assert.equal(scene.entities.at(-1).w, 67); assert.equal(scene.entities.at(-1).h, 27); assert.equal(scene.entities.at(-1).x, 17); assert.equal(scene.entities.at(-1).y, 27, 'new large assets fit inside 2/3 of the artboard and remain centered');
const explicit = state.addImage(scene, { name:'Intentional Large', locator:'assets/intentional.png', width:300, height:120, w:300, h:120 }); assert.equal(scene.entities.at(-1).w, 300, 'explicit placement keeps caller-provided dimensions');
const background = state.addBackground(scene, { name:'Backdrop', locator:'assets/backdrop.png', width:64, height:36, layout:'stretch', createScene:true }); assert.equal(scene.width, 64); assert.equal(scene.background.layers[0].assetId, background.assetId); assert.equal(scene.background.layers[0].layout, 'stretch');
assert.throws(() => state.addImage(scene, { name: 'bad' }), /locator/);
console.log('✓ vNext Asset State：持久素材描述、唯一 id 与图片实体创建合同通过');
