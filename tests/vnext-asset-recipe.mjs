#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..'), context = {};
new vm.Script(readFileSync(resolve(root, 'editor/vnext-asset-recipe.js'), 'utf8')).runInNewContext(context);
const recipe = context.EditorVNextAssetRecipe;
assert.deepEqual(Object.keys(recipe.palettes), ['pico8', 'nes', 'gb', 'vga']);
assert.equal(JSON.stringify(recipe.normalize({ width: 32.2, pixelDiv: 0, palette: 'nope', quant: 500, bgTolerance: -2 })), JSON.stringify({ width:32, height:0, pixelDiv:1, palette:'none', quant:8, bgTolerance:0 }));
const image = { width: 16, height: 9 };
assert.equal(recipe.apply(image, {}), image, '无处理配方时不得创建额外画布');
console.log('✓ vNext Asset Recipe：配方归一化、色板声明与无处理快速路径合同通过');
