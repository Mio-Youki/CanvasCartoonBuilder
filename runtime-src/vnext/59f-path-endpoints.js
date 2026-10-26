/* Completion markers share canonical path geometry and frame-scoped stamps. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,finite=(v,d)=>Number.isFinite(+v)?+v:d;
  function normalize(part){const s=part.pathEndpoints||{};return{enabled:!!s.enabled,type:['bar','object'].includes(s.type)?s.type:'circle',size:Math.max(0,finite(s.size,8)),width:Math.max(0,finite(s.width,12)),sourceId:typeof s.sourceId==='string'?s.sourceId:'',start:!!s.start,end:s.end!==false};}
  function placements(part,geometry){
    part=api.modules.pathStroke.progress(part);
    const config=normalize(part);if(!config.enabled||!(api.modules.pathStroke.trimInterval(part,geometry.closed).amount>0))return[];
    const path=api.modules.pathGeometry.visible(part,geometry.stroke,geometry.closed).points;if(path.length<2)return[];
    const reverse=!!part.strokeReverse&&!geometry.closed,points=reverse?path.slice().reverse():path,first=points[0],last=points[points.length-1],out=[];
    for(const [enabled,index,neighbor]of[[config.start,0,1],[config.end,points.length-1,points.length-2]]){
      if(!enabled)continue;const point=points[index];if(out.length&&Math.hypot(point[0]-first[0],point[1]-first[1])<1e-7)continue;
      let other=points[neighbor],dx=index===0?other[0]-point[0]:point[0]-other[0],dy=index===0?other[1]-point[1]:point[1]-other[1];
      if(Math.hypot(dx,dy)<1e-9){for(const p of points)if(Math.hypot(p[0]-point[0],p[1]-point[1])>1e-9){dx=p[0]-point[0];dy=p[1]-point[1];break;}}
      out.push({point,angle:Math.atan2(dy,dx),scale:1,endpoint:true});
    }
    return out;
  }
  function bounds(part,geometry){const s=normalize(part);if(s.type==='object')return null;const points=placements(part,geometry);if(!points.length)return null;
    const r=s.type==='circle'?s.size/2:s.width/2+Math.max(1,finite(part.strokeWidth,1))/2,
      x=Math.min(...points.map(p=>p.point[0]-r)),y=Math.min(...points.map(p=>p.point[1]-r));
    return{x,y,w:Math.max(...points.map(p=>p.point[0]+r))-x,h:Math.max(...points.map(p=>p.point[1]+r))-y};
  }
  function contains(part,geometry,x,y,tolerance){const s=normalize(part);if(s.type==='object')return false;
    return placements(part,geometry).some(p=>{const dx=x-p.point[0],dy=y-p.point[1],c=Math.cos(p.angle),n=Math.sin(p.angle),pad=Math.max(0,+tolerance||0);
      return s.type==='circle'?Math.hypot(dx,dy)<=s.size/2+pad:Math.abs(dx*c+dy*n)<=Math.max(1,finite(part.strokeWidth,1))/2+pad&&Math.abs(-dx*n+dy*c)<=s.width/2+pad;});
  }
  function paint(ctx,part,geometry){const s=normalize(part);if(s.type==='object')return;
    for(const p of placements(part,geometry)){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,finite(part.stroke?part.strokeAlpha:part.fillAlpha,1)));ctx.fillStyle=part.stroke||part.fill||'#ffffff';ctx.translate(...p.point);ctx.rotate(p.angle);ctx.beginPath();
      if(s.type==='circle'){if(s.size>0)ctx.arc(0,0,s.size/2,0,Math.PI*2);}else{const thickness=Math.max(1,finite(part.strokeWidth,1));ctx.rect(-thickness/2,-s.width/2,thickness,s.width);}ctx.fill();ctx.restore();}
  }
  api.modules.pathEndpoints=Object.freeze({normalize,placements,bounds,contains,paint});
})(typeof window!=='undefined'?window:globalThis);
