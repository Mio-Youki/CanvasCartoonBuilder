/* Shared stroke geometry/styles. Authored points remain untouched by smoothing. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new WeakMap(),boundsCache=new WeakMap(),pointBoxes=new WeakMap(),lengthCache=new WeakMap();
  const finite=(value,fallback)=>Number.isFinite(+value)?+value:fallback;
  function normalize(value){
    const source=value||{},pencil=source.type==='stroke'||source.type==='pencil',dash=source.strokeDash||{};
    const result={strokeCap:['butt','round','square'].includes(source.strokeCap)?source.strokeCap:(pencil?'round':'butt'),
      strokeJoin:['miter','round','bevel'].includes(source.strokeJoin)?source.strokeJoin:(pencil?'round':'miter'),
      smoothing:Math.max(0,Math.min(100,finite(source.smoothing,0))),
      strokeDash:{enabled:!!dash.enabled,length:Math.max(.01,finite(dash.length,3)),gap:Math.max(0,finite(dash.gap,2)),
        offset:Math.max(0,Math.min(1,finite(dash.offset,0)))}};
    result.strokeCompletion=Math.max(0,Math.min(100,finite(source.strokeCompletion,100)));result.strokeReverse=!!source.strokeReverse;
    result.strokeTrimStart=Math.max(0,Math.min(100,finite(source.strokeTrimStart,0)));
    result.pathStart=Math.max(0,Math.min(1,finite(source.pathStart,0)));result.fillReveal=source.fillReveal==='center'?'center':'none';
    result.pathRevealEnabled=source.pathRevealEnabled==null?(result.strokeCompletion<100||result.strokeTrimStart>0||!!source.pathStart||!!source.strokeReverse||result.fillReveal==='center'||!!source.pathEndpoints?.enabled):!!source.pathRevealEnabled;
    result.strokeWave=api.modules.pathWave.normalize(source.strokeWave);
    result.pathEndpoints=api.modules.pathEndpoints.normalize(source);
    if(source.type==='poly'){result.polygonMode=source.polygonMode==='regular'?'regular':'free';result.sides=Math.max(3,Math.min(64,Math.round(finite(source.sides,3))));result.radius=Math.max(0,finite(source.radius,0));}
    return result;
  }
  function configure(ctx,value){
    const style=normalize(value),width=Math.max(0,finite(value.strokeWidth,1)),dash=style.strokeDash;
    ctx.lineWidth=width;ctx.lineCap=style.strokeCap;ctx.lineJoin=style.strokeJoin;ctx.miterLimit=4;
    if(ctx.setLineDash)ctx.setLineDash(dash.enabled?[dash.length*width,dash.gap*width]:[]);
    ctx.lineDashOffset=dash.enabled?-dash.offset*(dash.length+dash.gap)*width+finite(value._strokeDashAdvance,0):0;
    return style;
  }
  // Disabling reveal bypasses its rendering, never rewrites stored values/tracks.
  function progress(part){
    if(normalize(part).pathRevealEnabled)return part;
    return Object.assign({},part,{strokeCompletion:100,strokeTrimStart:0,pathStart:0,strokeReverse:false,fillReveal:'none',pathEndpoints:Object.assign({},part.pathEndpoints,{enabled:false})});
  }
  function trimInterval(part,closed){const start=Math.max(0,Math.min(100,finite(part.strokeTrimStart,0)))/100,end=Math.max(0,Math.min(100,finite(part.strokeCompletion,100)))/100;return{start,end,amount:closed&&end<start?1-start+end:Math.max(0,end-start)};}
  function smoothPoints(points,amount){
    if(!Array.isArray(points)||points.length<3||!(amount>0))return points||[];
    amount=Math.max(0,Math.min(100,finite(amount,0)));
    let entries=cache.get(points);if(entries&&entries.has(amount))return entries.get(amount);
    const distances=[0];let total=0,minX=points[0][0],maxX=minX,minY=points[0][1],maxY=minY;
    for(let index=1;index<points.length;index++){
      total+=Math.hypot(points[index][0]-points[index-1][0],points[index][1]-points[index-1][1]);distances.push(total);
      minX=Math.min(minX,points[index][0]);maxX=Math.max(maxX,points[index][0]);minY=Math.min(minY,points[index][1]);maxY=Math.max(maxY,points[index][1]);
    }
    if(!total)return points;
    // Distance-based sampling avoids giving slow mouse movement extra weight.
    // Very long paths bound their derived sample count; source points stay intact.
    const count=Math.min(8192,Math.max(2,Math.ceil(total))),step=total/count,samples=[];
    let segment=1;
    for(let index=0;index<=count;index++){
      const distance=index*step;while(segment<points.length-1&&distances[segment]<distance)segment++;
      const a=points[segment-1],b=points[segment],span=distances[segment]-distances[segment-1],t=span?(distance-distances[segment-1])/span:0;
      samples.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    }
    // Scale with the authored stroke, never with canvas size, zoom or object scale.
    const strength=amount/100,extent=Math.hypot(maxX-minX,maxY-minY),
      radius=Math.min(Math.max(12,Math.min(256,extent*.02))*strength,total*.2),
      window=Math.max(1,Math.ceil(radius/step)),output=[],n=samples.length,
      px=new Float64Array(n+1),py=new Float64Array(n+1),mx=new Float64Array(n+1),my=new Float64Array(n+1),
      origin=samples[0];
    // Prefix sums and first moments evaluate the triangular kernel in O(1) per point.
    // Local coordinates reduce cancellation for strokes far from the origin.
    for(let index=0;index<n;index++){
      const x=samples[index][0]-origin[0],y=samples[index][1]-origin[1];
      px[index+1]=px[index]+x;py[index+1]=py[index]+y;mx[index+1]=mx[index]+index*x;my[index+1]=my[index]+index*y;
    }
    const weighted=(sum,moment,index,left,right)=>(window+1-index)*(sum[index+1]-sum[left])+(moment[index+1]-moment[left])+
      (window+1+index)*(sum[right+1]-sum[index+1])-(moment[right+1]-moment[index+1]);
    for(let index=0;index<samples.length;index++){
      if(index===0||index===count){output.push(points[index===0?0:points.length-1].slice());continue;}
      const left=Math.max(0,index-window),right=Math.min(count,index+window),l=index-left+1,r=right-index,
        weight=l*(window+1)-l*(l-1)/2+r*(window+1)-r*(r+1)/2,
        x=origin[0]+weighted(px,mx,index,left,right)/weight,y=origin[1]+weighted(py,my,index,left,right)/weight;
      const blend=strength*Math.min(1,index*step/Math.max(1,radius),(count-index)*step/Math.max(1,radius));
      output.push([samples[index][0]+(x-samples[index][0])*blend,samples[index][1]+(y-samples[index][1])*blend]);
    }
    // High smoothing also removes sub-tolerance neighbouring samples, in one pass.
    // This is bounded thinning, not a destructive rewrite or Bezier fitting.
    const tolerance=radius*.01*Math.max(0,(strength-.5)*2),derived=[];
    for(let index=0;index<output.length;index++){
      const point=output[index],last=derived[derived.length-1];
      if(!last||index===output.length-1||Math.hypot(point[0]-last[0],point[1]-last[1])>=tolerance)derived.push(point);
    }
    if(!entries){entries=new Map();cache.set(points,entries);}if(entries.size>=4)entries.delete(entries.keys().next().value);
    entries.set(amount,derived);return derived;
  }
  function pointsFor(part){
    if(part.type==='stroke')return smoothPoints(part.points,normalize(part).smoothing);
    if(part.type==='line')return [[finite(part.x,0),finite(part.y,0)],[finite(part.x2,1),finite(part.y2,1)]];
    const x=finite(part.x,0),y=finite(part.y,0),w=Math.max(1,finite(part.w,1)),h=Math.max(1,finite(part.h,1));
    if(part.type==='poly')return(part.points||[]).map(point=>[x+point[0]*w,y+point[1]*h]);
    return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  }
  function pathLengths(points){
    if(lengthCache.has(points))return lengthCache.get(points);
    const distances=new Float64Array(points.length);let total=0;
    for(let index=1;index<points.length;index++){total+=Math.hypot(points[index][0]-points[index-1][0],points[index][1]-points[index-1][1]);distances[index]=total;}
    const result={distances,total};lengthCache.set(points,result);return result;
  }
  function lowerBound(values,target,inclusive){
    let left=0,right=values.length;
    while(left<right){const mid=(left+right)>>>1;if(values[mid]<target||(!inclusive&&values[mid]===target))left=mid+1;else right=mid;}
    return left;
  }
  function pointAt(points,distances,distance){
    if(distance<=0)return points[0];
    const index=Math.min(points.length-1,lowerBound(distances,distance,true)),a=points[Math.max(0,index-1)],b=points[index],
      span=distances[index]-distances[Math.max(0,index-1)],fraction=span?(distance-distances[Math.max(0,index-1)])/span:0;
    return[a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction];
  }
  function reveal(part){
    part=progress(part);
    const points=pointsFor(part),style=normalize(part),range=trimInterval(style,false);
    if(range.amount>=1)return{points,startDistance:0};
    if(range.amount<=0||points.length<2)return{points:[],startDistance:0};
    const {distances,total}=pathLengths(points);if(!total)return{points:[],startDistance:0};
    const start=total*(style.strokeReverse?1-range.end:range.start),end=total*(style.strokeReverse?1-range.start:range.end),
      first=lowerBound(distances,start,false),last=lowerBound(distances,end,true),
      result=[pointAt(points,distances,start),...points.slice(first,last),pointAt(points,distances,end)];
    // A reverse reveal draws an original-order suffix. Advancing the dash phase
    // by its omitted arc length leaves the original virtual pattern anchored.
    return{points:result,startDistance:start};
  }
  function calculateBounds(part){
    const geometry=api.modules.pathGeometry,points=geometry&&(part.strokeWave?.enabled||part.polygonMode==='regular')?geometry.full(part).stroke:pointsFor(part);if(!points.length)return{x:0,y:0,w:1,h:1};
    const style=normalize(part),half=part.stroke?Math.max(0,finite(part.strokeWidth,0))/2:0,
      closed=!['line','stroke'].includes(part.type),directions=[];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    const add=(x,y)=>{minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);};
    for(const point of points)add(point[0],point[1]);
    for(let index=0;index<(closed?points.length:points.length-1);index++){
      const a=points[index],b=points[(index+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=length?(b[0]-a[0])/length:0,dy=length?(b[1]-a[1])/length:0,nx=-dy,ny=dx;
      directions.push([dx,dy]);for(const point of[a,b]){add(point[0]+nx*half,point[1]+ny*half);add(point[0]-nx*half,point[1]-ny*half);}
      if((style.strokeDash.enabled||part.type==='stroke')&&style.strokeCap==='square')for(const [point,sign]of[[a,-1],[b,1]])for(const side of[-1,1])add(point[0]+sign*dx*half+side*nx*half,point[1]+sign*dy*half+side*ny*half);
    }
    for(let index=0;index<points.length;index++){
      const point=points[index],endpoint=!closed&&(index===0||index===points.length-1);
      if((endpoint&&style.strokeCap==='round')||(!endpoint&&style.strokeJoin==='round')||((style.strokeDash.enabled||part.type==='stroke')&&style.strokeCap==='round')){
        add(point[0]-half,point[1]-half);add(point[0]+half,point[1]+half);
      }
      if(endpoint&&style.strokeCap==='square'){
        const direction=directions[index===0?0:directions.length-1]||[0,0],sign=index===0?-1:1;
        for(const side of[-1,1])add(point[0]+sign*direction[0]*half-side*direction[1]*half,point[1]+sign*direction[1]*half+side*direction[0]*half);
      }
      if(!endpoint&&style.strokeJoin==='miter'&&part.type!=='ellipse'&&!(+part.radius)){
        const before=directions[(index-1+directions.length)%directions.length],after=directions[index%directions.length];
        if(!before||!after)continue;const mx=-before[1]-after[1],my=before[0]+after[0],len=Math.hypot(mx,my);
        if(!len)continue;const nx=mx/len,ny=my/len,dot=nx*(-after[1])+ny*after[0],reach=Math.abs(dot)>1e-6?half/dot:Infinity;
        if(Math.abs(reach)<=half*4){add(point[0]+nx*reach,point[1]+ny*reach);add(point[0]-nx*reach,point[1]-ny*reach);}
      }
    }
    return{x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
  }
  function pointBox(points){
    if(!Array.isArray(points)||!points.length)return{x:0,y:0,w:1,h:1};
    if(pointBoxes.has(points))return pointBoxes.get(points);
    let x=Infinity,y=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const point of points){x=Math.min(x,point[0]);y=Math.min(y,point[1]);maxX=Math.max(maxX,point[0]);maxY=Math.max(maxY,point[1]);}
    const box={x,y,w:Math.max(1,maxX-x),h:Math.max(1,maxY-y)};pointBoxes.set(points,box);return box;
  }
  function bounds(part,context){
    if(part.type==='custom')return api.modules.customShapes.bounds(api.modules.customShapes.custom(part),{x:finite(part.x,0),y:finite(part.y,0),w:Math.max(1,finite(part.w,1)),h:Math.max(1,finite(part.h,1))});
    if(api.modules.pathExtensions?.active(part)||part.pathEndpoints?.enabled){
      const geometry=api.modules.pathGeometry.full(part),boxes=[calculateBounds(part),api.modules.pathExtensions.bounds(part,geometry),api.modules.pathInstances.bounds(part,geometry,context),api.modules.pathEndpoints.bounds(part,geometry)].filter(Boolean),
        x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
      return{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};
    }
    if(part.type!=='stroke'||!Array.isArray(part.points))return calculateBounds(part);
    const style=normalize(part),key=[style.smoothing,part.stroke?part.strokeWidth:0,style.strokeCap,style.strokeJoin,style.strokeDash.enabled,JSON.stringify(style.strokeWave)].join('|');
    let entries=boundsCache.get(part.points);if(entries&&entries.has(key))return entries.get(key);
    const result=calculateBounds(part);if(!entries){entries=new Map();boundsCache.set(part.points,entries);}
    if(entries.size>=4)entries.delete(entries.keys().next().value);entries.set(key,result);return result;
  }
  api.modules.pathStroke=Object.freeze({normalize,progress,trimInterval,configure,smoothPoints,pointsFor,bounds,pointBox,pathLengths,reveal});
})(typeof window!=='undefined'?window:globalThis);
