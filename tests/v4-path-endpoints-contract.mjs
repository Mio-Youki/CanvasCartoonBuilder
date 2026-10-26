import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const sandbox={};new vm.Script(readFileSync(new URL('../home-scene-vnext.js',import.meta.url),'utf8')).runInNewContext(sandbox);
const {pathEndpoints:markers,pathGeometry:geometry,pathInstances:instances,pathStroke:stroke}=sandbox.ToSampoolRuntimeVNext.modules;
const plain=v=>JSON.parse(JSON.stringify(v));
const line={type:'line',x:0,y:0,x2:100,y2:0,stroke:'#fff',strokeWidth:2,strokeCompletion:50,pathEndpoints:{enabled:true,start:true,end:true}};
assert.deepEqual(plain(markers.placements(line,geometry.full(line))).map(p=>p.point),[[0,0],[50,0]]);
const reversed={...line,strokeReverse:true};assert.deepEqual(plain(markers.placements(reversed,geometry.full(reversed))).map(p=>p.point),[[100,0],[50,0]]);
assert.equal(markers.placements({...line,strokeCompletion:0},geometry.full(line)).length,0);
const rect={type:'rect',x:0,y:0,w:100,h:40,strokeCompletion:100,pathEndpoints:line.pathEndpoints};assert.equal(markers.placements(rect,geometry.full(rect)).length,1,'闭合首尾重合只画一次');
for(const part of[{...rect,strokeCompletion:50,pathStart:.25},{type:'ellipse',w:80,h:40,strokeCompletion:35},{type:'poly',w:80,h:80,polygonMode:'regular',sides:5,strokeCompletion:70},{type:'poly',w:80,h:80,points:[[0,0],[1,0],[.3,1]],strokeCompletion:40},{type:'stroke',points:[[0,0],[20,15],[50,0]],smoothing:60,strokeCompletion:50}]){
  part.pathEndpoints=line.pathEndpoints;const g=geometry.full(part),placements=markers.placements(part,g);assert.equal(placements.length,2);assert.ok(placements.every(p=>p.point.every(Number.isFinite)));
}
const bar={...line,pathEndpoints:{enabled:true,type:'bar',width:20}};assert.ok(markers.contains(bar,geometry.full(bar),50,9,0));assert.equal(markers.contains(bar,geometry.full(bar),55,9,0),false);
const bounds=stroke.bounds({...line,pathEndpoints:{enabled:true,size:20}});assert.ok(bounds.y<=-10&&bounds.y+bounds.h>=10,'边界包含端点而非原路径线宽');
const source={id:'source',type:'rect',x:150,y:80,w:10,h:10,fill:'#f00'},owner={id:'owner',type:'vector',x:10,y:30,w:100,h:20,parts:[{...line,pathEndpoints:{enabled:true,type:'object',sourceId:'source'}}]},scene={entities:[owner,source]};
assert.ok(instances.canReference(scene,'owner','source').ok);source.pathEndpoints={enabled:true,type:'object',sourceId:'owner'};assert.equal(instances.canReference(scene,'owner','source').ok,false,'端点引用也参与循环检查');
assert.equal(stroke.normalize(line).pathEndpoints.end,true);
console.log('✓ 路径端点合同：五类路径／正反向／零完成度／闭合重合去重／法向线／扩框／引用循环通过');
