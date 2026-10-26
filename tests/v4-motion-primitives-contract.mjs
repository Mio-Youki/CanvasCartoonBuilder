import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});vm.runInContext(readFileSync(new URL('../home-scene-vnext.js',import.meta.url),'utf8'),c);
const m=c.ToSampoolRuntimeVNext.modules.motion,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const curve of ['linear','smooth','ease-in','ease-out'])for(const periodFrames of [1,2,3,4,8]){
 const spec={period:2,stepped:true,periodFrames,curve},samples=Array.from({length:periodFrames},(_,i)=>m.oscillate(spec,i*2/periodFrames));
 near(samples[0],-1);near(m.oscillate(spec,2),-1);near(m.oscillate(spec,.01),samples[0]);
 if(periodFrames===1)near(m.oscillate(spec,1),-1);
 else assert.ok(Math.max(...samples)-Math.min(...samples)>.5,'低帧往返不得退化静止');
 if(periodFrames===2){near(samples[0],-1);near(samples[1],1);}
 for(const t of [-1.8,.1,.9,1.5])near(m.oscillate(spec,t),m.oscillate(spec,t+2));
 near(m.oscillate({...spec,stepped:false},0),0);
}
near(m.progress({period:2,stepped:true,periodFrames:2},0),0);near(m.progress({period:2,stepped:true,periodFrames:2},1),.5);near(m.progress({period:2},2),0);near(m.advance({period:2},2),1);
const random={period:2,steps:3};assert.equal(m.refresh(random,.1),m.refresh(random,2.1));assert.notEqual(m.refresh(random,.1,{loop:false}),m.refresh(random,2.1,{loop:false}));
assert.equal(m.clock({period:2,steps:2},1,{stepped:true}).phase,.5,'旧字段steps只作为适配别名');
const frame=c.ToSampoolRuntimeVNext.modules.frame,entity={id:'a',type:'rect',x:10,y:10,w:10,h:10,anim:{bob:{period:2,amount:4,angle:0,curve:'linear',stepped:true,periodFrames:2}}},scene={width:64,height:64,loop:4,entities:[entity]};
assert.equal(frame.create(scene,0).valuesFor(entity).x,6);assert.equal(frame.create(scene,1).valuesFor(entity).x,14);
assert.equal(c.ToSampoolRuntimeVNext.modules.content.partMotion(entity,0).x,6);assert.equal(c.ToSampoolRuntimeVNext.modules.content.partMotion(entity,1).x,14);
const modules=c.ToSampoolRuntimeVNext.modules,current=modules.dualRayPattern.definition,legacy=modules.dualRayPattern.legacyDefinition;
assert.equal(current.version,2);assert.equal(legacy.version,1);assert.equal(legacy.parameters.some(p=>p.key==='stepped'),false);
assert.equal(modules.pathGenerators.definitions().filter(d=>d.id===current.id).length,1,'目录不能因旧版本登记出现重复卡片');assert.equal(modules.pathGenerators.definition(current.id).version,2);
for(const d of [legacy,current]){const part={id:'compat',type:'custom',x:0,y:0,w:80,h:50,recipe:{id:d.id,version:d.version,definition:d,params:{}}};assert.ok(modules.customShapes.custom(part,.25).paintPlan,'旧项目和新版声明均须通过严格读取');}
console.log('✓ motion primitives: extrema-anchored 1/2/3-frame sampling, all rhythms, negative time, cycle closure, advance vs wrapped progress, deterministic refresh and real object/part evaluation');
