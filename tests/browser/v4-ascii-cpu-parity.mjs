/* Frozen pre-optimization algorithm vs production; no reference code ships in Runtime. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
const benchmark=process.argv.includes('--benchmark');
const browser=await chromium.launch({executablePath:edge,headless:true});
try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.setContent('<canvas></canvas>');
  await page.addScriptTag({content:read('home-scene-vnext.js')});
  await page.evaluate(()=>{window.optimizedAscii=ToSampoolRuntimeVNext.modules.ascii;});
  await page.addScriptTag({content:read('tests/fixtures/ascii-reference-v1.js').replace('api.modules.ascii = Object.freeze(', 'global.referenceAscii = Object.freeze(')});
  const result=await page.evaluate(async({benchmark,photo})=>{
    const api=ToSampoolRuntimeVNext,reference=window.referenceAscii,optimized=window.optimizedAscii;
    optimized.setAnalysisBackend('cpu'); // This fixture measures the frozen-vs-CPU stage only.
    const image=new Image(); image.src=photo; await image.decode();
    const pool=api.modules.surfaces.create(),other=api.modules.surfaces.create();
    const source=document.createElement('canvas');source.width=157;source.height=91;
    const ctx=source.getContext('2d');
    function draw(kind,time=0){
      ctx.clearRect(0,0,source.width,source.height);
      if(kind==='photo')ctx.drawImage(image,0,0,source.width,source.height);
      if(kind==='text'){ctx.fillStyle='#336ad7';ctx.font='24px serif';ctx.fillText('Aa—界',7,43);}
      if(kind==='shape'){ctx.fillStyle='#f5d326';ctx.fillRect(9+time,6,72,55);ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(1,80);ctx.lineTo(145,3);ctx.stroke();}
      if(kind==='alpha'){ctx.fillStyle='rgba(100,230,210,.42)';ctx.beginPath();ctx.ellipse(81,46,57,34,0,0,7);ctx.fill();}
    }
    function render(module,config,backend='cpu',surfaces=pool){
      module.setBackend(backend);
      const output=module.apply(source,config,surfaces,{time:0},config.grid||1);
      const pixels=output.getContext('2d').getImageData(0,0,output.width,output.height).data.slice();
      surfaces.release(output);return pixels;
    }
    const baked=optimized.prepare({font:'system',characters:' .Aa界',edgeCharacters:'—|/\\'},'serif');
    const configs=[
      {size:8,glyphRatio:2/3,edges:true,colorMode:'original'},
      {size:3,glyphRatio:.72,edges:true,edgeSensitivity:0,edgeCoverage:0,invert:true,backgroundAlpha:0},
      {size:11,glyphRatio:1.25,edges:true,edgeSensitivity:1,edgeCoverage:1,stretch:true,colorAlpha:.4},
      {size:1,glyphRatio:.83,edges:false,exposure:1.7,attenuation:.6,grid:2},
      {size:7,glyphRatio:.67,edges:true,font:'unavailable',characters:' .Aa界',glyphAtlas:baked}
    ];
    let cases=0;
    for(const backend of ['cpu','gpu'])for(const kind of ['photo','shape','text','alpha'])for(const config of configs){
      draw(kind);const a=render(reference,config,backend),b=render(optimized,config,backend);
      for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw Error(`像素不一致 ${backend}/${kind}/${JSON.stringify(config)} @${i}: ${a[i]} != ${b[i]}`);
      cases++;
    }
    // Repeated frames reuse buffers; clearing or changing Players cannot leak stale cells.
    pool.clear();draw('shape');render(optimized,configs[0]);
    const first=api.modules.asciiAnalysis.statistics(pool);
    for(let i=0;i<8;i++){draw('shape',i);render(optimized,configs[0]);}
    const repeated=api.modules.asciiAnalysis.statistics(pool);
    if(first.edgeAllocations!==repeated.edgeAllocations||first.cellAllocations!==repeated.cellAllocations)throw Error('重复帧分配分析缓冲');
    draw('alpha');const before=render(optimized,configs[0]);render(optimized,configs[2],'cpu',other);
    const after=render(optimized,configs[0]);if(before.some((value,i)=>value!==after[i]))throw Error('跨 Player 污染');
    draw('empty');render(optimized,configs[0]); // Must clear previous opaque cells.
    const emptyA=render(reference,configs[0]),emptyB=render(optimized,configs[0]);
    if(emptyA.some((value,i)=>value!==emptyB[i]))throw Error('透明帧残留');
    pool.clear();const cleared=api.modules.asciiAnalysis.statistics(pool);
    if(Object.values(cleared).some(Boolean))throw Error('clear 未释放分析缓冲');
    draw('shape');render(optimized,configs[0]);const rebuilt=api.modules.asciiAnalysis.statistics(pool);
    if(rebuilt.edgeAllocations!==1||rebuilt.cellAllocations!==1)throw Error('clear 后不能重建');
    pool.clear();other.clear();
    const measurements=[];
    if(benchmark){
      const summarize=values=>{values.sort((a,b)=>a-b);return{median:values[Math.floor(values.length/2)],p95:values[Math.ceil(values.length*.95)-1]};};
      for(const [width,height] of [[640,360],[1280,720],[1920,1080]]){
        source.width=width;source.height=height;
        for(const [name,module] of [['reference',reference],['production',optimized]]){
          const surfaces=api.modules.surfaces.create(),values=[];module.setBackend('auto');
          for(let i=0;i<72;i++){
            await new Promise(requestAnimationFrame);draw('photo');ctx.fillStyle='#fff';ctx.fillRect(width*.4+Math.sin(i)*width*.01,height*.4,width*.05,height*.005);
            const start=performance.now(),output=module.apply(source,configs[0],surfaces,{time:i/30},1);
            // Readback fences final glyph drawing for both paths; not a full editor/OS frame measurement.
            output.getContext('2d').getImageData(0,0,1,1);
            const elapsed=performance.now()-start;surfaces.release(output);if(i>=12)values.push(elapsed);
          }
          measurements.push({name,width,height,backend:module.getLastBackend(),samples:values.length,...summarize(values)});surfaces.clear();
        }
      }
    }
    reference.setBackend('auto');optimized.setBackend('auto');
    const deviceCanvas=document.createElement('canvas'),gl=deviceCanvas.getContext('webgl'),ext=gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return{cases,first,repeated,cleared,rebuilt,measurements,renderer,userAgent:navigator.userAgent};
  },{benchmark,photo:`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`});
  assert.deepEqual(errors,[]);assert.equal(result.cases,40);
  if(benchmark)writeFileSync(resolve(root,'docs/architecture/v4-ascii-cpu-production-benchmark.json'),JSON.stringify(result,null,2)+'\n');
  console.log('ASCII CPU production parity / pool isolation / clear: passed',JSON.stringify(result));
} finally {await browser.close();}
