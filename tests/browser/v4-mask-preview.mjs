import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined');
 const pixels=await page.evaluate(()=>{
  if(state.playing)togglePlay();const rt=ToSampoolRuntimeVNext,W=96,H=64,clone=v=>JSON.parse(JSON.stringify(v));
  const draw=(p,t,options={})=>{const canvas=document.createElement('canvas');p.renderTo(canvas,t,options);return{canvas,pixels:canvas.getContext('2d').getImageData(0,0,W,H).data};};
  const source={id:'source',type:'rect',x:20,y:20,w:30,h:20,fill:'#808080',alpha:.65,anim:{bob:{amount:5,period:2}},effects:{mask:{type:'ellipse',x:20,y:20,w:30,h:20,follow:true,followMatrix:[1,0,0,1,20,20]},decorate:{outline:{enabled:true,color:'#ffffff',alpha:.5,width:2}},sample:{threshold:{enabled:true,threshold:.4,dark:'#222222',light:'#aaaaaa'}}}},target={id:'owner',type:'rect',x:0,y:0,w:W,h:H,fill:'#ff0000',effects:{mask:{type:'element',targetId:'source'}}};
  const basic={format:'tosampool-scene/v4',width:W,height:H,loop:4,background:{alpha:0},entities:[source,target]},rows=[];
  for(const mode of ['alpha','luma'])for(const invert of [false,true]){
   const scene=clone(basic);scene.entities[1].effects.mask={type:'element',targetId:'source',mode,invert};const p=rt.createRuntime(scene),ref=rt.createRuntime({...scene,entities:[clone(scene.entities[0])]});const before=JSON.stringify(scene),normal=draw(p,.5).canvas.toDataURL();
   let timeChanged=false,last;
   for(const t of [0,.5]){
    const sampled=draw(ref,t).pixels,preview=draw(p,t,{maskPreview:{scope:'object',ownerId:'owner'}}),a=preview.pixels;let max=0,opaque=true;
    for(let i=0;i<a.length;i+=4){let v=mode==='alpha'?sampled[i+3]:Math.round((sampled[i]*.2126+sampled[i+1]*.7152+sampled[i+2]*.0722)*sampled[i+3]/255);if(invert)v=255-v;max=Math.max(max,Math.abs(a[i]-v),Math.abs(a[i+1]-v),Math.abs(a[i+2]-v));opaque=opaque&&a[i+3]===255;}
    const fingerprint=preview.canvas.toDataURL();timeChanged=last&&last!==fingerprint||timeChanged;last=fingerprint;rows.push({mode,invert,t,max,opaque});
   }
   const restored=draw(p,.5).canvas.toDataURL()===normal;rows.push({restored,timeChanged,unchanged:before===JSON.stringify(scene)});p.dispose();ref.dispose();
  }
  // Object preview inversion has the actual finite capsule bounds, not a
  // white infinite plane outside this object's processing surface.
  const finite=rt.createRuntime({...basic,entities:[{...target,x:20,y:15,w:30,h:20,effects:{mask:{type:'rect',x:25,y:20,w:10,h:10,invert:true}}}]});const f=draw(finite,0,{maskPreview:{scope:'object',ownerId:'owner'}}).canvas.getContext('2d');const finiteSamples=[[0,0],[22,17],[28,24]].map(([x,y])=>f.getImageData(x,y,1,1).data[0]);finite.dispose();
  window.__maskPreviewBase=clone(basic);return{rows,finiteSamples};
 });
 for(const row of pixels.rows)if('max'in row){assert.ok(row.max<=2,JSON.stringify(row));assert.equal(row.opaque,true);}else assert.ok(row.restored&&row.timeChanged&&row.unchanged,JSON.stringify(row));assert.deepEqual(pixels.finiteSamples,[0,255,0]);
 await page.evaluate(async()=>{
  const s=EditorVNextScene.blank({width:192,height:128,loop:4});s.background={color:'#245577',alpha:1};s.entities=[{id:'owner',type:'vector',x:0,y:0,w:192,h:128,parts:[{id:'p',type:'rect',x:0,y:0,w:192,h:128,fill:'#ffaa00'}],effects:{mask:{type:'shapes',version:1,shapes:[{id:'a',type:'rect',x:20,y:20,w:50,h:40},{id:'b',type:'poly',points:[[100,20],[150,20],[125,65]]}]}}}];
  ToSampoolV4Workspace.replace(s);state.t=.75;classicV4View.selectPart('owner','p');classicV4View.select('owner');classicV4Inspector.focusMask('owner');await classicV4View.render();classicV4Masks.begin({scope:'object',ownerId:'owner',shapeId:'b'},{recreate:true});classicV4Changes.clear();
 });
 const overlay=page.locator('#v4-mask-overlay');await overlay.click({position:{x:40,y:40}});await overlay.click({position:{x:70,y:45}});
 const button=()=>page.locator('#inspector-context [data-mask-preview]');await button().scrollIntoViewIfNeeded();
 const before=await page.evaluate(()=>({serialized:EditorVNextScene.serialize(ToSampoolV4Workspace.current()),revision:ToSampoolV4Workspace.revision,id:classicV4View.selectedId,drill:classicV4View.drillGroups,part:classicV4View.partScopeId,time:state.t,track:classicV4Timeline.trackKey,scroll:document.querySelector('#inspector-context').scrollTop,active:classicV4Masks.active,draft:classicV4Masks.draftPoints,context:classicV4Inspector.context,normal:classicV4View.canvas.toDataURL()}));
 await button().click();await page.waitForFunction(()=>classicV4View.performance().lastRender?.maskPreview===true);
 assert.equal(await button().getAttribute('aria-pressed'),'true');assert.equal(await overlay.evaluate(c=>c.style.visibility),'hidden');
 assert.deepEqual(await page.evaluate(()=>[classicV4Transforms.layer.style.visibility,classicV4PartTransforms.layer.style.visibility]),['hidden','hidden']);
 const shown=await page.evaluate(()=>({serialized:EditorVNextScene.serialize(ToSampoolV4Workspace.current()),revision:ToSampoolV4Workspace.revision,undo:classicV4Changes.canUndo,preview:classicV4View.maskPreview,normal:classicV4View.canvas.toDataURL(),id:classicV4View.selectedId,scroll:document.querySelector('#inspector-context').scrollTop}));
 assert.equal(shown.serialized,before.serialized);assert.equal(shown.revision,before.revision);assert.equal(shown.undo,false);assert.notEqual(shown.normal,before.normal);assert.equal(shown.id,before.id);assert.equal(shown.scroll,before.scroll);
 // Saving/exporting while the View is in preview must still use normal output.
 const artifact=await page.evaluate(async()=>{const a=await currentV4TestArtifact();return a.data;});const exported=await browser.newPage();await exported.setContent(artifact);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"],[data-tosampool-error]'));assert.equal(await exported.locator('[data-tosampool-error]').count(),0);assert.equal(await exported.locator('canvas').evaluate(c=>c.toDataURL()),before.normal);await exported.close();
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!classicV4View.maskPreview&&classicV4View.performance().lastRender?.maskPreview!==true);
 const after=await page.evaluate(()=>({serialized:EditorVNextScene.serialize(ToSampoolV4Workspace.current()),revision:ToSampoolV4Workspace.revision,id:classicV4View.selectedId,drill:classicV4View.drillGroups,part:classicV4View.partScopeId,time:state.t,track:classicV4Timeline.trackKey,scroll:document.querySelector('#inspector-context').scrollTop,active:classicV4Masks.active,draft:classicV4Masks.draftPoints,context:classicV4Inspector.context,normal:classicV4View.canvas.toDataURL()}));assert.deepEqual(after,before);assert.equal(await overlay.evaluate(c=>c.style.visibility),'');
 assert.deepEqual(await page.evaluate(()=>[classicV4Transforms.layer.style.visibility,classicV4PartTransforms.layer.style.visibility]),['','']);
 await button().click();await page.locator('#v4-mask-preview-shield button').click();assert.equal(await page.evaluate(()=>classicV4View.maskPreview),null);assert.equal(await page.evaluate(()=>classicV4View.selectedId),'owner');
 await button().click();await page.evaluate(text=>ToSampoolV4Workspace.replace(JSON.parse(text)),before.serialized);
 assert.deepEqual(await page.evaluate(()=>({preview:classicV4View.maskPreview,editing:classicV4Masks.active,draft:classicV4Masks.draftPoints})),{preview:null,editing:null,draft:[]});
 // Scene filters use full-canvas masks, and preview does not move their track.
 await page.evaluate(()=>{classicV4Masks.end(true);classicV4Changes.run('场景蒙版',s=>{EditorVNextEffectState.enable(s,{scope:'scene',effectId:'tint-overlay'});EditorVNextMaskState.set(s,{scope:'scene',effectId:'tint-overlay'},{type:'rect',x:20,y:20,w:50,h:40,invert:true});});classicV4View.select(null);classicV4Inspector.focusEffect('scene',null,'tint-overlay');});
 const sceneCard=page.locator('[data-v4-effect-id="tint-overlay"]'),sceneButton=sceneCard.locator('[data-mask-preview]'),sceneTrack=await page.evaluate(()=>classicV4Timeline.trackKey);await sceneButton.click();await page.waitForFunction(()=>classicV4View.performance().lastRender?.maskPreview===true);
 assert.equal(await page.evaluate(()=>classicV4Timeline.trackKey),sceneTrack);assert.deepEqual(await page.evaluate(()=>{const c=classicV4View.canvas.getContext('2d');return [[0,0],[30,30]].map(([x,y])=>c.getImageData(x,y,1,1).data[0]);}),[255,0]);
 await sceneCard.locator('.global-field').filter({has:page.locator(':scope > span',{hasText:'范围选项'})}).locator('input').first().uncheck();
 await page.waitForFunction(()=>classicV4View.canvas.getContext('2d').getImageData(0,0,1,1).data[0]===0);
 assert.equal(await page.evaluate(()=>classicV4View.maskPreview?.effectId),'tint-overlay');assert.equal(await sceneButton.getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:96,height:64}));assert.equal(await page.evaluate(()=>classicV4View.maskPreview),null);assert.equal(await page.locator('#v4-mask-preview-shield').isVisible(),false);
 // A pending normal Player creation must not clear the newly invalidated
 // static preview state when it completes (same document revision).
 await page.evaluate(async()=>{
  const s=EditorVNextScene.blank({width:96,height:64});s.entities=[{id:'race',type:'rect',x:0,y:0,w:96,h:64,fill:'#ff0000',effects:{mask:{type:'rect',x:10,y:10,w:20,h:20}}}];ToSampoolV4Workspace.replace(s);classicV4View.select('race');await classicV4View.render();
  ToSampoolV4Workspace.releasePlayer();const original=EditorVNextRuntimeAdapter;window.__maskPreviewAdapter=original;
  window.EditorVNextRuntimeAdapter={...original,create:async(...args)=>{await new Promise(resolve=>{window.__releaseMaskPreviewCreate=resolve;});return original.create(...args);}};
  classicV4View.scheduleRender('preview-async-race');
 });
 await page.waitForFunction(()=>typeof window.__releaseMaskPreviewCreate==='function');
 await page.evaluate(()=>{window.EditorVNextRuntimeAdapter=window.__maskPreviewAdapter;classicV4View.setMaskPreview({scope:'object',ownerId:'race'});window.__releaseMaskPreviewCreate();});
 await page.waitForFunction(()=>classicV4View.performance().lastRender?.maskPreview===true);
 await page.evaluate(()=>{classicV4Changes.run('移除蒙版',s=>EditorVNextMaskState.clear(s,{scope:'object',ownerId:'race'}));});assert.equal(await page.evaluate(()=>classicV4View.maskPreview),null);
 assert.deepEqual(errors,[]);console.log('✓ real mask preview pixels, Alpha/luma/invert/live source, finite bounds, normal-output restoration, UI state/history/draft/Escape, export and project reset');
}finally{await browser.close();}
