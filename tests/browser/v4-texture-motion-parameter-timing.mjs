import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/texture-motion-timing');mkdirSync(out,{recursive:true});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined'&&classicV4Inspector);
 await page.evaluate(()=>{
  if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:90,loop:12});
  classicV4Changes.run('纹理动态时序夹具',s=>{
   s.entities=[{id:'a',type:'rect',x:15,y:10,w:120,h:70,fill:'#3377cc'}];
   for(const scope of ['object','scene'])for(const id of ['texture-overlay','threshold','offset-sampling']){
    const config=EditorVNextEffectState.enable(s,{scope,ownerId:scope==='object'?'a':null,effectId:id});if(id==='texture-overlay')Object.assign(config,{spacing:8,size:2});config.motion={enabled:false,type:id==='texture-overlay'?'pattern-drift':id==='threshold'?'threshold-pulse':'sampling-step',period:2,steps:8,amount:.08,frequency:4};
    const def=EditorEffectRegistryVNext.effectById[id],key=EditorVNextInspectorModel.trackKey(scope,scope==='object'?'a':EditorVNextInspectorModel.storageFor(def,scope),def);EditorVNextTimelineState.track(s,key);EditorVNextTimelineState.split(s,key,1/3);EditorVNextTimelineState.split(s,key,2/3);
   }
  });state.t=10;classicV4Inspector.focusEffect('object','a','texture-overlay');
 });
 const card=id=>page.locator('[data-v4-effect-id="'+id+'"]'),clock=(id,key)=>card(id).locator('[data-effect-parameter-clock="'+key+'"]'),field=(id,key)=>card(id).locator('[data-effect-parameter="'+key+'"]');
 async function arm(id,key){await clock(id,key).locator('xpath=..').hover();await clock(id,key).click();}
 async function set(id,key,value){await field(id,key).fill(String(value));await field(id,key).press('Tab');}
 const read=(id,scope='object')=>page.evaluate(({id,scope})=>{const s=ToSampoolV4Workspace.current(),def=EditorEffectRegistryVNext.effectById[id],storage=EditorVNextInspectorModel.storageFor(def,scope),key=EditorVNextInspectorModel.trackKey(scope,scope==='object'?'a':storage,def);return{base:(scope==='object'?s.entities[0].effects:s.sceneEffects)[storage][id],values:s.timeline.tracks[key].segments[2].values};},{id,scope});
 await arm('texture-overlay','size');await set('texture-overlay','size',12);let result=await read('texture-overlay');assert.equal(result.base.size,2);assert.equal(result.base.spacing,8);assert.equal(result.values.size,12);assert.equal(result.values.spacing,12);assert.equal(result.values.phaseX,undefined);
 await set('texture-overlay','phaseX',.25);result=await read('texture-overlay');assert.equal(result.base.phaseX,.25);assert.equal(result.values.phaseX,undefined,'无关纹理参数不能被已存在的时序牵入');
 const texturePixels=await page.evaluate(()=>{const s=JSON.parse(EditorVNextScene.serialize(ToSampoolV4Workspace.current()));s.sceneEffects={};s.entities[0].effects.sample={};const runtime=ToSampoolRuntimeVNext.createRuntime(s),canvas=document.createElement('canvas');try{runtime.renderTo(canvas,2);const a=canvas.getContext('2d').getImageData(0,0,160,90).data.slice();runtime.renderTo(canvas,10);const b=canvas.getContext('2d').getImageData(0,0,160,90).data;return a.reduce((sum,v,i)=>sum+(v!==b[i]),0);}finally{runtime.dispose();}});assert.ok(texturePixels>100,'正式Runtime中的纹理时序必须改变真实像素');
 await page.evaluate(()=>{classicV4Changes.run('换为自定义纹理',s=>{const c=s.entities[0].effects.decorate['texture-overlay'];Object.assign(c,{texture:'custom',tileWidth:4,tileHeight:4,tileScale:1,tilePixels:Array(16).fill('#00000000')});s.timeline.tracks['effect:object:a:texture-overlay'].segments[2].values={};});classicV4Inspector.focusEffect('object','a','texture-overlay');});
 await arm('texture-overlay','tileWidth');await set('texture-overlay','tileWidth',6);result=await read('texture-overlay');assert.equal(result.base.tileWidth,4);assert.equal(result.base.tilePixels.length,16);assert.equal(result.values.tileWidth,6);assert.equal(result.values.tileHeight,4);assert.equal(result.values.tilePixels.length,24);assert.equal(await clock('texture-overlay','tilePixels').getAttribute('aria-pressed'),'true');
 await arm('texture-overlay','tileHeight');assert.deepEqual((await read('texture-overlay')).values,{},'宽高和图样必须整组清除，不能留下错位数组');await page.locator('#stage-meta-bar .stage-meta-title').click();await page.keyboard.press('Control+z');assert.equal((await read('texture-overlay')).values.tilePixels.length,24);
 await field('texture-overlay','tilePixels').click({position:{x:5,y:5}});result=await read('texture-overlay');assert.equal(result.values.tilePixels[0],'#ffffffff');assert.equal(result.base.tilePixels[0],'#00000000');
 const saved=await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current()));await page.evaluate(text=>{ToSampoolV4Workspace.replace(JSON.parse(text));state.t=10;classicV4Inspector.focusEffect('object','a','texture-overlay');},saved);assert.equal(await field('texture-overlay','tileWidth').inputValue(),'6');
 await page.screenshot({path:resolve(out,'tile-timing.png')});
 await page.evaluate(()=>classicV4Inspector.focusEffect('object','a','threshold'));await card('threshold').locator('.v4-motion-title-button').click();
 await arm('threshold','motion.enabled');await field('threshold','motion.enabled').check();result=await read('threshold');assert.equal(result.base.motion.enabled,false);assert.equal(result.values['motion.enabled'],true);
 await arm('threshold','motion.period');await set('threshold','motion.period',5);result=await read('threshold');assert.equal(result.base.motion.period,2);assert.equal(result.values['motion.period'],5);
 await set('threshold','motion.amount',.15);result=await read('threshold');assert.equal(result.base.motion.amount,.15);assert.equal(result.base.motion.enabled,false,'单独修改动态参数不能复制时段的启用状态到全局');assert.equal(result.values['motion.amount'],undefined);
 const evaluated=await page.evaluate(()=>{const s=ToSampoolV4Workspace.current(),base=s.entities[0].effects.sample.threshold;return ToSampoolRuntimeVNext.modules.timeline.effectValuesFor(s,'object','a','threshold',base,10/12).motion;});assert.equal(evaluated.enabled,true);assert.equal(evaluated.period,5);assert.equal(evaluated.amount,.15);
 const dynamicFrames=await page.evaluate(()=>{const s=JSON.parse(EditorVNextScene.serialize(ToSampoolV4Workspace.current()));s.sceneEffects={};s.entities[0].effects.decorate={};delete s.entities[0].effects.sample['offset-sampling'];const runtime=ToSampoolRuntimeVNext.createRuntime(s),canvas=document.createElement('canvas');try{return[8.1,8.7,9.3,9.9,10.5,11.1].map(t=>{runtime.renderTo(canvas,t);return[...canvas.getContext('2d').getImageData(50,30,1,1).data].join(',');});}finally{runtime.dispose();}});assert.ok(new Set(dynamicFrames).size>1,'时段启用的动态必须真正随时间改变画面');
 await page.evaluate(()=>{state.t=2;classicV4Inspector.render();});assert.equal(await field('threshold','motion.enabled').isChecked(),false);await page.evaluate(()=>{state.t=10;classicV4Inspector.render();});assert.equal(await field('threshold','motion.enabled').isChecked(),true);
 await page.screenshot({path:resolve(out,'motion-timing.png')});
 const motionSaved=await page.evaluate(()=>EditorVNextScene.serialize(ToSampoolV4Workspace.current()));await page.evaluate(text=>{ToSampoolV4Workspace.replace(JSON.parse(text));state.t=10;classicV4Inspector.focusEffect('object','a','threshold');},motionSaved);assert.equal(await field('threshold','motion.enabled').isChecked(),true);assert.equal(await field('threshold','motion.period').inputValue(),'5');
 await page.evaluate(()=>classicV4Inspector.focusEffect('scene',null,'offset-sampling'));await card('offset-sampling').locator('.v4-motion-title-button').click();await arm('offset-sampling','motion.type');await field('offset-sampling','motion.type').selectOption('sampling-drift');result=await read('offset-sampling','scene');assert.equal(result.base.motion.type,'sampling-step');assert.equal(result.values['motion.type'],'sampling-drift');assert.equal(result.values['motion.frequency'],4,'切换方式必须把该方式默认参数一起写入时段');
 await page.evaluate(()=>{classicV4Changes.run('设为过渡',s=>EditorVNextTimelineState.setLinear(s,'effect:object:a:texture-overlay',1,{linearKeys:['color','alpha','angle']}));state.t=6;classicV4Inspector.focusEffect('object','a','texture-overlay');});assert.equal(await field('texture-overlay','tileWidth').isDisabled(),true);
 const before=await read('texture-overlay');await field('texture-overlay','tilePixels').scrollIntoViewIfNeeded();const rect=await field('texture-overlay','tilePixels').boundingBox();await page.mouse.click(rect.x+5,rect.y+5);assert.deepEqual(await read('texture-overlay'),before,'过渡段画图不应改写基础纹理或目标段');
 // Late file decoding must not apply to another time/selection after the import started.
 await page.evaluate(()=>{state.t=10;classicV4Inspector.focusEffect('object','a','texture-overlay');});const beforeImport=await read('texture-overlay');
 await page.evaluate(async()=>{
  const native=FileReader;window.FileReader=class extends native{readAsDataURL(file){this.addEventListener('loadend',()=>{window.__tileReadEnded=true;window.FileReader=native;});return super.readAsDataURL(file);}};
  const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;canvas.getContext('2d').fillRect(0,0,2,2);const blob=await new Promise(resolve=>canvas.toBlob(resolve)),transfer=new DataTransfer();transfer.items.add(new File([blob],'tile.png',{type:'image/png'}));const input=document.querySelector('[data-v4-effect-id="texture-overlay"] input[type=file]');input.files=transfer.files;input.dispatchEvent(new Event('change'));state.t=2;classicV4Inspector.render();
 });await page.waitForFunction(()=>window.__tileReadEnded);assert.deepEqual(await read('texture-overlay'),beforeImport,'迟到的PNG解码结果不能写入另一个时段');
 const coveredTexture=new Set();
 for(const type of ['lines-horizontal','grid','lines-layers','dots','noise','custom']){
  await page.evaluate(type=>{classicV4Changes.run('纹理模式覆盖',s=>{const c=s.entities[0].effects.decorate['texture-overlay'];Object.assign(c,{texture:type,layout:'stagger',tileScaleMode:'pixel'});});state.t=2;classicV4Inspector.focusEffect('object','a','texture-overlay');},type);
  for(const key of await card('texture-overlay').locator('[data-pattern-parameter]').evaluateAll(nodes=>nodes.map(n=>n.dataset.patternParameter))){coveredTexture.add(key);assert.equal(await clock('texture-overlay',key).count(),1,'纹理字段必须有入口：'+key);}
 }
 const declared=await page.evaluate(()=>EditorEffectRegistryVNext.effectById['texture-overlay'].params.filter(p=>!['color','alpha','blend'].includes(p.key)).map(p=>p.key));assert.deepEqual([...coveredTexture].sort(),declared.sort(),'23个纹理字段必须全部实际生成入口');
 const modes=await page.evaluate(()=>EditorEffectRegistryVNext.effects.flatMap(d=>(d.motion||[]).map(id=>({effectId:d.id,id,scope:d.scopes.includes('object')?'object':'scene',params:EditorEffectRegistryVNext.motionById[id].params}))));
 for(const mode of modes){
  await page.evaluate(mode=>{classicV4Changes.run('动态模式覆盖',s=>{const c=EditorVNextEffectState.enable(s,{scope:mode.scope,ownerId:'a',effectId:mode.effectId});c.motion={enabled:true,type:mode.id};for(const p of mode.params)c.motion[p.key]=p.default;if(mode.effectId==='texture-overlay')c.texture=['noise-snow','random-hold'].includes(mode.id)?'noise':'dots';});state.t=2;classicV4Inspector.focusEffect(mode.scope,mode.scope==='object'?'a':null,mode.effectId);},mode);
  const first='motion.'+mode.params[0].key;if(!await field(mode.effectId,first).count())await card(mode.effectId).locator('.v4-motion-title-button').click();
  for(const param of mode.params){const visible=!param.when||mode.params.find(p=>p.key===param.when)?.default;assert.equal(await field(mode.effectId,'motion.'+param.key).count(),visible?1:0);if(visible)assert.equal(await clock(mode.effectId,'motion.'+param.key).getAttribute('data-timing-kind'),'step');}
 }
 assert.deepEqual(errors,[]);console.log('✓ texture/motion timing: 23 texture fields, '+modes.length+' motion modes, actual Runtime pixels, linked groups, undo, save/reopen and read-only transition');
}finally{await browser.close();}
