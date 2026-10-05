#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractLegacyDefaultSnapshot } from '../scripts/extract-legacy-default-snapshot.mjs';
import { convertLegacySnapshot } from '../scripts/convert-legacy-snapshot-v4.mjs';

const root=resolve(import.meta.dirname,'..');
const snapshot=extractLegacyDefaultSnapshot(readFileSync(resolve(root,'home-scene.js'),'utf8'));
assert.equal(snapshot.w,320);assert.equal(snapshot.h,118);assert.equal(snapshot.loop,48);assert.equal(snapshot.train.id,'home-train');
const converted=convertLegacySnapshot(snapshot);
assert.equal(converted.report.candidateValid,true);
assert.equal(converted.report.summary.converted,2);assert.equal(converted.report.summary.builtin,0);assert.equal(converted.report.summary['native-mappable'],11);assert.equal(converted.report.summary.hybrid,0);assert.equal(converted.report.summary['module-required'],0);assert.equal(converted.report.summary.frozen,0);assert.equal(converted.report.summary.manual,0);assert.equal(converted.report.summary.blocked,0);
assert.equal(Array.from(converted.candidate.entities,item=>item.id).sort().join(','),'home-moon,home-signal,home-train');
const moonTrack=converted.candidate.timeline.tracks['home-moon'];assert.equal(moonTrack.segments[0].values.x,244);assert.equal(moonTrack.segments[3].values.x,59);assert.equal(moonTrack.segments[2].values.y,14);
assert.equal(converted.saveable,false,'首页仍需要 home-scene 原生语义适配器；不得把未展开的 tile/scroll 图层误报为完成迁移');
console.log('✓ home-scene 外部静态审计：安全提取、原生可映射分流、坐标轨道归一化与候选结构通过');
