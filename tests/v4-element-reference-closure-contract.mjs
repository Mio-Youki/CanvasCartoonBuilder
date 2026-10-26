import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {cases} from './fixtures/rc1-element-material-cases.mjs';
const ctx=vm.createContext({TextEncoder,TextDecoder,Buffer,crypto:webcrypto});
for(const file of ['home-scene-vnext.js','editor/effect-registry-vnext.js','editor/vnext-scene.js','editor/vnext-mask-state.js','editor/v4-element-references.js','editor/v4-element-presets.js','editor/v4-module-instances.js','editor/v4-resource-core.js','editor/vnext-project-package.js','editor/vnext-delivery-builder.js','editor/vnext-asset-loader.js'])new vm.Script(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{filename:file}).runInContext(ctx);
const api=ctx.EditorV4ElementPresets,core=ctx.EditorV4Resources,plain=value=>JSON.parse(JSON.stringify(value));
const rain=JSON.parse(readFileSync(new URL('../examples/resources/rain-curtain.tosampool-resource.json',import.meta.url),'utf8')).entries.find(e=>e.kind==='module').payload.descriptor;
const scene=plain(cases(rain)[4].scene),initial=JSON.stringify(scene),key=api.add(scene,'host'),preset=scene.elementPresets[key];
assert.equal(JSON.stringify({...scene,elementPresets:undefined}),initial);
assert.equal(preset.sources.length,2);assert.equal(preset.sources.some(e=>e.id==='unrelated'),false);
const path=preset.root.parts[0];assert.equal(path.extensions.elements.sourceId,path.pathEndpoints.sourceId);
assert.notEqual(preset.root.effects.mask.targetId,path.extensions.elements.sourceId);
assert.equal(preset.sources.find(e=>e.type==='image').x,2);assert.equal(preset.sources.find(e=>e.type==='ellipse').x,0);
const bundle=await core.capture(scene,[{kind:'element',id:key}]);assert.equal(bundle.entries.length,2);
const target=ctx.EditorVNextScene.blank({width:160,height:96});target.assets={stamp:{...plain(scene.assets.stamp),name:'目标旧素材'}};
target.entities=[{id:'element-1',type:'rect',x:0,y:0,w:1,h:1}];
const mapping=await core.importInto(target,bundle),first=api.instantiate(target,key,{x:60,y:30}),second=api.instantiate(target,key,{x:10,y:10});
assert.equal(first.resourceBindings.sources.length,2);assert.equal(new Set(target.entities.map(e=>e.id)).size,7);
const firstStamp=target.entities.find(e=>e.id===first.parts[0].pathEndpoints.sourceId),secondStamp=target.entities.find(e=>e.id===second.parts[0].pathEndpoints.sourceId);
assert.notEqual(firstStamp.id,secondStamp.id);assert.equal(firstStamp.assetId,mapping.assets.stamp);assert.notEqual(firstStamp.id,firstStamp.assetId);
assert.equal(firstStamp.referenceSourceOnly,true);assert.equal(firstStamp.hidden,undefined);assert.equal(firstStamp.x,62);
firstStamp.alpha=.1;assert.equal(secondStamp.alpha,undefined);assert.equal(target.elementPresets[key].sources.find(e=>e.type==='image').alpha,undefined);
assert.equal(target.timeline.tracks[first.id],undefined);
const project=await ctx.EditorVNextProjectPackage.build(target),opened=(await ctx.EditorVNextProjectPackage.restore(project.files)).scene;
assert.equal(opened.entities.filter(e=>e.referenceSourceOnly).length,4);
const delivery=ctx.EditorVNextDeliveryBuilder.pruneScene(opened);assert.equal(delivery.elementPresets,undefined);assert.equal(delivery.entities.filter(e=>e.referenceSourceOnly).length,4);
assert.equal(delivery.entities.some(e=>e.resourceBindings),false);
const recaptured=api.capture(target,second.id);assert.equal(recaptured.sources.length,2);assert.equal(recaptured.sources.some(e=>e.referenceSourceOnly),false);

// Dormant references remain available for re-enabling without an external link.
const dormant=plain(scene);dormant.entities[0].parts[0].extensions.elements.enabled=false;dormant.entities[0].parts[0].pathEndpoints.enabled=false;
assert.equal(api.capture(dormant,'host').sources.length,2);
const nested=plain(scene);nested.entities[1].effects={mask:{type:'alpha',assetId:'stamp',x:42,y:22,w:8,h:8,mode:'luma'}};
assert.equal(api.capture(nested,'host').sources.find(e=>e.type==='image').effects.mask.x,2);

// Implementation dependencies in any source, not just the visible root.
const program=plain(scene);program.modules={[rain.manifest.id]:plain(rain)};
program.entities[1]={id:'stamp',type:'procedural',moduleId:rain.manifest.id,moduleVersion:1,params:{amount:88,period:6,color:'#ff6600',seed:13},x:42,y:22,w:8,h:8};
const programKey=api.add(program,'host'),programPack=await core.capture(program,[{kind:'element',id:programKey}]);assert.ok(programPack.entries.some(e=>e.kind==='module'));
const untrusted=ctx.EditorVNextScene.blank();await core.importInto(untrusted,programPack);const beforeTrust=JSON.stringify(untrusted);
assert.throws(()=>api.instantiate(untrusted,programKey),/显式信任/);assert.equal(JSON.stringify(untrusted),beforeTrust);

for(const mode of ['missing','self','cycle','group','particle','parent','unsupported']){
  const bad=plain(scene),host=bad.entities[0],stamp=bad.entities[1];
  if(mode==='missing')host.parts[0].pathEndpoints.sourceId='absent';
  if(mode==='self')host.parts[0].pathEndpoints.sourceId='host';
  if(mode==='cycle')stamp.effects={mask:{type:'element',targetId:'host'}};
  if(mode==='group')stamp.type='group';
  if(mode==='particle')stamp.type='particle-emitter';
  if(mode==='parent')stamp.parentId='group';
  if(mode==='unsupported')stamp.type='unknown';
  const before=JSON.stringify(bad);assert.throws(()=>api.add(bad,'host'),/缺失|循环|不支持/);assert.equal(JSON.stringify(bad),before);
}
const extra=plain(preset);extra.sources.push({id:'unrelated',type:'rect',x:0,y:0,w:1,h:1});assert.throws(()=>api.validate(extra),/闭包以外/);
const invalidSources=plain(preset);invalidSources.sources=0;assert.throws(()=>api.validate(invalidSources),/列表无效/);
const badPosition=plain(preset);badPosition.sources[0].x=Infinity;assert.throws(()=>api.validate(badPosition),/有限JSON/);
const tooMany=ctx.EditorVNextScene.blank();tooMany.entities=Array.from({length:34},(_,i)=>({id:'e'+i,type:'rect',x:i,y:0,w:1,h:1,...(i<33?{effects:{mask:{type:'element',targetId:'e'+(i+1)}}}:{})}));
assert.throws(()=>api.capture(tooMany,'e0'),/32个预算/);
console.log('✓ RC2-c2a：蒙版／排布／端点共享对象闭包、同名身份分域、独立内部来源、仅供引用角色、休眠引用、程序授信、工程／交付与原子失败');
