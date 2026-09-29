#!/usr/bin/env node
/** Build the deterministic Agent-facing subset of the controlled v4 Builtin Registry. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
for(const file of ['00-namespace.js','15-builtin-registry.js']){
  const path=resolve(root,'runtime-src','vnext',file);
  new vm.Script(readFileSync(path,'utf8'),{filename:path}).runInNewContext(sandbox);
}
const registry=sandbox.ToSampoolRuntimeVNext?.modules?.builtins;
if(!registry)throw new Error('Builtin Registry v4 contract unavailable');
const manifest={
  format:'tosampool-agent-builtin-manifest',version:1,
  source:'runtime-src/vnext/15-builtin-registry.js',
  rules:[
    '只能使用清单中的 id 与 version；不得输出 program.code、函数体或未注册组件。',
    '内建组件负责高密度可重复绘制，位置、尺寸、对象动态、蒙版、加样和采样仍使用通用对象合同。',
    '参数时序以 timing 声明为准；step 参数不可放入 Linear 段。',
    '若清单构件不能表达用户目标，优先使用图片、矢量图元或提出新增 Registry 构件，不得伪造 id。',
  ],
  builtins:registry.manifest(),
};
const output=resolve(root,'docs','agent','BUILTIN_MANIFEST_V4.json'),rendered=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--check')){
  if(!existsSync(output)||readFileSync(output,'utf8')!==rendered)throw new Error('BUILTIN_MANIFEST_V4.json is stale; run npm run builtin-manifest');
  console.log('Builtin manifest is current');
}else{writeFileSync(output,rendered,'utf8');console.log(`Wrote ${output}`);}
