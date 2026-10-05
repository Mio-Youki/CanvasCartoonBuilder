#!/usr/bin/env node
/*
 * Safe semantic adapter for the audited Legacy home-scene recipe.
 *
 * It accepts a JSON snapshot only.  It never imports or evaluates
 * home-scene.js; every output entity is ordinary v4 geometry, timeline and
 * motion data.  This keeps the adapter reviewable and makes the resulting
 * scene usable by the normal standalone runtime.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVNextScene } from './validate-scene-vnext.mjs';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');
const copy=value=>value==null?value:JSON.parse(JSON.stringify(value));
const number=(value,fallback=0)=>Number.isFinite(+value)?+value:fallback;
const first=value=>Array.isArray(value)?value[0]:value;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const id=value=>String(value||'entity').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'entity';

function segments(snapshot){
  const names=Array.isArray(snapshot.scenes)&&snapshot.scenes.length?snapshot.scenes:['场景 1'],loop=Math.max(.001,number(snapshot.loop,4)),raw=Array.isArray(snapshot.sceneBorders)?snapshot.sceneBorders:[],edges=[0];
  for(let index=0;index<names.length-1;index++){const value=raw[index],fallback=(index+1)/names.length;edges.push(clamp(value==null?fallback:(+value>1?+value/loop:+value),0,1));}
  edges.push(1);for(let index=1;index<edges.length;index++)edges[index]=Math.max(edges[index-1]+.000001,edges[index]);edges[edges.length-1]=1;
  return names.map((name,index)=>({id:`scene-${index+1}`,name:String(name),f:[edges[index],edges[index+1]]}));
}

function part(raw,index){
  const input=copy(raw)||{},type=['rect','ellipse','line','poly','stroke'].includes(input.type)?input.type:'rect',result={id:`part-${index+1}`,type,x:number(input.x),y:number(input.y),alpha:clamp(number(input.alpha,1),0,1),scaleX:number(input.scaleX,1),scaleY:number(input.scaleY,1),rot:number(input.rot)};
  if(type==='line'){result.x2=number(input.x2,result.x+1);result.y2=number(input.y2,result.y+1);}
  else {result.w=Math.max(1,number(input.w,1));result.h=Math.max(1,number(input.h,1));}
  if(type==='poly')result.points=Array.isArray(input.points)?copy(input.points):[[.5,0],[1,1],[0,1]];
  if(type==='rect'&&input.radius!=null)result.radius=Math.max(0,number(input.radius));
  const fill=input.fill===true?input.color:input.fill,stroke=input.fill===false?input.color:input.stroke;
  if(typeof fill==='string')result.fill=fill;if(typeof stroke==='string')result.stroke=stroke;
  if(input.strokeWidth!=null||input.width!=null)result.strokeWidth=Math.max(0,number(input.strokeWidth,input.width));
  if(input.anim&&input.anim.blink){const blink=input.anim.blink;result.anim={blink:{mode:'gate',period:Math.max(.001,number(blink.period,1000)/1000),duty:clamp(number(blink.duty,.5),0,1),phase:((number(blink.phase)%1)+1)%1,on:clamp(number(blink.on,1),0,1),off:clamp(number(blink.off,0),0,1)}};}
  return result;
}

function bounds(parts){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const value of parts){
    let x=value.x,y=value.y,w=value.w,h=value.h;
    if(value.type==='line'){x=Math.min(value.x,value.x2);y=Math.min(value.y,value.y2);w=Math.abs(value.x2-value.x);h=Math.abs(value.y2-value.y);}
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+w);maxY=Math.max(maxY,y+h);
  }
  return{x:Number.isFinite(minX)?minX:0,y:Number.isFinite(minY)?minY:0,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
}

function vectorFromParts(value,options={}){
  const parts=(value.parts||[]).map(part),box=bounds(parts),originX=number(options.x,first(value.x)),originY=number(options.y,first(value.y));
  for(const item of parts){if(item.type==='line'){item.x-=box.x;item.x2-=box.x;item.y-=box.y;item.y2-=box.y;}else{item.x-=box.x;item.y-=box.y;}}
  return {id:id(options.id||value.id),name:options.name||value.name||value.id,type:'vector',x:originX+box.x,y:originY+box.y,w:box.w,h:box.h,scaleX:number(value.scaleX,1),scaleY:number(value.scaleY,1),rot:number(value.rot),alpha:clamp(number(value.alpha,1),0,1),parts};
}

function visibility(document,entityId,index){document.timeline.visibility[entityId]={segments:document.timeline.scenes.map((scene,current)=>({f:scene.f.slice(),visible:current===index}))};}
/* Scene-only alternates used to become four mutually exclusive entities.
   Preserve their distinct geometry/colors as `sceneVariants` on one semantic
   object instead: the Scene timeline selects one alternative before rendering.
   It keeps the tree understandable and avoids evaluating hidden siblings. */
