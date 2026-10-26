// Diagnostic, not a passing visual-parity gate: expose Canvas nearest choices.
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage();
  const result=await page.evaluate(()=>{
    const rows=[];
    for(const [from,to] of [[214,640],[640,214],[160,640],[640,160],[63,187],[187,63],[1920,480],[480,1920],[1080,270],[270,1080]]){
      const a=new OffscreenCanvas(from,1),ac=a.getContext('2d'),input=ac.createImageData(from,1);
      for(let x=0;x<from;x++)input.data.set([x&255,x>>>8,0,255],x*4);ac.putImageData(input,0,0);
      const b=new OffscreenCanvas(to,1),bc=b.getContext('2d');bc.imageSmoothingEnabled=false;bc.drawImage(a,0,0,to,1);
      const output=bc.getImageData(0,0,to,1).data,mismatches=[];
      for(let x=0;x<to;x++){const canvas=output[x*4]+(output[x*4+1]<<8),formula=Math.floor((x+.5)*from/to);if(canvas!==formula)mismatches.push({x,canvas,formula});}
      rows.push({from,to,mismatches});
    }
    return rows;
  });
  const report={browser:browser.version(),note:'Canvas readback vs shader mathematical nearest coordinate; not a performance benchmark',rows:result};
  if(process.argv.includes('--write-report'))writeFileSync(resolve(import.meta.dirname,'../../docs/architecture/v4-gpu-resampling-diagnostic-2026-10-24-result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
