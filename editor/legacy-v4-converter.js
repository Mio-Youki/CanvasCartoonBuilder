/* Explicit Legacy data -> ToSampool v4 conversion core. Never evaluates source text. */
(function (global) {
  'use strict';

  const RESERVED=new Set(['format','formatVersion','kind','name','meta','w','h','loop','bg','transparent','scenes','sceneBorders','images','fx','groups','timeline']);
  const DEDICATED=new Set(['stars','moon','clouds','mountains','farForest','poles','rail','train','foreground','fog','signal','bridge']);
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const finite=(value,fallback)=>Number.isFinite(+value)?+value:fallback;
  const first=value=>Array.isArray(value)?value[0]:value;
  const stable=(value,fallback)=>String(value||fallback).replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||fallback;

  function sceneSegments(legacy){
    const names=Array.isArray(legacy.scenes)&&legacy.scenes.length?legacy.scenes.map((value,index)=>String(value||`场景 ${index+1}`)):['场景 1'],count=names.length,loop=Math.max(.001,finite(legacy.loop,4));
    const raw=Array.isArray(legacy.sceneBorders)?legacy.sceneBorders:[],edges=[0];
    for(let index=0;index<count-1;index++){const fallback=(index+1)/count,value=raw[index];edges.push(value==null?fallback:Math.max(0,Math.min(1,(+value>1?+value/loop:+value))));}
    edges.push(1);for(let index=1;index<edges.length;index++)edges[index]=Math.max(edges[index-1]+.000001,edges[index]);edges[edges.length-1]=1;
    return names.map((name,index)=>({id:`scene-${index+1}`,name,f:[edges[index],edges[index+1]]}));
  }

  function part(input,index){
    const value=clone(input)||{},type=['rect','ellipse','line','poly'].includes(value.type)?value.type:'rect',out={id:stable(value.id,`part-${index+1}`),type,x:finite(value.x,0),y:finite(value.y,0),alpha:Math.max(0,Math.min(1,finite(value.alpha,1))),scaleX:finite(value.scaleX,1),scaleY:finite(value.scaleY,1),rot:finite(value.rot,0)};
    if(type==='line'){out.x2=finite(value.x2,out.x+1);out.y2=finite(value.y2,out.y+1);}else{out.w=Math.max(1,finite(value.w,1));out.h=Math.max(1,finite(value.h,1));}
    if(type==='rect'&&value.radius!=null)out.radius=Math.max(0,finite(value.radius,0));
    if(type==='poly')out.points=Array.isArray(value.points)?clone(value.points):[[.5,0],[1,1],[0,1]];
    const legacyFill=value.fill===true?value.color:value.fill,legacyStroke=value.fill===false?value.color:value.stroke;
    if(typeof legacyFill==='string')out.fill=legacyFill;if(typeof legacyStroke==='string')out.stroke=legacyStroke;
    if(value.strokeWidth!=null||value.width!=null)out.strokeWidth=Math.max(0,finite(value.strokeWidth,value.width));
    if(value.anim&&typeof value.anim==='object')out.anim=clone(value.anim);
    return out;
  }

  function partBounds(parts){
    if(!parts.length)return{x:0,y:0,w:1,h:1};let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const item of parts){const x=item.type==='line'?Math.min(item.x,item.x2):item.x,y=item.type==='line'?Math.min(item.y,item.y2):item.y,w=item.type==='line'?Math.abs(item.x2-item.x):item.w,h=item.type==='line'?Math.abs(item.y2-item.y):item.h;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+w);maxY=Math.max(maxY,y+h);}
    return{x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
  }

  function timelineValues(document,entity,legacy,segments,offsets){
    const keys=['x','y','w','h','scaleX','scaleY','rot','alpha'],dynamic=keys.filter(key=>Array.isArray(legacy[key])&&legacy[key].length>1);
    if(!dynamic.length)return;
    document.timeline.tracks[entity.id]={segments:segments.map((segment,index)=>{const values={};for(const key of dynamic){const source=legacy[key],value=source[Math.min(index,source.length-1)],offset=offsets&&Number.isFinite(+offsets[key])?+offsets[key]:0;if(value!=null)values[key]=+value+offset;}return{f:segment.f.slice(),type:'step',values};})};
  }

  function visibility(document,entity,show,segments){
    if(!Array.isArray(show))return;const ranges=[];
    segments.forEach((segment,index)=>{const spec=show[index],start=segment.f[0],span=segment.f[1]-start;if(!Array.isArray(spec))return;for(const pair of spec){if(Array.isArray(pair)&&pair.length>=2)ranges.push([start+Math.max(0,Math.min(1,+pair[0]))*span,start+Math.max(0,Math.min(1,+pair[1]))*span]);}});
    const cuts=Array.from(new Set([0,1,...segments.flatMap(segment=>segment.f),...ranges.flat()])).sort((a,b)=>a-b),output=[];
    for(let index=0;index<cuts.length-1;index++){const a=cuts[index],b=cuts[index+1],mid=(a+b)/2,visible=ranges.some(range=>mid>=range[0]&&mid<=range[1]);const previous=output[output.length-1];if(previous&&previous.visible===visible)previous.f[1]=b;else output.push({f:[a,b],visible});}
    document.timeline.visibility=document.timeline.visibility||{};document.timeline.visibility[entity.id]={segments:output};
  }

  function builtinEntity(value,key){
    const id=value.builtin==='train-beam'?'train-beam':value.builtin,params={};
    if(id==='train-beam'){
      params.color=typeof first(value.beam)==='string'&&/^#[0-9a-f]{6}$/i.test(first(value.beam))?first(value.beam):'#ffe5a3';
      params.alpha=finite(value.alpha,.7);params.length=Math.max(.05,Math.min(1,finite(first(value.beamLen),finite(value.w,40))/Math.max(1,finite(value.w,40))));params.spread=.8;params.flicker=0;params.period=.35;
    }
    return{id:stable(value.id,key),name:value.name||key,type:'builtin',x:finite(first(value.x),0),y:finite(first(value.y),0),w:Math.max(1,finite(first(value.w),finite(first(value.beamLen),40))),h:Math.max(1,finite(first(value.h),24)),scaleX:finite(first(value.scaleX),1),scaleY:finite(first(value.scaleY),1),rot:finite(first(value.rot),0),alpha:Math.max(0,Math.min(1,finite(first(value.alpha),1))),builtin:{id,version:1,params}};
  }

  function convert(input,options){
    options=options||{};const legacy=clone(input)||{},segments=sceneSegments(legacy),document={format:'tosampool-scene/v4',width:Math.max(1,finite(legacy.w,320)),height:Math.max(1,finite(legacy.h,180)),loop:Math.max(.001,finite(legacy.loop,4)),background:{color:typeof first(legacy.bg)==='string'?first(legacy.bg):'#000000',alpha:legacy.transparent?0:1,layers:[]},assets:{},entities:[],timeline:{tracks:{},scenes:segments},sceneEffects:{pipeline:['overlay','sample'],overlay:{},sample:{}}},items=[];
    const report=(sourceId,status,targetId,reason,losses)=>items.push({sourceId,status,targetId:targetId||null,reason:reason||'',losses:losses||[]});
    const freezes=options.freezes||{},ids=new Set();
    function add(entity,source,value,status,reason,losses,timelineOffsets){let id=stable(entity.id,`entity-${document.entities.length+1}`),suffix=2;while(ids.has(id))id=stable(entity.id,`entity-${document.entities.length+1}`)+'-'+suffix++;entity.id=id;ids.add(id);document.entities.push(entity);timelineValues(document,entity,value,segments,timelineOffsets);visibility(document,entity,value.show,segments);report(source,status||'converted',entity.id,reason,losses);return entity;}
    function frozen(sourceId,value){const spec=freezes[sourceId];if(!spec)return false;const assetId=stable(spec.assetId,`${sourceId}-frozen`);document.assets[assetId]={locator:String(spec.locator||'')};add({id:stable(value.id,sourceId),name:value.name||sourceId,type:'image',assetId,x:finite(spec.x,finite(first(value.x),0)),y:finite(spec.y,finite(first(value.y),0)),w:Math.max(1,finite(spec.w,spec.width||document.width)),h:Math.max(1,finite(spec.h,spec.height||document.height)),scaleX:1,scaleY:1,rot:0,alpha:1},sourceId,value,'frozen','用户确认冻结为图片',['丢失内部参数、程序动态与可编辑图元']);return true;}
    function vectorFromParts(value,sourceId,parts,status,reason,losses){
      if(!parts.length)return false;
      const box=partBounds(parts),originX=finite(first(value.x),0),originY=finite(first(value.y),0);
      for(const item of parts){if(item.type==='line'){item.x-=box.x;item.x2-=box.x;item.y-=box.y;item.y2-=box.y;}else{item.x-=box.x;item.y-=box.y;}}
      add({id:stable(value.id,sourceId),name:value.name||sourceId,type:'vector',x:originX+box.x,y:originY+box.y,w:box.w,h:box.h,scaleX:finite(first(value.scaleX),1),scaleY:finite(first(value.scaleY),1),rot:finite(first(value.rot),0),alpha:Math.max(0,Math.min(1,finite(first(value.alpha),1))),parts},sourceId,value,status||'converted',reason,losses,{x:box.x,y:box.y});
      return true;
    }
    function direct(value,sourceId,isImageList){
      if(!value||typeof value!=='object')return;
      if(value.program&&value.program.code){if(!frozen(sourceId,value))report(sourceId,'module-required',null,'包含 Legacy program.code；转换器不会执行它，应在外部适配为受信任的项目 Scene Module',['尚未迁移其绘制结果、动态与公开参数']);return;}
      if(value.kind==='builtin'&&value.builtin){try{add(builtinEntity(value,sourceId),sourceId,value,'builtin','映射到受控 Builtin Registry');}catch(error){report(sourceId,'blocked',null,error.message);}return;}
      if(value.particle){if(!frozen(sourceId,value))report(sourceId,'manual',null,'Legacy 粒子源需要人工映射到 v4 粒子实体与 particle-age 语义',['尚未迁移发射、运动、生命周期与实体继承']);return;}
      const parts=Array.isArray(value.parts)?value.parts.map(part):[];
      if(value.src){const assetId=stable(value.assetId||value.id,`${sourceId}-asset`);document.assets[assetId]={locator:String(value.src),mime:value.mime||undefined};add({id:stable(value.id,sourceId),name:value.name||sourceId,type:'image',assetId,x:finite(first(value.x),0),y:finite(first(value.y),0),w:Math.max(1,finite(first(value.w),1)),h:Math.max(1,finite(first(value.h),1)),scaleX:finite(first(value.scaleX),1),scaleY:finite(first(value.scaleY),1),rot:finite(first(value.rot),0),alpha:Math.max(0,Math.min(1,finite(first(value.alpha),1))),parts},sourceId,value,'converted','图片 locator 与声明式覆盖图元直接转换');return;}
      if(vectorFromParts(value,sourceId,parts,'converted',isImageList?'素材图元直接转换':'通用声明式图元直接转换'))return;
      if(!frozen(sourceId,value))report(sourceId,'module-required',null,'没有可直接声明转换的图片、parts 或已注册 builtin；需要外部 Scene Module 适配',['转换器未执行未知绘制逻辑']);
    }
    (legacy.images||[]).forEach((value,index)=>{const sourceId=value&&value.id||`images[${index}]`;if(value&&value.role==='background'&&value.src){const assetId=stable(value.assetId||value.id,`background-${index+1}`);document.assets[assetId]={locator:String(value.src)};document.background.layers.push({id:stable(value.id,`background-${index+1}`),assetId,x:finite(first(value.x),0),y:finite(first(value.y),0),w:Math.max(1,finite(first(value.w),document.width)),h:Math.max(1,finite(first(value.h),document.height)),layout:value.bgLayout||value.layout||'keep',alpha:Math.max(0,Math.min(1,finite(first(value.alpha),1)))});report(sourceId,'converted',document.background.layers.at(-1).id,'图片背景层直接转换');}else direct(value,sourceId,true);});
    for(const [key,value] of Object.entries(legacy)){
      if(RESERVED.has(key)||!value||typeof value!=='object'||Array.isArray(value))continue;
      if(DEDICATED.has(key)&&!(value.kind==='builtin')){
        if(frozen(key,value))continue;
        const parts=Array.isArray(value.parts)?value.parts.map(part):[];
        if(key==='moon'&&vectorFromParts(value,key,parts,'converted','当前 Legacy 运行时已由 parts 替代月亮专用绘制；Scene 位置与显示时段直接转换'))continue;
        if(parts.length){vectorFromParts(value,key,parts,'native-mappable','当前 Legacy 运行时已使用 parts；仍需把旧动画/附加几何映射为 v4 原生对象',['不执行专用函数；列车光束、旧 blink/bob 等待原生适配']);continue;}
        report(key,'native-mappable',null,'已知 home-scene 图层可由 v4 图元 tile、scroll/repeat、时序与显示段原生表达',['当前通用转换器不执行或解析专用函数；需 home-scene 语义适配器展开']);
        continue;
      }
      direct(value,key,false);
    }
    if(Array.isArray(legacy.bg)&&legacy.bg.length>1){segments.forEach((segment,index)=>{const color=legacy.bg[Math.min(index,legacy.bg.length-1)];if(typeof color==='string')segment.background={color,alpha:legacy.transparent?0:1};});report('background.color','converted','timeline.scenes','Legacy 多 Scene 底色写入 v4 Scene 段背景');}
    if(legacy.fx&&Array.isArray(legacy.fx.layers)&&legacy.fx.layers.length)report('fx.layers','manual',null,'Legacy 局部 FX 的 z/绑定语义需要人工映射到 v4 对象效果或场景滤镜',['未将旧 FX 冒充为 v4 效果']);
    const statuses=['converted','builtin','native-mappable','hybrid','module-required','freeze-optional','frozen','manual','blocked'],summary=Object.fromEntries(statuses.map(status=>[status,items.filter(item=>item.status===status).length])),unresolved=new Set(['native-mappable','hybrid','module-required','freeze-optional','manual','blocked']),pending=items.filter(item=>unresolved.has(item.status));
    return Object.freeze({document,report:Object.freeze({format:'tosampool-legacy-conversion-report',version:2,complete:pending.length===0,summary,items}),saveable:pending.length===0});
  }

  global.EditorLegacyV4Converter=Object.freeze({version:2,convert,sceneSegments});
})(typeof window!=='undefined'?window:globalThis);