function sceneVariants(document,value,key,make){
  if(document.__compactSceneVariants===false){for(let index=0;index<document.timeline.scenes.length;index++){const entity=make(index);document.entities.push(entity);visibility(document,entity.id,index);}return;}
  const variants=document.timeline.scenes.map((_,index)=>make(index)),first=copy(variants[0]),variant=value=>{const next=copy(value);delete next.id;delete next.name;delete next.type;return next;};
  first.id=id(String(first.id||`home-${key}`).replace(/-\d+$/, ''));first.name=(value&&value.name)||String(first.name||key).replace(/\s*·\s*.*/, '');
  /* Scene 1 lives in the normal entity fields so its parts remain visible and
     editable in today's Inspector.  Later Scenes store overrides only. */
  first.sceneVariants=variants.map((entry,index)=>index?variant(entry):{});
  document.entities.push(first);return first;
}
function scroll(speed,span){return{scroll:{speed:-number(speed),span:Math.max(1,number(span,1)),angle:0,repeat:true}};}
function triangle(x,y,w,h,points,fill,index){return{id:`part-${index}`,type:'poly',x,y,w,h,points,fill};}

export function adaptHomeSceneSnapshot(input, options={}){
  const snapshot=copy(input)||{},sceneList=segments(snapshot),document={format:'tosampool-scene/v4',width:Math.max(1,number(snapshot.w,320)),height:Math.max(1,number(snapshot.h,180)),loop:Math.max(.001,number(snapshot.loop,4)),background:{color:typeof first(snapshot.bg)==='string'?first(snapshot.bg):'#000000',alpha:snapshot.transparent?0:1,layers:[]},assets:{},entities:[],timeline:{tracks:{},visibility:{},scenes:sceneList},sceneEffects:{pipeline:['overlay','sample'],overlay:{},sample:{}}},items=[];
  Object.defineProperty(document,'__compactSceneVariants',{value:options.compactSceneVariants!==false,enumerable:false});
  const add=(entity,source,reason)=>{document.entities.push(entity);items.push({sourceId:source,status:'converted',targetId:entity.id,reason});return entity;};
  const colors=(value,key)=>Array.isArray(value&&value[key])?value[key]:[value&&value[key]];

  /* Background color belongs to the Scene, not a painted replacement object. */
  if(Array.isArray(snapshot.bg))sceneList.forEach((segment,index)=>{segment.background={color:snapshot.bg[Math.min(index,snapshot.bg.length-1)],alpha:snapshot.transparent?0:1};});
  items.push({sourceId:'background.color',status:'converted',targetId:'timeline.scenes',reason:'多 Scene 底色映射为 Scene 背景'});

  const stars=snapshot.stars||{};
  if(Array.isArray(stars.points)){
    const points=stars.points.map((point,index)=>({id:`star-${index+1}`,type:'rect',x:number(point[0]),y:number(point[1]),w:index%3?1:2,h:1,fill:first(stars.color)||'#ffffff',anim:{blink:{mode:'gate',period:2.5,duty:.8,phase:(((-index)%5+1+5)%5)/5,on:1,off:0}}}));
    add({id:id(stars.id||'home-stars'),name:'星点',type:'vector',x:0,y:0,w:document.width,h:document.height,parts:points},'stars','五相门控闪烁的普通图元');
  }

  const moon=snapshot.moon||{};
  if(Array.isArray(moon.parts)&&moon.parts.length){
    const entity=vectorFromParts(moon);add(entity,'moon','声明式图元与 Scene 位置/显示时段');
    const tracks=['x','y','w','h','scaleX','scaleY','rot','alpha'].filter(key=>Array.isArray(moon[key])&&moon[key].length>1);
    if(tracks.length){const origin=bounds(moon.parts.map(part));document.timeline.tracks[entity.id]={segments:sceneList.map((segment,index)=>{const values={};for(const key of tracks){const raw=moon[key][Math.min(index,moon[key].length-1)];values[key]=number(raw)+(key==='x'?origin.x:key==='y'?origin.y:0);}return{f:segment.f.slice(),type:'step',values};})};}
    if(Array.isArray(moon.show)){document.timeline.visibility[entity.id]={segments:sceneList.map((segment,index)=>({f:segment.f.slice(),visible:Array.isArray(moon.show[index])}))};}
  }

  const clouds=snapshot.clouds||{};
  if(clouds.span){sceneVariants(document,clouds,'clouds',index=>{
    const span=number(clouds.span),y=number(clouds.y),off=number(clouds.yOff),color=colors(clouds,'color')[index]||first(clouds.color)||'#182b4c',parts=[];
    for(let column=0;column<2;column++){const x=column*span,cy=y+(column&1)*off;parts.push({id:`cloud-${column}-a`,type:'rect',x,y:cy,w:55,h:5,fill:color},{id:`cloud-${column}-b`,type:'rect',x:x+12,y:cy-5,w:38,h:5,fill:color},{id:`cloud-${column}-c`,type:'rect',x:x+27,y:cy-9,w:19,h:4,fill:color});}
    return{id:`home-clouds-${index+1}`,name:`云层 · ${sceneList[index].name}`,type:'vector',x:0,y:0,w:span*2,h:document.height,parts,anim:scroll(colors(clouds,'speed')[index]??first(clouds.speed),span*2)};
  });}

  const mountains=snapshot.mountains||{};
  if(mountains.span){sceneVariants(document,mountains,'mountains',index=>{
    const span=number(mountains.span),y=number(mountains.y),peak=number(colors(mountains,'peak')[index]??first(mountains.peak),39),color=colors(mountains,'color')[index]||first(mountains.color)||'#162b45',fill2=colors(mountains,'fill2')[index]||first(mountains.fill2)||'#233a57',height=Math.max(1,y-peak);
    return{id:`home-mountains-${index+1}`,name:`山脉 · ${sceneList[index].name}`,type:'vector',x:0,y:0,w:span,h:document.height,parts:[triangle(0,peak,164,height,[[0,1],[78/164,0],[1,1]],color,1),triangle(78,peak,35,height,[[0,0],[1,1],[11/35,clamp((62-peak)/height,0,1)]],fill2,2)],anim:scroll(colors(mountains,'speed')[index]??first(mountains.speed),span)};
  });}

  const forest=snapshot.farForest||{};
  if(forest.span){sceneVariants(document,forest,'farForest',index=>{
    const span=number(forest.span),parts=[],color=colors(forest,'color')[index]||first(forest.color)||'#12333b';
    for(let column=0;column<12;column++){const x=column*span;parts.push({id:`trunk-${column}`,type:'rect',x:x+13,y:66+(column%3)*3,w:3,h:20,fill:forest.trunk||'#0c2631'},triangle(x,57+(column%4)*4,30,23-(column%4)*4,[[0,1],[.5,0],[1,1]],forest.leaf||'#17454a',`leaf-${column}`));}
    return{id:`home-far-forest-${index+1}`,name:`远景树林 · ${sceneList[index].name}`,type:'vector',x:0,y:0,w:span*12,h:document.height,parts:[{id:'ground',type:'rect',x:0,y:75,w:span*12,h:18,fill:color},...parts],anim:scroll(forest.speed,span*12)};
  });}

  const poles=snapshot.poles||{};
  if(poles.span){const span=number(poles.span),base={id:id(poles.id||'home-poles'),name:'电杆',type:'vector',x:0,y:0,w:span,h:document.height,parts:[{id:'body',type:'rect',x:0,y:66,w:3,h:35,fill:poles.body||'#18253b'},{id:'arm',type:'rect',x:-7,y:70,w:17,h:2,fill:poles.arm||'#263657'},{id:'lamp-left',type:'rect',x:-8,y:72,w:2,h:3,fill:poles.lamp||'#ffd66c'},{id:'lamp-right',type:'rect',x:8,y:72,w:2,h:3,fill:poles.lamp||'#ffd66c'}],anim:scroll(poles.speed,span)};add(base,'poles','普通循环图元流');if(sceneList[2]){const top={id:'home-poles-mountain-top',name:'电杆顶饰 · 山口',type:'vector',x:0,y:0,w:span,h:document.height,parts:[{id:'top',type:'rect',x:-2,y:63,w:7,h:3,fill:poles.top||'#2f4f75'}],anim:scroll(poles.speed,span)};add(top,'poles','第三 Scene 的可见性变体');visibility(document,top.id,2);}}

  const rail=snapshot.rail||{};
  if(rail.span){add({id:'home-rail-base',name:'铁轨',type:'vector',x:0,y:0,w:document.width,h:document.height,parts:[{id:'rail-a',type:'rect',x:0,y:102,w:document.width,h:3,fill:rail.c1||'#34445c'},{id:'rail-b',type:'rect',x:0,y:110,w:document.width,h:3,fill:rail.c2||'#1a2637'}]},'rail','静态铁轨基座');add({id:id(rail.id||'home-rail')+'-ties',name:'铁轨枕木',type:'vector',x:0,y:0,w:number(rail.span),h:document.height,parts:[{id:'tie',type:'rect',x:0,y:103,w:9,h:10,fill:rail.tie||'#4a3740'}],anim:scroll(rail.speed,rail.span)},'rail','普通循环枕木流');}

  const train=snapshot.train||{};
  if(Array.isArray(train.parts)&&train.parts.length){const entity=vectorFromParts(train);entity.anim={bob:{amount:.5,period:1/3,angle:90,curve:'step'}};add(entity,'train','普通图元列车与二态 bob；窗灯使用 gate blink');sceneVariants(document,train,'train-beam',index=>{const length=number(colors(train,'beamLen')[index]??first(train.beamLen),40),fill=colors(train,'beam')[index]||first(train.beam)||'rgba(255,222,125,.14)';return{id:`home-train-beam-${index+1}`,name:`列车光束 · ${sceneList[index].name}`,type:'vector',x:number(train.x)-length,y:number(train.y)+5,w:length+9,h:16,parts:[triangle(0,0,length+9,16,[[1,.25],[0,1],[0,0]],fill,1)],anim:{bob:{amount:.5,period:1/3,angle:90,curve:'step'}}};});}

  const foreground=snapshot.foreground||{};
  if(foreground.span){sceneVariants(document,foreground,'foreground',index=>{const span=number(foreground.span),color=colors(foreground,'color')[index]||first(foreground.color)||'#0c2627';return{id:`home-foreground-${index+1}`,name:`近景树林 · ${sceneList[index].name}`,type:'vector',x:0,y:0,w:span,h:document.height,parts:[{id:'ground',type:'rect',x:0,y:113,w:span,h:5,fill:color},{id:'base',type:'rect',x:0,y:108,w:28,h:4,fill:foreground.g1||'#12372f'},{id:'bush',type:'rect',x:6,y:104,w:15,h:6,fill:foreground.g2||'#154532'},{id:'tree',type:'rect',x:13,y:99,w:4,h:8,fill:foreground.g3||'#1d5a3c'}],anim:scroll(foreground.speed,span)};});}

  const fog=snapshot.fog||{};
  if(fog.span)add({id:id(fog.id||'home-fog'),name:'雾层',type:'vector',x:0,y:0,w:number(fog.span),h:document.height,parts:[{id:'fog-a',type:'rect',x:0,y:72,w:49,h:8,fill:fog.a1||'rgba(111,139,154,.25)'},{id:'fog-b',type:'rect',x:12,y:65,w:37,h:10,fill:fog.a2||'rgba(132,157,168,.23)'},{id:'fog-c',type:'rect',x:28,y:59,w:18,h:8,fill:fog.a3||'rgba(142,168,176,.18)'}],anim:scroll(fog.speed,fog.span)},'fog','普通循环雾图元流');

  const signal=snapshot.signal||{};
  if(Array.isArray(signal.parts)&&signal.parts.length)add(vectorFromParts(signal),'signal','普通图元信号与 gate blink');

  const bridge=snapshot.bridge||{};
  if(bridge.span){add({id:'home-bridge-base',name:'桥面',type:'vector',x:0,y:0,w:document.width,h:document.height,parts:[{id:'deck',type:'rect',x:0,y:99,w:document.width,h:4,fill:bridge.c1||'#486074'}]},'bridge','静态桥面');add({id:id(bridge.id||'home-bridge')+'-supports',name:'桥墩',type:'vector',x:0,y:0,w:number(bridge.span),h:document.height,parts:[{id:'leg',type:'rect',x:0,y:103,w:3,h:15,fill:bridge.c2||'#33495b'},{id:'foot',type:'rect',x:3,y:114,w:22,h:3,fill:bridge.c2||'#33495b'}],anim:scroll(bridge.speed,bridge.span)},'bridge','普通循环桥墩流');}

  const validation=validateVNextScene(document),summary={converted:items.length,'module-required':0,manual:0,blocked:0};
  return Object.freeze({candidate:document,report:Object.freeze({format:'tosampool-home-scene-native-adapter-report',version:1,complete:validation.valid,summary,items:Object.freeze(items),candidateValid:validation.valid,validationErrors:validation.errors}),saveable:validation.valid});
}

function main(args){
  const expanded=args.includes('--expanded'),clean=args.filter(value=>value!=='--expanded'),input=clean[0]&&resolve(clean[0]);if(!input)throw new Error('用法：node scripts/adapt-home-scene-native-v4.mjs <home-scene.snapshot.json> [输出目录] [--expanded]');
  const output=resolve(clean[1]||dirname(input)),result=adaptHomeSceneSnapshot(JSON.parse(readFileSync(input,'utf8')),{compactSceneVariants:!expanded}),stem=expanded?'home-scene.native-expanded-v4':'home-scene.native-v4';
  writeFileSync(resolve(output,stem+'.tosampool.json'),JSON.stringify(result.candidate,null,2)+'\n','utf8');
  writeFileSync(resolve(output,stem+'.conversion-report.json'),JSON.stringify(result.report,null,2)+'\n','utf8');
  console.log(`${result.saveable?'✓':'!'} home-scene 原生映射 ${result.saveable?'通过':'未通过'}：${result.report.summary.converted} 个已知图层映射`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2));
