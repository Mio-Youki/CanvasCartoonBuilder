#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { extractLegacyDefaultSnapshot } from '../scripts/extract-legacy-default-snapshot.mjs';
import { adaptHomeSceneSnapshot } from '../scripts/adapt-home-scene-native-v4.mjs';

const root=resolve(import.meta.dirname,'..'),snapshot=extractLegacyDefaultSnapshot(readFileSync(resolve(root,'home-scene.js'),'utf8')),result=adaptHomeSceneSnapshot(snapshot),scene=result.candidate;
assert.equal(result.saveable,true,'已审计的 home-scene 必须能完全展开为可保存 v4 Scene');
assert.equal(result.report.candidateValid,true);
assert.equal(result.report.summary.converted,12,'所有已知 home-scene 图层必须具有原生映射记录');
assert.equal(scene.timeline.scenes.length,4);
assert.equal(scene.entities.some(entity=>entity.type==='procedural'||entity.type==='builtin'),false,'原生映射不得暗中依赖 Module 或 Builtin');
assert.ok(scene.entities.length<25&&scene.entities.length>=12,'同一语义的 Scene 变体必须合并，基础层与动态层仍须保留为可编辑对象');
const moon=scene.entities.find(entity=>entity.id==='home-moon');
assert.ok(moon&&moon.parts.length===5,'月亮必须直接成为普通 vector');
assert.equal(scene.timeline.tracks['home-moon'].segments[3].values.x,59,'归一化 parts 的 Scene X 轨道必须保持画面位置');
const train=scene.entities.find(entity=>entity.id==='home-train');
assert.equal(train.anim.bob.period,1/3,'列车二态 bob 必须匹配 Legacy 的六次每秒翻转');
assert.equal(train.parts.find(part=>part.anim&&part.anim.blink).anim.blink.mode,'gate','旧窗灯占空闪烁必须成为 v4 原语');
const signal=scene.entities.find(entity=>entity.id==='home-signal');
assert.ok(signal.parts.filter(part=>part.anim&&part.anim.blink.mode==='gate').length===2,'信号红绿灯须保持反相 gate 动画');
const forest=scene.entities.find(entity=>entity.id==='home-far-forest');
assert.ok(forest&&forest.anim.scroll.repeat&&forest.sceneVariants.length===4,'树林必须保留普通 scroll/repeat 图元流，并合并四个 Scene 变体');
const trainBeam=scene.entities.find(entity=>entity.id==='home-train-beam');
assert.ok(trainBeam&&trainBeam.sceneVariants.length===4,'列车光束必须成为一个按 Scene 选择的普通 vector');
const calls=[];
const context={save(){},restore(){},clearRect(){},fillRect(){calls.push('rect');},strokeRect(){},beginPath(){},rect(){},ellipse(){},arc(){},quadraticCurveTo(){},clip(){},fill(){calls.push('fill');},stroke(){},moveTo(){},lineTo(){},closePath(){},translate(){},rotate(){},scale(){},transform(){},setTransform(){},drawImage(){},fillText(){},measureText(value){return{width:String(value).length*8};},globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'#000',strokeStyle:'#000',lineWidth:0};
const sandbox={};new vm.Script(readFileSync(resolve(root,'home-scene-vnext.js'),'utf8'),{filename:'home-scene-vnext.js'}).runInNewContext(sandbox);
const player=sandbox.ToSampoolRuntimeVNext.createRuntime(scene),canvas={width:0,height:0,getContext(){return context;}};
for(const time of [0,12,24,36,47.9]){calls.length=0;const stats=player.renderTo(canvas,time);assert.ok(stats.directObjects>0,`固定时间 ${time}s 必须实际绘制原生映射图层`);assert.ok(calls.length>0,`固定时间 ${time}s 必须有绘制指令`);}
console.log('✓ home-scene 原生适配：所有已知层均展开为普通 v4 图元、时序与动画');
