#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url),layout=require(resolve(import.meta.dirname,'../editor/sprite-sheet-layout.js'));

const grid=layout.grid({width:64,height:32,columns:4,rows:2});
assert.equal(grid.frames.length,8);assert.deepEqual(grid.frames[5],{x:16,y:16,w:16,h:16});
const atlas=layout.atlas({frames:{a:{frame:{x:0,y:0,w:8,h:8},duration:80},b:{frame:{x:8,y:0,w:8,h:8},duration:120}},meta:{frameTags:[{name:'idle',from:0,to:1}]}},{width:16,height:8});
assert.equal(atlas.frames.length,2);assert.equal(atlas.clips[0].name,'idle');assert.equal(layout.averageFps(atlas,8),10);
assert.throws(()=>layout.atlas({frames:[{frame:{x:0,y:0,w:8,h:8},rotated:true}]},{width:8,height:8}),/旋转帧/);
console.log('✓ Sprite Sheet Layout：手动网格 / JSON 图集归一化与安全拒绝通过');
