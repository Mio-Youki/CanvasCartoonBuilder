/* Production CPU/GPU analysis parity, resource lifecycle and fallback matrix. */
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(path=>path&&existsSync(path));
const benchmark=process.argv.includes('--benchmark');
const browser=await chromium.launch({executablePath:edge,headless:true});
try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.setContent('<canvas></canvas>');
  await page.addScriptTag({content:readFileSync(resolve(root,'home-scene-vnext.js'),'utf8')});
  const result=await page.evaluate(async({benchmark,photo})=>{
    const api=ToSampoolRuntimeVNext,ascii=api.modules.ascii;
    const pool=api.modules.surfaces.create(),cpuPool=api.modules.surfaces.create();
    const image=new Image();image.src=photo;await image.decode();
    const source=document.createElement('canvas');source.width=157;source.height=91;
    const ctx=source.getContext('2d');
    function draw(kind,time=0){
      ctx.clearRect(0,0,source.width,source.height);
      if(kind==='photo')ctx.drawImage(image,0,0,source.width,source.height);
      if(kind==='text'){ctx.fillStyle='#336ad7';ctx.font='24px serif';ctx.fillText('Aa—界',7,43);}
      if(kind==='shape'){ctx.fillStyle='#f5d326';ctx.fillRect(9+time,6,72,55);ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(1,80);ctx.lineTo(145,3);ctx.stroke();}
      if(kind==='alpha'){ctx.fillStyle='rgba(100,230,210,.42)';ctx.beginPath();ctx.ellipse(81,46,57,34,0,0,7);ctx.fill();}
    }
    const read=output=>output.getContext('2d').getImageData(0,0,output.width,output.height).data.slice();
    function render(config,mode,surfaces=pool,final='gpu'){
      ascii.setBackend(final);ascii.setAnalysisBackend(mode);
      const output=ascii.apply(source,config,surfaces,{time:0},config.grid||1),pixels=read(output);surfaces.release(output);return pixels;
    }
    const equal=(a,b,label)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw Error(`${label} @${i}: ${a[i]} != ${b[i]}`);};
    const baked=ascii.prepare({font:'system',characters:' .Aa界',edgeCharacters:'—|/\\'},'serif');
    const configs=[
      {size:8,glyphRatio:2/3,edges:true,colorMode:'original'},
      {size:3,glyphRatio:.72,edges:true,edgeSensitivity:0,edgeCoverage:0,invert:true,backgroundAlpha:0},
      {size:11,glyphRatio:1.25,edges:true,edgeSensitivity:1,edgeCoverage:1,stretch:true,colorAlpha:.4},
      {size:2,glyphRatio:.83,edges:true,exposure:1.7,attenuation:.6,grid:2},
      {size:7,glyphRatio:.67,edges:true,font:'unavailable',characters:' .Aa界',glyphAtlas:baked}
    ];
    let cases=0;const largeDifferences=[];
    for(const kind of ['photo','shape','text','alpha'])for(const config of configs){
      draw(kind);const cpu=render(config,'cpu',cpuPool),gpu=render(config,'auto');
      if(ascii.getLastAnalysisBackend()!=='gpu')throw Error('GPU analysis not exercised: '+JSON.stringify(ascii.analysisStatus(pool)));
      equal(cpu,gpu,kind+'/'+JSON.stringify(config));cases++;
    }
    for(const [width,height] of [[1280,720],[1920,1080]]){
      source.width=width;source.height=height;draw('photo');
      const a=render(configs[0],'cpu',cpuPool),b=render(configs[0],'auto');
      let channels=0,sum=0,alpha=0,max=0;
      for(let i=0;i<a.length;i++){const error=Math.abs(a[i]-b[i]);if(error){channels++;sum+=error;max=Math.max(max,error);if(i%4===3)alpha++;}}
      largeDifferences.push({width,height,channels,mean:sum/a.length,alpha,max});cases++;
      // Float32 shader arithmetic can move a near-threshold DoG vote to its
      // neighboring glyph. Keep this bounded, quantified and Alpha-exact.
      if(alpha||sum/a.length>.002||channels>Math.ceil(a.length*.00002))throw Error('Large-image GPU precision budget exceeded: '+JSON.stringify(largeDifferences.at(-1)));
    }
    source.width=157;source.height=91;draw('shape');
    const first=render(configs[0],'auto');draw('alpha');render(configs[2],'auto');draw('shape');
    equal(first,render(configs[0],'auto'),'resize/interleaved configs');
    draw('empty');equal(render(configs[0],'cpu',cpuPool),render(configs[0],'auto'),'transparent frame');
    const active=ascii.analysisStatus(pool);pool.clear();
    if(ascii.analysisStatus(pool).active||ascii.analysisStatus(pool).textureBytes)throw Error('GPU pool clear failed');
    draw('shape');render(configs[0],'auto');if(ascii.getLastAnalysisBackend()!=='gpu')throw Error('GPU re-create failed');
    pool.clear();cpuPool.clear();

    // Intercept only newly created test contexts, not the application/public API.
    const originalContext=HTMLCanvasElement.prototype.getContext;
    let floatChecks=0,lastGL=null,deletedTextures=0,loseAtDraw=0,noGLAttempts=0;
    let blockFloat=false,blockGL=false,failCompile=false;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      if(type==='webgl'&&blockGL){noGLAttempts++;return null;}
      const gl=originalContext.call(this,type,...args);
      if(type==='webgl'&&gl){
        lastGL=gl;const getExtension=gl.getExtension.bind(gl),drawArrays=gl.drawArrays.bind(gl),remove=gl.deleteTexture.bind(gl);let draws=0;
        gl.getExtension=name=>{if(name==='OES_texture_float'){floatChecks++;if(blockFloat)return null;}return getExtension(name);};
        gl.deleteTexture=texture=>{deletedTextures++;return remove(texture);};
        gl.drawArrays=(...values)=>{drawArrays(...values);draws++;if(loseAtDraw&&draws===loseAtDraw)getExtension('WEBGL_lose_context')?.loseContext();};
        if(failCompile){const parameter=gl.getShaderParameter.bind(gl);gl.getShaderParameter=(shader,name)=>name===gl.COMPILE_STATUS?false:parameter(shader,name);}
      }
      return gl;
    };
    const failures=[];
    try {
      blockFloat=true;const unsupported=api.modules.surfaces.create();
      const expected=render(configs[0],'cpu',cpuPool);
      for(let i=0;i<3;i++){
        equal(expected,render(configs[0],'auto',unsupported),'no Float fallback');
        if(ascii.getLastAnalysisBackend()!=='cpu'||ascii.getLastBackend()!=='gpu')throw Error('Wrong no Float fallback');
      }
      if(floatChecks!==1)throw Error('Unsupported capability retried each frame');
      failures.push(ascii.analysisStatus(unsupported).reason);unsupported.clear();blockFloat=false;
      const lost=api.modules.surfaces.create();render(configs[0],'auto',lost);
      lastGL.getExtension('WEBGL_lose_context').loseContext();
      const fallback=render(configs[0],'auto',lost,'auto');
      equal(render(configs[0],'cpu',cpuPool,'cpu'),fallback,'lost context fallback');
      if(!ascii.analysisStatus(lost).contextLost)throw Error('Context loss not exercised');
      lost.clear();
      // Loss on the fifth draw: four successful analysis passes, then final glyph draw.
      loseAtDraw=5;const midFrame=api.modules.surfaces.create();
      const midOutput=render(configs[0],'auto',midFrame,'auto');
      equal(render(configs[0],'cpu',cpuPool,'cpu'),midOutput,'mid-frame loss CPU edge rebuild');
      if(ascii.analysisStatus(midFrame).contextLost!==true)throw Error('Mid-frame context loss not exercised');
      midFrame.clear();loseAtDraw=0;
      const released=api.modules.surfaces.create();render(configs[0],'auto',released);
      const before=deletedTextures;released.clear();if(deletedTextures-before!==8)throw Error('Expected 5 analysis + 3 glyph texture deletes');
      failures.push('lost-before-analysis','lost-after-analysis','8 textures released');
      blockGL=true;const noGL=api.modules.surfaces.create();
      for(let i=0;i<2;i++)equal(render(configs[0],'cpu',cpuPool,'cpu'),render(configs[0],'auto',noGL,'auto'),'no WebGL fallback');
      if(noGLAttempts!==1)throw Error('No WebGL context retried each frame');noGL.clear();blockGL=false;
      failCompile=true;const badShader=api.modules.surfaces.create();
      equal(render(configs[0],'cpu',cpuPool,'cpu'),render(configs[0],'auto',badShader,'auto'),'shader failure fallback');badShader.clear();failCompile=false;
      failures.push('no-WebGL cached','shader-failure CPU fallback');
    } finally {HTMLCanvasElement.prototype.getContext=originalContext;cpuPool.clear();}

    const measurements=[];
    if(benchmark){
      const summarize=values=>{values.sort((a,b)=>a-b);return{median:values[Math.floor(values.length/2)],p95:values[Math.ceil(values.length*.95)-1],max:values.at(-1)};};
      for(const [width,height] of [[640,360],[1280,720],[1920,1080]]){
        source.width=width;source.height=height;
        for(const mode of ['cpu','auto']){
          const surfaces=api.modules.surfaces.create(),values=[];ascii.setBackend('auto');ascii.setAnalysisBackend(mode);
          for(let i=0;i<72;i++){
            await new Promise(requestAnimationFrame);draw('photo');ctx.fillStyle='#fff';ctx.fillRect(width*.4+Math.sin(i)*width*.01,height*.4,width*.05,height*.005);
            const start=performance.now(),output=ascii.apply(source,configs[0],surfaces,{time:i/30},1);
            output.getContext('2d').getImageData(0,0,1,1);const elapsed=performance.now()-start;surfaces.release(output);if(i>=12)values.push(elapsed);
          }
          measurements.push({mode,width,height,analysis:ascii.getLastAnalysisBackend(),paint:ascii.getLastBackend(),samples:values.length,...summarize(values),resources:ascii.analysisStatus(surfaces)});surfaces.clear();
        }
      }
    }
    ascii.setBackend('auto');ascii.setAnalysisBackend('auto');
    const gl=document.createElement('canvas').getContext('webgl'),ext=gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return{cases,largeDifferences,active,failures,measurements,renderer,userAgent:navigator.userAgent};
  },{benchmark,photo:`data:image/jpeg;base64,${readFileSync(resolve(root,'examples/assets/karsten.jpg')).toString('base64')}`});
  assert.deepEqual(errors,[]);assert.equal(result.cases,22);
  if(benchmark)writeFileSync(resolve(root,'docs/architecture/v4-ascii-gpu-production-benchmark.json'),JSON.stringify(result,null,2)+'\n');
  console.log('ASCII shared GPU analysis parity/fallback/release passed',JSON.stringify(result));
} finally {await browser.close();}
