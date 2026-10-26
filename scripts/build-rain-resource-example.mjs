// Deterministic generated resource packaging; --check never writes.
import {readFileSync,writeFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const base=new URL('../',import.meta.url),ctx={TextEncoder,TextDecoder,Buffer,crypto:webcrypto};
for(const file of ['home-scene-vnext.js','editor/vnext-scene.js','editor/v4-resource-core.js','editor/vnext-project-package.js'])new vm.Script(readFileSync(new URL(file,base),'utf8')).runInNewContext(ctx);
const source=readFileSync(new URL('examples/resources/rain-curtain.scene-module.js',base),'utf8');
// Only execute this repository-owned fixture to derive its exact Manifest.
new vm.Script(source).runInNewContext(ctx);
const manifest=ctx.ToSampoolRuntimeVNext.modules.sceneModules.definition('example.rain-curtain',1).manifest;
const scene=ctx.EditorVNextScene.blank();scene.modules={[manifest.id]:{manifest,locator:'data:text/javascript;charset=utf-8,'+encodeURIComponent(source)}};
const bundle=await ctx.EditorV4Resources.capture(scene,[{kind:'module',id:manifest.id}]);
const target=new URL('examples/resources/rain-curtain.tosampool-resource.json',base),output=JSON.stringify(bundle,null,2)+'\n';
if(process.argv.includes('--check')){
  if(readFileSync(target,'utf8')!==output)throw Error('雨幕资源示例已过期，请运行 build-rain-resource-example.mjs');
}else writeFileSync(target,output,'utf8');
console.log('✓ 雨幕资源示例与源码、Manifest、SHA256一致');
