import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
new vm.Script(readFileSync(resolve(root,'editor/vnext-derived-asset-run-state.js'),'utf8'),{filename:'vnext-derived-asset-run-state.js'}).runInNewContext(sandbox);
const api=sandbox.EditorVNextDerivedAssetRunState;
let run=api.create({id:'mountain-layers',mode:'layering',source:{assetId:'photo',referenceId:'reference-photo'},originalIntent:'把人物、山脊和天空拆成可移动图层',cards:[
  {id:'hiker',target:'人物',roi:{x:.4,y:.25,w:.15,h:.6}},
  {id:'ridge',target:'近景山脊',roi:{x:0,y:.35,w:1,h:.45},occlusionRepair:true},
  {id:'sky',target:'天空',roi:{x:0,y:0,w:1,h:.55},occlusionRepair:true},
  {id:'residual',kind:'residual-background',target:'背景',occlusionRepair:true}
]});
assert.equal(run.cards[0].target,'人物');assert.equal(run.cards[3].roi,null);
run=api.editCard(run,'sky',{target:'云层与天空'});assert.equal(run.cards[2].target,'云层与天空');assert.equal(run.cards[2].userEdited,true);
run=api.markEdge(run,'hiker','mask-approved');run=api.markEdge(run,'ridge','mask-approved');run=api.markEdge(run,'sky','mask-approved');
assert.equal(run.phase,'repair-review');assert.equal(api.canRepair(run),true);
run=api.candidateSet(run,'sky',[{id:'sky-a',preview:'data:image/png;base64,AA=='},{id:'sky-b',preview:'data:image/png;base64,BB=='},{id:'sky-c',preview:'data:image/png;base64,CC=='}]);
run=api.chooseCandidate(run,'sky','sky-c');assert.equal(run.candidateGroups.sky.selectedId,'sky-c');
assert.throws(()=>api.reorder(run,['hiker','sky']),/重排/);
console.log('✓ v4 派生素材 Run：四字段任务卡、两轮边缘审阅与三候选选择合同通过');
