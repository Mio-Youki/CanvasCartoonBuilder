/* Pure v4 hierarchy operations. Groups are transform parents; z-order remains the flat entities array. */
(function (global) {
  'use strict';
  const unique = (items, base) => { const used = new Set(items.map(item => item.id)); let id = base, n = 2; while (used.has(id)) id = `${base}-${n++}`; return id; };
  const byId = (scene, id) => (scene.entities || []).find(item => item.id === id) || null;
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const multiply = (left, right) => [left[0]*right[0]+left[2]*right[1],left[1]*right[0]+left[3]*right[1],left[0]*right[2]+left[2]*right[3],left[1]*right[2]+left[3]*right[3],left[0]*right[4]+left[2]*right[5]+left[4],left[1]*right[4]+left[3]*right[5]+left[5]];
  function inverse(matrix) { const det=matrix[0]*matrix[3]-matrix[1]*matrix[2];if(!Number.isFinite(det)||Math.abs(det)<1e-8)return null;return[matrix[3]/det,-matrix[1]/det,-matrix[2]/det,matrix[0]/det,(matrix[2]*matrix[5]-matrix[3]*matrix[4])/det,(matrix[1]*matrix[4]-matrix[0]*matrix[5])/det]; }
  function localMatrix(item) { const w=Math.max(1,finite(item.w,1)),h=Math.max(1,finite(item.h,1)),pivot=item.pivot&&item.pivot.mode==='custom'?item.pivot:null,px=w*(pivot?Math.max(0,Math.min(1,finite(pivot.x,.5))):.5),py=h*(pivot?Math.max(0,Math.min(1,finite(pivot.y,.5))):.5),sx=finite(item.scaleX,1),sy=finite(item.scaleY,1),angle=finite(item.rot,0)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),a=cos*sx,b=sin*sx,c=-sin*sy,d=cos*sy,x=finite(item.x,0),y=finite(item.y,0);return[a,b,c,d,x+px-a*px-c*py,y+py-b*px-d*py]; }
  function apply(matrix,x,y){return{x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]};}
  function bounds(items){const points=[];for(const item of items){const matrix=localMatrix(item),w=Math.max(1,finite(item.w,1)),h=Math.max(1,finite(item.h,1));points.push(apply(matrix,0,0),apply(matrix,w,0),apply(matrix,w,h),apply(matrix,0,h));}const xs=points.map(point=>point.x),ys=points.map(point=>point.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(1,Math.max(...xs)-Math.min(...xs)),h:Math.max(1,Math.max(...ys)-Math.min(...ys))};}
  function applyLocalMatrix(item,matrix){const sxLen=Math.hypot(matrix[0],matrix[1]),syLen=Math.hypot(matrix[2],matrix[3]),dot=matrix[0]*matrix[2]+matrix[1]*matrix[3];if(sxLen>1e-8&&syLen>1e-8&&Math.abs(dot)>sxLen*syLen*1e-6)throw new Error('当前场景格式不能无损表达该跨组剪切变换');const w=Math.max(1,finite(item.w,1)),h=Math.max(1,finite(item.h,1)),pivot=item.pivot&&item.pivot.mode==='custom'?item.pivot:null,px=w*(pivot?Math.max(0,Math.min(1,finite(pivot.x,.5))):.5),py=h*(pivot?Math.max(0,Math.min(1,finite(pivot.y,.5))):.5),sx=sxLen||1,det=matrix[0]*matrix[3]-matrix[1]*matrix[2],sy=det/sx;item.scaleX=sx;item.scaleY=sy;item.rot=Math.atan2(matrix[1],matrix[0])*180/Math.PI;item.x=matrix[4]-px+matrix[0]*px+matrix[2]*py;item.y=matrix[5]-py+matrix[1]*px+matrix[3]*py;}
  function worldMatrix(scene,item,trail){trail=trail||new Set();if(!item||trail.has(item.id))return[1,0,0,1,0,0];trail.add(item.id);const local=localMatrix(item),parent=item.parentId&&byId(scene,item.parentId);return parent?multiply(worldMatrix(scene,parent,trail),local):local;}
  function reparent(scene,item,parentId){const world=worldMatrix(scene,item),parent=parentId&&byId(scene,parentId),base=parent?worldMatrix(scene,parent):[1,0,0,1,0,0],inv=inverse(base);if(!inv)throw new Error('目标父级变换不可逆');item.parentId=parentId||null;applyLocalMatrix(item,multiply(inv,world));return item;}
  function ordered(scene, ids) { const wanted = new Set(ids || []); return (scene.entities || []).filter(item => wanted.has(item.id)); }
  function descendants(scene, id, output) { output = output || new Set(); for (const item of scene.entities || []) if (item.parentId === id && !output.has(item.id)) { output.add(item.id); descendants(scene, item.id, output); } return output; }
  function createGroup(scene, ids) {
    const members = ordered(scene, ids).filter(item => item.type !== 'particle-emitter'); if (members.length < 2) throw new Error('至少选择两个普通对象才能编组');
    const parentIds = new Set(members.map(item => item.parentId || null)); if (parentIds.size !== 1) throw new Error('只能编组同一层级的对象');
    const box=bounds(members),group = { id:unique(scene.entities || [], 'group'), type:'group', parentId:members[0].parentId || null, x:box.x, y:box.y, w:box.w, h:box.h, scaleX:1, scaleY:1, rot:0, alpha:1 };
    const index = Math.min(...members.map(item => scene.entities.indexOf(item))); for (const member of members) {member.x=finite(member.x,0)-box.x;member.y=finite(member.y,0)-box.y;member.parentId = group.id;}scene.entities=scene.entities.filter(item=>!members.includes(item));scene.entities.splice(index,0,group,...members);
    return group;
  }
  function dissolveGroup(scene, id) {
    const group = byId(scene, id); if (!group || group.type !== 'group') throw new Error('只能解组 group');
    const groupMatrix=localMatrix(group);for (const item of scene.entities) if (item.parentId === group.id) {applyLocalMatrix(item,multiply(groupMatrix,localMatrix(item)));item.parentId = group.parentId || null;}
    scene.entities.splice(scene.entities.indexOf(group), 1); return group;
  }
  function remove(scene, ids) {
    const selected = new Set(ids || []), dissolved = [];
    const uses=(item,id)=>{
      const scan=value=>value&&typeof value==='object'&&Object.entries(value).some(([key,child])=>(key==='sourceId'||key==='targetId')&&child===id||child&&typeof child==='object'&&scan(child));
      // Incomplete, newly enabled placement controls may have no source yet;
      // deletion of an unrelated row must still work.
      return !!(scan(item.effects)||scan(item.particle)||[item,...item.parts||[]].some(p=>scan(p.extensions?.elements)||scan(p.pathEndpoints)));
    };
    // A live emitter must not retain a dangling source when its visible source
    // is deleted. Keep one private definition closure, not a frozen image.
    for(const sourceId of Array.from(selected)){
      const users=(scene.entities||[]).filter(e=>!selected.has(e.id)&&uses(e,sourceId));if(!users.length)continue;
      const source=byId(scene,sourceId),presets=global.EditorV4ElementPresets;if(!presets)throw Error('缺少粒子依赖保护模块，未删除来源');
      const preset=presets.capture(scene,sourceId),scratch={...scene,elementPresets:{...scene.elementPresets,'private-particle-source':preset}},replacement=presets.instantiate(scratch,'private-particle-source',{x:source.x,y:source.y});
      replacement.referenceSourceOnly=true;if(users.some(e=>e.type==='particle-emitter'))replacement.particleSourceOnly=true;delete replacement.resourceBindings;if(source.parentId){replacement.parentId=source.parentId;if(source.effects?.mask){const targetId=replacement.effects.mask.targetId;replacement.effects.mask=JSON.parse(JSON.stringify(source.effects.mask));if(targetId)replacement.effects.mask.targetId=targetId;}}if(source.sceneVariants)replacement.sceneVariants=JSON.parse(JSON.stringify(source.sceneVariants));scene.entities=scratch.entities;
      const timeline=scene.timeline||{};if(timeline.visibility?.[sourceId])timeline.visibility[replacement.id]=JSON.parse(JSON.stringify(timeline.visibility[sourceId]));
      for(const [key,track]of Object.entries(timeline.tracks||{})){const next=key===sourceId?replacement.id:key==='entity:'+sourceId?'entity:'+replacement.id:key.replace('object:'+sourceId+':','object:'+replacement.id+':');if(next!==key)timeline.tracks[next]=JSON.parse(JSON.stringify(track));}
      const mapping=Object.fromEntries(scene.entities.map(e=>[e.id,e.id]));mapping[sourceId]=replacement.id;
      for(const user of users){if(global.EditorV4ElementReferences)Object.assign(user,global.EditorV4ElementReferences.remap(user,mapping));if(user.type==='particle-emitter')user.particle={...user.particle,sourceId:replacement.id,sourceOwned:true};}
    }
    for(const id of Array.from(selected)){const item=byId(scene,id);if(item?.type==='group'){dissolveGroup(scene,id);dissolved.push(id);selected.delete(id);}}
    for(const id of Array.from(selected)){const item=byId(scene,id),sourceId=item&&item.type==='particle-emitter'&&item.particle&&item.particle.sourceOwned&&item.particle.sourceId;if(sourceId){const shared=(scene.entities||[]).some(other=>!selected.has(other.id)&&uses(other,sourceId));if(!shared)selected.add(sourceId);}}
    if (selected.size) scene.entities = scene.entities.filter(item => !selected.has(item.id));
    const removed=Array.from(selected),allRemoved=new Set(removed.concat(dissolved)),timeline=scene.timeline||{};
    if(timeline.visibility)for(const id of allRemoved)delete timeline.visibility[id];
    if(timeline.tracks)for(const id of allRemoved){delete timeline.tracks[id];delete timeline.tracks[`entity:${id}`];}
    global.EditorV4ElementReferences?.prunePrivate(scene);return { removed, dissolved };
  }
  function reorder(scene, dragId, targetId, mode) {
    const drag = byId(scene, dragId), target = byId(scene, targetId); if (!drag || !target || drag === target) return false;
    if (drag.type === 'group' && descendants(scene, drag.id).has(target.id)) throw new Error('不能把组拖入自己的成员');
    if (mode === 'inside') {
      if (target.type === 'group') { reparent(scene,drag,target.id);moveBlock(scene,drag.id,target.id,'inside');return true; }
      // Dropping onto the middle of a sibling creates a group at the target's draw position.
      // This keeps the runtime's entity list flat while preserving a Photoshop-like tree gesture.
      reparent(scene,drag,target.parentId||null);
      const group = createGroup(scene, [drag.id, target.id]);
      scene.entities.splice(scene.entities.indexOf(group), 1);
      scene.entities.splice(scene.entities.indexOf(target), 0, group);
      return group;
    }
    reparent(scene,drag,target.parentId||null);moveBlock(scene,drag.id,target.id,mode);return true;
  }
  function moveBlock(scene,dragId,targetId,mode){const sourceIds=descendants(scene,dragId,new Set());sourceIds.add(dragId);const block=scene.entities.filter(item=>sourceIds.has(item.id));scene.entities=scene.entities.filter(item=>!sourceIds.has(item.id));let at=scene.entities.length;if(mode==='inside'){const targetIds=descendants(scene,targetId,new Set());targetIds.add(targetId);for(let i=0;i<scene.entities.length;i++)if(targetIds.has(scene.entities[i].id))at=i+1;}else{const targetIds=descendants(scene,targetId,new Set());targetIds.add(targetId);const indexes=scene.entities.map((item,index)=>targetIds.has(item.id)?index:-1).filter(index=>index>=0);if(indexes.length)at=mode==='before'?Math.min(...indexes):Math.max(...indexes)+1;}scene.entities.splice(at,0,...block);return true;}
  global.EditorVNextStructureState = Object.freeze({ byId, ordered, descendants, createGroup, dissolveGroup, remove, reorder, localMatrix, applyLocalMatrix, worldMatrix, reparent, bounds, multiply });
})(typeof window !== 'undefined' ? window : globalThis);
