/* Session-only rendering policy and observations. No DOM or parameter evaluation. */
(function(global){
  'use strict';
  function create(options){
    options=options||{};
    let policy='cpu',last=null,disposed=false;
    const warm=[],cold=[];
    const p95=values=>values.length?values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1]:null;
    function reset(){last=null;warm.length=0;cold.length=0;}
    function setPolicy(value){
      if(!['cpu','gpu-experimental','gpu-object-pilot'].includes(value))throw Error('Unknown preview backend policy');
      if(disposed||policy===value)return false;
      policy=value;reset();options.invalidate?.('backend-policy-change');return true;
    }
    function observeFrame(stats,timing){
      if(disposed)return;
      const gpu=stats?.sceneGpu||{},objects=stats?.objectGpu,reason=stats?.transitionGpuFallback||gpu.reason||null;
      const sample=timing&&Number.isFinite(timing.runtimeCallMs)?timing.runtimeCallMs:null;
      if(sample!==null){const values=timing.playerCreated||gpu.initialized||gpu.surfacesRebuilt||objects?.initialized||objects?.surfacesRebuilt?cold:warm;values.push(sample);if(values.length>300)values.shift();}
      last={requested:policy,scene:stats?.sceneBackend||'unknown',previousScene:stats?.transitionBackend||null,transition:stats?.transitionCompositeBackend||null,reason,diagnostic:gpu.diagnostic||null,objects:'existing-canvas-pipeline; independent CRT/ASCII paths unchanged',timing:timing?{...timing}:null,deviceGpuMs:null,deviceTiming:'not-collected',uploads:stats?.frameGpuUploads||0,passes:stats?.frameGpuPasses||0,textureBytes:gpu.textureBytes||0,cacheHit:!!gpu.cacheHit};
      last.nearestCalibration={bytes:gpu.nearestCalibrationBytes||0,exceptions:gpu.nearestCalibration?.exceptions??null,prepareMs:gpu.nearestCalibration?.prepareMs??null};
      last.surfaceRebuild={rebuilt:!!gpu.surfacesRebuilt,total:gpu.surfaceRebuilds||0,prepareMs:gpu.surfacePrepareMs??null};
      last.objectSampling=objects?JSON.parse(JSON.stringify(objects)):null;
      if(objects?.handled)last.objects='canvas-content;gpu-object-sampling;canvas-final-composite';
    }
    function snapshot(){return JSON.parse(JSON.stringify({policy,last,warm:{samples:warm.length,runtimeCallP95Ms:p95(warm)},coldPlayer:{samples:cold.length,runtimeCallP95Ms:p95(cold)}}));}
    function description(){
      const s=snapshot(),l=s.last;
      if(!l)return '请求：'+(policy==='cpu'?'CPU 基准':'实验 GPU')+'；等待绘制。';
      const ms=value=>Number.isFinite(value)?value.toFixed(2)+'ms':'未采集';
      const limits=l.objectSampling?.budget;
      const objectLine=l.objectSampling?'对象采样试点：GPU '+l.objectSampling.handled+' 个；CPU采样 '+l.objectSampling.cpu+' 个；效果 '+[...new Set((l.objectSampling.rows||[]).filter(row=>!row.reason).flatMap(row=>row.effects||[]))].join(',')+'；输入 '+(l.objectSampling.sourcePixels||0)+' 像素；'+(l.objectSampling.passes||0)+' 遍／'+(l.objectSampling.uploads||0)+' 次上传；回退 '+(l.objectSampling.rows||[]).filter(row=>row.reason).map(row=>row.ownerId+':'+row.reason).join(',')+'；显式纹理 '+l.objectSampling.textureBytes+' 字节':'对象：既有 Canvas 管线，独立 CRT / ASCII 路径不变';
      return ['请求：'+l.requested,'实际场景后端：'+l.scene,'上一场景：'+(l.previousScene||'无'),'最终转场：'+(l.transition||'无'),'回退／停留 CPU 原因：'+(l.reason||'无'),objectLine,
        '最近编辑器 render：'+ms(l.timing?.editorRenderMs),'最近素材／Player 准备：'+ms(l.timing?.playerPrepareMs),'最近 Runtime 同步调用：'+ms(l.timing?.runtimeCallMs),
        '复用 Player 且未重建 GPU 调用 P95：'+ms(s.warm.runtimeCallP95Ms)+'（'+s.warm.samples+' 样本）','新建 Player／GPU 初始化或表面重建调用 P95：'+ms(s.coldPlayer.runtimeCallP95Ms)+'（'+s.coldPlayer.samples+' 样本）',
        '设备 GPU 执行时间：未采集；以上调用时间不是 GPU 执行时间','GPU 上传：'+l.uploads+'；处理道数：'+l.passes+'；显式纹理：'+l.textureBytes+' 字节',
        '原生选格校准：'+l.nearestCalibration.bytes+' 字节；本次 CPU 准备：'+ms(l.nearestCalibration.prepareMs),
        'GPU 表面重建：'+(l.surfaceRebuild.rebuilt?'本帧重建':'本帧未重建')+'；累计 '+l.surfaceRebuild.total+'；本次同步准备：'+ms(l.surfaceRebuild.prepareMs),
        ...(l.objectSampling?['对象试点门槛：末端杂色／阈值／边缘色散整链、有效采样格1；允许Canvas投影／描边前处理，不含其他加样／调色；胶囊'+(limits?.minPixels??'未知')+'～'+(limits?.maxPixels??'未知')+'像素且受整链纹理预算限制；每帧最多'+(limits?.maxObjects??'未知')+'个；未命中原因：'+(l.objectSampling.reason||'无')]:[]),
        '实验边界：本机格 3 矩阵和格 4 回归已验收；跨设备及任意尺寸尚未全面验收；默认 CPU 不变。',
        '不含浏览器 Canvas／驱动隐式内存；整链不支持时回退 CPU；不使用来源输出版本缓存。'].join('\n');
    }
    return Object.freeze({setPolicy,previewOptions:()=>policy==='gpu-object-pilot'?{sceneBackend:'cpu',objectBackend:'gpu-threshold-pilot'}:{sceneBackend:policy},observeFrame,snapshot,description,reset,dispose(){disposed=true;reset();},get policy(){return policy;}});
  }
  global.EditorV4PreviewBackend=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
