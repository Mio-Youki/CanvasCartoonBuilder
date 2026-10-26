/* Isolated Layer-emitter experiment. Formal capture + shared particle motion. */
(function(global){
  'use strict';
  const rt=global.ToSampoolRuntimeVNext;
  function capture(input,sourceId,time=0){
    const scene=rt.modules.scene.normalize(input),surfaces=rt.modules.surfaces.create(),sources=rt.modules.maskSources.create(scene,surfaces),frame=rt.modules.frame.create(scene,time,{pixelDivMultiplier:1}),stats={},context=sources.begin(frame,stats,{}),instances=rt.modules.pathInstances.begin(scene,frame,stats,surfaces);
    let captured;
    try{captured=rt.modules.maskSources.obtain(scene,frame,surfaces,sourceId,'alpha',null,'full');const canvas=document.createElement('canvas');canvas.width=scene.width;canvas.height=scene.height;canvas.getContext('2d').drawImage(captured.entry.canvas,captured.entry.bounds.x,captured.entry.bounds.y);return canvas;}
    finally{captured?.release();instances.release();context.end();sources.clear();surfaces.clear();}
  }
  function create(snapshot,cellSize=16){
    const width=snapshot.width,height=snapshot.height,size=Math.max(1,Math.round(cellSize));if(width*height>16777216)throw Error('实验图层超过16MP');
    const data=snapshot.getContext('2d').getImageData(0,0,width,height).data,stride=width+1,sums=new Uint32Array(stride*(height+1)),cells=[];
    for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){row+=data[(y*width+x)*4+3];sums[(y+1)*stride+x+1]=sums[y*stride+x+1]+row;}}
    let index=0;for(let y=0;y<height;y+=size)for(let x=0;x<width;x+=size){const w=Math.min(size,width-x),h=Math.min(size,height-y),alpha=sums[(y+h)*stride+x+w]-sums[y*stride+x+w]-sums[(y+h)*stride+x]+sums[y*stride+x];if(alpha)cells.push({x,y,w,h,index});index++;}
    if(cells.length>65536)throw Error('切片超过65536，请增大切片尺寸');
    let motionKey='',motions=[];
    function render(target,time,options={}){
      if(target.width!==width)target.width=width;if(target.height!==height)target.height=height;
      const c=target.getContext('2d'),life=Math.max(.001,+options.life||2),age=Math.max(0,+time||0),state={},seed=options.seed==null?1:+options.seed,params={speed:35,direction:-90,spread:150,gravity:12,fade:true,size:1,alpha:1,...options};
      c.clearRect(0,0,width,height);let drawn=0;if(age>=life)return{cells:cells.length,drawn:0};
      const key=JSON.stringify([seed,params.speed,params.direction,params.spread,params.wind,params.gravity,params.size,params.sizeVar,params.spin,params.spinVar]);
      if(key!==motionKey){motions=cells.map(cell=>{const initial=rt.modules.particleBirths.motion(params,cell.index,seed,0,life,{});rt.modules.particleBirths.motion(params,cell.index,seed,1,life,state);return{vx:state.dx-(+params.wind||0)/2,vy:state.dy-(+params.gravity||0)/2,scale:initial.scale,spin:initial.spin};});motionKey=key;}
      c.save();c.globalAlpha=Math.max(0,Math.min(1,+params.alpha))*(params.fade===false?1:1-age/life);
      const ax=(+params.wind||0)*age*age/2,ay=(+params.gravity||0)*age*age/2,spinSpeed=(+params.spinSpeed||0)*Math.PI/180;
      for(let i=0;i<cells.length;i++){const cell=cells[i],m=motions[i],dx=m.vx*age+ax,dy=m.vy*age+ay,spin=m.spin+spinSpeed*age;
        if(!spin&&m.scale===1)c.drawImage(snapshot,cell.x,cell.y,cell.w,cell.h,cell.x+dx,cell.y+dy,cell.w,cell.h);
        else{c.save();c.translate(cell.x+cell.w/2+dx,cell.y+cell.h/2+dy);if(spin)c.rotate(spin);if(m.scale!==1)c.scale(m.scale,m.scale);c.drawImage(snapshot,cell.x,cell.y,cell.w,cell.h,-cell.w/2,-cell.h/2,cell.w,cell.h);c.restore();}drawn++;
      }c.restore();return{cells:cells.length,drawn};
    }
    return Object.freeze({snapshot,cells,render});
  }
  global.ToSampoolLayerFragmentProbe=Object.freeze({capture,create});
})(typeof window!=='undefined'?window:globalThis);
