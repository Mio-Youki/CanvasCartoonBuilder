import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync),browser=await chromium.launch({executablePath,headless:true});
function probe(){
 const rt=ToSampoolRuntimeVNext,definition=rt.modules.dualRayPattern.definition,defaults=Object.fromEntries(definition.parameters.map(p=>[p.key,p.default])),rows=[];
 for(const mode of ['bob','threshold','tint','dots','dual-ray']){
  const motion={enabled:true,period:1,steps:2,periodFrames:2,stepped:true,curve:'linear',amount:.3},entity={id:'a',type:'rect',x:4,y:4,w:48,h:32,fill:'#808080'},scene={format:'tosampool-scene/v4',width:64,height:40,loop:2,background:{color:'#ffffff',alpha:0},entities:[entity]};
  if(mode==='bob')entity.anim={bob:{...motion,amount:4,angle:0}};
  if(mode==='threshold')scene.sceneEffects={sample:{threshold:{enabled:true,threshold:.5,dark:'#000000',light:'#ffffff',motion:{...motion,type:'threshold-pulse'}}}};
  if(mode==='tint')entity.effects={decorate:{'tint-overlay':{enabled:true,color:'#ff0000',alpha:1,blend:'normal',motion:{...motion,type:'fade',amount:1}}}};
  if(mode==='dots')entity.effects={sample:{halftone:{enabled:true,size:4,shape:'circle',threshold:.65,contrast:.75,rowOffset:0,motion:{...motion,type:'dot-drift'}}}};
  if(mode==='dual-ray')Object.assign(entity,{type:'vector',parts:[{id:'p',type:'custom',x:0,y:0,w:48,h:32,recipe:{id:definition.id,version:definition.version,definition,params:{...defaults,pairs:3,period:1,stepped:true,periodFrames:2,curve:'linear',ratio:.4}}}]});
  const player=rt.createRuntime(scene),canvas=document.createElement('canvas');canvas.getContext('2d',{willReadFrequently:true});
  const pixels=t=>{player.renderTo(canvas,t);return canvas.getContext('2d').getImageData(0,0,64,40).data.slice();},different=(a,b)=>a.some((v,i)=>v!==b[i]);
  try{const a=pixels(.1),hold=pixels(.2),b=pixels(.6),loop=pixels(1.1);rows.push({mode,changes:different(a,b),holds:!different(a,hold),loops:!different(a,loop),loopDifferences:a.reduce((n,v,i)=>n+(v!==loop[i]),0),loopMax:a.reduce((n,v,i)=>Math.max(n,Math.abs(v-loop[i])),0),samePlan:mode==='dual-ray'?JSON.stringify(rt.modules.customShapes.custom(player.scene.entities[0].parts[0],.1))===JSON.stringify(rt.modules.customShapes.custom(player.scene.entities[0].parts[0],1.1)):true,signature:[a,b].map(data=>Array.from(data).reduce((h,v)=>Math.imul(h^v,16777619)>>>0,2166136261))});}finally{player.dispose();}
 }
 return rows;
}
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('about:blank');await page.addScriptTag({path:resolve(root,'home-scene-vnext.js')});
 const real=await page.evaluate(probe);for(const row of real){assert.ok(row.changes,row.mode+' two-frame must change');assert.ok(row.holds,row.mode+' held frame');assert.ok(row.loops,row.mode+' loop closure '+JSON.stringify(row));}
 const other=await browser.newPage();await other.goto('about:blank');const inline=readFileSync(resolve(root,'runtime-vnext-inline.js'),'utf8');await other.addScriptTag({content:inline});await other.evaluate(()=>{(0,eval)(window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__);});assert.deepEqual(await other.evaluate(probe),real,'导出内联Runtime必须得到相同真实像素');await other.close();
 await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>typeof classicV4Inspector!=='undefined');
 await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:64,height:40});classicV4Changes.run('阈值逐帧',s=>{s.entities=[{id:'a',type:'rect',x:0,y:0,w:64,h:40,fill:'#808080'}];const c=EditorVNextEffectState.enable(s,{scope:'object',ownerId:'a',effectId:'threshold'});c.motion={enabled:true,type:'threshold-pulse',stepped:true,steps:2,period:1,amount:.3,curve:'linear'};});classicV4Inspector.focusEffect('object','a','threshold');});
 const card=page.locator('[data-v4-effect-id="threshold"]');if(!await card.locator('[data-effect-parameter="motion.stepped"]').count())await card.locator('.v4-motion-title-button').click();
 await card.locator('[data-effect-parameter="motion.stepped"]').uncheck();assert.equal(await card.locator('[data-effect-parameter="motion.steps"]').count(),0);await card.locator('[data-effect-parameter="motion.stepped"]').check();assert.equal(+await card.locator('[data-effect-parameter="motion.steps"]').inputValue(),2);
 assert.deepEqual(errors,[]);console.log('✓ motion primitives real pixels:',real,'; editor progressive controls and inline export match');
}finally{await browser.close();}
