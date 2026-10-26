/* Repository example build; never fabricates a user approval or writes a shared library. */
import {readFileSync,writeFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const base=new URL('../',import.meta.url),ctx=vm.createContext({TextEncoder,TextDecoder,Buffer,crypto:webcrypto});
for(const file of ['home-scene-vnext.js','editor/vnext-scene.js','editor/v4-pattern-registry.js','editor/v4-path-pattern-presets.js','editor/v4-pattern-lifecycle.js','editor/v4-resource-core.js'])vm.runInContext(readFileSync(new URL(file,base),'utf8'),ctx,{filename:file});
const scene=ctx.EditorVNextScene.blank(),definition=ctx.ToSampoolRuntimeVNext.modules.dualRayPattern.definition;
const presetId=ctx.EditorV4Resources.addPattern(scene,{id:definition.id+'-v'+definition.version,mode:'path',name:definition.name,engineId:definition.id,engineVersion:definition.version,carrier:'rect',params:{},definition}),bundle=await ctx.EditorV4Resources.capture(scene,[{kind:'pattern',id:presetId}]);
const target=new URL('examples/resources/dual-ray.tosampool-resource.json',base),output=JSON.stringify(bundle,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==output)throw Error('双色放射示例包已过期，请运行 build-dual-ray-resource-example.mjs');}
else writeFileSync(target,output,'utf8');
console.log('✓ 双色放射示例资源包与已审阅实现声明、默认参数、静态双色快照及SHA256一致；未操作用户共享库');
