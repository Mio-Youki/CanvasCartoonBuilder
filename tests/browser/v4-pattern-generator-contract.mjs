/* Real Canvas contract fixture, not a shipped pattern or a model-generation test. */
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage();
  await page.addScriptTag({path:resolve(root,'home-scene-vnext.js')});
  const result=await page.evaluate(()=>{
    const api=ToSampoolRuntimeVNext.modules.patternGenerators;
    const manifest={format:api.FORMAT,id:'fixture.arc-paint',version:1,name:'圆弧指令夹具',implementation:'fixture-v1',carriers:['poly'],output:'carrier-clipped-paint',dependencies:[],parameters:[],controls:[],budget:{layers:1,commands:4}};
    api.register(manifest,input=>({layers:[{color:'#bb4488',alpha:.6,commands:[['M',32,32],['A',32,32,48,input.time,input.time+Math.PI],['Z']]}]}),{trust:'repository-reviewed'});
    const canvas=()=>{const c=document.createElement('canvas');c.width=64;c.height=64;return c;},a=canvas(),b=canvas();
    const input={carrierType:'poly',path:[[3,3],[61,3],[32,61]],bounds:{x:3,y:3,w:58,h:58},params:{},seed:1};
    let differences=0,previous=null,changed=0,restored=true;
    for(const time of [0,.7,1.4]){
      const ca=a.getContext('2d'),cb=b.getContext('2d');ca.clearRect(0,0,64,64);cb.clearRect(0,0,64,64);
      ca.globalAlpha=.5;api.paint(ca,api.generate(manifest.id,1,{...input,time}));restored&&=ca.globalAlpha===.5;
      cb.save();cb.globalAlpha=.3;cb.beginPath();cb.moveTo(3,3);cb.lineTo(61,3);cb.lineTo(32,61);cb.closePath();cb.clip();cb.beginPath();cb.moveTo(32,32);cb.arc(32,32,48,time,time+Math.PI);cb.closePath();cb.fillStyle='#bb4488';cb.fill();cb.restore();
      const pa=ca.getImageData(0,0,64,64).data,pb=cb.getImageData(0,0,64,64).data;
      for(let i=0;i<pa.length;i++){if(pa[i]!==pb[i])differences++;if(previous&&pa[i]!==previous[i])changed++;}
      previous=pa;
    }
    return{differences,changed,restored};
  });
  assert.equal(result.differences,0);assert.ok(result.changed>0);assert.ok(result.restored);
  console.log('✓ 真实Canvas生成器绘制：三时刻圆弧／非矩形路径裁切／Alpha乘算逐通道一致／上下文恢复；非正式双色放射验收');
}finally{await browser.close();}
