#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { validateVNextScene } from '../scripts/validate-scene-vnext.mjs';

const root=resolve(import.meta.dirname,'..'),sandbox={};
for(const file of ['00-namespace.js','16-scene-module-registry.js'])new vm.Script(readFileSync(resolve(root,'runtime-src','vnext',file),'utf8'),{filename:file}).runInNewContext(sandbox);
const registry=sandbox.ToSampoolRuntimeVNext.modules.sceneModules;
assert.throws(()=>registry.register({manifest:{id:'bad',version:1},render(){}}),/Manifest/);
let calls=0;
registry.register({manifest:{format:'tosampool-scene-module/v1',id:'test-cabin',version:1,title:'测试小屋',assets:['window'],parameters:[{key:'warmth',type:'number',default:.5,min:0,max:1},{key:'seed',type:'number',default:7,min:0,max:99,integer:true}],timeDependent:true},render({ctx,width,height,params,assets,random}){calls+=1;ctx.fillStyle=params.warmth>.4?'#ffcc66':'#223344';ctx.fillRect(-width/2,-height/2,width,height);assert.equal(assets.window,'window-image');assert.equal(random(3),random(3));}});
const normalized=registry.normalize({type:'procedural',moduleId:'test-cabin',moduleVersion:1,params:{warmth:4,seed:3}});
assert.equal(normalized.moduleId,'test-cabin');assert.equal(normalized.moduleVersion,1);assert.equal(normalized.params.warmth,1);assert.equal(normalized.params.seed,3);assert.equal(registry.timeDependent({type:'procedural',moduleId:'test-cabin',moduleVersion:1,params:{}}),true);
assert.equal(validateVNextScene({format:'tosampool-scene/v4',width:12,height:8,loop:1,assets:{},entities:[{id:'procedural-cabin',type:'procedural',moduleId:'test-cabin',moduleVersion:1,params:{warmth:.7},x:0,y:0,w:12,h:8,scaleX:1,scaleY:1,rot:0,alpha:1}],timeline:{tracks:{}}}).valid,true,'程序构件的声明外形必须可写入 v4 Scene');
const ctx={fillRect(){},fillStyle:''};registry.render(ctx,{type:'procedural',moduleId:'test-cabin',moduleVersion:1,params:{warmth:.7,seed:3}},{moduleId:'test-cabin',moduleVersion:1,params:{warmth:.7,seed:3},w:12,h:8},{time:.25},{assets:{window:'window-image'}});assert.equal(calls,1);
const scopedManifest={format:'tosampool-scene-module/v1',id:'shared-id',version:1,parameters:[]};
registry.withScope('project:a',()=>registry.register({manifest:scopedManifest,render({ctx}){ctx.fillStyle='#aa0000';ctx.fillRect(0,0,1,1);}}));
registry.withScope('project:b',()=>registry.register({manifest:scopedManifest,render({ctx}){ctx.fillStyle='#0000aa';ctx.fillRect(0,0,1,1);}}));
assert.notEqual(registry.definition('shared-id',1,{scope:'project:a'}).render,registry.definition('shared-id',1,{scope:'project:b'}).render,'同名项目 Module 必须按项目作用域隔离');
const colors=[];registry.render({fillStyle:'#000000',fillRect(){colors.push(this.fillStyle);}},{type:'procedural',moduleId:'shared-id',moduleVersion:1,params:{}},{moduleId:'shared-id',moduleVersion:1,params:{},w:1,h:1},{time:0,sceneIndex:0},{moduleScope:'project:a',assets:{}});registry.render({fillStyle:'#000000',fillRect(){colors.push(this.fillStyle);}},{type:'procedural',moduleId:'shared-id',moduleVersion:1,params:{}},{moduleId:'shared-id',moduleVersion:1,params:{},w:1,h:1},{time:0,sceneIndex:0},{moduleScope:'project:b',assets:{}});assert.deepEqual(colors,['#aa0000','#0000aa'],'渲染必须按 Scene 作用域选择同名 Module');
assert.throws(()=>registry.normalize({type:'procedural',moduleId:'unknown',moduleVersion:1}),/未注册/);
console.log('✓ v4 Scene Module Registry：Manifest、参数归一化、声明素材、确定性随机与信任边界通过');
