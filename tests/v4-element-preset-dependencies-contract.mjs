import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {cases} from './fixtures/rc1-element-material-cases.mjs';

const ctx=vm.createContext({TextEncoder,TextDecoder,Buffer,crypto:webcrypto});
for(const file of ['home-scene-vnext.js','editor/effect-registry-vnext.js','editor/vnext-scene.js','editor/vnext-mask-state.js','editor/v4-module-instances.js','editor/v4-element-references.js','editor/v4-element-presets.js','editor/v4-pattern-lifecycle.js','editor/v4-resource-core.js','editor/vnext-project-package.js','editor/vnext-delivery-builder.js','editor/vnext-asset-loader.js'])new vm.Script(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{filename:file}).runInContext(ctx);
const core=ctx.EditorV4Resources,api=ctx.EditorV4ElementPresets,plain=v=>JSON.parse(JSON.stringify(v));
const descriptor=JSON.parse(readFileSync(new URL('../examples/resources/rain-curtain.tosampool-resource.json',import.meta.url),'utf8')).entries.find(e=>e.kind==='module').payload.descriptor;
const inputs=cases(descriptor);

// Processed image carries its original, recipe and non-destructive Alpha data.
const photo=plain(inputs[0].scene),source=JSON.stringify(photo),photoKey=api.add(photo,'photo-object');
assert.equal(JSON.stringify({...photo,elementPresets:undefined}),source);
const photoPack=await core.capture(photo,[{kind:'element',id:photoKey}]);
assert.deepEqual(plain(photoPack.entries.map(e=>e.kind).sort()),['element','image','image']);
const target=ctx.EditorVNextScene.blank();target.assets={prepared:plain(photo.assets.original),original:{...plain(photo.assets.original),name:'旧素材'}};
const previous=JSON.stringify(target.assets),mapped=await core.importInto(target,photoPack),presetId=mapped.elements[photoKey];
assert.notEqual(mapped.assets.prepared,'prepared');assert.notEqual(mapped.assets.original,'original');
assert.equal(JSON.stringify({prepared:target.assets.prepared,original:target.assets.original}),previous);
assert.equal(target.elementPresets[presetId].root.assetId,mapped.assets.prepared);
assert.equal(target.assets[mapped.assets.prepared].sourceAssetId,mapped.assets.original);
assert.equal(target.assets[mapped.assets.prepared].alphaMask.mode,'replace-alpha');
assert.equal(target.assets[mapped.assets.prepared].recipe.width,8);
const a=api.instantiate(target,presetId),b=api.instantiate(target,presetId);a.parts=[];
assert.notEqual(a.id,b.id);assert.equal(b.parts,undefined);assert.equal(a.alpha,.7);
const project=await ctx.EditorVNextProjectPackage.build(target),restored=(await ctx.EditorVNextProjectPackage.restore(project.files)).scene;
assert.equal(restored.elementPresets[presetId].root.assetId,mapped.assets.prepared);
assert.ok(restored.assets[mapped.assets.prepared].alphaMask.locator.startsWith('data:'));
const externalMask=plain(photo);externalMask.assets.prepared.alphaMask.locator='local/alpha.png';
const maskBytes=ctx.EditorVNextProjectPackage.dataUrlBytes(photo.assets.prepared.alphaMask.locator);
const maskProject=await ctx.EditorVNextProjectPackage.build(externalMask,{resolveAsset:async locator=>{assert.equal(locator,'local/alpha.png');return maskBytes;}});
assert.ok((await ctx.EditorVNextProjectPackage.restore(maskProject.files)).scene.assets.prepared.alphaMask.locator.startsWith('data:'));
const unused=plain(photo);unused.entities=[];assert.deepEqual([...ctx.EditorVNextAssetLoader.referencedAssetIds(unused)],[],'未使用预设不解码素材');

// Animated sequence is a dependency, not flattened into a first frame.
const sequence=plain(inputs[1].scene),sequenceKey=api.add(sequence,'walk-object'),seqPack=await core.capture(sequence,[{kind:'element',id:sequenceKey}]);
assert.ok(seqPack.entries.some(e=>e.kind==='sequence'));
const seqTarget=ctx.EditorVNextScene.blank();await core.importInto(seqTarget,seqPack);const walk=api.instantiate(seqTarget,sequenceKey);
assert.equal(seqTarget.assets[walk.assetId].frames.length,2);assert.equal(seqTarget.assets[walk.assetId].fps,2);assert.equal(walk.anim.bob.amount,3);

