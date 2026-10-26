import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);
  await page.waitForFunction(()=>window.EditorV4ElementPresets&&typeof currentV4TestArtifact==='function');
  const result=await page.evaluate(async()=>{
    if(state.playing)togglePlay();
    const clone=value=>JSON.parse(JSON.stringify(value)),blank=()=>EditorVNextScene.blank({width:160,height:96});
    const surface=(color,mask=false)=>{
      const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;const c=canvas.getContext('2d');
      c.fillStyle=color;c.fillRect(0,0,mask?8:16,16);
      if(!mask){c.fillStyle='#2233bb';c.fillRect(8,8,8,8);}
      return{locator:canvas.toDataURL(),mime:'image/png',width:16,height:16};
    };
    const photo=blank(),original=surface('#ee7733');
    photo.assets={original,prepared:{...clone(original),sourceAssetId:'original',recipe:{width:8,height:8},alphaMask:{...surface('#ffffff',true),mode:'replace-alpha'}}};
    photo.entities=[{id:'picture',type:'image',assetId:'prepared',x:24,y:18,w:48,h:48,alpha:.8,anim:{bob:{amount:2,period:2,angle:90}}}];
    const sequence=blank();sequence.assets={walk:{...clone(original),fps:2,frames:[clone(original),surface('#33aa55')]}};
    sequence.entities=[{id:'walk',type:'image',assetId:'walk',x:24,y:18,w:48,h:48}];
    const text=blank();text.entities=[{id:'label',type:'text',text:'AB图',fontSize:20,fontFamily:'serif',textCompletion:66,textCursor:{enabled:true,period:1,style:'bar'},fill:'#333333',x:20,y:20}];
    EditorVNextTextState.update(text,'label',{},document);
    const pattern=blank();pattern.entities=[{id:'pattern',type:'vector',x:24,y:18,w:80,h:48,parts:[{id:'bracket',type:'custom',x:0,y:0,w:80,h:48,stroke:'#dd6633',strokeWidth:3,recipe:{id:'brackets',version:1,params:{layout:'corners',armX:12,armY:12}}}]}];
    const declarative=blank(),definition={format:'tosampool-pattern-definition/v1',id:'rc2-browser-chevron',version:1,name:'折角',parameters:[{key:'reach',label:'长度',type:'number',default:12,min:1,max:30}],paths:[{mode:'stroke',points:[[0,0],[{params:{reach:1}},0],[{params:{reach:1}},20]]}]};
    EditorV4PatternLifecycle.install(declarative,definition,{createPreset:false});
    declarative.entities=[{id:'declarative',type:'vector',x:24,y:18,w:40,h:30,parts:[{id:'local',type:'custom',x:0,y:0,w:40,h:30,stroke:'#3355cc',strokeWidth:3,recipe:{id:definition.id,version:1,params:{reach:18},definition}}]}];
    const program=blank(),manifest={format:'tosampool-scene-module/v1',id:'rc2.asset-program',version:1,title:'贴片',timeDependent:true,assets:['stamp'],parameters:[{key:'distance',label:'幅度',type:'number',default:5,min:0,max:20}]};
    const source=`ToSampoolRuntimeVNext.modules.sceneModules.register({manifest:${JSON.stringify(manifest)},render({ctx,width,height,time,params,assets}){const a=assets.stamp;ctx.drawImage(a.image||a,-width/2+Math.round(Math.sin(time)*params.distance),-height/2,width-10,height);}});`;
    program.assets={stamp:clone(original)};program.modules={[manifest.id]:{manifest,locator:'data:text/javascript,'+encodeURIComponent(source)}};program._moduleScope='rc2b-source';
    program.entities=[{id:'program',type:'procedural',moduleId:manifest.id,moduleVersion:1,params:{distance:11},x:24,y:18,w:48,h:48}];
    await EditorVNextModuleLoader.trustAndLoad(program,[manifest.id],{scope:program._moduleScope});

    const rows=[];
    for(const [name,input]of [['photo',photo],['sequence',sequence],['text',text],['pattern',pattern],['declarative',declarative],['program',program]]){
      const initial=JSON.stringify(input),key=EditorV4ElementPresets.add(input,input.entities[0].id);
      const bundle=await EditorV4Resources.capture(input,[{kind:'element',id:key}]),target=blank();
      // Force all ordinary image identifiers through a conflicting namespace.
      if(name!=='program')for(const id of Object.keys(input.assets||{}))target.assets[id]=surface('#aa00aa');
      const mapping=await EditorV4Resources.importInto(target,bundle);
      const unused=await EditorVNextAssetLoader.resolve(target,{referencedOnly:true});
      if(Object.keys(unused).length)throw Error('未使用预设被提前解码：'+name);
      if(name==='program'){target._moduleScope='rc2b-target';await EditorVNextModuleLoader.trustAndLoad(target,[manifest.id],{scope:target._moduleScope});}
      const instance=EditorV4ElementPresets.instantiate(target,mapping.elements[key],{x:input.entities[0].x,y:input.entities[0].y});
      if(name==='text')instance.fontFamily='intentionally-missing-font'; // Saved glyph appearance must survive.
      const project=await EditorVNextProjectPackage.build(target),opened=(await EditorVNextProjectPackage.restore(project.files)).scene;
      if(name==='program')opened._moduleScope=target._moduleScope;
      input.runtimeAssets=await EditorVNextAssetLoader.resolve(input,{referencedOnly:true});opened.runtimeAssets=await EditorVNextAssetLoader.resolve(opened,{referencedOnly:true});
      const a=ToSampoolRuntimeVNext.createRuntime(input),b=ToSampoolRuntimeVNext.createRuntime(opened),canvas=document.createElement('canvas'),frames=[];let equal=true;
      for(const time of [0,.5,1.25]){a.renderTo(canvas,time);const expected=canvas.toDataURL();frames.push(expected);b.renderTo(canvas,time);equal=equal&&canvas.toDataURL()===expected;}a.dispose();b.dispose();
      // Use the actual editor delivery path, including recipe/Alpha freezing.
      delete opened.runtimeAssets;ToSampoolV4Workspace.replace(opened,{moduleScope:opened._moduleScope});
      const artifact=await currentV4TestArtifact();
      const unchanged=JSON.stringify({...input,runtimeAssets:undefined,elementPresets:undefined})===initial;
      rows.push({name,equal,unchanged,dynamic:frames[0]!==frames[1],expected:frames[0],html:artifact.data});
    }
    return rows;
  });
  const exported=await browser.newPage();exported.on('pageerror',error=>errors.push(String(error)));
  for(const row of result){
    assert.equal(row.equal,true,row.name+' fixed-time pixels');assert.equal(row.unchanged,true,row.name+' source unchanged');
    if(['photo','sequence','text','program'].includes(row.name))assert.equal(row.dynamic,true,row.name+' still animated');
    await exported.evaluate(()=>window.requestAnimationFrame=()=>0);
    await exported.setContent(row.html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'));
    assert.equal(await exported.locator('[data-tosampool-error]').count(),0,row.name+' export failure');
    assert.equal(await exported.locator('canvas').evaluate(canvas=>canvas.toDataURL()),row.expected,row.name+' delivery frame');
  }
  await exported.close();assert.deepEqual(errors,[]);
  console.log('✓ RC2-b浏览器：图片recipe／Alpha、序列、文字图集、图样、程序素材；跨项目重名／未用不解码／工程重开／三时刻像素／正式测试场景画面一致');
}finally{await browser.close();}
