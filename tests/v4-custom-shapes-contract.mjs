import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateVNextScene} from '../scripts/validate-scene-vnext.mjs';
const sandbox={};for(const path of['../home-scene-vnext.js','../editor/vnext-parts-state.js','../editor/v4-pattern-registry.js'])new vm.Script(readFileSync(new URL(path,import.meta.url),'utf8')).runInNewContext(sandbox);
const runtime=sandbox.ToSampoolRuntimeVNext,{customShapes:shapes,pathExtensions:extensions,pathGeometry:geometry,pathStroke:stroke}=runtime.modules,plain=v=>JSON.parse(JSON.stringify(v));
const source={type:'rect',x:10,y:20,w:160,h:100,radius:20,stroke:'#ffd23f',strokeWidth:4},config={enabled:true,size:24,length:36,inset:0,direction:'out',radius:2};
const result=shapes.build(source,null,config);assert.equal(result.status,'');assert.equal(result.vertices.length,4);assert.equal(result.paths.length,8);assert.ok(result.paths[0].outline.length>6);
assert.equal(shapes.build(source,null,config),result,'同一几何与参数应复用缓存');
for(const sides of[3,5,6])assert.equal(shapes.build({...source,type:'poly',polygonMode:'regular',sides},null,config).paths.length,sides*2);
const concave={...source,type:'poly',points:[[0,0],[1,0],[.4,.4],[1,1],[0,1]]};assert.equal(shapes.build(concave,null,config).paths.length,10);assert.equal(shapes.build(concave,null,config).status,'');
assert.ok(shapes.build({...source,type:'poly',points:[[0,0],[1,1],[0,1],[1,0]]},null,config).status);assert.ok(shapes.build({...source,type:'poly',points:Array.from({length:257},(_,i)=>[i,0])},null,config).status);
assert.equal(shapes.eligible({type:'ellipse'}),false);const original=JSON.stringify(source),applied={...source,extensions:{'corner-arrows':config}};assert.equal(extensions.build(applied,geometry.full(applied)).paths.length,8);assert.equal(JSON.stringify(source),original);
const custom=sandbox.EditorV4PatternRegistry.createPart({...source,fill:'#ff0000'},'corner-arrows');custom.recipe.params=config;
assert.equal(custom.type,'custom');assert.equal(custom.recipe.version,1);assert.equal(custom.fill,null);
const a=shapes.build(source,null,{...config,width:4}),b=shapes.custom(custom);assert.deepEqual(plain(a.paths),plain(b.paths),'独立与依附应共用同一几何生成器');
const boxed=stroke.bounds({...custom,recipe:{...custom.recipe,params:{...config,inset:-20}}});assert.ok(boxed.x<source.x&&boxed.y<source.y);assert.ok(shapes.contains(b,10,20,0));assert.equal(shapes.contains(b,90,70,0),false,'空心图样中部不能按整矩形拾取');
assert.throws(()=>shapes.normalizeRecipe({id:'missing',version:1}),/不支持/);assert.throws(()=>shapes.normalizeRecipe({id:'corner-arrows',version:2}),/不支持/);
const scene={format:'tosampool-scene/v4',width:320,height:180,loop:4,entities:[{id:'v',type:'vector',w:160,h:100,parts:[{...custom,id:'a'}]}]},normalized=runtime.modules.scene.normalize(scene);assert.equal(normalized.entities[0].parts[0].type,'custom');assert.equal(normalized.entities[0].parts[0].recipe.id,'corner-arrows');
assert.equal(sandbox.EditorVNextPartsState.normalizePart(custom,[]).type,'custom');assert.throws(()=>runtime.modules.scene.normalize({...scene,entities:[{...scene.entities[0],parts:[{...custom,recipe:{id:'evil',version:1}}]}]}),/不支持/);
assert.equal(validateVNextScene(scene).valid,true);assert.equal(validateVNextScene({...scene,entities:[{...scene.entities[0],parts:[{...custom,recipe:{id:'evil',version:1}}]}]}).valid,false);
assert.throws(()=>shapes.normalizeRecipe({id:'corner-arrows',version:1,params:[]}),/params/);
assert.equal(shapes.normalize({}, {strokeWidth:0}).width,3,'仅填充图元应用时不能继承零线宽而失效');
for(const field of shapes.definitions[0].params)assert.equal(shapes.normalizeRecipe({id:'corner-arrows',version:1}).params[field.key],field.default,'声明默认值必须与Runtime一致');
const sharp=shapes.build(source,null,{...config,radius:0,width:8,shaftCap:'point'});
assert.equal(sharp.paths[0].outline.length,6,'圆角0保留尖锐的箭翼轮廓');
assert.equal(sharp.paths[1].outline.length,5,'尖头为三角尾端，不是圆头');
const fixed=shapes.build(source,null,{...config,radius:0,shaftMode:'fixed',shaftAngle:30});
const shafts=fixed.paths.filter((_,i)=>i%2),vectors=shafts.map(({points:[a,b]})=>[b[0]-a[0],b[1]-a[1]]);
for(const [x,y]of vectors){assert.ok(Math.abs(Math.atan2(Math.abs(y),Math.abs(x))-Math.PI/6)<1e-9,'固定倾角相同而非绝对方向相同');assert.ok(Math.abs(Math.hypot(x,y)-config.length)<1e-9);}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7);
near(vectors[0][0],-vectors[1][0]);near(vectors[0][1],vectors[1][1]);near(vectors[0][0],vectors[3][0]);near(vectors[0][1],-vectors[3][1]);
const inward=shapes.build(source,null,{...config,radius:0,shaftMode:'fixed',shaftAngle:30,direction:'in'}).paths.filter((_,i)=>i%2);
inward.forEach(({points:[a,b]},i)=>{near(b[0]-a[0],-vectors[i][0]);near(b[1]-a[1],-vectors[i][1]);});
for(const angle of[0,30,45,90]){
 const triangle=shapes.build({...source,type:'poly',polygonMode:'regular',sides:3},null,{...config,shaftMode:'fixed',shaftAngle:angle});
 const [a,b]=triangle.paths[1].points;near(a[0],b[0]);near(Math.hypot(b[0]-a[0],b[1]-a[1]),config.length);
}
for(const shaftCap of['butt','round','point']){const r=shapes.build(source,null,{...config,radius:0,shaftCap});assert.equal(r.paths[1].points[1][0],sharp.paths[1].points[1][0],'切换端头不改变总长度');}
const many=shapes.build({...source,type:'poly',polygonMode:'free',points:Array.from({length:256},(_,i)=>[.5+Math.cos(i/256*Math.PI*2)*.5,.5+Math.sin(i/256*Math.PI*2)*.5])},null,{...config,radius:100,shaftCap:'round'});assert.ok(many.points<=shapes.limits.points,'单个复杂图样也必须满足预算');
for(let i=0;i<80;i++)shapes.build({...source,w:160+i},null,config);assert.ok(shapes.stats().entries<=shapes.limits.entries);assert.ok(shapes.stats().points<=shapes.limits.points);
console.log('✓ G3自定义合同：配方版本／共同生成器／语义角点／凹多边形／自交拒绝／边界命中／归一化／缓存预算通过');
