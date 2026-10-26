#!/usr/bin/env node
// Scene-effect range-mask and stage-order prototype. Mask rasterization remains CPU.
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found; set TOSAMPOOL_EDGE_PATH.');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-scene-effect-masks=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.masks);
  const result=await page.evaluate(()=>{
    const rt=window.ToSampoolRuntimeVNext,W=320,H=180;
    const makeCanvas=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
    const compare=(left,right)=>{const a=left.getContext('2d').getImageData(0,0,W,H).data,b=right.getContext('2d').getImageData(0,0,W,H).data;let rgb=0,alpha=0,mismatch=0;for(let i=0;i<a.length;i+=4){rgb+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);alpha+=Math.abs(a[i+3]-b[i+3]);if(a[i+3]!==b[i+3])mismatch++;}return{rgb:+(rgb/(W*H*3)).toFixed(3),alpha:+(alpha/(W*H)).toFixed(3),alphaMismatchPercent:+(mismatch/(W*H)*100).toFixed(3)};};
    const alphaAsset=makeCanvas();{const ctx=alphaAsset.getContext('2d'),g=ctx.createLinearGradient(85,0,225,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(85,35,140,110);}
    const sourceEntities=()=>[{id:'paint',type:'rect',x:42,y:27,w:190,h:122,fill:'#9154ba',alpha:.55},{id:'mask-source',type:'ellipse',x:108,y:40,w:125,h:95,fill:'#ffffff'}];
    const scene=(stages)=>({format:'tosampool-scene/v4',width:W,height:H,loop:2,background:{alpha:0},runtimeAssets:{alpha:{image:alphaAsset}},entities:sourceEntities(),sceneEffects:stages});
    const masks={rect:{type:'rect',x:92,y:42,w:130,h:98},ellipse:{type:'ellipse',x:92,y:42,w:130,h:98},alpha:{type:'alpha',assetId:'alpha',x:85,y:35,w:140,h:110,mode:'alpha'},element:{type:'element',targetId:'mask-source'},inverted:{type:'ellipse',x:92,y:42,w:130,h:98,invert:true}};
    masks.shapes={type:'shapes',version:1,shapes:[{id:'left',type:'rect',x:60,y:30,w:80,h:80},{id:'overlap',type:'poly',points:[[80,40],[80,120],[160,120],[160,40]]},{id:'island',type:'ellipse',x:210,y:95,w:40,h:40}]};
    masks['shapes-inverted']={...masks.shapes,invert:true};
    const vertex='attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.0)*.5;gl_Position=vec4(a,0.0,1.0);}';
    const fragment=`precision highp float;varying vec2 uv;uniform sampler2D src,maskTex;uniform float mode;
      void main(){vec4 p=texture2D(src,uv);float m=texture2D(maskTex,uv).a;
        vec3 result=mode<.5?clamp(p.rgb+vec3(.3),0.0,1.0):(dot(p.rgb,vec3(.2126,.7152,.0722))>=.5?vec3(244.0,232.0,207.0)/255.0:vec3(17.0,24.0,39.0)/255.0);
        float layer=p.a*m,outA=layer+p.a*(1.0-layer);vec3 premult=result*layer+p.rgb*p.a*(1.0-layer);
        gl_FragColor=vec4(outA>0.0?premult/outA:vec3(0.0),outA);}`;
    const screen='precision highp float;varying vec2 uv;uniform sampler2D src;void main(){gl_FragColor=texture2D(src,uv);}';
    const canvas=makeCanvas(),gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL unavailable');
    const compile=(kind,text)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
    const vert=compile(gl.VERTEX_SHADER,vertex),program=text=>{const p=gl.createProgram();gl.attachShader(p,vert);gl.attachShader(p,compile(gl.FRAGMENT_SHADER,text));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;},effectProgram=program(fragment),screenProgram=program(screen);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const tex=(image=null)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);if(image){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);}else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t;};
    const maskImage=(mask,normalized,time)=>{const c=makeCanvas(),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);const surfaces=rt.modules.surfaces.create();surfaces.beginFrame();const frame=rt.modules.frame.create(normalized,time);if(!rt.modules.masks.apply(c,mask,{x:0,y:0,w:W,h:H},normalized,frame,surfaces))throw new Error('Mask failed: '+mask.type);return c;};
    const render=(source,stages,normalized,time)=>{
      const input=tex(source),ping=tex(),pong=tex(),fbo=gl.createFramebuffer();let current=input;
      const bind=(p)=>{gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.viewport(0,0,W,H);};
      for(let i=0;i<stages.length;i++){
        const stage=stages[i],mask=tex(maskImage(stage.mask,normalized,time)),output=i%2?pong:ping;
        gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,output,0);bind(effectProgram);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,current);gl.uniform1i(gl.getUniformLocation(effectProgram,'src'),0);
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mask);gl.uniform1i(gl.getUniformLocation(effectProgram,'maskTex'),1);gl.uniform1f(gl.getUniformLocation(effectProgram,'mode'),stage.kind==='grade'?0:1);
        gl.drawArrays(gl.TRIANGLES,0,3);current=output;gl.deleteTexture(mask);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);bind(screenProgram);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,current);gl.uniform1i(gl.getUniformLocation(screenProgram,'src'),0);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();
      const out=makeCanvas();out.getContext('2d').drawImage(canvas,0,0);for(const t of [input,ping,pong])gl.deleteTexture(t);gl.deleteFramebuffer(fbo);return out;
    };
    const rows=[],previews=[];
    for(const [name,mask] of Object.entries(masks)){
      const effects={sample:{threshold:{enabled:true,threshold:.5,dark:'#111827',light:'#f4e8cf',mask}}};
      // Disabled consumers no longer hide their sources. Explicitly omit the
      // source from this independent input, without changing its sampled Alpha.
      const baseScene=scene({sample:{}});if(mask.type==='element')baseScene.entities.find(e=>e.id===mask.targetId).referenceSourceOnly=true;
      const base=rt.createRuntime(baseScene),formal=rt.createRuntime(scene(effects)),plain=makeCanvas(),expected=makeCanvas(),time=.37;base.renderTo(plain,time);formal.renderTo(expected,time);const actual=render(plain,[{kind:'threshold',mask}],formal.scene,time);
      rows.push({name,comparison:compare(expected,actual),formalEffects:formal.getLastFrameStats().sceneEffects});
      if(name==='alpha'){const contact=document.createElement('canvas');contact.width=W*2;contact.height=H;contact.getContext('2d').drawImage(expected,0,0);contact.getContext('2d').drawImage(actual,W,0);previews.push(['scene-mask-alpha',contact.toDataURL('image/png').split(',')[1]]);}
    }
    const combined={overlay:{'color-grade':{enabled:true,brightness:30,contrast:0,saturation:0,hue:0,mask:masks.rect}},sample:{threshold:{enabled:true,threshold:.5,dark:'#111827',light:'#f4e8cf',mask:masks.alpha}}};
    const base=rt.createRuntime(scene({sample:{}})),formal=rt.createRuntime(scene(combined)),plain=makeCanvas(),expected=makeCanvas();base.renderTo(plain,.37);formal.renderTo(expected,.37);
    const correct=render(plain,[{kind:'grade',mask:masks.rect},{kind:'threshold',mask:masks.alpha}],formal.scene,.37),reversed=render(plain,[{kind:'threshold',mask:masks.alpha},{kind:'grade',mask:masks.rect}],formal.scene,.37);
    const chain={correct:compare(expected,correct),reversed:compare(expected,reversed),effectCount:formal.getLastFrameStats().sceneEffects,pipeline:formal.scene.sceneEffects.pipeline};
    const contact=document.createElement('canvas');contact.width=W*3;contact.height=H;const ctx=contact.getContext('2d');ctx.drawImage(expected,0,0);ctx.drawImage(correct,W,0);ctx.drawImage(reversed,W*2,0);previews.push(['scene-mask-chain',contact.toDataURL('image/png').split(',')[1]]);
    return{rows,chain,previews,glError:gl.getError(),contextLost:gl.isContextLost()};
  });
  for(const [name,bytes] of result.previews)writeFileSync(resolve(root,'docs/architecture',`v4-gpu-${name}.png`),Buffer.from(bytes,'base64'));
  delete result.previews;
  for(const row of result.rows){assert.ok(row.comparison.rgb<.1&&row.comparison.alpha<.01,`${row.name}: masked GPU pass drifted from the formal scene output`);assert.ok(row.comparison.alphaMismatchPercent<.1,`${row.name}: mask edge Alpha coverage drifted`);}
  assert.ok(result.chain.correct.rgb<.01&&result.chain.correct.alpha===0,'two masked GPU stages must preserve the formal order');
  assert.ok(result.chain.reversed.rgb>.5,'the inverted stage order must visibly differ');
  assert.equal(result.chain.effectCount,2);
  assert.equal(result.glError,0);assert.equal(result.contextLost,false);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
