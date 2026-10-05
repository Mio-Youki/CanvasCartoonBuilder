#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDeclaredStaticObject } from './legacy-static-literal.mjs';

export function extractLegacyDefaultSnapshot(source,name='DEFAULT_HOME_SCENE'){
  const result=extractDeclaredStaticObject(source,name);
  if(!result)throw new Error(`未找到 ${name} 的静态对象声明`);
  return result.value;
}

function main(args){
  const [input,output,name]=args;if(!input||!output)throw new Error('用法：node scripts/extract-legacy-default-snapshot.mjs <legacy.js> <snapshot.json> [声明名]');
  const snapshot=extractLegacyDefaultSnapshot(readFileSync(resolve(input),'utf8'),name||'DEFAULT_HOME_SCENE');
  writeFileSync(resolve(output),JSON.stringify(snapshot,null,2)+'\n','utf8');
  console.log(`✓ 已静态提取 ${name||'DEFAULT_HOME_SCENE'} 到 ${output}；未执行 Legacy 脚本`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2));
