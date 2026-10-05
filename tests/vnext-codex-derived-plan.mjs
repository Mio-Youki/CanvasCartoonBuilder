import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
for(const file of ['editor/vnext-derived-asset-protocol.js','editor/vnext-codex-derived-plan.js']){
  new vm.Script(readFileSync(resolve(root,file),'utf8'),{filename:file}).runInNewContext(sandbox);
}
const api=sandbox.EditorVNextCodexDerivedPlan;
const input={phase:'derive-plan',workflow:'asset-derive',mode:'layering',intent:{subject:'分离红衣徒步者、山脊和天空'},references:[{id:'reference-photo',assetId:'karsten',name:'山谷照片',role:'source',width:1200,height:800}]};
const request=api.request(input);
assert.equal(request.mode,'layering');assert.equal(request.sources[0].id,'reference-photo');assert.match(api.prompt(input),/只返回可编辑的计划/);
const result=api.response({plan:{format:'tosampool-derived-asset-plan/v1',summary:'先审阅三层，再进入 Alpha 和修补。',tasks:[
  {id:'hiker',sourceReferenceId:'reference-photo',kind:'semantic-cutout',semantic:'红衣徒步者',roi:{x:.42,y:.36,w:.11,h:.35},occlusionRepair:false},
  {id:'ridge',sourceReferenceId:'reference-photo',kind:'semantic-cutout',semantic:'近景山脊',roi:{x:.05,y:.25,w:.9,h:.7},occlusionRepair:true},
  {id:'sky',sourceReferenceId:'reference-photo',kind:'semantic-cutout',semantic:'天空',roi:{x:0,y:0,w:1,h:.52},occlusionRepair:true}
] }},input);
assert.equal(result.plan.tasks.length,3);assert.equal(result.plan.tasks[2].occlusionRepair,true);
assert.throws(()=>api.request(Object.assign({},input,{references:[]})),/源图/);
console.log('✓ Codex 派生规划合同：冻结输入、规划提示与结构化任务卡通过');
