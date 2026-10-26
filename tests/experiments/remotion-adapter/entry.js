import {Internals} from 'remotion';
import {brightness} from '@remotion/effects/brightness';
import {blur} from '@remotion/effects/blur';
import {wave} from '@remotion/effects/wave';

const factories={brightness,blur,wave};
const defaults={brightness:{amount:.2},blur:{radius:4,horizontal:true,vertical:true},wave:{amplitude:10,wavelength:100,phase:.7,direction:'horizontal'}};
const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
function descriptors(specs){return specs.map(({id,params,disabled})=>{if(!factories[id])throw Error('Unknown experimental effect');return factories[id]({...defaults[id],...params,disabled:!!disabled});});}
function source(w=640,h=360){
  const target=canvas(w,h),rt=window.ToSampoolRuntimeVNext;
  const scene={format:'tosampool-scene/v4',width:w,height:h,loop:4,background:{alpha:0},entities:[
    {id:'paper',type:'rect',x:w*.1,y:h*.12,w:w*.8,h:h*.76,fill:'#7e94ac',fillAlpha:.45},
    {id:'red',type:'rect',x:w*.14,y:h*.18,w:w*.28,h:h*.55,fill:'#ef554e'},
    {id:'sun',type:'ellipse',x:w*.4,y:h*.2,w:w*.3,h:h*.56,fill:'#ffe15c',alpha:.65},
    {id:'blue',type:'rect',x:w*.7,y:h*.55,w:w*.15,h:h*.24,fill:'#215abb'},
    {id:'mark',type:'rect',x:w*.15,y:h*.2,w:w*.06,h:h*.09,fill:'#ffffff'}]};
  const player=rt.createRuntime(scene);try{player.renderTo(target,.2);}finally{player.dispose();}return target;
}
function createSession(w,h,mode='official'){
  const state=mode==='official'?Internals.createEffectChainState(w,h):null,stages=new Map();let disposed=false;
  const counts={setups:0,applies:0,cleanups:0};
  return {
    async render(input,specs,output=canvas(w,h)){
      if(disposed)throw Error('Session disposed');const effects=descriptors(specs);
      if(mode==='official'){
        const ok=await Internals.runEffectChain({state,source:input,effects,output,width:w,height:h});if(!ok)throw Error('Effect run superseded');return output;
      }
      let current=input;
      for(const [index,effect]of effects.entries()){
        if(effect.params.disabled)continue;
        const key=index+':'+effect.definition.type;
        let stage=stages.get(key);
        if(!stage){const target=canvas(w,h);stage={target,definition:effect.definition,state:effect.definition.setup(target)};stages.set(key,stage);counts.setups++;}
        effect.definition.apply({source:current,target:stage.target,state:stage.state,params:effect.params,width:w,height:h,gpuDevice:null,flipSourceY:effect.definition.backend==='webgl2'});counts.applies++;current=stage.target;
      }
      const ctx=output.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(current,0,0);return output;
    },
    dispose(){if(disposed)return;disposed=true;if(state)Internals.cleanupEffectChainState(state);for(const stage of stages.values()){stage.definition.cleanup(stage.state);counts.cleanups++;}stages.clear();},
    counts
  };
}
function schema(id){const d=descriptors([{id}])[0];return {backend:d.definition.backend,type:d.definition.type,schema:d.definition.schema};}
window.RemotionTrial={source,createSession,descriptors,schema,canvas,defaults};

// Fixture-only UI: fields come from the official schemas, not product Inspector.
if(document.querySelector('#controls')){
  const input=source(),output=document.querySelector('#output'),original=document.querySelector('#source');original.getContext('2d').drawImage(input,0,0);
  const specs=Object.keys(factories).map(id=>({id,params:{...defaults[id]},disabled:false}));let session=createSession(640,360),pending=false,dirty=false;
  async function update(){dirty=true;if(pending)return;pending=true;try{while(dirty){dirty=false;await session.render(input,specs,output);}document.querySelector('#status').textContent='官方效果链 · '+specs.filter(v=>!v.disabled).map(v=>schema(v.id).backend).join(' → ');}catch(error){document.querySelector('#status').textContent=String(error);}finally{pending=false;}}
  for(const spec of specs){const card=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=spec.id+' · '+schema(spec.id).backend;card.append(legend);
    for(const [key,field]of Object.entries(schema(spec.id).schema)){const row=document.createElement('label');row.append(document.createTextNode(field.description||key));let control;
      if(field.type==='enum'){control=document.createElement('select');for(const v of Object.keys(field.variants))control.add(new Option(v,v));}
      else{control=document.createElement('input');control.type=field.type==='boolean'?'checkbox':'number';if(field.min!=null)control.min=field.min;if(field.max!=null)control.max=field.max;control.step=field.step||'.1';}
      const value=key==='disabled'?spec.disabled:spec.params[key]??field.default;
      if(control.type==='checkbox')control.checked=!!value;else control.value=value;
      control.dataset.field=spec.id+'.'+key;control.addEventListener('input',()=>{const value=control.type==='checkbox'?control.checked:field.type==='number'?Number(control.value):control.value;if(key==='disabled')spec.disabled=value;else spec.params[key]=value;update();});row.append(control);card.append(row);
    }document.querySelector('#controls').append(card);
  }
  window.addEventListener('pagehide',()=>session.dispose(),{once:true});update();
}
