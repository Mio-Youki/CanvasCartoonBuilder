/* Point/gray consumers share the mask domain, placement, assets and captures. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,I=[1,0,0,1,0,0];
  const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
  function inverse(m){const d=m[0]*m[3]-m[1]*m[2];return Math.abs(d)<1e-10?null:[m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
  function box(mask){
    if(mask.type==='shapes'){const b=mask.shapes.map(box),x=Math.min(...b.map(v=>v.x)),y=Math.min(...b.map(v=>v.y));return{x,y,w:Math.max(...b.map(v=>v.x+v.w))-x,h:Math.max(...b.map(v=>v.y+v.h))-y};}
    if(mask.type==='poly'){const xs=mask.points.map(p=>p[0]),ys=mask.points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(1,Math.max(...xs)-x),h:Math.max(1,Math.max(...ys)-y)};}
    return{x:mask.x,y:mask.y,w:mask.w,h:mask.h};
  }
  function create(scene,surfaces){
    let serial=0,bytes=0,weightBytes=0;const imageIds=new WeakMap(),images=new Map(),objects=new WeakMap(),weightIds=new WeakMap(),weights=new Map();
    const weightId=value=>{if(!weightIds.has(value))weightIds.set(value,++serial);return weightIds.get(value);};
    function distribution(key,build,stats){
      const cached=weights.get(key);if(cached){weights.delete(key);weights.set(key,cached);return cached;}
      const index=api.modules.weightedDistribution.create(build());stats.particleWeightBuilds=(stats.particleWeightBuilds||0)+1;
      if(index.field.data.length<=8388608){weights.set(key,index);weightBytes+=index.field.data.length;while(weightBytes>8388608){const [id,old]=weights.entries().next().value;weights.delete(id);weightBytes-=old.field.data.length;}}return index;
    }
    function gray(ctx,w,h,mode,stats){
      const rgba=ctx.getImageData(0,0,w,h).data,data=new Uint8Array(w*h);for(let i=0;i<data.length;i++)data[i]=api.modules.maskContract.channel(rgba[i*4],rgba[i*4+1],rgba[i*4+2],rgba[i*4+3],mode);
      stats.particleMaskReadbacks=(stats.particleMaskReadbacks||0)+1;stats.particleMaskPixels=(stats.particleMaskPixels||0)+w*h;return{data,w,h};
    }
    function imageGray(image,mode,stats){
      if(!imageIds.has(image))imageIds.set(image,++serial);const key=imageIds.get(image)+':'+mode,cached=images.get(key);if(cached){images.delete(key);images.set(key,cached);return cached;}
      const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;if(!(w>0&&h>0)||w*h>16777216)throw Error('粒子蒙版图片尺寸无效或超过16MP预算');
      const canvas=surfaces.acquire(w,h);let field;try{const c=canvas.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,w,h);c.drawImage(image,0,0);field=gray(c,w,h,mode,stats);}finally{surfaces.release(canvas);}
      if(field.data.length<=8388608){images.set(key,field);bytes+=field.data.length;while(bytes>8388608){const [id,old]=images.entries().next().value;images.delete(id);bytes-=old.data.length;}}return field;
    }
    function value(field,x,y){const ix=Math.floor(x),iy=Math.floor(y);return ix<0||iy<0||ix>=field.w||iy>=field.h?0:field.data[iy*field.w+ix]/255;}
    function bilinear(field,x,y){
      const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,at=(px,py)=>field.data[Math.max(0,Math.min(field.h-1,py))*field.w+Math.max(0,Math.min(field.w-1,px))]/255;
      return(at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
    }
    function prepare(mask,owner,frame,stats={},bulk=false){
      const values=frame.valuesFor(owner),emitterMatrix=values.worldMatrix||api.modules.frame.matrixFor(values),finite={x:0,y:0,w:values.w,h:values.h},finiteInverse=inverse(emitterMatrix);
      const finiteContains=(x,y)=>{if(!finiteInverse)return false;const p=point(finiteInverse,x,y);return p[0]>=0&&p[1]>=0&&p[0]<values.w&&p[1]<values.h;};
      const defaultPoint=(u,v)=>point(emitterMatrix,u*values.w,v*values.h);
      if(!mask||mask.type==='none')return{candidate:defaultPoint,at:()=>1,pick:finiteInverse?defaultPoint:()=>null,release(){}};
      const mode=mask.mode||'alpha';let candidate,read,release=()=>{},getField,fieldKey,directPick,valid=true,empty=false;
      if(mask.type==='element'){
        const capture=api.modules.maskSources.obtain(scene,frame,surfaces,mask.targetId,'alpha',mask.geometryMatrix||null,mask.sourceQuality),entry=capture.entry,b=entry.bounds,c=entry.canvas.getContext('2d');release=capture.release;
        try{
          candidate=(u,v)=>[b.x+u*b.w,b.y+v*b.h];let field;
          getField=()=>{let modes=objects.get(entry);if(!modes){modes={};objects.set(entry,modes);}return field||(field=modes[mode]||(modes[mode]=gray(c,entry.canvas.width,entry.canvas.height,mode,stats)));};
          if(bulk||entry.static)getField();fieldKey='object:'+weightId(entry)+':'+mode;
          read=(x,y)=>{x-=b.x;y-=b.y;if(x<0||y<0||x>=b.w||y>=b.h)return 0;if(field)return value(field,x,y);const p=c.getImageData(Math.floor(x),Math.floor(y),1,1).data;stats.particleMaskReadbacks=(stats.particleMaskReadbacks||0)+1;stats.particleMaskPixels=(stats.particleMaskPixels||0)+1;return api.modules.maskContract.channel(p[0],p[1],p[2],p[3],mode)/255;};
        }catch(error){release();throw error;}
      }else{
        const m=api.modules.masks.placementMatrix(mask,owner,frame),inv=inverse(m),b=box(mask);candidate=(u,v)=>point(m,b.x+u*b.w,b.y+v*b.h);valid=!!inv&&b.w>0&&b.h>0;
        if(mask.type==='alpha'){
          const image=api.modules.masks.alphaAsset(scene,mask,frame);if(!image)throw Error('粒子蒙版缺少图片素材：'+mask.assetId);const field=imageGray(image,mode,stats);
          getField=()=>field;fieldKey='image:'+weightId(field);
          read=(x,y)=>{if(!inv)return 0;const p=point(inv,x,y),u=(p[0]-b.x)/b.w,v=(p[1]-b.y)/b.h;return u<0||v<0||u>=1||v>=1?0:bilinear(field,u*field.w-.5,v*field.h-.5);};
        }else if(['rect','ellipse','poly','shapes'].includes(mask.type)){
          read=(x,y)=>{if(!inv)return 0;const p=point(inv,x,y);return api.modules.maskContract.containsGeometry(mask,p[0],p[1])?1:0;};
          if(mask.type==='rect')directPick=candidate;
          if(mask.type==='rect'&&mask.invert&&inv)empty=[[0,0],[1,0],[1,1],[0,1]].every(([u,v])=>{const p=point(inv,...defaultPoint(u,v));return api.modules.maskContract.containsGeometry(mask,...p);});
          if(mask.type==='ellipse')directPick=(u,v)=>{const r=Math.sqrt(u),a=v*Math.PI*2;return point(m,b.x+b.w/2+Math.cos(a)*r*b.w/2,b.y+b.h/2+Math.sin(a)*r*b.h/2);};
          fieldKey='geometry:'+weightId(mask);
          getField=()=>{const w=Math.max(1,Math.ceil(b.w)),h=Math.max(1,Math.ceil(b.h));if(w*h>16777216)throw Error('粒子权重区域超过16MP预算');const canvas=surfaces.acquire(w,h);try{const c=canvas.getContext('2d');c.clearRect(0,0,w,h);c.save();c.setTransform(w/b.w,0,0,h/b.h,-b.x*w/b.w,-b.y*h/b.h);api.modules.masks.clipPath(c,mask);c.clip();c.fillStyle='#fff';c.fillRect(b.x,b.y,b.w,b.h);c.restore();const field=gray(c,w,h,'alpha',stats);for(let i=0;i<field.data.length;i++)if(field.data[i]>0&&field.data[i]<255&&!api.modules.maskContract.containsGeometry(mask,b.x+(i%w+.5)/w*b.w,b.y+(Math.floor(i/w)+.5)/h*b.h))field.data[i]=0;return field;}finally{surfaces.release(canvas);}};
        }
        else throw Error('粒子范围尚未支持蒙版：'+mask.type);
      }
      const at=(x,y)=>mask.invert?(finiteContains(x,y)?1-read(x,y):0):read(x,y);
      if(mask.invert){
        directPick=null;const placement=mask.type==='element'?mask.geometryMatrix||I:api.modules.masks.placementMatrix(mask,owner,frame),relative=finiteInverse?api.modules.frame.multiply(finiteInverse,placement):I;
        fieldKey='inverse:'+weightId(mask)+':'+fieldKey+':'+values.w+','+values.h+':'+relative.join(',');
        getField=()=>{const w=Math.max(1,Math.ceil(values.w)),h=Math.max(1,Math.ceil(values.h)),b=api.modules.objects.boundsFor(values,0);if(w*h>16777216||b.w*b.h>16777216)throw Error('粒子权重区域超过16MP预算');const world=surfaces.acquire(b.w,b.h),local=surfaces.acquire(w,h);try{const c=world.getContext('2d');c.clearRect(0,0,b.w,b.h);c.fillStyle='#fff';c.fillRect(0,0,b.w,b.h);api.modules.masks.apply(world,mask,b,scene,frame,surfaces,owner);const out=local.getContext('2d');out.clearRect(0,0,w,h);out.save();out.transform(...finiteInverse);out.drawImage(world,b.x,b.y);out.restore();return gray(out,w,h,'alpha',stats);}finally{surfaces.release(world);surfaces.release(local);}};
      }
      function pick(u,v,jx=.5,jy=.5){
        if(empty||!valid||mask.invert&&!finiteInverse)return null;if(directPick&&!mask.invert)return directPick(u,v);
        const index=distribution(fieldKey,getField,stats),cell=index.pick(u,v);if(!cell)return null;
        const map=mask.invert?defaultPoint:candidate,p=map((cell.x+jx)/index.field.w,(cell.y+jy)/index.field.h);return at(...p)>0?p:map((cell.x+.5)/index.field.w,(cell.y+.5)/index.field.h);
      }
      return{candidate:mask.invert?defaultPoint:candidate,at,pick,release};
    }
    return Object.freeze({prepare,clear(){images.clear();weights.clear();bytes=0;weightBytes=0;}});
  }
  api.modules.maskSampler=Object.freeze({create,point,inverse,box});
})(typeof window!=='undefined'?window:globalThis);
