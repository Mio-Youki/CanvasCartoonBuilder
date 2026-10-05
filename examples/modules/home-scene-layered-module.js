/* Project-scoped semantic layers for the Legacy home scene.
 *
 * One trusted Module implementation backs several ordinary v4 procedural
 * entities.  The entities are independently selectable and can receive
 * transforms, masks, decorate/sample effects and timeline values, while each
 * layer keeps its dense pixel drawing procedural instead of expanding into
 * hundreds of editable rects and polygons.
 */
(function(global){
  'use strict';
  const manifest={
    format:'tosampool-scene-module/v1',id:'home-scene-layer',version:1,title:'夜行列车 · 语义图层',
    purpose:'将高密度像素细节保留为程序绘制，同时把天空、环境、列车与前景拆为可独立处理的对象。',
    timeDependent:true,performance:'low',recommendedCanvas:{width:320,height:118},
    parameters:[
      {key:'layer',type:'select',default:'sky',options:['sky','moon','clouds','mountains','forest','poles','rail','train','foreground','fog','signal','bridge'],internal:true},
      {key:'motionScale',label:'运动速率',type:'number',default:1,min:0,max:2,step:.05,timing:'step',appliesTo:{layer:['sky','moon','clouds','mountains','forest','poles','rail','train','foreground','fog','signal','bridge']}},
      {key:'windowLight',label:'窗灯颜色',type:'color',default:'#ffd46b',timing:'step',appliesTo:{layer:['train']}},
      {key:'fogOpacity',label:'雾浓度',type:'number',default:1,min:0,max:1,step:.05,timing:'linear-safe',appliesTo:{layer:['fog']}},
      {key:'scene',type:'select',default:'auto',options:['auto','night','fog','pass','bridge'],internal:true}
    ]
  };
  const C={
    bg:['#09132c','#071126','#0b1531','#050b1d'],star:['#7597c9','#7597c9','#7597c9','#bcd8ff'],
    cloud:['#182b4c','#33445c','#182b4c','#182b4c'],mountain:['#162b45','#162b45','#162b45','#142848'],mountain2:['#233a57','#233a57','#30496a','#233a57'],
    forest:['#12333b','#12333b','#12333b','#102c3a'],ground:['#0c2627','#0c2627','#0c2627','#081724'],
    beam:['rgba(255,222,125,.14)','rgba(255,222,125,.24)','rgba(255,222,125,.14)','rgba(255,222,125,.14)'],beamLen:[40,62,40,40],peak:[39,39,26,39]
  };
  const stars=[[23,13],[43,27],[66,10],[101,19],[128,7],[154,28],[191,11],[217,23],[249,9],[289,18],[307,33]];
  const layers={sky:[0,0,320,47],moon:[0,0,24,24],clouds:[0,20,320,26],mountains:[0,26,320,53],forest:[0,57,320,38],poles:[0,63,320,40],rail:[0,99,320,19],train:[149,69,172,37],foreground:[0,99,320,19],fog:[0,59,320,21],signal:[155,54,15,48],bridge:[0,99,320,19]};
  const wrap=(value,span)=>((value%span)+span)%span;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const chooseScene=(time,choice,sceneIndex)=>choice==='night'?0:choice==='fog'?1:choice==='pass'?2:choice==='bridge'?3:Number.isInteger(sceneIndex)?Math.max(0,Math.min(3,sceneIndex)):Math.min(3,Math.floor(wrap(time,48)/12));
  function paint(layer,ctx,time,params,sceneIndex){
    const scene=chooseScene(time,params.scene,sceneIndex),rate=Math.max(0,+params.motionScale||0),t=time*rate;
    const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    const poly=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
    if(layer==='sky'){
      for(let index=0;index<stars.length;index++){if((index+Math.floor(t*2))%5===0)continue;const [x,y]=stars[index];rect(x,y,index%3?1:2,1,C.star[scene]);}
    } else if(layer==='moon'){
      const mx=12,my=12;rect(mx-7,my-7,15,15,'#d5d8bb');rect(mx-9,my-4,19,9,'#d5d8bb');rect(mx-4,my-9,9,19,'#d5d8bb');rect(mx+4,my-3,4,4,'#9ba69d');rect(mx-5,my+4,3,3,'#9ba69d');
    } else if(layer==='clouds'){
      const offset=wrap(t*[-5,-13,-5,-5][scene],92),color=C.cloud[scene];for(let i=-1;i<5;i++){const x=i*92-offset,y=29+(i&1)*7;rect(x,y,55,5,color);rect(x+12,y-5,38,5,color);rect(x+27,y-9,19,4,color);}
    } else if(layer==='mountains'){
      const offset=wrap(t*[-4,-4,-16,-4][scene],170),peak=C.peak[scene],color=C.mountain[scene],fill2=C.mountain2[scene];for(let i=-1;i<4;i++){const x=i*170-offset;poly([[x,79],[x+78,peak],[x+164,79]],color);poly([[x+78,peak],[x+113,79],[x+89,62]],fill2);}
    } else if(layer==='forest'){
      const offset=wrap(t*-11,33);rect(0,75,320,18,C.forest[scene]);for(let i=-1;i<12;i++){const x=i*33-offset;rect(x+13,66+(i%3)*3,3,20,'#0c2631');poly([[x,80],[x+15,57+(i%4)*4],[x+30,80]],'#17454a');}
    } else if(layer==='poles'){
      const offset=wrap(t*-26,74);for(let i=-1;i<7;i++){const x=i*74-offset;rect(x,66,3,35,'#18253b');rect(x-7,70,17,2,'#263657');rect(x-8,72,2,3,'#ffd66c');rect(x+8,72,2,3,'#ffd66c');if(scene===2)rect(x-2,63,7,3,'#2f4f75');}
    } else if(layer==='rail'){
      const offset=wrap(t*-52,18);rect(0,102,320,3,'#34445c');rect(0,110,320,3,'#1a2637');for(let x=-18;x<338;x+=18)rect(x-offset,103,9,10,'#4a3740');
    } else if(layer==='train'){
      const x=211,y=75+(Math.floor(t*6)%2),windowLight=params.windowLight||'#ffd46b';const len=C.beamLen[scene];poly([[x+9,y+9],[x-len,y+21],[x-len,y+5]],C.beam[scene]);rect(x,y,110,24,'#12283b');rect(x+8,y-6,38,30,'#17334a');rect(x+50,y-2,69,26,'#183148');rect(x+5,y+22,116,4,'#08131f');rect(x+4,y+26,11,4,'#050b12');rect(x+72,y+26,12,4,'#050b12');rect(x+111,y+26,10,4,'#050b12');rect(x+9,y+2,22,13,'#091923');rect(x+12,y+5,4,4,'#a5d8ff');for(let wx=x+38;wx<x+113;wx+=13)rect(wx,y+5,7,7,'#45516a');const blink=((t*1000/2333-1/7)%1+1)%1<6/7;if(blink)for(let wx=x+38;wx<x+113;wx+=13)rect(wx,y+5,7,7,windowLight);rect(x+7,y+9,4,4,'#fff1a7');rect(x,y+16,3,4,'#c14d57');
    } else if(layer==='foreground'){
      const offset=wrap(t*-43,48);rect(0,113,320,5,C.ground[scene]);for(let i=-1;i<9;i++){const x=i*48-offset;rect(x,108,28,4,'#12372f');rect(x+6,104,15,6,'#154532');rect(x+13,99,4,8,'#1d5a3c');}
    } else if(layer==='fog'){
      const offset=wrap(t*-29,70),fog=clamp(params.fogOpacity==null?1:+params.fogOpacity,0,1),shade=value=>`rgba(${value[0]},${value[1]},${value[2]},${value[3]*fog})`;for(let i=-1;i<6;i++){const x=i*70-offset;rect(x,72,49,8,shade([111,139,154,.25]));rect(x+12,65,37,10,shade([132,157,168,.23]));rect(x+28,59,18,8,shade([142,168,176,.18]));}
    } else if(layer==='signal'){
      const x=161;rect(x,54,3,48,'#182537');rect(x-6,56,15,8,'#21324c');const green=((t*1000/4000-.25)%1+1)%1<.75;rect(x-3,58,4,4,green?'#7dff5f':'#ff4d5e');
    } else if(layer==='bridge'){
      const offset=wrap(t*-38,26);rect(0,99,320,4,'#486074');for(let x=-26;x<346;x+=26){rect(x-offset,103,3,15,'#33495b');rect(x-offset+3,114,22,3,'#33495b');}
    }
  }
  function render({ctx,time,sceneIndex,width,height,params}){
    const layer=layers[params.layer]&&params.layer||'sky',box=layers[layer];
    ctx.save();ctx.translate(-width/2,-height/2);ctx.scale(width/box[2],height/box[3]);ctx.beginPath();ctx.rect(0,0,box[2],box[3]);ctx.clip();ctx.translate(-box[0],-box[1]);paint(layer,ctx,time,params,sceneIndex);ctx.restore();
  }
  global.ToSampoolRuntimeVNext.modules.sceneModules.register({manifest,render,timeDependent:()=>true});
})(typeof window!=='undefined'?window:globalThis);
