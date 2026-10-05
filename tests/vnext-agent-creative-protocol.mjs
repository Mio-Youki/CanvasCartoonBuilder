import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
new vm.Script(readFileSync(resolve(root,'editor/vnext-agent-creative-protocol.js'),'utf8'),{filename:'vnext-agent-creative-protocol.js'}).runInNewContext(sandbox);
const protocol=sandbox.EditorVNextAgentCreativeProtocol;
const invalid=protocol.validateIntent({subject:'   '});
assert.equal(invalid.valid,false,'空意图必须被拒绝');
const intent=protocol.normalizeIntent({subject:'冬夜的雪花球，木屋发光',output:'loop-scene',control:'semantic',assetPolicy:'agent-ok',dimensions:{width:320.8,height:180.2},loop:12});
assert.equal(intent.format,'tosampool-agent-creative/v1');assert.equal(intent.dimensions.width,321);assert.equal(intent.dimensions.height,180);assert.equal(intent.loop,12);
const candidates=protocol.localDirections(intent);
assert.equal(candidates.length,3,'无 API 时必须仍有三种透明的载体方向');
for(const item of candidates){assert.ok(item.id&&item.title&&item.carrier);assert.ok(item.editable.length);assert.ok(item.budget.tier);assert.equal(item.status,'plan','本地草案不能伪装成已生成 Scene');}
assert.throws(()=>protocol.candidate({id:'bad'}),/方向卡必须包含/,'不完整方向卡不得进入 UI');
assert.ok(protocol.capabilityManifest().rules.some(rule=>/直接改写当前项目/.test(rule)),'协议必须禁止 Agent 直接覆盖当前项目');
assert.equal(protocol.capabilityManifest().derivedAssets.poseSequence,false,'纯浏览器 Agent 默认不可假定能够生成动作帧');
assert.equal(protocol.capabilityManifest({derivedAssets:{semanticCutout:true,poseSequence:true}}).derivedAssets.semanticCutout,true,'宿主必须能显式授予派生素材能力');
const staged=protocol.response({
  reply:'先确认你的控制范围。',
  question:{id:'control',label:'请选择',choices:[{value:'semantic',label:'可改主体'}]},
  candidates:[candidates[0]],
},'intake');
assert.equal(staged.candidates.length,0,'intake 阶段不得提前显示方向卡');
assert.equal(staged.question.id,'control');
const directed=protocol.response({reply:'现在给方向。',question:{id:'control',label:'不应出现',choices:[]},candidates:[candidates[0]]},'directions');
assert.equal(directed.question,null,'directions 阶段不得再提出控制问题');
assert.equal(directed.candidates.length,1,'directions 阶段必须保留结构完整的方向卡');
const baseline={format:'tosampool-scene/v4',width:160,height:90,loop:4,background:{color:'#000'},sceneEffects:{},entities:[{id:'keep',type:'rect',x:0,y:0,w:8,h:8},{id:'edit',type:'rect',x:8,y:0,w:8,h:8}],timeline:{scenes:[{id:'a',f:[0,1]}],tracks:{},visibility:{}}};
const changed=JSON.parse(JSON.stringify(baseline));changed.entities[1].x=12;
const draft=protocol.build({format:'tosampool-agent-build/v2',kind:'scene-draft',title:'雪花球草稿',summary:'临时完整 Scene。',base:{type:'current-scene',sceneRevision:4},scope:{type:'selection',ids:['edit']},changes:['移动小木屋'],preview:{url:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',alt:'草稿'},scene:changed});
assert.equal(draft.scene.width,160,'build 必须保留完整的临时 Scene');
assert.equal(draft.preview.alt,'草稿','build 必须保留安全预览');
assert.equal(protocol.assertApplicable(draft,4),draft);assert.throws(()=>protocol.assertApplicable(draft,5),/revision 4/,'过期 Draft 不得覆盖新工程');assert.equal(protocol.assertScopePreserved(draft,baseline),draft);
const escaped=JSON.parse(JSON.stringify(changed));escaped.entities[0].x=99;assert.throws(()=>protocol.assertScopePreserved(protocol.build({format:protocol.BUILD_FORMAT,kind:'scene-draft',summary:'越界',base:{type:'current-scene',sceneRevision:4},scope:{type:'selection',ids:['edit']},scene:escaped}),baseline),/选择范围外对象/,'选择 Draft 不得改写未选对象');
assert.throws(()=>protocol.build({summary:'错误',scene:{format:'legacy'}}),/完整的 v4 Scene Draft/,'非 v4 build 不得进入预览层');
assert.throws(()=>protocol.build({summary:'错误预览',scene:{format:'tosampool-scene/v4'},preview:{url:'https://untrusted.example/preview.png'}}),/安全图片数据/,'临时预览不得隐式请求远程图片');
console.log('✓ v4 Agent 创作协议：意图归一化、透明本地方向与 Agent 边界通过');
