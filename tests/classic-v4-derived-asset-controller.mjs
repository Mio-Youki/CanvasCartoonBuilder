import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
for(const path of ['editor/vnext-derived-asset-protocol.js','editor/vnext-asset-state.js','editor/classic-v4-derived-asset-controller.js'])new vm.Script(readFileSync(resolve(root,path),'utf8'),{filename:path}).runInNewContext(sandbox);
const scene={width:160,height:90,assets:{photo:{locator:'data:image/png;base64,AA==',width:16,height:16}},entities:[]};
const workspace={requireDocument:()=>scene},changes={run:(_label,mutate)=>mutate(scene)};
const frame='data:image/png;base64,AA==';
const controller=sandbox.EditorClassicV4DerivedAssetController.create({workspace,changes,referenceSource:async()=>({assetId:'photo',dataUrl:frame}),adapter:{derive:async task=>({format:'tosampool-derived-asset/v1',taskId:task.id,asset:{id:'walker',name:'徒步者二帧',width:8,height:12,frames:[{locator:frame,mime:'image/png'},{locator:frame,mime:'image/png'}],fps:2,derivation:{kind:'pose-sequence',semantic:'red hiker',alpha:true,frameSemantics:['left','right']}}})}});
const review=await controller.request({kind:'pose-sequence',semantic:'red hiker',frameCount:2});
assert.equal(review.format,'tosampool-derived-asset-review/v1');assert.equal(scene.assets.walker,undefined,'候选生成前不得写入素材栏');
const result=controller.accept(review);
assert.equal(result.assetId,'walker');assert.equal(scene.assets.walker.frames.length,2);assert.equal(scene.assets.walker.sourceAssetId,'photo');assert.equal(scene.assets.walker.derivation.anchor.y,1);
console.log('✓ v4 派生素材控制器：候选先审阅、接受后才作为一条可撤销变更写入素材栏');
