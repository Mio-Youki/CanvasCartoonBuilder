/* HTTP, MCP and future Tauri all call these same operations. No protocol owns business state. */
export function createEditorOperations({jobs,candidates,harnesses}){
  function job(id){if(typeof id!=='string'||!/^job-[a-f0-9]{32}$/.test(id))throw Error('任务ID无效');return jobs.get(id);}
  function capabilities(){return{format:'tosampool-editor-operations/v1',scope:'current-local-review-host',
    reviews:{list:true,read:true,submit:true,answer:true,retry:true},delivery:{read:true,browserSharedReceipt:true},
    editor:{canvasRead:false,selectionRead:false,sceneMutation:false},
    patterns:{declarativeTemplate:true,arbitraryJavaScriptInstall:false,dualRayProduction:[...candidates.values()].some(c=>c.definition?.id==='proposal.dual-ray'&&c.definition?.format==='tosampool-pattern-generator/v1')},
    harnesses:harnesses.list(),mcp:{mode:'read-only',canStartConversation:false,canPublish:false}};}
  function listReviews({limit=20,status}={}){if(!Number.isInteger(limit)||limit<1||limit>100||status!=null&&typeof status!=='string')throw Error('列表参数无效');return jobs.list().filter(j=>!status||j.status===status).reverse().slice(0,limit).map(j=>({id:j.id,subject:j.record.subject,name:j.record.review.name,status:j.status,route:j.route,createdAt:j.createdAt,updatedAt:j.updatedAt}));}
  function readDelivery(id){const j=job(id);if(!['packaged','shared'].includes(j.status)||!j.result?.bundle)throw Error('正式交付尚未就绪');return{jobId:id,status:j.status,name:j.result.name,parameters:j.result.parameters,bundle:j.result.bundle,verification:j.result.verification,limitations:j.result.limitations,shared:j.shared||null};}
  return Object.freeze({capabilities,listReviews,readReview:job,readDelivery,submit:record=>jobs.submit(record),answer:(id,answers)=>{job(id);return jobs.answer(id,answers);},retry:id=>{job(id);return jobs.retry(id);},acknowledgeShared:(id,receipt)=>{job(id);return jobs.acknowledge(id,receipt);}});
}
