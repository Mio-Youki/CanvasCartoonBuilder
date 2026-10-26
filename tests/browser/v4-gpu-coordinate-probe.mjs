import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),source=readFileSync(resolve(root,'runtime-src/vnext/69a-scene-gpu-executor.js'),'utf8');
const nearest=source.match(/const nearestShader=`([\s\S]*?)`;/)[1];
const fragment=source.match(/const resampleFragment = `([\s\S]*?)`;/)[1].replace('${nearestShader}',nearest);
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage();
  const result=await page.evaluate(fragment=>{
    const rows=[];
    for(const integer of [false,true]){
      const c=document.createElement('canvas');c.width=480;c.height=270;const gl=c.getContext('webgl2');
      const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      let text=fragment.replace('outputColor=texelFetch(source,ivec2(q.x,from.y-1-q.y),0);','outputColor=vec4(float(q.x&255)/255.0,float(q.x>>8)/255.0,float(q.y&255)/255.0,1.0);');
      if(!integer)text=text.replace('ivec2 q=nearestPixel(ivec2(p),from,ivec2(size));','ivec2 q=ivec2(floor((p+.5)*vec2(from)/size));');
      const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'#version 300 es\nin vec2 position;void main(){gl_Position=vec4(position,0,1);}'));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,text));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1920,1080,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.uniform1i(gl.getUniformLocation(program,'source'),0);gl.uniform2f(gl.getUniformLocation(program,'size'),480,270);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.viewport(0,0,480,270);gl.drawArrays(gl.TRIANGLES,0,3);
      const bytes=new Uint8Array(480*270*4);gl.readPixels(0,0,480,270,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let count=0;const first=[];
      for(let y=0;y<270;y++)for(let x=0;x<480;x++){const at=((269-y)*480+x)*4,qx=bytes[at]+(bytes[at+1]<<8),qy=bytes[at+2],ex=x*4+2,ey=(y*4+2)&255;if(qx!==ex||qy!==ey){count++;if(first.length<8)first.push({x,y,qx,qy,ex,ey});}}
      rows.push({integer,count,first,error:gl.getError()});gl.getExtension('WEBGL_lose_context').loseContext();
    }
    return rows;
  },fragment);
  console.log(JSON.stringify(result,null,2));assert.equal(result[1].count,0);
}finally{await browser.close();}
