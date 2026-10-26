/* Continuous local-image particles. One texture/distribution per birth-time batch. */
(function(global){
 'use strict';const api=global.ToSampoolRuntimeVNext;
 function create(scene,surfaces,sources,sampler){
  const batches=new Map(),staticSources=new Set();let pixels=0,work=null;
  const keyFor=(id,stamp)=>JSON.stringify([id,stamp]);
  function stampFor(config,time){const fps=Math.max(1,Math.min(30,+config.sourceFps||12));return config.sampleTime==='fixed'?(+config.startTime||0):Math.floor(time*fps+1e-9)/fps;}
  function retain(emitter,events){const needed=new Set(events.map(e=>keyFor(emitter.id,stampFor(emitter.particle,e.birthTime))));if(events.length&&staticSources.has(emitter.id))needed.add(keyFor(emitter.id,'static'));for(const [key,b]of batches)if(b.ownerId===emitter.id&&!needed.has(key)){batches.delete(key);pixels-=b.canvas.width*b.canvas.height;}}
  function clear(){batches.clear();staticSources.clear();pixels=0;work=null;}
  function batch(emitter,time,stats){
   const config=emitter.particle,stamp=stampFor(config,time);let key=keyFor(emitter.id,staticSources.has(emitter.id)?'static':stamp);
   if(batches.has(key)){const value=batches.get(key);batches.delete(key);batches.set(key,value);return value;}
   const frame=api.modules.frame.create(scene,stamp,{pixelDivMultiplier:1});let context,instances,capture,range,canvas;
   try{
    context=sources.begin(frame,stats,{});instances=api.modules.pathInstances.begin(scene,frame,stats,surfaces);
    capture=api.modules.maskSources.obtain(scene,frame,surfaces,config.sourceId,'alpha',null,'full');const e=capture.entry,w=e.canvas.width,h=e.canvas.height;
    // Animated masks/emitters can change a static image's allowed distribution.
    const hasRange=emitter.particle.emissionRange&&emitter.particle.emissionRange.type!=='none';
    if(e.static&&!hasRange){staticSources.add(emitter.id);key=keyFor(emitter.id,'static');}
    if(w*h>16777216)throw Error('图层取样来源超过16MP预算');
    if(pixels+w*h>16777216)throw Error('存活图层粒子的来源缓存超过16MP，请降低来源刷新率、缩小来源或选择固定时刻取样');
    // Set CPU residency on the first context request. A pooled Canvas may
    // already have a GPU context; re-requesting options cannot change it.
    canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):document.createElement('canvas');canvas.width=w;canvas.height=h;
    const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(e.canvas,0,0);
    const rgba=c.getImageData(0,0,w,h).data,data=new Uint8Array(w*h),mask=frame.valuesFor(emitter).particle?.emissionRange;
    if(mask&&mask.type!=='none')range=sampler.prepare(mask,emitter,frame,stats,true);
    for(let i=0;i<data.length;i++)data[i]=Math.round(rgba[i*4+3]*(range?range.at(e.bounds.x+i%w+.5,e.bounds.y+Math.floor(i/w)+.5):1));
    const value={ownerId:emitter.id,canvas,bounds:{...e.bounds},distribution:api.modules.weightedDistribution.create({w,h,data}),stamp};
    batches.set(key,value);pixels+=w*h;canvas=null;stats.particleTextureBatchBuilds=(stats.particleTextureBatchBuilds||0)+1;return value;
   }finally{range?.release();capture?.release();instances?.release();context?.end();}
  }
  function pick(emitter,time,u,v,stats){const b=batch(emitter,time,stats),cell=b.distribution.pick(u,v);return cell?{position:[b.bounds.x+cell.x+.5,b.bounds.y+cell.y+.5],sampleTime:b.stamp}:null;}
  function draw(output,emitter,frame,stats,particles,range){
   if(!particles.length)return;
   if(!work){if(scene.width*scene.height>16777216)throw Error('图层粒子画布超过16MP预算');work=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(scene.width,scene.height):document.createElement('canvas');work.width=scene.width;work.height=scene.height;}
   const c=work.getContext('2d',{willReadFrequently:true}),values=frame.valuesFor(emitter),alpha=(values.parentAlpha??1)*values.alpha,size=Math.max(1,Math.round(+emitter.particle.cellSize||32));c.clearRect(0,0,work.width,work.height);c.save();
   try{c.imageSmoothingEnabled=false;
    for(const p of particles){const opacity=p.opacity*range.at(p.x,p.y);if(opacity<=0)continue;const b=batch(emitter,p.sampleTime,stats),sx=Math.round(p.origin[0]-b.bounds.x-size/2),sy=Math.round(p.origin[1]-b.bounds.y-size/2);
     c.save();try{c.globalAlpha=opacity;c.translate(Math.round(p.x),Math.round(p.y));c.transform(p.matrix[0],p.matrix[1],p.matrix[2],p.matrix[3],0,0);c.rotate(p.spin);c.scale(p.scale,p.scale);if(emitter.particle.fragmentShape==='circle'){c.beginPath();c.arc(0,0,size/2,0,Math.PI*2);c.clip();}c.drawImage(b.canvas,sx,sy,size,size,-size/2,-size/2,size,size);}finally{c.restore();}stats.particlesDrawn++;
    }
   }finally{c.restore();}
   output.save();try{output.globalAlpha*=alpha;output.globalCompositeOperation=api.modules.blend.toCanvas(values.blend);output.drawImage(work,0,0);}finally{output.restore();}
  }
  return Object.freeze({pick,draw,clear,retain});
 }
 api.modules.layerStream=Object.freeze({version:1,create});
})(typeof window!=='undefined'?window:globalThis);
