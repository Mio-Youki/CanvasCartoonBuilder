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
  const result=await page.evaluate(()=>{
    const {ascii,surfaces,blend}=ToSampoolRuntimeVNext.modules,pool=surfaces.create();
    const source=document.createElement('canvas');source.width=96;source.height=64;
    const ctx=source.getContext('2d'),g=ctx.createLinearGradient(0,0,96,64);g.addColorStop(0,'#304060');g.addColorStop(1,'#df8040');ctx.fillStyle=g;ctx.fillRect(8,8,80,48);
    const read=c=>c.getContext('2d').getImageData(0,0,96,64).data.slice();
    const config={size:8,characters:' .#@',color:'#20e090',colorAlpha:.6,background:'#ff0000',backgroundAlpha:1};
    const modes=['normal','multiply','darken','screen','lighten','overlay','soft-light','difference','luminosity','saturation','hue','color'];
    const checks=[];ascii.setBackend('cpu');
    for(const mode of modes){
      const glyph=ascii.apply(source,{...config,backgroundAlpha:0},pool,{},1);
      const expected=document.createElement('canvas');expected.width=96;expected.height=64;
      const ec=expected.getContext('2d');ec.drawImage(source,0,0);ec.globalCompositeOperation=blend.toCanvas(mode);ec.drawImage(glyph,0,0);
      const actual=ascii.apply(source,{...config,originalBackground:true,blend:mode},pool,{},1),a=read(actual),e=read(expected);
      if(!a.every((v,i)=>v===e[i]))throw Error('原图背景合成不符 '+mode);
      if(a[3]!==0)throw Error('透明区域被背景填实');
      checks.push(mode);pool.release(actual);pool.release(glyph);
    }
    const cpu=ascii.apply(source,{...config,originalBackground:true,blend:'screen'},pool,{},1),a=read(cpu);pool.release(cpu);
    ascii.setBackend('auto');const gpu=ascii.apply(source,{...config,originalBackground:true,blend:'screen'},pool,{},1),b=read(gpu);
    const error=a.reduce((m,v,i)=>Math.max(m,Math.abs(v-b[i])),0);pool.release(gpu);
    const unchanged=ascii.apply(source,{...config,colorAlpha:0,originalBackground:true},pool,{},1),c=read(unchanged),original=read(source);
    if(!c.every((v,i)=>v===original[i]))throw Error('透明字符不能完整保留原图');pool.release(unchanged);pool.clear();
    const scene={format:'tosampool-scene/v4',width:96,height:64,loop:2,background:{color:'#304060'},entities:[],sceneEffects:{sample:{'ascii-mapping':{enabled:true,...config}}},timeline:{tracks:{'effect:scene:sample:ascii-mapping':{segments:[{f:[0,.5],type:'step',values:{originalBackground:false}},{f:[.5,1],type:'step',values:{originalBackground:true,blend:'screen'}}]}}}};
    const player=ToSampoolRuntimeVNext.createRuntime(scene),target=document.createElement('canvas');player.renderTo(target,.25);const first=read(target);player.renderTo(target,1.25);const second=read(target);player.renderTo(target,.25);const repeated=read(target);player.dispose();
    if(!first.some((v,i)=>v!==second[i])||!first.every((v,i)=>v===repeated[i]))throw Error('原图背景／混合模式Step不正确');
    const performanceSamples=[];
    for(const [width,height] of [[640,360],[1920,1080]]){
      source.width=width;source.height=height;const paint=source.getContext('2d');paint.fillStyle='#507080';paint.fillRect(0,0,width,height);
      const measure=originalBackground=>{const samples=[];for(let i=0;i<14;i++){const start=performance.now(),out=ascii.apply(source,{...config,originalBackground},pool,{},1);pool.release(out);if(i>3)samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);return {median:samples[5],p95:samples.at(-1)};};
      performanceSamples.push({width,height,plain:measure(false),originalBackground:measure(true)});
    }
    pool.clear();return {modes:checks,cpuGpuMaxError:error,step:true,performanceSamples};
  });
  assert.ok(result.cpuGpuMaxError<=2,JSON.stringify(result));
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:96,height:64,loop:2});classicV4View.select(null);});
  await page.click('#global-inspector-tabs [data-global-inspector="sampling"]');
  const card=page.locator('#inspector-context [data-v4-effect-id="ascii-mapping"]');
  const field=label=>card.locator('.global-field').filter({has:page.locator('span').filter({hasText:new RegExp('^'+label+'$')})});
  await field('启用').locator('input').check();
  assert.equal(await field('混合模式').count(),0);
  await field('原图背景').locator('input').check();
  assert.equal(await field('背景颜色').count(),0);
  await field('混合模式').locator('select').selectOption('multiply');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'].blend),'multiply');
  await page.evaluate(()=>classicV4Changes.undo());
  assert.equal(await field('混合模式').locator('select').inputValue(),'normal');
  const exported=await page.evaluate(async()=>{
    const packed=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current()),scene=(await EditorVNextProjectPackage.restore(packed.files)).scene;
    if(!scene.sceneEffects.sample['ascii-mapping'].originalBackground)throw Error('工程保存丢失原图背景');
    return EditorVNextDeliveryBuilder.embedHtml({scene,name:'ascii-overlay',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;
  });
  const player=await browser.newPage();await player.setContent(exported);await player.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await player.close();
  assert.deepEqual(errors,[]);console.log('ASCII 原图背景 / 12混合模式 / 透明输入 / CPU-GPU / 渐进参数 / 撤销 / 项目与导出通过',JSON.stringify(result));
}finally{await browser.close();}
