import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import vm from 'node:vm';
import {createJobs} from './effect-review-jobs.mjs';
import {createReleaseBuilder} from './effect-review-release.mjs';
import {createHarnessRegistry} from './harness-registry.mjs';
import {createEditorOperations} from './editor-operation-service.mjs';
const root=resolve(import.meta.dirname,'..'),copy=v=>JSON.parse(JSON.stringify(v));
export function builtinCandidates(){
  // Only this shipped, repository-owned candidate is evaluated. Agent output is JSON only.
  const ctx=vm.createContext({});for(const p of ['home-scene-vnext.js','examples/pattern-proposals/dual-ray/candidate.js','editor/effect-review-state.js'])vm.runInContext(readFileSync(resolve(root,p),'utf8'),ctx);
  const c=ctx.ToSampoolDualRayProposal;return new Map([[c.id,{subject:copy(ctx.ToSampoolEffectReviewState.identity(c)),name:c.name,parameters:copy(c.parameters),definition:copy(c.reviewSource.definition)}]]);
}
export async function startHost(options={}){
  const candidates=options.candidates||builtinCandidates(),build=options.build||createReleaseBuilder(),token=randomBytes(32).toString('hex');let origin;
  const harnesses=options.harnesses||createHarnessRegistry();let harnessId=options.harnessId;
  if(options.agent){harnessId=options.agent.adapter?.id||'injected-test';harnesses.register({id:harnessId,transport:options.agent.adapter?.transport||'test',execute:options.agent,close:()=>options.agent.stop?.(),verified:false,capabilities:{continuousSession:false}});}
  const previewContext=vm.createContext({});for(const name of ['home-scene-vnext.js','editor/effect-review-state.js','editor/provider-review-candidate.js'])vm.runInContext(readFileSync(resolve(root,name),'utf8'),previewContext);
  function registerPreview(definition){const c=previewContext.ToSampoolProviderReviewCandidate.create(definition),candidate={subject:copy(previewContext.ToSampoolEffectReviewState.identity(c)),name:c.name,parameters:copy(c.parameters),definition:copy(definition)};candidates.set(c.id,candidate);return candidate;}
  const jobs=createJobs({folder:options.folder||resolve(root,'.local/effect-review/jobs'),candidates,execute:async(job,candidate)=>{
    if(job.record.subject.fingerprint!==candidate.subject.fingerprint)return{status:'blocked',summary:'候选实现已更新，请重新确认预览',reason:'旧确认不自动授权新实现；请刷新审阅页后再次确认'};
    if(job.route==='release')return build(job,candidate,candidate.definition);
    if(!harnessId)return{status:'blocked',summary:'备注已接收；尚未配置Agent执行器',reason:'请在宿主启用Agent连接后重试，未生成或发布任何资源'};
    const result=await harnesses.execute(harnessId,job,candidate);if(result.status==='preview-ready'){
      const revised=copy(result.definition);if(candidate.definition)revised.version=Math.max(revised.version,candidate.definition.version+1);
      const checked=await build(job,candidate,revised);if(checked.status!=='packaged')return checked;
      const next=registerPreview(checked.definition);
      return{status:'preview-ready',summary:result.summary,definition:checked.definition,subject:next.subject,previewUrl:'/review-preview/'+job.id,verification:checked.verification};
    }return result;
  }});
  const operations=createEditorOperations({jobs,candidates,harnesses});
  for(const job of jobs.list())if(job.result?.status==='preview-ready'&&job.result.definition)registerPreview(job.result.definition);
  async function body(req){let value='';for await(const chunk of req){value+=chunk;if(Buffer.byteLength(value)>200000)throw Error('请求超出预算');}return JSON.parse(value||'{}');}
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.jpg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'};
  const server=createServer(async(req,res)=>{try{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
    if(req.headers.host!==new URL(origin).host)return json(res,403,{error:'Host不匹配'});
    const url=new URL(req.url,origin),path=decodeURIComponent(url.pathname);
    if((path.startsWith('/review-preview/')||path.startsWith('/review-candidate/'))&&req.method==='GET'){
      const job=path.startsWith('/review-preview/')?jobs.get(path.slice('/review-preview/'.length)):null;
      const definition=job?job.result?.status==='preview-ready'&&job.result.definition:candidates.get(path.slice('/review-candidate/'.length))?.definition;if(!definition)throw Error('预览尚未就绪');
      const scripts=['home-scene-vnext.js','editor/v4-parameter-controls.js','editor/v4-color-popover.js','editor/classic-v4-color-control.js','editor/vnext-scene.js','editor/v4-pattern-registry.js','editor/v4-path-pattern-presets.js','editor/v4-resource-core.js','editor/v4-resource-library.js','editor/effect-review-delivery.js','editor/effect-review-transport.js','editor/effect-review-state.js','editor/provider-review-candidate.js','editor/pattern-review-workbench.js'];
      const encoded=JSON.stringify(definition).replaceAll('<','\\u003c');
      res.writeHead(200,{'Content-Type':mime['.html'],'Cache-Control':'no-store'});return res.end('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="tosampool-effect-review-host" content="same-origin"><title>效果审阅</title><link rel="stylesheet" href="/editor/pattern-review-workbench.css"><link rel="stylesheet" href="/editor/v4-color-popover.css"></head><body><main id="review"></main>'+scripts.map(s=>'<script src="/'+s+'"></script>').join('')+'<script>window.patternReview=ToSampoolPatternReview.create(document.getElementById("review"),ToSampoolProviderReviewCandidate.create('+encoded+'));</script></body></html>');
    }
    if(path==='/__effect-review/bootstrap'){
      if(req.method!=='GET'||req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'来源不匹配'});
      return json(res,200,{format:'tosampool-effect-host/v1',token,agent:!!harnessId,harnesses:harnesses.list()});
    }
    if(path.startsWith('/__effect-review/')){
      if(req.headers.authorization!=='Bearer '+token||req.headers.origin&&req.headers.origin!==origin)return json(res,403,{error:'回传授权或来源无效'});
      const parts=path.split('/').filter(Boolean);
      if(req.method==='GET'&&parts[1]==='capabilities')return json(res,200,operations.capabilities());
      if(req.method==='GET'&&parts[1]==='jobs'&&parts.length===2)return json(res,200,operations.listReviews({limit:Number(url.searchParams.get('limit')||20),status:url.searchParams.get('status')||undefined}));
      if(req.method==='POST'&&parts[1]==='jobs'&&parts.length===2)return json(res,202,operations.submit(await body(req)));
      if(parts[1]==='jobs'&&/^job-[a-f0-9]{32}$/.test(parts[2]||'')){
        const job=operations.readReview(parts[2]);if(req.method==='GET'&&parts.length===3)return json(res,200,job);
        if(req.method==='GET'&&parts[3]==='delivery')return json(res,200,operations.readDelivery(job.id));
        if(req.method==='GET'&&parts[3]==='package'&&job.result?.bundle){res.setHeader('Content-Disposition','attachment; filename="'+job.id+'.tosampool-resource.json"');return json(res,200,job.result.bundle);}
        if(req.method==='POST'&&parts[3]==='shared')return json(res,200,operations.acknowledgeShared(job.id,await body(req)));
        if(req.method==='POST'&&parts[3]==='answers')return json(res,202,operations.answer(job.id,(await body(req)).answers));
        if(req.method==='POST'&&parts[3]==='retry')return json(res,202,operations.retry(job.id));
      }
      return json(res,404,{error:'接口不存在'});
    }
    if(req.method!=='GET')return json(res,405,{error:'方法不支持'});
    if(path==='/' ){res.writeHead(302,{Location:'/examples/pattern-proposals/dual-ray/preview.html'});return res.end();}
    if(path.split('/').some(p=>p.startsWith('.')||p.includes('\\'))||!mime[extname(path)])return json(res,404,{error:'资源不存在'});
    const file=resolve(root,'.'+path);if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile()||!realpathSync(file).startsWith(root+sep))return json(res,404,{error:'资源不存在'});
    let content=readFileSync(file);
    if(extname(file)==='.html'){let html=content.toString('utf8').replace('<head>','<head><meta name="tosampool-effect-review-host" content="same-origin">');if(path==='/img2asset-v4-classic.html')html=html.replace('</body>','<script src="/editor/effect-review-editor-sync.js"></script></body>');content=Buffer.from(html);}
    res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'no-store'});res.end(content);
  }catch(error){json(res,400,{error:error.message});}});
  await new Promise((ok,no)=>{server.once('error',no);server.listen(options.port??8780,'127.0.0.1',ok);});origin='http://127.0.0.1:'+server.address().port;
  return{origin,token,jobs,candidates,operations,harnesses,close:async()=>{jobs.close();harnesses.close();await new Promise(ok=>server.close(ok));}};
}
