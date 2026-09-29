#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),context={};
new vm.Script(readFileSync(resolve(root,'editor/vnext-parts-state.js'),'utf8')).runInNewContext(context);
const state=context.EditorVNextPartsState;
const scene={entities:[{id:'shape',name:'标牌',type:'rect',x:10,y:20,w:40,h:20,scaleX:1,scaleY:1,rot:0,fill:'#ffcc00',stroke:'#111111',strokeWidth:2,radius:4},{id:'photo',type:'image',x:0,y:0,w:64,h:32,assetId:'photo'},{id:'caption',type:'text',x:0,y:0,w:64,h:16,text:'text'},{id:'cloud',type:'builtin',x:0,y:0,w:64,h:32,builtin:{id:'pixel-cloud',version:1,params:{}}}]};
const vector=state.promote(scene,'shape');
assert.equal(vector.type,'vector');assert.equal(vector.parts.length,1);assert.equal(vector.parts[0].fill,'#ffcc00');assert.equal(vector.parts[0].radius,4);assert.equal(vector.fill,undefined);
const firstId=vector.parts[0].id;
const added=state.add(scene,{ownerId:'shape',part:{id:firstId,type:'ellipse',x:10,y:5,w:12,h:12,fill:'#ffffff'},normalize:false});
assert.notEqual(added.id,firstId,'part id must remain unique inside one owner');
state.reorder(scene,{ownerId:'shape',partId:added.id,toIndex:0});assert.equal(vector.parts[0].id,added.id);
state.remove(scene,{ownerId:'shape',partId:added.id,normalize:false});assert.equal(vector.parts.length,1);assert.equal(vector.parts[0].id,firstId);
const front=state.add(scene,{ownerId:'shape',part:{id:'front',type:'rect',x:2,y:2,w:4,h:4},normalize:false}),middle=state.add(scene,{ownerId:'shape',part:{id:'middle',type:'rect',x:3,y:3,w:4,h:4},normalize:false});state.reorderRelative(scene,{ownerId:'shape',partId:firstId,targetId:middle.id,mode:'before'});assert.deepEqual(Array.from(vector.parts.map(item=>item.id)),[front.id,middle.id,firstId],'tree foreground-before order must map to later array draw order');state.remove(scene,{ownerId:'shape',partId:front.id,normalize:false});state.remove(scene,{ownerId:'shape',partId:middle.id,normalize:false});
const photoPart=state.add(scene,{ownerId:'photo',part:{type:'line',x:2,y:3,x2:20,y2:12,stroke:'#ffffff',strokeWidth:2}});assert.equal(scene.entities[1].type,'image');assert.equal(photoPart.type,'line');
assert.equal(state.add(scene,{ownerId:'caption',part:{type:'rect',x:1,y:1,w:4,h:4}}).type,'rect','text supports an editable overlay part');
assert.equal(state.add(scene,{ownerId:'cloud',part:{type:'ellipse',x:1,y:1,w:4,h:4}}).type,'ellipse','builtins support an editable overlay part');
const textured=state.normalizePart({type:'rect',w:12,h:8,fill:'#220033',fillAlpha:2,strokeAlpha:-1,fillPattern:{type:'dots',opacity:.4,size:0,gap:-2,phase:2,sides:12,roundness:2,layout:'stagger'}},[]);assert.equal(textured.fillAlpha,1);assert.equal(textured.strokeAlpha,0);assert.equal(textured.fillPattern.type,'dots');assert.equal(textured.fillPattern.size,1);assert.equal(textured.fillPattern.gap,0);assert.equal(textured.fillPattern.spacing,1);assert.equal(textured.fillPattern.phase,1);assert.equal(textured.fillPattern.sides,6);assert.equal(textured.fillPattern.roundness,1);
const lineTexture=state.normalizeTexture({type:'lines',lineMode:'layers',layers:[{angle:20,width:2,gap:4},{angle:110,width:1,spacing:9}]},'#ffffff');assert.equal(lineTexture.lineMode,'layers');assert.deepEqual(JSON.parse(JSON.stringify(lineTexture.layers.map(item=>[item.width,item.spacing,item.gap]))),[[2,6,4],[1,9,8]],'格距是周期；旧 gap 只作为兼容输入');
assert.deepEqual(JSON.parse(JSON.stringify(state.defaultTexture('checker','#ff00ff'))),{type:'checker',mode:'replace',opacity:1,color:'#ff00ff',size:3,gap:2,phase:.5,angle:0,layout:'checker'});
const before={w:vector.w,h:vector.h};state.add(scene,{ownerId:'shape',part:{type:'rect',x:-10,y:-5,w:8,h:6,fill:'#00ff00'}});assert.ok(vector.w>before.w&&vector.h>before.h);assert.ok(vector.parts.every(item=>item.type==='line'||(item.x>=0&&item.y>=0)));
assert.throws(()=>state.promote(scene,'photo'),/不能提升/);
console.log('✓ vNext Parts State：单图形提升、稳定 id、图片覆盖层、增删调序与边界归一化合同通过');
