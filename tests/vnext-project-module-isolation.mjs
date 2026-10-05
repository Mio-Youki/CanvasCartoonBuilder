#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
new vm.Script(readFileSync(resolve(root,'home-scene-vnext.js'),'utf8'),{filename:'home-scene-vnext.js'}).runInNewContext(sandbox);
const runtime=sandbox.ToSampoolRuntimeVNext,registry=runtime.modules.sceneModules;
const manifest={format:'tosampool-scene-module/v1',id:'same-module-id',version:1,parameters:[]};
registry.withScope('project:A',()=>registry.register({manifest,render({ctx,width,height}){ctx.fillStyle='#aa1100';ctx.fillRect(-width/2,-height/2,width,height);}}));
registry.withScope('project:B',()=>registry.register({manifest,render({ctx,width,height}){ctx.fillStyle='#0011aa';ctx.fillRect(-width/2,-height/2,width,height);}}));
const paints=[],context={canvas:null,save(){},restore(){},clearRect(){},fillRect(){paints.push(this.fillStyle);},strokeRect(){},beginPath(){},rect(){},ellipse(){},arc(){},quadraticCurveTo(){},clip(){},fill(){},stroke(){},moveTo(){},lineTo(){},closePath(){},translate(){},rotate(){},scale(){},transform(){},setTransform(){},drawImage(){},fillText(){},measureText(){return{width:8};},globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'#000000',strokeStyle:'#000000',lineWidth:0},canvas={width:0,height:0,getContext(){return context;}};context.canvas=canvas;
const scene=(scope,id)=>({format:'tosampool-scene/v4',_moduleScope:scope,width:8,height:6,loop:1,assets:{},entities:[{id:'object',type:'procedural',moduleId:'same-module-id',moduleVersion:1,params:{},x:0,y:0,w:8,h:6}],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{}}});
const playerA=runtime.createRuntime(scene('project:A','A')),playerB=runtime.createRuntime(scene('project:B','B'));
paints.length=0;playerA.renderTo(canvas,.25);assert.ok(paints.includes('#aa1100'),'Player A 必须使用项目 A 的同名 Module');
paints.length=0;playerB.renderTo(canvas,.25);assert.ok(paints.includes('#0011aa'),'Player B 必须使用项目 B 的同名 Module');
paints.length=0;playerA.renderTo(canvas,.75);assert.ok(paints.includes('#aa1100')&&!paints.includes('#0011aa'),'创建或渲染 Player B 后不得污染仍存活的 Player A');
console.log('✓ v4 项目 Module 隔离：同页双 Player、同名 Module 与连续渲染互不污染通过');
