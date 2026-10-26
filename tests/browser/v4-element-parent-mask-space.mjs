import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser=await chromium.launch({executablePath:edge,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
  await page.goto(pathToFileURL(resolve(root,'img2asset-v4-classic.html')).href);await page.waitForFunction(()=>window.EditorVNextMaskState?.detach&&typeof classicV4Masks!=='undefined');
  const result=await page.evaluate(async()=>{
    if(state.playing)togglePlay();state.t=0;
    const clone=v=>JSON.parse(JSON.stringify(v)),I=[1,0,0,1,0,0],T=(x,y)=>[1,0,0,1,x,y],mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]],inv=m=>{const d=m[0]*m[3]-m[1]*m[2];return[m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];},pt=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
    const blank=()=>{const s=EditorVNextScene.blank({width:200,height:150});s.background={alpha:0};return s;},rows=[],artifacts=[];
    const tile=document.createElement('canvas');tile.width=24;tile.height=20;const ink=tile.getContext('2d');ink.fillStyle='#ffffff';ink.fillRect(0,0,8,20);ink.fillStyle='#808080';ink.fillRect(8,0,8,20);ink.fillStyle='#000000';ink.fillRect(16,0,8,20);ink.clearRect(0,0,4,5);
    const asset={locator:tile.toDataURL(),mime:'image/png',width:24,height:20};
    let editingScene=null;
    for(const mirror of [false,true])for(const type of ['rect','ellipse','poly','alpha','luma','element'])for(const follow of type==='element'?[false]:[false,true])for(const invert of [false,true]){
      const scene=blank(),outer={id:'outer',type:'group',x:10,y:8,w:100,h:80,rot:-8},parent={id:'parent',type:'group',parentId:'outer',x:12,y:7,w:90,h:70,rot:mirror?-15:25,scaleX:mirror?-1:1.3,scaleY:.8,skewX:12,alpha:.15,anim:{bob:{amount:80,period:1}}};
      const original={id:'owner',type:'rect',parentId:'parent',x:20,y:18,w:64,h:48,rot:12,scaleX:1.1,scaleY:.9,fill:'#ee6633',alpha:.8,anim:{bob:{amount:2,period:2},spin:{speed:5}}};
      // A base-only parent scene is the independent reference for removal of P.
      const baseScene={...scene,entities:[outer,{...parent,anim:undefined}, {...original,anim:undefined}]},frame=ToSampoolRuntimeVNext.modules.frame.create(baseScene,0),P=frame.valuesFor(parent).worldMatrix,B=frame.valuesFor(original).worldMatrix,center=pt(P,[52,42]),x=Math.round(center[0]-20),y=Math.round(center[1]-15);
      const raw=type==='poly'?{type,points:[[x,y],[x+40,y+3],[x+32,y+30],[x+3,y+25]]}:type==='element'?{type,targetId:'matte'}:{type:type==='luma'?'alpha':type,x,y,w:40,h:30};
      if(type==='alpha'||type==='luma'){raw.assetId='matte';raw.mode=type==='luma'?'luma':'alpha';}
      raw.invert=invert;raw.follow=follow;if(follow)raw.followMatrix=B;original.effects={mask:raw};scene.assets={matte:clone(asset)};
      scene.entities=[outer,parent,original,{id:'matte',type:'ellipse',x,y,w:40,h:30,fill:'#ffffff'}];
      const before=JSON.stringify(scene),key=EditorV4ElementPresets.add(scene,'owner'),bundle=await EditorV4Resources.capture(scene,[{kind:'element',id:key}]),target=blank();await EditorV4Resources.importInto(target,bundle);
      const placed=EditorV4ElementPresets.instantiate(target,key,{x:80,y:60}),project=await EditorVNextProjectPackage.build(target),opened=(await EditorVNextProjectPackage.restore(project.files)).scene;
      opened.runtimeAssets=await EditorVNextAssetLoader.resolve(opened,{referencedOnly:true});
      const plain=clone(opened);plain.entities=[clone(opened.entities[0])];plain.entities[0].effects.mask=null;plain.runtimeAssets={};
      const bodyPlayer=ToSampoolRuntimeVNext.createRuntime(plain),player=ToSampoolRuntimeVNext.createRuntime(opened),body=document.createElement('canvas'),actual=document.createElement('canvas'),oracle=document.createElement('canvas');oracle.width=200;oracle.height=150;
      let maxDifference=0,different=0,nonempty=true,atZero;
      for(const time of [0,.5,1.25]){
        bodyPlayer.renderTo(body,time);player.renderTo(actual,time);if(!time)atZero=actual.toDataURL();
        const M=ToSampoolRuntimeVNext.modules.frame.create(plain,time).valuesFor(plain.entities[0]).worldMatrix,A=follow?mul(M,inv(B)):mul(T(60,42),inv(P));
        // Match the Runtime's native clip backend, not its coordinate code:
        // DOM Canvas and OffscreenCanvas rasterize clip edges differently.
        const reference=new OffscreenCanvas(200,150),out=reference.getContext('2d');
        if(type==='alpha'||type==='luma'||type==='element'){
          const matte=document.createElement('canvas');matte.width=200;matte.height=150;const c=matte.getContext('2d');c.transform(...A);
          if(type==='element'){c.fillStyle='#ffffff';c.beginPath();c.ellipse(x+20,y+15,20,15,0,0,Math.PI*2);c.fill();}
          else{c.drawImage(tile,x,y,40,30);if(type==='luma'){const d=c.getImageData(0,0,200,150);for(let i=0;i<d.data.length;i+=4)d.data[i+3]=Math.round((d.data[i]*.2126+d.data[i+1]*.7152+d.data[i+2]*.0722)*d.data[i+3]/255);c.putImageData(d,0,0);}}
          out.drawImage(body,0,0);out.globalCompositeOperation=invert?'destination-out':'destination-in';out.drawImage(matte,0,0);out.globalCompositeOperation='source-over';
        }else{
          if(invert)out.drawImage(body,0,0);out.save();out.transform(...A);out.beginPath();
          if(type==='ellipse')out.ellipse(x+20,y+15,20,15,0,0,Math.PI*2);else if(type==='poly'){raw.points.forEach((p,i)=>i?out.lineTo(...p):out.moveTo(...p));out.closePath();}else out.rect(x,y,40,30);
          out.clip();out.setTransform(1,0,0,1,0,0);if(invert)out.clearRect(0,0,200,150);else out.drawImage(body,0,0);out.restore();
        }
        const display=oracle.getContext('2d');display.clearRect(0,0,200,150);display.drawImage(reference,0,0);
        const a=actual.getContext('2d').getImageData(0,0,200,150).data,b=out.getImageData(0,0,200,150).data;nonempty=nonempty&&a.some((n,i)=>i%4===3&&n>0);
        // Straight RGB at Alpha≈0 is not a visible colour error: compare Alpha
        // and premultiplied RGB, retaining a strict two-level channel bound.
        for(let i=0;i<a.length;i++){const alpha=(i&~3)+3,delta=i%4===3?Math.abs(a[i]-b[i]):Math.abs(Math.round(a[i]*a[alpha]/255)-Math.round(b[i]*b[alpha]/255));maxDifference=Math.max(maxDifference,delta);if(delta)different++;}
      }
      bodyPlayer.dispose();player.dispose();
      rows.push({name:[mirror,type,follow,invert].join('-'),maxDifference,different,nonempty,unchanged:JSON.stringify({...scene,elementPresets:undefined})===before,parentless:opened.entities.every(e=>e.type!=='group'&&!e.parentId)});
      if(!mirror&&!follow&&!invert){delete opened.runtimeAssets;ToSampoolV4Workspace.replace(opened);const artifact=await currentV4TestArtifact();artifacts.push({html:artifact.data,atZero});if(type==='rect')editingScene=clone(opened);}
    }
    window.__parentMaskEditing=editingScene;
    return{rows,artifacts};
  });
  // Exact equality is preferred; any antialiased-boundary differences are reported.
  const failures=result.rows.filter(r=>r.maxDifference>2||!r.nonempty||!r.unchanged||!r.parentless);
  assert.equal(failures.length,0,'independent full-canvas oracle: '+JSON.stringify(failures.slice(0,2)));
  const exported=await browser.newPage();exported.on('pageerror',e=>errors.push(e.stack||String(e)));
  for(const item of result.artifacts){await exported.evaluate(()=>window.requestAnimationFrame=()=>0);await exported.setContent(item.html);await exported.waitForFunction(()=>document.querySelector('[data-tosampool-ready="1"], [data-tosampool-error]'));assert.equal(await exported.locator('[data-tosampool-error]').count(),0);assert.equal(await exported.locator('canvas').evaluate(c=>c.toDataURL()),item.atZero);}
  await exported.close();
  const edit=await page.evaluate(async()=>{
    ToSampoolV4Workspace.replace(window.__parentMaskEditing);state.t=0;classicV4Changes.clear();const scene=ToSampoolV4Workspace.current(),owner=scene.entities[0];classicV4View.select(owner.id);await classicV4View.render();classicV4Masks.begin({scope:'object',ownerId:owner.id});
    const mask=owner.effects.mask,A=ToSampoolRuntimeVNext.modules.masks.placementMatrix(mask,owner,ToSampoolRuntimeVNext.modules.frame.create(scene,0)),rect=classicV4Masks.overlay.getBoundingClientRect(),point=(x,y)=>({x:rect.left+(A[0]*x+A[2]*y+A[4])*rect.width/scene.width,y:rect.top+(A[1]*x+A[3]*y+A[5])*rect.height/scene.height});
    const corner=[A[0]*mask.x+A[2]*mask.y+A[4],A[1]*mask.x+A[3]*mask.y+A[5]],ctx=classicV4Masks.overlay.getContext('2d');let green=false;
    for(let y=Math.round(corner[1])-3;y<=Math.round(corner[1])+3;y++)for(let x=Math.round(corner[0])-3;x<=Math.round(corner[0])+3;x++){if(x<0||y<0||x>=scene.width||y>=scene.height)continue;const c=ctx.getImageData(x,y,1,1).data;if(c[1]>170&&c[0]<110&&c[2]>70)green=true;}
    const c=document.createElement('canvas'),p=ToSampoolRuntimeVNext.createRuntime(scene);p.renderTo(c,0);window.__parentMaskBefore=c.toDataURL();p.dispose();window.__parentMaskStored=JSON.stringify(mask);
    return{green,from:point(mask.x+mask.w/2,mask.y+mask.h/2),to:point(mask.x+mask.w/2+4,mask.y+mask.h/2-3),id:owner.id};
  });
  assert.equal(edit.green,true,'green overlay uses actual affine geometry');
  await page.mouse.move(edit.from.x,edit.from.y);await page.mouse.down();await page.mouse.move(edit.to.x,edit.to.y,{steps:4});await page.mouse.up();
  const moved=await page.evaluate(id=>{const mask=ToSampoolV4Workspace.current().entities.find(e=>e.id===id).effects.mask,before=JSON.parse(window.__parentMaskStored);classicV4Changes.undo();const c=document.createElement('canvas'),p=ToSampoolRuntimeVNext.createRuntime(ToSampoolV4Workspace.current());p.renderTo(c,0);const restored=c.toDataURL()===window.__parentMaskBefore;p.dispose();classicV4Masks.end(false);return{dx:mask.x-before.x,dy:mask.y-before.y,basis:JSON.stringify(mask.geometryMatrix)===JSON.stringify(before.geometryMatrix),restored};},edit.id);
  assert.ok(Math.abs(moved.dx-4)<.2&&Math.abs(moved.dy+3)<.2,JSON.stringify(moved));assert.ok(moved.basis&&moved.restored);
  const old=await browser.newPage();await old.setContent('<script>window.ToSampoolRuntimeVNext={createRuntime(){},modules:{masks:{},renderer:{referenceSources:true}}};</script>'+result.artifacts[0].html);await old.waitForFunction(()=>document.querySelector('[data-tosampool-error]'));assert.match(await old.locator('[data-tosampool-error]').getAttribute('data-tosampool-error'),/不支持蒙版几何坐标/);await old.close();
  assert.deepEqual(errors,[]);console.log('✓ RC2-c2b浏览器：'+result.rows.length+'组嵌套／镜像父变换，独立Canvas蒙版参考（最大通道差'+Math.max(...result.rows.map(r=>r.maxDifference))+'）、工程／正式HTML、绿色轮廓／实际拖动／撤销及旧Player门禁');
}finally{await browser.close();}
