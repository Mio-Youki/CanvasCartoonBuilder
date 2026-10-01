/* Temporary sprite-sheet ingestion: grid/atlas input -> neutral FrameLayout.
   The layout is deliberately not part of the persisted asset recipe. */
(function (global) {
  'use strict';
  const integer = (value, fallback, min) => Math.max(min == null ? 0 : min, Math.round(Number.isFinite(+value) ? +value : fallback));
  const size = value => Math.max(1, integer(value, 1, 1));

  function grid(input) {
    input = input || {};
    const width=size(input.width), height=size(input.height), columns=size(input.columns), rows=size(input.rows);
    const marginX=integer(input.marginX,0), marginY=integer(input.marginY,0), gapX=integer(input.gapX,0), gapY=integer(input.gapY,0);
    const cellW=size(input.cellWidth || Math.floor((width-marginX*2-gapX*(columns-1))/columns));
    const cellH=size(input.cellHeight || Math.floor((height-marginY*2-gapY*(rows-1))/rows));
    const frames=[];
    for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
      const x=marginX+column*(cellW+gapX),y=marginY+row*(cellH+gapY);
      if(x<0||y<0||x+cellW>width||y+cellH>height) continue;
      frames.push({x,y,w:cellW,h:cellH});
    }
    if(!frames.length) throw new Error('切分参数没有落在精灵图范围内');
    if(input.order==='column-major') frames.sort((a,b)=>a.x-b.x||a.y-b.y);
    return { frames, order:input.order==='column-major'?'column-major':'row-major', clips:[] };
  }

  function atlas(json, image) {
    const source=typeof json==='string'?JSON.parse(json):json;
    const width=size(image&&image.width),height=size(image&&image.height),raw=source&&source.frames;
    if(!raw) throw new Error('JSON 中没有 frames');
    const entries=Array.isArray(raw)?raw:Object.entries(raw).map(([name,value])=>Object.assign({name},value));
    const frames=[];
    for(const entry of entries) {
      const rect=entry&&entry.frame||entry;
      if(!rect||entry.rotated===true) throw new Error('JSON 含旋转帧；当前切帧不支持旋转帧');
      const x=integer(rect.x,NaN),y=integer(rect.y,NaN),w=integer(rect.w,NaN),h=integer(rect.h,NaN);
      if(!Number.isFinite(x)||!Number.isFinite(y)||w<1||h<1||x<0||y<0||x+w>width||y+h>height) throw new Error('JSON 中有超出精灵图范围的帧');
      frames.push({x,y,w,h,duration:Number.isFinite(+entry.duration)?Math.max(1,Math.round(+entry.duration)):undefined,name:entry.name});
    }
    if(!frames.length) throw new Error('JSON 没有可导入的帧');
    const tags=source&&source.meta&&Array.isArray(source.meta.frameTags)?source.meta.frameTags.map(tag=>({name:String(tag.name||'clip'),from:integer(tag.from,0),to:integer(tag.to,0)})).filter(tag=>tag.to>=tag.from&&tag.to<frames.length):[];
    return {frames,order:'atlas',clips:tags};
  }

  function averageFps(layout, fallback) {
    const durations=(layout&&layout.frames||[]).map(frame=>+frame.duration).filter(value=>Number.isFinite(value)&&value>0);
    if(!durations.length)return Math.max(.1,+fallback||8);
    return Math.max(.1,Math.round(100000/(durations.reduce((sum,value)=>sum+value,0)/durations.length))/100);
  }

  function bake(image, layout, createCanvas) {
    if(!image||!layout||!Array.isArray(layout.frames)||!layout.frames.length)throw new Error('无法烘焙空的精灵图布局');
    const make=createCanvas||(()=>document.createElement('canvas')), frameW=Math.max(...layout.frames.map(frame=>size(frame.w))),frameH=Math.max(...layout.frames.map(frame=>size(frame.h))),canvas=make();
    canvas.width=frameW*layout.frames.length;canvas.height=frameH;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    layout.frames.forEach((frame,index)=>ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,index*frameW,0,frame.w,frame.h));
    return {canvas,frames:layout.frames.length,width:frameW,height:frameH};
  }

  const api=Object.freeze({version:1,grid,atlas,averageFps,bake});
  global.ToSampoolSpriteSheetLayout=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
