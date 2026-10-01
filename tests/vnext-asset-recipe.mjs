#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), context = {};
new vm.Script(readFileSync(resolve(root, 'editor/vnext-asset-recipe.js'), 'utf8')).runInNewContext(context);
const recipe = context.EditorVNextAssetRecipe;
assert.equal(recipe.palettes, undefined, '色板与量化必须留在 Scene 采样层，不能重新固化进导入配方');
assert.equal(JSON.stringify(recipe.normalize({ width: 32.2, pixelDiv: 8, palette: 'pico8', quant: 500, bgTolerance: -2 })), JSON.stringify({ width:32, height:0, backgroundRemoval:{ enabled:false, color:[0,0,0], tolerance:0, feather:0, connected:true } }));
assert.equal(JSON.stringify(recipe.normalize({ width: 20, height: 10, backgroundRemoval:{ enabled:true, color:[12,34,56], tolerance:99, feather:4, connected:false } })), JSON.stringify({ width:20, height:10, backgroundRemoval:{ enabled:true, color:[12,34,56], tolerance:99, feather:4, connected:false } }));
const image = { width: 16, height: 9 };
assert.equal(recipe.apply(image, {}), image, '无处理配方时不得创建额外画布');
console.log('✓ vNext Asset Recipe：尺寸 / 去背景配方与无处理快速路径合同通过');
