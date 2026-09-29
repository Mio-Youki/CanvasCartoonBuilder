#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context={console};context.globalThis=context;vm.createContext(context);
for(const file of ['editor/particle-registry.js','editor/vnext-particle-state.js','editor/vnext-structure-state.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
const state=context.EditorVNextParticleState,structure=context.EditorVNextStructureState;
const scene={width:320,height:180,entities:[{id:'photo',name:'照片',type:'image',x:0,y:0,w:20,h:10,assetId:'asset'}],timeline:{tracks:{}}};
const linked=state.create(scene,{sourceId:'photo',presetId:'snow'});
assert.equal(linked.type,'particle-emitter');assert.equal(linked.particle.sourceId,'photo');assert.equal(linked.particle.sourceOwned,false);assert.equal(linked.particle.direction,90);
state.set(scene,linked.id,'count',999);assert.equal(linked.particle.count,600);
state.applyPreset(scene,linked.id,'rain',true);const owned=linked.particle.sourceId;assert.equal(linked.particle.sourceOwned,true);assert.equal(linked.particle.direction,90);assert.ok(scene.entities.find(item=>item.id===owned)?.particleSourceOnly);
state.setSource(scene,linked.id,'photo');assert.equal(linked.particle.sourceId,'photo');assert.equal(scene.entities.some(item=>item.id===owned),false,'replacing an owned preset source must remove the orphan');
const standalone=state.create(scene,{presetId:'dust'});const standaloneSource=standalone.particle.sourceId;assert.ok(scene.entities.find(item=>item.id===standaloneSource)?.particleSourceOnly);
structure.remove(scene,[standalone.id]);assert.equal(scene.entities.some(item=>item.id===standaloneSource),false,'deleting an emitter must cascade its private preset source');
console.log('vNext particle state verified');
