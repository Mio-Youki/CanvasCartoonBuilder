#!/usr/bin/env node
// Visual feasibility of the existing uneven-sampling edge rules on transparent material.
// Canvas prepares the low-resolution work image; WebGL runs field, edge rule and resampling.
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
if(!edge)throw new Error('Edge not found');
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?gpu-uneven-edge=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolRuntimeVNext?.modules?.sampling?.apply);
  const result=await page.evaluate(()=>{
    const rt=window.ToSampoolRuntimeVNext,W=192,H=108;
    const make=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
    const material=(kind,time)=>{
      const c=make(),ctx=c.getContext('2d');
      if(kind==='image'){const g=ctx.createLinearGradient(16,10,170,92);g.addColorStop(0,'#095672');g.addColorStop(.5,'#e5a54e');g.addColorStop(1,'#ac3863');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(96,54,73,43,0,0,Math.PI*2);ctx.fill();}
      else if(kind==='text'){ctx.font='bold 55px Arial';ctx.fillStyle='#f8c650';ctx.fillText('TYPE',10,71);}
      else if(kind==='vector'){ctx.fillStyle='#62d0b6';ctx.beginPath();ctx.moveTo(12,74);ctx.lineTo(85,12);ctx.lineTo(177,74);ctx.lineTo(137,101);ctx.lineTo(42,96);ctx.closePath();ctx.fill();}
      else {const scene={format:'tosampool-scene/v4',width:W,height:H,loop:2,background:{alpha:0},entities:[{id:'source',type:'ellipse',x:55,y:20,w:70,h:65,fill:'#fff',anim:{bob:{amount:12,period:2,angle:0}}},{id:'owner',type:'rect',x:20,y:10,w:150,h:86,fill:'#e464bd',effects:{mask:{type:'element',targetId:'source'}}}]};rt.createRuntime(scene).renderTo(c,time);}
      return c;
    };
    const vertex='attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
    const fragment=`precision highp float;uniform sampler2D src;uniform vec2 size;uniform float mode,edgeWidth,scale,contrast,seed,flow,amount,coarseness;
      vec4 pixel(vec2 p){return texture2D(src,vec2((p.x+.5)/size.x,1.0-(p.y+.5)/size.y));}
      void main(){vec2 p=floor(vec2(gl_FragCoord.x-.5,size.y-gl_FragCoord.y-.5));
        float raw=.5+.5*sin((p.x/scale-flow+seed*.031)*6.28318530718),field=.5+(raw-.5)*contrast;
        if(mode>.5){float dist=min(min(p.x,p.y),min(size.x-1.0-p.x,size.y-1.0-p.y));
          for(int dy=-3;dy<=3;dy++)for(int dx=-3;dx<=3;dx++){
            vec2 q=p+vec2(float(dx),float(dy));float d=abs(float(dx))+abs(float(dy));
            if(d>=dist||q.x<0.0||q.y<0.0||q.x>=size.x||q.y>=size.y)continue;
            if(pixel(q).a<8.0/255.0)dist=d;
          }
          float near=clamp(1.0-dist/edgeWidth,0.0,1.0);
          field=.5+(field-.5)*(mode<1.5?1.0-near:near);
        }
        float cell=1.0+floor(clamp(field,0.0,1.0)*amount*(coarseness-1.0));
        gl_FragColor=pixel(floor(p/cell)*cell);}`;
    const rows=[];let preview=null;
    for(const kind of ['image','text','vector','reference'])for(const grid of [1,3]){
      const width=Math.ceil(W/grid),height=Math.ceil(H/grid),gpu=document.createElement('canvas');gpu.width=width;gpu.height=height;
      const gl=gpu.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL unavailable');
      const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
      const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'src'),0);gl.uniform2f(gl.getUniformLocation(program,'size'),width,height);gl.viewport(0,0,width,height);
      const set=(name,value)=>gl.uniform1f(gl.getUniformLocation(program,name),value);set('edgeWidth',2);set('scale',27);set('contrast',.9);set('seed',3);set('amount',.85);set('coarseness',5);
      for(const mode of ['off','contour','interior'])for(const time of kind==='reference'?[.25,.75]:[.25]){
        const source=material(kind,time),work=document.createElement('canvas');work.width=width;work.height=height;const workCtx=work.getContext('2d');workCtx.imageSmoothingEnabled=false;workCtx.drawImage(source,0,0,width,height);
        const cfg={enabled:true,amount:.85,coarseness:5,field:{enabled:true,type:'wave',scale:27,contrast:.9,seed:3,direction:0},edge:{mode,width:2},motion:{enabled:true,type:'uneven-motion',period:3,steps:24,flowSpeed:1,tideAmount:0}};
        const surfaces=rt.modules.surfaces.create();surfaces.beginFrame();const formal=rt.modules.sampling.apply(source,{controllers:{'sampling-grid':{size:grid}},'uneven-sampling':cfg},surfaces,{time,preview:{pixelDivMultiplier:1}});
        gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,work);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        set('mode',mode==='off'?0:mode==='contour'?1:2);set('flow',Math.floor(time/3*24)/24);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();
        const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const low=document.createElement('canvas');low.width=width;low.height=height;const lowCtx=low.getContext('2d'),image=lowCtx.createImageData(width,height);
        for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=(y*width+x)*4,b=((height-1-y)*width+x)*4;image.data[a]=pixels[b];image.data[a+1]=pixels[b+1];image.data[a+2]=pixels[b+2];image.data[a+3]=pixels[b+3];}lowCtx.putImageData(image,0,0);
        const actual=make(),out=actual.getContext('2d');out.imageSmoothingEnabled=false;out.drawImage(low,0,0,W,H);
        if(kind==='reference'&&grid===3&&mode==='contour'&&time===.25){const sheet=document.createElement('canvas');sheet.width=W*2;sheet.height=H;const view=sheet.getContext('2d');view.drawImage(formal,0,0);view.drawImage(actual,W,0);preview=sheet.toDataURL('image/png').split(',')[1];}
        const left=formal.getContext('2d').getImageData(0,0,W,H).data,right=out.getImageData(0,0,W,H).data,original=source.getContext('2d').getImageData(0,0,W,H).data;let rgb=0,alpha=0,changed=0,nonzero=0,actualVisible=0,effectChanged=0;
        for(let i=0;i<left.length;i+=4){const d=Math.abs(left[i]-right[i])+Math.abs(left[i+1]-right[i+1])+Math.abs(left[i+2]-right[i+2]);rgb+=d;alpha+=Math.abs(left[i+3]-right[i+3]);if(d||left[i+3]!==right[i+3])changed++;if(left[i+3])nonzero++;if(right[i+3])actualVisible++;if(left[i]!==original[i]||left[i+1]!==original[i+1]||left[i+2]!==original[i+2]||left[i+3]!==original[i+3])effectChanged++;}
        rows.push({kind,grid,mode,time,rgb:+(rgb/(W*H*3)).toFixed(3),alpha:+(alpha/(W*H)).toFixed(3),changedPercent:+(changed/(W*H)*100).toFixed(3),visiblePercent:+(nonzero/(W*H)*100).toFixed(3),actualVisiblePercent:+(actualVisible/(W*H)*100).toFixed(3),effectChangedPercent:+(effectChanged/(W*H)*100).toFixed(3)});
        surfaces.release(formal);
      }
      if(gl.getError()!==0||gl.isContextLost())throw new Error('WebGL failed');
    }
    return {rows,preview};
  });
  assert.equal(result.rows.length,30);
  assert.ok(result.rows.every(row=>row.effectChangedPercent>0),'fixture must visibly exercise uneven sampling');
  assert.ok(result.rows.every(row=>row.actualVisiblePercent>0),'GPU output must not be blank');
  writeFileSync(resolve(root,'docs/architecture/v4-gpu-uneven-edge-reference.png'),Buffer.from(result.preview,'base64'));
  console.log(JSON.stringify({cases:result.rows.length,maxRgb:Math.max(...result.rows.map(row=>row.rgb)),maxAlpha:Math.max(...result.rows.map(row=>row.alpha)),maxChangedPercent:Math.max(...result.rows.map(row=>row.changedPercent)),minEffectChangedPercent:Math.min(...result.rows.map(row=>row.effectChangedPercent)),referenceRows:result.rows.filter(row=>row.kind==='reference')},null,2));
}finally{await browser.close();}
