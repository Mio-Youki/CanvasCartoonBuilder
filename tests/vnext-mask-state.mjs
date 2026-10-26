#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),context={},source=path=>readFileSync(resolve(root,path),'utf8');
for(const file of ['editor/effect-registry-vnext.js','editor/vnext-inspector-model.js','editor/vnext-effect-state.js','editor/vnext-mask-state.js'])new vm.Script(source(file),{filename:file}).runInNewContext(context);
const state=context.EditorVNextMaskState,scene={width:64,height:32,assets:{alpha:{locator:'mask.png'}},entities:[{id:'owner',type:'rect',x:4,y:5,w:20,h:10},{id:'source',type:'ellipse',x:8,y:6,w:12,h:8},{id:'group',type:'group'},{id:'child',type:'rect',parentId:'group'},{id:'emitter',type:'particle-emitter',x:3,y:4,w:40,h:18,particle:{}}],sceneEffects:{overlay:{},sample:{},outputGrain:{}},timeline:{tracks:{}}};
assert.deepEqual(JSON.parse(JSON.stringify(state.defaults(scene,{scope:'object',ownerId:'owner'},'rect'))),{type:'rect',x:4,y:5,w:20,h:10,invert:false,follow:false});
state.set(scene,{scope:'object',ownerId:'owner'},{type:'poly',points:[[4,5],[24,5],[24,15],[4,15]]});
assert.deepEqual(JSON.parse(JSON.stringify(state.bounds(state.current(scene,{scope:'object',ownerId:'owner'})))),{x:4,y:5,w:20,h:10});
state.setBounds(scene,{scope:'object',ownerId:'owner'},{x:10,y:12,w:40,h:20});
assert.deepEqual(JSON.parse(JSON.stringify(state.bounds(state.current(scene,{scope:'object',ownerId:'owner'})))),{x:10,y:12,w:40,h:20},'多边形范围写入应等比重映射顶点');
state.setFollow(scene,{scope:'object',ownerId:'owner'},true,[1,0,0,1,4,5]);
assert.equal(scene.entities[0].effects.mask.follow,true);assert.deepEqual(Array.from(scene.entities[0].effects.mask.followMatrix),[1,0,0,1,4,5]);
state.setFollow(scene,{scope:'object',ownerId:'owner'},false);assert.equal(scene.entities[0].effects.mask.follow,false);assert.equal(scene.entities[0].effects.mask.followMatrix,undefined);
state.set(scene,{scope:'object',ownerId:'owner'},{type:'alpha',assetId:'alpha',x:4,y:5,w:20,h:10,mode:'luma'});assert.equal(scene.entities[0].effects.mask.mode,'luma');assert.throws(()=>state.set(scene,{scope:'object',ownerId:'owner'},{type:'alpha',assetId:'missing'}),/素材不存在/);
state.set(scene,{scope:'object',ownerId:'owner'},{type:'element',targetId:'source'});assert.deepEqual(JSON.parse(JSON.stringify(scene.entities[0].effects.mask)),{type:'element',targetId:'source',mode:'alpha',showSource:false,invert:false});assert.throws(()=>state.set(scene,{scope:'object',ownerId:'owner'},{type:'element',targetId:'owner'}),/不能引用自身/);
state.set(scene,{scope:'scene',effectId:'tint-overlay'},{type:'element',targetId:'group',invert:true});assert.equal(scene.sceneEffects.overlay['tint-overlay'].enabled,true);assert.equal(scene.sceneEffects.overlay['tint-overlay'].mask.targetId,'group');assert.equal(state.current(scene,{scope:'scene',effectId:'tint-overlay'}).invert,true);
assert.equal(state.clear(scene,{scope:'scene',effectId:'tint-overlay'}),true);assert.equal(scene.sceneEffects.overlay['tint-overlay'].mask,null);assert.equal(state.clear(scene,{scope:'scene',effectId:'tint-overlay'}),false);
const emission={scope:'particle-emission',ownerId:'emitter'},motion={scope:'particle-motion',ownerId:'emitter'};
assert.deepEqual(JSON.parse(JSON.stringify(state.defaults(scene,emission,'rect'))),{type:'rect',x:0,y:0,w:40,h:18,invert:false,follow:true,followMatrix:[1,0,0,1,0,0]},'粒子范围通过统一跟随矩阵表达初始本地范围');
state.set(scene,emission,{type:'ellipse',x:4,y:2,w:20,h:10});assert.equal(scene.entities.at(-1).particle.emissionRange.type,'ellipse');assert.equal(scene.entities.at(-1).particle.emissionRange.follow,true);
state.set(scene,motion,{type:'poly',points:[[0,0],[40,0],[20,18]]});assert.equal(state.current(scene,motion).type,'poly');assert.equal(state.clear(scene,motion),true);assert.equal(scene.entities.at(-1).particle.motionRange,undefined);
state.set(scene,emission,{type:'alpha',assetId:'alpha',mode:'luma'});assert.equal(state.current(scene,emission).mode,'luma');state.setFollow(scene,emission,false,[1,0,0,1,3,4]);assert.equal(state.current(scene,emission).follow,false);assert.deepEqual(Array.from(state.current(scene,emission).geometryMatrix),[1,0,0,1,3,4]);
console.log('✓ vNext Mask State：对象/场景/粒子范围共用几何类型、素材/元素引用、固定仅作蒙版与清理合同通过');
