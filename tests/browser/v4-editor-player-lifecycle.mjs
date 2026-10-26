import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href+'?editor-player-lifecycle=1');
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&document.querySelector('#v4-classic-stage'));
  await page.evaluate(()=>{
    const original=EditorVNextRuntimeAdapter,records=[],textures=new Set(),contexts=new WeakSet();
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      const gl=getContext.call(this,type,...args);
      if(type==='webgl2'&&gl&&!contexts.has(gl)){
        contexts.add(gl);const create=gl.createTexture.bind(gl),remove=gl.deleteTexture.bind(gl);
        gl.createTexture=()=>{const value=create();if(value)textures.add(value);return value;};
        gl.deleteTexture=value=>{textures.delete(value);return remove(value);};
      }
      return gl;
    };
    window.EditorVNextRuntimeAdapter=Object.freeze({...original,create(...args){
      const actual=original.create(...args),record={disposed:0};records.push(record);
      return Object.freeze({...actual,dispose(){record.disposed++;actual.dispose();}});
    }});
    window.__lifecycle={records,textures};
    ToSampoolV4Workspace.releasePlayer();
    const scene=EditorVNextScene.blank({width:160,height:90,loop:2});
    scene.entities=[{id:'a',type:'rect',x:5,y:5,w:30,h:30,fill:'#ff7700'},{id:'b',type:'rect',x:70,y:5,w:30,h:30,fill:'#0077ff'}];
    scene.sceneEffects.sample={controllers:{'sampling-grid':{size:2}},threshold:{enabled:true,threshold:.5,dark:'#000000',light:'#ffffff'}};
    ToSampoolV4Workspace.replace(scene);classicV4View.scheduleRender('lifecycle-fixture');
  });
  await page.waitForSelector('[data-v4-entity-id="a"] [data-v4-action="isolate"]');
  // Visible editor interaction exercises the temporary isolated Player path.
  await page.click('[data-v4-entity-id="a"] [data-v4-action="isolate"]');
  await page.waitForFunction(()=>classicV4View.isolatedId==='a'&&__lifecycle.records.some(record=>record.disposed===1));
  await page.click('[data-v4-entity-id="a"] [data-v4-action="isolate"]');
  await page.waitForFunction(()=>classicV4View.isolatedId===null);
  const result=await page.evaluate(async()=>{
    const ws=ToSampoolV4Workspace,rows=[],history=[],canvas=document.createElement('canvas');
    classicV4Changes.run('生命周期测试位移',scene=>{scene.entities[0].x=23;});
    await ws.createPlayer();
    classicV4Changes.undo();history.push(ws.current().entities[0].x);
    await ws.createPlayer();
    classicV4Changes.redo();history.push(ws.current().entities[0].x);
    for(let index=0;index<4;index++){
      ws.mutate(scene=>{scene.width=160+index*8;scene.entities[0].x=5+index;});
      const stats=await ws.renderTo(canvas,.25,{preview:{sceneBackend:'gpu-experimental'}});
      if(stats.sceneBackend!=='gpu')throw Error('Expected experimental GPU: '+stats.sceneGpu?.reason);
      const allocated=__lifecycle.textures.size;
      ws.releasePlayer();rows.push({backend:stats.sceneBackend,allocated,afterRelease:__lifecycle.textures.size});
      const snapshot=JSON.parse(JSON.stringify(ws.current()));ws.replace(snapshot);
    }
    await classicV4View.render();
    classicV4View.stop();
    return{rows,history,created:__lifecycle.records.length,disposed:__lifecycle.records.filter(record=>record.disposed===1).length,duplicateDisposals:__lifecycle.records.filter(record=>record.disposed>1).length,liveTextures:__lifecycle.textures.size};
  });
  assert.ok(result.rows.every(row=>row.allocated>0&&row.afterRelease===0));
  assert.equal(result.created,result.disposed);assert.equal(result.duplicateDisposals,0);assert.equal(result.liveTextures,0);
  assert.deepEqual(result.history,[5,23]);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
