import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined');
 const result=await page.evaluate(async()=>{
  if(state.playing)togglePlay();const rt=ToSampoolRuntimeVNext,W=192,H=128,copy=v=>JSON.parse(JSON.stringify(v));
  const shapes=[{id:'a',type:'rect',x:20,y:20,w:48,h:40},{id:'b',type:'ellipse',x:100,y:64,w:48,h:40},{id:'c',type:'poly',points:[[32,28],[32,68],[72,68],[72,28]]}]; // deliberately reverse polygon winding
  const basic={format:'tosampool-scene/v4',width:W,height:H,loop:4,background:{alpha:0},entities:[{id:'owner',type:'rect',x:0,y:0,w:W,h:H,fill:'#ffffff',effects:{mask:{type:'shapes',version:1,shapes}}}]};
  const draw=(scene,t=0,options={})=>{const p=rt.createRuntime(scene),canvas=document.createElement('canvas');try{const stats=p.renderTo(canvas,t,options);return{canvas,stats};}finally{p.dispose();}};
  const samples=[],rows=[];
  for(const parent of [false,true])for(const follow of [false,true])for(const invert of [false,true]){
   const s=copy(basic),owner=s.entities[0],mask=owner.effects.mask;mask.follow=follow;mask.invert=invert;mask.geometryMatrix=[1,.1,.12,1,2,-1];if(follow){mask.followMatrix=[1,0,0,1,0,0];owner.anim={bob:{enabled:true,amount:5,period:3}};}
   if(parent){s.entities.unshift({id:'g',type:'group',x:4,y:3,w:W,h:H,rot:7,scaleX:.9,scaleY:.95});owner.parentId='g';}
   for(const t of [0,.75]){
    const actual=draw(s,t).canvas,body=copy(s);body.entities.find(e=>e.id==='owner').effects.mask=null;const source=draw(body,t).canvas;
    const reference=new OffscreenCanvas(W,H),c=reference.getContext('2d'),frame=rt.modules.frame.create(s,t),M=rt.modules.masks.placementMatrix(mask,owner,frame);
    if(invert)c.drawImage(source,0,0);c.save();c.transform(...M);c.beginPath();c.rect(20,20,48,40);c.moveTo(148,84);c.ellipse(124,84,24,20,0,0,Math.PI*2);c.closePath();c.moveTo(32,28);c.lineTo(72,28);c.lineTo(72,68);c.lineTo(32,68);c.closePath();c.clip();c.setTransform(1,0,0,1,0,0);if(invert)c.clearRect(0,0,W,H);else c.drawImage(source,0,0);c.restore();
    const a=actual.getContext('2d').getImageData(0,0,W,H).data,b=c.getImageData(0,0,W,H).data;let max=0;for(let i=3;i<a.length;i+=4)max=Math.max(max,Math.abs(a[i]-b[i]));rows.push({parent,follow,invert,t,max});
   }
  }
  const first=draw(basic).canvas.getContext('2d');for(const [x,y]of [[24,24],[40,40],[124,84],[90,90]])samples.push(first.getImageData(x,y,1,1).data[3]);
  let acquisitions=0;const surfaces={acquire(w,h){acquisitions++;return new OffscreenCanvas(w,h);},release(){}};const canvas=new OffscreenCanvas(W,H);canvas.getContext('2d').fillRect(0,0,W,H);rt.modules.masks.apply(canvas,basic.entities[0].effects.mask,{x:0,y:0,w:W,h:H},basic,rt.modules.frame.create(basic,0),surfaces,basic.entities[0]);
  const many=copy(basic.entities[0].effects.mask);many.shapes=Array.from({length:32},(_,i)=>({...shapes[0],id:'s'+i,x:i*3}));acquisitions=0;rt.modules.masks.apply(canvas,many,{x:0,y:0,w:W,h:H},basic,rt.modules.frame.create(basic,0),surfaces,basic.entities[0]);
  const allocationCount=acquisitions;
  const bad=copy(basic);bad.entities[0].effects.mask.shapes[1].id='a';let rejected=false;try{rt.createRuntime(bad);}catch(e){rejected=/ID/.test(e.message);}
  // Resource adapter: the entire union survives editable preset and project round trips.
  const target=EditorVNextScene.blank({width:W,height:H}),key=EditorV4ElementPresets.add(basic,'owner'),resource=await EditorV4Resources.capture(basic,[{kind:'element',id:key}]);await EditorV4Resources.importInto(target,resource);
  EditorV4ElementPresets.instantiate(target,key,{x:0,y:0});const bundle=await EditorVNextProjectPackage.build(target),opened=(await EditorVNextProjectPackage.restore(bundle.files)).scene;
  const roundtrip=JSON.stringify(opened.entities[0].effects.mask)===JSON.stringify(target.entities[0].effects.mask);
  ToSampoolV4Workspace.replace(basic);state.t=0;classicV4View.select('owner');await classicV4View.render();classicV4Changes.clear();
  return{rows,samples,allocationCount,rejected,roundtrip};
 });
 assert.equal(Math.max(...result.rows.map(r=>r.max)),0,JSON.stringify(result.rows));assert.deepEqual(result.samples,[255,255,255,0]);assert.equal(result.allocationCount,1);assert.equal(result.rejected,true);assert.equal(result.roundtrip,true);
 const section=()=>page.locator('.global-section').filter({has:page.locator('.global-section-title',{hasText:/^蒙版$/})});
 const field=name=>section().locator('.global-field').filter({has:page.locator(':scope > span',{hasText:new RegExp('^'+name+'$')})});
 const button=name=>section().locator('button').filter({hasText:new RegExp('^'+name+'$')});
 assert.equal(await field('蒙版').locator('select').inputValue(),'shapes');
 assert.deepEqual(await field('蒙版').locator('option').allTextContents(),['无','图形','图片','场景对象']);
 await field('当前图形').locator('select').selectOption('b');
 await button('编辑').click();
 assert.equal(await field('X').locator('input').inputValue(),'100');await field('X').locator('input').fill('108');await field('X').locator('input').dispatchEvent('change');
 assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.mask.shapes[0].x),20);
 await button('完成').click();await button('复制').click();
 assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.mask.shapes.length),4);
 await button('删除').click();assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.mask.shapes.length),3);
 // Actual pointer gesture under a parent affine basis and follow, then undo.
 const gesture=await page.evaluate(async()=>{
  classicV4Changes.run('父组',s=>{s.entities.unshift({id:'g',type:'group',x:2,y:1,w:192,h:128,rot:5,scaleX:.9,scaleY:.9});s.entities[1].parentId='g';s.entities[1].effects.mask.follow=true;s.entities[1].effects.mask.followMatrix=[1,0,0,1,0,0];});
  await classicV4View.render();classicV4Masks.begin({scope:'object',ownerId:'owner',shapeId:'b'});const scene=ToSampoolV4Workspace.current(),owner=scene.entities.find(e=>e.id==='owner'),mask=owner.effects.mask,b=mask.shapes.find(s=>s.id==='b'),M=ToSampoolRuntimeVNext.modules.masks.placementMatrix(mask,owner,ToSampoolRuntimeVNext.modules.frame.create(scene,0)),r=classicV4Masks.overlay.getBoundingClientRect();
  window.__maskShapeBefore=JSON.stringify(mask);const p=(x,y)=>({x:r.left+(M[0]*x+M[2]*y+M[4])*r.width/192,y:r.top+(M[1]*x+M[3]*y+M[5])*r.height/128});return{from:p(b.x+b.w/2,b.y+b.h/2),to:p(b.x+b.w/2+6,b.y+b.h/2-4)};
 });
 await page.mouse.move(gesture.from.x,gesture.from.y);await page.mouse.down();await page.mouse.move(gesture.to.x,gesture.to.y,{steps:4});await page.mouse.up();
 const moved=await page.evaluate(()=>{const mask=ToSampoolV4Workspace.current().entities.find(e=>e.id==='owner').effects.mask,before=JSON.parse(window.__maskShapeBefore),b=mask.shapes.find(s=>s.id==='b'),old=before.shapes.find(s=>s.id==='b');const dx=b.x-old.x,dy=b.y-old.y,other=JSON.stringify(mask.shapes[0])===JSON.stringify(before.shapes[0]);classicV4Changes.undo();const restored=JSON.stringify(ToSampoolV4Workspace.current().entities.find(e=>e.id==='owner').effects.mask)===window.__maskShapeBefore;classicV4Masks.end(false);return{dx,dy,other,restored};});
 assert.ok(Math.abs(moved.dx-6)<.2&&Math.abs(moved.dy+4)<.2,JSON.stringify(moved));assert.ok(moved.other&&moved.restored);
 // The same adapter renders multi-shape controls on a scene filter.
 await page.evaluate(()=>{classicV4Changes.run('场景蒙版',s=>{EditorVNextEffectState.enable(s,{scope:'scene',effectId:'tint-overlay'});EditorVNextMaskState.set(s,{scope:'scene',effectId:'tint-overlay'},s.entities.find(e=>e.id==='owner').effects.mask);});classicV4View.select(null);});
 await page.locator('#global-inspector-tabs').getByRole('button',{name:'叠加滤镜',exact:true}).click();
 assert.ok(await page.locator('#inspector-context').getByText('当前图形',{exact:true}).count()>0);
 const exported=await page.evaluate(async()=>{const artifact=await currentV4TestArtifact();return artifact.data;});const output=await browser.newPage();await output.setContent(exported);await output.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"],[data-tosampool-error]'));assert.equal(await output.locator('[data-tosampool-error]').count(),0);await output.close();
 const old=await browser.newPage();await old.setContent('<script>window.ToSampoolRuntimeVNext={createRuntime(){},modules:{masks:{affineGeometry:true,completeSources:1},renderer:{referenceSources:true}}};</script>'+exported);await old.waitForFunction(()=>document.querySelector('[data-tosampool-error]'));assert.match(await old.locator('[data-tosampool-error]').getAttribute('data-tosampool-error'),/多图形蒙版/);await old.close();
 assert.deepEqual(errors,[]);console.log('✓ multi-shape real pixels/union/winding/invert/affine/follow, bounded surfaces, preset/project, UI pointer/undo, scene adapter and delivery:',{cases:result.rows.length,...moved});
}finally{await browser.close();}
