import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),sandbox={};
new vm.Script(readFileSync(resolve(root,'home-scene-vnext.js'),'utf8')).runInNewContext(sandbox);
const {pathWave:wave,pathGeometry:geometry}=sandbox.ToSampoolRuntimeVNext.modules;
assert.deepEqual(Array.from(wave.types),['sine','triangle','saw','square','digits','noise']);
assert.equal(wave.digits('1, 5，9 5'),'1595');
for(const text of ['', '0','1509','1a9','1'.repeat(129)])assert.throws(()=>wave.digits(text));
for(const [text,expected] of [['1',-1],['5',0],['9',1]])for(const interpolation of ['hold','linear','smooth']){
  const compiled=wave.compile({type:'digits',digits:text,interpolation});
  for(let i=-20;i<40;i++)assert.equal(compiled.sample(i/37),expected,'constant digit must not be re-centred');
}
for(const text of ['1595','55595551','123456789987654321','9159','656757','55','91','15951595']){
  const compiled=wave.compile({type:'digits',digits:text}),values=Array.from(text,d=>(+d-5)/4);
  for(let i=0;i<values.length;i++){
    assert.ok(Math.abs(compiled.sample(i/values.length)-values[i])<1e-10);
    for(let j=0;j<=64;j++){
      const value=compiled.sample((i+j/64)/values.length),a=values[i],b=values[(i+1)%values.length];
      assert.ok(value>=Math.min(a,b)-1e-10&&value<=Math.max(a,b)+1e-10,'Hermite overshot '+text);
    }
    const x=i/values.length,e=1e-7,left=(compiled.sample(x)-compiled.sample(x-e))/e,right=(compiled.sample(x+e)-compiled.sample(x))/e;
    assert.ok(Math.abs(left-right)<.001,'derivative discontinuity '+text+' at '+i);
  }
}
const smooth=wave.compile({type:'digits',digits:'1595'}),e=1e-6;
assert.ok((smooth.sample(.25+e)-smooth.sample(.25-e))/(2*e)>1,'smooth must not stop at every anchor');
const hold=wave.compile({type:'digits',digits:'19',interpolation:'hold'}),linear=wave.compile({type:'digits',digits:'19',interpolation:'linear'});
assert.equal(hold.sample(.25),-1);assert.equal(linear.sample(.25),0);
for(const type of wave.types){
  const compiled=wave.compile({type,seed:7});
  for(let i=0;i<200;i++){const t=i/199,value=compiled.sample(t);assert.ok(value>=-1-1e-10&&value<=1+1e-10);assert.ok(Math.abs(value-compiled.sample(t+1))<1e-10);}
}
const random=wave.compile({type:'noise',seed:0}),other=wave.compile({type:'noise',seed:1});
assert.notDeepEqual(Array.from(random.anchors),Array.from(other.anchors));
const snapshot=Array.from(random.anchors);for(let seed=2;seed<70;seed++)wave.compile({type:'noise',seed});
assert.deepEqual(Array.from(wave.compile({type:'noise',seed:0}).anchors),snapshot);
assert.ok(wave.stats().entries<=32);
const part={type:'line',x:0,y:20,x2:120,y2:20,strokeWave:{enabled:true,type:'digits',digits:'9',amplitude:7,wavelength:40,fixEnds:false}};
const full=geometry.full(part);
assert.ok(full.stroke.every(p=>Math.abs(p[1]-27)<1e-9));
const neutral=geometry.full({...part,strokeWave:{...part.strokeWave,digits:'5555'}});
assert.equal(neutral.stroke,neutral.outline,'all 5s must preserve the original path without resampling');
const zero=geometry.full({...part,strokeWave:{...part.strokeWave,amplitude:0}});
assert.equal(zero.stroke,zero.outline,'zero amplitude must avoid derived geometry');
assert.equal(geometry.full({...part,strokeCompletion:30}),full);
const compiled=wave.compile(part.strokeWave),before=wave.stats().builds;
for(let i=0;i<100;i++)assert.equal(wave.compile({...part.strokeWave,amplitude:i,wavelength:i+1,phase:i/100}),compiled);
assert.equal(wave.stats().builds,before);
const corner=geometry.full({type:'rect',w:100,h:80,strokeWave:{enabled:true,type:'digits',digits:'9',amplitude:8,wavelength:80}}).stroke;
let maxJump=0;for(let i=1;i<corner.length;i++)maxJump=Math.max(maxJump,Math.hypot(corner[i][0]-corner[i-1][0],corner[i][1]-corner[i-1][1]));
assert.ok(maxJump<4,'corner normal flips abruptly: '+maxJump);
assert.deepEqual(Array.from(corner[0]),Array.from(corner.at(-1)));
console.log('路径节奏合同：六类型／数字映射／无过冲周期Hermite／固定seed／有界缓存／几何复用／转角连续法线通过',JSON.stringify({cache:wave.stats(),maxCornerStep:maxJump}));
