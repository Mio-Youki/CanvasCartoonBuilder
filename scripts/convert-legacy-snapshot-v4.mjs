#!/usr/bin/env node
/**
 * External-only Legacy snapshot converter.
 *
 * This deliberately accepts JSON data that has already been exported from a
 * trusted Legacy session. It never imports, evaluates or otherwise executes a
 * Legacy .js file. The output is a reviewable v4 candidate plus a conversion
 * report; callers must inspect the report before treating the candidate as a
 * usable project.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { validateVNextScene } from './validate-scene-vnext.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');

function converter() {
  const sandbox={};
  new vm.Script(readFileSync(resolve(root,'editor','legacy-v4-converter.js'),'utf8'),{filename:'legacy-v4-converter.js'}).runInNewContext(sandbox);
  return sandbox.EditorLegacyV4Converter;
}

export function convertLegacySnapshot(snapshot, options={}) {
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw new Error('Legacy 快照必须是 JSON 对象');
  const result=converter().convert(snapshot,{freezes:options.freezes||{}});
  const validation=validateVNextScene(result.document);
  return Object.freeze({
    candidate:result.document,
    report:Object.freeze(Object.assign({},result.report,{candidateValid:validation.valid,validationErrors:validation.errors})),
    saveable:result.saveable&&validation.valid,
  });
}

export function outputNames(inputPath) {
  const stem=basename(inputPath,extname(inputPath))||'legacy-scene';
  return Object.freeze({candidate:`${stem}.v4-candidate.tosampool.json`,report:`${stem}.conversion-report.json`});
}

function main(args) {
  const input=args[0];
  if(!input)throw new Error('用法：node scripts/convert-legacy-snapshot-v4.mjs <legacy-snapshot.json> [输出目录]');
  const inputPath=resolve(input),outputDir=resolve(args[1]||dirname(inputPath)),names=outputNames(inputPath);
  const snapshot=JSON.parse(readFileSync(inputPath,'utf8')),result=convertLegacySnapshot(snapshot);
  writeFileSync(resolve(outputDir,names.candidate),JSON.stringify(result.candidate,null,2)+'\n','utf8');
  writeFileSync(resolve(outputDir,names.report),JSON.stringify(result.report,null,2)+'\n','utf8');
  console.log(`${result.saveable?'✓':'!'} 已生成 ${names.candidate} 与 ${names.report}；${result.saveable?'候选可进入 v4 校验。':'报告仍有未解决迁移项，候选不得当作完成迁移成果。'}`);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2));
