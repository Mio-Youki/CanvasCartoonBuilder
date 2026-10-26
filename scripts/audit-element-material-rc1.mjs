/* Read-only existing-resource baseline. RC2-a now has separate positive tests;
 * this audit no longer asserts that the element kind is unimplemented. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {cases} from '../tests/fixtures/rc1-element-material-cases.mjs';
const root=new URL('../',import.meta.url),ctx={TextEncoder,TextDecoder,Buffer,crypto:webcrypto};
for(const file of ['home-scene-vnext.js','editor/vnext-scene.js','editor/v4-resource-core.js','editor/vnext-project-package.js'])new vm.Script(readFileSync(new URL(file,root),'utf8'),{filename:file}).runInNewContext(ctx);
const rain=JSON.parse(readFileSync(new URL('examples/resources/rain-curtain.tosampool-resource.json',root),'utf8')).entries.find(e=>e.kind==='module').payload.descriptor;
const core=ctx.EditorV4Resources,fixture=cases(rain),report=[];
for(const test of fixture){
  const before=JSON.stringify(test.scene),rootEntity=test.scene.entities.find(e=>e.id===test.rootId);
  const row={case:test.id,elementCapture:'see-RC2-positive-tests',existingResourceCapture:'not-applicable'};
  if(test.selection){
    const bundle=await core.capture(test.scene,[test.selection]);row.existingResourceCapture='passed';
    if(test.selection.kind==='asset'){
      const ids=Array.from(bundle.entries).filter(e=>['image','sequence'].includes(e.kind)).map(e=>e.id).sort();assert.deepEqual(ids,test.expectedAssets);
      const restored=ctx.EditorVNextScene.blank();await core.importInto(restored,bundle);
      if(test.id==='processed-alpha'){assert.equal(restored.assets.prepared.sourceAssetId,'original');assert.equal(restored.assets.prepared.recipe.width,8);assert.ok(restored.assets.prepared.alphaMask.locator);}
      else {assert.equal(restored.assets.walk.frames.length,2);assert.equal(restored.assets.walk.fps,2);assert.ok(rootEntity.anim.bob);}
    }else{
      const module=bundle.entries.find(e=>e.kind==='module');
      assert.equal(rootEntity.params.amount,test.expectedBaseAmount);assert.equal(module.payload.descriptor.manifest.parameters.find(p=>p.key==='amount').default,60);
      assert.equal(module.payload.entity,undefined);assert.equal(module.payload.params,undefined);
      assert.equal(test.scene.timeline.tracks[rootEntity.id].segments[1].values['params.amount'],240);
      row.missing='instance-params-and-object-structure';
      const probe=JSON.parse(JSON.stringify(test.scene));probe.modules[test.selection.id].locator='data:text/javascript,'+encodeURIComponent('globalThis.__RC1_CODE_EXECUTED__=true;');
      await core.capture(probe,[test.selection]);assert.equal(ctx.__RC1_CODE_EXECUTED__,undefined);
    }
  }
  if(test.id==='vector-pattern'){
    const temp=JSON.parse(before),part=rootEntity.parts[0],id=core.addPattern(temp,{id:'sign-style',engineId:part.recipe.id,engineVersion:part.recipe.version,params:part.recipe.params,style:{color:part.stroke,width:part.strokeWidth}});
    const bundle=await core.capture(temp,[{kind:'pattern',id}]);assert.equal(bundle.entries[0].payload.preset.params.armX,12);
    assert.equal(bundle.entries[0].payload.entity,undefined);row.existingResourceCapture='pattern-only-passed';
  }
  if(test.id==='external-object-references'){
    const known=new Set([rootEntity.id,rootEntity.effects.mask.targetId,rootEntity.parts[0].extensions.elements.sourceId,rootEntity.parts[0].pathEndpoints.sourceId]);
    assert.deepEqual([...known].sort(),test.expectedObjects);
    assert.equal(rootEntity.parts[0].extensions.elements.sourceId,test.scene.assets.stamp&&'stamp');
    row.requirement='typed-object-and-asset-id-maps;dependency-only-placement';
  }
  if(test.id==='editable-text'){
    for(const key of ['rasterAssetId','glyphAssetId'])assert.ok(test.scene.assets[rootEntity[key]]);
    assert.equal(rootEntity.fontId,test.expectedFont);row.requirement='two-image-dependencies-plus-font-status';
  }
  assert.equal(JSON.stringify(test.scene),before,'审计不得修改输入工程');report.push(row);
}
console.log(JSON.stringify({audit:'RC1-baseline/v1',scope:'read-only resource capability audit; no raster or browser validation',cases:report},null,2));
console.log('✓ RC1现状审计：六组输入／既有三类资源边界／当前实例参数缺口／时序差别／来源与图样／源码未执行／输入无写入');
