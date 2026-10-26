/* Unified v4 object mask and scene-effect range-mask mutations. */
(function (global) {
  'use strict';

  const TYPES = Object.freeze(['rect', 'ellipse', 'poly', 'shapes', 'alpha', 'element']);
  const PARTICLE_SCOPES = Object.freeze(['particle-emission', 'particle-motion']);
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const positive = (value, fallback) => Math.max(1, finite(value, fallback));
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function normalizeShapes(mask){const contract=global.ToSampoolRuntimeVNext?.modules.maskContract;if(!contract)throw Error('多图形蒙版需要统一蒙版合同');return contract.normalizeShapes(mask);}
  const IDENTITY=Object.freeze([1,0,0,1,0,0]);
  function matrix(value){
    if(!Array.isArray(value)||value.length!==6||!value.every(v=>typeof v==='number'&&Number.isFinite(v))||Math.abs(value[0]*value[3]-value[1]*value[2])<.0000001)throw Error('蒙版几何矩阵无效或不可逆');
    return value.slice();
  }
  function multiply(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
  function inverse(value){const m=matrix(value),d=m[0]*m[3]-m[1]*m[2];return[m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
  const translation=(x,y)=>[1,0,0,1,x,y];
  function setGeometry(mask,value){
    const normalized=matrix(value).map(v=>Math.abs(v-Math.round(v))<1e-12?Math.round(v):v);
    if(normalized.every((v,i)=>v===IDENTITY[i]))delete mask.geometryMatrix;else mask.geometryMatrix=normalized;
  }

  function entity(scene, id) {
    const found = (scene && scene.entities || []).find(item => item && item.id === id);
    if (!found) throw new Error(`找不到蒙版对象「${id || '(空)'}」`);
    return found;
  }
  function particleRange(options) { return PARTICLE_SCOPES.includes(options && options.scope); }
  function particleSlot(scene, options, create) {
    const owner=entity(scene, options && options.ownerId);
    if (owner.type !== 'particle-emitter') throw new Error('粒子范围只能附着在粒子发射器上');
    if (!owner.particle) { if (!create) return null; owner.particle={}; }
    return { owner, key:options.scope==='particle-emission'?'emissionRange':'motionRange' };
  }
  function effectDefinition(id) {
    const registry = global.EditorEffectRegistryVNext, definition = registry && registry.effectById && registry.effectById[id];
    if (!definition || !definition.scopes.includes('scene')) throw new Error(`找不到场景滤镜「${id || '(空)'}」`);
    return definition;
  }
  function sceneEffect(scene, effectId, create) {
    const definition = effectDefinition(effectId), model = global.EditorVNextInspectorModel;
    if (!model) throw new Error('统一蒙版需要 vNext Inspector Model');
    const path = model.path('scene', definition); let cursor = scene;
    for (let index = 0; index < path.length - 1; index++) {
      if (!cursor[path[index]]) { if (!create) return null; cursor[path[index]] = {}; }
      cursor = cursor[path[index]];
    }
    if (!cursor[path.at(-1)] && create) {
      if (!global.EditorVNextEffectState) throw new Error('统一蒙版需要 vNext Effect State');
      global.EditorVNextEffectState.enable(scene, { scope:'scene', effectId });
      return sceneEffect(scene, effectId, false);
    }
    return cursor[path.at(-1)] || null;
  }
  function target(scene, options, create) {
    if (particleRange(options)) return null;
    if (options && options.scope === 'scene') return sceneEffect(scene, options.effectId, create);
    const owner = entity(scene, options && options.ownerId);
    if (!owner.effects) { if (!create) return null; owner.effects={ pipeline:['mask','decorate','sample'], mask:null, decorate:{}, sample:{} }; }
    else if(create)owner.effects=Object.assign({pipeline:['mask','decorate','sample'],mask:null,decorate:{},sample:{}},owner.effects);
    return owner.effects;
  }
  function current(scene, options) {
    if (particleRange(options)) { const slot=particleSlot(scene, options, false); return clone(slot && slot.owner.particle && slot.owner.particle[slot.key]); }
    const slot = target(scene, options, false);
    return clone(options && options.scope === 'scene' ? slot && slot.mask : slot && slot.mask);
  }
  function defaults(scene, options, type) {
    if(type==='shapes'){const base=defaults(scene,options,'rect');return{type,version:1,shapes:[{id:'shape-1',...geometry(base)}],invert:false,follow:base.follow,...(base.followMatrix?{followMatrix:base.followMatrix}:{})};}
    const local=particleRange(options), owner = options && options.scope === 'scene' ? null : entity(scene, options && options.ownerId), x = local ? 0 : owner ? finite(owner.x, 0) : 0, y = local ? 0 : owner ? finite(owner.y, 0) : 0, w = owner ? positive(owner.w, 1) : positive(scene.width, 1), h = owner ? positive(owner.h, 1) : positive(scene.height, 1);
    const binding=local?{follow:true,followMatrix:IDENTITY.slice()}:{follow:false};
    if (type === 'poly') return { type, points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]], invert:false, ...binding };
    if (type === 'alpha') return { type, assetId:'', x, y, w, h, mode:'alpha', invert:false, ...binding };
    if (type === 'element') return { type, targetId:'', mode:'alpha',showSource:false,invert:false };
    return { type, x, y, w, h, invert:false, ...binding };
  }
  function normalize(scene, options, input) {
    const type = String(input && input.type || '');
    if (!TYPES.includes(type)) throw new Error(`不支持的蒙版类型「${type || '(空)'}」`);
    const base = defaults(scene, options, type), mask = Object.assign(base, clone(input) || {}, { type, invert:!!(input && input.invert) });
    if(Object.hasOwn(mask,'geometryMatrix'))mask.geometryMatrix=matrix(mask.geometryMatrix);
    if (type !== 'element') {
      mask.follow = input?.follow==null?!!base.follow:!!input.follow;
      if (mask.follow && (!Array.isArray(mask.followMatrix) || mask.followMatrix.length !== 6 || !mask.followMatrix.every(value => Number.isFinite(+value)))) mask.followMatrix = [1,0,0,1,0,0];
      if (!mask.follow) delete mask.followMatrix;
    }
    if (type === 'rect' || type === 'ellipse') { mask.x=finite(mask.x,base.x);mask.y=finite(mask.y,base.y);mask.w=positive(mask.w,base.w);mask.h=positive(mask.h,base.h); }
    if (type === 'poly') {
      if (!Array.isArray(mask.points) || mask.points.length < 3) throw new Error('多边形蒙版至少需要三个点');
      mask.points = mask.points.map(point => { if (!Array.isArray(point) || point.length < 2) throw new Error('多边形蒙版点无效'); return [finite(point[0],0), finite(point[1],0)]; });
    }
    if(type==='shapes')mask.shapes=normalizeShapes(mask).shapes;
    if (type === 'alpha') {
      mask.assetId=String(mask.assetId||mask.imageId||'');delete mask.imageId;
      if (!mask.assetId || !scene.assets || !scene.assets[mask.assetId]) throw new Error(`Alpha 蒙版素材不存在：${mask.assetId || '(空)'}`);
      mask.x=finite(mask.x,base.x);mask.y=finite(mask.y,base.y);mask.w=positive(mask.w,base.w);mask.h=positive(mask.h,base.h);
    }
    if (type === 'element') {
      if(mask.sourceQuality!=null&&!['full','no-sample','no-decorate','base'].includes(mask.sourceQuality))throw Error('蒙版来源处理选项无效');
      mask.targetId=String(mask.targetId||'');const source=entity(scene,mask.targetId);
      if (options && options.scope !== 'scene' && source.id===options.ownerId) throw new Error('对象不能引用自身作为蒙版');
      if (source.type==='particle-emitter') throw new Error('粒子发射器不能作为蒙版引用源');
      const nextScene={...scene,entities:(scene.entities||[]).map(item=>{if(options?.scope==='scene'||item.id!==options.ownerId)return item;return particleRange(options)?{...item,particle:{...item.particle,[options.scope==='particle-emission'?'emissionRange':'motionRange']:mask}}:{...item,effects:{...item.effects,mask}};})};
      global.ToSampoolRuntimeVNext?.modules.maskContract?.validateReferences(nextScene,[mask]);
      delete mask.sourceVisibility;
    }
    const channels=PORTABLE[type]?.channels;if(channels)mask.mode=channels.includes(mask.mode)?mask.mode:channels[0];
    return mask;
  }
  function set(scene, options, input) {
    const mask = normalize(scene, options || {}, input);
    if (particleRange(options)) { const slot=particleSlot(scene, options, true); slot.owner.particle[slot.key]=mask; return clone(mask); }
    const slot = target(scene, options || {}, true);
    slot.mask = mask; return clone(mask);
  }
  function clear(scene, options) {
    if (particleRange(options)) { const slot=particleSlot(scene, options, false); if (!slot || !slot.owner.particle || !slot.owner.particle[slot.key]) return false; delete slot.owner.particle[slot.key]; return true; }
    const slot = target(scene, options || {}, false);
    if (!slot || !slot.mask) return false;
    slot.mask = null; return true;
  }
  function bounds(mask) {
    if (!mask) return null;
    if(mask.type==='shapes'){const boxes=mask.shapes.map(bounds),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};}
    if (['rect', 'ellipse', 'alpha'].includes(mask.type)) return { x:finite(mask.x,0), y:finite(mask.y,0), w:positive(mask.w,1), h:positive(mask.h,1) };
    if (mask.type === 'poly' && Array.isArray(mask.points) && mask.points.length) {
      const xs=mask.points.map(point=>finite(point[0],0)), ys=mask.points.map(point=>finite(point[1],0));
      return { x:Math.min(...xs), y:Math.min(...ys), w:Math.max(1,Math.max(...xs)-Math.min(...xs)), h:Math.max(1,Math.max(...ys)-Math.min(...ys)) };
    }
    return null;
  }
  function setBounds(scene, options, next) {
    if(options?.shapeId){const whole=current(scene,options),shape=editable(whole,options.shapeId),before=bounds(shape);if(!before)throw Error('找不到蒙版图形');return replaceShape(scene,options,resizeGeometry(shape,before,next));}
    const mask=current(scene,options), before=bounds(mask); if(!mask||!before) throw new Error('当前蒙版没有可编辑范围');
    const target={x:finite(next&&next.x,before.x),y:finite(next&&next.y,before.y),w:positive(next&&next.w,before.w),h:positive(next&&next.h,before.h)};
    if(mask.type==='shapes'){
      mask.shapes=mask.shapes.map(shape=>resizeGeometry(shape,before,target));
    }else if(mask.type==='poly'){
      const sx=target.w/before.w,sy=target.h/before.h;
      mask.points=mask.points.map(point=>[target.x+(finite(point[0],before.x)-before.x)*sx,target.y+(finite(point[1],before.y)-before.y)*sy]);
    }else Object.assign(mask,target);
    return set(scene,options,mask);
  }
  function setFollow(scene, options, enabled, matrix) {
    const mask=current(scene,options); if(!mask||mask.type==='element') throw new Error('当前蒙版不支持跟随');
    const currentMatrix=Array.isArray(matrix)&&matrix.length===6?matrix:mask.followMatrix||IDENTITY,oldPlacement=mask.follow?multiply(currentMatrix,inverse(mask.followMatrix||IDENTITY)):IDENTITY;
    setGeometry(mask,multiply(oldPlacement,mask.geometryMatrix||IDENTITY));
    mask.follow=!!enabled;
    if(mask.follow) mask.followMatrix=Array.isArray(matrix)&&matrix.length===6&&matrix.every(value=>Number.isFinite(+value))?matrix.map(Number):[1,0,0,1,0,0];
    else delete mask.followMatrix;
    return set(scene,options,mask);
  }

  /* One typed adapter for portability, not a second mask implementation in
     resources. New geometry/source kinds must extend this table and its tests. */
  const PORTABLE = Object.freeze({
    rect:Object.freeze({geometry:'box'}),ellipse:Object.freeze({geometry:'box'}),
    poly:Object.freeze({geometry:'points'}),
    shapes:Object.freeze({geometry:'collection'}),
    alpha:Object.freeze({geometry:'box',reference:'assetId',kind:'asset',channels:Object.freeze(['alpha','luma'])}),
    element:Object.freeze({geometry:'reference',reference:'targetId',kind:'entity',channels:Object.freeze(['alpha','luma'])})
  });
  function portable(input) {
    if(!input||input.type==='none')return clone(input);
    const spec=PORTABLE[input.type];if(!spec)throw Error('蒙版尚无可移植适配：'+input.type);
    const mask=clone(input),number=value=>typeof value==='number'&&Number.isFinite(value);
    if(mask.type==='shapes')mask.shapes=normalizeShapes(mask).shapes;
    if(Object.hasOwn(mask,'geometryMatrix'))mask.geometryMatrix=matrix(mask.geometryMatrix);
    if(mask.type==='element'&&mask.follow)throw Error('元素来源蒙版暂不支持跟随开关');
    if(mask.type==='alpha'){
      if(mask.assetId&&mask.imageId&&mask.assetId!==mask.imageId)throw Error('蒙版素材身份冲突');
      mask.assetId=mask.assetId||mask.imageId;delete mask.imageId;
    }
    if(mask.mode!=null&&!spec.channels?.includes(mask.mode))throw Error('蒙版通道模式尚无可移植适配：'+mask.mode);
    if(mask.type==='element'&&mask.sourceQuality!=null&&!['full','no-sample','no-decorate','base'].includes(mask.sourceQuality))throw Error('蒙版来源处理选项无效');
    const checkReferences=(value,path)=>{if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){
      if(/(?:assetId|imageId|locator|targetId|sourceId)$/i.test(key)&&typeof child==='string'&&child&&!(path===''&&key===spec.reference))throw Error('蒙版含未声明的引用位置：'+(path?path+'.':'')+key);
      checkReferences(child,path?path+'.'+key:key);
    }};checkReferences(mask,'');
    if(spec.reference&&(typeof mask[spec.reference]!=='string'||!mask[spec.reference]))throw Error('蒙版缺少来源身份：'+spec.reference);
    if(spec.geometry==='box'&&(!['x','y','w','h'].every(key=>number(mask[key]))||mask.w<=0||mask.h<=0))throw Error('蒙版可移植范围无效');
    if(spec.geometry==='points'&&(!Array.isArray(mask.points)||mask.points.length<3||mask.points.length>4096||mask.points.some(point=>!Array.isArray(point)||point.length!==2||!point.every(number))))throw Error('蒙版可移植路径无效或超出4096点预算');
    if(mask.follow){
      const m=mask.followMatrix;
      if(!Array.isArray(m)||m.length!==6||!m.every(number)||Math.abs(m[0]*m[3]-m[1]*m[2])<.0000001)throw Error('蒙版跟随基准矩阵无效或不可逆');
    }else delete mask.followMatrix;
    return mask;
  }
  function references(input) {
    const mask=portable(input);if(!mask||mask.type==='none')return[];
    const spec=PORTABLE[mask.type];return spec.reference?[{kind:spec.kind,id:mask[spec.reference],version:1}]:[];
  }
  function remapReferences(input, mapping) {
    const mask=portable(input);if(!mask||mask.type==='none')return mask;
    const spec=PORTABLE[mask.type],map=mapping&&mapping[spec.kind];
    if(spec.reference&&map&&Object.hasOwn(map,mask[spec.reference]))mask[spec.reference]=map[mask[spec.reference]];
    return portable(mask);
  }
  function translate(input, dx, dy) {
    if(!Number.isFinite(dx)||!Number.isFinite(dy))throw Error('蒙版重定位增量无效');
    const mask=portable(input);if(!mask||mask.type==='none')return mask;
    const spec=PORTABLE[mask.type];
    if(mask.geometryMatrix)setGeometry(mask,multiply(translation(dx,dy),multiply(mask.geometryMatrix,translation(-dx,-dy))));
    if(spec.geometry==='box'){mask.x+=dx;mask.y+=dy;}
    else if(spec.geometry==='points')mask.points=mask.points.map(([x,y])=>[x+dx,y+dy]);
    else if(spec.geometry==='collection')mask.shapes=mask.shapes.map(shape=>shape.type==='poly'?{...shape,points:shape.points.map(([x,y])=>[x+dx,y+dy])}:{...shape,x:shape.x+dx,y:shape.y+dy});
    if(mask.follow&&spec.geometry!=='reference'){mask.followMatrix[4]+=dx;mask.followMatrix[5]+=dy;}
    return portable(mask);
  }
  function rebase(input,change){
    const mask=portable(input),basis=matrix(change);if(!mask||mask.type==='none')return mask;
    setGeometry(mask,multiply(basis,mask.geometryMatrix||IDENTITY));
    if(mask.follow)mask.followMatrix=multiply(basis,mask.followMatrix);
    return portable(mask);
  }
  function parentBaseMatrix(scene,owner){
    const byId=new Map((scene.entities||[]).map(e=>[e.id,e])),seen=new Set([owner.id]),parents=[];
    let id=owner.parentId;
    while(id){
      if(seen.has(id))throw Error('蒙版父组链存在循环');seen.add(id);
      const parent=byId.get(id);if(!parent||parent.type!=='group')throw Error('蒙版父级缺失或不是组：'+id);
      if(parents.length>=64)throw Error('蒙版父组层级超出64层预算');parents.unshift(parent);id=parent.parentId;
    }
    const frame=global.ToSampoolRuntimeVNext?.modules.frame;if(!frame)throw Error('蒙版父级转换需要基础变换模块');
    let result=IDENTITY;
    for(const parent of parents){
      for(const key of ['x','y','w','h','rot','scaleX','scaleY','skewX','skewY'])if(parent[key]!=null&&!Number.isFinite(+parent[key]))throw Error('蒙版父组基础变换无效：'+key);
      const values=frame.snapGeometry(Object.assign({x:0,y:0,w:1,h:1,scaleX:1,scaleY:1,rot:0},parent));
      result=multiply(result,frame.matrixFor(values));
    }
    return matrix(result);
  }
  function detach(input,scene,owner,origin){
    const local=translate(input,-origin.x,-origin.y);if(!owner.parentId||!local||local.type==='none')return local;
    const change=multiply(translation(-origin.x,-origin.y),multiply(inverse(parentBaseMatrix(scene,owner)),translation(origin.x,origin.y)));
    return rebase(local,change);
  }

  function geometry(shape){return shape.type==='poly'?{type:shape.type,points:clone(shape.points)}:{type:shape.type,x:shape.x,y:shape.y,w:shape.w,h:shape.h};}
  function editable(mask,id){
    if(mask?.type!=='shapes')return mask;
    const shape=mask.shapes.find(item=>item.id===id)||mask.shapes[0];
    return {...shape,invert:mask.invert,follow:mask.follow,...(mask.followMatrix?{followMatrix:mask.followMatrix}:{}),...(mask.geometryMatrix?{geometryMatrix:mask.geometryMatrix}:{})};
  }
  function resizeGeometry(shape,before,target){
    const x=finite(target?.x,before.x),y=finite(target?.y,before.y),w=positive(target?.w,before.w),h=positive(target?.h,before.h),sx=w/before.w,sy=h/before.h;
    return shape.type==='poly'?{...shape,points:shape.points.map(([px,py])=>[x+(px-before.x)*sx,y+(py-before.y)*sy])}:{...shape,x:x+(shape.x-before.x)*sx,y:y+(shape.y-before.y)*sy,w:shape.w*sx,h:shape.h*sy};
  }
  function replaceShape(scene,options,shape){
    const mask=current(scene,options);if(mask?.type!=='shapes')return set(scene,options,shape);
    const id=options.shapeId||shape.id;if(!mask.shapes.some(item=>item.id===id))throw Error('找不到蒙版图形：'+id);
    mask.shapes=mask.shapes.map(item=>item.id===id?{id:item.id,...(item.name?{name:item.name}:{}),...geometry(shape)}:item);return set(scene,options,mask);
  }
  function addShape(scene,options,type='rect',copyId){
    if(!['rect','ellipse','poly'].includes(type))throw Error('不支持的蒙版图形');
    let mask=current(scene,options);
    if(!mask||!['shapes','rect','ellipse','poly'].includes(mask.type))mask=defaults(scene,options,'shapes');
    else if(mask.type!=='shapes'){const {type:oldType,x,y,w,h,points,...shared}=mask;mask={...shared,type:'shapes',version:1,shapes:[{id:'shape-1',...geometry({type:oldType,x,y,w,h,points})}]};}
    if(mask.shapes.length>=64)throw Error('蒙版最多包含64个图形');
    let n=1;while(mask.shapes.some(s=>s.id==='shape-'+n))n++;const id='shape-'+n;
    const source=copyId?mask.shapes.find(s=>s.id===copyId):null;if(copyId&&!source)throw Error('找不到待复制的蒙版图形');
    const next=source?geometry(source):geometry(defaults(scene,options,type));
    mask.shapes.push({id,...next});set(scene,options,mask);return id;
  }
  function removeShape(scene,options,id){
    const mask=current(scene,options);if(mask?.type!=='shapes')return clear(scene,options);
    if(!mask.shapes.some(s=>s.id===id))throw Error('找不到蒙版图形：'+id);
    mask.shapes=mask.shapes.filter(s=>s.id!==id);if(!mask.shapes.length)return clear(scene,options);return set(scene,options,mask);
  }
  global.EditorVNextMaskState = Object.freeze({ TYPES, PARTICLE_SCOPES, PORTABLE, current, defaults, normalize, set, clear, bounds, setBounds, setFollow, portable, references, remapReferences, translate, rebase, parentBaseMatrix, detach,editable,replaceShape,addShape,removeShape });
})(typeof window !== 'undefined' ? window : globalThis);
