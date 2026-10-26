/* Isolated experiment: no production runtime, registry or UI writes. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const moduleSource=read('tests/fixtures/ascii-reference-v1.js').trim();
const runtimeSource=read('home-scene-vnext.js').replace(read('runtime-src/vnext/68b-ascii-mapping.js').trim(),moduleSource),fixtureSource=read('tests/fixtures/ascii-edge-experiment.js');
const quick=process.argv.includes('--quick'),capture=process.argv.includes('--capture'),raw=process.argv.includes('--raw');
function variant(mode){
  let source=moduleSource;
  const replace=(from,to)=>{assert.ok(source.includes(from),'实验注入点已变化：'+from.slice(0,70));source=source.replace(from,to);};
  replace('function apply(source, config, surfaces, frame, grid) {','function apply(source, config, surfaces, frame, grid) {\nconst experiment=global.__asciiExperiment;experiment.profile={};experiment.config=config;experiment.pool=surfaces;experiment.grid=grid||1;let mark=performance.now();');
  replace("const directionsByCell = edge ? directions(pixels, analysis.width, analysis.height, columns, rows, config,source.width/cell.width*detail,source.height/cell.height*detail) : null;",
    `experiment.profile.prepareRead=performance.now()-mark;mark=performance.now();\nconst directionsByCell = edge ? ${mode==='baseline'?'directions':mode.startsWith('cpu-')?'experiment.cpu':'experiment.gpuDirections'}(pixels,analysis.width,analysis.height,columns,rows,config,source.width/cell.width*detail,source.height/cell.height*detail,surfaces,source) : null;\nexperiment.profile.edges=performance.now()-mark;mark=performance.now();`);
  replace("if(backend!=='cpu')try{if(paintGpu", "experiment.profile.cellSelection=performance.now()-mark;mark=performance.now();\nif(backend!=='cpu')try{if(paintGpu");
  replace("lastBackend='gpu';surfaces.notePixels?", "lastBackend='gpu';experiment.profile.paint=performance.now()-mark;surfaces.notePixels?");
  replace('Object.freeze({ apply, prepare, atlas, geometry, chars,','Object.freeze({ experiment:{gpuRenderer}, apply, prepare, atlas, geometry, chars,');
  if(mode.endsWith('-complete')){
    const start=source.indexOf('const colors=new Uint8Array(columns*rows*4),indices=new Uint8Array(columns*rows*4);'),end=source.indexOf('experiment.profile.cellSelection=');assert.ok(start>=0&&end>start);
    source=source.slice(0,start)+'const {colors,indices}=experiment.cells(pixels,alphaPixels,columns,rows,detail,glyphs,config,directionsByCell,surfaces);\n'+source.slice(end);
  }
  if(mode.startsWith('gpu-')){
    replace('uniform sampler2D colors,indices,glyphs;','uniform sampler2D colors,indices,glyphs;uniform sampler2D experimentalVotes;uniform float experimentalEdges;uniform vec4 experimentalGlyphs;');
    replace('floor(id.g*255.+.5)*256.;','floor(id.g*255.+.5)*256.;if(experimentalEdges>.5){float code=floor(texture2D(experimentalVotes,uv).r*255.+.5);float chosen=code<1.5?experimentalGlyphs.x:code<2.5?experimentalGlyphs.y:code<3.5?experimentalGlyphs.z:experimentalGlyphs.w;if(code>.5&&chosen>=0.)index=chosen;}');
    replace('gl.drawArrays(gl.TRIANGLES,0,3);if(gl.getError()', 'global.__asciiExperiment.bind(gpu,global.__asciiExperiment.config,glyphs);gl.drawArrays(gl.TRIANGLES,0,3);if(gl.getError()');
  }
  const output=runtimeSource.replace(moduleSource,source);assert.notEqual(output,runtimeSource);return output;
}
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
const browser=await chromium.launch({executablePath:edge,headless:true});
const photo=`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`;
const results=[],captures=[];
try{
  for(const mode of ['baseline','cpu-optimized','cpu-complete','gpu-low','gpu-low-complete','gpu-full']){
    const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));
    await page.setContent('<canvas id="output"></canvas>');await page.addScriptTag({content:fixtureSource});await page.addScriptTag({content:variant(mode)});
    await page.evaluate(mode=>{__asciiExperiment.mode=mode;},mode);
    try{
      const value=await page.evaluate(async({mode,photo,quick,capture,raw})=>{
        const api=ToSampoolRuntimeVNext,experiment=__asciiExperiment,image=new Image();image.src=photo;await image.decode();
        const summarize=values=>{const sorted=values.slice().sort((a,b)=>a-b);return{median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};};
        const deviceCanvas=document.createElement('canvas'),deviceGL=deviceCanvas.getContext('webgl'),ext=deviceGL?.getExtension('WEBGL_debug_renderer_info');
        const device={renderer:ext?deviceGL.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',userAgent:navigator.userAgent};deviceGL?.getExtension('WEBGL_lose_context')?.loseContext();
        const sizes=quick?[[640,360],[1920,1080]]:[[640,360],[1280,720],[1920,1080]],runs=[];
        const materials=['photo','shapes','text','alpha'];
        function fixture(width,height,material,time){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas,material,time);return canvas;}
        function draw(canvas,material,time){const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const shift=Math.sin(time*2*Math.PI)*w*.01;
          if(material==='photo'){ctx.drawImage(image,0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(w*.4+shift,h*.4,w*.05,h*.005);}
          else if(material==='alpha'){ctx.fillStyle='#ffd34b';ctx.beginPath();ctx.ellipse(w*.5+shift,h*.5,w*.28,h*.3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(w*.2,h*.2,w*.15,h*.1);}
          else{ctx.fillStyle='#242a31';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff';if(material==='text'){ctx.font=Math.max(12,w/15)+'px monospace';ctx.fillText('ToSampool',w*.08+shift,h*.43);ctx.font=Math.max(8,w/65)+'px monospace';ctx.fillText('Thin lines / glyphs / detail',w*.08,h*.62);}else{ctx.fillRect(w*.12+shift,h*.12,w*.004,h*.6);ctx.fillRect(w*.12+shift,h*.12,w*.48,h*.004);ctx.strokeStyle='#ffe99a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*.2,h*.8);ctx.lineTo(w*.8,h*.2);ctx.stroke();ctx.fillStyle='#d34684';ctx.fillRect(w*.6,h*.45,w*.13,h*.22);}}
        }
        for(const [width,height] of sizes){
          const input=fixture(width,height,'photo',0),scene={format:'tosampool-scene/v4',width,height,loop:4,background:{alpha:0},runtimeAssets:{photo:{canvas:input}},entities:[{id:'photo',type:'image',assetId:'photo',x:0,y:0,w:width,h:height,anim:{bob:{amount:2,angle:0,period:4,curve:'sine'}}}],sceneEffects:{sample:{'ascii-mapping':{enabled:true,size:8,glyphRatio:2/3,edges:true,colorMode:'original',edgeSensitivity:.75,edgeCoverage:.25}}}};
          const player=api.createRuntime(scene),output=document.querySelector('#output'),wall=[],complete=[],raf=[],stages={prepareRead:[],edges:[],cellSelection:[],paint:[],fence:[]};
          let last=performance.now();const count=quick?20:60,warm=quick?6:12;
          for(let i=0;i<count+warm;i++){
            await new Promise(requestAnimationFrame);const now=performance.now();const dt=now-last;last=now;
            const time=i/30;draw(input,'photo',time);const start=performance.now();player.renderTo(output,time);const submitted=performance.now();
            if(api.modules.ascii.getLastBackend()!=='gpu')throw new Error('基准需要真实GPU字形合成，不能静默CPU回退');
            const gpu=api.modules.ascii.experiment.gpuRenderer(experiment.pool);gpu.gl.finish();const finished=performance.now();
            if(i>=warm){wall.push(submitted-start);complete.push(finished-start);raf.push(dt);for(const key of ['prepareRead','edges','cellSelection','paint'])stages[key].push(experiment.profile[key]);stages.fence.push(finished-submitted);}
          }
          const stageSummary=Object.fromEntries(Object.entries(stages).map(([key,list])=>[key,summarize(list)]));
          const run={width,height,mode,backend:api.modules.ascii.getLastBackend(),wall:summarize(wall),complete:summarize(complete),raf:summarize(raf),stages:stageSummary};if(raw)run.samples={wall,complete,raf};runs.push(run);
          if(width===640){
            for(const material of materials){const source=fixture(width,height,material,0),pool=api.modules.surfaces.create(),config=scene.sceneEffects.sample['ascii-mapping'];const out=api.modules.ascii.apply(source,config,pool,{time:0},1);api.modules.ascii.experiment.gpuRenderer(pool).gl.finish();
              const data=Array.from(out.getContext('2d').getImageData(0,0,width,height).data);run.visuals=run.visuals||[];run.visuals.push({material,data});
              if(capture){run.images=run.images||[];run.images.push({material,dataUrl:out.toDataURL?.()||(()=>{const target=document.createElement('canvas');target.width=width;target.height=height;target.getContext('2d').drawImage(out,0,0);return target.toDataURL();})()});}
              pool.release(out);pool.clear();
            }
          }
          player.dispose();
        }
        return{device,runs};
      },{mode,photo,quick,capture,raw});
      const reference=results.find(value=>value.mode==='baseline');
      for(const run of value.runs){if(run.visuals){run.differences=run.visuals.map(entry=>{const base=reference?.runs.find(item=>item.width===run.width)?.visuals?.find(item=>item.material===entry.material)?.data;let error=0,changed=0,alpha=0;if(base)entry.data.forEach((v,i)=>{const d=Math.abs(v-base[i]);error+=d;if(d>0)changed++;if(i%4===3)alpha+=d;});return{material:entry.material,meanError:base?error/base.length:0,changedFraction:base?changed/base.length:0,alphaMeanError:base?alpha/(base.length/4):0};});}}
      results.push({mode,...value});console.log(mode,JSON.stringify(value.runs.map(({visuals,images,...run})=>run)));
      assert.deepEqual(errors,[]);
    }catch(error){results.push({mode,error:String(error.stack||error)});console.error(mode,error.message);}
    await page.close();
  }
  if(capture){const page=await browser.newPage();for(const material of ['photo','shapes','text','alpha']){const entries=results.filter(item=>item.runs).map(item=>({mode:item.mode,image:item.runs.find(run=>run.width===640)?.images?.find(entry=>entry.material===material)?.dataUrl}));await page.setContent('<body style="margin:0;background:#222;color:white;font:14px monospace;display:grid;grid-template-columns:640px 640px;gap:4px">'+entries.map(entry=>'<div>'+entry.mode+'<br><img style="width:640px" src="'+entry.image+'"></div>').join('')+'</body>');await page.screenshot({path:resolve(root,`docs/architecture/v4-ascii-edge-${material}.png`),fullPage:true});}await page.close();}
  const report=results.map(({runs,...rest})=>({...rest,runs:runs?.map(({visuals,images,...run})=>run)}));
  writeFileSync(resolve(root,'docs/architecture/v4-ascii-edge-benchmark.json'),JSON.stringify(report,null,2),'utf8');
  assert.ok(results.every(result=>!result.error),'某些实验候选未完成，见输出');
  for(const candidate of results.filter(result=>['cpu-optimized','cpu-complete','gpu-low','gpu-low-complete'].includes(result.mode))){
    for(const entry of candidate.runs.flatMap(run=>run.differences||[]))assert.equal(entry.meanError,0,`${candidate.mode}/${entry.material} 尚未达到保真门槛`);
  }
}finally{await browser.close();}