// Native recipes and finite project-local definitions travel with each part.
const vector=plain(inputs[2].scene);vector.entities[0].parts[0].recipe.params.armY=12;
const vectorKey=api.add(vector,'sign'),vectorPack=await core.capture(vector,[{kind:'element',id:vectorKey}]);
assert.equal(vectorPack.entries.length,1);assert.ok(vector.elementPresets[vectorKey].root.parts[0].geometrySnapshot);
const definition={format:'tosampool-pattern-definition/v1',id:'rc2-chevron',version:1,name:'折角',parameters:[{key:'reach',label:'长度',type:'number',default:12,min:1,max:30}],paths:[{mode:'stroke',points:[[0,0],[{params:{reach:1}},0],[{params:{reach:1}},20]]}]};
ctx.EditorV4PatternLifecycle.install(vector,definition,{createPreset:false});
const providers=ctx.ToSampoolRuntimeVNext.modules.patternProviders,record=providers.validate(definition);
vector.entities[0].parts[0]={id:'local-pattern',type:'custom',x:0,y:0,w:40,h:30,stroke:'#ffaa00',strokeWidth:2,recipe:{id:definition.id,version:1,params:{reach:18},providerKey:record.key}};
const customKey=api.add(vector,'sign',{id:'local-preset'}),customPack=await core.capture(vector,[{kind:'element',id:customKey}]);
assert.equal(customPack.entries.length,1);assert.ok(vector.elementPresets[customKey].root.parts[0].recipe.definition);
const patternTarget=ctx.EditorVNextScene.blank();await core.importInto(patternTarget,customPack);const first=api.instantiate(patternTarget,customKey),second=api.instantiate(patternTarget,customKey);first.parts[0].recipe.params.reach=4;
assert.equal(second.parts[0].recipe.params.reach,18);assert.equal(ctx.ToSampoolRuntimeVNext.modules.customShapes.supports(second.parts[0].recipe),true);
const conflicting=ctx.EditorVNextScene.blank(),other=plain(definition);other.paths[0].points[2][1]=25;
ctx.EditorV4PatternLifecycle.install(conflicting,other,{createPreset:false});const unchanged=JSON.stringify(conflicting);
await assert.rejects(()=>core.importInto(conflicting,customPack),/图样定义冲突/);assert.equal(JSON.stringify(conflicting),unchanged);

// Text keeps atlas and layout; unavailable font is not silently rasterized again.
const text=plain(inputs[5].scene);text.entities[0].textLayout={version:1,width:32,height:16,fontSize:16,positions:[{x:0,y:0},{x:16,y:0}],glyphs:[{sx:0,sy:0,sw:16,sh:16,x:0,y:0,w:16,h:16}]};
const textKey=api.add(text,'label'),textPack=await core.capture(text,[{kind:'element',id:textKey}]);assert.equal(textPack.entries.length,3);
const textTarget=ctx.EditorVNextScene.blank();textTarget.assets=plain(text.assets);const textMap=await core.importInto(textTarget,textPack),label=api.instantiate(textTarget,textKey);
assert.equal(label.rasterAssetId,textMap.assets.raster);assert.equal(label.glyphAssetId,textMap.assets.glyphs);assert.equal(label.fontId,'user-font-7');assert.deepEqual(plain(label.textLayout),text.entities[0].textLayout);

// Module declared assets are included; JS identifiers never get rewritten.
const program=plain(inputs[3].scene);program.assets=plain(sequence.assets);program.modules[descriptor.manifest.id].manifest.assets=[{id:'walk'}];
const programKey=api.add(program,'rain-instance'),programPack=await core.capture(program,[{kind:'element',id:programKey}]);
assert.deepEqual(plain(programPack.entries.map(e=>e.kind).sort()),['element','module','sequence']);
const programTarget=ctx.EditorVNextScene.blank();await core.importInto(programTarget,programPack);assert.equal(programTarget.modules[descriptor.manifest.id].manifest.assets[0].id,'walk');
assert.deepEqual([...ctx.EditorVNextAssetLoader.referencedAssetIds(programTarget)],[]);
programTarget.entities=[plain(program.entities[0])];assert.deepEqual([...ctx.EditorVNextAssetLoader.referencedAssetIds(programTarget)],['walk']);
const collision=ctx.EditorVNextScene.blank();collision.assets={walk:plain(photo.assets.original)};const old=JSON.stringify(collision);
await assert.rejects(()=>core.importInto(collision,programPack),/不能自动改写源码/);assert.equal(JSON.stringify(collision),old);

// Missing/undeclared dependencies cannot be accepted as a visually broken preset.
const missing=plain(photo);delete missing.assets.original;assert.throws(()=>api.capture(missing,'photo-object'),/依赖缺失/);
const cyclic=plain(photo);cyclic.assets.original.sourceAssetId='prepared';assert.throws(()=>api.capture(cyclic,'photo-object'),/依赖循环/);
const external=plain(photo);external.entities[0].fillPattern={imageId:'prepared'};assert.throws(()=>api.capture(external,'photo-object'),/资源引用位置/);
const broken=plain(photoPack);broken.entries=broken.entries.filter(e=>e.id!=='original');await assert.rejects(()=>core.importInto(ctx.EditorVNextScene.blank(),broken),/依赖缺失/);
await assert.rejects(()=>core.seal({kind:'image',id:'bad-mask',payload:{asset:{...plain(photo.assets.original),alphaMask:{locator:'file:///missing.png'}}},dependencies:[]}),/附属素材必须自包含/);
assert.equal(ctx.EditorVNextDeliveryBuilder.pruneScene(restored).elementPresets,undefined);
console.log('✓ RC2-b：原图／recipe／Alpha闭包、序列、文字图集、原生与声明式图样、Module素材、重名重连、原子失败及工程往返');
