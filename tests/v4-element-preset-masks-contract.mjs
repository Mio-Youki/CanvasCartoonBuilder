import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';

const ctx=vm.createContext({TextEncoder,TextDecoder,Buffer,crypto:webcrypto});
for(const file of ['home-scene-vnext.js','editor/effect-registry-vnext.js','editor/vnext-scene.js','editor/vnext-mask-state.js','editor/v4-element-references.js','editor/v4-element-presets.js','editor/v4-resource-core.js','editor/vnext-project-package.js','editor/vnext-delivery-builder.js','editor/vnext-asset-loader.js'])new vm.Script(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{filename:file}).runInContext(ctx);
const plain=value=>JSON.parse(JSON.stringify(value)),api=ctx.EditorV4ElementPresets,maskState=ctx.EditorVNextMaskState,core=ctx.EditorV4Resources;
assert.deepEqual(Object.keys(maskState.PORTABLE).sort(),[...maskState.TYPES].sort(),'新增蒙版类型必须声明可移植适配，不能漏掉引用或坐标');
const asset={locator:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#808080"/></svg>'),mime:'image/svg+xml',width:16,height:16};
const inputs=[
  {type:'rect',x:34,y:22,w:24,h:30},
  {type:'ellipse',x:34,y:22,w:24,h:30},
  {type:'poly',points:[[34,22],[58,24],[54,52],[30,48]]},
  {type:'alpha',imageId:'matte',x:34,y:22,w:24,h:30,mode:'luma'}
];
for(const input of inputs)for(const follow of [false,true]){
  const scene=ctx.EditorVNextScene.blank({width:160,height:96});scene.assets={matte:plain(asset)};
  const mask={...plain(input),follow,invert:true,...(follow?{followMatrix:[1.2,.2,-.3,.8,30,20]}:{})};
  scene.entities=[{id:'owner',type:'rect',x:30,y:20,w:48,h:32,rot:15,scaleX:1.2,skewX:8,alpha:.7,anim:{bob:{amount:3,period:2}},fill:'#cc6622',effects:{pipeline:['sample','mask','decorate'],mask}}];
  const old=JSON.stringify(scene),key=api.add(scene,'owner'),preset=scene.elementPresets[key];
  assert.equal(JSON.stringify({...scene,elementPresets:undefined}),old);
  if(input.type==='poly')assert.deepEqual(plain(preset.root.effects.mask.points),[[4,2],[28,4],[24,32],[0,28]]);
  else{assert.equal(preset.root.effects.mask.x,4);assert.equal(preset.root.effects.mask.y,2);}
  if(follow)assert.deepEqual(plain(preset.root.effects.mask.followMatrix),[1.2,.2,-.3,.8,0,0]);
  const bundle=await core.capture(scene,[{kind:'element',id:key}]);
  assert.equal(bundle.entries.filter(e=>e.kind==='image').length,input.type==='alpha'?1:0);
  const target=ctx.EditorVNextScene.blank({width:160,height:96});target.assets={matte:{...plain(asset),name:'旧同名素材'}};
  const mapping=await core.importInto(target,bundle),first=api.instantiate(target,key,{x:80,y:40}),second=api.instantiate(target,key,{x:10,y:8});
  if(input.type==='alpha'){
    assert.notEqual(mapping.assets.matte,'matte');assert.equal(first.effects.mask.assetId,mapping.assets.matte);assert.equal(first.effects.mask.imageId,undefined);assert.equal(first.effects.mask.mode,'luma');
    assert.equal(plain(api.references(target.elementPresets[key])).find(r=>r.kind==='asset').id,mapping.assets.matte);
  }
  if(input.type==='poly')assert.deepEqual(plain(first.effects.mask.points),[[84,42],[108,44],[104,72],[80,68]]);
  else{assert.equal(first.effects.mask.x,84);assert.equal(first.effects.mask.y,42);}
  if(follow)assert.deepEqual(plain(first.effects.mask.followMatrix),[1.2,.2,-.3,.8,80,40]);
  first.effects.mask.invert=false;assert.equal(second.effects.mask.invert,true);assert.equal(target.elementPresets[key].root.effects.mask.invert,true);
  const project=await ctx.EditorVNextProjectPackage.build(target),opened=(await ctx.EditorVNextProjectPackage.restore(project.files)).scene;
  assert.deepEqual(plain(opened.entities[1].effects.mask),plain(second.effects.mask));
  assert.equal(ctx.EditorVNextDeliveryBuilder.pruneScene(opened).elementPresets,undefined);
}

const luma={type:'alpha',assetId:'matte',x:0,y:0,w:16,h:16,mode:'luma',futureMetadata:{label:'保留非坐标批注'}};
assert.deepEqual(plain(maskState.remapReferences(luma,{asset:{matte:'copy'}})),{...luma,assetId:'copy'});
assert.deepEqual(plain(maskState.remapReferences(luma,{entity:{matte:'wrong-domain'}})),luma,'对象和素材不能混用ID映射');
assert.deepEqual(plain(maskState.references({type:'element',targetId:'source'})),[{kind:'entity',id:'source',version:1}]);
assert.equal(maskState.portable({type:'none'}).type,'none');
assert.throws(()=>maskState.portable({...luma,mode:'future-channel'}),/通道模式尚无可移植适配/);
assert.throws(()=>maskState.portable({...luma,type:'drawn'}),/尚无可移植适配/);
assert.throws(()=>maskState.portable({...luma,extra:{assetId:'undeclared'}}),/未声明的引用位置/);
assert.throws(()=>maskState.portable({...luma,follow:true,followMatrix:[0,0,0,0,0,0]}),/不可逆/);
assert.throws(()=>maskState.portable({...luma,imageId:'other'}),/身份冲突/);
assert.throws(()=>maskState.portable({type:'poly',points:[[0,0],[1,0],[NaN,1]]}),/路径无效/);

const rejected=ctx.EditorVNextScene.blank();rejected.assets={matte:plain(asset)};rejected.entities=[{id:'root',type:'rect',x:5,y:4,w:16,h:16,parentId:'group',effects:{mask:luma}}];
const before=JSON.stringify(rejected);assert.throws(()=>api.add(rejected,'root'),/父级缺失/);assert.equal(JSON.stringify(rejected),before);
delete rejected.entities[0].parentId;rejected.entities[0].effects.mask={type:'element',targetId:'source'};
assert.throws(()=>api.add(rejected,'root'),/来源缺失/);
rejected.entities[0].effects.mask={...luma,assetId:'missing'};assert.throws(()=>api.add(rejected,'root'),/依赖缺失/);
console.log('✓ RC2-c1：统一蒙版适配覆盖、局部化／放置重定位、跟随矩阵、Alpha／luma素材重连、实例独立与工程往返；未知通道／绘制／父级／对象来源明确拒绝');
