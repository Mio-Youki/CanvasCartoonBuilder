// Gate a numeric-strip proposal against genuine two-dimensional native draws.
import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const executablePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const helper = readFileSync(resolve(import.meta.dirname, 'helpers/native-nearest-calibration.js'), 'utf8').replace('export function', 'function');
const runtimeCalibration = readFileSync(resolve(import.meta.dirname, '../../runtime-src/vnext/69c-native-nearest.js'), 'utf8');
const browser = await chromium.launch({executablePath, headless: true});
try {
  const page = await browser.newPage();
  await page.addScriptTag({content: helper});
  await page.addScriptTag({content: 'globalThis.ToSampoolRuntimeVNext={modules:{}};\n'+runtimeCalibration});
  const results = await page.evaluate(() => {
    const rows = [];
    for (const [sw, sh, dw, dh] of [[214,120,640,360],[640,360,214,120],[187,105,63,35],[63,35,187,105],[333,187,1000,561],[1000,561,333,187],[480,270,1920,1080],[1920,1080,480,270],[7,11,19,31],[19,31,7,11]]) {
      for (const surface of ['offscreen', 'html']) {
      const makeCanvas=(width,height)=>{if(surface==='offscreen')return new OffscreenCanvas(width,height);const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
      for (const willReadFrequently of [false, true]) {
      const x = calibrateNativeNearest(sw, dw, 'x', willReadFrequently, surface), y = calibrateNativeNearest(sh, dh, 'y', willReadFrequently, surface);
      if(surface==='offscreen'&&!willReadFrequently&&sw>=dw&&sh>=dh){
        const native=ToSampoolRuntimeVNext.modules.nativeNearest.create(sw,sh,dw,dh);
        for(const [row,expected,from,to] of [[0,x,sw,dw],[1,y,sh,dh]])for(let i=0;i<to;i++){
          const actual=native.data?native.data[row*native.width+i]:Math.floor((2*i+1)*from/(2*to));
          if(actual!==expected.map[i])throw new Error('Runtime calibration differs from independently measured native coordinates');
        }
      }
      for (const alpha of [false, true]) {
        const source = makeCanvas(sw, sh), sc = source.getContext('2d', {willReadFrequently});
        const image = sc.createImageData(sw, sh);
        for (let j=0;j<sh;j++) for(let i=0;i<sw;i++) {
          const k=(j*sw+i)*4;
          image.data.set([(i*37+j*13)&255,(i*17+j*53)&255,(i*71+j*19)&255,alpha?((i*29+j*7)%255+1):255],k);
        }
        sc.putImageData(image,0,0);
        // Read canonical bytes after Canvas's premultiplication round-trip.
        const canonical=sc.getImageData(0,0,sw,sh).data;
        // Also exercise Canvas-drawn input rather than only putImageData input.
        for(const sourceMode of ['pixel-upload','canvas-copy']) {
        let drawSource=source;
        if(sourceMode==='canvas-copy'){drawSource=makeCanvas(sw,sh);drawSource.getContext('2d',{willReadFrequently}).drawImage(source,0,0);}
        const output=makeCanvas(dw,dh), oc=output.getContext('2d',{willReadFrequently});
        oc.imageSmoothingEnabled=false;oc.drawImage(drawSource,0,0,dw,dh);
        const actual=oc.getImageData(0,0,dw,dh).data;
        let mismatches=0,max=0,first=null;
        for(let j=0;j<dh;j++)for(let i=0;i<dw;i++) {
          const out=(j*dw+i)*4, input=(y.map[j]*sw+x.map[i])*4;
          for(let c=0;c<4;c++) {const diff=Math.abs(actual[out+c]-canonical[input+c]);if(diff){mismatches++;max=Math.max(max,diff);first??={x:i,y:j,channel:c,expected:canonical[input+c],actual:actual[out+c]};}}
        }
        rows.push({sw,sh,dw,dh,alpha,surface,sourceMode,willReadFrequently,xExceptions:x.exceptions,yExceptions:y.exceptions,mismatches,max,first});
        }
      }
      }
      }
    }
    return {renderer:navigator.userAgent,rows};
  });
  const report={browser:browser.version(),purpose:'source-independent strip calibration vs full 2D Canvas; no production integration',...results};
  if(process.argv.includes('--write-report'))writeFileSync(resolve(import.meta.dirname,'../../docs/architecture/v4-gpu-native-nearest-calibration-2026-10-24-result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({browser:report.browser,cases:results.rows.length,failed:results.rows.filter(row=>row.mismatches),exceptionCases:results.rows.filter(row=>row.xExceptions||row.yExceptions).length},null,2));
  assert.equal(results.rows.filter(row=>row.mismatches).length,0,'Strip calibration does not reproduce full 2D Canvas; do not ship this mapping');
} finally {await browser.close();}
