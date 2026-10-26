/* Native Canvas paint styles shared by scene backgrounds and vector fills. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(+value)?+value:min));
  function rgba(color,alpha){
    const match=/^#([0-9a-f]{6})$/i.exec(String(color||''));
    if(!match)return `rgba(255,255,255,${clamp(alpha,0,1)})`;
    const n=parseInt(match[1],16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${clamp(alpha,0,1)})`;
  }
  function normalize(raw){
    if(!raw||!['linear','radial'].includes(raw.type))return null;
    const stops=(Array.isArray(raw.stops)?raw.stops:[]).slice(0,8)
      .map(stop=>({offset:clamp(stop&&stop.offset,0,1),color:/^#[0-9a-f]{6}$/i.test(stop&&stop.color||'')?stop.color:'#ffffff',alpha:clamp(stop&&stop.alpha==null?1:stop.alpha,0,1)}))
      .sort((a,b)=>a.offset-b.offset);
    if(stops.length<2)return null;
    return {type:raw.type,angle:Number.isFinite(+raw.angle)?+raw.angle:0,cx:clamp(raw.cx==null?.5:raw.cx,0,1),cy:clamp(raw.cy==null?.5:raw.cy,0,1),radius:clamp(raw.radius==null?.5:raw.radius,.01,2),stops};
  }
  function style(ctx,raw,box,fallback){
    const paint=normalize(raw);if(!paint)return fallback||'#ffffff';
    const x=+box.x||0,y=+box.y||0,w=Math.max(1,+box.w||1),h=Math.max(1,+box.h||1);
    let gradient;
    if(paint.type==='linear'){
      const angle=paint.angle*Math.PI/180,dx=Math.cos(angle),dy=Math.sin(angle),half=(Math.abs(dx)*w+Math.abs(dy)*h)/2,cx=x+w/2,cy=y+h/2;
      gradient=ctx.createLinearGradient(cx-dx*half,cy-dy*half,cx+dx*half,cy+dy*half);
    }else{
      const cx=x+w*paint.cx,cy=y+h*paint.cy,radius=Math.max(.001,Math.max(w,h)*paint.radius);
      gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);
    }
    for(const stop of paint.stops)gradient.addColorStop(stop.offset,rgba(stop.color,stop.alpha));
    return gradient;
  }
  // Non-spatial use of the same stops: luminance -> colour, cached by callers.
  // Straight sRGB interpolation matches the colour controls; Alpha stays separate.
  function ramp(raw){
    const paint=normalize(raw);if(!paint)return null;
    const stops=paint.stops.map(stop=>{const n=parseInt(stop.color.slice(1),16);return {...stop,rgb:[(n>>16)&255,(n>>8)&255,n&255]};}),lut=new Uint8ClampedArray(256*4);
    let index=0;
    for(let value=0;value<256;value++){
      const x=value/255;while(index<stops.length-1&&x>=stops[index+1].offset)index++;
      const a=stops[index],b=stops[Math.min(index+1,stops.length-1)],t=clamp((x-a.offset)/Math.max(.000001,b.offset-a.offset),0,1);
      for(let channel=0;channel<3;channel++)lut[value*4+channel]=a.rgb[channel]+(b.rgb[channel]-a.rgb[channel])*t;
      lut[value*4+3]=(a.alpha+(b.alpha-a.alpha)*t)*255;
    }
    return lut;
  }
  api.modules.paint=Object.freeze({normalize,style,ramp});
})(typeof window!=='undefined'?window:globalThis);
