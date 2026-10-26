import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
const root=resolve(import.meta.dirname,'..'),sandbox={};
new vm.Script(readFileSync(resolve(root,'home-scene-vnext.js'),'utf8')).runInNewContext(sandbox);
const smooth=sandbox.ToSampoolRuntimeVNext.modules.pathStroke.smoothPoints;
// Independent direct-kernel reference, before high-strength thinning.
function reference(points,amount){
  const lengths=[0];let total=0;
  for(let i=1;i<points.length;i++){total+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lengths.push(total);}
  const count=Math.min(8192,Math.max(2,Math.ceil(total))),step=total/count,samples=[];
  let segment=1;
  for(let i=0;i<=count;i++){
    const distance=i*step;while(segment<points.length-1&&lengths[segment]<distance)segment++;
    const a=points[segment-1],b=points[segment],span=lengths[segment]-lengths[segment-1],t=span?(distance-lengths[segment-1])/span:0;
    samples.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
  }
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),strength=amount/100,
    extent=Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)),
    radius=Math.min(Math.max(12,Math.min(256,extent*.02))*strength,total*.2),window=Math.max(1,Math.ceil(radius/step));
  return samples.map((p,i)=>{
    if(i===0||i===count)return points[i===0?0:points.length-1];
    let x=0,y=0,weight=0;
    for(let j=Math.max(0,i-window);j<=Math.min(count,i+window);j++){const w=window+1-Math.abs(i-j);x+=samples[j][0]*w;y+=samples[j][1]*w;weight+=w;}
    const blend=strength*Math.min(1,i*step/Math.max(1,radius),(count-i)*step/Math.max(1,radius));
    return[p[0]+(x/weight-p[0])*blend,p[1]+(y/weight-p[1])*blend];
  });
}
const points=Array.from({length:801},(_,i)=>[i*1.25,30*Math.sin(i/800*Math.PI*10)+5*Math.sin(i/800*Math.PI*160)]),saved=JSON.stringify(points);
const expected=reference(points,40),actual=smooth(points,40);
assert.equal(actual.length,expected.length);
for(let i=0;i<actual.length;i++)for(let k=0;k<2;k++)assert.ok(Math.abs(actual[i][k]-expected[i][k])<1e-7,'prefix kernel must match direct averaging');
function atX(path,x){let i=1;while(i<path.length-1&&path[i][0]<x)i++;const a=path[i-1],b=path[i],t=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;}
const normal=smooth(points,100),large=smooth(points.map(p=>p.map(v=>v*4)),100);
let scaleError=0,rawError=0,smoothError=0;
for(let x=50;x<=950;x+=5){
  const ideal=30*Math.sin(x/1000*Math.PI*10),a=atX(normal,x);
  scaleError=Math.max(scaleError,Math.abs(a-atX(large,x*4)/4));
  rawError+=Math.abs(atX(points,x)-ideal);smoothError+=Math.abs(a-ideal);
}
assert.ok(scaleError<.15,'scaled strokes should retain comparable smoothing: '+scaleError);
assert.ok(smoothError<rawError*.8,'smoothing should reduce short-distance jitter');
assert.equal(JSON.stringify(points),saved);assert.equal(smooth(points,0),points);assert.equal(smooth(points,100),normal);
assert.deepEqual(Array.from(normal[0]),points[0]);assert.deepEqual(Array.from(normal.at(-1)),points.at(-1));
const shifted=smooth(points.map(p=>[p[0]+1000000,p[1]-1000000]),100);
assert.equal(shifted.length,normal.length);
for(let i=0;i<normal.length;i++)assert.ok(Math.hypot(shifted[i][0]-1000000-normal[i][0],shifted[i][1]+1000000-normal[i][1])<1e-6);
const long=Array.from({length:20001},(_,i)=>[i*100,1000*Math.sin(i*.2)]),start=performance.now(),bounded=smooth(long,100),cold=performance.now()-start;
assert.ok(bounded.length<=8193);assert.ok(bounded.every(p=>p.every(Number.isFinite)));assert.equal(smooth(long,100),bounded);
assert.deepEqual(Array.from(bounded.at(-1)),long.at(-1));
console.log('✓ 自适应平滑：直接核一致／四倍尺度对照／抖动减少／原点平移／首尾与原始点／缓存与8193点预算',JSON.stringify({scaleError,coldMs:+cold.toFixed(2),points:bounded.length}));
