import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx={};new vm.Script(readFileSync(new URL('../home-scene-vnext.js',import.meta.url),'utf8')).runInNewContext(ctx);
const api=ctx.ToSampoolRuntimeVNext.modules,t=api.parameterTiming,base={amount:0,count:2,color:'#000000',enabled:false,fixed:'rect'},target={amount:100,count:9,color:'#ffffff',enabled:true,fixed:'ellipse'},params=[
  {key:'amount',type:'number',timing:'Linear'},{key:'count',type:'number',integer:true,timing:'Step'},{key:'color',type:'color',timing:'Linear'},
  {key:'enabled',type:'boolean',timing:'Step'},{key:'fixed',type:'select',timing:'No'}];
assert.throws(()=>t.capability({type:'boolean',timing:'Linear'}),/不能/);assert.throws(()=>t.capability({type:'number',integer:true,timing:'Linear'}),/不能/);assert.throws(()=>t.capability({type:'number',timing:'Maybe'}),/未知/);
const track=t.threeSegments(base,target,Object.keys(target),params,true),before=JSON.stringify(track);
for(const [rel,n]of [[0,0],[1/3,0],[.5,50],[2/3,100],[1,100]])assert.ok(Math.abs(t.evaluate(base,track,rel,params).amount-n)<1e-8);
const middle=t.evaluate(base,track,.5,params);assert.equal(middle.count,2);assert.equal(middle.enabled,false);assert.equal(middle.color,'#808080');assert.equal(middle.fixed,'rect');assert.equal(t.evaluate(base,track,2/3,params).enabled,true);
assert.equal(JSON.stringify(track),before);const cleared=t.threeSegments(base,target,['count'],params,true);assert.equal(t.evaluate(base,cleared,.9,params).amount,0,'unarmed parameter inherits base');
const malicious={segments:[{f:[0,1],type:'step',values:{fixed:'ellipse'}}]};assert.equal(t.evaluate(base,malicious,.5,params).fixed,'rect','No is enforced at evaluation, not just a disabled button');
const hold=t.threeSegments(base,target,['amount'],params,false);assert.equal(t.evaluate(base,hold,.5,params).amount,0);
const definition=JSON.parse(readFileSync(new URL('../examples/resources/folded-frame.tosampool-pattern.json',import.meta.url),'utf8'));definition.id='review.parameter-timing';definition.parameters[0].timing='Linear';definition.parameters[1].timing='Step';definition.parameters[2].timing='No';
const record=api.patternProviders.validate(definition),part={id:'p.dot',type:'custom',w:160,h:100,recipe:{id:definition.id,version:1,definition:record.definition,providerKey:record.key,params:{gap:12,arm:28,radius:0,mode:'角标',center:true}}},entity={id:'owner',type:'vector',parts:[part],x:0,y:0,w:160,h:100};
const prefix='partsById.p%2Edot.recipe.params.',scene={timeline:{tracks:{owner:{segments:[{f:[0,1/3],type:'step',values:{}},{f:[1/3,2/3],type:'linear'},{f:[2/3,1],type:'step',values:{[prefix+'gap']:60,[prefix+'arm']:100,[prefix+'radius']:20}}]}}}};
const values=api.timeline.valuesFor(scene,'owner',entity,.5);assert.ok(Math.abs(values.parts[0].recipe.params.gap-36)<1e-8);assert.equal(values.parts[0].recipe.params.arm,28);assert.equal(values.parts[0].recipe.params.radius,0);assert.equal(entity.parts[0].recipe.params.gap,12,'timeline does not mutate base');
assert.equal(api.parameterTiming.forEntity(entity,scene.timeline.tracks.owner),api.parameterTiming.forEntity(entity,scene.timeline.tracks.owner),'immutable track policy is cached');
const indexed=JSON.parse(JSON.stringify(scene));indexed.timeline.tracks.owner.segments[2].values={'parts.0.recipe.params.radius':30};assert.equal(api.timeline.valuesFor(indexed,'owner',entity,.9).parts[0].recipe.params.radius,0,'array index spelling cannot bypass No');
console.log('✓ 参数时序：No门控／整数与开关Step／颜色及数值Linear／三段边界／清除继承／保持／直接角度规则／正式实体轨及稳定图元ID／缓存与基值不变');
