import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx = {console};
for (const file of ['home-scene-vnext.js','editor/vnext-scene.js','editor/v4-module-instances.js']) {
  new vm.Script(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{filename:file}).runInNewContext(ctx);
}
const api=ctx.EditorV4ModuleInstances, registry=ctx.ToSampoolRuntimeVNext.modules.sceneModules;
const scene=ctx.EditorVNextScene.blank({width:600,height:300});scene._moduleScope='instance-contract';
const manifest={format:'tosampool-scene-module/v1',id:'rain',version:1,title:'雨',recommendedCanvas:{width:900,height:900},assets:['dot'],parameters:[{key:'density',type:'number',default:.5,min:0,max:1},{key:'seed',type:'number',default:7,integer:true}],timeDependent:true};
scene.modules={rain:{manifest,locator:'data:text/javascript,throw Error("must not execute")'}};scene.assets={dot:{locator:'data:image/png;base64,AA=='}};
const baseline=JSON.stringify(scene);assert.equal(api.ready(scene,'rain',scene._moduleScope),false);
assert.throws(()=>api.create(scene,'rain'),/未注册|未信任/);assert.equal(JSON.stringify(scene),baseline);
registry.withScope(scene._moduleScope,()=>registry.register({manifest,render(){throw Error('must not render during creation');}}));
assert.equal(api.ready(scene,'rain',scene._moduleScope),true);
const first=api.create(scene,'rain'),second=api.create(scene,'rain');
assert.notEqual(first.id,second.id);assert.equal(first.w,200);assert.equal(first.h,200);assert.equal(first.x,200);assert.equal(first.y,50);
assert.equal(first.params.density,.5);first.params.density=.9;assert.equal(second.params.density,.5);
assert.equal(manifest.parameters[0].default,.5,'实例不得污染Manifest默认值');
const broken=JSON.parse(JSON.stringify(scene));delete broken.assets.dot;const before=JSON.stringify(broken);
assert.throws(()=>api.create(broken,'rain'),/依赖素材/);assert.equal(JSON.stringify(broken),before);
const other=JSON.parse(JSON.stringify(scene));other._moduleScope='other-project';assert.throws(()=>api.create(other,'rain'),/未注册|未信任/);
other._moduleScope=scene._moduleScope;other.modules.rain.manifest.title='tampered';assert.throws(()=>api.create(other,'rain'),/Manifest 不一致/);
console.log('✓ R4a 程序实例合同：授信边界／独立参数／尺寸容纳／依赖预检／失败无写入／工程作用域');
