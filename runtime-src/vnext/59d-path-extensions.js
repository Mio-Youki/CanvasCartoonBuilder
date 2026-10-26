/* Declarative, non-recursive path extensions. No per-extension timing tracks. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map(),geometryIds=new WeakMap(),finite=(v,d)=>Number.isFinite(+v)?+v:d,
    clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),color=(v,d)=>/^#[\da-f]{3,8}$/i.test(v||'')?v:d;
  const LIMITS=Object.freeze({ticks:512,layers:64,instances:256,points:65536,cacheEntries:32,cachePoints:262144});
  let nextGeometryId=1,cachedPoints=0;
  function eligible(part){return ['rect','ellipse'].includes(part.type)||part.type==='poly'&&part.polygonMode==='regular';}
  function normalize(part){
    const raw=part.extensions||{},t=raw.ticks||{},n=raw.nested||{},e=raw.elements||{},v=t.variation||{},fallback=part.stroke||part.fill||'#ffffff';
    const generated=api.modules.pathGenerators,ids=generated?.definitions().filter(d=>generated.supports(d.id,part)&&(raw[d.id]||(raw.attached||[]).includes(d.id))).map(d=>d.id)||[],configs=Object.fromEntries(ids.map(id=>[id,generated.normalize(id,raw[id],part)]));
    const defaults=['corner-arrows','brackets','nested','ticks','elements',...ids];
    const attached=[...new Set(Array.isArray(raw.attached)?raw.attached:defaults.filter(id=>raw[id]?.enabled))].filter(id=>defaults.includes(id));
    return {version:1,attached,showSource:raw.showSource!==false,...configs,
      ticks:{id:'ticks',enabled:!!t.enabled,count:clamp(Math.round(finite(t.count,24)),1,LIMITS.ticks),offset:clamp(finite(t.offset,0),0,1),
        length:Math.max(0,finite(t.length,12)),start:finite(t.start,0),end:finite(t.end,1),width:Math.max(0,finite(t.width,1)),
        color:color(t.color,fallback),alpha:clamp(finite(t.alpha,1),0,1),orientation:t.orientation==='fixed'?'fixed':'path',angle:finite(t.angle,0),
        major:{enabled:!!t.major?.enabled,every:clamp(Math.round(finite(t.major?.every,5)),1,LIMITS.ticks),length:Math.max(0,finite(t.major?.length,1.5)),width:Math.max(0,finite(t.major?.width,1.5))},
        variation:{...api.modules.pathWave.normalize(v),enabled:!!v.enabled,target:v.target==='angle'?'angle':'length',cycles:Math.max(0,finite(v.cycles,1)),amplitude:finite(v.amplitude,.5)}},
      nested:{id:'nested',enabled:!!n.enabled&&eligible(part),method:n.method==='offset'?'offset':'scale',count:clamp(Math.round(finite(n.count,4)),1,LIMITS.layers),
        direction:n.direction==='out'?'out':'in',scaleStep:Math.max(.0001,finite(n.scaleStep,.1)),spacing:Math.max(.001,finite(n.spacing,6)),rotation:finite(n.rotation,0),
        pathStep:finite(n.pathStep,0),style:['fill','bands'].includes(n.style)?n.style:'stroke',width:Math.max(0,finite(n.width,part.strokeWidth||1)),
        color:color(n.color,fallback),alpha:clamp(finite(n.alpha,1),0,1)},
      elements:{id:'elements',enabled:!!e.enabled,sourceId:typeof e.sourceId==='string'?e.sourceId:'',count:clamp(Math.round(finite(e.count,12)),1,LIMITS.instances),
        offset:clamp(finite(e.offset,0),0,1),scale:Math.max(.001,finite(e.scale,1)),orientation:e.orientation==='fixed'?'fixed':'path',angle:finite(e.angle,0),
        along:finite(e.along,0),normal:finite(e.normal,0),keepSource:e.keepSource!==false},
      'corner-arrows':api.modules.customShapes.normalize(raw['corner-arrows'],part),
      brackets:api.modules.customShapes.normalizeBrackets(raw.brackets,part)};
  }
  function active(part){return !!(api.modules.pathGenerators?.active(part)||part.extensions?.ticks?.enabled||part.extensions?.nested?.enabled&&eligible(part)||part.extensions?.elements?.enabled||part.extensions?.['corner-arrows']?.enabled&&api.modules.customShapes.eligible(part)||part.extensions?.brackets?.enabled&&api.modules.bracketShapes.eligible(part));}
  function lengthTable(points){const table=api.modules.pathStroke.pathLengths(points);return table;}
  function pointAt(points,table,distance){
    const distances=table.distances,limit=table.total;distance=clamp(distance,0,limit);
    let a=1,b=points.length-1;while(a<b){const m=(a+b)>>1;if(distances[m]<distance)a=m+1;else b=m;}
    let i=a;while(i<points.length-1&&distances[i]-distances[i-1]<1e-9)i++;
    const p=points[i-1],q=points[i],span=distances[i]-distances[i-1],t=span?(distance-distances[i-1])/span:0;
    return {point:[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t],angle:Math.atan2(q[1]-p[1],q[0]-p[0])};
  }
  function wrap(v){return((v%1)+1)%1;}
  function visible(part,u,closed){
    part=api.modules.pathStroke.progress(part);
    const range=api.modules.pathStroke.trimInterval(part,closed);
    if(range.amount<=0)return false;if(range.amount>=1)return true;
    const start=closed?wrap(finite(part.pathStart,0)):0;
    const relative=closed?wrap(part.strokeReverse?start-u:u-start):(part.strokeReverse?1-u:u);
    return closed&&range.end<range.start?relative>=range.start-1e-9||relative<=range.end+1e-9:relative>=range.start-1e-9&&relative<=range.end+1e-9;
  }
  // Convex polygon parallel offset, including sampled convex curves. Stop before
  // inward collapse / curvature inversion; never silently substitute scaling.
  function offset(points,distance,cx,cy){
    const p=points.slice(0,-1),n=p.length;if(n<3)return null;
    let area=0;for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];area+=a[0]*b[1]-a[1]*b[0];}
    const sign=Math.sign(area);if(!sign)return null;
    const edges=[];
    for(let i=0;i<n;i++){
      const a=p[i],b=p[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-8)return null;
      const nx=sign*dy/len,ny=-sign*dx/len;
      if(distance<0&&((cx-a[0])*nx+(cy-a[1])*ny)-distance>=-1e-7)return null;
      edges.push({a:[a[0]+nx*distance,a[1]+ny*distance],d:[dx,dy]});
    }
    const out=[];
    for(let i=0;i<n;i++){
      const a=edges[(i+n-1)%n],b=edges[i],cross=a.d[0]*b.d[1]-a.d[1]*b.d[0];
      if(Math.abs(cross)<1e-9){out.push(b.a);continue;}
      const dx=b.a[0]-a.a[0],dy=b.a[1]-a.a[1],t=(dx*b.d[1]-dy*b.d[0])/cross;
      out.push([a.a[0]+a.d[0]*t,a.a[1]+a.d[1]*t]);
    }
    for(let i=0;i<n;i++){
      const a=out[i],b=out[(i+1)%n],c=out[(i+2)%n],cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
      if(cross*sign < -1e-7||!a.every(Number.isFinite))return null;
    }
    out.push(out[0]);return out;
  }
  function build(part,geometry){
    const settings=normalize(part);let id=geometryIds.get(geometry);if(!id){id=nextGeometryId++;geometryIds.set(geometry,id);}
    const key=id+'|'+JSON.stringify([settings,part.stroke,part.strokeWidth,part.strokeAlpha,part.fill,part.fillPaint],(key,value)=>{if(key!=='definition')return value;let id=geometryIds.get(value);if(!id){id=nextGeometryId++;geometryIds.set(value,id);}return id;});
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    const paths=[],instances=[],source=geometry.stroke,table=lengthTable(source),cx=geometry.box.x+geometry.box.w/2,cy=geometry.box.y+geometry.box.h/2;
    let remaining=LIMITS.points,status='';
    if(settings['corner-arrows'].enabled&&api.modules.customShapes.eligible(part)){
      const arrows=api.modules.customShapes.build(part,geometry.box,settings['corner-arrows']);status=arrows.status;
      for(const path of arrows.paths){const cost=path.points.length+path.outline.length;if(cost>remaining){status='已达到拓展路径点数预算。';break;}paths.push(path);remaining-=cost;}
    }
    if(settings.brackets.enabled&&api.modules.bracketShapes.eligible(part)){
      const brackets=api.modules.bracketShapes.build(part,geometry.box,settings.brackets);
      for(const path of brackets.paths){const cost=path.points.length+path.outline.length;if(cost>remaining){status='已达到拓展路径点数预算。';break;}paths.push(path);remaining-=cost;}
    }
    if(settings.nested.enabled){
      const n=settings.nested;
      if(n.method==='offset'&&part.strokeWave?.enabled)status='等距轮廓暂不支持带路径波形的轮廓，请使用中心缩放。';
      else for(let i=0;i<n.count;i++){
        if(source.length>remaining){status='已达到拓展路径点数预算。';break;}
        const sign=n.direction==='out'?1:-1,scale=1+sign*(i+1)*n.scaleStep;
        if(n.method==='scale'&&scale<=0)break;
        let points=n.method==='offset'?offset(source,sign*(i+1)*n.spacing,cx,cy):source.map(p=>[cx+(p[0]-cx)*scale,cy+(p[1]-cy)*scale]);
        if(!points){status='已在轮廓收缩或曲率反转前停止生成。';break;}
        const angle=(i+1)*n.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
        if(angle)points=points.map(([x,y])=>[cx+(x-cx)*cos-(y-cy)*sin,cy+(x-cx)*sin+(y-cy)*cos]);
        paths.push({kind:'nested',index:i,points,closed:true,width:n.width});remaining-=points.length;
      }
    }
    const nestedPaths=paths.filter(path=>path.kind==='nested');
    if(settings.nested.style==='stroke'&&nestedPaths.length){
      const baseWidth=Math.max(0,finite(part.strokeWidth,1)),baseColor=part.stroke||part.fill||'#ffffff',n=settings.nested;
      for(const [index,path]of nestedPaths.entries()){
        const t=(index+1)/nestedPaths.length;
        path.width=baseWidth+(n.width-baseWidth)*t;
        path.color=api.modules.timeline.colorAt(baseColor,n.color,t)||n.color;
      }
    }
    if(settings.nested.style==='bands'&&nestedPaths.length){
      // The ramp endpoint is the rightmost stop, not the spatial right edge.
      const paint=api.modules.paint.normalize(part.fillPaint),baseColor=paint?paint.stops.at(-1).color:part.fill||part.stroke||'#ffffff';
      for(const [index,path]of nestedPaths.entries())path.color=api.modules.timeline.colorAt(baseColor,settings.nested.color,(index+1)/nestedPaths.length)||settings.nested.color;
    }
    if(settings.ticks.enabled&&source.length>1&&table.total>0){
      const t=settings.ticks,v=t.variation,rhythm=v.enabled?api.modules.pathWave.compile(v):null;
      for(let i=0;i<t.count;i++){
        const progress=geometry.closed?i/t.count:t.count===1?.5:i/(t.count-1),raw=progress+t.offset,
          u=geometry.closed?wrap(raw):raw;if(u>1+1e-9)continue;
        const anchor=pointAt(source,table,u*table.total),major=t.major.enabled&&i%t.major.every===0,
          variation=rhythm?rhythm.sample(progress*v.cycles+v.phase)*v.amplitude:0,
          length=t.length*(major?t.major.length:1)*(v.enabled&&v.target==='length'?Math.max(0,1+variation):1),
          angle=(t.orientation==='path'?anchor.angle-Math.PI/2:0)+(t.angle+(v.enabled&&v.target==='angle'?variation:0))*Math.PI/180,
          dx=Math.cos(angle)*length,dy=Math.sin(angle)*length;
        if(remaining<2){status='已达到拓展路径点数预算。';break;}
        paths.push({kind:'ticks',index:i,u,points:[[anchor.point[0]+dx*t.start,anchor.point[1]+dy*t.start],[anchor.point[0]+dx*t.end,anchor.point[1]+dy*t.end]],closed:false,width:t.width*(major?t.major.width:1)});remaining-=2;
      }
    }
    const e=settings.elements;
    if(e.enabled&&source.length>1&&table.total>0)for(let i=0;i<e.count;i++){
      if(remaining<1){status='已达到拓展路径点数预算。';break;}
      const progress=geometry.closed?i/e.count:e.count===1?.5:i/(e.count-1),u=geometry.closed?wrap(progress+e.offset):progress+e.offset;
      if(u>1+1e-9)continue;const anchor=pointAt(source,table,u*table.total),tx=Math.cos(anchor.angle),ty=Math.sin(anchor.angle),nx=ty,ny=-tx;
      instances.push({index:i,u,anchor:anchor.point,tangent:[tx,ty],normal:[nx,ny],point:[anchor.point[0]+e.along*tx+e.normal*nx,anchor.point[1]+e.along*ty+e.normal*ny],angle:(e.orientation==='path'?anchor.angle:0)+(e.angle%360)*Math.PI/180,scale:e.scale});
      remaining--;
    }
    const result={settings,paths,instances,status,points:LIMITS.points-remaining};
    cache.set(key,result);cachedPoints+=result.points;
    while(cache.size>LIMITS.cacheEntries||cachedPoints>LIMITS.cachePoints){const oldest=cache.keys().next().value;cachedPoints-=cache.get(oldest).points;cache.delete(oldest);}
    return result;
  }
  function shown(part,geometry,path,settings){
    if(path.outline)return path.points;
    if(path.kind==='ticks')return visible(part,path.u,geometry.closed)?path.points:[];
    const n=(settings||normalize(part)).nested;
    if(n.style!=='stroke'&&part.fillReveal!=='center')return path.points;
    part=api.modules.pathStroke.progress(part);
    return api.modules.pathGeometry.visible(Object.assign({},part,{pathRevealEnabled:true,pathStart:finite(part.pathStart,0)+(path.index+1)*n.pathStep}),path.points,true).points;
  }
  function trace(ctx,points,closed,begin=true){if(begin)ctx.beginPath();for(let i=0;i<points.length;i++)i?ctx.lineTo(...points[i]):ctx.moveTo(...points[i]);if(closed)ctx.closePath();}
  function paint(ctx,part,geometry,context){
    part=api.modules.pathStroke.progress(part);
    const result=build(part,geometry),completion=api.modules.pathStroke.trimInterval(part,geometry.closed).amount*100;
    for(const id of result.settings.attached){
      if(!result.settings[id].enabled)continue;
      if(api.modules.pathGenerators?.definition(id)){api.modules.pathGenerators.paint(ctx,part,id,geometry,context);continue;}
      if(id==='elements'){api.modules.pathInstances.paint(ctx,part,geometry,context,'elements');continue;}
      if(id==='corner-arrows'||id==='brackets'){
        api.modules.customShapes.paint(ctx,{settings:result.settings[id],paths:result.paths.filter(p=>p.kind===id)});continue;
      }
    for(const path of result.paths){
      if(path.kind!==id||path.outline)continue;
      const config=result.settings[path.kind],points=shown(part,geometry,path,result.settings);if(points.length<2)continue;
      ctx.save();ctx.globalAlpha*=config.alpha;ctx.strokeStyle=ctx.fillStyle=path.color||config.color;ctx.lineWidth=path.width;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash([]);
      if(path.kind==='nested'&&config.style!=='stroke'){
        if(part.fillReveal==='center'&&completion<100){trace(ctx,[[geometry.box.x+geometry.box.w/2,geometry.box.y+geometry.box.h/2],...points],true);ctx.clip();}
        trace(ctx,path.points,true);
        if(config.style==='bands'){
          const previous=result.paths.find(p=>p.kind==='nested'&&p.index===path.index-1)?.points||geometry.stroke;
          trace(ctx,previous,true,false);ctx.fill('evenodd');
        }else ctx.fill();
      }else if(path.width>0){
        if(path.kind==='nested'){
          const reveal=api.modules.pathGeometry.visible(Object.assign({},part,{pathRevealEnabled:true,pathStart:finite(part.pathStart,0)+(path.index+1)*config.pathStep}),path.points,true);
          api.modules.pathStroke.configure(ctx,Object.assign({},part,{strokeWidth:path.width,strokeCap:'round',strokeJoin:'round',_strokeDashAdvance:reveal.startDistance}));
        }
        trace(ctx,points,path.closed&&completion>=100);ctx.stroke();
      }
      ctx.restore();
    }
    }
  }
  function bounds(part,geometry){
    if(api.modules.pathGenerators?.active(part)){const other=build(part,geometry).paths;if(!other.length)return geometry.box;}
    const result=build(part,geometry),paths=result.paths;if(!paths.length)return null;
    if(result.visualBounds)return result.visualBounds;
    let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
    for(const path of paths){const n=result.settings.nested,pad=path.outline?0:path.kind!=='nested'||n.style==='stroke'?path.width/2:0;for(const [a,b]of path.outline||path.points){x=Math.min(x,a-pad);y=Math.min(y,b-pad);right=Math.max(right,a+pad);bottom=Math.max(bottom,b+pad);}}
    result.visualBounds={x,y,w:Math.max(1,right-x),h:Math.max(1,bottom-y)};return result.visualBounds;
  }
  function contains(part,geometry,x,y,tolerance){
    part=api.modules.pathStroke.progress(part);
    const result=build(part,geometry);
    if(api.modules.pathGenerators?.active(part)&&api.modules.customShapes.contains({settings:{alpha:1,width:1},paths:[{outline:geometry.stroke}]},x,y,tolerance))return true;
    if(api.modules.customShapes.contains({settings:result.settings['corner-arrows'],paths:result.paths.filter(p=>p.kind==='corner-arrows')},x,y,tolerance))return true;
    if(api.modules.customShapes.contains({settings:result.settings.brackets,paths:result.paths.filter(p=>p.kind==='brackets')},x,y,tolerance))return true;
    for(const path of result.paths){const config=result.settings[path.kind],points=shown(part,geometry,path,result.settings);if(!config.alpha||points.length<2)continue;
      if(path.outline)continue;
      if(path.kind==='nested'&&config.style!=='stroke'){
        const polygon=path.points;
        const inside=p=>{let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
        const previous=result.paths.find(p=>p.kind==='nested'&&p.index===path.index-1)?.points||geometry.stroke;
        if(part.fillReveal==='center'&&api.modules.pathStroke.trimInterval(part,geometry.closed).amount<1&&!inside([[geometry.box.x+geometry.box.w/2,geometry.box.y+geometry.box.h/2],...points]))continue;
        if(config.style==='bands'?inside(polygon)!==inside(previous):inside(polygon))return true;
      }else for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?clamp(((x-a[0])*dx+(y-a[1])*dy)/l,0,1):0;
        if(path.width>0&&Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=Math.max(path.width/2,tolerance||0))return true;
      }
    }return false;
  }
  api.modules.pathExtensions=Object.freeze({normalize,active,eligible,build,paint,bounds,contains,visible,limits:LIMITS,stats:()=>({entries:cache.size,points:cachedPoints})});
})(typeof window!=='undefined'?window:globalThis);
