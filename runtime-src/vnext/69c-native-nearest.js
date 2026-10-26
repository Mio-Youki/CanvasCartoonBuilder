/* Numeric Canvas coordinate calibration. No artwork, project or frame cache. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  function axis(from,to,vertical){
    const make=(w,h)=>{
      if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);
      if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
      throw new Error('native-nearest-calibration-unavailable');
    };
    const source=make(vertical?1:from,vertical?from:1),target=make(vertical?1:to,vertical?to:1);
    try{
      // Match surface-pool's default 2D contexts, not software/read-frequent ones.
      const input=source.getContext('2d'),output=target.getContext('2d');
      if(!input||!output)throw new Error('native-nearest-calibration-unavailable');
      const image=input.createImageData(source.width,source.height);
      for(let i=0;i<from;i++)image.data.set([i&255,i>>>8,0,255],i*4);
      input.putImageData(image,0,0);output.imageSmoothingEnabled=false;
      output.drawImage(source,0,0,target.width,target.height);
      const bytes=output.getImageData(0,0,target.width,target.height).data,map=new Uint32Array(to);
      let exceptions=0;
      for(let i=0;i<to;i++){
        const value=bytes[i*4]+bytes[i*4+1]*256;
        if(value>=from||bytes[i*4+2]!==0||bytes[i*4+3]!==255)throw new Error('native-nearest-calibration-invalid');
        map[i]=value;if(value!==Math.floor((2*i+1)*from/(2*to)))exceptions++;
      }
      return {map,exceptions};
    }finally{source.width=source.height=target.width=target.height=1;}
  }
  function create(width,height,lowWidth,lowHeight){
    for(const value of [width,height,lowWidth,lowHeight])if(!Number.isInteger(value)||value<1||value>32768)throw new Error('unsupported-resample-range');
    if(width===lowWidth&&height===lowHeight)return {data:null,exceptions:0,bytes:0};
    const rows=[axis(width,lowWidth,false),axis(height,lowHeight,true),axis(lowWidth,width,false),axis(lowHeight,height,true)];
    const exceptions=rows.reduce((n,row)=>n+row.exceptions,0),size=Math.max(width,height,lowWidth,lowHeight);
    if(!exceptions)return {data:null,exceptions:0,bytes:0};
    const data=new Uint32Array(size*4);rows.forEach((row,i)=>data.set(row.map,i*size));
    return {data,width:size,exceptions,bytes:data.byteLength};
  }
  api.modules.nativeNearest=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
