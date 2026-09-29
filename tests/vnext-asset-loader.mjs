#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), source = path => readFileSync(resolve(root, path), 'utf8');
const context = {
  EditorAssetResolver: { async resolveToDataUrl(ref, options) { assert.equal(ref, 'assets/photo.png'); assert.equal(options.sceneLocator, 'scenes/demo.tosampool.json'); return 'data:image/png;base64,AA=='; } },
  EditorHost: { kind: 'test-host' },
  Image: class {},
  EditorVNextAssetRecipe: { apply(image, recipe) { return recipe ? Object.assign({ processed:true }, image) : image; } },
  OffscreenCanvas: class { constructor(width, height) { this.width = width; this.height = height; this.ctx = { save(){}, restore(){}, clearRect(){}, fillRect(){}, strokeRect(){}, beginPath(){}, rect(){}, ellipse(){}, arc(){}, clip(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, closePath(){}, translate(){}, rotate(){}, scale(){}, transform(){}, fillText(){}, drawImage(){}, getImageData(x,y,w,h){ const data = new Uint8ClampedArray(w*h*4); for(let i=3;i<data.length;i+=4)data[i]=255; return {data}; }, putImageData(){}, globalAlpha: 1, globalCompositeOperation: 'source-over' }; } getContext(){ return this.ctx; } },
};
for (const file of ['editor/runtime-bridge.js', 'editor/vnext-scene.js', 'home-scene-vnext.js', 'editor/vnext-runtime-adapter.js', 'editor/vnext-asset-loader.js']) new vm.Script(source(file), { filename: file }).runInNewContext(context);
const document = context.EditorVNextScene.blank({ width: 32, height: 16, loop: 1 });
document.assets.photo = { locator: 'assets/photo.png', mime: 'image/png', recipe: { pixelDiv:2 } };
document.entities.push({ id: 'photo', type: 'image', assetId: 'photo', x: 2, y: 2, w: 8, h: 8 });
const runtimeAssets = await context.EditorVNextAssetLoader.resolve(document, { sceneLocator: 'scenes/demo.tosampool.json', loadImage: async dataUrl => ({ decoded: dataUrl }) });
assert.equal(runtimeAssets.photo.locator, 'assets/photo.png'); assert.equal(runtimeAssets.photo.image.decoded, 'data:image/png;base64,AA==');
assert.equal(runtimeAssets.photo.image.processed, true); assert.equal(runtimeAssets.photo.recipe.pixelDiv, 2);
document.assets.loop = { locator:'assets/photo.png', frames:[{ locator:'assets/photo.png' }, { locator:'assets/photo.png' }], fps:6 };
const loopAssets = await context.EditorVNextAssetLoader.resolve(document, { sceneLocator:'scenes/demo.tosampool.json', loadImage:async dataUrl => ({ decoded:dataUrl }) }); assert.equal(loopAssets.loop.frames.length, 2); assert.equal(loopAssets.loop.fps, 6);
const player = await context.EditorVNextRuntimeAdapter.createResolved(document, { sceneLocator: 'scenes/demo.tosampool.json', loadImage: async dataUrl => ({ decoded: dataUrl }) });
assert.equal(player.scene.assets.photo.image.decoded, 'data:image/png;base64,AA==');
await assert.rejects(() => context.EditorVNextAssetLoader.resolve({ assets: { broken: {} } }), /缺少 locator/);
console.log('✓ vNext Asset Loader：持久 locator 经 Host 解析后再注入隔离 Runtime 合同通过');
