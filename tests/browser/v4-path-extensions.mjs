import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>p&&existsSync(p));
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument);
  await page.evaluate(()=>{
    if(state.playing)togglePlay();ToSampoolV4Workspace.createBlank({width:320,height:240,loop:4});
    ToSampoolV4Workspace.mutate(scene=>scene.entities=[{id:'owner',name:'拓展验证',type:'vector',x:100,y:90,w:80,h:60,parts:[{id:'A',name:'矩形 A',type:'rect',x:0,y:0,w:80,h:60,fill:null,stroke:'#ffd23f',strokeWidth:2}]}]);classicV4View.select('owner');
  });
  const field=key=>page.locator('#inspector-context [data-extension-param="'+key+'"]');
  await page.locator('[data-path-extension-entry]').click();await field('ticks.enabled').check();
  assert.deepEqual(await page.locator('#element-inspector-tabs [data-element-inspector]').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.textContent)),['成样','拓展']);
  assert.equal(await page.locator('#inspector-context [data-path-extension-back]').count(),0,'不得保留页内重复Tab');
  assert.equal(await field('ticks.count').inputValue(),'24');
  await field('ticks.count').fill('12');await field('ticks.count').press('Tab');
  await field('ticks.major.enabled').check();assert.equal(await field('ticks.major.every').count(),1);
  await field('ticks.variation.enabled').check();await field('ticks.variation.type').selectOption('digits');
  await field('ticks.variation.digits').fill('1595');await field('ticks.variation.digits').press('Tab');
  await field('nested.enabled').check();await field('nested.direction').selectOption('out');await field('nested.method').selectOption('offset');
  await field('nested.spacing').fill('8');await field('nested.spacing').press('Tab');
  const check=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,scene=ToSampoolV4Workspace.current(),owner=scene.entities[0],part=owner.parts[0],before=JSON.stringify([owner.x,owner.y,owner.w,owner.h,part.x,part.y,part.w,part.h]),
      values=runtime.modules.frame.create(scene,0).valuesFor(owner),bounds=runtime.modules.content.localBounds(owner,values,{time:0});
    const render=effect=>{const s=JSON.parse(JSON.stringify(scene));delete s.timeline;s.background={alpha:0};if(effect)s.entities[0].effects={decorate:{'tint-overlay':{enabled:true,color:'#ffffff',alpha:0}}};const c=document.createElement('canvas'),p=runtime.createRuntime(s);p.renderTo(c,0);p.dispose();return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);};
    const plain=render(false),capsule=render(true),hit=EditorVNextCanvasHit.pickPart(scene,owner,140,57,0);
    const scan=data=>{let sum=0,left=320,top=240,right=-1,bottom=-1;for(let i=3;i<data.length;i+=4)if(data[i]){const x=(i>>2)%320,y=Math.floor((i>>2)/320);sum+=data[i];left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return{sum,left,top,right,bottom};};
    let alphaDiff=0,rgbDiff=0,opaqueRgbDiff=0;for(let i=0;i<plain.length;i++)if(plain[i]!==capsule[i]){if(i%4===3)alphaDiff++;else{rgbDiff++;if(plain[(i>>2)*4+3]>128)opaqueRgbDiff=Math.max(opaqueRgbDiff,Math.abs(plain[i]-capsule[i]));}}
    return{bounds,extensions:part.extensions,geometry:runtime.modules.pathExtensions.build(part,runtime.modules.pathGeometry.full(part)).status,plain:scan(plain),capsule:scan(capsule),alphaDiff,rgbDiff,opaqueRgbDiff,hit:hit?.id,stable:before===JSON.stringify([owner.x,owner.y,owner.w,owner.h,part.x,part.y,part.w,part.h])};
  });
  assert.ok(check.bounds.x<-30&&check.bounds.y<-30,'拓展应扩大离屏／对象边界 '+JSON.stringify(check));
  assert.equal(check.alphaDiff,0,'胶囊必须保留全部拓展Alpha：'+JSON.stringify(check));assert.deepEqual(check.plain,check.capsule);
  // Canvas transparent-surface round trips can round premultiplied RGB; do not
  // confuse that with clipped geometry. Alpha is checked byte-for-byte above.
  assert.ok(check.opaqueRgbDiff<=2,JSON.stringify(check));assert.equal(check.hit,'A');assert.ok(check.stable);
  await field('nested.count').fill('5');await field('nested.count').press('Tab');await page.evaluate(()=>classicV4Changes.undo());assert.equal(await field('nested.count').inputValue(),'4');
  await page.locator('[data-path-extension-back]').click();
  await page.evaluate(()=>classicV4Timeline.seek(.5));await page.locator('#btn-timing-mode').click();
  const timeline=await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().timeline));
  await page.locator('[data-element-inspector="extensions"]').click();assert.equal(await page.locator('#btn-timing-mode').isVisible(),false);
  await field('ticks.count').fill('16');await field('ticks.count').press('Tab');
  assert.equal(await page.evaluate(()=>JSON.stringify(ToSampoolV4Workspace.current().timeline)),timeline,'拓展不应写入参数时序');
  assert.equal(await page.evaluate(()=>ToSampoolV4Workspace.current().entities[0].parts[0].extensions.ticks.count),16);
  const html=await page.evaluate(async()=>{
    const packed=await EditorVNextProjectPackage.build(ToSampoolV4Workspace.current()),restored=(await EditorVNextProjectPackage.restore(packed.files)).scene;
    if(restored.entities[0].parts[0].extensions.ticks.count!==16)throw Error('工程恢复丢失拓展');
    return EditorVNextDeliveryBuilder.embedHtml({scene:restored,name:'extensions',runtimeSource:window.__TOSAMPOOL_RUNTIME_VNEXT_SOURCE__}).data;
  });
  const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(String(e)));await exported.setContent(html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"]'));await exported.close();
  await page.locator('[data-path-extension-back]').click();await page.evaluate(()=>classicV4View.select('owner'));await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');
  const copied=await page.evaluate(()=>ToSampoolV4Workspace.current().entities.map(e=>e.parts?.[0]?.extensions?.ticks?.count));
  assert.deepEqual(copied,[16,16],'对象复制粘贴应完整继承拓展');await page.evaluate(()=>classicV4Changes.undo());
  await page.evaluate(()=>{ToSampoolV4Workspace.mutate(scene=>scene.entities[0].parts.push({id:'B',name:'椭圆 B',type:'ellipse',x:100,y:0,w:40,h:40,fill:'#60c8c0'}));classicV4View.select('owner');});
  await page.locator('[data-path-extension-entry]').click();assert.equal(await field('ticks.enabled').count(),0,'多图元不得默认应用全体');
  await page.locator('#inspector-context select').selectOption('B');await field('ticks.enabled').check();
  const isolated=await page.evaluate(()=>({selection:classicV4View.selectedPartId,counts:ToSampoolV4Workspace.current().entities[0].parts.map(p=>p.extensions.ticks.count)}));
  assert.equal(isolated.selection,'B');assert.deepEqual(isolated.counts,[16,24]);
  const fillChecks=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,ink=entity=>{
      const canvas=document.createElement('canvas'),player=runtime.createRuntime({format:'tosampool-scene/v4',width:180,height:180,background:{alpha:0},entities:[entity]});
      player.renderTo(canvas,0);player.dispose();return canvas.getContext('2d').getImageData(0,0,180,180).data.reduce((sum,v,i)=>sum+(i%4===3?v:0),0);
    },base={id:'native',type:'rect',x:50,y:50,w:60,h:60,fill:null,extensions:{showSource:false,nested:{enabled:true,count:2,direction:'out',method:'offset',spacing:10,style:'fill',color:'#ffd23f'}}},result={};
    for(const style of ['fill','bands']){
      const entity={...base,fillReveal:'center',extensions:{...base.extensions,nested:{...base.extensions.nested,style}}};
      result[style]=[0,25,100].map(strokeCompletion=>ink({...entity,strokeCompletion}));
      result[style+'Keep']=ink({...entity,fillReveal:'none',strokeCompletion:0})===ink({...entity,fillReveal:'none',strokeCompletion:100});
    }
    const doc={entities:[JSON.parse(JSON.stringify(base))]};EditorVNextPartsState.promote(doc,'native');result.promoted=doc.entities[0].parts[0].extensions.nested.enabled&&!doc.entities[0].extensions;
    const ticks={...base,extensions:{showSource:false,ticks:{enabled:true,count:12,alpha:0}}};result.alphaZero=ink(ticks);result.alphaFull=ink({...ticks,extensions:{...ticks.extensions,ticks:{...ticks.extensions.ticks,alpha:1}}});
    return result;
  });
  for(const style of ['fill','bands']){assert.equal(fillChecks[style][0],0);assert.ok(fillChecks[style][1]>0&&fillChecks[style][1]<fillChecks[style][2]);assert.ok(fillChecks[style+'Keep']);}
  assert.ok(fillChecks.promoted);assert.equal(fillChecks.alphaZero,0);assert.ok(fillChecks.alphaFull>0);
  const capture=await page.evaluate(()=>{
    const runtime=ToSampoolRuntimeVNext,sheet=document.createElement('canvas');sheet.width=960;sheet.height=600;const ctx=sheet.getContext('2d');ctx.fillStyle='#151a22';ctx.fillRect(0,0,960,600);
    const examples=[
      ['ticks / major',{type:'ellipse',x:0,y:0,w:140,h:140,fill:null,stroke:'#ffd23f',strokeWidth:1,extensions:{ticks:{enabled:true,count:48,length:8,major:{enabled:true,every:4,length:2,width:2}}}}],
      ['ticks / digit rhythm',{type:'ellipse',x:0,y:0,w:140,h:140,fill:null,extensions:{ticks:{enabled:true,count:96,length:18,color:'#60c8c0',variation:{enabled:true,type:'digits',digits:'15951955',cycles:4,amplitude:.8}}}}],
      ['nested / rotate',{type:'rect',x:0,y:0,w:140,h:140,fill:null,stroke:'#ffd23f',strokeWidth:1,extensions:{nested:{enabled:true,count:8,scaleStep:.09,rotation:5,color:'#ffd23f'}}}],
      ['nested / offset',{type:'poly',polygonMode:'regular',sides:6,x:0,y:0,w:130,h:130,fill:null,stroke:'#60c8c0',strokeWidth:2,extensions:{nested:{enabled:true,method:'offset',count:4,spacing:12,color:'#60c8c0'}}}],
      ['pencil / ticks',{type:'stroke',points:[[0,110],[35,55],[70,85],[110,20],[160,50]],stroke:'#ffd23f',strokeWidth:2,smoothing:80,extensions:{ticks:{enabled:true,count:32,length:12,color:'#60c8c0'}}}],
      ['nested / outer',{type:'rect',x:0,y:0,w:80,h:60,radius:8,fill:null,stroke:'#ffd23f',strokeWidth:2,extensions:{nested:{enabled:true,method:'offset',direction:'out',count:4,spacing:10,color:'#ffd23f'}}}]
    ];
    examples.forEach(([title,part],i)=>{const tile=document.createElement('canvas'),s={format:'tosampool-scene/v4',width:300,height:250,background:{alpha:0},entities:[{id:'owner',type:'vector',x:75,y:60,w:160,h:140,parts:[{id:'A',...part}]}]},p=runtime.createRuntime(s);p.renderTo(tile,0);p.dispose();const x=i%3*320,y=Math.floor(i/3)*300;ctx.fillStyle='#fff';ctx.font='15px monospace';ctx.fillText(title,x+16,y+25);ctx.drawImage(tile,x,y+35);});return sheet.toDataURL();
  });
  if(process.argv.includes('--capture'))writeFileSync(resolve(root,'docs/architecture/v4-path-extensions.png'),Buffer.from(capture.split(',')[1],'base64'));
  assert.deepEqual(errors,[]);
  console.log('✓ 图元拓展浏览器：单图元入口／渐进参数／真实绘制／胶囊不裁切／扩框命中／撤销／基础写入隔离／工程与HTML／复制粘贴／多图元目标隔离通过');
}finally{await browser.close();}
