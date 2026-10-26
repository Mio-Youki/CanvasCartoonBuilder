import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({console});
vm.runInContext(readFileSync(new URL('../home-scene-vnext.js',import.meta.url),'utf8'),context);
const api=context.ToSampoolRuntimeVNext.modules.patternGenerators;
const manifest={format:api.FORMAT,id:'test.paint',version:1,name:'绘制合同夹具',implementation:'fixture-v1',carriers:['rect','ellipse','poly'],output:'carrier-clipped-paint',dependencies:[],budget:{layers:2,commands:16},
  parameters:[{key:'ink',label:'颜色',type:'color',default:'#abcdef',timing:'Linear'},{key:'alpha',label:'透明度',type:'number',default:1,min:0,max:1,timing:'Linear'},{key:'motion',label:'动态',type:'boolean',default:true,timing:'Step'},{key:'angle',label:'角度',type:'number',default:0,min:-360,max:360,timing:'Linear',interpolation:'angle-direct',when:'motion'}],
  controls:[{component:'color-alpha',key:'ink',alphaKey:'alpha'},{component:'field',key:'motion'},{component:'field',key:'angle'}]};
const clone=v=>JSON.parse(JSON.stringify(v)),change=fn=>{const m=clone(manifest);fn(m);return m;};
assert.throws(()=>api.register(manifest,()=>{}),/宿主/);
assert.throws(()=>api.validate(change(m=>m.dependencies.push('external.js'))),/无依赖/);
assert.throws(()=>api.validate(change(m=>m.controls.push({component:'field',key:'alpha'}))),/重复/);
assert.throws(()=>api.validate(change(m=>m.parameters[2].timing='Linear')),/Linear/);
assert.throws(()=>api.validate(change(m=>m.parameters[3].when='unknown')),/开关/);
assert.throws(()=>api.validate(change(m=>m.parameters.push({key:'kind',label:'类型',type:'select',options:['a'],default:'b',timing:'Step'}))),/选项/);
let seen;
const implementation=input=>{seen=input;return{layers:[{color:input.params.ink,alpha:input.params.alpha,commands:[['M',0,0],['L',10,0],['A',5,5,5,0,Math.PI],['Z']]}]};};
api.register(manifest,implementation,{trust:'repository-reviewed'});
manifest.name='不会污染登记值';assert.equal(api.definition('test.paint',1).name,'绘制合同夹具');
assert.throws(()=>api.register(manifest,implementation,{trust:'repository-reviewed'}),/重复/);
const input={carrierType:'poly',path:[[0,0],[10,0],[5,10]],bounds:{x:0,y:0,w:10,h:10},time:1.25,seed:42,params:{alpha:.5,angle:999}};
const plan=api.generate('test.paint',1,input);
assert.equal(seen.time,1.25);assert.equal(seen.seed,42);assert.equal(seen.params.angle,360);assert.equal(seen.path.length,3);
assert.ok(Object.isFrozen(seen.path[0]));assert.ok(Object.isFrozen(plan.layers[0].commands[0]));
input.path[0][0]=9;assert.equal(plan.path[0][0],0);
const again=api.generate('test.paint',1,{...input,path:[[0,0],[10,0],[5,10]]});assert.deepEqual(clone(again),clone(plan));
assert.throws(()=>api.generate('test.paint',1,{...input,time:Infinity}),/有限数/);
assert.throws(()=>api.generate('test.paint',1,{...input,carrierType:'stroke'}),/封闭载体/);
assert.throws(()=>api.generate('test.paint',1,{...input,path:[[99,0],[10,0],[5,10]]}),/超出范围/);
const calls=[],ctx={globalAlpha:.4,save(){calls.push('save');},restore(){calls.push('restore');},beginPath(){},moveTo(){},lineTo(){},arc(){},closePath(){},clip(){calls.push('clip');},fill(){calls.push(['fill',this.globalAlpha,this.fillStyle]);}};
api.paint(ctx,plan);assert.deepEqual(calls,['save','clip',['fill',.2,'#abcdef'],'restore']);
assert.throws(()=>api.paint(ctx,clone(plan)),/未验证/);
const broken={...ctx,fill(){throw Error('canvas failed');}};assert.throws(()=>api.paint(broken,plan),/canvas failed/);assert.equal(calls.at(-1),'restore');
for(const [suffix,result,error]of [
  ['layers',{layers:Array(3).fill({})},/层数/],
  ['commands',{layers:[{color:'#abcdef',alpha:1,commands:[['M',0,0],...Array(16).fill(['Z'])]}]},/指令超出/],
  ['radius',{layers:[{color:'#abcdef',alpha:1,commands:[['M',0,0],['A',0,0,-1,0,1]]}]},/半径/],
  ['alpha',{layers:[{color:'#abcdef',alpha:2,commands:[['M',0,0]]}]},/绘制层/],
  ['code',{layers:[],code:'alert(1)'},/未支持字段/]
]){api.register({...manifest,id:'test.'+suffix},()=>result,{trust:'repository-reviewed'});assert.throws(()=>api.generate('test.'+suffix,1,{...input,path:[[0,0],[10,0],[5,10]]}),error);}
console.log('✓ 生成器合同：明确时序／组合颜色绑定／可信登记／真实载体／冻结输入／确定计划／命令预算／裁切／Alpha乘算／异常恢复；实际面板另见双色放射验收');
