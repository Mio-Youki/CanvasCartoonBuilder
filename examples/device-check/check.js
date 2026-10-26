(function(){
 'use strict';
 const $=id=>document.getElementById(id),rt=ToSampoolRuntimeVNext;let report;
 const tick=()=>new Promise(resolve=>requestAnimationFrame(resolve)),percentile=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.ceil(a.length*p)-1)];
 const art=document.createElement('canvas');art.width=512;art.height=288;const x=art.getContext('2d'),g=x.createLinearGradient(0,0,512,288);g.addColorStop(0,'#255b91');g.addColorStop(1,'#f7cf72');x.fillStyle=g;x.fillRect(0,0,512,288);for(let i=0;i<36;i++){x.fillStyle=i%2?'#dd503f':'#e9e5d3';x.fillRect(i*19%512,i*37%288,40,25);}
 function scene(w,h,kind){const source={id:'image',type:'image',assetId:'art',x:0,y:0,w,h},entities=[source];if(kind==='particles')entities.push({id:'particles',type:'particle-emitter',w,h,particle:{mode:'layer',layerEmission:'continuous',sourceId:'image',showSource:false,count:600,life:2,speed:20,direction:-90,spread:120,cellSize:12,fade:true,seed:4}});
  return{format:'tosampool-scene/v4',width:w,height:h,loop:4,background:{alpha:0},runtimeAssets:{art:{image:art}},entities,sceneEffects:kind==='threshold'?{sample:{threshold:{enabled:true,threshold:.5,dark:'#19314a',light:'#f5e2b3'}}}:{}};
 }
 $('run').onclick=async()=>{
  $('run').disabled=true;$('save').disabled=true;$('rows').replaceChildren();const rows=[];let gpu={};
  try{const probe=document.createElement('canvas'),gl=probe.getContext('webgl2');if(gl){const ext=gl.getExtension('WEBGL_debug_renderer_info');gpu={renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(ext?ext.UNMASKED_VENDOR_WEBGL:gl.VENDOR)};gl.getExtension('WEBGL_lose_context')?.loseContext();}}catch{}
  try{
   for(const [w,h]of [[320,180],[960,540],[1920,1080]])for(const [label,kind,backend]of [['原图','base','cpu'],['阈值 CPU','threshold','cpu'],['阈值 GPU请求','threshold','gpu-experimental'],['600图层粒子','particles','cpu']]){
    $('status').textContent=`测试中：${w}×${h} ${label}`;await tick();let player;
    try{player=rt.createRuntime(scene(w,h,kind));const options={sceneBackend:backend},start=performance.now();let stats=player.renderTo($('canvas'),.4,options);const cold=performance.now()-start,times=[];
     for(let i=0;i<16;i++){await tick();const s=performance.now();stats=player.renderTo($('canvas'),.4+(i+1)/60,options);if(i>=4)times.push(performance.now()-s);}
     const row={width:w,height:h,label,requested:backend,actual:stats.sceneBackend||'cpu',coldMs:cold,medianMs:percentile(times,.5),p95Ms:percentile(times,.95),gpuReason:stats.sceneGpu?.reason||null,particles:stats.particlesDrawn||0};rows.push(row);const tr=document.createElement('tr');for(const value of [`${w}×${h}`,label,row.actual,cold.toFixed(2),row.medianMs.toFixed(2),row.p95Ms.toFixed(2)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('rows').append(tr);
    }catch(error){rows.push({width:w,height:h,label,error:error.message});const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent=`${w}×${h} ${label}：${error.message}`;tr.append(td);$('rows').append(tr);}finally{player?.dispose();}
   }
   report={format:'tosampool-device-check/v1',at:new Date().toISOString(),userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory||null,devicePixelRatio:devicePixelRatio,gpu,visibility:document.visibilityState,samples:12,warmup:4,rows};$('status').textContent='测试完成。请下载结果，与其他设备的同项数据比较。';$('save').disabled=false;
  }finally{$('run').disabled=false;}
 };
 $('save').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='tosampool-device-check.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
})();
