import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});
for(const f of ['home-scene-vnext.js','editor/classic-v4-formation-parameters.js'])vm.runInContext(readFileSync(new URL('../'+f,import.meta.url),'utf8'),c);
const api=c.ToSampoolRuntimeVNext,frame=api.modules.frame,policy=c.EditorClassicV4FormationParameters,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const mode of ['linear','smooth','ease-in','ease-out']){
 near(frame.curve(0,mode),0);near(frame.curve(1,mode),0);
 for(let i=1;i<1000;i++)assert.ok(Math.abs(frame.curve(i/1000,mode)-frame.curve((i-1)/1000,mode))<.02,'往返不得在半周期跳变');
 near(frame.travel({curve:mode},2,2),1);assert.ok(frame.travel({curve:mode},.5,2)>0);
}
const motions=Object.values(policy.motions).flatMap(g=>g.motions);
for(const m of motions){assert.ok(m.params.some(p=>p.key==='stepped'));assert.ok(m.params.some(p=>p.key==='periodFrames'));assert.ok(m.params.every(p=>p.timing==='Step'));}
assert.equal(policy.motionVisible(motions.find(m=>m.id==='scroll'),{key:'stepped'},{repeat:false,span:100,speed:20}),false);
for(const id of ['bob','pulse','wave','blink','scroll','spin']){
 const spec={amount:id==='pulse'?.25:id==='blink'?.5:5,period:2,speed:id==='spin'?180:20,span:40,angle:0,curve:id==='spin'||id==='scroll'?'linear':'smooth',stepped:true,periodFrames:4};
 const entity={id:'a',type:'rect',x:20,y:20,w:12,h:12,rot:0,scaleX:1,scaleY:1,alpha:1,anim:{[id]:spec}},scene={entities:[entity],width:100,height:100,loop:8,timeline:{tracks:{}}};
 const a=frame.create(scene,.1).valuesFor(entity),b=frame.create(scene,.3).valuesFor(entity),d=frame.create(scene,.6).valuesFor(entity);
 const key={bob:'x',pulse:'scaleX',wave:'rot',blink:'alpha',scroll:'x',spin:'rot'}[id];near(a[key],b[key]);assert.notEqual(a[key],d[key],id+' must update at next held frame');
 const part=api.modules.content.partMotion(entity,.6);near(part[key],d[key]);
 if(id==='spin'||id==='scroll'){spec.speed=-spec.speed;const negative=frame.create(scene,.6).valuesFor(entity);assert.ok(Number.isFinite(negative[key]));}
}
const params=[{key:'amount',type:'number',timing:'linear-safe',default:1},{key:'mode',type:'number',timing:'step',default:2},{key:'fixed',type:'number',timing:'none',default:3}],manifest={format:'tosampool-scene-module/v1',id:'motion-contract',version:1,parameters:params};
api.modules.sceneModules.register({manifest,render(){}});
const entity={id:'p',type:'procedural',moduleId:manifest.id,moduleVersion:1,params:{amount:1,mode:2,fixed:3}},track={segments:[{f:[0,1/3],values:{}},{f:[1/3,2/3],type:'linear'},{f:[2/3,1],values:{'params.amount':9,'params.mode':8,'params.fixed':99}}]},scene={timeline:{tracks:{p:track}}};
const mid=api.modules.timeline.valuesFor(scene,'p',entity,.5);near(mid.params.amount,5);assert.equal(mid.params.mode,2);assert.equal(mid.params.fixed,3);
const end=api.modules.timeline.valuesFor(scene,'p',entity,.9);assert.equal(end.params.mode,8);assert.equal(end.params.fixed,3);
assert.equal(api.modules.parameterTiming.forEntity(entity,track,scene),api.modules.parameterTiming.forEntity(entity,track,scene),'缓存不逐帧重建');
assert.equal(policy.parameter({parameter:params[0]},'params.amount').timing,'Linear');
console.log('✓ basic motion/program contract: continuous crossings, shared object/part rhythm, quantized cycles, signed travel, program No/Step/Linear and cached policy');
