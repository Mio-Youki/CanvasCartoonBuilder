/* ASCII authoring owns font rasterization; exported playback owns only masks. */
(function (global) {
  'use strict';
  const scriptUrl=global.document?.currentScript?.src;
  const fontStates=new Map();
  const descriptor=id=>id==='chill-16'?{file:'ChillBitmap16-default.js',family:'ToSampoolAsciiPixel16',key:'__TOSAMPOOL_ASCII_FONT_DATA__'}:{file:'ChillBitmap7-default.js',family:'ToSampoolAsciiPixel7',key:'__TOSAMPOOL_ASCII_FONT_DATA_7__'};
  const status=id=>{id=id==='chill-16'?id:'builtin';if(!fontStates.has(id))fontStates.set(id,{state:'idle',error:null,promise:null});return fontStates.get(id);};
  async function ensureBuiltinFont(values){
    const runtime=global.ToSampoolRuntimeVNext.modules.ascii;
    if(!runtime.needsBuiltinFont(values))return;
    const id=values.font==='chill-16'?values.font:'builtin',entry=status(id),resource=descriptor(id);
    const sourceUrl=scriptUrl?new URL('../assets/fonts/'+resource.file,scriptUrl).href:null;
    if(entry.state==='ready')return;
    if(!entry.promise)entry.promise=(async()=>{
      entry.state='loading';entry.error=null;
      try{
        if(!sourceUrl)throw new Error('无法定位默认ASCII字体资源');
        await new Promise((resolve,reject)=>{
          const script=document.createElement('script');script.src=sourceUrl;
          script.onload=()=>{script.remove();resolve();};script.onerror=()=>{script.remove();reject(new Error('无法读取默认ASCII字体资源'));};document.head.append(script);
        });
        const data=global[resource.key];
        if(!data?.gzip||data.family!==resource.family)throw new Error('默认ASCII字体资源无效');
        const compressed=Uint8Array.from(atob(data.gzip),char=>char.charCodeAt(0));
        const font=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
        if(font.byteLength!==data.bytes)throw new Error('默认ASCII字体长度校验失败');
        const face=new FontFace(data.family,font);await face.load();document.fonts.add(face);
        runtime.setBuiltinFont(data.family,id);delete global[resource.key];entry.state='ready';
      }catch(error){entry.state='failed';entry.error=String(error.message||error);throw error;}
    })().catch(error=>{entry.promise=null;throw error;});
    return entry.promise;
  }
  function preparePatch(values, patch, fonts) {
    const next=Object.assign({},values,patch),runtime=global.ToSampoolRuntimeVNext.modules.ascii;
    const chosen=['builtin','chill-16'].includes(next.font)?null:fonts?.selectedFor(next.font);
    return Object.assign({},patch,{glyphAtlas:runtime.prepare(next,chosen?.family||'monospace')});
  }
  function preview(root,values) {
    const runtime=global.ToSampoolRuntimeVNext.modules.ascii,atlas=runtime.atlas(values),canvas=root.createElement('canvas');
    canvas.width=atlas.width*atlas.ramp.length;canvas.height=atlas.height;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(canvas.width,canvas.height),area=atlas.width*atlas.height;
    atlas.ramp.forEach((entry,index)=>{for(let y=0;y<atlas.height;y++)for(let x=0;x<atlas.width;x++){const p=(y*canvas.width+index*atlas.width+x)*4;image.data[p]=image.data[p+1]=image.data[p+2]=255;image.data[p+3]=atlas.bytes[entry.index*area+y*atlas.width+x];}});
    ctx.putImageData(image,0,0);canvas.dataset.asciiPreview='';canvas.style.maxWidth='100%';canvas.style.height='32px';canvas.style.objectFit='contain';canvas.style.imageRendering='pixelated';canvas.style.background='#000';canvas.title='自动排序：稀疏 → 密集';return canvas;
  }
  function fontInput(options) {
    const {root,fonts,values,change}=options,wrap=root.createElement('span');
    let request=0;
    const onChange=async id=>{const token=++request;select.setCustomValidity('');try{await ensureBuiltinFont(Object.assign({},values,{font:id}));if(token!==request||!wrap.isConnected)return;const patch=preparePatch(values,{font:id},fonts);patch.glyphRatio=patch.glyphAtlas.width/patch.glyphAtlas.height;change(patch);}catch(error){select.setCustomValidity(error.message);select.reportValidity();}};
    const select=fonts?fonts.makeSelect(['builtin','chill-16'].includes(values.font)?'system':values.font,id=>onChange(id)):root.createElement('select');
    if(!fonts){const option=root.createElement('option');option.value='system';option.textContent='默认等宽';select.append(option);select.addEventListener('change',()=>onChange(select.value));}
    const builtin=root.createElement('option');builtin.value='builtin';builtin.textContent='默认像素字体';builtin.title='8×8字格：保留内置符号，扩展字符使用寒蝉7px原生点阵';
    const sixteen=root.createElement('option');sixteen.value='chill-16';sixteen.textContent='寒蝉点阵体 16px';sixteen.title='全部字符统一使用寒蝉16px字形';select.prepend(builtin,sixteen);select.value=values.font||'builtin';
    Object.assign(wrap.style,{display:'flex',gap:'4px',flexWrap:'wrap'});select.style.minWidth='0';select.style.flex='1';wrap.append(select);
    if(fonts){const button=root.createElement('button');button.type='button';button.textContent='+';button.title='导入 ASCII 字体';button.addEventListener('click',async()=>{button.disabled=true;try{const result=await fonts.choose();if(result)onChange(result.id);}finally{button.disabled=false;}});wrap.append(button);}
    wrap.append(preview(root,values));return wrap;
  }
  global.EditorClassicV4AsciiControl=Object.freeze({preparePatch,fontInput,preview,ensureBuiltinFont,fontStatus:(id='builtin')=>({state:status(id).state,error:status(id).error})});
})(typeof window!=='undefined'?window:globalThis);
