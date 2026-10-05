#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { extractLegacyDefaultSnapshot } from '../scripts/extract-legacy-default-snapshot.mjs';
import { buildHomeSceneLayeredModule } from '../scripts/build-home-scene-layered-module.mjs';

const root=resolve(import.meta.dirname,'..'),snapshot=extractLegacyDefaultSnapshot(readFileSync(resolve(root,'home-scene.js'),'utf8')),result=buildHomeSceneLayeredModule(snapshot),scene=result.candidate;
assert.equal(result.saveable,true,'语义 Module 候选必须可保存');
assert.equal(scene.entities.length,12,'语义 Module 必须分为可独立处理的场景部件');
assert.ok(scene.entities.every(item=>item.type==='procedural'&&item.moduleId==='home-scene-layer'),'每个语义层必须仍是同一个可信项目 Module 的普通 v4 对象');
assert.deepEqual(scene.entities.find(item=>item.id==='home-train').params.layer,'train');
assert.deepEqual(Object.keys(scene.entities.find(item=>item.id==='home-clouds').params).sort(),['layer','motionScale'],'云层工程数据不得携带列车或雾层的无关参数');
assert.deepEqual(Object.keys(scene.entities.find(item=>item.id==='home-train').params).sort(),['layer','motionScale','windowLight'],'列车工程数据只保存其有效公开参数');
assert.deepEqual(Object.keys(scene.entities.find(item=>item.id==='home-fog').params).sort(),['fogOpacity','layer','motionScale'],'雾层工程数据只保存其有效公开参数');
const moonTrack=scene.timeline.tracks['home-moon'],moonVisibility=scene.timeline.visibility['home-moon'];
assert.equal(moonTrack.segments.length,4,'月亮必须预写四段参数时序');
assert.deepEqual(moonTrack.segments.map(segment=>[segment.values.x,segment.values.y]),[[244,8],[244,8],[244,14],[59,8]],'月亮四段位置必须来自可编辑 v4 时序');
assert.deepEqual(moonVisibility.segments.map(segment=>segment.visible),[true,false,true,true],'月亮第二 Scene 必须以显示时段隐藏，而不是藏在 Module 内部逻辑');
const calls=[],context={save(){},restore(){},clearRect(){},fillRect(){calls.push(this.fillStyle);},strokeRect(){},beginPath(){},rect(){},ellipse(){},arc(){},quadraticCurveTo(){},clip(){},fill(){calls.push('fill');},stroke(){},moveTo(){},lineTo(){},closePath(){},translate(){},rotate(){},scale(){},transform(){},setTransform(){},drawImage(){},fillText(){},measureText(value){return{width:String(value).length*8};},globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'#000',strokeStyle:'#000',lineWidth:0},canvas={width:0,height:0,getContext(){return context;}},sandbox={};
new vm.Script(readFileSync(resolve(root,'home-scene-vnext.js'),'utf8'),{filename:'home-scene-vnext.js'}).runInNewContext(sandbox);
const runtime=sandbox.ToSampoolRuntimeVNext;
assert.throws(()=>runtime.createRuntime(scene),/未注册|未信任/,'语义 Module 在显式信任前不得执行');
new vm.Script(readFileSync(resolve(root,'examples','modules','home-scene-layered-module.js'),'utf8'),{filename:'home-scene-layered-module.js'}).runInNewContext(sandbox);
const definition=runtime.modules.sceneModules.definition('home-scene-layer',1),params=definition.manifest.parameters;
assert.ok(params.find(item=>item.key==='layer').internal&&params.find(item=>item.key==='scene').internal,'语义身份与自动 Scene 选择必须是内部参数');
assert.equal(params.find(item=>item.key==='windowLight').appliesTo.layer.join(','),'train','列车窗灯只应出现在列车层');
assert.equal(params.find(item=>item.key==='fogOpacity').appliesTo.layer.join(','),'fog','雾浓度只应出现在雾层');
const player=runtime.createRuntime(scene);
for(const time of [0,12,24,36,47.9]){calls.length=0;const stats=player.renderTo(canvas,time);assert.equal(stats.directObjects,time>=12&&time<24?11:12,`固定时间 ${time}s 必须遵循月亮显示时段`);assert.ok(calls.length>20,`固定时间 ${time}s 必须保留高密度场景画面`);}
const rebounded=JSON.parse(JSON.stringify(scene));
rebounded.entities=rebounded.entities.filter(item=>item.id==='home-clouds');
rebounded.timeline.scenes=[{id:'scene-1',f:[0,.75]},{id:'scene-2',f:[.75,1]}];
calls.length=0;runtime.createRuntime(rebounded).renderTo(canvas,18);
assert.ok(calls.includes('#182b4c'),'Module 必须采用顶部 Scene 段索引；不得按内部固定 48 秒绝对时间自行跳段');
console.log('✓ home-scene 语义 Module：12 个独立 v4 语义对象、月亮时序、显式信任与固定时间绘制通过');
