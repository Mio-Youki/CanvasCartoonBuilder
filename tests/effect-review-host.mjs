import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {startHost,builtinCandidates} from '../host/effect-review-host.mjs';
import {createJobs} from '../host/effect-review-jobs.mjs';
const root=resolve(import.meta.dirname,'..'),copy=v=>JSON.parse(JSON.stringify(v)),ctx=vm.createContext({TextEncoder,TextDecoder,crypto:webcrypto,Buffer});
for(const name of ['home-scene-vnext.js','editor/effect-review-state.js','editor/provider-review-candidate.js','editor/v4-resource-core.js','editor/v4-resource-library.js','editor/effect-review-delivery.js'])vm.runInContext(readFileSync(resolve(root,name),'utf8'),ctx);
const definition=JSON.parse(readFileSync(resolve(root,'examples/resources/folded-frame.tosampool-pattern.json'),'utf8')),c=ctx.ToSampoolProviderReviewCandidate.create(definition);
const candidate={subject:copy(ctx.ToSampoolEffectReviewState.identity(c)),name:c.name,parameters:copy(c.parameters),definition};
mkdirSync(resolve(root,'.local'),{recursive:true});const folder=mkdtempSync(resolve(root,'.local/effect-review-host-test-'));
let calls=0;const host=await startHost({port:0,folder,candidates:new Map([[c.id,candidate]]),agent:async()=>{calls++;return{status:'needs-input',summary:'需要确定',questions:[{id:'a',question:'更密还是更疏？'}]};}});
const record={format:'tosampool-effect-review/v1',subject:candidate.subject,review:{name:c.name,labels:{gap:'边距'},notes:{},note:'',defaults:null,confirmation:{decision:'request-changes',at:new Date().toISOString()}},preview:{},transport:'local-only'};
async function api(path,data,headers={}){const r=await fetch(host.origin+'/__effect-review/'+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+host.token,Origin:host.origin,...headers},...(data?{body:JSON.stringify(data)}:{})});return{status:r.status,value:await r.json()};}
async function final(id){for(let i=0;i<80;i++){const j=host.jobs.get(id);if(!['running','queued'].includes(j.status))return j;await new Promise(ok=>setTimeout(ok,20));}throw Error('任务未结束');}
try{
  const bad=await api('jobs',record,{Authorization:'Bearer wrong'});assert.equal(bad.status,403);
  assert.equal((await api('jobs',record,{Origin:'https://evil.example'})).status,403);
  const accepted=(await api('jobs',record)).value,ready=await final(accepted.id);assert.equal(ready.status,'packaged');assert.equal(calls,0);assert.equal(ready.result.parameters[0].label,'边距');assert.equal(ready.result.bundle.entries[0].kind,'pattern');
  const library=ctx.EditorV4ResourceLibrary.create({storage:ctx.EditorV4ResourceLibrary.memoryStorage()}),delivery=ctx.ToSampoolEffectReviewDelivery;
  const published=await delivery.importShared(ready.result.bundle,library);assert.equal((await delivery.importShared(ready.result.bundle,library)).id,published.id);assert.equal((await library.publications()).length,1);
  const altered=copy(ready.result.bundle.entries[0]);altered.payload.preset.name='同版本不同内容';const changed=await ctx.EditorV4Resources.pack(ready.result.bundle.roots,[await ctx.EditorV4Resources.seal(altered)]);await assert.rejects(()=>delivery.importShared(changed,library),/未覆盖/);assert.equal((await library.publication(published.id)).hash,ready.result.bundle.hash);
  const corrupted=copy(ready.result.bundle);corrupted.hash='wrong';await assert.rejects(()=>delivery.importShared(corrupted,library),/哈希/);
  const again=copy(record);again.review.confirmation.at=new Date(Date.now()+100).toISOString();assert.equal((await api('jobs',again)).value.id,accepted.id,'duplicate confirmation does not duplicate work');
  assert.equal((await api('jobs/'+accepted.id+'/shared',{publicationId:'fake',bundleHash:'wrong'})).status,400);
  assert.equal((await api('jobs/'+accepted.id+'/shared',{publicationId:'same',bundleHash:ready.result.bundle.hash})).value.status,'shared');
  const noted=copy(record);noted.review.notes.gap='更自然一些';const question=await final((await api('jobs',noted)).value.id);assert.equal(question.status,'needs-input');assert.equal(calls,1);
  const invalid=copy(record);invalid.subject.version++;assert.equal((await api('jobs',invalid)).status,400);
  const forbidden=await fetch(host.origin+'/.git/config');assert.equal(forbidden.status,404);
  const restart=createJobs({folder,candidates:new Map([[c.id,candidate]]),execute:async()=>{throw Error('should not run completed');}});assert.equal(restart.get(accepted.id).status,'shared');restart.close();
  const raw=[...builtinCandidates().values()][0],pending={...copy(record),subject:raw.subject,review:{...copy(record.review),name:raw.name,labels:{}}};
  // The actual production candidate now uses a reviewed, shipped generator, not fixture code.
  const prod=await startHost({port:0,folder:mkdtempSync(resolve(root,'.local/effect-review-production-test-'))});try{const r=await fetch(prod.origin+'/__effect-review/jobs',{method:'POST',headers:{Authorization:'Bearer '+prod.token},body:JSON.stringify(pending)}),j=await r.json();for(let n=0;n<30&&['queued','running'].includes(prod.jobs.get(j.id).status);n++)await new Promise(ok=>setTimeout(ok,20));const result=prod.jobs.get(j.id);assert.equal(result.status,'packaged');assert.equal(result.result.definition.format,'tosampool-pattern-generator/v1');assert.equal(result.result.bundle.entries[0].payload.preset.engineId,'proposal.dual-ray');}finally{await prod.close();}
  console.log('✓ 宿主：授权与来源／自动分流／名称不调用模型／重复幂等／正式资源闭包／备注追问／错误回执／重启恢复／真实放射生成器正式交付');
}finally{await host.close();}
