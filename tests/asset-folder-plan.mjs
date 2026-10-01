#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url), root=resolve(import.meta.dirname,'..'), planner=require(resolve(root,'editor/asset-folder-plan.js'));
const record=(path,text,type)=>({path,text,type:type||(/\.json$/i.test(path)?'application/json':'image/svg+xml')});
const project=planner.plan([
  record('assets/lantern/asset.json',JSON.stringify({format:'tosampool-asset/v1',id:'lantern-red',name:'红灯笼',kind:'image',source:'lantern.svg',recipe:{width:8,height:8}})),
  record('assets/lantern/lantern.svg','<svg/>'),
  record('assets/leaf-loop/asset.json',JSON.stringify({format:'tosampool-asset/v1',id:'leaf-loop',name:'叶循环',kind:'sequence',frames:['frames/000.svg','frames/001.svg','frames/002.svg'],fps:2,recipe:{width:6,height:6}})),
  record('assets/leaf-loop/frames/000.svg','<svg/>'),record('assets/leaf-loop/frames/001.svg','<svg/>'),record('assets/leaf-loop/frames/002.svg','<svg/>'),
]);
assert.equal(project.project.length,2);assert.equal(project.project.find(asset=>asset.id==='lantern-red').kind,'image');assert.equal(project.project.find(asset=>asset.id==='leaf-loop').frames.length,3);assert.equal(project.loose.length,0);assert.equal(project.invalid.length,0);
const loose=planner.plan([record('cloud.svg','<svg/>')]);
assert.equal(loose.project.length,0);assert.equal(loose.loose.length,1);
console.log('✓ Asset Folder Plan：项目自包含素材、sequence、recipe 与普通文件夹识别通过');
