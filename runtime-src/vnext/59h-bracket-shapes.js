/* Brackets and corner marks share one mirrored local frame, never font glyphs. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map(),limits=Object.freeze({entries:32,points:65536,arcSegments:128});let cachedPoints=0;
  const finite=(v,d)=>Number.isFinite(+v)?+v:d;
  function eligible(part){return ['rect','ellipse','poly'].includes(part.type);}
  function build(part,box,raw){
    const shapes=api.modules.customShapes,c=shapes.normalizeBrackets(raw,part),b=box||{x:finite(part.x,0),y:finite(part.y,0),w:Math.max(1,finite(part.w,1)),h:Math.max(1,finite(part.h,1))},key=JSON.stringify([b,c]);
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    const width=Math.min(c.width,Math.max(0,Math.min(b.w,b.h)-.0001)),half=width/2,left=b.x+half,top=b.y+half,right=b.x+b.w-half,bottom=b.y+b.h-half,
      w=Math.max(0,right-left),h=Math.max(0,bottom-top),corners=c.corners==='all'?['tl','tr','bl','br']:c.corners.split('-'),
      pairX=c.layout==='full'?c.side==='both':corners.some(a=>corners.some(b=>a[0]===b[0]&&a[1]!==b[1])),
      pairY=c.layout==='corners'&&corners.some(a=>corners.some(b=>a[1]===b[1]&&a[0]!==b[0])),
      ax=Math.min(c.armX,pairX?Math.max(0,(w-width)/2):w),ay=Math.min(c.armY,pairY?Math.max(0,(h-width)/2):h),paths=[];
    function add(points,index){
      // Positive offsets expand symmetrically, never translate the whole set.
      const dx=(index==='left'||index.endsWith('l')?-1:1)*c.offsetX;
      points=points.map(([x,y])=>[x+dx,c.layout==='full'?(top+bottom)/2+(y-(top+bottom)/2)*Math.max(0,h+2*c.offsetY)/Math.max(.000001,h):y+(index.startsWith('t')?-1:1)*c.offsetY]);
      points=points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>1e-8);
      if(points.length<2||!width)return;
      const outline=shapes.finishOutline(shapes.strokeOutline(points,width),c.shape==='square'?c.radius:0);
      paths.push({kind:'brackets',index,points,outline,closed:false,width});
    }
    const mirror=(points,x,y)=>points.map(p=>[x?left+right-p[0]:p[0],y?top+bottom-p[1]:p[1]]);
    function arc(cx,cy,rx,ry,start,end){const count=Math.min(limits.arcSegments,Math.max(8,Math.ceil(Math.abs(end-start)*Math.max(rx,ry)/2)));return Array.from({length:count+1},(_,i)=>{const a=start+(end-start)*i/count;return[cx+rx*Math.cos(a),cy+ry*Math.sin(a)];});}
    if(c.layout==='full'){
      const points=c.shape==='round'?arc(left+ax,(top+bottom)/2,ax,h/2,Math.PI/2,Math.PI*1.5):[[left+ax,top],[left,top],[left,bottom],[left+ax,bottom]];
      if(c.side!=='right')add(points,'left');if(c.side!=='left')add(mirror(points,true,false),'right');
    }else{
      const points=c.shape==='round'?arc(left+ax,top+ay,ax,ay,Math.PI,Math.PI*1.5):[[left+ax,top],[left,top],[left,top+ay]];
      for(const corner of corners)add(mirror(points,corner.endsWith('r'),corner.startsWith('b')),corner);
    }
    const count=paths.reduce((sum,p)=>sum+p.points.length+p.outline.length,0),constrained=width<c.width-.001||ax<c.armX-.001||c.layout==='corners'&&ay<c.armY-.001,
      status=constrained?'受当前框定范围限制：实际粗细 '+Math.round(width*10)/10+'，横向长度 '+Math.round(ax*10)/10+(c.layout==='corners'?'，纵向长度 '+Math.round(ay*10)/10:''):'',
      result={settings:c,effective:{width,armX:ax,armY:ay},paths,status,points:count};
    cache.set(key,result);cachedPoints+=count;while(cache.size>limits.entries||cachedPoints>limits.points){const first=cache.keys().next().value;cachedPoints-=cache.get(first).points;cache.delete(first);}return result;
  }
  api.modules.bracketShapes=Object.freeze({eligible,build,limits,stats:()=>({entries:cache.size,points:cachedPoints})});
})(typeof window!=='undefined'?window:globalThis);
