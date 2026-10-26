/* Same integration scenario for Edge and the existing desktop WebView. */
(function(global){
  'use strict';
  const track='effect:scene:sample:ascii-mapping';
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  function hash(canvas){
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let value=2166136261;for(let i=0;i<data.length;i++)value=Math.imul(value^data[i],16777619);
    return (value>>>0).toString(16);
  }
  function make(kind='combo',width=640,height=360){
    const image=document.createElement('canvas');image.width=160;image.height=90;
    const ctx=image.getContext('2d'),gradient=ctx.createLinearGradient(0,0,160,90);
    gradient.addColorStop(0,'#072b50');gradient.addColorStop(.45,'#f9c54e');gradient.addColorStop(1,'#ef4174');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,160,90);ctx.fillStyle='#fff';ctx.font='17px monospace';ctx.fillText('ASCII / CRT',13,40);
    ctx.strokeStyle='#16334b';ctx.lineWidth=2;ctx.strokeRect(9,8,140,70);ctx.beginPath();ctx.moveTo(8,82);ctx.lineTo(149,10);ctx.stroke();
    const mask={type:'ellipse',x:width*.06,y:height*.06,w:width*.88,h:height*.88};
    const ascii={enabled:true,size:6,glyphRatio:2/3,edges:true,colorMode:'original',edgeSensitivity:.75,edgeCoverage:.25};
    if(kind!=='ascii')ascii.mask=mask;
    const sample={'ascii-mapping':ascii};
    if(kind==='combo')sample['crt-display']={enabled:true,curvature:0,scanline:.18,phosphor:.1,rgbShift:0,glow:0,vignette:0,noise:0,flicker:0,sweep:0,mask};
    return{format:'tosampool-scene/v4',width,height,loop:4,background:{color:'#142334',alpha:1},
      assets:{source:{id:'source',name:'验收渐变图',locator:image.toDataURL(),width:160,height:90}},
      entities:[{id:'image',name:'动态图片',type:'image',assetId:'source',x:width*.08,y:height*.08,w:width*.84,h:height*.84,anim:{bob:{amount:height*.02,period:4,angle:0,curve:'sine'}}}],
      sceneEffects:{sample},timeline:{tracks:{[track]:{segments:[{f:[0,.5],type:'step',values:{size:6}},{f:[.5,1],type:'step',values:{size:9}}]}}}};
  }
  async function pause(){if(state.playing)togglePlay();await wait(50);}
  async function render(time){state.t=time;await classicV4View.render();return hash(classicV4View.canvas);}
  async function functional(){
    await pause();const quality=document.querySelector('#preview-quality');quality.value='full';quality.dispatchEvent(new Event('change',{bubbles:true}));
    const results=[];
    for(const kind of ['ascii','masked','combo']){
      ToSampoolV4Workspace.replace(make(kind));classicV4View.select(null);await wait(100);
      const first=await render(.25),moving=await render(1),step=await render(2.75),repeat=await render(.25);
      assert(first===repeat,kind+' 固定时间不可重复');assert(first!==moving,kind+' 动态画面未变化');assert(first!==step,kind+' Step未作用');
      classicV4Changes.run('ASCII验收修改当前段',scene=>{scene.timeline.tracks[track].segments[0].values.size=12;});
      const changed=await render(.25);assert(changed!==first,kind+' 修改未反映画面');
      classicV4Changes.undo();const undone=await render(.25);assert(undone===first,kind+' 撤销未恢复画面');
      const api=ToSampoolRuntimeVNext,ascii=api.modules.ascii,crt=api.modules.crtScreen;
      const config=ToSampoolV4Workspace.current().sceneEffects.sample['ascii-mapping'];
      const sizes=[.25,2.75].map(time=>api.modules.frame.create(ToSampoolV4Workspace.current(),time).effectValuesFor('scene','sample','ascii-mapping',config).size);
      assert(sizes[0]===6&&sizes[1]===9,kind+' 当前时段的Step取值错误');
      ascii.setBackend('cpu');if(kind==='combo')crt.setBackend('cpu');const cpuHash=await render(.25);
      assert(ascii.getLastBackend()==='cpu'&&ascii.getLastAnalysisBackend()==='cpu','未执行完整CPU路径');
      ascii.setBackend('auto');crt.setBackend('auto');assert(await render(.25)===first,'CPU切回GPU后画面污染');
      if(kind!=='ascii'){
        const corner=classicV4View.canvas.getContext('2d').getImageData(0,0,1,1).data;
        assert(corner[0]===20&&corner[1]===35&&corner[2]===52&&corner[3]===255,'滤镜越过蒙版污染画布角落');
      }
      results.push({kind,first,moving,step,repeat,changed,undone,cpuHash,cpuFallback:true,sizes,analysis:ascii.getLastAnalysisBackend()});
    }
    assert(results[0].first!==results[1].first,'启用蒙版没有改变画面');
    assert(results[1].first!==results[2].first,'叠加CRT没有改变画面');
    // Same live editor, repeated document replacement, then reconstruct original.
    const original=make('combo');const originalHash=await render(.25);
    for(let i=0;i<8;i++){
      ToSampoolV4Workspace.createBlank({width:96,height:64,loop:2});await classicV4View.render();
      ToSampoolV4Workspace.replace(original);await render(.25);
    }
    assert(await render(.25)===originalHash,'连续开关项目污染画面');
    const packed=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current());
    const restored=(await EditorVNextProjectPackage.restore(packed.files)).scene;
    ToSampoolV4Workspace.replace(restored);assert(await render(.25)===originalHash,'项目重开画面变化');
    const artifact=EditorVNextDeliveryBuilder.embedHtml({scene:restored,name:'ascii-host-acceptance',runtimeSource:global.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__});
    const iframe=document.createElement('iframe');iframe.style.cssText='position:fixed;width:320px;height:180px;left:-10000px;top:0';
    iframe.srcdoc=artifact.data;document.body.append(iframe);
    try{
      let ready=false;
      for(let i=0;i<80;i++){await wait(50);const doc=iframe.contentDocument;
        const error=doc?.querySelector('[data-tosampool-error]');assert(!error,'导出报错 '+error?.textContent);
        if(doc?.querySelector('[data-tosampool-ready="1"]')){ready=true;break;}}
      assert(ready,'导出HTML未就绪');
      const output=iframe.contentDocument.querySelector('canvas');assert(output&&output.width===640,'导出Canvas尺寸不正确');
      const pixels=output.getContext('2d').getImageData(0,0,output.width,output.height).data,colors=new Set();
      for(let i=0;i<pixels.length;i+=4)if(pixels[i+3])colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);
      assert(colors.size>2,'导出画面为空或纯色');
    }finally{iframe.remove();}
    return{results,reopens:8,projectRestored:true,exportReady:true,runtime:ToSampoolV4Workspace.getRuntimeMetrics()};
  }
  async function performanceRun(){
    await pause();const results=[];
    const percentile=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
    for(const [width,height] of [[640,360],[1280,720],[1920,1080]]){
      ToSampoolV4Workspace.replace(make('combo',width,height));await wait(100);
      const samples=[];
      for(let i=0;i<36;i++){
        await new Promise(requestAnimationFrame);state.t=i/30;
        const start=performance.now();await classicV4View.render();
        const duration=performance.now()-start;if(i>=6)samples.push(duration);
      }
      results.push({width,height,samples:samples.length,median:percentile(samples,.5),p95:percentile(samples,.95),max:Math.max(...samples),editor:classicV4View.performance()});
    }
    ToSampoolV4Workspace.replace(make('combo'));await render(0);
    const before=classicV4View.performance();document.querySelector('#tl-play').click();await wait(3200);document.querySelector('#tl-play').click();
    const after=classicV4View.performance();assert(!state.playing,'播放暂停状态不同步');assert(state.t>0,'播放轴未前进');
    return{results,playback:{duration:3200,time:state.t,renders:after.scheduler.renders-before.scheduler.renders,rollingRenderP95:after.renderP95,rollingFrameP95:after.frameP95,scheduler:after.scheduler,quality:after.quality}};
  }
  global.AsciiEditorAcceptance=Object.freeze({make,functional,performanceRun});
})(window);
