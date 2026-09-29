#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
for(const file of ['00-namespace.js','15-builtin-registry.js'])new vm.Script(readFileSync(resolve(root,'runtime-src','vnext',file),'utf8'),{filename:file}).runInNewContext(sandbox);
const registry=sandbox.ToSampoolRuntimeVNext.modules.builtins;
assert.deepEqual(Array.from(registry.definitions,value=>value.id),['pixel-star','pixel-cloud','train-beam']);
assert.equal(registry.manifest().some(value=>value.id==='train-beam'&&value.version===1),true,'Legacy 中已登记的 train-beam 名称必须稳定进入受控清单');
assert.throws(()=>registry.normalize({id:'arbitrary-code',version:1}),/未注册/);
assert.throws(()=>registry.normalize({id:'pixel-star',version:2}),/不支持版本/);
const normalized=registry.normalize({id:'pixel-star',params:{rays:99,innerRadius:-1,color:'invalid'}});
assert.equal(normalized.params.rays,12);assert.equal(normalized.params.innerRadius,.05);assert.equal(normalized.params.color,'#fff2a8');
const calls=[],ctx={save(){calls.push('save');},restore(){calls.push('restore');},scale(x,y){calls.push(['scale',x,y]);},beginPath(){calls.push('begin');},moveTo(x,y){calls.push(['move',x,y]);},lineTo(x,y){calls.push(['line',x,y]);},closePath(){calls.push('close');},fill(){calls.push(['fill',this.fillStyle]);},fillRect(x,y,w,h){calls.push(['rect',x,y,w,h,this.fillStyle]);},arc(x,y,r,a,b){calls.push(['arc',x,y,r,a,b]);},set globalAlpha(value){calls.push(['alpha',value]);},get globalAlpha(){return 1;},fillStyle:'#000000'};
const entity={type:'builtin',builtin:{id:'pixel-star',version:1,params:{twinkle:.2}}},values={w:20,h:20,builtin:{id:'pixel-star',version:1,params:{twinkle:.2}}};
registry.render(ctx,entity,values,{time:.4});const first=JSON.stringify(calls);calls.length=0;registry.render(ctx,entity,values,{time:.4});assert.equal(JSON.stringify(calls),first,'相同 fixed time 必须得到完全相同的绘制调用');
assert.equal(registry.timeDependent(entity),true);assert.equal(registry.timeDependent({type:'builtin',builtin:{id:'pixel-cloud'}}),false);
console.log('✓ Builtin Registry v4：白名单、版本、参数归一化、固定时间确定性与时间依赖合同通过');
