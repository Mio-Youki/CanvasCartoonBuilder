/* Pure v4 internal-part operations. Parts are object-local content, never scene entities. */
(function (global) {
  'use strict';

  const TYPES = Object.freeze(['rect', 'ellipse', 'line', 'poly', 'stroke']);
  const APPEARANCE = Object.freeze(['fill', 'fillAlpha', 'fillPattern', 'stroke', 'strokeAlpha', 'strokeWidth', 'radius', 'points']);
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function defaultTexture(type, color) {
    const common={type:String(type||'lines'),mode:'replace',opacity:1,color:color||'#ffffff'};
    if(common.type==='dots')return Object.assign(common,{size:3,spacing:5,gap:2,phase:0,angle:0,sides:4,roundness:0,layout:'regular'});
    if(common.type==='checker')return Object.assign(common,{size:3,gap:2,phase:.5,angle:0,layout:'checker'});
    common.type='lines';return Object.assign(common,{layers:[{angle:45,width:1,gap:3}]});
  }
  function normalizeTexture(raw, color) {
    if(!raw||raw.type==='none')return null;
    const value=Object.assign(defaultTexture(raw.type,color),clone(raw));
    value.type=['lines','dots','checker'].includes(value.type)?value.type:'lines';
    value.mode=value.mode==='overlay'?'overlay':'replace';
    value.opacity=Math.max(0,Math.min(1,finite(value.opacity,1)));
    value.color=/^#[0-9a-f]{6}$/i.test(value.color||'')?value.color:(color||'#ffffff');
    if(value.type==='lines'){
      value.layers=(Array.isArray(value.layers)&&value.layers.length?value.layers:[{angle:45,width:1,gap:3}]).slice(0,3).map(layer=>{const width=Math.max(1,finite(layer&&layer.width,1)),spacing=Math.max(width,finite(layer&&layer.spacing,width+Math.max(0,finite(layer&&layer.gap,3))));return{angle:finite(layer&&layer.angle,45),width,spacing,gap:Math.max(0,spacing-width)};});
      // lineMode is an Inspector hint only.  Runtime keeps the portable
      // layers[] representation, so older scenes and generated files remain
      // drawable without understanding the newer names.
      value.lineMode=['line','grid','layers'].includes(value.lineMode)?value.lineMode:(value.layers.length===1?'line':'layers');
    }
    else {value.angle=finite(value.angle,0);value.size=Math.max(1,finite(value.size,3));const rawSpacing=raw&&raw.spacing,rawGap=raw&&raw.gap;value.spacing=Math.max(value.size,finite(rawSpacing,value.size+Math.max(0,finite(rawGap,value.gap))));value.gap=Math.max(0,value.spacing-value.size);value.phase=Math.max(0,Math.min(1,finite(value.phase,value.type==='checker'?.5:0)));if(value.type==='dots'){value.sides=Math.max(3,Math.min(6,Math.round(finite(value.sides,4))));value.roundness=Math.max(0,Math.min(1,finite(value.roundness,0)));value.layout=value.layout==='stagger'?'stagger':'regular';}else value.layout='checker';}
    return value;
  }
  function owner(scene, ownerId) {
    const value = (scene && scene.entities || []).find(item => item.id === ownerId);
    if (!value) throw new Error(`找不到对象「${ownerId || '(空)'}」`);
    return value;
  }
  function uniqueId(parts, base) {
    const used = new Set((parts || []).map(item => String(item.id || '')));
    let id = String(base || 'part'), index = 2;
    while (used.has(id)) id = `${base || 'part'}-${index++}`;
    return id;
  }
  function normalizePart(input, parts) {
    const raw = clone(input) || {}, type = TYPES.includes(raw.type) ? raw.type : 'rect';
    const part = Object.assign({ id:`part-${type}`, name:{ rect:'矩形', ellipse:'椭圆', line:'直线', poly:'多边形', stroke:'像素笔触' }[type], type, alpha:1, scaleX:1, scaleY:1, rot:0, hidden:false, locked:false }, raw);
    part.id = uniqueId(parts || [], String(part.id || `part-${type}`));
    part.x = Math.round(finite(part.x, 0)); part.y = Math.round(finite(part.y, 0));
    part.alpha = Math.max(0, Math.min(1, finite(part.alpha, 1)));
    part.fillAlpha = Math.max(0, Math.min(1, finite(part.fillAlpha, 1)));
    part.strokeAlpha = Math.max(0, Math.min(1, finite(part.strokeAlpha, 1)));
    part.scaleX = finite(part.scaleX, 1); part.scaleY = finite(part.scaleY, 1); part.rot = finite(part.rot, 0);
    if (type === 'line') {
      part.x2 = Math.round(finite(part.x2, part.x + Math.max(1, finite(part.w, 1))));
      part.y2 = Math.round(finite(part.y2, part.y + Math.max(1, finite(part.h, 1))));
      part.stroke = part.stroke || '#000000'; part.strokeWidth = Math.max(0, finite(part.strokeWidth, 1));
      delete part.w; delete part.h; delete part.fill; delete part.radius;
    } else if (type === 'stroke') {
      part.points = Array.isArray(part.points) ? part.points.map(point => [Math.round(finite(point && point[0], 0)), Math.round(finite(point && point[1], 0))]) : [[part.x, part.y], [part.x + 1, part.y + 1]];
      part.stroke = part.stroke || '#000000'; part.strokeWidth = Math.max(1, Math.round(finite(part.strokeWidth, 1)));
      delete part.w; delete part.h; delete part.fill; delete part.radius; delete part.fillPattern;
    } else {
      part.w = Math.max(1, finite(part.w, 1)); part.h = Math.max(1, finite(part.h, 1));
      if (part.fill === undefined) part.fill = '#ffffff';
      if(part.fillPattern)part.fillPattern=normalizeTexture(part.fillPattern,part.fill||'#ffffff');
      part.strokeWidth = Math.max(0, finite(part.strokeWidth, 0));
      if (type === 'rect') part.radius = Math.max(0, Math.min(finite(part.radius, 0), part.w / 2, part.h / 2)); else delete part.radius;
      if (type === 'poly') part.points = Array.isArray(part.points) ? part.points.map(point => [finite(point && point[0], 0), finite(point && point[1], 0)]) : [[.5, 0], [1, 1], [0, 1]];
      else delete part.points;
    }
    return part;
  }
  function fromPrimitive(entity) {
    if (!TYPES.includes(entity && entity.type)) throw new Error('只有矩形、椭圆、直线、多边形和笔触可以提升为组合矢量对象');
    const base = { id:`part-${entity.type}`, name:entity.name || undefined, type:entity.type, x:0, y:0, alpha:1, scaleX:1, scaleY:1, rot:0 };
    if (entity.type === 'line') { base.x2 = Math.max(1, finite(entity.w, 1)); base.y2 = Math.max(1, finite(entity.h, 1)); }
    else { base.w = Math.max(1, finite(entity.w, 1)); base.h = Math.max(1, finite(entity.h, 1)); }
    for (const key of APPEARANCE) if (entity[key] !== undefined) base[key] = clone(entity[key]);
    return normalizePart(base, []);
  }
  function ensureIds(entity) {
    const used = [];
    entity.parts = (Array.isArray(entity.parts) ? entity.parts : []).map(raw => { const value = normalizePart(raw, used); used.push(value); return value; });
    return entity.parts;
  }
  function promote(scene, ownerId) {
    const entity = owner(scene, ownerId);
    if (entity.type === 'vector') { entity.parts = Array.isArray(entity.parts) ? entity.parts : []; ensureIds(entity); return entity; }
    if (!TYPES.includes(entity.type)) throw new Error(`对象「${entity.id}」不能提升为 vector`);
    const first = fromPrimitive(entity);
    entity.type = 'vector'; entity.parts = [first];
    for (const key of APPEARANCE) delete entity[key];
    return entity;
  }
  function part(scene, ownerId, partId) {
    const entity = owner(scene, ownerId), found = (entity.parts || []).find(item => item.id === partId);
    if (!found) throw new Error(`对象「${ownerId}」不存在图元「${partId || '(空)'}」`);
    return found;
  }
  function shapeBounds(item) {
    let x, y, w, h;
    if (item.type === 'line') { x=Math.min(item.x,item.x2);y=Math.min(item.y,item.y2);w=Math.max(1,Math.abs(item.x2-item.x));h=Math.max(1,Math.abs(item.y2-item.y)); }
    else if (item.type === 'stroke') { const points=Array.isArray(item.points)&&item.points.length?item.points:[[item.x||0,item.y||0]], xs=points.map(point=>finite(point&&point[0],0)),ys=points.map(point=>finite(point&&point[1],0)); x=Math.min(...xs);y=Math.min(...ys);w=Math.max(1,Math.max(...xs)-x);h=Math.max(1,Math.max(...ys)-y); }
    else { x=finite(item.x,0);y=finite(item.y,0);w=Math.max(1,finite(item.w,1));h=Math.max(1,finite(item.h,1)); }
    const cx=x+w/2,cy=y+h/2,sx=finite(item.scaleX,1),sy=finite(item.scaleY,1),angle=finite(item.rot,0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
    const points=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([px,py])=>{const dx=(px-cx)*sx,dy=(py-cy)*sy;return{x:cx+cos*dx-sin*dy,y:cy+sin*dx+cos*dy};});
    const xs=points.map(point=>point.x),ys=points.map(point=>point.y),pad=Math.max(0,finite(item.strokeWidth,0))/2;
    return{x:Math.min(...xs)-pad,y:Math.min(...ys)-pad,w:Math.max(1,Math.max(...xs)-Math.min(...xs)+pad*2),h:Math.max(1,Math.max(...ys)-Math.min(...ys)+pad*2)};
  }
  function normalizeBounds(scene, ownerId) {
    const entity = owner(scene, ownerId);
    if (entity.type !== 'vector' || !Array.isArray(entity.parts) || !entity.parts.length) return entity;
    const boxes=entity.parts.filter(item=>!item.hidden).map(shapeBounds); if(!boxes.length)return entity;
    const minX=Math.min(...boxes.map(box=>box.x)),minY=Math.min(...boxes.map(box=>box.y)),maxX=Math.max(...boxes.map(box=>box.x+box.w)),maxY=Math.max(...boxes.map(box=>box.y+box.h));
    const oldW=Math.max(1,finite(entity.w,1)),oldH=Math.max(1,finite(entity.h,1)),newW=Math.max(1,maxX-minX),newH=Math.max(1,maxY-minY),pivot=entity.pivot&&entity.pivot.mode==='custom'?entity.pivot:null,px=oldW*(pivot?finite(pivot.x,.5):.5),py=oldH*(pivot?finite(pivot.y,.5):.5),npx=newW*(pivot?finite(pivot.x,.5):.5),npy=newH*(pivot?finite(pivot.y,.5):.5),sx=finite(entity.scaleX,1),sy=finite(entity.scaleY,1),a=finite(entity.rot,0)*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a),ma=cos*sx,mb=sin*sx,mc=-sin*sy,md=cos*sy,tx=finite(entity.x,0)+px-ma*px-mc*py,ty=finite(entity.y,0)+py-mb*px-md*py,ntx=tx+ma*minX+mc*minY,nty=ty+mb*minX+md*minY;
    for(const item of entity.parts){if(item.type==='line'){item.x=Math.round(item.x-minX);item.y=Math.round(item.y-minY);item.x2=Math.round(item.x2-minX);item.y2=Math.round(item.y2-minY);}else if(item.type==='stroke'){item.x=Math.round((+item.x||0)-minX);item.y=Math.round((+item.y||0)-minY);item.points=(item.points||[]).map(point=>[Math.round((+point[0]||0)-minX),Math.round((+point[1]||0)-minY)]);}else{item.x=Math.round(item.x-minX);item.y=Math.round(item.y-minY);item.w=Math.max(1,Math.round(item.w));item.h=Math.max(1,Math.round(item.h));}}
    entity.w=Math.max(1,Math.round(newW));entity.h=Math.max(1,Math.round(newH));entity.x=Math.round(ntx-npx+ma*npx+mc*npy);entity.y=Math.round(nty-npy+mb*npx+md*npy);
    return entity;
  }
  function add(scene, options) {
    let entity=owner(scene,options&&options.ownerId);
    if(TYPES.includes(entity.type))entity=promote(scene,entity.id);
    // Overlay parts are the v4 equivalent of Legacy's "patch" edits: an image,
    // text or registered procedural object can receive ordinary editable vectors
    // without turning the source object into a different runtime type.
    if(!['vector','image','text','builtin'].includes(entity.type))throw new Error(`对象「${entity.id}」不能承载内部图元`);
    entity.parts=Array.isArray(entity.parts)?entity.parts:[];
    const value=normalizePart(options&&options.part,entity.parts);entity.parts.push(value);
    if(entity.type==='vector'&&(!options||options.normalize!==false))normalizeBounds(scene,entity.id);
    return value;
  }
  function remove(scene, options) {
    const entity=owner(scene,options&&options.ownerId),index=(entity.parts||[]).findIndex(item=>item.id===(options&&options.partId));
    if(index<0)return false;entity.parts.splice(index,1);if(entity.type==='vector'&&entity.parts.length&&(!options||options.normalize!==false))normalizeBounds(scene,entity.id);return true;
  }
  function reorder(scene, options) {
    const entity=owner(scene,options&&options.ownerId),parts=entity.parts||[],from=parts.findIndex(item=>item.id===(options&&options.partId));if(from<0)return false;
    let to=Number.isFinite(+(options&&options.toIndex))?Math.max(0,Math.min(parts.length-1,Math.trunc(+options.toIndex))):from;
    const [value]=parts.splice(from,1);if(from<to)to-=1;parts.splice(to,0,value);return true;
  }
  function reorderRelative(scene, options) {
    const entity=owner(scene,options&&options.ownerId),parts=entity.parts||[],from=parts.findIndex(item=>item.id===(options&&options.partId));if(from<0)return false;
    const [value]=parts.splice(from,1),target=parts.findIndex(item=>item.id===(options&&options.targetId));if(target<0){parts.splice(from,0,value);return false;}
    // The tree presents foreground first, which is the reverse of draw order.
    // "before" in the tree therefore means after the target in the array.
    const at=(options&&options.mode)==='before'?target+1:target;parts.splice(at,0,value);return true;
  }
  global.EditorVNextPartsState=Object.freeze({ TYPES, owner, part, promote, add, remove, reorder, reorderRelative, normalizeBounds, normalizePart, fromPrimitive, ensureIds, shapeBounds, defaultTexture, normalizeTexture });
})(typeof window !== 'undefined' ? window : globalThis);
