/* Periodic scalar rhythms. Compilation is independent of path size and time. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,cache=new Map();
  const types=Object.freeze(['sine','triangle','saw','square','digits','noise']);
  const finite=(value,fallback)=>Number.isFinite(+value)?+value:fallback;
  let builds=0;
  function digits(text){
    const value=String(text==null?'1595':text).replace(/[\s,，]+/g,'');
    if(!/^[1-9]+$/.test(value))throw new Error('数字节奏仅接受1～9；5表示原路径，可用空格或逗号分隔');
    if(value.length>128)throw new Error('数字节奏最多128位，请缩短一个周期');
    return value;
  }
  function normalize(source){
    const value=source||{},type=types.includes(value.type)?value.type:'sine';
    return {enabled:!!value.enabled,type,amplitude:Math.max(0,finite(value.amplitude,2)),wavelength:Math.max(.5,finite(value.wavelength,16)),
      phase:Math.max(0,Math.min(1,finite(value.phase,0))),fixEnds:value.fixEnds!==false,
      digits:type==='digits'?digits(value.digits):String(value.digits==null?'1595':value.digits),
      interpolation:['hold','linear','smooth'].includes(value.interpolation)?value.interpolation:'smooth',seed:Math.round(finite(value.seed,1))};
  }
  function coefficients(values){
    const n=values.length,slopes=new Float64Array(n),out=new Float64Array(n*4);
    for(let i=0;i<n;i++){
      const left=values[i]-values[(i+n-1)%n],right=values[(i+1)%n]-values[i];
      // Periodic, shape-preserving Hermite tangents: pass through monotone
      // anchors without stopping there; zero slope only at flats/extrema.
      slopes[i]=left*right>0?2*left*right/(left+right):0;
    }
    for(let i=0;i<n;i++){
      const a=values[i],b=values[(i+1)%n],m=slopes[i],next=slopes[(i+1)%n],at=i*4;
      out[at]=a;out[at+1]=m;out[at+2]=3*(b-a)-2*m-next;out[at+3]=2*(a-b)+m+next;
    }
    return out;
  }
  function compile(source){
    const wave=normalize(source),type=wave.type;
    const key=JSON.stringify([type,type==='digits'?wave.digits:null,type==='digits'?wave.interpolation:null,type==='noise'?wave.seed:null]);
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
    let values=null,table=null;
    if(type==='digits')values=Array.from(wave.digits,digit=>(+digit-5)/4);
    if(type==='noise')values=Array.from({length:8},(_,i)=>api.modules.sampling.hash(i,0,wave.seed,0)*2-1);
    if(values)table=coefficients(values);
    const interpolation=type==='noise'?'smooth':wave.interpolation;
    const sample=phase=>{
      const t=((phase%1)+1)%1;
      if(type==='sine')return Math.sin(t*Math.PI*2);
      if(type==='triangle')return 1-4*Math.abs(t-.5);
      if(type==='saw')return 2*t-1;
      if(type==='square')return t<.5?1:-1;
      const position=t*values.length,i=Math.min(values.length-1,Math.floor(position)),f=position-i,a=values[i];
      if(interpolation==='hold')return a;
      if(interpolation==='linear')return a+(values[(i+1)%values.length]-a)*f;
      const at=i*4;
      return Math.max(-1,Math.min(1,((table[at+3]*f+table[at+2])*f+table[at+1])*f+table[at]));
    };
    const result=Object.freeze({type,sample,anchors:values?Object.freeze(values):null,samplesPerCycle:values?Math.max(12,values.length*8):24});
    cache.set(key,result);builds++;if(cache.size>32)cache.delete(cache.keys().next().value);return result;
  }
  api.modules.pathWave=Object.freeze({types,digits,normalize,compile,stats:()=>Object.freeze({entries:cache.size,builds})});
})(typeof window!=='undefined'?window:globalThis);
