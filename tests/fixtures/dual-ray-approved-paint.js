/* Frozen pre-B2 review algorithm, solely for independent pixel regression. */
(function(global){
  'use strict';
  global.dualRayApprovedPaint=function(ctx,p,time,box){
    const part={id:'carrier',type:p.carrier==='regular'||p.carrier==='free'?'poly':p.carrier,...box};
    if(p.carrier==='regular'){part.polygonMode='regular';part.sides=5;}
    if(p.carrier==='free'){part.polygonMode='free';part.points=[[0,.12],[.7,0],[1,.55],[.72,1],[.08,.85]];}
    const geometry=ToSampoolRuntimeVNext.modules.pathGeometry.full(part,box),path=new Path2D();
    geometry.stroke.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();
    const cx=box.x+box.w*p.centerX,cy=box.y+box.h*p.centerY,r=Math.max(...[[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].map(([x,y])=>Math.hypot(x-cx,y-cy)))+2;
    const cycle=Math.PI*2/p.pairs,phase=p.angle*Math.PI/180+(p.motion?(time%p.period)/p.period*Math.PI*2*(p.direction==='clockwise'?1:-1):0);
    ctx.save();ctx.clip(path);const opaque=p.alphaA===1&&p.alphaB===1;if(opaque){ctx.fillStyle=p.colorB;ctx.fill(path);}
    for(let i=0;i<p.pairs;i++){
      const a=phase+i*cycle,b=a+cycle*p.ratio;
      const wedge=(from,to,color,alpha)=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,from,to);ctx.closePath();ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.fill();};
      wedge(a,b,p.colorA,p.alphaA);if(!opaque)wedge(b,a+cycle,p.colorB,p.alphaB);
    }
    ctx.restore();
  };
})(globalThis);
