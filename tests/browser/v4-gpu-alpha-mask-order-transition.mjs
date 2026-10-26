#!/usr/bin/env node
// Integration feasibility fixture: formal V4 Canvas2D renderTo vs a one-pass GPU threshold prototype.
import { existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found; set TOSAMPOOL_EDGE_PATH.');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-alpha-mask-order-transition=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.renderer);
  const result=await page.evaluate(()=>{
    const rt=window.ToSampoolRuntimeVNext,W=320,H=180;
    const canvas=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
    const copy=source=>{const c=canvas();c.getContext('2d').drawImage(source,0,0);return c;};
    const pixel=c=>c.getContext('2d').getImageData(0,0,W,H).data;
    const coverage=c=>{const a=pixel(c);let visible=0,soft=0;for(let i=3;i<a.length;i+=4){if(a[i])visible++;if(a[i]>0&&a[i]<255)soft++;}return{visiblePercent:+(visible/(W*H)*100).toFixed(2),softAlphaPercent:+(soft/(W*H)*100).toFixed(2)};};
    const compareImage=(id,first,second)=>{const c=document.createElement('canvas');c.width=W*2;c.height=H;const ctx=c.getContext('2d');ctx.drawImage(first,0,0);ctx.drawImage(second,W,0);return[id,c.toDataURL('image/png').split(',')[1]];};
    const diff=(left,right)=>{const a=pixel(left),b=pixel(right);let rgb=0,alpha=0,alphaPixels=0;for(let i=0;i<a.length;i+=4){rgb+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);alpha+=Math.abs(a[i+3]-b[i+3]);if(a[i+3]!==b[i+3])alphaPixels++;}return{rgb:+(rgb/(W*H*3)).toFixed(3),alpha:+(alpha/(W*H)).toFixed(3),alphaMismatchPercent:+(alphaPixels/(W*H)*100).toFixed(3)};};
    const threshold={enabled:true,threshold:.5,dark:'#111827',light:'#f4e8cf'};
    const vertex='attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.0)*.5;gl_Position=vec4(a,0.0,1.0);}';
    const fragment=`precision highp float;varying vec2 uv;uniform sampler2D src;void main(){vec4 p=texture2D(src,uv);float l=dot(p.rgb,vec3(.2126,.7152,.0722));gl_FragColor=vec4(l>=.5?vec3(244.0,232.0,207.0)/255.0:vec3(17.0,24.0,39.0)/255.0,p.a);}`;
    const gpuCanvas=canvas(),gl=gpuCanvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL unavailable');
    const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.useProgram(program);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.uniform1i(gl.getUniformLocation(program,'src'),0);
    const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
    const gpu=source=>{gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.viewport(0,0,W,H);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();return copy(gpuCanvas);};
    const maskAsset=canvas();{const ctx=maskAsset.getContext('2d');const gradient=ctx.createLinearGradient(80,0,220,0);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(.5,'rgba(255,255,255,1)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(80,30,140,120);}
    const rect={id:'shape',type:'rect',x:60,y:35,w:200,h:110,fill:'#e4a236',alpha:.65,anim:{bob:{enabled:true,amount:12,period:1.2,angle:0}}};
    const make=(mask,effect=true)=>({format:'tosampool-scene/v4',width:W,height:H,loop:4,background:{color:'#000000',alpha:0},runtimeAssets:{mask:{image:maskAsset}},entities:[{...rect,effects:mask?{pipeline:['mask','decorate','sample'],mask}:undefined}],sceneEffects:effect?{sample:{threshold}}:{sample:{}}});
    const previews=[];
    const alpha=[];for(const [kind,mask] of [['no-mask',null],['rect',{type:'rect',x:100,y:50,w:120,h:80}],['ellipse',{type:'ellipse',x:100,y:50,w:120,h:80}],['alpha-image',{type:'alpha',assetId:'mask',x:80,y:30,w:160,h:120,mode:'alpha'}]]){
      const base=rt.createRuntime(make(mask,false)),formal=rt.createRuntime(make(mask,true)),plain=canvas(),expected=canvas();base.renderTo(plain,.37);formal.renderTo(expected,.37);const actual=gpu(plain);alpha.push({kind,coverage:coverage(expected),comparison:diff(expected,actual),formalStats:{directObjects:formal.getLastFrameStats().directObjects,capsuleObjects:formal.getLastFrameStats().capsuleObjects,maskedObjects:formal.getLastFrameStats().maskedObjects}});if(kind==='alpha-image')previews.push(compareImage('alpha-image',expected,actual));
    }
    const orderRows=[];
    for(const pipeline of [['mask','decorate','sample'],['decorate','mask','sample'],['sample','decorate','mask']]){
      const scene={format:'tosampool-scene/v4',width:W,height:H,loop:2,background:{alpha:0},entities:[{id:'ordered',type:'rect',x:70,y:40,w:180,h:100,fill:'#e4a236',effects:{pipeline,mask:{type:'rect',x:110,y:60,w:100,h:60},decorate:{outline:{enabled:true,color:'#101829',alpha:1,width:8}},sample:{threshold}}}]};
      const player=rt.createRuntime(scene),frame=canvas();player.renderTo(frame,.3);orderRows.push({pipeline:player.scene.entities[0].effects.pipeline.join('>'),frame,stats:player.getLastFrameStats()});
    }
    const order=orderRows.map(({pipeline,stats},i)=>({pipeline,maskedObjects:stats.maskedObjects,capsuleObjects:stats.capsuleObjects,vsFirst:i?diff(orderRows[0].frame,orderRows[i].frame):null}));
    previews.push(compareImage('object-order',orderRows[0].frame,orderRows[1].frame));
    const transitions=[];
    for(const type of ['fade','wipe','dissolve','blackout']){
      const scene={format:'tosampool-scene/v4',width:W,height:H,loop:4,background:{color:'#142236',alpha:1},timeline:{scenes:[{id:'a',f:[0,.5],background:{color:'#142236',alpha:1}},{id:'b',f:[.5,1],background:{color:'#8b352f',alpha:1},transition:{type,duration:.7,direction:'right',cell:8,seed:9,color:'#000000'}}]},entities:[{...rect}],sceneEffects:{sample:{threshold}}};
      const formal=rt.createRuntime(scene),base=rt.createRuntime({...scene,sceneEffects:{sample:{}}});
      const currentFrames=[],previousFrames=[];
      for(const t of [2.18,2.42]){
        const expected=canvas();formal.renderTo(expected,t);
        const current=canvas();base.renderTo(current,t,{_skipTransition:true});const currentGpu=gpu(current);
        const frame=rt.modules.frame.create(formal.scene,t),state=rt.modules.renderer.transitionState(formal.scene,frame);
        const previousTime=rt.modules.renderer.outgoingTransitionTime(formal.scene,state),previous=canvas();base.renderTo(previous,previousTime,{_skipTransition:true});const previousGpu=gpu(previous);
        currentFrames.push(copy(current));previousFrames.push(copy(previous));
        const correct=copy(currentGpu);rt.modules.renderer.drawTransition(correct.getContext('2d'),formal.scene,frame,type==='blackout'?null:previousGpu);
        const mixed=canvas();base.renderTo(mixed,t);const naive=gpu(mixed);
        transitions.push({type,t,previousTime,correct:diff(expected,correct),postTransitionOnly:diff(expected,naive),currentChanged:diff(current,previous)});
        if(type==='fade'&&t===2.18)previews.push(compareImage('fade-correct-vs-naive',correct,naive));
      }
      transitions.push({type,clockProgress:{incoming:diff(currentFrames[0],currentFrames[1]).rgb,outgoing:diff(previousFrames[0],previousFrames[1]).rgb}});
    }
    // A neighbourhood-dependent sampler is intentionally tested separately:
    // unlike a pointwise threshold, it can create a false edge at a wipe seam.
    const seam=[];
    const dispersion={'edge-dispersion':{enabled:true,distance:3,strength:1,angle:0,width:1,source:'contrast',order:'rgb'}};
    for(const type of ['wipe','dissolve']){
      const scene={format:'tosampool-scene/v4',width:W,height:H,loop:4,background:{alpha:1},timeline:{scenes:[{id:'a',f:[0,.5],background:{color:'#142236',alpha:1}},{id:'b',f:[.5,1],background:{color:'#8b352f',alpha:1},transition:{type,duration:.7,direction:'right',cell:8,seed:9}}]},entities:[{...rect}],sceneEffects:{sample:dispersion}};
      const formal=rt.createRuntime(scene),base=rt.createRuntime({...scene,sceneEffects:{sample:{}}}),t=2.35,expected=canvas(),mixed=canvas();formal.renderTo(expected,t);base.renderTo(mixed,t);
      const surfaces=rt.modules.surfaces.create();surfaces.beginFrame();const post=rt.modules.sampling.apply(mixed,dispersion,surfaces,rt.modules.frame.create(formal.scene,t));
      seam.push({type,postTransitionOnly:diff(expected,post)});
    }
    return {alpha,order,transitions,seam,glError:gl.getError(),contextLost:gl.isContextLost(),previews};
  });
  for(const [name,bytes] of result.previews)writeFileSync(resolve(root,'docs/architecture',`v4-gpu-${name}.png`),Buffer.from(bytes,'base64'));
  delete result.previews;
  for(const row of result.alpha){assert.ok(row.coverage.visiblePercent>5,`${row.kind}: fixture must contain visible pixels`);assert.ok(row.comparison.rgb<.01&&row.comparison.alpha===0,`${row.kind}: GPU scene sample must preserve the formal transparent/masked frame`);}
  assert.ok(result.order[1].vsFirst.alphaMismatchPercent>1,'moving mask behind outline must change object Alpha');
  for(const row of result.transitions)if(row.correct)assert.ok(row.correct.rgb<.01&&row.correct.alpha===0,`${row.type}: both transition sources must be processed before composition`);
  for(const row of result.transitions)if(row.clockProgress)assert.ok(row.clockProgress.incoming>.1&&row.clockProgress.outgoing>.1,`${row.type}: both scene clocks must keep moving`);
  assert.ok(result.transitions.find(row=>row.type==='fade').postTransitionOnly.rgb>10,'fade must expose the incorrect post-transition-only route');
  assert.ok(result.seam.find(row=>row.type==='dissolve').postTransitionOnly.rgb>1,'neighbourhood sampling after dissolve must expose false seams');
  assert.equal(result.glError,0);assert.equal(result.contextLost,false);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
