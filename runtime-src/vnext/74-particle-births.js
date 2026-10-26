/* Immutable birth lattices: Step count/life changes do not rewrite survivors. */
(function(global){
  'use strict';
  const api=global.ToSampoolRuntimeVNext;
  function parameters(values){const p=values.particle||{};return{count:Math.max(0,Math.min(600,Math.round(+p.count||0))),life:Math.max(.001,+p.life||2)};}
  function motion(p,slot,seed,age,life,out={}){
    const hash=salt=>api.modules.sampling.hash(slot,salt,seed|0,0),angle=((+p.direction||0)+(hash(1)*2-1)*(+p.spread||0)/2)*Math.PI/180,speed=Math.max(0,+p.speed||0),sizeVar=Math.max(0,Math.min(1,+p.sizeVar||0));
    out.dx=Math.cos(angle)*speed*age+(+p.wind||0)*age*age/2;out.dy=Math.sin(angle)*speed*age+(+p.gravity||0)*age*age/2;
    out.scale=Math.max(.01,+p.size||1)*(1+(hash(4)*2-1)*sizeVar);out.opacity=Math.max(0,Math.min(1,p.alpha==null?1:+p.alpha))*(p.fade===false?1:1-age/life);
    out.spin=((+p.spin||0)+(+p.spinSpeed||0)*age+(hash(5)*2-1)*(+p.spinVar||0))*Math.PI/180;return out;
  }
  function create(scene,emitter){
    const track=scene.timeline?.tracks?.[emitter.id]||scene.timeline?.tracks?.['entity:'+emitter.id],cuts=new Set([0]);
    for(const segment of track?.segments||[])if(segment.type==='linear'){
      const affected=Object.entries({...segment.values,...segment.from,...segment.to}).some(([key,value])=>['particle.count','particle.life'].includes(key)||key==='particle'&&value&&('count'in value||'life'in value));
      if(affected&&(!Array.isArray(segment.linearKeys)||segment.linearKeys.some(key=>['particle.count','particle.life','particle'].includes(key))))throw Error('粒子数量和寿命仅支持Step，不能使用Linear出生时序');
    }
    for(const segment of [...track?.segments||[],...scene.timeline?.scenes||[]])for(const f of segment.f||[])if(f>=0&&f<1)cuts.add(f);
    const groups=new Map();for(const f of cuts){const p=parameters(api.modules.frame.create(scene,f*scene.loop).valuesFor(emitter));if(p.count)groups.set(p.count+':'+p.life,p);}
    function candidates(time){
      const out=[];
      for(const [key,p]of groups){const dt=p.life/p.count,start=Math.floor((time-p.life)/dt+1e-9)+1,end=Math.floor(time/dt+1e-9);
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end))throw Error('粒子出生时钟超出安全整数精度，请缩短周期或增大寿命');
        for(let n=start;n<=end;n++){out.push({id:key+':'+n,birthTime:n*dt,life:p.life,count:p.count,ordinal:n,slot:(n%p.count+p.count)%p.count});if(out.length>16384)throw Error('粒子出生批次超过16384候选预算，请减少数量／寿命时序组合');}
      }return out.sort((a,b)=>a.birthTime-b.birthTime||a.id.localeCompare(b.id));
    }
    return Object.freeze({candidates,parameters});
  }
  api.modules.particleBirths=Object.freeze({create,parameters,motion});
})(typeof window!=='undefined'?window:globalThis);
