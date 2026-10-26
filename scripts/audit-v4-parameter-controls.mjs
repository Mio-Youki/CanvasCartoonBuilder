/* Read-only, generated inventory. Does not maintain a second parameter table. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),context=vm.createContext({});
for(const file of ['home-scene-vnext.js','editor/effect-registry-vnext.js','editor/v4-parameter-controls.js','editor/classic-v4-effect-parameter-timing.js','editor/classic-v4-formation-parameters.js'])vm.runInContext(readFileSync(resolve(root,file),'utf8'),context);
const registry=context.EditorEffectRegistryVNext,policy=context.EditorClassicV4EffectParameterTiming;
const fields=policy.coverage(registry).map(row=>({effect:row.effectId,path:row.path,type:row.param.type,timing:row.timing,control:row.control,status:row.control==='internal'?'derived-internal':row.effectId==='uneven-sampling'&&row.path==='field.enabled'?'fixed-internal':'connected'}));
for(const def of registry.controllers)for(const p of def.params){const b=policy.binding(def,p.key);fields.push({effect:def.id,path:p.key,type:p.type,timing:b.timing,control:'controller',status:'connected'});}
const motionFields=policy.motionCoverage(registry).map(row=>({effect:row.effectId,motion:row.motionId,path:row.path,type:row.param.type,timing:row.timing,status:row.path==='motion.type'&&registry.effectById[row.effectId].motion.length===1?'managed-internal':'connected'}));
const formationFields=Object.entries(context.EditorClassicV4FormationParameters.groups).flatMap(([domain,params])=>params.map(p=>({domain,path:p.key,type:p.type,timing:p.timing,status:p.timing==='No'?'base-only':'connected'})));
const formationMotionFields=Object.values(context.EditorClassicV4FormationParameters.motions).flatMap(group=>group.motions.flatMap(m=>m.params.map(p=>({motion:m.id,path:'anim.'+m.id+'.'+p.key,timing:p.timing,status:'connected'}))));
const programFields=context.ToSampoolRuntimeVNext.modules.builtins.definitions.flatMap(d=>d.params.map(p=>({builtin:d.id,path:'builtin.params.'+p.key,timing:context.ToSampoolRuntimeVNext.modules.parameterTiming.capability(p).timing,status:'connected'})));
const remainingDomains=[{domain:'text-style',reason:'字体/文本内容/排版为基础值和资源操作，未借此增加时序'},{domain:'particle',reason:'发射与运动数据需要领域适配'},{domain:'mask',reason:'蒙版更新需独立统一组件及引用协议'}];
const report={scope:'Effects, controllers, formation, basic motion and declared builtin/Module parameters; not entire Inspector',totalFields:fields.length,connected:fields.filter(row=>row.status==='connected').length,fields,motionFields,formationFields,formationMotionFields,programFields,modulePolicy:'Loaded Manifest parameters use declared No/Step/Linear; missing timing means No; internal/appliesTo filtering retained',pending:[],remainingDomains};
if(process.argv.includes('--summary'))console.log('参数接入审计：'+fields.length+'效果/controller字段，'+report.connected+'已接通；'+motionFields.length+'效果动态绑定；'+formationFields.length+'成样字段（'+formationFields.filter(p=>p.timing==='No').length+'项基础值边界）。剩余领域另列remainingDomains。');
else console.log(JSON.stringify(report,null,process.argv.includes('--json')?2:0));
