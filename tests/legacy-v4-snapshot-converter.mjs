#!/usr/bin/env node
import assert from 'node:assert/strict';
import { convertLegacySnapshot, outputNames } from '../scripts/convert-legacy-snapshot-v4.mjs';

const clean=convertLegacySnapshot({w:32,h:16,loop:2,bg:'#000000',images:[{id:'photo',src:'assets/photo.png',x:0,y:0,w:32,h:16}]});
assert.equal(clean.saveable,true);assert.equal(clean.report.candidateValid,true);assert.equal(clean.candidate.entities[0].type,'image');
const requiresModule=convertLegacySnapshot({w:32,h:16,loop:2,programLayer:{id:'program-layer',program:{code:'ctx.fillRect(0,0,1,1)'}}});
assert.equal(requiresModule.saveable,false);assert.equal(requiresModule.report.summary['module-required'],1);assert.equal(requiresModule.report.summary.blocked,0);assert.deepEqual(outputNames('C:/input/home.snapshot.json'),{candidate:'home.snapshot.v4-candidate.tosampool.json',report:'home.snapshot.conversion-report.json'});
console.log('✓ Legacy 快照外部转换：只处理 JSON、输出候选与分级迁移报告通过');
