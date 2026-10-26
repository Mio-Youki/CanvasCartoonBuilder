import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);
  await page.waitForFunction(()=>window.EditorVNextMaskState?.portable&&typeof currentV4TestArtifact==='function');
  const result=await page.evaluate(async()=>{
    if(state.playing)togglePlay();
    const clone=value=>JSON.parse(JSON.stringify(value)),blank=()=>EditorVNextScene.blank({width:160,height:96}),canvas=document.createElement('canvas');
    const matte=document.createElement('canvas');matte.width=16;matte.height=16;const ink=matte.getContext('2d');
    ink.fillStyle='#ffffff';ink.fillRect(0,0,5,16);ink.fillStyle='#808080';ink.fillRect(5,0,5,16);ink.fillStyle='#000000';ink.fillRect(10,0,6,16);
    const descriptor={locator:matte.toDataURL(),mime:'image/png',width:16,height:16},rows=[];
    for(const type of ['rect','ellipse','poly','alpha','luma'])for(const follow of [false,true])for(const invert of [false,true]){
      const scene=blank();scene.background={alpha:0};scene.assets={matte:clone(descriptor)};
      const owner={id:'source',type:'rect',x:30,y:20,w:48,h:32,rot:17,scaleX:1.1,scaleY:.9,skewX:8,fill:'#ee6633',alpha:.8,anim:{bob:{amount:3,period:2,angle:90},spin:{speed:4}}};
      const baseOwner=clone(owner);delete baseOwner.anim;
      const baseScene={...scene,entities:[baseOwner]},base=ToSampoolRuntimeVNext.modules.frame.create(baseScene,0).valuesFor(baseOwner).worldMatrix;
      const mask=type==='poly'?{type:'poly',points:[[28,17],[60,21],[62,57],[31,54]]}:{type:type==='luma'?'alpha':type,x:28,y:17,w:34,h:40};
      if(type==='alpha'||type==='luma'){mask.assetId='matte';mask.mode=type==='luma'?'luma':'alpha';}
      mask.follow=follow;mask.invert=invert;if(follow)mask.followMatrix=base;
      owner.effects={pipeline:['mask','decorate','sample'],mask};scene.entities=[owner];
      const initial=JSON.stringify(scene),key=EditorV4ElementPresets.add(scene,'source'),bundle=await EditorV4Resources.capture(scene,[{kind:'element',id:key}]);
      const target=blank();target.background={alpha:0};target.assets={matte:{...clone(descriptor),name:'目标旧同名'}};
      await EditorV4Resources.importInto(target,bundle);const unused=await EditorVNextAssetLoader.resolve(target,{referencedOnly:true});
      if(Object.keys(unused).length)throw Error('蒙版预设未放置前不应解码图片');
      const placed=EditorV4ElementPresets.instantiate(target,key,{x:80,y:40});
      const reference=clone(scene);delete reference.elementPresets;
      const expectedOwner=reference.entities[0],expectedMask=expectedOwner.effects.mask;expectedOwner.x=80;expectedOwner.y=40;
      // Independent oracle: old scene geometry and anchor translated by (50,20).
      if(type==='poly')expectedMask.points=expectedMask.points.map(([x,y])=>[x+50,y+20]);else{expectedMask.x+=50;expectedMask.y+=20;}
      if(follow){expectedMask.followMatrix[4]+=50;expectedMask.followMatrix[5]+=20;}
      const project=await EditorVNextProjectPackage.build(target),opened=(await EditorVNextProjectPackage.restore(project.files)).scene;
      reference.runtimeAssets=await EditorVNextAssetLoader.resolve(reference,{referencedOnly:true});opened.runtimeAssets=await EditorVNextAssetLoader.resolve(opened,{referencedOnly:true});
      const a=ToSampoolRuntimeVNext.createRuntime(reference),b=ToSampoolRuntimeVNext.createRuntime(opened);let same=true,nonempty=true,atZero;
      for(const time of [0,.5,1.25]){
        a.renderTo(canvas,time);const expected=canvas.toDataURL();if(time===0)atZero=expected;
        nonempty=nonempty&&canvas.getContext('2d').getImageData(0,0,160,96).data.some((value,index)=>index%4===3&&value>0);
        b.renderTo(canvas,time);same=same&&canvas.toDataURL()===expected;
      }
      // Moving only the object after placement must retain the follow on/off semantics.
      expectedOwner.x+=3;opened.entities[0].x+=3;
      const c=ToSampoolRuntimeVNext.createRuntime(reference),d=ToSampoolRuntimeVNext.createRuntime(opened);
      c.renderTo(canvas,.5);const moved=canvas.toDataURL();d.renderTo(canvas,.5);same=same&&moved===canvas.toDataURL();
      a.dispose();b.dispose();c.dispose();d.dispose();opened.entities[0].x-=3;
      delete opened.runtimeAssets;ToSampoolV4Workspace.replace(opened);
      const artifact=await currentV4TestArtifact();
      rows.push({name:type+'-'+follow+'-'+invert,same,nonempty,unchanged:JSON.stringify({...scene,elementPresets:undefined})===initial,atZero,html:artifact.data,maskAsset:placed.effects.mask.assetId});
    }
    return rows;
  });
  assert.equal(result.length,20);
  const exported=await browser.newPage();exported.on('pageerror',error=>errors.push(error.stack||String(error)));
  for(const row of result){
    assert.equal(row.same,true,row.name+' shifted fixed-time pixels');assert.equal(row.nonempty,true,row.name+' cannot pass with empty rendering');assert.equal(row.unchanged,true,row.name+' source');
    await exported.evaluate(()=>window.requestAnimationFrame=()=>0);await exported.setContent(row.html);
    await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'));
    assert.equal(await exported.locator('[data-tosampool-error]').count(),0,row.name+' export');
    assert.equal(await exported.locator('canvas').evaluate(canvas=>canvas.toDataURL()),row.atZero,row.name+' exported pixels');
  }
  await exported.close();assert.deepEqual(errors,[]);
  console.log('✓ RC2-c1浏览器：20组矩形／椭圆／多边形／Alpha／luma × 跟随 × 反相；重定位／三时刻／移动后语义／非空画面／工程重开／正式HTML像素一致');
}finally{await browser.close();}
