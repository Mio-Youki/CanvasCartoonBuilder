import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),copy=v=>JSON.parse(JSON.stringify(v));
export function createReleaseBuilder(){
  const ctx=vm.createContext({TextEncoder,TextDecoder,crypto:webcrypto,Buffer});
  for(const name of ['home-scene-vnext.js','editor/vnext-scene.js','editor/v4-pattern-registry.js','editor/v4-path-pattern-presets.js','editor/v4-pattern-lifecycle.js','editor/v4-resource-core.js'])vm.runInContext(readFileSync(resolve(root,name),'utf8'),ctx,{filename:name});
  return async function build(job,candidate,definition){
    if(!definition)return{status:'blocked',summary:'审阅已接收，但正式生成器尚未接入',reason:candidate.blockedReason||'候选尚无受支持的正式定义，不能以预览脚本代替资源包'};
    const raw=copy(definition);if(!candidate.definition||raw.id!==candidate.definition.id||raw.version<candidate.definition.version)throw Error('交付定义超出候选命名空间');
    raw.name=job.record.review.name;
    for(const p of raw.parameters){p.label=job.record.review.labels[p.key]||p.label;if(job.record.review.defaults&&Object.hasOwn(job.record.review.defaults,p.key))p.default=job.record.review.defaults[p.key];}
    const runtime=ctx.ToSampoolRuntimeVNext.modules,validated=runtime.patternProviders.validate(raw),scene=ctx.EditorVNextScene.blank();
    const attached=validated.definition.format===runtime.patternGenerators.FORMAT;
    const installed=attached?{presetId:ctx.EditorV4Resources.addPattern(scene,{id:raw.id+'-v'+raw.version,mode:'path',name:raw.name,engineId:raw.id,engineVersion:raw.version,carrier:raw.parameters.find(p=>p.key==='carrier')?.default||'rect',params:{},definition:validated.definition})}:ctx.EditorV4PatternLifecycle.install(scene,validated.definition);
    // Exercise real geometry at default and multiple carrier sizes, not just JSON syntax.
    for(const [w,h]of [[160,100],[24,24],[1920,1080]]){const p=ctx.EditorV4Resources.createPatternPart(scene,installed.presetId,{id:'probe',w,h});if(attached){const geometry=runtime.pathGeometry.full(p),config=p.extensions[raw.id],plan=runtime.patternGenerators.generateDefinition(config.definition,{carrierType:p.type,path:geometry.stroke,bounds:geometry.box,params:config.params,time:0,seed:1});if(!plan.layers.length)throw Error('附着图样未生成绘制计划');}else{const geometry=runtime.customShapes.custom(p);if(!geometry.paths.length)throw Error('正式图样未生成有效轮廓');}}
    const bundle=copy(await ctx.EditorV4Resources.capture(scene,[{kind:'pattern',id:installed.presetId}]));
    return{status:'packaged',summary:'正式图样包已生成，等待共享库接收',definition:copy(validated.definition),bundle,
      name:raw.name,parameters:copy(validated.definition.parameters),verification:['definition-contract','real-default-geometry','three-carrier-sizes','resource-closure-sha256'],
      limitations:['未自动进行独立视觉评分','本批仅交付受支持的声明式图样，不执行任意候选JS']};
  };
}
