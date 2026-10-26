import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const ctx={TextEncoder,TextDecoder,Buffer,crypto:webcrypto};
for(const path of ['home-scene-vnext.js','editor/effect-registry-vnext.js','editor/vnext-scene.js','editor/vnext-mask-state.js','editor/v4-pattern-registry.js','editor/v4-path-pattern-presets.js','editor/v4-element-references.js','editor/v4-element-presets.js','editor/v4-resource-core.js','editor/v4-resource-library.js','editor/v4-material-sharing.js','editor/vnext-project-package.js'])new vm.Script(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{filename:path}).runInNewContext(ctx);
const plain=v=>JSON.parse(JSON.stringify(v)),api=ctx.EditorV4PathPatternPresets,core=ctx.EditorV4Resources,blank=()=>ctx.EditorVNextScene.blank(),scene=blank();
const geometry={id:'path',type:'rect',x:0,y:0,w:100,h:60,stroke:'#ffffff',strokeWidth:2,fill:'#223344'};
for(const id of ['ticks','nested','elements','corner-arrows','brackets']){
 const preset=api.fromPart(scene,geometry,id),key=core.addPattern(scene,{id,...preset}),part=core.createPatternPart(scene,key,geometry);
 assert.equal(part.type,'rect','path preset does not turn carrier into custom content');assert.equal(part.extensions[id].enabled,true);assert.deepEqual(Array.from(part.extensions.attached),[id]);
}
assert.equal(scene.entities.length,0,'capturing basic path recipes creates no Canvas entities');
assert.throws(()=>api.normalize({...scene.patternResources.ticks,engineVersion:2}),/身份或版本/);
assert.throws(()=>api.normalize({...scene.patternResources.nested,carrier:'free'}),/载体/);
assert.throws(()=>api.normalize({...scene.patternResources.elements,params:{sourceId:'old-scene-id'}}),/sourceId/);
scene.assets.photo={name:'依赖图片',locator:'data:text/plain,image',width:8,height:8};
scene.entities=[{id:'owner',type:'vector',x:0,y:0,w:100,h:60,parts:[{...geometry,extensions:{elements:{enabled:true,sourceId:'group',count:7,angle:15}}}]},{id:'group',type:'group',name:'来源组',x:200,y:30,w:20,h:20},{id:'image',parentId:'group',type:'image',assetId:'photo',x:2,y:3,w:8,h:8,anim:{bob:{amount:3,period:2}}},{id:'star',parentId:'group',type:'rect',x:12,y:2,w:5,h:6,fill:'#ff0000'}];
const snapshot=JSON.stringify(scene),recipe=api.fromPart(scene,scene.entities[0].parts[0],'elements',{ownerId:'owner'});
assert.equal(JSON.stringify(scene),snapshot,'capture is read-only');assert.equal(recipe.source.root.type,'group');assert.equal(recipe.source.children.length,2);assert.equal(recipe.params.sourceId,undefined);
const sourceId=core.addPattern(scene,{id:'with-source',...recipe}),bundle=await core.capture(scene,[{kind:'pattern',id:sourceId}]);
assert.deepEqual(Array.from(bundle.entries.map(e=>e.kind).sort()),['image','pattern']);assert.equal(bundle.entries.some(e=>e.kind==='element'),false,'source closure is embedded, not a visible material card');
const target=blank();target.assets.photo={locator:'data:text/plain,existing',width:2,height:2};const original=JSON.stringify(target.assets.photo),mapping=await core.importInto(target,bundle),stored=target.patternResources[mapping.patterns[sourceId]];
assert.notEqual(stored.source.children.find(e=>e.type==='image').assetId,'photo');assert.equal(JSON.stringify(target.assets.photo),original);assert.equal(target.entities.length,0);assert.equal(target.elementPresets,undefined);
const p1=core.createPatternPart(target,mapping.patterns[sourceId],geometry),p2=core.createPatternPart(target,mapping.patterns[sourceId],geometry);
assert.notEqual(p1.extensions.elements.sourceId,p2.extensions.elements.sourceId);assert.equal(p1.extensions.elements.count,7);assert.equal(target.entities.length,6);assert.ok(target.entities.every(e=>e.referenceSourceOnly));assert.equal(target.elementPresets,undefined);
const root1=target.entities.find(e=>e.id===p1.extensions.elements.sourceId),children1=target.entities.filter(e=>e.parentId===root1.id);assert.equal(children1.length,2);assert.ok(children1.some(e=>e.anim?.bob));
const beforeRepeat=JSON.stringify(target);api.apply(target,stored,p1);assert.equal(JSON.stringify(target),beforeRepeat,'repeated application creates no private source copies');
// Existing-owner application must retain the actual host identity while appending private sources.
target.entities.push({id:'host',type:'vector',x:0,y:0,w:100,h:60,parts:[plain(geometry)]});const host=target.entities.at(-1);api.apply(target,stored,host.parts[0]);assert.equal(target.entities.find(e=>e.id==='host'),host);assert.ok(host.parts[0].extensions.elements.sourceId);
const built=await ctx.EditorVNextProjectPackage.build(target),restored=await ctx.EditorVNextProjectPackage.restore(built.files);assert.deepEqual(plain(restored.scene.patternResources),plain(target.patternResources));
const library=ctx.EditorV4ResourceLibrary.create({storage:ctx.EditorV4ResourceLibrary.memoryStorage()}),sharing=ctx.EditorV4MaterialSharing.create({library}),published=await sharing.publish(scene,{kind:'pattern',id:sourceId}),taken=await sharing.take(blank(),published.record.id);assert.equal(taken.scene.entities.length,0);assert.equal(taken.scene.patternResources[taken.selection.id].source.children.length,2);
const missing=plain(scene);delete missing.assets.photo;await assert.rejects(()=>core.capture(missing,[{kind:'pattern',id:sourceId}]),/缺失/);
const particle=plain(scene);particle.entities[1].type='particle-emitter';assert.throws(()=>api.fromPart(particle,particle.entities[0].parts[0],'elements',{ownerId:'owner'}),/粒子/);
const self=plain(scene);self.entities[0].parts[0].extensions.elements.sourceId='owner';assert.throws(()=>api.fromPart(self,self.entities[0].parts[0],'elements',{ownerId:'owner'}),/自身/);
const descriptor=JSON.parse(readFileSync(new URL('../examples/resources/rain-curtain.tosampool-resource.json',import.meta.url),'utf8')).entries.find(e=>e.kind==='module').payload.descriptor;
const programs=blank();programs.modules={rain:descriptor};const program={id:'rain-source',type:'procedural',moduleId:'rain',moduleVersion:1,x:0,y:0,w:40,h:30,params:{}};programs.entities=[{id:'p-owner',type:'rect',w:100,h:60,x:0,y:0,extensions:{elements:{enabled:true,sourceId:program.id}}},program];
// Use the descriptor's real identity; no program execution occurs during capture/import.
program.moduleId=descriptor.manifest.id;programs.modules={[program.moduleId]:descriptor};
const programPreset=api.fromPart(programs,programs.entities[0],'elements',{ownerId:'p-owner'});assert.equal(api.references(programPreset)[0].kind,'module');
ctx.EditorV4ModuleInstances={ready:()=>false};const beforeFailure=JSON.stringify(programs);assert.throws(()=>api.apply(programs,programPreset,geometry),/信任/);assert.equal(JSON.stringify(programs),beforeFailure,'failed Module readiness leaves no private entities');
console.log('✓ 五项路径预设：载体／版本校验、只读捕获、组与图片私有闭包、冲突重映射、独立取用、幂等应用、工程与共享往返、缺依赖／循环／粒子拒绝、程序依赖与未授权回滚');
