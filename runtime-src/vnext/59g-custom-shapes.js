/* Registered, versioned declarative shapes. No code strings or arbitrary dispatch. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map(),finite=(v,d)=>Number.isFinite(+v)?+v:d,limit=Object.freeze({vertices:256,entries:32,points:65536});let cachedPoints=0;
  const definitions=Object.freeze([Object.freeze({id:'corner-arrows',version:1,name:'角点箭头',sourceTypes:Object.freeze(['rect','poly']),params:Object.freeze([
    Object.freeze({key:'size',label:'箭头大小',default:24,min:0}),Object.freeze({key:'length',label:'箭杆长度',default:36,min:0}),Object.freeze({key:'inset',label:'缩进',default:0}),Object.freeze({key:'direction',label:'方向',default:'out',options:Object.freeze(['out','in'])}),Object.freeze({key:'radius',label:'圆角',default:0,min:0}),
    Object.freeze({key:'shaftMode',label:'箭杆角度',default:'center',options:Object.freeze(['center','fixed'])}),Object.freeze({key:'shaftAngle',label:'角度',default:0}),Object.freeze({key:'shaftCap',label:'箭杆端头',default:'butt',options:Object.freeze(['butt','round','point'])})]),limits:limit}),
    Object.freeze({id:'brackets',version:1,name:'括号／角标',sourceTypes:Object.freeze(['rect','ellipse','poly']),params:Object.freeze([
      Object.freeze({key:'shape',label:'造型',default:'square',options:Object.freeze(['square','round'])}),Object.freeze({key:'layout',label:'布局',default:'full',options:Object.freeze(['full','corners'])}),
      Object.freeze({key:'side',label:'侧别',default:'both',options:Object.freeze(['both','left','right'])}),Object.freeze({key:'corners',label:'角标位置',default:'all',options:Object.freeze(['all','tl-br','bl-tr','tl','tr','bl','br'])}),
      Object.freeze({key:'armX',label:'横向长度',default:24,min:0}),Object.freeze({key:'armY',label:'纵向长度',default:24,min:0}),Object.freeze({key:'radius',label:'圆角',default:0,min:0}),
      Object.freeze({key:'offsetX',label:'水平偏移',default:0}),Object.freeze({key:'offsetY',label:'垂直偏移',default:0})]),limits:limit})]);
  const color=(v,d)=>/^#[\da-f]{3,8}$/i.test(v||'')?v:d;
  function eligible(part){return part.type==='rect'||part.type==='poly';}
  function normalize(raw,part){raw=raw||{};part=part||{};return{enabled:!!raw.enabled,size:Math.max(0,finite(raw.size,24)),length:Math.max(0,finite(raw.length,36)),inset:finite(raw.inset,0),direction:raw.direction==='in'?'in':'out',radius:Math.max(0,finite(raw.radius,0)),shaftMode:raw.shaftMode==='fixed'?'fixed':'center',shaftAngle:finite(raw.shaftAngle,0),shaftCap:['round','point'].includes(raw.shaftCap)?raw.shaftCap:'butt',width:Math.max(0,finite(raw.width,+part.strokeWidth>0?+part.strokeWidth:3)),color:color(raw.color,color(part.stroke,color(part.fill,'#ffd23f'))),alpha:Math.max(0,Math.min(1,finite(raw.alpha,finite(part.strokeAlpha,1))))};}
  function normalizeBrackets(raw,part){
    raw=raw||{};const style=normalize(raw,part);
    return{enabled:style.enabled,shape:raw.shape==='round'?'round':'square',layout:raw.layout==='corners'?'corners':'full',side:['left','right'].includes(raw.side)?raw.side:'both',
      corners:['tl-br','bl-tr','tl','tr','bl','br'].includes(raw.corners)?raw.corners:'all',armX:Math.max(0,finite(raw.armX,24)),armY:Math.max(0,finite(raw.armY,24)),radius:style.radius,offsetX:finite(raw.offsetX,0),offsetY:finite(raw.offsetY,0),width:style.width,color:style.color,alpha:style.alpha};
  }
  function normalizeRecipe(recipe){
    if(recipe?.definition)return api.modules.patternProviders.normalizeRecipe(recipe);
    if(!recipe||!definitions.some(d=>d.id===recipe.id&&d.version===recipe.version))throw Error('不支持的自定义图样或版本：'+(recipe?.id||'(空)'));
    if(recipe.params!=null&&(typeof recipe.params!=='object'||Array.isArray(recipe.params)))throw Error('自定义图样params必须为对象');
    if(recipe.id==='brackets'){const c=normalizeBrackets(recipe.params);return{id:'brackets',version:1,params:{shape:c.shape,layout:c.layout,side:c.side,corners:c.corners,armX:c.armX,armY:c.armY,radius:c.radius,offsetX:c.offsetX,offsetY:c.offsetY}};}
    const c=normalize(recipe.params);return{id:'corner-arrows',version:1,params:{size:c.size,length:c.length,inset:c.inset,direction:c.direction,radius:c.radius,shaftMode:c.shaftMode,shaftAngle:c.shaftAngle,shaftCap:c.shaftCap}};
  }
  function supports(recipe){if(recipe?.definition){api.modules.patternProviders.normalizeRecipe(recipe);return true;}return !!recipe&&definitions.some(d=>d.id===recipe.id&&d.version===recipe.version);}
  function normalizePartRecipe(part){
    if(supports(part.recipe))return normalizeRecipe(part.recipe);
    if(!part.geometrySnapshot)return normalizeRecipe(part.recipe);
    // Missing providers may only use an exact, bounded static outline binding.
    part.geometrySnapshot=api.modules.patternSnapshots.normalize(part.geometrySnapshot,part.recipe,part.strokeWidth);
    return JSON.parse(JSON.stringify(part.recipe));
  }
  function headOutline(points,width){
    const directions=points.slice(1).map((p,i)=>{const a=points[i],l=Math.hypot(p[0]-a[0],p[1]-a[1])||1;return[(p[0]-a[0])/l,(p[1]-a[1])/l];}),half=width/2;
    const side=sign=>points.map((p,i)=>{
      const a=directions[Math.max(0,i-1)],b=directions[Math.min(i,directions.length-1)],nx=-a[1]-b[1],ny=a[0]+b[0],len=Math.hypot(nx,ny),dot=len?(nx*-b[1]+ny*b[0])/len:0,reach=Math.abs(dot)>1e-6?half/dot:0;
      return Math.abs(reach)<=half*4&&len?[p[0]+sign*nx/len*reach,p[1]+sign*ny/len*reach]:[p[0]-sign*b[1]*half,p[1]+sign*b[0]*half];
    });return side(1).concat(side(-1).reverse());
  }
  function shaftOutline(start,end,width,cap){
    const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length,nx=-uy,ny=ux,half=width/2,depth=Math.min(half,length),base=cap==='butt'?end:[end[0]-ux*depth,end[1]-uy*depth],
      out=[[start[0]+nx*half,start[1]+ny*half],[base[0]+nx*half,base[1]+ny*half]];
    if(cap==='point')out.push(end);
    if(cap==='round')for(let i=1;i<=12;i++){const angle=Math.PI*i/12;out.push([base[0]+nx*half*Math.cos(angle)+ux*depth*Math.sin(angle),base[1]+ny*half*Math.cos(angle)+uy*depth*Math.sin(angle)]);}
    else out.push([base[0]-nx*half,base[1]-ny*half]);
    out.push([start[0]-nx*half,start[1]-ny*half]);return out;
  }
  function finishOutline(points,radius){
    let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
    return api.modules.pathGeometry.rounded(area<0?points.slice().reverse():points,radius,8);
  }
  function shaftDirection(c,dx,dy,sign){
    if(c.shaftMode!=='fixed')return[sign*dx,sign*dy];
    // Fold one inclination into the corner's centroid-facing quadrant. Points
    // on a reflection axis must stay on it; tiny centroid errors are not sides.
    const angle=c.shaftAngle*Math.PI/180,side=v=>Math.abs(v)<1e-8?0:Math.sign(v),
      x=side(dx)*Math.abs(Math.cos(angle)),y=side(dy)*Math.abs(Math.sin(angle)),length=Math.hypot(x,y);
    return length>1e-8?[sign*x/length,sign*y/length]:[sign*dx,sign*dy];
  }
  function build(part,box,raw){
    const c=normalize(raw,part),b=box||{x:finite(part.x,0),y:finite(part.y,0),w:Math.max(1,finite(part.w,1)),h:Math.max(1,finite(part.h,1))},key=JSON.stringify([part.type,part.polygonMode,part.sides,part.points,b,c]);
    if(cache.has(key)){const result=cache.get(key);cache.delete(key);cache.set(key,result);return result;}
    let status='',vertices=[];
    if(part.type==='rect')vertices=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
    else if(part.type==='poly'){
      const points=part.polygonMode==='regular'?api.modules.pathGeometry.regularPoints(part.sides):part.points||[];
      if(points.length>limit.vertices)status='角点箭头最多支持256个设计顶点';else vertices=points.map(p=>[b.x+p[0]*b.w,b.y+p[1]*b.h]);
    }else status='角点箭头需要矩形或多边形';
    vertices=vertices.filter((p,i)=>p.every(Number.isFinite)&&(!i||Math.hypot(p[0]-vertices[i-1][0],p[1]-vertices[i-1][1])>1e-8));
    if(vertices.length>1&&Math.hypot(vertices[0][0]-vertices.at(-1)[0],vertices[0][1]-vertices.at(-1)[1])<1e-8)vertices.pop();
    let area=0,cx=0,cy=0;const n=vertices.length;
    for(let i=0;i<n;i++){const a=vertices[i],b=vertices[(i+1)%n],cross=a[0]*b[1]-b[0]*a[1];area+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross;}
    if(!status&&(n<3||Math.abs(area)<1e-8))status='角点箭头需要非退化的封闭多边形';
    const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(!status)for(let i=0;i<n&&!status;i++)for(let j=i+1;j<n;j++){
      if(j===i+1||i===0&&j===n-1)continue;const a=vertices[i],b=vertices[(i+1)%n],p=vertices[j],q=vertices[(j+1)%n];
      const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-8&&p[0]>=Math.min(a[0],b[0])-1e-8&&p[0]<=Math.max(a[0],b[0])+1e-8&&p[1]>=Math.min(a[1],b[1])-1e-8&&p[1]<=Math.max(a[1],b[1])+1e-8;
      if(cross(a,b,p)*cross(a,b,q)<-1e-8&&cross(p,q,a)*cross(p,q,b)<-1e-8||on(a,b,p)||on(a,b,q)||on(p,q,a)||on(p,q,b)){status='角点箭头暂不支持自交多边形';break;}
    }
    const paths=[],center=status?[b.x+b.w/2,b.y+b.h/2]:[cx/(3*area),cy/(3*area)];
    if(!status)for(let i=0;i<n;i++){
      const p=vertices[i],a=vertices[(i+n-1)%n],b=vertices[(i+1)%n],la=Math.hypot(a[0]-p[0],a[1]-p[1]),lb=Math.hypot(b[0]-p[0],b[1]-p[1]),l=Math.hypot(center[0]-p[0],center[1]-p[1]);if(!la||!lb||!l)continue;
      const u=[(a[0]-p[0])/la,(a[1]-p[1])/la],v=[(b[0]-p[0])/lb,(b[1]-p[1])/lb];if(u[0]*v[0]+u[1]*v[1]<-0.999999)continue;
      const dx=(center[0]-p[0])/l,dy=(center[1]-p[1])/l,tip=[p[0]+dx*c.inset,p[1]+dy*c.inset],sign=c.direction==='out'?1:-1;
      if(c.size>0){const head=[[tip[0]+sign*u[0]*c.size,tip[1]+sign*u[1]*c.size],tip,[tip[0]+sign*v[0]*c.size,tip[1]+sign*v[1]*c.size]];paths.push({kind:'corner-arrows',index:i,points:head,outline:finishOutline(headOutline(head,c.width),c.radius),closed:false,width:c.width});}
      const [sx,sy]=shaftDirection(c,dx,dy,sign),end=[tip[0]+sx*c.length,tip[1]+sy*c.length];
      if(c.length>0)paths.push({kind:'corner-arrows',index:i,points:[tip,end],outline:finishOutline(shaftOutline(tip,end,c.width,c.shaftCap),c.radius),closed:false,width:c.width});
    }
    const count=paths.reduce((sum,p)=>sum+p.points.length+p.outline.length,0),result={paths,vertices,center,status,settings:c,points:count};cache.set(key,result);cachedPoints+=count;
    while(cache.size>limit.entries||cachedPoints>limit.points){const old=cache.keys().next().value;cachedPoints-=cache.get(old).points;cache.delete(old);}return result;
  }
  function custom(part,time){if(part.recipe?.definition)return api.modules.patternProviders.build(part,time);if(!supports(part.recipe)){normalizePartRecipe(part);return api.modules.patternSnapshots.render(part);}const recipe=normalizeRecipe(part.recipe),raw={...recipe.params,enabled:true,width:part.strokeWidth,color:part.stroke||'#ffd23f',alpha:part.stroke===null?0:part.strokeAlpha};if(recipe.id==='brackets')return api.modules.bracketShapes.build(part,null,normalizeBrackets(raw,part));const config=normalize(raw,part);return build({...part,type:'rect'},null,config);}
  function paint(ctx,result){if(result.paintPlan){ctx.save();try{if(result.paintTransform){const a=result.paintTransform;ctx.translate(a.x,a.y);ctx.scale(a.sx,a.sy);ctx.translate(-result.paintPlan.bounds.x,-result.paintPlan.bounds.y);}api.modules.patternGenerators.paint(ctx,result.paintPlan);}finally{ctx.restore();}return;}const c=result.settings;if(!c.alpha||!c.width)return;ctx.save();ctx.globalAlpha*=c.alpha;ctx.fillStyle=c.color;ctx.beginPath();for(const path of result.paths){path.outline.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}ctx.fill();ctx.restore();}
  function bounds(result,fallback){const points=result.paths.flatMap(p=>p.outline);if(!points.length)return fallback||{x:0,y:0,w:1,h:1};const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));return{x,y,w:Math.max(1,Math.max(...points.map(p=>p[0]))-x),h:Math.max(1,Math.max(...points.map(p=>p[1]))-y)};}
  function contains(result,x,y,tolerance){if(!result.settings.alpha||!result.settings.width)return false;for(const path of result.paths){let inside=false;const points=path.outline;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l)):0;if(Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=Math.max(0,tolerance||0))return true;}if(inside)return true;}return false;}
  api.modules.customShapes=Object.freeze({definitions,eligible,normalize,normalizeBrackets,normalizeRecipe,normalizePartRecipe,supports,build,custom,paint,bounds,contains,strokeOutline:headOutline,finishOutline,limits:limit,stats:()=>({entries:cache.size,points:cachedPoints})});
})(typeof window!=='undefined'?window:globalThis);
