/* ToSampool v4 fixed-time frame exporter.  It deliberately never calls the
 * Legacy HomeScene Runtime: preview, test page and artifacts share v4 only. */
(function (global) {
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const canvasFor=(scene,width,height)=>{const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width||scene.width||320));canvas.height=Math.max(1,Math.round(height||scene.height||180));return canvas;};
  const blob=(canvas,type)=>new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('浏览器未能编码 '+type)),type));
  function runtimeFor(scene, runtimeAssets){
    if(!global.ToSampoolRuntimeVNext||!global.ToSampoolRuntimeVNext.createRuntime)throw new Error('v4 Runtime 不可用');
    if(!scene||scene.format!=='tosampool-scene/v4')throw new Error('导出需要 tosampool-scene/v4 Scene');
    return global.ToSampoolRuntimeVNext.createRuntime(Object.assign({},scene,{runtimeAssets:runtimeAssets||scene.runtimeAssets||{}}));
  }
  function release(runtime){if(runtime&&typeof runtime.clearCaches==='function')runtime.clearCaches();}
  function frameTimes(scene, options, limit){
    const opt=options||{};
    if(Array.isArray(opt.times)&&opt.times.length)return opt.times.map(Number).filter(Number.isFinite);
    const fps=clamp(Math.round(+opt.fps||30),1,30),loop=Math.max(.001,+scene.loop||1),ranges=Array.isArray(opt.ranges)&&opt.ranges.length?opt.ranges:[[0,loop]],out=[];
    for(const range of ranges){const from=clamp(+range[0]||0,0,loop),to=clamp(+range[1]||loop,from,loop);for(let time=from;time<to-1e-8;time+=1/fps)out.push(+time.toFixed(8));}
    if(!out.length)out.push(0);
    if(limit&&out.length>limit)throw new Error('所选时段在当前帧率下共有 '+out.length+' 帧，超过上限 '+limit+'；请降低帧率或缩小时段');
    return out;
  }
  function render(runtime,canvas,time){runtime.renderTo(canvas,Math.max(0,+time||0),{preview:{mode:'full',pixelDivMultiplier:1}});return canvas;}
  async function frame(scene,time,options){const opt=options||{},canvas=canvasFor(scene,opt.width,opt.height),runtime=runtimeFor(scene,opt.runtimeAssets);try{return render(runtime,canvas,time);}finally{release(runtime);}}
  async function png(scene,time,options){return blob(await frame(scene,time,options),'image/png');}
  async function pngFrames(scene,options){const opt=options||{},times=frameTimes(scene,opt,120),canvas=canvasFor(scene,opt.width,opt.height),runtime=runtimeFor(scene,opt.runtimeAssets),out=[];try{for(const time of times)out.push({t:time,blob:await blob(render(runtime,canvas,time),'image/png')});return out;}finally{release(runtime);}}
  async function spriteSheet(scene,options){const opt=options||{},times=frameTimes(scene,opt,240),cellW=Math.max(1,Math.round(opt.width||scene.width||320)),cellH=Math.max(1,Math.round(opt.height||scene.height||180)),columns=Math.max(1,Math.round(opt.cols||Math.ceil(Math.sqrt(times.length)))),out=canvasFor(scene,columns*cellW,Math.ceil(times.length/columns)*cellH),ctx=out.getContext('2d'),cell=canvasFor(scene,cellW,cellH),runtime=runtimeFor(scene,opt.runtimeAssets);ctx.imageSmoothingEnabled=false;try{times.forEach((time,index)=>ctx.drawImage(render(runtime,cell,time),(index%columns)*cellW,Math.floor(index/columns)*cellH));return blob(out,'image/png');}finally{release(runtime);}}
  const le=value=>new Uint8Array([value&255,(value>>>8)&255]),ascii=value=>new TextEncoder().encode(value);
  function palette(colors){const out=new Uint8Array(256*3);colors.slice(0,255).forEach((color,index)=>{out[index*3]=color>>>16;out[index*3+1]=(color>>>8)&255;out[index*3+2]=color&255;});return out;}
  // GIF is CPU-encoded and keeps one indexed frame in memory at a time.  Limit
  // the aggregate sampled pixels so a large canvas cannot silently freeze the UI.
  function gifFrameLimit(scene,options){const opt=options||{},width=Math.max(1,Math.round(opt.width||scene.width||320)),height=Math.max(1,Math.round(opt.height||scene.height||180));return Math.min(600,Math.max(1,Math.floor(96000000/(width*height))));}
  function lzw(indices){const clear=256,end=257,dict=new Map(),out=[];let next=258,bits=9,acc=0,count=0;const emit=code=>{acc|=code<<count;count+=bits;while(count>=8){out.push(acc&255);acc>>>=8;count-=8;}};const reset=()=>{dict.clear();next=258;bits=9;};emit(clear);reset();let prefix=indices[0];for(let index=1;index<indices.length;index++){const value=indices[index],key=prefix+','+value,known=dict.get(key);if(known!=null){prefix=known;continue;}emit(prefix);if(next<4096){dict.set(key,next++);if(next>(1<<bits)&&bits<12)bits++;}else{emit(clear);reset();}prefix=value;}emit(prefix);emit(end);if(count)out.push(acc&255);return new Uint8Array(out);}
  function indices(rgba,colors){const out=new Uint8Array(rgba.length/4),exact=new Map(colors.map((color,index)=>[color,index])),nearest=new Map(),find=color=>{if(exact.has(color))return exact.get(color);if(nearest.has(color))return nearest.get(color);const red=color>>>16,green=(color>>>8)&255,blue=color&255;let best=0,distance=Infinity;colors.forEach((candidate,index)=>{const dr=red-(candidate>>>16),dg=green-((candidate>>>8)&255),db=blue-(candidate&255),value=dr*dr+dg*dg+db*db;if(value<distance){distance=value;best=index;}});nearest.set(color,best);return best;};for(let at=0,pixel=0;at<rgba.length;at+=4,pixel++){if(rgba[at+3]<128){out[pixel]=255;continue;}out[pixel]=find((rgba[at]<<16)|(rgba[at+1]<<8)|rgba[at+2]);}return out;}
  function blocks(bytes,chunks){for(let at=0;at<bytes.length;at+=255){const size=Math.min(255,bytes.length-at);chunks.push(new Uint8Array([size]),bytes.slice(at,at+size));}chunks.push(new Uint8Array([0]));}
  async function gif(scene,options){const opt=options||{},fps=clamp(Math.round(+opt.fps||30),1,30),width=Math.max(1,Math.round(opt.width||scene.width||320)),height=Math.max(1,Math.round(opt.height||scene.height||180)),times=frameTimes(scene,opt,gifFrameLimit(scene,opt)),canvas=canvasFor(scene,width,height),ctx=canvas.getContext('2d'),runtime=runtimeFor(scene,opt.runtimeAssets),colorsByCount=new Map();try{for(const time of times){render(runtime,canvas,time);const data=ctx.getImageData(0,0,width,height).data;for(let at=0;at<data.length;at+=4)if(data[at+3]>=128){const color=(data[at]<<16)|(data[at+1]<<8)|data[at+2];colorsByCount.set(color,(colorsByCount.get(color)||0)+1);}}const colors=[...colorsByCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,255).map(item=>item[0]);if(!colors.length)colors.push(0);const chunks=[ascii('GIF89a'),le(width),le(height),new Uint8Array([0xf7,255,0]),palette(colors),new Uint8Array([0x21,0xff,0x0b]),ascii('NETSCAPE2.0'),new Uint8Array([3,1,0,0,0])],delay=Math.max(1,Math.round(100/fps));for(const time of times){render(runtime,canvas,time);chunks.push(new Uint8Array([0x21,0xf9,4,1]),le(delay),new Uint8Array([255,0]),new Uint8Array([0x2c]),le(0),le(0),le(width),le(height),new Uint8Array([0,8]));blocks(lzw(indices(ctx.getImageData(0,0,width,height).data,colors)),chunks);}chunks.push(new Uint8Array([0x3b]));return new Blob(chunks,{type:'image/gif'});}finally{release(runtime);}}
  global.EditorVNextExporter=Object.freeze({frameTimes,frame,png,pngFrames,spriteSheet,gif,gifFrameLimit});
})(typeof window!=='undefined'?window:globalThis);
