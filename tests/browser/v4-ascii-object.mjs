import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(async()=>{
    const runtime=ToSampoolRuntimeVNext,{ascii,surfaces,sampling,sceneModules}=runtime.modules;
    const check=(v,m)=>{if(!v)throw Error(m);},read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.slice();
    const difference=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
    const effect={enabled:true,size:6,characters:' .#@',backgroundAlpha:0,color:'#f0b860',colorAlpha:1};
    const source=document.createElement('canvas');source.width=64;source.height=48;const ctx=source.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(4,4,56,40);ctx.clearRect(20,12,20,24);
    sceneModules.register({manifest:{format:'tosampool-scene-module/v1',id:'ascii-test-program',version:1,parameters:[]},render({ctx,width,height}){ctx.fillStyle='#f08040';ctx.fillRect(-width/2,-height/2,width,height);ctx.clearRect(-8,-8,16,16);}});
    const variants=[
      {type:'rect',fill:'#ffffff'},
      {type:'vector',parts:[{id:'a',type:'rect',x:0,y:0,w:32,h:48,fill:'#ffffff'},{id:'b',type:'ellipse',x:32,y:0,w:32,h:48,fill:'#80d0a0'}]},
      {type:'image',assetId:'image'},
      {type:'text',text:'TEST',fontSize:24,fontFamily:'monospace',fill:'#ffffff'},
      {type:'procedural',moduleId:'ascii-test-program',moduleVersion:1,params:{}}
    ];
    const render=async(entity,{time=0,tracks={},pipeline,mask,rotate=0,overlay=false}={})=>{
      const scene={format:'tosampool-scene/v4',width:160,height:100,loop:2,background:{color:'#203050'},assets:{image:{type:'image',src:source.toDataURL()}},entities:[{id:'subject',x:32,y:24,w:64,h:48,rot:rotate,scaleX:1,scaleY:1,...entity}],timeline:{tracks}};
      if(pipeline)scene.entities[0].effects.pipeline=pipeline;if(mask)scene.entities[0].effects.mask=mask;
      if(entity.type==='text')EditorVNextTextState.update(scene,'subject',{},document);
      scene.runtimeAssets=await EditorVNextAssetLoader.resolve(scene,{referencedOnly:true});
      const player=runtime.createRuntime(scene),canvas=document.createElement('canvas');player.renderTo(canvas,time);const pixels=read(canvas);player.dispose();return pixels;
    };
    const types=[];
    for(const entity of variants){
      const plain=await render(entity),processed=await render({...entity,effects:{sample:{'ascii-mapping':effect}}});
      check(difference(plain,processed)>0,'对象ASCII没有改变 '+entity.type);
      check(processed[0]===plain[0]&&processed[1]===plain[1]&&processed[2]===plain[2],'对象ASCII影响其他区域 '+entity.type);
      types.push(entity.type);
    }
    const object={type:'rect',fill:'#ffffff',effects:{sample:{'ascii-mapping':effect}}};
    const tracks={'effect:object:subject:ascii-mapping':{segments:[{f:[0,.5],type:'step',values:{size:4}},{f:[.5,1],type:'step',values:{size:9,originalBackground:true,blend:'multiply'}}]}};
    const a=await render(object,{time:.25,tracks}),b=await render(object,{time:1.25,tracks});check(difference(a,b)>0,'对象Step未改变画面');check(!difference(a,await render(object,{time:.25,tracks})),'seek不确定');
    check(difference(await render(object),await render(object,{rotate:25}))>0,'对象旋转无效');
    const invisible=await render({...object,alpha:0});check(invisible.every((value,index)=>value===[32,48,80,255][index%4]),'ASCII绕过对象最终透明度');
    const decorated={...object,effects:{sample:{'ascii-mapping':effect},decorate:{'tint-overlay':{enabled:true,color:'#d04080',alpha:1,blend:'normal'}}}};
    check(difference(await render(decorated,{pipeline:['mask','decorate','sample']}),await render(decorated,{pipeline:['mask','sample','decorate']}))>0,'加样／采样调序未生效');
    const masked={...object,effects:{sample:{'ascii-mapping':{...effect,backgroundAlpha:1}}}},mask={type:'rect',x:43,y:24,w:25,h:48};
    check(difference(await render(masked,{mask,pipeline:['mask','decorate','sample']}),await render(masked,{mask,pipeline:['decorate','sample','mask']}))>0,'蒙版顺序未生效');
    const pool=surfaces.create(),group={controllers:{'sampling-grid':{size:3}},'ascii-mapping':effect};
    const actual=sampling.apply(source,group,pool,{time:0}),base=sampling.apply(source,{controllers:group.controllers},pool,{time:0}),expected=ascii.apply(base,effect,pool,{time:0},3);
    check(!difference(read(actual),read(expected)),'对象采样格重复缩放字形');pool.release(actual);pool.release(base);pool.release(expected);pool.clear();
    const prototypes=WebGLRenderingContext.prototype,original=prototypes.texImage2D;let uploads=0;
    prototypes.texImage2D=function(...args){if(this.getParameter(this.ACTIVE_TEXTURE)===this.TEXTURE2)uploads++;return original.apply(this,args);};
    ascii.setBackend('auto');
    try{for(let i=0;i<20;i++){const output=ascii.apply(source,{...effect,characters:i%2?' .#@':' .+%'},pool,{},1);pool.release(output);}if(ascii.getLastBackend()==='gpu')check(uploads===2,'多对象交替图集反复上传 '+uploads);}
    finally{prototypes.texImage2D=original;pool.clear();}
    const create=prototypes.createTexture,remove=prototypes.deleteTexture,live=new Set();let peak=0;
    prototypes.createTexture=function(){const texture=create.call(this);live.add(texture);peak=Math.max(peak,live.size);return texture;};
    prototypes.deleteTexture=function(texture){live.delete(texture);return remove.call(this,texture);};
    try{for(const characters of [' .',' :',' -',' +',' *',' #',' @']){const out=ascii.apply(source,{...effect,characters},pool,{},1);pool.release(out);}check(peak<=7,'GPU字形LRU无上限 '+peak);pool.clear();check(live.size===0,'清理后GPU字形纹理残留');}
    finally{prototypes.createTexture=create;prototypes.deleteTexture=remove;pool.clear();}
    const anchorBounds=distance=>{
      const player=runtime.createRuntime({format:'tosampool-scene/v4',width:160,height:100,entities:[{id:'anchored',type:'rect',x:32,y:24,w:64,h:48,fill:'#fff',effects:{decorate:{projection:{enabled:true,distance,angle:180,color:'#000',alpha:1}},sample:{'ascii-mapping':{...effect,size:8}}}}]});
      const frame=runtime.modules.frame.create(player.scene,0),entity=player.scene.entities[0],values=frame.valuesFor(entity),capsule=runtime.modules.objects.createCapsule(player.scene,entity,frame,{maskedObjects:0},pool);
      const phase=[((capsule.bounds.x-Math.floor(values.worldMatrix[4]))%8+8)%8,((capsule.bounds.y-Math.floor(values.worldMatrix[5]))%8+8)%8];
      pool.release(capsule.capsule);pool.clear();player.dispose();return phase;
    };
    check(anchorBounds(0).every(v=>v===0)&&anchorBounds(19).every(v=>v===0),'装饰改变胶囊边界后格点跳动');
    const particles=runtime.createRuntime({format:'tosampool-scene/v4',width:160,height:100,entities:[{id:'sprite',type:'rect',w:24,h:24,fill:'#fff',particleSourceOnly:true,effects:{sample:{'ascii-mapping':effect}}},{id:'emitter',type:'particle-emitter',w:160,h:100,particle:{sourceId:'sprite',count:30,life:2,speed:8,alpha:1}}]});
    const target=document.createElement('canvas'),stats=particles.renderTo(target,.25);check(stats.particleSpriteBuilds===1&&stats.particlesDrawn===30,'粒子未共用ASCII精灵');particles.dispose();
    const measurements=[];
    for(const backend of ['auto','cpu'])for(const count of [1,8]){
      ascii.setBackend(backend);
      const entities=Array.from({length:count},(_,i)=>({id:'bench-'+i,type:'rect',x:16+i%4*140,y:16+Math.floor(i/4)*140,w:120,h:96,fill:'#b4d080',effects:{sample:{'ascii-mapping':{...effect,characters:i%2?' .#@':' .+%'}}}}));
      const player=runtime.createRuntime({format:'tosampool-scene/v4',width:640,height:360,entities}),canvas=document.createElement('canvas'),samples=[];
      for(let i=0;i<14;i++){const start=performance.now();player.renderTo(canvas,i/30);if(i>3)samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);measurements.push({backend,count,objectSize:[120,96],edges:false,median:samples[5],p95:samples.at(-1)});player.dispose();
    }
    ascii.setBackend('auto');
    return {types,step:true,maskOrder:true,gridParity:true,alternatingGlyphUploads:uploads,gpuTexturePeak:peak,anchorStable:true,particleSpriteBuilds:stats.particleSpriteBuilds,measurements};
  });
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:160,height:100,loop:2});ToSampoolV4Workspace.mutate(scene=>scene.entities.push({id:'ascii-object',type:'rect',x:24,y:20,w:80,h:56,fill:'#ffffff'}));classicV4View.select('ascii-object');});
  await page.click('#element-inspector-tabs [data-element-inspector="sampling"]');
  const card=page.locator('#inspector-context [data-v4-effect-id="ascii-mapping"]');
  const field=label=>card.locator('.global-field').filter({has:page.locator('span').filter({hasText:new RegExp('^'+label+'$')})});
  await field('启用').locator('input').check();assert.equal(await card.getAttribute('data-v4-effect-scope'),'object');
  await field('相对尺寸').locator('input').fill('5');await field('相对尺寸').locator('input').press('Tab');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].effects.sample['ascii-mapping'].size),5);
  await page.evaluate(()=>classicV4Changes.undo());assert.equal(await field('相对尺寸').locator('input').inputValue(),'8');
  await field('原图背景').locator('input').check();await field('混合模式').locator('select').selectOption('screen');
  const html=await page.evaluate(async()=>{const packed=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current()),scene=(await EditorVNextProjectPackage.restore(packed.files)).scene;if(scene.entities[0].effects.sample['ascii-mapping'].blend!=='screen')throw Error('对象ASCII项目恢复丢值');return EditorVNextDeliveryBuilder.embedHtml({scene,name:'object-ascii',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;});
  const player=await browser.newPage();player.on('pageerror',e=>errors.push(String(e)));await player.setContent(html);await player.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await player.close();
  assert.deepEqual(errors,[]);console.log('对象ASCII：五类对象／采样格／蒙版顺序／旋转／Step／图集缓存／Inspector／撤销／项目／导出通过',JSON.stringify(result));
}finally{await browser.close();}
