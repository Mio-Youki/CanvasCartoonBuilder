#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { extractLegacyDefaultSnapshot } from '../scripts/extract-legacy-default-snapshot.mjs';
import { buildHomeSceneModuleBaseline } from '../scripts/build-home-scene-module-baseline.mjs';

const root=resolve(import.meta.dirname,'..'),snapshot=extractLegacyDefaultSnapshot(readFileSync(resolve(root,'home-scene.js'),'utf8')),result=buildHomeSceneModuleBaseline(snapshot),scene=result.candidate;
assert.equal(result.saveable,true);assert.equal(scene.entities[0].type,'procedural');assert.equal(scene.modules['home-scene-full'].manifest.id,'home-scene-full');
const calls=[],context={save(){},restore(){},clearRect(){},fillRect(){calls.push('rect');},strokeRect(){},beginPath(){},rect(){},ellipse(){},arc(){},quadraticCurveTo(){},clip(){},fill(){calls.push('fill');},stroke(){},moveTo(){},lineTo(){},closePath(){},translate(){},rotate(){},scale(){},transform(){},setTransform(){},drawImage(){},fillText(){},measureText(value){return{width:String(value).length*8};},globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'#000',strokeStyle:'#000',lineWidth:0},canvas={width:0,height:0,getContext(){return context;}},sandbox={};
new vm.Script(readFileSync(resolve(root,'home-scene-vnext.js'),'utf8'),{filename:'home-scene-vnext.js'}).runInNewContext(sandbox);
const runtime=sandbox.ToSampoolRuntimeVNext;
assert.throws(()=>runtime.createRuntime(scene),/未注册|未信任/,'Module Scene 在显式信任前不得自动执行');
new vm.Script(readFileSync(resolve(root,'examples','modules','home-scene-full-module.js'),'utf8'),{filename:'home-scene-full-module.js'}).runInNewContext(sandbox);
const player=runtime.createRuntime(scene);
for(const time of [0,12,24,36,47.9]){calls.length=0;const stats=player.renderTo(canvas,time);assert.equal(stats.directObjects,1);assert.ok(calls.length>20,`完整 Module 在 ${time}s 必须绘制完整场景`);}
assert.equal(Array.from(runtime.modules.sceneModules.definition('home-scene-full',1).manifest.parameters,item=>item.key).join(','),'motionScale,windowLight,fogOpacity,scene,seed','完整 Module 只应暴露有限而有意义的控制参数');
console.log('✓ home-scene Module 基线：显式信任、完整绘制、固定时间与有限公开参数通过');
