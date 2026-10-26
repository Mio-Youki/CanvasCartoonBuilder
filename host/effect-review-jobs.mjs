import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,renameSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const clone=v=>JSON.parse(JSON.stringify(v));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
export function validateReview(record,candidate){
  if(record?.format!=='tosampool-effect-review/v1'||JSON.stringify(canonical(record.subject))!==JSON.stringify(canonical(candidate.subject)))throw Error('候选身份或版本不匹配');
  const r=record.review;if(!r?.confirmation||!['request-changes','approve-proposal'].includes(r.confirmation.decision)||!Number.isFinite(Date.parse(r.confirmation.at)))throw Error('需要已确认的审阅记录');
  const text=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
  if(!text(r.name,80)||!r.labels||!r.notes||Array.isArray(r.labels)||Array.isArray(r.notes)||typeof r.note!=='string'||r.note.length>4000)throw Error('修订字段无效');
  const keys=new Set(candidate.parameters.map(p=>p.key));
  for(const [key,label]of Object.entries(r.labels))if(!keys.has(key)||!text(label,60))throw Error('参数名称无效');
  for(const [key,note]of Object.entries(r.notes))if(!keys.has(key)||typeof note!=='string'||note.length>2000)throw Error('参数备注无效');
  if(r.defaults!==null){if(!r.defaults||Array.isArray(r.defaults)||Object.keys(r.defaults).some(k=>!keys.has(k)))throw Error('默认参数包含未知字段');
    for(const p of candidate.parameters){const v=r.defaults[p.key];if(p.type==='number'&&(!Number.isFinite(v)||v<(p.min??-Infinity)||v>(p.max??Infinity)||p.integer&&!Number.isInteger(v))||p.type==='boolean'&&typeof v!=='boolean'||p.type==='select'&&!p.options.includes(v)||p.type==='color'&&!/^#[a-f0-9]{6}$/i.test(v))throw Error('默认参数无效：'+p.key);}
  }
  if(JSON.stringify(record).length>100000)throw Error('修订记录超出预算');
  return clone(record);
}
export function route(record){return record.review.note.trim()||Object.values(record.review.notes).some(s=>s.trim())?'iterate':'release';}
export function createJobs(options){
  const folder=resolve(options.folder);mkdirSync(folder,{recursive:true});const jobs=new Map();let running=false,closed=false;
  function save(job){const file=join(folder,job.id+'.json');writeFileSync(file+'.tmp',JSON.stringify(job,null,2),'utf8');renameSync(file+'.tmp',file);jobs.set(job.id,job);return clone(job);}
  for(const file of readdirSync(folder).filter(s=>/^job-[a-f0-9]+\.json$/.test(s))){const j=JSON.parse(readFileSync(join(folder,file),'utf8'));if(j.status==='running'){j.status='interrupted';j.message='上次处理被中断，请重试';}save(j);}
  function get(id){const j=jobs.get(id);if(!j)throw Error('任务不存在');return clone(j);}
  async function drain(){if(running||closed)return;running=true;try{for(const initial of [...jobs.values()]){if(closed)break;if(initial.status!=='queued')continue;const j=save({...initial,status:'running',updatedAt:new Date().toISOString()});try{
      const candidate=options.candidates.get(j.record.subject.id);validateReview(j.record,candidate);
      const result=await options.execute(clone(j),candidate);
      if(!['blocked','needs-input','preview-ready','packaged'].includes(result.status))throw Error('执行器返回未知状态');
      save({...get(j.id),status:result.status,result,updatedAt:new Date().toISOString()});
    }catch(error){save({...get(j.id),status:'failed',message:error.message,updatedAt:new Date().toISOString()});}}
  }finally{running=false;if(!closed&&[...jobs.values()].some(j=>j.status==='queued'))queueMicrotask(drain);}}
  function submit(raw){const c=options.candidates.get(raw?.subject?.id);if(!c)throw Error('候选未登记');const record=validateReview(raw,c);
    const stable=clone(record);delete stable.review.confirmation.at;delete stable.transport;const id='job-'+digest(stable).slice(0,32);if(jobs.has(id))return get(id);
    const job=save({id,record,route:route(record),status:'queued',createdAt:new Date().toISOString()});queueMicrotask(drain);return job;}
  function retry(id){const j=get(id);if(!['failed','interrupted','blocked'].includes(j.status))throw Error('该任务不能重试');save({...j,status:'queued',message:null,result:null});queueMicrotask(drain);return get(id);}
  function acknowledge(id,receipt){const j=get(id);if(j.status==='shared')return j;if(j.status!=='packaged'||receipt.bundleHash!==j.result.bundle.hash||typeof receipt.publicationId!=='string')throw Error('共享回执与交付不匹配');return save({...j,status:'shared',shared:receipt,updatedAt:new Date().toISOString()});}
  function answer(id,answers){const prior=get(id);if(prior.status!=='needs-input')throw Error('任务不在追问状态');const expected=prior.result.questions||[];if(!Array.isArray(answers)||answers.length!==expected.length)throw Error('请回答全部问题');
    const lines=expected.map(q=>{const a=answers.find(a=>a.id===q.id);if(typeof a?.answer!=='string'||!a.answer.trim()||a.answer.length>2000)throw Error('回答无效');return q.question+'\n用户回答：'+a.answer.trim();});
    const next=clone(prior.record);next.review.note=[next.review.note,...lines].filter(Boolean).join('\n\n');next.review.confirmation.at=new Date().toISOString();return submit(next);
  }
  queueMicrotask(drain);
  return{submit,get,retry,answer,acknowledge,list:()=>[...jobs.values()].map(clone),close(){closed=true;}};
}
