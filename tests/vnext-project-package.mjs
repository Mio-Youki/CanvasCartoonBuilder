#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),context={TextEncoder,TextDecoder,Buffer};
for(const path of ['editor/vnext-scene.js','editor/vnext-project-package.js'])new vm.Script(readFileSync(resolve(root,path),'utf8'),{filename:path}).runInNewContext(context);
const scene=context.EditorVNextScene.blank({width:32,height:16});
scene.assets={sky:{locator:'data:text/plain,sky',mime:'text/plain',width:8,height:8,recipe:{width:4}},loop:{locator:'data:text/plain,one',mime:'text/plain',width:4,height:4,frames:[{locator:'data:text/plain,one',mime:'text/plain'},{locator:'data:text/plain,two',mime:'text/plain'}],fps:2,sourceAssetId:'sky',derivation:{kind:'pose-sequence',semantic:'two walker poses',alpha:true,anchor:{x:.5,y:1}}},unused:{locator:'data:text/plain,keep',mime:'text/plain',width:1,height:1}};
scene.entities=[{id:'image',type:'image',assetId:'sky'},{id:'module',type:'procedural',moduleId:'test-cabin',moduleVersion:1,params:{}}];scene.background.layers=[{id:'layer',assetId:'loop'}];scene.modules={'test-cabin':{source:'data:text/javascript,window.testCabin%3Dtrue',manifest:{format:'tosampool-scene-module/v1',id:'test-cabin',version:1,assets:['sky'],parameters:[]}}};
const packageResult=await context.EditorVNextProjectPackage.build(scene,{projectId:'p-test',displayName:'Project Test'});
assert.equal(packageResult.project.format,'tosampool-project/v1');assert.equal(packageResult.files[0].path,'project.tosampool.json');assert.equal(packageResult.manifest.assets.length,3);assert.deepEqual([...packageResult.unused],['unused']);
assert.match(packageResult.project.scene.assets.sky.locator,/assets\/sky\/source\/0000\.bin/);assert.equal(packageResult.project.scene.assets.loop.frames.length,2);
assert.equal(packageResult.project.scene.assets.loop.derivation.kind,'pose-sequence');const loopRecord=JSON.parse(packageResult.files.find(file=>file.path==='assets/loop/asset.json').data);assert.equal(loopRecord.sourceAssetId,'sky');assert.equal(loopRecord.derivation.anchor.y,1);
assert.ok(packageResult.files.some(file=>file.path==='modules/test-cabin.scene.module.js'));assert.ok(packageResult.manifest.modules.some(module=>module.id==='test-cabin'));
const restored=await context.EditorVNextProjectPackage.restore(packageResult.files);assert.equal(restored.project.projectId,'p-test');assert.match(restored.scene.assets.sky.locator,/^data:text\/plain;base64,/);assert.equal(restored.scene.assets.loop.frames.length,2);assert.equal(restored.scene.assets.loop.derivation.kind,'pose-sequence');assert.match(restored.scene.modules['test-cabin'].locator,/^data:text\/javascript;base64,/);assert.equal(restored.scene.modules['test-cabin'].manifest.id,'test-cabin');assert.deepEqual([...context.EditorVNextProjectPackage.unused(restored.scene)],['unused']);
console.log('✓ v4 Project Package：素材、配方、序列、未使用素材、程序模块与显式恢复合同通过');
