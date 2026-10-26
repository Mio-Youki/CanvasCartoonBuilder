/* Reusable authoring/playback checks, also run inside the desktop WebView. */
(function(global){
  'use strict';
  async function run(){
    const ascii=ToSampoolRuntimeVNext.modules.ascii;
    const assert=(value,message)=>{if(!value)throw new Error(message);};
    const bytes=data=>Uint8Array.from(atob(data.alpha),char=>char.charCodeAt(0));
    const mask=(data,char)=>{const area=data.width*data.height,index=data.characters.indexOf(char);assert(index>=0,'字形缺失 '+char);return bytes(data).slice(index*area,(index+1)*area);};
    const equal=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
    const defaultText=ascii.defaults.characters;
    const initial=EditorClassicV4AsciiControl.fontStatus();
    if(initial.state!=='ready'){
      let refused=false;try{ascii.prepare({font:'builtin',characters:defaultText+'中'});}catch(error){refused=error.message.includes('尚未载入');}
      assert(refused,'字体未就绪却静默回退');
    }
    await EditorClassicV4AsciiControl.ensureBuiltinFont({font:'builtin',characters:defaultText+'Aa中界'});
    const base=ascii.prepare({font:'builtin',characters:defaultText});
    const mixed=ascii.prepare({font:'builtin',characters:defaultText+'Aa中界'});
    const wider=ascii.prepare({font:'builtin',characters:defaultText+'Aa中界Ｗ'});
    assert(base.width===8&&mixed.width===8&&mixed.height===8&&wider.width===8&&wider.height===8,'扩展改变统一格');
    const oldBase=AsciiGlyphReference.prepare({font:'builtin',characters:defaultText});
    for(const char of oldBase.characters){
      const before=mask(oldBase,char),after=mask(base,char);
      assert(equal(before,after),'原生8px内置字形改变 '+char);
    }
    for(const char of base.characters)assert(equal(mask(base,char),mask(mixed,char))&&equal(mask(base,char),mask(wider,char)),'内置字形被替换 '+char);
    for(const char of ['A','a','中','界']){
      assert(mask(mixed,char).some(Boolean),'扩展字形为空 '+char);
      assert(equal(mask(mixed,char),mask(wider,char)),'新增宽字符改变原扩展字形 '+char);
      assert(mask(mixed,char).every(value=>value===0||value===255),'7px扩展字形不是原生整像素 '+char);
    }
    const counter=mask(mixed,'界');
    assert(counter[1*8+2]===0&&counter[1*8+4]===0&&counter[5*8+1]===0,'7px汉字内部留白被文字对比增强填实');
    assert(EditorClassicV4AsciiControl.fontStatus('chill-16').state==='idle','未选择16px却提前加载');
    await EditorClassicV4AsciiControl.ensureBuiltinFont({font:'chill-16',characters:defaultText+'Aa中界'});
    const sixteen=ascii.prepare({font:'chill-16',characters:defaultText+'Aa中界'});
    assert(sixteen.width===16&&sixteen.height===16,'16px可选字体格错误');
    const savedSixteen={...sixteen,font:'builtin'};
    assert(ascii.atlas({font:'builtin',characters:defaultText+'Aa中界',glyphAtlas:savedSixteen}).width===16,'打开旧16px混合图集触发了隐式迁移');
    for(const char of ['A','中','界','@'])assert(mask(sixteen,char).some(Boolean),'16px缺失字形 '+char);
    assert(!equal(mask(sixteen,'@'),Uint8Array.from({length:256},(_,i)=>mask(base,'@')[Math.floor(i/32)*8+Math.floor(i%16/2)])),'16px选项仍混用内置符号');
    const config={font:'builtin',characters:defaultText+'Aa中界',glyphAtlas:mixed,size:8};
    const atlas=ascii.atlas(config),area=atlas.width*atlas.height;
    for(const entry of atlas.ramp){
      const density=mask(mixed,entry.char).reduce((sum,value)=>sum+value,0)/(255*area);
      assert(entry.density===density,'密度不来自最终Alpha '+entry.char);
    }
    assert(atlas.ramp.every((entry,index,array)=>!index||entry.density>=array[index-1].density),'混合图集未统一排序');
    const low=atlas.ramp[0].density,span=atlas.ramp.at(-1).density-low;
    for(let level=0;level<256;level++){
      const target=low+level/255*span;
      const expected=atlas.ramp.reduce((best,entry)=>Math.abs(entry.density-target)<Math.abs(best.density-target)?entry:best,atlas.ramp[0]);
      assert(atlas.lut[level]===expected.index,'LUT没有按最终密度择近 '+level);
    }
    assert(ascii.geometry(config,1,atlas).height===ascii.geometry({font:'builtin',size:8},1,ascii.atlas({glyphAtlas:base,characters:defaultText})).height,'扩展改变单元比例');
    const explicit=ascii.prepare({font:'system',characters:defaultText+'Aa中界'},'monospace');
    assert(explicit.height===32,'主动选择字体的原生烘焙路径被改变');
    assert(!equal(mask(explicit,'@'),mask(base,'@')),'主动选字体仍错误沿用内置位图');

    const pool=ToSampoolRuntimeVNext.modules.surfaces.create(),source=document.createElement('canvas');source.width=160;source.height=96;
    const ctx=source.getContext('2d'),gradient=ctx.createLinearGradient(0,0,160,0);gradient.addColorStop(0,'black');gradient.addColorStop(1,'white');ctx.fillStyle=gradient;ctx.fillRect(0,0,160,96);
    AsciiGlyphReference.setBackend('cpu');ascii.setBackend('cpu');
    for(const size of [8,12,16]){
      const settings={font:'builtin',characters:defaultText,size,glyphRatio:2/3};
      const a=AsciiGlyphReference.apply(source,settings,pool,{},1),b=ascii.apply(source,settings,pool,{},1);
      assert(equal(a.getContext('2d').getImageData(0,0,160,96).data,b.getContext('2d').getImageData(0,0,160,96).data),'默认字符输出改变 '+size);
      pool.release(a);pool.release(b);
    }
    const raster=CanvasRenderingContext2D.prototype,originalText=raster.fillText,originalMeasure=raster.measureText;
    const gpu=global.WebGLRenderingContext?.prototype,originalUpload=gpu?.texImage2D;
    let fontCalls=0,glyphUploads=0,first,last;
    raster.fillText=function(...args){fontCalls++;return originalText.apply(this,args);};
    raster.measureText=function(...args){fontCalls++;return originalMeasure.apply(this,args);};
    if(gpu)gpu.texImage2D=function(...args){if(this.getParameter(this.ACTIVE_TEXTURE)===this.TEXTURE2)glyphUploads++;return originalUpload.apply(this,args);};
    ascii.setBackend('auto');ascii.setAnalysisBackend('auto');
    try{
      for(let i=0;i<20;i++){
        assert(ascii.atlas(config)===atlas,'相同配置未复用图集');
        const output=ascii.apply(source,config,pool,{time:i/30},1);
        const data=output.getContext('2d').getImageData(0,0,160,96).data.slice();if(!i)first=data;last=data;pool.release(output);
      }
      assert(fontCalls===0,'播放期间重新栅格化字体');
      assert(equal(first,last),'静态混合图集随时间变化');
      if(ascii.getLastBackend()==='gpu')assert(glyphUploads===1,'播放重复上传字形图集 '+glyphUploads);
    }finally{
      raster.fillText=originalText;raster.measureText=originalMeasure;if(gpu)gpu.texImage2D=originalUpload;
    }
    const copy=JSON.parse(JSON.stringify(config));copy.font='not-installed';
    const output=ascii.apply(source,copy,pool,{},1),portable=output.getContext('2d').getImageData(0,0,160,96).data;
    assert(equal(first,portable),'内嵌图集仍依赖环境字体');pool.release(output);pool.clear();
    const patch=EditorClassicV4AsciiControl.preparePatch({font:'builtin',characters:defaultText},{characters:defaultText+'中'},null);
    assert(patch.glyphAtlas.width===8&&equal(mask(patch.glyphAtlas,'@'),mask(base,'@')),'Inspector没有使用混合路径');

    const sheet=document.createElement('canvas');sheet.width=960;sheet.height=600;
    const sc=sheet.getContext('2d');sc.fillStyle='#151a22';sc.fillRect(0,0,sheet.width,sheet.height);sc.font='14px monospace';
    const display=[['Builtin 8x8 reference',oldBase],['ChillBitmap7 + builtin 8x8',mixed],['Optional ChillBitmap16 whole font',sixteen]];
    display.forEach(([label,data],row)=>{
      sc.fillStyle='#fff';sc.fillText(label,12,row*90+20);
      const tile=document.createElement('canvas');tile.width=data.width;tile.height=data.height;
      const tc=tile.getContext('2d'),alpha=bytes(data),a=data.width*data.height;
      [...defaultText+'Aa中界'+ascii.defaults.edgeCharacters].forEach((char,index)=>{
        const glyph=data.characters.indexOf(char);if(glyph<0)return;
        const image=tc.createImageData(data.width,data.height);for(let i=0;i<a;i++){image.data[i*4]=image.data[i*4+1]=image.data[i*4+2]=255;image.data[i*4+3]=alpha[glyph*a+i];}tc.putImageData(image,0,0);
        const scale=Math.min(48/data.width,48/data.height),w=data.width*scale,h=data.height*scale;
        sc.imageSmoothingEnabled=false;sc.drawImage(tile,12+index*52+(48-w)/2,row*90+28,w,h);
      });
    });
    const charsToShow=[...'Aa中界'];
    [8,12,16,24].forEach((size,row)=>{
      const y=300+row*72;sc.fillStyle='#fff';sc.fillText('Output cell '+size+'px (view 3x)',12,y+14);
      charsToShow.forEach((char,index)=>{
        const tile=document.createElement('canvas');tile.width=8;tile.height=8;const tc=tile.getContext('2d'),image=tc.createImageData(8,8),alpha=mask(mixed,char);
        for(let i=0;i<64;i++){image.data[i*4]=image.data[i*4+1]=image.data[i*4+2]=255;image.data[i*4+3]=alpha[i];}tc.putImageData(image,0,0);
        const output=document.createElement('canvas');output.width=size;output.height=size;const out=output.getContext('2d');out.imageSmoothingEnabled=false;out.drawImage(tile,0,0,size,size);
        sc.imageSmoothingEnabled=false;sc.drawImage(output,340+index*100,y-4,size*3,size*3);
      });
    });
    return{builtinsPreserved:base.characters.length,extensions:['A','a','中','界'],fixedCell:[mixed.width,mixed.height],atlasBytes:bytes(mixed).length,baselineBytes:bytes(base).length,
      densities:atlas.ramp.map(({char,density})=>({char,density})),fontCallsDuring20Frames:fontCalls,glyphUploadsDuring20Frames:glyphUploads,portable:true,contactSheet:sheet.toDataURL()};
  }
  global.AsciiGlyphExtensionCheck=Object.freeze({run});
})(window);
