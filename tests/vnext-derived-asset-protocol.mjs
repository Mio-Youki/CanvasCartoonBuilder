import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
new vm.Script(readFileSync(resolve(root,'editor/vnext-derived-asset-protocol.js'),'utf8'),{filename:'vnext-derived-asset-protocol.js'}).runInNewContext(sandbox);
const api=sandbox.EditorVNextDerivedAssetProtocol,source={assetId:'karsten-source',dataUrl:'data:image/png;base64,AA=='};
const derivePlan=api.plan({summary:'先分离徒步者，再由用户审阅边缘。',sources:[{id:'source-photo',assetId:'karsten-source'}],tasks:[{id:'hiker-cutout',sourceReferenceId:'source-photo',kind:'semantic-cutout',semantic:'red jacket hiker',roi:{x:.2,y:.1,w:.3,h:.6},occlusionRepair:true}]});
assert.equal(derivePlan.tasks[0].frameCount,1);assert.equal(derivePlan.tasks[0].roi.w,.3);assert.equal(derivePlan.tasks[0].occlusionRepair,true);assert.throws(()=>api.plan({summary:'缺少源图',sources:[],tasks:[{sourceReferenceId:'missing',kind:'semantic-cutout',semantic:'hiker'}]}),/source 参考图/);
const cutout=api.task({id:'hiker-cutout',kind:'semantic-cutout',semantic:'red jacket hiker',source});
assert.equal(cutout.frameCount,1);assert.throws(()=>api.task({kind:'semantic-cutout',semantic:'hiker',source:{assetId:'missing'}}),/冻结的图片参考/);
const pose=api.task({id:'hiker-walk',kind:'pose-sequence',semantic:'red jacket hiker',source,frameCount:2});
const frame='data:image/png;base64,AA==';
const output=api.result({format:'tosampool-derived-asset/v1',taskId:'hiker-walk',asset:{id:'hiker-walk-poses',width:64,height:96,frames:[{locator:frame,mime:'image/png'},{locator:frame,mime:'image/png'}],fps:2,derivation:{kind:'pose-sequence',semantic:'red jacket hiker',alpha:true,method:'fixture',frameSemantics:['left','right']}}},pose);
assert.equal(output.asset.frames.length,2);assert.equal(output.asset.derivation.anchor.y,1);
assert.throws(()=>api.result({format:'tosampool-derived-asset/v1',taskId:'hiker-walk',asset:{width:64,height:96,frames:[{locator:frame}],derivation:{kind:'pose-sequence',semantic:'red jacket hiker',alpha:true}}},pose),/返回 2 帧/);
console.log('✓ v4 派生素材协议：冻结输入、透明分层与姿态序列合同通过');
