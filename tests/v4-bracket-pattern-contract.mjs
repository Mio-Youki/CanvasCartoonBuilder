import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateVNextScene} from '../scripts/validate-scene-vnext.mjs';
const sandbox={};for(const p of['../home-scene-vnext.js','../editor/vnext-parts-state.js','../editor/v4-pattern-registry.js'])new vm.Script(readFileSync(new URL(p,import.meta.url),'utf8')).runInNewContext(sandbox);
const {customShapes:s,bracketShapes:b,pathExtensions:e,pathGeometry:g}=sandbox.ToSampoolRuntimeVNext.modules,plain=v=>JSON.parse(JSON.stringify(v)),source={type:'rect',x:10,y:20,w:200,h:160,stroke:'#ccc',strokeWidth:12};
const custom={...source,id:'bracket',type:'custom',recipe:{id:'brackets',version:1,params:{}}},base=s.custom(custom);assert.equal(base.paths.length,2);assert.equal(base.settings.shape,'square');
for(const shape of['square','round'])for(const [layout,where,count]of[['full','both',2],['full','left',1],['full','right',1],['corners','all',4],['corners','tl-br',2],['corners','bl-tr',2],['corners','tl',1],['corners','tr',1],['corners','bl',1],['corners','br',1]]){
 const c={shape,layout,[layout==='full'?'side':'corners']:where,armX:60,armY:40},r=b.build(source,null,c);assert.equal(r.paths.length,count);assert.ok(r.paths.every(p=>p.outline.length>=4));
 assert.deepEqual(plain(s.custom({...custom,recipe:{id:'brackets',version:1,params:c}}).paths),plain(r.paths));
 const applied={...source,extensions:{showSource:false,brackets:{...c,enabled:true}}};assert.equal(e.active(applied),true);assert.deepEqual(plain(e.build(applied,g.full(applied)).paths),plain(r.paths));
}
const left=b.build(source,null,{side:'left'}),right=b.build(source,null,{side:'right'}),cx=source.x+source.w/2;
const shifted=b.build(source,null,{side:'left',offsetX:-30,offsetY:25});
assert.equal(s.bounds(shifted).x,s.bounds(left).x+30);assert.equal(s.bounds(shifted).y,s.bounds(left).y-25);
assert.equal(s.contains(shifted,42,105,0),true);assert.equal(left.settings.offsetX,0,'偏移不得污染缓存或原几何');
for(const layout of ['full','corners']){
 const all=b.build(source,null,{layout,corners:'all',offsetX:17,offsetY:23});
 const a=all.paths[0],opposite=all.paths.find(p=>p.index===(layout==='full'?'right':'br'));
 a.points.forEach((point,i)=>{assert.ok(Math.abs(opposite.points[i][0]+point[0]-2*cx)<1e-8);if(layout==='corners')assert.ok(Math.abs(opposite.points[i][1]+point[1]-2*(source.y+source.h/2))<1e-8);});
}
left.paths[0].points.forEach((p,i)=>{assert.ok(Math.abs(right.paths[0].points[i][0]-(2*cx-p[0]))<1e-8);assert.equal(right.paths[0].points[i][1],p[1]);});
assert.equal(s.contains(base,110,100,0),false);assert.equal(s.contains(base,12,80,0),true);assert.equal(b.build(source,null,{enabled:true}),b.build(source,null,{enabled:true}),'缓存预算内的相同输入应立即复用');
assert.equal(b.build({...source,w:400,h:320},null,{}).effective.width,12,'改变框定范围不能隐式加粗');
for(const shape of['square','round'])for(const layout of['full','corners'])for(const [w,h,width,armX,armY]of[[1,1,100,80,80],[100,40,12,0,0],[100,40,12,0,30],[100,40,12,80,0],[100,40,0,30,30],[100,40,80,1000,1000]]){
 const r=b.build({...source,w,h},null,{shape,layout,width,armX,armY});assert.ok(r.paths.every(p=>p.outline.every(v=>v.every(Number.isFinite))));assert.ok(r.points<=b.limits.points);
 const bounds=s.bounds(r);assert.ok(Object.values(bounds).every(Number.isFinite));
}
const limits=b.build(source,null,{layout:'corners',corners:'all',armX:999,armY:999});assert.ok(limits.status);assert.equal(limits.settings.armX,999,'限幅不能改写用户请求值');
assert.ok(b.build(source,null,{layout:'corners',corners:'tl',armX:999,armY:999}).effective.armX>limits.effective.armX);
const scene={format:'tosampool-scene/v4',width:320,height:240,loop:4,entities:[{id:'o',type:'vector',parts:[custom]}]};assert.equal(validateVNextScene(scene).valid,true);assert.equal(sandbox.EditorVNextPartsState.normalizePart(custom,[]).name,'括号／角标');
assert.equal(sandbox.EditorV4PatternRegistry.byId('brackets').category,'hybrid');assert.equal(b.eligible({type:'ellipse'}),true);assert.equal(b.eligible({type:'stroke'}),false);
for(const field of s.definitions.find(d=>d.id==='brackets').params)assert.equal(s.normalizeRecipe({id:'brackets',version:1}).params[field.key],field.default);
for(let i=0;i<100;i++)b.build({...source,w:200+i},null,{shape:'round'});assert.ok(b.stats().entries<=b.limits.entries);assert.ok(b.stats().points<=b.limits.points);
console.log('✓ 括号图样合同：两造型×完整/角标布局／共用几何／镜像／命中／极端输入／保值限幅／缓存／CLI与名称');
