import assert from 'node:assert/strict';
import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),out=resolve(root,'tests/artifacts/effect-parameter-coverage');mkdirSync(out,{recursive:true});
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined'&&classicV4Inspector);
 await page.evaluate(()=>{
  if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:90,loop:12});
  classicV4Changes.run('全效果参数覆盖夹具',s=>{
   s.entities=[{id:'shape',type:'rect',x:20,y:15,w:100,h:60,fill:'#e6dec8'}];
   for(const def of EditorEffectRegistryVNext.effects)for(const scope of def.scopes){
    EditorVNextEffectState.enable(s,{scope,ownerId:scope==='object'?'shape':null,effectId:def.id});
    const track=EditorVNextInspectorModel.trackKey(scope,scope==='scene'?EditorVNextInspectorModel.storageFor(def,scope):'shape',def);
    EditorVNextTimelineState.track(s,track);EditorVNextTimelineState.split(s,track,1/3);EditorVNextTimelineState.split(s,track,2/3);
   }
  });state.t=10;
 });
 const effects=await page.evaluate(()=>EditorEffectRegistryVNext.effects.flatMap(d=>d.scopes.map(scope=>({id:d.id,scope}))));let checked=0;
 const probes=effects.concat([
  {id:'offset-sampling',scope:'object',patch:{type:'breath'}},{id:'offset-sampling',scope:'object',patch:{type:'bands'}},
  {id:'halftone',scope:'object',patch:{colorMode:'single'}},{id:'halftone',scope:'object',patch:{colorMode:'gradient'}},
  {id:'crt-display',scope:'scene',patch:{colorMode:'mono'}},{id:'ascii-mapping',scope:'object',patch:{edges:true}},
  {id:'uneven-sampling',scope:'object',patch:{'field.type':'radial'}},{id:'uneven-sampling',scope:'object',patch:{'field.type':'noise'}},
  {id:'texture-overlay',scope:'object',patch:{texture:'custom'}},{id:'color-map',scope:'object',patch:{mode:'discrete'}}
 ]);
 for(const {id,scope,patch}of probes){
  await page.evaluate(({id,scope,patch})=>{if(patch)classicV4Changes.run('渐进参数覆盖',s=>{for(const [key,value]of Object.entries(patch))EditorVNextEffectState.setParam(s,{scope,ownerId:'shape',effectId:id,key,value});});classicV4Inspector.focusEffect(scope,scope==='object'?'shape':null,id);},{id,scope,patch});
  const result=await page.evaluate(({id,scope})=>{
   const def=EditorEffectRegistryVNext.effectById[id],card=document.querySelector('[data-v4-effect-id="'+id+'"]');if(!card)return{missingCard:id};
   const s=ToSampoolV4Workspace.current(),storage=EditorVNextInspectorModel.storageFor(def,scope),target=scope==='scene'?s.sceneEffects:s.entities[0].effects;
   const values=Object.assign(EditorVNextEffectState.defaults(def),target[storage][id]),plan=EditorClassicV4EffectParameters.plan({id},def,values);
   const expected=plan.special==='uneven'?EditorClassicV4EffectParameters.unevenPlan(def,values,scope).params:plan.special==='texture'?def.params.filter(p=>[values.texture==='custom'?'alpha':'color','blend'].includes(p.key)):plan.params.filter(p=>id!=='crt-display'||!['noise','flicker','sweep'].includes(p.key));
   return{missing:expected.filter(p=>!card.querySelector('[data-effect-parameter="'+p.key+'"]')).map(p=>p.key),clocks:expected.filter(p=>EditorClassicV4EffectParameterTiming.binding(def,p.key).timing!=='No').map(p=>{const button=card.querySelector('[data-effect-parameter-clock="'+p.key+'"]');return{key:p.key,expected:EditorClassicV4EffectParameterTiming.binding(def,p.key).timing==='Linear'?'linear':'step',actual:button?.dataset.timingKind};})};
  },{id,scope});
  assert.equal(result.missingCard,undefined,scope+':'+id);assert.deepEqual(result.missing,[],scope+':'+id);
  for(const clock of result.clocks){assert.equal(clock.actual,clock.expected,scope+':'+id+'.'+clock.key);checked++;}
 }
 async function edit(scope,id,key,value){
  await page.evaluate(({scope,id})=>classicV4Inspector.focusEffect(scope,scope==='object'?'shape':null,id),{scope,id});
  const card=page.locator('[data-v4-effect-id="'+id+'"]'),clock=card.locator('[data-effect-parameter-clock="'+key+'"]'),input=card.locator('[data-effect-parameter="'+key+'"]');
  await clock.locator('xpath=..').hover();await clock.click();await input.fill(String(value));await input.press('Tab');
  const check=await page.evaluate(({scope,id,key})=>{const s=ToSampoolV4Workspace.current(),def=EditorEffectRegistryVNext.effectById[id],track=EditorVNextInspectorModel.trackKey(scope,scope==='scene'?EditorVNextInspectorModel.storageFor(def,scope):'shape',def);return s.timeline.tracks[track].segments[2].values[key];},{scope,id,key});assert.equal(check,value,scope+':'+id+'.'+key);
 }
 await page.evaluate(()=>classicV4Changes.run('恢复沸腾类型',s=>EditorVNextEffectState.setParam(s,{scope:'object',ownerId:'shape',effectId:'offset-sampling',key:'type',value:'boil'})));
 await edit('object','offset-sampling','boil.coverage',.2);await edit('object','halftone','size',6);await edit('object','uneven-sampling','field.scale',24);await edit('object','color-grade','hue',45);await edit('scene','crt-display','scanline',.7);await edit('object','ascii-mapping','exposure',1.5);
 await page.evaluate(()=>classicV4Inspector.focusEffect('scene',null,'crt-display'));
 const crt=page.locator('[data-v4-effect-id="crt-display"]');await crt.locator('[data-effect-parameter-clock="theme"]').click();await crt.locator('[data-effect-parameter="theme"]').selectOption('apple');
 const theme=await page.evaluate(()=>{const s=ToSampoolV4Workspace.current(),values=s.timeline.tracks['effect:scene:sample:crt-display'].segments[2].values;return{base:s.sceneEffects.sample['crt-display'].theme,values,preset:ToSampoolRuntimeVNext.modules.crtScreen.presets.apple};});assert.notEqual(theme.base,'apple');assert.equal(theme.values.theme,'apple');for(const [key,value]of Object.entries(theme.preset))assert.deepEqual(theme.values[key],value,'主题参数必须跟随theme一起写入：'+key);
 await page.evaluate(()=>classicV4Inspector.focusEffect('object','shape','ascii-mapping'));
 const ascii=page.locator('[data-v4-effect-id="ascii-mapping"]');await ascii.locator('[data-effect-parameter-clock="characters"]').click();await ascii.locator('[data-effect-parameter="characters"]').fill('@#');await ascii.locator('[data-effect-parameter="characters"]').press('Tab');
 await page.waitForFunction(()=>ToSampoolV4Workspace.current().timeline.tracks['effect:object:shape:ascii-mapping'].segments[2].values.characters==='@#');
 assert.equal(await page.evaluate(()=>!!ToSampoolV4Workspace.current().timeline.tracks['effect:object:shape:ascii-mapping'].segments[2].values.glyphAtlas),true,'字符和烘焙字形图集必须一起写入时段');
 await page.evaluate(()=>{classicV4Changes.run('切换颜色映射模式',s=>EditorVNextEffectState.setParam(s,{scope:'object',ownerId:'shape',effectId:'color-map',key:'mode',value:'discrete'}));classicV4Inspector.focusEffect('object','shape','color-map');});
 const map=page.locator('[data-v4-effect-id="color-map"]');await map.locator('[data-effect-parameter-clock="colors"]').click();await map.locator('[data-effect-parameter="colors"] select').selectOption('8');
 await page.waitForFunction(()=>ToSampoolV4Workspace.current().timeline.tracks['effect:object:shape:color-map'].segments[2].values.colors===8);
 const extracted=await page.evaluate(()=>{const s=ToSampoolV4Workspace.current();return{base:s.entities[0].effects.sample['color-map'].colors,values:s.timeline.tracks['effect:object:shape:color-map'].segments[2].values};});assert.notEqual(extracted.base,8);assert.ok(extracted.values.extracted?.entries?.length,'提取色板必须跟随颜色数的时序写入');
 // Controller fields use their own track, not a nearby effect track.
 await page.evaluate(()=>classicV4Inspector.focusController('object','shape','sampling-grid'));
 const grid=page.locator('[data-v4-controller-id="sampling-grid"]');await grid.locator('[data-controller-parameter-clock="size"]').click();await grid.locator('[data-controller-parameter="size"]').fill('3');await grid.locator('[data-controller-parameter="size"]').press('Tab');
 assert.equal(await page.evaluate(()=>{const s=ToSampoolV4Workspace.current(),d=EditorEffectRegistryVNext.controllerById['sampling-grid'],key=EditorVNextInspectorModel.controllerTrackKey('object','shape',d);return s.timeline.tracks[key].segments[0].values.size;}),3);
 await page.evaluate(()=>classicV4Inspector.focusEffect('object','shape','projection'));
 const projection=page.locator('[data-v4-effect-id="projection"]');await projection.locator('[data-effect-parameter="distance"]').focus();await projection.locator('[data-effect-parameter="blend"]').locator('xpath=..').hover();await page.screenshot({path:resolve(out,'capability-icons.png')});
 assert.deepEqual(errors,[]);console.log('✓ Registry-wide Inspector coverage: '+checked+' visible parameter clocks across '+probes.length+' effect/scope/progressive cases; new Step writes, derived resources and independent sampling controller');
}finally{await browser.close();}
