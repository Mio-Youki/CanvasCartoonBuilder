/* Canonical closed outlines and derived stroke paths. Source points are never edited. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map(),finite=(v,d)=>Number.isFinite(+v)?+v:d;
  const closed=p=>!['line','stroke','pencil'].includes(p.type);
  function regularPoints(sides){const n=Math.max(3,Math.min(64,Math.round(finite(sides,3))));return Array.from({length:n},(_,i)=>[.5+Math.sin(i/n*Math.PI*2)*.5,.5-Math.cos(i/n*Math.PI*2)*.5]);}
  function enhanced(p){return !p._pathGeometryApplied&&(p.pathEndpoints?.enabled||api.modules.pathExtensions?.active(p)||p.polygonMode==='regular'||p.type==='poly'&&+p.radius>0||p.type!=='stroke'&&(+p.strokeCompletion<100||+p.strokeTrimStart>0||+p.pathStart||p.strokeReverse||p.strokeDash?.enabled)||p.fillReveal==='center'||!!p.strokeWave?.enabled);}
  function trace(ctx,points,close){ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);}if(close&&points.length)ctx.closePath();}
  function rounded(vertices,radius,maxSteps=64){
    if(!(radius>0))return vertices;
    const out=[];
    for(let i=0;i<vertices.length;i++){
      const a=vertices[(i-1+vertices.length)%vertices.length],b=vertices[i],c=vertices[(i+1)%vertices.length],la=Math.hypot(a[0]-b[0],a[1]-b[1]),lc=Math.hypot(c[0]-b[0],c[1]-b[1]);
      if(!la||!lc){out.push(b);continue;}
      const ux=(a[0]-b[0])/la,uy=(a[1]-b[1])/la,vx=(c[0]-b[0])/lc,vy=(c[1]-b[1])/lc,angle=Math.acos(Math.max(-1,Math.min(1,ux*vx+uy*vy))),d=Math.min(la/2,lc/2,radius/Math.max(.0001,Math.tan(angle/2))),start=[b[0]+ux*d,b[1]+uy*d],end=[b[0]+vx*d,b[1]+vy*d],steps=Math.min(maxSteps,Math.max(2,Math.ceil(d/2)*2));
      for(let j=0;j<=steps;j++){const t=j/steps,s=1-t;out.push([s*s*start[0]+2*s*t*b[0]+t*t*end[0],s*s*start[1]+2*s*t*b[1]+t*t*end[1]]);}
    }
    return out;
  }
  function slice(points,from,to){
    const {distances,total}=api.modules.pathStroke.pathLengths(points);if(!total)return [];
    const at=d=>{let i=1;while(i<distances.length-1&&distances[i]<d)i++;const a=points[i-1],b=points[i],span=distances[i]-distances[i-1],t=span?(d-distances[i-1])/span:0;return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];};
    const out=[at(from)];for(let i=1;i<points.length-1;i++)if(distances[i]>from&&distances[i]<to)out.push(points[i]);out.push(at(to));return out;
  }
  function waved(outline,wave,isClosed){
    const {distances,total}=api.modules.pathStroke.pathLengths(outline);
    if(!(total>0))return outline;
    if(!wave.amplitude)return outline;
    const rhythm=api.modules.pathWave.compile(wave);
    if(rhythm.anchors&&rhythm.anchors.every(value=>value===0))return outline;
    const cycles=isClosed?Math.max(1,Math.round(total/wave.wavelength)):total/wave.wavelength;
    const wavelength=isClosed?total/cycles:wave.wavelength;
    const count=Math.min(8192,Math.max(2,Math.ceil(total/Math.min(1,wavelength/rhythm.samplesPerCycle))));
    const window=Math.min(6,wavelength/8,total/16),stroke=[];
    const at=distance=>{
      const d=isClosed?((distance%total)+total)%total:Math.max(0,Math.min(total,distance));
      let lo=1,hi=distances.length-1;
      while(lo<hi){const mid=(lo+hi)>>>1;if(distances[mid]<d)lo=mid+1;else hi=mid;}
      const a=outline[lo-1],b=outline[lo],span=distances[lo]-distances[lo-1],t=span?(d-distances[lo-1])/span:0;
      return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    };
    let segment=1;
    for(let i=0;i<=count;i++){
      const distance=total*i/count;
      while(segment<outline.length-1&&distances[segment]<distance)segment++;
      const a=outline[segment-1],b=outline[segment],span=distances[segment]-distances[segment-1],t=span?(distance-distances[segment-1])/span:0;
      const before=at(distance-window),after=at(distance+window);
      let dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy);
      if(length<1e-8){dx=b[0]-a[0];dy=b[1]-a[1];length=Math.hypot(dx,dy)||1;}
      const envelope=!isClosed&&wave.fixEnds?Math.sin(Math.PI*i/count):1;
      const offset=wave.amplitude*rhythm.sample(distance/wavelength+wave.phase)*envelope;
      stroke.push([a[0]+(b[0]-a[0])*t-dy/length*offset,a[1]+(b[1]-a[1])*t+dx/length*offset]);
    }
    if(isClosed)stroke[stroke.length-1]=stroke[0].slice();
    return stroke;
  }
  function full(part,box){
    const x=box?box.x:finite(part.x,0),y=box?box.y:finite(part.y,0),w=Math.max(1,box?box.w:finite(part.w,1)),h=Math.max(1,box?box.h:finite(part.h,1)),isClosed=closed(part),wave=api.modules.pathWave.normalize(part.strokeWave);
    const key=JSON.stringify([part.type,x,y,w,h,part.x2,part.y2,part.points,part.polygonMode,part.sides,part.radius,part.smoothing,wave]);
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    let outline;
    if(part.type==='stroke')outline=api.modules.pathStroke.smoothPoints(part.points||[],part.smoothing).map(p=>[p[0],p[1]]);
    else if(part.type==='line')outline=[[finite(part.x,x),finite(part.y,y)],[finite(part.x2,x+w),finite(part.y2,y+h)]];
    else if(part.type==='ellipse'){const n=Math.min(4096,Math.max(32,Math.ceil(Math.PI*(w+h)/2)));outline=Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return[x+w/2+Math.sin(a)*w/2,y+h/2-Math.cos(a)*h/2];});}
    else if(part.type==='poly'){
      outline=rounded((part.polygonMode==='regular'?regularPoints(part.sides):part.points||[]).map(p=>[x+p[0]*w,y+p[1]*h]),part.polygonMode==='regular'?Math.max(0,finite(part.radius,0)):0);
      if(part.polygonMode==='regular'&&outline.length){let first=0;for(let i=1;i<outline.length;i++)if(outline[i][1]<outline[first][1])first=i;outline=outline.slice(first).concat(outline.slice(0,first));}
    }
    else{const r=Math.min(w/2,h/2,Math.max(0,finite(part.radius,0)));outline=rounded([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],r);
      let best=0,right=Infinity;for(let i=0;i<outline.length;i++)if(Math.abs(outline[i][1]-y)<.00001&&outline[i][0]>=x+w/2-.00001&&outline[i][0]<right){right=outline[i][0];best=i;}
      if(!r)outline=[[x+w/2,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
      else{const start=[x+w/2,y];outline=[start,...outline.slice(best),...outline.slice(0,best)];}
    }
    if(isClosed&&outline.length)outline=outline.concat([outline[0]]);
    const stroke=wave.enabled&&outline.length>1?waved(outline,wave,isClosed):outline;
    const value={outline,stroke,closed:isClosed,box:{x,y,w,h}};cache.set(key,value);if(cache.size>64)cache.delete(cache.keys().next().value);return value;
  }
  function visible(part,points,isClosed){
    part=api.modules.pathStroke.progress(part);
    const total=api.modules.pathStroke.pathLengths(points).total,range=api.modules.pathStroke.trimInterval(part,isClosed);
    if(!total||!range.amount)return{points:[],startDistance:0};
    if(!isClosed){const from=total*(part.strokeReverse?1-range.end:range.start),to=total*(part.strokeReverse?1-range.start:range.end);return{points:slice(points,from,to),startDistance:from};}
    let start=((finite(part.pathStart,0)%1)+1)%1*total;
    if(part.strokeReverse){const reversed=points.slice().reverse();start=(total-start)%total;points=reversed;}
    start=(start+range.start*total)%total;
    const amount=total*range.amount,end=start+amount;
    return{points:end<=total?slice(points,start,end):slice(points,start,total).concat(slice(points,0,end-total).slice(1)),startDistance:part.strokeReverse?-start:start};
  }
  function paint(ctx,part,box,fill,context){
    part=api.modules.pathStroke.progress(part);
    const geometry=full(part,box),complete=api.modules.pathStroke.trimInterval(part,geometry.closed).amount*100,follow=part.fillReveal==='center'&&geometry.closed&&(part.type!=='poly'||part.polygonMode==='regular');
    const boundary=geometry.stroke;
    const extensions=api.modules.pathExtensions,extended=extensions&&extensions.active(part),sourceVisible=!extended||extensions.normalize(part).showSource;
    if(sourceVisible&&geometry.closed&&(!follow||complete>0)){
      ctx.save();
      if(follow&&complete<100){const edge=visible(part,boundary,true).points,center=[geometry.box.x+geometry.box.w/2,geometry.box.y+geometry.box.h/2];trace(ctx,[center,...edge,center],true);ctx.clip();}
      trace(ctx,boundary,true);fill(Object.assign({},part,{stroke:null,_pathGeometryApplied:true}));ctx.restore();
    }
    if(sourceVisible&&part.stroke&&+part.strokeWidth>0&&complete>0){const path=visible(part,geometry.stroke,geometry.closed);if(path.points.length>=2){trace(ctx,path.points,geometry.closed&&complete>=100);ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,finite(part.strokeAlpha,1)));ctx.strokeStyle=part.stroke;api.modules.pathStroke.configure(ctx,Object.assign({},part,{_strokeDashAdvance:path.startDistance}));ctx.stroke();ctx.restore();}}
    if(extended)extensions.paint(ctx,part,geometry,context);
    if(part.pathEndpoints?.enabled)api.modules.pathInstances.paint(ctx,part,geometry,context,'endpoints');
    api.modules.pathEndpoints.paint(ctx,part,geometry);
  }
  function inside(points,x,y){
    let winding=0;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[j],b=points[i],cross=(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1]);
      if(a[1]<=y&&b[1]>y&&cross>0)winding++;else if(a[1]>y&&b[1]<=y&&cross<0)winding--;
    }
    return winding!==0;
  }
  function contains(part,box,x,y,tolerance,context){
    part=api.modules.pathStroke.progress(part);
    const g=full(part,box),path=visible(part,g.stroke,g.closed),complete=api.modules.pathStroke.trimInterval(part,g.closed).amount*100,follow=part.fillReveal==='center'&&g.closed&&(part.type!=='poly'||part.polygonMode==='regular');
    const extensions=api.modules.pathExtensions;
    if(part.pathEndpoints?.enabled&&(api.modules.pathEndpoints.contains(part,g,x,y,tolerance)||api.modules.pathInstances.contains(part,g,context,x,y)))return true;
    if(extensions?.active(part)){
      if(api.modules.pathInstances.contains(part,g,context,x,y))return true;
      if(extensions.contains(part,g,x,y,tolerance))return true;
      if(!extensions.normalize(part).showSource)return false;
    }
    if(g.closed&&(part.fill||part.fillPaint||part.fillPattern?.type&&part.fillPattern.type!=='none')&&(!follow||complete>0)&&inside(g.stroke,x,y)){
      if(!follow||complete>=100||inside([[g.box.x+g.box.w/2,g.box.y+g.box.h/2],...path.points],x,y))return true;
    }
    if(part.stroke&&+part.strokeWidth>0){const radius=Math.max(+part.strokeWidth/2,+tolerance||0);for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)):0;if(Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)<=radius)return true;}}
    return false;
  }
  api.modules.pathGeometry=Object.freeze({regularPoints,rounded,enhanced,full,visible,trace,paint,closed,contains});
})(typeof window!=='undefined'?window:globalThis);
