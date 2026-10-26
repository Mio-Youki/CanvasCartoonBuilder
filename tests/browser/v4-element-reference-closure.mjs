import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.EditorV4ElementReferences&&typeof currentV4TestArtifact==='function');
  const rows=await page.evaluate(async()=>{
    if(state.playing)togglePlay();
    const clone=value=>JSON.parse(JSON.stringify(value)),blank=()=>{const s=EditorVNextScene.blank({width:180,height:110});s.background={alpha:0};return s;};
    const tile=document.createElement('canvas');tile.width=12;tile.height=12;const p=tile.getContext('2d');p.fillStyle='#f07840';p.fillRect(0,0,12,12);p.clearRect(4,4,4,4);
    const image={locator:tile.toDataURL(),mime:'image/png',width:12,height:12},result=[];
    for(const mode of ['mask','placement','endpoint','mixed','program']){
      const scene=blank();scene.assets={stamp:clone(image)};
      const path={id:'path',type:'line',x:0,y:15,x2:70,y2:15,stroke:'#77bbff',strokeWidth:2};
      const owner={id:'host',type:'vector',x:40,y:30,w:70,h:35,parts:[path],anim:{bob:{amount:3,period:2,angle:90}}};
      const source={id:'stamp',type:'image',assetId:'stamp',x:4,y:4,w:12,h:12,anim:{spin:{speed:20}}};
      const matte={id:'matte',type:'ellipse',x:40,y:25,w:60,h:45,fill:'#ffffff',anim:{bob:{amount:2,period:2,angle:0}}};
      if(mode==='mask'){owner.parts=[{id:'fill',type:'rect',x:0,y:0,w:70,h:35,fill:'#ee6633'}];owner.effects={mask:{type:'element',targetId:'matte'}};scene.entities=[owner,matte];}
      else{
        if(mode!=='endpoint')path.extensions={elements:{enabled:true,sourceId:'stamp',count:4,scale:1,keepSource:true}};
        if(mode==='endpoint'||mode==='mixed')path.pathEndpoints={enabled:true,type:'object',sourceId:'stamp',start:true,end:true};
        scene.entities=[owner,source];
        if(mode==='mixed'){owner.effects={mask:{type:'element',targetId:'matte'}};scene.entities.push(matte);}
      }
      let moduleSource=null,moduleId=null;
      if(mode==='program'){
        const manifest={format:'tosampool-scene-module/v1',id:'rc2-reference-program',version:1,timeDependent:true,assets:[],parameters:[{key:'amount',type:'number',default:2,min:1,max:20}]};moduleId=manifest.id;
        moduleSource=`ToSampoolRuntimeVNext.modules.sceneModules.register({manifest:${JSON.stringify(manifest)},render({ctx,width,height,params,time}){ctx.fillStyle='#f07840';ctx.fillRect(-width/2,-height/2,width,Math.max(1,params.amount+Math.round(Math.sin(time)*2)));}});`;
        scene.modules={[moduleId]:{manifest,locator:'data:text/javascript,'+encodeURIComponent(moduleSource)}};scene._moduleScope='ref-source';
        Object.assign(source,{type:'procedural',moduleId,moduleVersion:1,params:{amount:8}});delete source.assetId;
        await EditorVNextModuleLoader.trustAndLoad(scene,[moduleId],{scope:scene._moduleScope});
      }
      const before=JSON.stringify(scene),key=EditorV4ElementPresets.add(scene,'host'),bundle=await EditorV4Resources.capture(scene,[{kind:'element',id:key}]),target=blank();
      if(!moduleId)target.assets={stamp:{...clone(image),name:'旧同名'}};
      await EditorV4Resources.importInto(target,bundle);
      if(moduleId){target._moduleScope='ref-target';await EditorVNextModuleLoader.trustAndLoad(target,[moduleId],{scope:target._moduleScope});}
      const placed=EditorV4ElementPresets.instantiate(target,key,{x:60,y:40});
      const expected=clone(scene);delete expected.elementPresets;
      for(const [index,e]of expected.entities.entries()){e.x+=20;e.y+=10;if(index)e.referenceSourceOnly=true;}
      // Independently shift stored scene-space geometries; object IDs stay original.
      const project=await EditorVNextProjectPackage.build(target),opened=(await EditorVNextProjectPackage.restore(project.files)).scene;if(moduleId)opened._moduleScope=target._moduleScope;
      expected.runtimeAssets=await EditorVNextAssetLoader.resolve(expected,{referencedOnly:true});opened.runtimeAssets=await EditorVNextAssetLoader.resolve(opened,{referencedOnly:true});
      const a=ToSampoolRuntimeVNext.createRuntime(expected),b=ToSampoolRuntimeVNext.createRuntime(opened),c=document.createElement('canvas');let same=true,nonempty=true,atZero,stats;
      for(const time of [0,.5,1.25]){a.renderTo(c,time);const frame=c.toDataURL();if(!time)atZero=frame;nonempty=nonempty&&c.getContext('2d').getImageData(0,0,180,110).data.some((n,i)=>i%4===3&&n>0);stats=b.renderTo(c,time);same=same&&c.toDataURL()===frame;}a.dispose();b.dispose();
      const sourceMiss=EditorVNextCanvasHit.pick(opened,26,16,0)==null;
      delete opened.runtimeAssets;ToSampoolV4Workspace.replace(opened,{moduleScope:opened._moduleScope});await classicV4View.render();
      const sourceRows=document.querySelectorAll('#structure-tree [data-v4-entity-id]').length;
      const artifact=await currentV4TestArtifact();
      // One history step restores the whole graph, not just the visible root.
      classicV4Changes.clear();const count=ToSampoolV4Workspace.current().entities.length;
      classicV4Changes.run('放置完整引用实例',s=>EditorV4ElementPresets.instantiate(s,key,{x:90,y:60}));const after=ToSampoolV4Workspace.current().entities.length;classicV4Changes.undo();const undo=ToSampoolV4Workspace.current().entities.length===count;classicV4Changes.redo();const redo=ToSampoolV4Workspace.current().entities.length===after;
      result.push({mode,same,nonempty,sourceMiss,sourceRows,undo,redo,sourceUnchanged:JSON.stringify({...scene,elementPresets:undefined})===before,atZero,html:artifact.data,stats});
    }
    // The role must suppress only direct rendering, not the referenced content.
    const probe=blank();probe.entities=[{id:'only',type:'rect',x:4,y:4,w:12,h:12,fill:'#ff0000',referenceSourceOnly:true}];
    const canvas=document.createElement('canvas'),a=ToSampoolRuntimeVNext.createRuntime(probe);a.renderTo(canvas,0);const hidden=canvas.getContext('2d').getImageData(0,0,180,110).data.every((v,i)=>i%4!==3||v===0);a.dispose();delete probe.entities[0].referenceSourceOnly;
    const b=ToSampoolRuntimeVNext.createRuntime(probe);b.renderTo(canvas,0);const visible=canvas.getContext('2d').getImageData(0,0,180,110).data.some((v,i)=>i%4===3&&v>0);b.dispose();
    if(!hidden||!visible)throw Error('仅供引用角色未正确区分直接绘制');return result;
  });
  const exported=await browser.newPage();exported.on('pageerror',error=>errors.push(error.stack||String(error)));
  for(const row of rows){
    for(const key of ['same','nonempty','sourceMiss','undo','redo','sourceUnchanged'])assert.equal(row[key],true,row.mode+' '+key);
    assert.equal(row.sourceRows,1,row.mode+' tree shows root only');
    if(row.mode!=='mask')assert.equal(row.stats.pathSpriteBuilds,1,'source shared within a frame');
    await exported.evaluate(()=>window.requestAnimationFrame=()=>0);await exported.setContent(row.html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'));
    assert.equal(await exported.locator('[data-tosampool-error]').count(),0,row.mode+' export');assert.equal(await exported.locator('canvas').evaluate(c=>c.toDataURL()),row.atZero,row.mode+' exported pixels');
  }
  await exported.close();
  const oldPlayer=await browser.newPage();await oldPlayer.setContent('<script>window.ToSampoolRuntimeVNext={createRuntime(){},modules:{renderer:{}}};</script>'+rows[0].html);
  await oldPlayer.waitForFunction(()=>document.querySelector('[data-tosampool-error]'));
  assert.match(await oldPlayer.locator('[data-tosampool-error]').getAttribute('data-tosampool-error'),/不支持内部引用来源/);await oldPlayer.close();
  assert.deepEqual(errors,[]);console.log('✓ RC2-c2a浏览器：对象蒙版／排布／端点／共享与程序来源，重定位后三时刻非空像素、仅供引用不浮层／不抢点选／不占树、单次撤销重做、工程重开和正式HTML／旧Player门禁');
}finally{await browser.close();}
