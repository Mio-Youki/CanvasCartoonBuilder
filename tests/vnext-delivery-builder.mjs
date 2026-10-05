#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),context={};
new vm.Script(readFileSync(resolve(root,'editor/vnext-delivery-builder.js'),'utf8'),{filename:'editor/vnext-delivery-builder.js'}).runInNewContext(context);
const builder=context.EditorVNextDeliveryBuilder;
const scene={format:'tosampool-scene/v4',width:16,height:10,loop:2,assets:{used:{locator:'data:image/svg+xml,test'},spare:{locator:'data:image/svg+xml,spare'}},entities:[{id:'photo',type:'image',assetId:'used',x:0,y:0,w:16,h:10}],timeline:{tracks:{}},sceneEffects:{overlay:{},sample:{}}};
const pruned=builder.pruneScene(scene);
assert.deepEqual(Object.keys(pruned.assets),['used'],'delivery artifacts must omit unreferenced assets');
assert.equal(builder.isTimeDependent(pruned),false,'a fixed image scene must render once');
const staticRuntime=builder.runtimeScript({scene,name:'My Scene'});
assert.equal(staticRuntime.name,'My-Scene.runtime.js');assert.equal(staticRuntime.meta.dynamic,false);assert.match(staticRuntime.data,/tosampoolReady/);assert.doesNotMatch(staticRuntime.data,/"spare"/);
const animated=JSON.parse(JSON.stringify(scene));animated.entities[0].motion={bob:{enabled:true,amount:2,period:1}};
assert.equal(builder.isTimeDependent(animated),true,'enabled motion must retain the play loop');
const embed=builder.embedHtml({scene,runtimeSource:'window.ToSampoolRuntimeVNext={createRuntime(){return{renderTo(){}}}};',name:'My Scene'});
assert.equal(embed.name,'My-Scene.embed.html');assert.match(embed.data,/data-tosampool-scene="My-Scene"/);assert.match(embed.data,/ToSampoolRuntimeVNext/);assert.doesNotMatch(embed.data,/"spare"/);
const procedural=JSON.parse(JSON.stringify(scene));procedural.modules={'test-module':{manifest:{format:'tosampool-scene-module/v1',id:'test-module',version:1}}};procedural.entities=[{id:'detail',type:'procedural',moduleId:'test-module',moduleVersion:1,params:{}}];
const moduleRuntime=builder.runtimeScript({scene:procedural,name:'Module Scene',moduleSources:{'test-module':'window.__moduleLoaded=true;'}});assert.match(moduleRuntime.data,/window\.__moduleLoaded=true/);assert.ok(moduleRuntime.data.indexOf('window.__moduleLoaded=true')<moduleRuntime.data.indexOf('const scene='),'模块源码必须在 Scene 启动前注册');assert.deepEqual([...moduleRuntime.meta.modules],['test-module']);
console.log('✓ v4 Delivery Builder：运行时脚本、嵌入片段、素材裁剪与静态检测通过');
