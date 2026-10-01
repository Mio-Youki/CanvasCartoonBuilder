/* Persistent, deterministic import preprocessing for v4 assets.
   Deliberately limited to source preparation: resize and alpha extraction.
   Palette reduction, quantisation and pixel sampling belong to Scene effects. */
(function (global) {
  'use strict';
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function channel(value, fallback) { return clamp(Math.round(Number.isFinite(+value) ? +value : fallback), 0, 255); }
  function color(value, fallback) { const source=Array.isArray(value)?value:fallback; return [channel(source&&source[0], 0), channel(source&&source[1], 0), channel(source&&source[2], 0)]; }
  function normalize(input) {
    input=input||{};
    const legacyBackground=input.backgroundRemoval||{},tolerance=input.bgTolerance!=null?input.bgTolerance:legacyBackground.tolerance,enabled=legacyBackground.enabled===true||+tolerance>0;
    return { width:Math.max(0,Math.round(+input.width||0)),height:Math.max(0,Math.round(+input.height||0)),backgroundRemoval:{enabled,color:color(legacyBackground.color||input.bgColor,[0,0,0]),tolerance:clamp(Math.round(+tolerance||0),0,255),feather:clamp(Math.round(+legacyBackground.feather||0),0,128),connected:legacyBackground.connected!==false} };
  }
  function sameRecipe(recipe) { return !recipe.width&&!recipe.height&&!recipe.backgroundRemoval.enabled; }
  function resizedSize(image, recipe) { const sourceW=image.naturalWidth||image.width,sourceH=image.naturalHeight||image.height,width=recipe.width||Math.max(1,Math.round(sourceW*(recipe.height?recipe.height/sourceH:1))),height=recipe.height||Math.max(1,Math.round(sourceH*(recipe.width?recipe.width/sourceW:1))); return { width, height }; }
  function distance(pixels, index, target) { const dr=pixels[index]-target[0],dg=pixels[index+1]-target[1],db=pixels[index+2]-target[2]; return Math.hypot(dr,dg,db); }
  function removeBackground(data, width, height, config) {
    if(!config.enabled||!config.tolerance)return;
    const pixels=data.data,target=config.color,max=Math.min(441,config.tolerance+config.feather),limit=max*max,match=index=>{const dr=pixels[index]-target[0],dg=pixels[index+1]-target[1],db=pixels[index+2]-target[2];return dr*dr+dg*dg+db*db<=limit;},apply=index=>{const d=distance(pixels,index,target),factor=config.feather?clamp((d-config.tolerance)/Math.max(1,config.feather),0,1):(d<=config.tolerance?0:1);pixels[index+3]=Math.round(pixels[index+3]*factor);};
    if(!config.connected){for(let index=0;index<pixels.length;index+=4)if(match(index))apply(index);return;}
    const count=width*height,seen=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0;
    const push=(x,y)=>{const at=y*width+x;if(seen[at])return;seen[at]=1;const index=at*4;if(match(index))queue[tail++]=at;};
    for(let x=0;x<width;x++){push(x,0);push(x,height-1);}for(let y=1;y<height-1;y++){push(0,y);push(width-1,y);}
    while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);apply(at*4);if(x)push(x-1,y);if(x+1<width)push(x+1,y);if(y)push(x,y-1);if(y+1<height)push(x,y+1);}
  }
  function apply(image, input) {
    const recipe=normalize(input);if(sameRecipe(recipe))return image;
    const size=resizedSize(image,recipe),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,size.width,size.height);
    if(recipe.backgroundRemoval.enabled&&recipe.backgroundRemoval.tolerance){const data=ctx.getImageData(0,0,size.width,size.height);removeBackground(data,size.width,size.height,recipe.backgroundRemoval);ctx.putImageData(data,0,0);}
    return canvas;
  }
  global.EditorVNextAssetRecipe=Object.freeze({normalize,apply,resizedSize,removeBackground});
})(typeof window!=='undefined'?window:globalThis);
