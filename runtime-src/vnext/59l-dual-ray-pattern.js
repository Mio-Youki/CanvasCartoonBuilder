/* The reviewed dual-ray algorithm, expressed as bounded Canvas paint commands. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,generators=api.modules.patternGenerators;
  const parameters=[
    {key:'carrier',label:'载体',type:'select',default:'rect',timing:'No',options:['rect','ellipse','regular','free'],labels:['矩形','椭圆','正多边形','自由多边形']},
    {key:'pairs',label:'色块对数',type:'number',default:12,min:2,max:128,step:1,integer:true,timing:'Step'},
    {key:'colorA',label:'颜色一',type:'color',default:'#e6dec8',timing:'Linear'},
    {key:'alphaA',label:'颜色一透明度',type:'number',default:1,min:0,max:1,step:.01,timing:'Linear'},
    {key:'colorB',label:'颜色二',type:'color',default:'#9c9888',timing:'Linear'},
    {key:'alphaB',label:'颜色二透明度',type:'number',default:1,min:0,max:1,step:.01,timing:'Linear'},
    {key:'centerX',label:'中心 X',type:'number',default:.62,min:-.5,max:1.5,step:.01,timing:'Linear'},
    {key:'centerY',label:'中心 Y',type:'number',default:.58,min:-.5,max:1.5,step:.01,timing:'Linear'},
    {key:'angle',label:'起始角度',type:'number',default:0,min:-720,max:720,step:.1,timing:'Linear',interpolation:'angle-direct'},
    {key:'ratio',label:'色块占比',type:'number',default:.5,min:.05,max:.95,step:.01,timing:'Linear'},
    {key:'motion',label:'动态 · 旋转',type:'boolean',default:true,timing:'Step'},
    {key:'period',label:'周期时间',type:'number',default:12,min:.25,max:120,step:.25,timing:'Step',when:'motion'},
    {key:'direction',label:'方向',type:'select',default:'clockwise',timing:'Step',options:['clockwise','counterclockwise'],labels:['顺时针','逆时针'],when:'motion'},
    {key:'curve',label:'运动节奏',type:'select',default:'linear',timing:'Step',options:['linear','smooth','ease-in','ease-out'],labels:['均匀','柔和','加速','减速'],when:'motion'},
    {key:'stepped',label:'逐帧',type:'boolean',default:false,timing:'Step',when:'motion'},
    {key:'periodFrames',label:'周期帧数',type:'number',default:8,min:1,max:10000,step:1,integer:true,timing:'Step',when:'stepped'}
  ];
  const controlsFor=list=>list.filter(p=>!['alphaA','alphaB'].includes(p.key)).map(p=>p.type==='color'?{component:'color-alpha',key:p.key,alphaKey:p.key==='colorA'?'alphaA':'alphaB'}:{component:'field',key:p.key});
  function generate(input){
    const p=input.params,box=input.bounds,cx=box.x+box.w*p.centerX,cy=box.y+box.h*p.centerY,
      r=Math.max(...[[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].map(([x,y])=>Math.hypot(x-cx,y-cy)))+2,
      cycle=Math.PI*2/p.pairs,phase=p.angle*Math.PI/180+(p.motion?api.modules.motion.progress(p,input.time)*Math.PI*2*(p.direction==='clockwise'?1:-1):0),layers=[],opaque=p.alphaA===1&&p.alphaB===1;
    // Preserve the approved opaque B base: it avoids gaps between adjacent wedges.
    if(opaque)layers.push({color:p.colorB,alpha:1,fillCarrier:true});
    const wedge=(from,to,color,alpha)=>layers.push({color,alpha,commands:[['M',cx,cy],['A',cx,cy,r,from,to],['Z']]});
    for(let i=0;i<p.pairs;i++){const a=phase+i*cycle,b=a+cycle*p.ratio;wedge(a,b,p.colorA,p.alphaA);if(!opaque)wedge(b,a+cycle,p.colorB,p.alphaB);}
    return{layers};
  }
  const legacyParameters=parameters.filter(p=>!['curve','stepped','periodFrames'].includes(p.key));
  const declare=(version,list)=>({format:generators.FORMAT,id:'proposal.dual-ray',version,name:'双色放射',implementation:'dual-ray-v'+version,carriers:['rect','ellipse','poly'],parameters:list,controls:controlsFor(list),output:'carrier-clipped-paint',dependencies:[],budget:{layers:256,commands:1024}});
  const legacyDefinition=generators.register(declare(1,legacyParameters),generate,{trust:'repository-reviewed',carrier});
  const definition=generators.register(declare(2,parameters),generate,{trust:'repository-reviewed',carrier});
  function carrier(params,box,part){
    const type=params.carrier==='regular'||params.carrier==='free'?'poly':params.carrier;
    const output={...part,...box,type,radius:Math.max(0,+part?.generatorRadius||0)};
    if(params.carrier==='regular'){output.polygonMode='regular';output.sides=part?.sides||5;}
    if(params.carrier==='free'){output.polygonMode='free';output.points=part?.points||[[0,.12],[.7,0],[1,.55],[.72,1],[.08,.85]];}
    return output;
  }
  api.modules.dualRayPattern=Object.freeze({definition,legacyDefinition,carrier});
})(typeof window!=='undefined'?window:globalThis);
