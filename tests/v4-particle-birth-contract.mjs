import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console});vm.runInContext(readFileSync(new URL('../home-scene-vnext.js',import.meta.url),'utf8'),ctx);const rt=ctx.ToSampoolRuntimeVNext,plain=v=>JSON.parse(JSON.stringify(v));
function setup(patch={}){
 const input={format:'tosampool-scene/v4',width:256,height:128,loop:4,entities:[{id:'sprite',type:'rect',w:2,h:2,particleSourceOnly:true},{id:'e',type:'particle-emitter',x:10,y:20,w:1,h:1,particle:{sourceId:'sprite',count:4,life:2,speed:0,fade:false,seed:2}}],...patch},scene=rt.createRuntime(input).scene,surfaces=rt.modules.surfaces.create(),session=rt.modules.particles.create(scene,surfaces),emitter=scene.entities.find(e=>e.id==='e');
 return{scene,emitter,session,at(t){const stats={},particles=session.evaluate(emitter,rt.modules.frame.create(scene,t),stats,{});return{particles:plain(particles),stats};},dispose(){session.clear();surfaces.clear();}};
}
const tracks={e:{segments:[{f:[0,.5],type:'step',values:{x:10}},{f:[.5,1],type:'step',values:{x:110}}]}},a=setup({timeline:{tracks}}),before=a.at(1.75),after=a.at(2.25),old=new Map(before.particles.map(p=>[p.id,p]));
assert.equal(before.particles.length,4);assert.equal(after.particles.length,4);
for(const p of after.particles)if(old.has(p.id)){assert.equal(p.x,old.get(p.id).x);assert.equal(p.y,old.get(p.id).y);}else assert.ok(p.x>=110&&p.x<111);
assert.ok(after.stats.particleBirthHits>=3);const fresh=setup({timeline:{tracks}});assert.deepEqual(fresh.at(2.25).particles,after.particles);a.at(3);a.at(.2);assert.deepEqual(a.at(2.25).particles,after.particles);
const looping=setup(),positions=t=>looping.at(t).particles.map(p=>[p.x,p.y]).sort((a,b)=>a[0]-b[0]);assert.deepEqual(positions(0),positions(3.999999),'循环末尾不能因为随机身份重置而整体换一批位置');looping.dispose();
const parented=setup({entities:[{id:'sprite',type:'rect',w:2,h:2},{id:'g',type:'group',w:100,h:100},{id:'e',type:'particle-emitter',parentId:'g',x:10,y:20,w:1,h:1,particle:{sourceId:'sprite',count:4,life:2,speed:0,fade:false,seed:2}}],timeline:{tracks:{g:{segments:[{f:[0,.5],values:{rot:0,scaleX:1}},{f:[.5,1],values:{rot:90,scaleX:2}}]}}}}),parentBefore=new Map(parented.at(1.75).particles.map(p=>[p.id,p]));
for(const p of parented.at(2.25).particles)if(parentBefore.has(p.id)){assert.deepEqual(p.matrix,parentBefore.get(p.id).matrix);assert.equal(p.x,parentBefore.get(p.id).x);}else assert.deepEqual(p.matrix,plain(rt.modules.frame.create(parented.scene,2).valuesFor(parented.emitter).worldMatrix.slice(0,4)));parented.dispose();
const changed=setup({timeline:{tracks:{e:{segments:[{f:[0,.5],type:'step',values:{'particle.count':4,'particle.life':2,'particle.speed':0}},{f:[.5,1],type:'step',values:{'particle.count':8,'particle.life':1,'particle.speed':10}}]}}}}),c=changed.at(2.25).particles;
assert.equal(c.length,6);assert.equal(c.filter(p=>p.birthTime<2).length,3);assert.equal(c.filter(p=>p.birthTime>=2).length,3);
const black=setup();black.emitter.particle.emissionRange={type:'rect',x:0,y:0,w:1,h:1,invert:true,follow:true,followMatrix:[1,0,0,1,0,0]};assert.equal(black.at(1).particles.length,0,'全黑不得回退中心');
const weights=new Uint8Array(100);weights.fill(255,0,5);weights.fill(255,95);const distribution=rt.modules.weightedDistribution.create({data:weights,w:100,h:1});for(let i=0;i<600;i++){const p=distribution.pick(i/600,(i*.618)%1);assert.ok(p&&(p.x<5||p.x>=95));}assert.equal(rt.modules.weightedDistribution.create({data:new Uint8Array(4),w:2,h:2}).pick(.5,.5),null);
assert.throws(()=>rt.createRuntime({format:'tosampool-scene/v4',entities:[{id:'sprite',type:'rect'},{id:'e',type:'particle-emitter',particle:{sourceId:'sprite',emissionRange:{type:'element',targetId:'e'}}}]}),/循环|自身|粒子发射器/);
for(const s of [a,fresh,changed,black])s.dispose();console.log('✓ birth-time pose, old/new count-life batches, deterministic seek/reverse, loop stability, empty/normalized sparse weights and source-cycle guards');
