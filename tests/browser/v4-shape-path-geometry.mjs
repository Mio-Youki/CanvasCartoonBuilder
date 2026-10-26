import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  const result=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,geometry=runtime.modules.pathGeometry,check=(v,m)=>{if(!v)throw Error(m);};
    const render=(part,effects)=>{const scene={format:'tosampool-scene/v4',width:160,height:120,background:{alpha:0},entities:[{id:'owner',type:'vector',x:20,y:20,w:100,h:80,effects,parts:[{id:'part',x:0,y:0,w:100,h:80,stroke:'#fff',strokeWidth:2,fill:null,...part}]}]},canvas=document.createElement('canvas'),player=runtime.createRuntime(scene);player.renderTo(canvas,0);player.dispose();return canvas.getContext('2d').getImageData(0,0,160,120).data;};
    const ink=data=>data.reduce((sum,v,i)=>sum+(i%4===3?v:0),0),different=(a,b)=>a.some((v,i)=>v!==b[i]);
    const types=[];
    for(const type of ['rect','ellipse','poly','line']){
      const part={type,...(type==='poly'?{polygonMode:'regular',sides:5}:type==='line'?{x:0,y:0,x2:100,y2:80}:{})};
      const amounts=[0,25,50,75,100].map(strokeCompletion=>ink(render({...part,strokeCompletion})));
      check(amounts[0]===0&&amounts[4]>0,'完成度端点错误 '+type);for(let i=1;i<amounts.length;i++)check(amounts[i]>amounts[i-1],'路径长度未递增 '+type);
      const full=geometry.full(part,{x:0,y:0,w:100,h:80}),total=runtime.modules.pathStroke.pathLengths(full.stroke).total,half=geometry.visible({...part,strokeCompletion:50},full.stroke,full.closed).points;
      check(Math.abs(runtime.modules.pathStroke.pathLengths(half).total/total-.5)<.001,'非弧长插值 '+type);
      if(type!=='line')check(different(render({...part,strokeCompletion:25}),render({...part,strokeCompletion:25,pathStart:.5})),'起点不生效 '+type);
      check(JSON.stringify(runtime.modules.pathStroke.bounds({...part,strokeCompletion:0}))===JSON.stringify(runtime.modules.pathStroke.bounds({...part,strokeCompletion:100})),'完成度改变选择边界 '+type);
      types.push({type,amounts});
    }
    const rect=geometry.full({type:'rect',w:100,h:80,radius:10});check(Math.abs(rect.outline[0][0]-50)<1e-9&&rect.outline[0][1]===0,'圆角矩形默认起点不是顶部中点');
    for(const sides of [3,5,6]){
      const part={type:'poly',polygonMode:'regular',sides,fill:'#fff',stroke:null};
      check(geometry.regularPoints(sides).length===sides,'正多边形边数错误');check(different(render(part),render({...part,radius:12})),'正多边形圆角无效 '+sides);
    }
    const filling={type:'rect',fill:'#fff',stroke:null,fillReveal:'center'};
    const filled=[0,25,50,75,100].map(strokeCompletion=>ink(render({...filling,strokeCompletion})));
    check(filled[0]===0&&filled[4]>filled[3]&&filled[3]>filled[2]&&filled[2]>filled[1],'中心展开不正确');
    check(!different(render({type:'rect',fill:'#fff',stroke:null,strokeCompletion:0}),render({type:'rect',fill:'#fff',stroke:null,strokeCompletion:100})),'默认填充被完成度隐藏');
    const free={type:'poly',points:[[0,0],[1,0],[.3,.3],[1,1],[0,1]],fill:'#fff',stroke:null,fillReveal:'center'};
    check(!different(render({...free,strokeCompletion:0}),render({...free,strokeCompletion:100})),'自由凹多边形错误启用中心展开');
    const wave={type:'line',x:0,y:40,x2:100,y2:40,strokeWave:{enabled:true,amplitude:8,wavelength:20,phase:.2,fixEnds:true}},before=JSON.stringify(wave),full=geometry.full(wave);
    check(full===geometry.full(wave),'路径波形未缓存');check(full.stroke[0][0]===0&&full.stroke[0][1]===40&&Math.abs(full.stroke.at(-1)[1]-40)<1e-8,'固定端点无效');
    check(different(render(wave),render({...wave,strokeWave:{enabled:false}})),'路径波形未绘制');check(JSON.stringify(wave)===before,'波形破坏原路径');
    const closedWave=geometry.full({type:'ellipse',w:100,h:80,strokeWave:{enabled:true,amplitude:5,wavelength:17}});check(JSON.stringify(closedWave.stroke[0])===JSON.stringify(closedWave.stroke.at(-1)),'闭合波形断开');
    const silhouettes=[];
    for(const type of ['rect','ellipse','poly']){
      const part={type,x:0,y:0,w:100,h:80,fill:'#fff',stroke:null,...(type==='poly'?{polygonMode:'regular',sides:5}:{}),strokeWave:{enabled:true,amplitude:7,wavelength:24,phase:.17}};
      const actual=render(part),expectedCanvas=document.createElement('canvas');expectedCanvas.width=160;expectedCanvas.height=120;const ec=expectedCanvas.getContext('2d');ec.translate(20,20);geometry.trace(ec,geometry.full(part).stroke,true);ec.fillStyle='#fff';ec.fill();const expected=ec.getImageData(0,0,160,120).data;
      check(!different(actual,expected),'填充未使用完整波形路径 '+type);check(different(actual,render({...part,strokeWave:{enabled:false}})),'填充形状未变化 '+type);
      check(!different(actual,render(part,{decorate:{'tint-overlay':{enabled:true,color:'#fff',alpha:0}}})),'波形填充进入效果胶囊后被裁切 '+type);
      const gradient=render({...part,fillPaint:{type:'linear',angle:0,stops:[{offset:0,color:'#f00',alpha:1},{offset:1,color:'#00f',alpha:1}]}});
      check(!actual.some((v,i)=>i%4===3&&v!==gradient[i]),'渐变填充未沿用同一波形Alpha '+type);
      const pattern=render({...part,fillPattern:{type:'lines',spacing:6,width:2,angle:0,color:'#fff',mode:'replace'}});
      check(ink(pattern)>0&&pattern.every((v,i)=>i%4!==3||v<=actual[i]+1),'纹理溢出波形轮廓 '+type);
      const sweep=render({...part,fillReveal:'center',strokeCompletion:50});check(ink(sweep)>0&&ink(sweep)<ink(actual),'波形中心展开无效 '+type);
      const nativePlayer=runtime.createRuntime({format:'tosampool-scene/v4',width:160,height:120,entities:[{...part,id:'native',x:20,y:20}]}),native=nativePlayer.scene.entities[0],frame=runtime.modules.frame.create(nativePlayer.scene,0),values=frame.valuesFor(native);
      let hits=0;for(let y=1;y<119;y+=3)for(let x=1;x<159;x+=3){const alpha=actual[(y*160+x)*4+3];if(alpha===255){check(geometry.contains(part,{x:0,y:0,w:100,h:80},x-20+.5,y-20+.5,0),'波形填充无法命中 '+type);check(EditorVNextCanvasHit.containsPart(part,x-20+.5,y-20+.5),'图元波形不能点选 '+type);check(EditorVNextCanvasHit.contains(native,values,x+.5,y+.5,frame),'对象波形不能点选 '+type);hits++;}}
      nativePlayer.dispose();
      check(hits>0,'命中测试为空');silhouettes.push(type);
    }
    const strokes=geometry.full({type:'line',x:0,y:0,x2:100000,y2:0,strokeWave:{enabled:true,amplitude:5,wavelength:.5}});check(strokes.stroke.length<=8193,'波形超过点数预算');
    return{types,filled,wavePoints:full.stroke.length,budgetPoints:strokes.stroke.length,waveFills:silhouettes};
  });
  await page.evaluate(()=>{if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:240,height:160,loop:4});classicV4View.select(null);});
  for(const sides of [3,5,6]){
    await page.evaluate(()=>classicV4View.select(null));await page.locator('[data-toolbar-mode="poly"]').click();await page.locator('[data-v4-polygon-preset]').selectOption(String(sides));
    const box=await page.locator('#v4-drawing-preview').boundingBox();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:3});await page.mouse.up();
    assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities.at(-1)?.parts[0]?.sides),sides);
  }
  await page.evaluate(()=>{const scene=ToSampoolV4Workspace.current(),owner=scene.entities.at(-1);classicV4View.selectPart(owner.id,owner.parts[0].id);});
  const control=key=>page.locator('#inspector-context [data-stroke-param="'+key+'"]');
  await control('pathRevealEnabled').check();
  await control('radius').fill('10');await control('radius').press('Tab');await control('fillReveal').selectOption('center');
  await control('strokeCompletion').fill('50');await control('strokeCompletion').press('Tab');
  assert.equal(await control('strokeCompletion').inputValue(),'50');await page.evaluate(()=>classicV4Changes.undo());assert.equal(await control('strokeCompletion').inputValue(),'100');
  assert.equal(await control('strokeWave.enabled').count(),1,'没有描线的封闭填充也必须有波形入口');
  await control('strokeWave.enabled').check();await control('strokeWave.amplitude').fill('8');await control('strokeWave.amplitude').press('Tab');
  await control('strokeWave.enabled').uncheck();assert.equal(await control('strokeWave.amplitude').count(),0);await control('strokeWave.enabled').check();assert.equal(await control('strokeWave.amplitude').inputValue(),'8');
  await page.evaluate(()=>{const owner=ToSampoolV4Workspace.current().entities.at(-1);classicV4Timeline.seek(.4);classicV4Changes.run('图元切段夹具',scene=>{EditorVNextTimelineState.split(scene,owner.id,.2);EditorVNextTimelineState.split(scene,owner.id,.8);});});
  await page.locator('#btn-timing-mode').click();await control('strokeCompletion').fill('0');await control('strokeCompletion').press('Tab');
  await page.evaluate(()=>classicV4Timeline.seek(3.6));await page.locator('#btn-timing-mode').click();await control('strokeCompletion').fill('100');await control('strokeCompletion').press('Tab');
  const lane=await page.locator('#tl-context').boundingBox();await page.mouse.move(lane.x+lane.width*.5,lane.y+lane.height*.5);await page.locator('#tl-linear-toggle').click();await page.evaluate(()=>classicV4Timeline.seek(2));
  assert.equal(Number(await control('strokeCompletion').inputValue()),50,'图元完成度实际UI Linear未联通');
  const html=await page.evaluate(async()=>{const source=ToSampoolV4Workspace.current(),owner=source.entities.at(-1),id=encodeURIComponent(owner.parts[0].id).replace(/\./g,'%2E'),key='partsById.'+id+'.strokeCompletion';
    const scene=structuredClone(source);if(!scene.timeline.tracks[owner.id].segments[1].linearKeys.includes(key))throw Error('UI Linear缺少图元完成度键');
    const p=ToSampoolRuntimeVNext.createRuntime(scene),c=document.createElement('canvas'),sums=[];for(const time of [1.4,2,2.6]){p.renderTo(c,time);sums.push(Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).reduce((n,v,i)=>n+(i%4!==3?v:0),0));}p.dispose();if(new Set(sums).size!==3)throw Error('所属对象轨Linear未驱动画面');
    const packed=await EditorVNextProjectPackage.build(scene),restored=(await EditorVNextProjectPackage.restore(packed.files)).scene;return EditorVNextDeliveryBuilder.embedHtml({scene:restored,name:'shape-path',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;
  });
  const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));await exported.setContent(html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await exported.close();
  assert.deepEqual(errors,[]);console.log('统一图元路径／正多边形圆角／中心展开／静态波形／点数预算／工具／Inspector／撤销／Linear／导出通过',JSON.stringify(result));
}finally{await browser.close();}
