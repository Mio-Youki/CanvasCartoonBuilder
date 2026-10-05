#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { validateVNextScene } from '../scripts/validate-scene-vnext.mjs';

const root=resolve(import.meta.dirname,'..'),sandbox={};new vm.Script(readFileSync(resolve(root,'editor/legacy-v4-converter.js'),'utf8')).runInNewContext(sandbox);const converter=sandbox.EditorLegacyV4Converter;
const legacy={w:320,h:180,loop:12,bg:['#112233','#221100'],scenes:['昼','夜'],sceneBorders:[6],images:[{id:'photo',src:'assets/photo.png',x:[0,4],y:0,w:320,h:180,show:[[[0,1]],null]},{id:'shape',x:10,y:20,parts:[{type:'rect',x:0,y:0,w:12,h:8,fill:'#ffffff'}]}],lamp:{id:'lamp',kind:'builtin',builtin:'train-beam',x:12,y:10,w:60,h:20,beamLen:50},agentProgram:{id:'agent-program',program:{code:'ctx.fillRect(0,0,10,10)'}},fx:{layers:[{id:'old-fx'}]}};
let result=converter.convert(legacy);
assert.equal(result.saveable,false);assert.equal(result.report.version,2);assert.equal(result.report.summary.converted,3);assert.equal(result.report.summary.builtin,1);assert.ok(result.report.items.some(item=>item.sourceId==='background.color'&&item.status==='converted'));assert.ok(result.report.items.some(item=>item.sourceId==='agentProgram'&&item.status==='module-required'));assert.ok(result.report.items.some(item=>item.sourceId==='fx.layers'&&item.status==='manual'));assert.equal(result.document.entities.find(item=>item.id==='photo').type,'image');assert.equal(result.document.entities.find(item=>item.id==='lamp').builtin.id,'train-beam');assert.equal(result.document.timeline.tracks.photo.segments[1].values.x,4);assert.equal(result.document.timeline.visibility.photo.segments.some(item=>item.visible===false),true);assert.equal(validateVNextScene(result.document).valid,true,'即使报告仍有未解决迁移项，已转换的声明式子集也必须是有效 v4 文档');
result=converter.convert(legacy,{freezes:{agentProgram:{locator:'assets/agent-program.png',w:10,h:10},'fx.layers':{locator:'assets/fx.png'}}});
assert.equal(result.report.items.find(item=>item.sourceId==='agentProgram').status,'frozen');assert.equal(result.saveable,false,'Legacy fx.layers 仍需单独明确处理，不能被一个无对应实体的冻结选项静默吞掉');
const clean=converter.convert({w:64,h:32,loop:2,bg:'#000000',images:[{id:'one',src:'data:image/png;base64,AA==',x:0,y:0,w:8,h:8}],spark:{id:'spark',parts:[{type:'ellipse',x:-2,y:-2,w:4,h:4,fill:'#ffffff'}]}});
assert.equal(clean.saveable,true);assert.equal(clean.report.summary.blocked,0);assert.equal(clean.report.summary['module-required'],0);assert.equal(validateVNextScene(clean.document).valid,true);
console.log('✓ Legacy → v4 Converter：直接转换、Builtin、混合迁移、冻结与未解决状态合同通过');
