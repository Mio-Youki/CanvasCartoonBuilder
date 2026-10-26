/* Burst fragments: one isolated source snapshot, shared pixels and deterministic motion. */
(function(global){
 'use strict';
 const api=global.ToSampoolRuntimeVNext;
 function create(scene,surfaces,sources){
  const cache=new Map();let pixels=0,work=null;
  function clear(){for(const v of cache.values())surfaces.release(v.canvas);cache.clear();pixels=0;work=null;}
  function obtain(emitter,stats){
   if(cache.has(emitter.id))return cache.get(emitter.id);
   const p=emitter.particle,start=+p.startTime||0,frame=api.modules.frame.create(scene,start,{pixelDivMultiplier:1}),v=frame.valuesFor(emitter),params={...v.particle},size=Math.max(1,Math.round(+p.cellSize||32));let context,instances,capture,canvas;
   try{
    context=sources.begin(frame,stats,{});instances=api.modules.pathInstances.begin(scene,frame,stats,surfaces);
    capture=api.modules.maskSources.obtain(scene,frame,surfaces,p.sourceId,'alpha',null,'full');const entry=capture.entry,w=entry.canvas.width,h=entry.canvas.height;
    if(w*h>16777216)throw Error('图层切片来源超过16MP预算');
    canvas=surfaces.acquire(w,h);const c=canvas.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,w,h);c.drawImage(entry.canvas,0,0);
    const rgba=c.getImageData(0,0,w,h).data,cells=[],seed=params.seed==null?1:+params.seed;
    for(let y=0,index=0;y<h;y+=size)for(let x=0;x<w;x+=size,index++){
     const cw=Math.min(size,w-x),ch=Math.min(size,h-y);let visible=false;
     for(let yy=y;yy<y+ch&&!visible;yy++)for(let xx=x;xx<x+cw;xx++)if(rgba[(yy*w+xx)*4+3]){visible=true;break;}
     if(!visible)continue;
     const m0=api.modules.particleBirths.motion(params,index,seed,0,1,{}),m1=api.modules.particleBirths.motion(params,index,seed,1,1,{});
     cells.push({x,y,w:cw,h:ch,vx:m1.dx-(+params.wind||0)/2,vy:m1.dy-(+params.gravity||0)/2,scale:m0.scale,spin:m0.spin});
     if(cells.length>16384)throw Error('图层切片超过16384，请增大切片尺寸');
    }
    while(pixels+w*h>16777216&&cache.size){const [key,old]=cache.entries().next().value;cache.delete(key);pixels-=old.canvas.width*old.canvas.height;surfaces.release(old.canvas);}
    const value={canvas,cells,bounds:entry.bounds,matrix:v.worldMatrix.slice(),params,start};cache.set(emitter.id,value);pixels+=w*h;canvas=null;stats.particleLayerBuilds=(stats.particleLayerBuilds||0)+1;return value;
   }finally{if(canvas)surfaces.release(canvas);capture?.release();instances?.release();context?.end();}
  }
  function draw(output,emitter,frame,stats,range){
   const layer=obtain(emitter,stats),p=layer.params,life=Math.max(.001,+p.life||2),age=Math.max(0,frame.time-layer.start);if(age>=life)return;
   const current=frame.valuesFor(emitter),M=layer.matrix,alpha=(current.parentAlpha??1)*current.alpha*(p.alpha??1)*(p.fade===false?1:1-age/life),ax=(+p.wind||0)*age*age/2,ay=(+p.gravity||0)*age*age/2,spinSpeed=(+p.spinSpeed||0)*Math.PI/180;
   // A dedicated CPU surface keeps overlapping translucent fragments stable
   // when the host Canvas changes acceleration after screenshots/readback.
   if(!work){if(scene.width*scene.height>16777216)throw Error('图层切片画布超过16MP预算');work=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(scene.width,scene.height):document.createElement('canvas');work.width=scene.width;work.height=scene.height;}
   const ctx=work.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,work.width,work.height);
   ctx.save();try{
    ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;ctx.transform(...M);
    for(const cell of layer.cells){const dx=cell.vx*age+ax,dy=cell.vy*age+ay,x=layer.bounds.x+cell.x+dx,y=layer.bounds.y+cell.y+dy,cx=x+cell.w/2,cy=y+cell.h/2,opacity=alpha*range.at(M[0]*cx+M[2]*cy+M[4],M[1]*cx+M[3]*cy+M[5]);if(opacity<=0)continue;ctx.globalAlpha=opacity;const spin=cell.spin+spinSpeed*age;
     if(!spin&&cell.scale===1&&emitter.particle.fragmentShape!=='circle')ctx.drawImage(layer.canvas,cell.x,cell.y,cell.w,cell.h,Math.round(x),Math.round(y),cell.w,cell.h);
     else{ctx.save();ctx.translate(cx,cy);ctx.rotate(spin);ctx.scale(cell.scale,cell.scale);if(emitter.particle.fragmentShape==='circle'){ctx.beginPath();ctx.arc(0,0,Math.min(cell.w,cell.h)/2,0,Math.PI*2);ctx.clip();}ctx.drawImage(layer.canvas,cell.x,cell.y,cell.w,cell.h,-cell.w/2,-cell.h/2,cell.w,cell.h);ctx.restore();}stats.particlesDrawn++;
    }
    stats.particleLayerCells=layer.cells.length;
   }finally{ctx.restore();}
   output.save();try{output.globalCompositeOperation=api.modules.blend.toCanvas(current.blend);output.drawImage(work,0,0);}finally{output.restore();}
  }
  return Object.freeze({draw,clear});
 }
 api.modules.layerFragments=Object.freeze({version:2,create});
})(typeof window!=='undefined'?window:globalThis);
