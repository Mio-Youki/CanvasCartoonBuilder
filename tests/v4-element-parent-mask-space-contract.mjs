import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const ctx=vm.createContext({TextEncoder,TextDecoder,Buffer,crypto:webcrypto});
for(const file of ['home-scene-vnext.js','editor/effect-registry-vnext.js','editor/vnext-scene.js','editor/vnext-mask-state.js','editor/v4-element-references.js','editor/v4-element-presets.js','editor/v4-resource-core.js','editor/vnext-project-package.js'])new vm.Script(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{filename:file}).runInContext(ctx);
const plain=v=>JSON.parse(JSON.stringify(v)),api=ctx.EditorV4ElementPresets,state=ctx.EditorVNextMaskState,runtime=ctx.ToSampoolRuntimeVNext;
const I=[1,0,0,1,0,0],T=(x,y)=>[1,0,0,1,x,y];
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const inv=m=>{const d=m[0]*m[3]-m[1]*m[2];return[m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];};
const point=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8,`${a} differs from ${b}`));
// Independently compose the authored parent using elementary matrices.
function authored(e){const w=Math.max(1,Math.round(e.w||1)),h=Math.max(1,Math.round(e.h||1)),p=e.pivot?.mode==='custom'?[w*e.pivot.x,h*e.pivot.y]:[w/2,h/2],r=(e.rot||0)*Math.PI/180,kx=Math.tan((e.skewX||0)*Math.PI/180),ky=Math.tan((e.skewY||0)*Math.PI/180);return [T(Math.round(e.x||0)+p[0],Math.round(e.y||0)+p[1]),[Math.cos(r),Math.sin(r),-Math.sin(r),Math.cos(r),0,0],[e.scaleX??1,0,0,e.scaleY??1,0,0],[1+kx*ky,ky,kx,1,0,0],T(-p[0],-p[1])].reduce(mul,I);}
const variants=[{x:20,y:10},{x:20,y:10,rot:35},{x:20,y:10,scaleX:2,scaleY:.5},{x:20,y:10,scaleX:-1,scaleY:1.4},{x:20,y:10,skewX:22,skewY:-10},{x:20,y:10,rot:-25,skewX:15,scaleX:1.3,scaleY:.8}];
const asset={locator:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#808080"/></svg>'),width:8,height:8,mime:'image/svg+xml'};
for(const variant of variants)for(const type of ['rect','ellipse','poly','alpha','element'])for(const follow of type==='element'?[false]:[false,true]){
  const scene=ctx.EditorVNextScene.blank({width:200,height:120}),outer={id:'outer',type:'group',x:8,y:5,w:80,h:60,rot:10},parent={id:'parent',type:'group',parentId:'outer',w:50,h:40,...variant,alpha:.2,anim:{bob:{amount:70,period:1}}};
  const owner={id:'owner',type:'rect',parentId:'parent',x:7,y:9,w:40,h:30,rot:12,alpha:.8,scaleX:1.1,fill:'#cc6622',anim:{bob:{amount:3,period:2}}};
  const P=mul(authored(outer),authored(parent)),B=mul(P,authored(owner));
  const mask=type==='poly'?{type,points:[[24,18],[48,18],[40,36]]}:type==='element'?{type,targetId:'matte'}:{type,x:24,y:18,w:24,h:18,...(type==='alpha'?{assetId:'matte',mode:'luma'}:{})};
  mask.follow=follow;if(follow)mask.followMatrix=B;owner.effects={mask};
  scene.entities=[outer,parent,owner,{id:'matte',type:'ellipse',x:24,y:18,w:24,h:18,fill:'#ffffff'}];scene.assets={matte:plain(asset)};
  scene.timeline.tracks.parent={segments:[{f:[0,1],values:{scaleX:0,x:500}}]};
  const before=JSON.stringify(scene),key=api.add(scene,'owner'),preset=scene.elementPresets[key];assert.equal(JSON.stringify({...scene,elementPresets:undefined}),before);
  near(plain(state.parentBaseMatrix(scene,owner)),P);assert.equal(preset.root.alpha,.8);assert.equal(preset.root.rot,12);assert.equal(preset.root.parentId,undefined);
  const noParentMotion=plain(scene);delete noParentMotion.entities[1].anim;noParentMotion.entities[1].alpha=0;noParentMotion.timeline={tracks:{}};
  assert.deepEqual(plain(api.capture(noParentMotion,'owner')),plain(preset),'父组动态、透明度、时序不可影响素材快照');
  const pack=await ctx.EditorV4Resources.capture(scene,[{kind:'element',id:key}]),target=ctx.EditorVNextScene.blank({width:200,height:120});await ctx.EditorV4Resources.importInto(target,pack);
  const placed=api.instantiate(target,key,{x:60,y:40}),frame=runtime.modules.frame.create(target,.5),shape=placed.effects.mask;
  const C=mul(T(-7,-9),inv(P)),raw=type==='poly'?mask.points[0]:[24,18],shifted=[raw[0]-7+60,raw[1]-9+40];
  const expected=follow?point(mul(frame.valuesFor(placed).worldMatrix,inv(B)),raw):point(mul(T(60,40),C),raw);
  near(point(plain(runtime.modules.masks.placementMatrix(shape,placed,frame)),shifted),expected);
  if(follow)near(shape.followMatrix,mul(T(60,40),mul(C,B)));
  assert.equal(target.entities.some(e=>e.type==='group'),false);
  const recaptured=api.capture(target,placed.id),newTarget=ctx.EditorVNextScene.blank();newTarget.assets=plain(target.assets);newTarget.elementPresets={copy:recaptured};const again=api.instantiate(newTarget,'copy',{x:60,y:40});
  const againFrame=runtime.modules.frame.create(newTarget,.5);near(point(plain(runtime.modules.masks.placementMatrix(again.effects.mask,again,againFrame)),shifted),expected);
  const project=await ctx.EditorVNextProjectPackage.build(target),opened=(await ctx.EditorVNextProjectPackage.restore(project.files)).scene;assert.deepEqual(plain(opened.entities[0].effects.mask),plain(shape));
}
const invalid=ctx.EditorVNextScene.blank();invalid.entities=[{id:'g',type:'group',scaleX:0},{id:'e',type:'rect',parentId:'g',x:0,y:0,w:10,h:10,effects:{mask:{type:'rect',x:0,y:0,w:10,h:10}}}];const before=JSON.stringify(invalid);
assert.throws(()=>api.add(invalid,'e'),/不可逆/);assert.equal(JSON.stringify(invalid),before);
invalid.entities[0].scaleX=1;invalid.entities[0].parentId='g';assert.throws(()=>api.add(invalid,'e'),/循环/);
for(const geometryMatrix of [null,[1,0,0,0,0,0],[1,0,0,1,Infinity,0]])assert.throws(()=>state.portable({type:'rect',x:0,y:0,w:1,h:1,geometryMatrix}),/矩阵无效/);
assert.throws(()=>runtime.modules.masks.placementMatrix({geometryMatrix:[0,0,0,0,0,0]},null,null),/矩阵无效/);
console.log('✓ RC2-c2b：六类父变换×嵌套组×五类蒙版／跟随；独立矩阵及点对照、父动态与时序剥离、重捕获／工程往返、奇异／循环原子拒绝');
