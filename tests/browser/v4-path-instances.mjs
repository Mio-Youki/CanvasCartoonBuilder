import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:480,height:300,loop:4});
    ToSampoolV4Workspace.mutate(scene=>{scene.entities=[{id:'owner',type:'vector',name:'载体路径',x:45,y:150,w:300,h:20,parts:[{id:'path',type:'line',x:0,y:0,x2:300,y2:0,stroke:'#ffd23f',strokeWidth:1}]},
      {id:'source',type:'vector',name:'动态图样',x:400,y:50,w:18,h:12,anim:{bob:{amount:6,angle:90,period:2,curve:'linear'}},parts:[{id:'red',type:'rect',x:0,y:0,w:12,h:12,fill:'#f06060'},{id:'yellow',type:'ellipse',x:12,y:0,w:6,h:12,fill:'#ffd23f'}],effects:{formation:{'color-grade':{enabled:true,brightness:.1,hue:0,contrast:0,saturation:0}},decorate:{outline:{enabled:true,color:'#60c8c0',alpha:1,width:1}}}}];});classicV4View.selectPart('owner','path');
  });
  const visibleTabs=()=>page.locator('#element-inspector-tabs [data-element-inspector]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.textContent));
  assert.deepEqual(await visibleTabs(),['成样','拓展']);await page.locator('[data-element-inspector="extensions"]').click();
  const field=key=>page.locator('[data-extension-param="'+key+'"]');
  assert.equal(await page.locator('#inspector-context [data-path-extension-back]').count(),0);
  await page.locator('[data-add-pattern]').click();await page.locator('[data-pattern-id="elements"] .asset-card-action.add').click();
  await field('elements.enabled').check();await field('elements.sourceId').selectOption('source');await field('elements.count').fill('5');await field('elements.count').press('Tab');await field('elements.keepSource').uncheck();
  assert.equal(await field('elements.scale').inputValue(),'100');
  const rendered=await page.evaluate(()=>{
    const scene=ToSampoolV4Workspace.current(),runtime=ToSampoolRuntimeVNext,render=(count,time)=>{
      const data=JSON.parse(JSON.stringify(scene));data.entities[0].parts[0].extensions.elements.count=count;
      const player=runtime.createRuntime(data),canvas=document.createElement('canvas'),stats=player.renderTo(canvas,time),image=canvas.getContext('2d').getImageData(0,0,480,300).data;let hash=2166136261;for(const v of image)hash=Math.imul(hash^v,16777619);player.dispose();return{hash:hash>>>0,stats};
    },one=render(1,0),many=render(64,0),next=render(64,.5),frame=runtime.modules.frame.create(scene,0),owner=scene.entities[0],part=owner.parts[0],
      bounds=runtime.modules.content.localBounds(owner,frame.valuesFor(owner),frame),hit=EditorVNextCanvasHit.pickPart(scene,owner,45,145,0);
    return{one,many,next,bounds,hit:hit?.id,hidden:runtime.modules.pathInstances.hiddenSources(scene).has('source'),sourceHidden:scene.entities[1].hidden};
  });
  assert.equal(rendered.one.stats.pathSpriteBuilds,1);assert.equal(rendered.many.stats.pathSpriteBuilds,1);assert.equal(rendered.many.stats.pathInstancesDrawn,64);
  assert.equal(rendered.one.stats.pixelPasses,rendered.many.stats.pixelPasses,'来源效果不能按实例数重复计算');assert.equal(rendered.one.stats.workPixels,rendered.many.stats.workPixels);
  assert.notEqual(rendered.many.hash,rendered.next.hash,'源对象动态必须持续继承');assert.ok(rendered.bounds.x<0&&rendered.bounds.y<0,JSON.stringify(rendered));assert.equal(rendered.hit,'path');assert.ok(rendered.hidden);assert.ok(!rendered.sourceHidden);
  await page.locator('[data-instance-edit]').click();const move=page.locator('[data-instance-handle="move"]'),rotate=page.locator('[data-instance-handle="rotate"]');await move.waitFor({state:'visible'});
  const box=await move.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+24,box.y+box.height/2+12,{steps:5});await page.mouse.up();
  const offset=await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].extensions.elements);assert.ok(offset.along!==0&&offset.normal!==0);assert.equal(offset.count,5);
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await field('elements.along').inputValue(),'0');assert.equal(await field('elements.normal').inputValue(),'0');
  const center=await move.boundingBox(),turn=await rotate.boundingBox(),cx=center.x+center.width/2,cy=center.y+center.height/2,radius=Math.hypot(turn.x+turn.width/2-cx,turn.y+turn.height/2-cy);
  await page.mouse.move(turn.x+turn.width/2,turn.y+turn.height/2);await page.mouse.down();await page.mouse.move(cx,cy+radius,{steps:7});await page.mouse.up();
  assert.ok(Math.abs(+await field('elements.angle').inputValue())>60);await page.evaluate(()=>classicV4Changes.undo());assert.equal(await field('elements.angle').inputValue(),'0');
  const cancel=await move.boundingBox();await page.mouse.move(cancel.x+10,cancel.y+10);await page.mouse.down();await page.mouse.move(cancel.x+30,cancel.y+20);await page.keyboard.press('Escape');await page.mouse.up();
  assert.equal(await field('elements.along').inputValue(),'0','Escape应取消手势而不是提交半次修改');await page.locator('[data-instance-edit]').click();assert.equal(await move.isVisible(),false);
  await page.locator('[data-element-inspector="props"]').click();await page.evaluate(()=>classicV4View.select('owner'));assert.deepEqual(await visibleTabs(),['成样','加样','采样']);
  await page.locator('[data-path-extension-entry]').click();await field('elements.orientation').selectOption('fixed');
  const html=await page.evaluate(async()=>{
    const packed=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current()),scene=(await EditorVNextProjectPackage.restore(packed.files)).scene;
    if(scene.entities[0].parts[0].extensions.elements.sourceId!=='source')throw Error('项目恢复丢失排布引用');
    return EditorVNextDeliveryBuilder.embedHtml({scene,name:'path-instances',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;
  });
  const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));await exported.setContent(html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await exported.close();
  const groupCheck=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,scene=JSON.parse(JSON.stringify(ToSampoolV4Workspace.current()));delete scene.timeline;scene.background={alpha:0};scene.entities=scene.entities.filter(e=>e.id==='owner');
    scene.entities.push({id:'group',type:'group',x:350,y:50,w:40,h:30,rot:10,alpha:.7,anim:{spin:{speed:45}}},{id:'child',parentId:'group',type:'rect',x:0,y:0,w:14,h:10,fill:'#f06060'},
      {id:'child2',parentId:'group',type:'ellipse',x:20,y:10,w:12,h:14,fill:'#60c8c0',effects:{decorate:{outline:{enabled:true,color:'#ffffff',alpha:1,width:2}}}});
    scene.entities[0].parts[0].extensions.elements.sourceId='group';const player=runtime.createRuntime(scene),canvas=document.createElement('canvas'),a=player.renderTo(canvas,0),first=canvas.toDataURL(),b=player.renderTo(canvas,.5),second=canvas.toDataURL();player.dispose();
    const sourceOnly=runtime.modules.pathInstances.hiddenSources(scene);return{a,b,changed:first!==second,hidden:['group','child','child2'].every(id=>sourceOnly.has(id))};
  });assert.equal(groupCheck.a.pathSpriteBuilds,1);assert.equal(groupCheck.a.pathInstancesDrawn,5);assert.ok(groupCheck.changed&&groupCheck.hidden);
  const typeChecks=await page.evaluate(async()=>{
    const runtime=ToSampoolRuntimeVNext,sample=document.createElement('canvas');sample.width=32;sample.height=24;const ctx=sample.getContext('2d');ctx.fillStyle='#f08040';ctx.fillRect(2,2,28,20);ctx.clearRect(10,8,10,8);
    runtime.modules.sceneModules.register({manifest:{format:'tosampool-scene-module/v1',id:'path-instance-test',version:1,parameters:[]},render({ctx,width,height}){ctx.fillStyle='#60c8c0';ctx.fillRect(-width/2,-height/2,width,height);ctx.clearRect(-4,-4,8,8);}});
    const variants=[{type:'rect',fill:'#ffffff'},{type:'vector',parts:[{id:'v',type:'ellipse',x:0,y:0,w:32,h:24,fill:'#ffd23f'}]},
      {type:'image',assetId:'image'},{type:'text',text:'AB',fontSize:20,fontFamily:'monospace',fill:'#ffffff'},{type:'procedural',moduleId:'path-instance-test',moduleVersion:1,params:{}}],results=[];
    for(const source of variants){
      const scene={format:'tosampool-scene/v4',width:240,height:120,loop:2,background:{alpha:0},assets:{image:{type:'image',src:sample.toDataURL()}},entities:[
        {id:'owner',type:'vector',x:30,y:60,w:180,h:10,parts:[{id:'path',type:'line',x:0,y:0,x2:180,y2:0,stroke:null,extensions:{showSource:false,elements:{enabled:true,sourceId:'source',count:4,keepSource:false}}}]},
        {id:'source',x:200,y:10,w:32,h:24,...source}]};
      if(source.type==='text')EditorVNextTextState.update(scene,'source',{},document);
      scene.runtimeAssets=await EditorVNextAssetLoader.resolve(scene,{referencedOnly:true});
      const player=runtime.createRuntime(scene),canvas=document.createElement('canvas'),stats=player.renderTo(canvas,0),alpha=canvas.getContext('2d').getImageData(0,0,240,120).data.reduce((sum,v,i)=>sum+(i%4===3?v:0),0);player.dispose();
      results.push({type:source.type,builds:stats.pathSpriteBuilds,draws:stats.pathInstancesDrawn,alpha});
    }return results;
  });for(const result of typeChecks){assert.equal(result.builds,1,result.type);assert.equal(result.draws,4,result.type);assert.ok(result.alpha>0,result.type);}
  const mixes=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,render=(sourceBlend,carrierBlend,ownerBlend)=>{
      const scene={format:'tosampool-scene/v4',width:160,height:80,background:{color:'#608090',alpha:1},entities:[{id:'owner',type:'vector',x:20,y:40,w:120,h:1,blend:ownerBlend,parts:[{id:'path',type:'line',x:0,y:0,x2:120,y2:0,blend:carrierBlend,extensions:{showSource:false,elements:{enabled:true,sourceId:'source',count:3,keepSource:false}}}]},{id:'source',type:'rect',x:140,y:10,w:20,h:20,fill:'#c08040',blend:sourceBlend}]};
      const player=runtime.createRuntime(scene),canvas=document.createElement('canvas');player.renderTo(canvas,0);player.dispose();return canvas.toDataURL();
    };return{normal:render('normal','normal','normal'),source:render('difference','normal','normal'),part:render('normal','multiply','normal'),owner:render('normal','normal','multiply')};
  });assert.equal(mixes.normal,mixes.source,'不应继承来源与原场景的混合方式');assert.notEqual(mixes.normal,mixes.part,'不得覆盖载体图元混合');assert.notEqual(mixes.normal,mixes.owner,'对象最终混合仍应生效');
  const capture=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,canvas=document.createElement('canvas'),scene=JSON.parse(JSON.stringify(ToSampoolV4Workspace.current()));delete scene.timeline;scene.background={color:'#151a22',alpha:1};
    const part=scene.entities[0].parts[0];part.type='ellipse';part.x=0;part.y=0;part.w=280;part.h=140;delete part.x2;delete part.y2;part.extensions.elements.count=24;part.extensions.elements.scale=1.2;part.extensions.elements.orientation='path';scene.entities[0].x=80;scene.entities[0].y=70;scene.entities[0].w=280;scene.entities[0].h=140;
    const player=runtime.createRuntime(scene);player.renderTo(canvas,.5);player.dispose();return canvas.toDataURL();
  });if(process.argv.includes('--capture'))writeFileSync(resolve(root,'docs/architecture/v4-path-instances.png'),Buffer.from(capture.split(',')[1],'base64'));
  await page.locator('[data-instance-edit]').click();await move.waitFor({state:'visible'});const pending=await move.boundingBox();await page.mouse.move(pending.x+10,pending.y+10);await page.mouse.down();await page.mouse.move(pending.x+25,pending.y+12);
  await page.evaluate(()=>ToSampoolV4Workspace.createBlank({width:200,height:100,loop:2}));await page.mouse.up();assert.equal(await move.isVisible(),false);assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.length),0,'新项目不能被旧手势快照恢复污染');
  assert.deepEqual(errors,[]);console.log('✓ 元素排布浏览器：图元两Tab／对象三Tab／来源效果单次共享／动态继承／组／隐藏／扩框命中／样本移动旋转与取消／撤销／工程及HTML通过',JSON.stringify({oneBuild:rendered.one.stats.pathSpriteBuilds,manyBuild:rendered.many.stats.pathSpriteBuilds,onePixels:rendered.one.stats.workPixels,manyPixels:rendered.many.stats.workPixels}));
}finally{await browser.close();}
