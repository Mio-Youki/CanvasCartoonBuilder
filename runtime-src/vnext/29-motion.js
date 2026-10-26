/* Shared deterministic time primitives. Effects map these values to their own units. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext,wrap=p=>((p%1)+1)%1;
  const ease=(p,mode)=>mode==='ease-in'?p*p:mode==='ease-out'?1-(1-p)*(1-p):mode==='smooth'||mode==='ease-in-out'?p*p*(3-2*p):p;
  function curve(phase,mode){
    const raw=wrap(phase);
    if(mode==='step')return raw<.5?-1:1;
    if(!mode||mode==='smooth')return Math.sin(raw*Math.PI*2);
    const shift=mode==='ease-in'?Math.SQRT1_2/2:mode==='ease-out'?(1-Math.SQRT1_2)/2:.25,p=wrap(raw+shift),leg=p<.5?p*2:2-p*2;
    return -1+2*ease(leg,mode);
  }
  function clock(spec,time,options={}){
    spec=spec||{};
    const period=Math.max(.001,Number.isFinite(+spec.period)&&+spec.period>0?+spec.period:options.period||1),position=(Number.isFinite(+time)?+time:0)/period,cycle=Math.floor(position),phase=position-cycle;
    const frames=Math.max(1,Math.round(+spec.periodFrames||+spec.steps||options.frames||8)),stepped=spec.stepped??options.stepped??false,index=Math.min(frames-1,Math.floor(phase*frames+1e-10));
    return{period,cycle,phase:stepped?index/frames:phase,index,frames,stepped,tick:cycle*frames+index};
  }
  function oscillate(spec,time,options){
    const c=clock(spec,time,options),mode=spec?.curve||'smooth';
    if(!c.stepped)return curve(c.phase,mode);
    // Discrete oscillators sample from an extremum: N=2 is -1,+1, never 0,0.
    if(mode==='step')return c.phase<.5?-1:1;
    if(mode==='smooth')return-Math.cos(c.phase*Math.PI*2);
    return-1+2*ease(c.phase<.5?c.phase*2:2-c.phase*2,mode);
  }
  function progress(spec,time,options){return ease(clock(spec,time,options).phase,spec?.curve||'linear');}
  function advance(spec,time,options){const c=clock(spec,time,options);return c.cycle+ease(c.phase,spec?.curve||'linear');}
  function motionTime(spec,time,period){if(!(period>0)||!Number.isFinite(period))return time;const c=clock({...spec,period},time);return(c.cycle+c.phase)*period;}
  function refresh(spec,time,options={}){const c=clock({...spec,stepped:true},time,options);return options.loop===false?c.tick:c.index;}
  api.modules.motion=Object.freeze({ease,curve,clock,oscillate,progress,advance,motionTime,refresh});
})(typeof window!=='undefined'?window:globalThis);
