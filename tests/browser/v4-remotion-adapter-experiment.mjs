import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),trial=resolve(root,'tests/experiments/remotion-adapter');
const runtime=readFileSync(resolve(root,'home-scene-vnext.js'),'utf8');
const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();window.trialGl={live:new Set(),contexts:0,sourceUploads:0,draws:0,deny:false};
    HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'&&trialGl.deny)return null;const gl=original.call(this,type,...args);if(type==='webgl2'&&gl&&!seen.has(gl)){seen.add(gl);trialGl.contexts++;const info=gl.getExtension('WEBGL_debug_renderer_info');trialGl.renderer=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl),upload=gl.texImage2D.bind(gl),draw=gl.drawArrays.bind(gl);gl.createTexture=()=>{const t=create();trialGl.live.add(t);return t;};gl.deleteTexture=t=>{trialGl.live.delete(t);return remove(t);};gl.texImage2D=(...a)=>{const src=a.at(-1);if(src instanceof HTMLCanvasElement||src instanceof ImageBitmap||typeof OffscreenCanvas!=='undefined'&&src instanceof OffscreenCanvas)trialGl.sourceUploads++;return upload(...a);};gl.drawArrays=(...a)=>{trialGl.draws++;return draw(...a);};}return gl;};
  });
  await page.goto('about:blank');await page.addScriptTag({content:runtime});await page.addScriptTag({path:resolve(trial,'dist/trial.js')});
  const result=await page.evaluate(async()=>{
    const t=RemotionTrial,source=t.source(),schemas=Object.fromEntries(['brightness','blur','wave'].map(id=>[id,t.schema(id)]));
    const pixels=c=>{const copy=t.canvas(c.width,c.height),x=copy.getContext('2d',{willReadFrequently:true});x.drawImage(c,0,0);return x.getImageData(0,0,c.width,c.height).data;};
    const diff=(a,b)=>{const x=pixels(a),y=pixels(b);let preMax=0,alphaMax=0;for(let i=0;i<x.length;i+=4){alphaMax=Math.max(alphaMax,Math.abs(x[i+3]-y[i+3]));for(let c=0;c<3;c++)preMax=Math.max(preMax,Math.abs(Math.round(x[i+c]*x[i+3]/255)-Math.round(y[i+c]*y[i+3]/255)));}return{preMax,alphaMax};};
    const hash=c=>{let h=2166136261;for(const byte of pixels(c))h=Math.imul(h^byte,16777619);return h>>>0;};
    const cases={brightness:[{id:'brightness'}],blur:[{id:'blur'}],wave:[{id:'wave'}],vertical:[{id:'wave',params:{direction:'vertical'}}],chain:[{id:'brightness'},{id:'blur'},{id:'wave'}],mixed:[{id:'blur'},{id:'brightness'},{id:'wave'}],identity:[{id:'brightness',params:{amount:0}},{id:'blur',params:{radius:0}},{id:'wave',params:{amplitude:0}}],disabled:[{id:'blur',disabled:true},{id:'wave',disabled:true}]};
    const visual=[];for(const [kind,specs]of Object.entries(cases)){const a=t.createSession(640,360,'official'),b=t.createSession(640,360,'direct');try{const native=await a.render(source,specs),direct=await b.render(source,specs);visual.push({kind,...diff(native,direct),sourceDelta:diff(source,native),hash:hash(native),backends:specs.map(s=>schemas[s.id].backend)});}finally{a.dispose();b.dispose();}}
    const phase=t.createSession(640,360);let seek;try{const a=hash(await phase.render(source,[{id:'wave',params:{phase:.2}}])),b=hash(await phase.render(source,[{id:'wave',params:{phase:1.2}}])),again=hash(await phase.render(source,[{id:'wave',params:{phase:.2}}]));seek={a,b,again};}finally{phase.dispose();}
    const invalid=[];for(const spec of [{id:'brightness',params:{amount:2}},{id:'wave',params:{wavelength:0}}]){try{t.descriptors([spec]);invalid.push(null);}catch(e){invalid.push(String(e));}}
    trialGl.deny=true;const unavailable=t.createSession(640,360);let failure;try{await unavailable.render(source,[{id:'blur'}]);failure=null;}catch(e){failure=String(e);}finally{unavailable.dispose();trialGl.deny=false;}
    const rows=[];
    for(const [w,h]of [[640,360],[1280,720]])for(const kind of ['brightness','blur','wave','chain','mixed'])for(const mode of ['official','direct']){
      const input=t.source(w,h),session=t.createSession(w,h,mode),output=t.canvas(w,h),specs=cases[kind],raw=[];let initial;
      try{for(let i=0;i<28;i++){const beforeUploads=trialGl.sourceUploads,beforeDraws=trialGl.draws,start=performance.now();await session.render(input,specs,output);const ms=performance.now()-start;if(i===0)initial=ms;if(i>=4)raw.push({ms,uploads:trialGl.sourceUploads-beforeUploads,draws:trialGl.draws-beforeDraws});}const sorted=raw.map(v=>v.ms).sort((a,b)=>a-b);rows.push({w,h,kind,mode,samples:raw.length,warmup:4,initial,p95:sorted[22],p50:sorted[11],sourceUploads:raw.at(-1).uploads,draws:raw.at(-1).draws});}finally{session.dispose();}
    }
    for(const kind of ['wave','chain','mixed']){
      const w=1280,h=720,input=t.source(w,h),session=t.createSession(w,h),output=t.canvas(w,h),raw=[];let initial;
      try{for(let i=0;i<28;i++){const specs=cases[kind].map(s=>({...s,params:s.id==='wave'?{phase:i*.2}:s.id==='brightness'?{amount:.2+Math.sin(i*.2)*.05}:{}})),beforeUploads=trialGl.sourceUploads,start=performance.now();await session.render(input,specs,output);const ms=performance.now()-start;if(i===0)initial=ms;if(i>=4)raw.push({ms,uploads:trialGl.sourceUploads-beforeUploads});}const sorted=raw.map(v=>v.ms).sort((a,b)=>a-b);rows.push({w,h,kind,mode:'official',motion:'changing-parameters',samples:24,warmup:4,initial,p95:sorted[22],p50:sorted[11],sourceUploads:raw.at(-1).uploads});}finally{session.dispose();}
    }
    return {schemas,visual,seek,invalid,failure,rows,liveTextures:trialGl.live.size,renderer:trialGl.renderer,contextsCreated:trialGl.contexts};
  });
  for(const row of result.visual)assert.ok(row.preMax<=2&&row.alphaMax<=1,JSON.stringify(row));
  for(const row of result.visual.filter(v=>['identity','disabled'].includes(v.kind)))assert.ok(row.sourceDelta.preMax<=2&&row.sourceDelta.alphaMax<=1,JSON.stringify(row));
  for(const row of result.visual.filter(v=>['brightness','blur','wave'].includes(v.kind)))assert.ok(row.sourceDelta.preMax>2,row.kind+' did not change input');
  assert.notEqual(result.seek.a,result.seek.b);assert.equal(result.seek.a,result.seek.again);assert.ok(result.invalid.every(Boolean));assert.ok(result.failure);assert.equal(result.liveTextures,0);assert.deepEqual(errors,[]);
  const ui=await browser.newPage({viewport:{width:1100,height:1100}});await ui.route(/^https?:/,route=>route.abort());await ui.goto(pathToFileURL(resolve(trial,'dist/standalone.html')).href);await ui.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('官方效果链'));
  const before=await ui.locator('#output').evaluate(c=>c.toDataURL());await ui.locator('[data-field="brightness.amount"]').fill('.55');await ui.waitForFunction(before=>document.querySelector('#output').toDataURL()!==before,before);await ui.screenshot({path:resolve(root,'docs/architecture/v4-remotion-adapter-2026-10-25.png'),fullPage:true});await ui.close();
  const report={date:'2026-10-25',browser:browser.version(),runtimeSha256:createHash('sha256').update(runtime).digest('hex'),build:JSON.parse(readFileSync(resolve(trial,'build-result.json'))),method:'Official npm factories; official Internals runner vs direct lifecycle adapter; ToSampool Canvas source; 4 warmup + 24 samples; synchronous/await wall time, not GPU timer query',errors,...result,uiLivePreview:true};
  writeFileSync(resolve(root,'docs/architecture/v4-remotion-adapter-2026-10-25-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
