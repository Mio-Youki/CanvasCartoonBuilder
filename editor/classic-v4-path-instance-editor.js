/* One sample edits the whole arrangement. Transient controls never enter Scene. */
(function(global){
  'use strict';
  function create(options){
    const {workspace,view,changes}=options,root=options.root||document,api=global.ToSampoolRuntimeVNext,hit=global.EditorVNextCanvasHit,
      svg=root.createElementNS('http://www.w3.org/2000/svg','svg'),polygon=root.createElementNS('http://www.w3.org/2000/svg','polygon'),line=root.createElementNS('http://www.w3.org/2000/svg','line'),
      move=root.createElement('button'),rotate=root.createElement('button');
    Object.assign(svg.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',pointerEvents:'none',zIndex:24,display:'none'});
    polygon.setAttribute('fill','none');polygon.setAttribute('stroke','#55d6ff');polygon.setAttribute('stroke-dasharray','4 3');line.setAttribute('stroke','#55d6ff');svg.append(polygon,line);
    for(const [node,name,text]of [[move,'move','✥'],[rotate,'rotate','↻']]){
      node.type='button';node.tabIndex=-1;node.dataset.instanceHandle=name;node.setAttribute('aria-label',name==='move'?'移动排布样本':'旋转排布样本');node.textContent=text;
      Object.assign(node.style,{position:'fixed',width:'20px',height:'20px',minWidth:0,minHeight:0,padding:0,border:'1px solid #55d6ff',background:'#161a22',color:'#55d6ff',borderRadius:'50%',transform:'translate(-50%,-50%)',zIndex:25,display:'none',cursor:name==='move'?'move':'grab'});
    }
    root.body.append(svg,move,rotate);let target=null,gesture=null,raf=0,stopped=false,cachedFrame=null,frameKey='',scope=workspace.moduleScope;
    function model(){
      if(!target)return null;const scene=workspace.current(),owner=scene?.entities?.find(v=>v.id===target.ownerId),raw=target.partId==='@self'?owner:owner?.parts?.find(p=>p.id===target.partId);
      if(!raw)return null;const at=+options.time?.()||0,key=workspace.revision+'|'+at;
      if(!cachedFrame||key!==frameKey||cachedFrame.scene!==scene){cachedFrame=api.modules.frame.create(scene,at);frameKey=key;}
      const frame=cachedFrame,values=frame.valuesFor(owner),source=target.partId==='@self'?{...values,x:0,y:0,x2:values.w,y2:values.h}:((values.parts||owner.parts).find(p=>p.id===raw.id)||raw),
        part=target.partId==='@self'?source:api.modules.content.partMotion(source,frame.time),config=api.modules.pathExtensions.normalize(part).elements;
      if(!config.enabled||!config.sourceId)return null;
      const plan=api.modules.pathInstances.plan(scene,frame,owner.id,config.sourceId),geometry=api.modules.pathGeometry.full(part),placements=api.modules.pathExtensions.build(part,geometry).instances;
      if(plan.status||plan.hidden||!placements.length)return null;
      const placement=placements.find(p=>api.modules.pathExtensions.visible(part,p.u,geometry.closed))||placements[0],
        local=target.partId==='@self'?api.modules.frame.IDENTITY:global.EditorClassicV4PartTransformController.localMatrix(part),matrix=api.modules.frame.multiply(values.worldMatrix,local),inverse=hit.invert(matrix);
      return inverse?{owner,raw,part,config,plan,placement,matrix,inverse}:null;
    }
    function screen(point){const rect=view.canvas.getBoundingClientRect(),scene=workspace.current();return{x:rect.left+point.x/scene.width*rect.width,y:rect.top+point.y/scene.height*rect.height};}
    function local(event,m){const rect=view.canvas.getBoundingClientRect(),scene=workspace.current();return hit.apply(m.inverse,(event.clientX-rect.left)/rect.width*scene.width,(event.clientY-rect.top)/rect.height*scene.height);}
    function refresh(){
      if(stopped)return;const m=model();if(!m){svg.style.display=move.style.display=rotate.style.display='none';return;}
      const points=api.modules.pathInstances.corners(m.placement,m.plan).map(([x,y])=>screen(hit.apply(m.matrix,x,y))),center=screen(hit.apply(m.matrix,...m.placement.point)),
        direction=screen(hit.apply(m.matrix,m.placement.point[0]+Math.cos(m.placement.angle),m.placement.point[1]+Math.sin(m.placement.angle))),length=Math.hypot(direction.x-center.x,direction.y-center.y)||1,
        turn={x:center.x+(direction.x-center.x)/length*34,y:center.y+(direction.y-center.y)/length*34};
      svg.style.display=move.style.display=rotate.style.display='block';polygon.setAttribute('points',points.map(p=>p.x+','+p.y).join(' '));
      for(const [name,value]of Object.entries({x1:center.x,y1:center.y,x2:turn.x,y2:turn.y}))line.setAttribute(name,value);
      Object.assign(move.style,{left:center.x+'px',top:center.y+'px'});Object.assign(rotate.style,{left:turn.x+'px',top:turn.y+'px'});
    }
    function tick(){raf=0;if(!target||stopped)return;refresh();raf=global.requestAnimationFrame(tick);}
    function cancel(){if(!gesture)return false;const g=gesture;gesture=null;g.node.releasePointerCapture?.(g.pointer);changes.cancel(g.token);return true;}
    function close(notify=true){cancel();target=null;cachedFrame=null;if(raf)global.cancelAnimationFrame(raf);raf=0;refresh();if(notify)options.onChange?.();}
    function toggle(ownerId,partId){if(target&&target.ownerId===ownerId&&target.partId===partId){close();return;}close(false);target={ownerId,partId};refresh();raf=global.requestAnimationFrame(tick);options.onChange?.();}
    function start(kind,event){
      if(event.button!==0)return;const m=model();if(!m)return;event.preventDefault();event.stopImmediatePropagation();
      const point=local(event,m),node=kind==='move'?move:rotate;
      gesture={kind,node,pointer:event.pointerId,model:m,start:point,token:changes.begin(kind==='move'?'移动排布样本':'旋转排布样本'),target:{...target}};node.setPointerCapture?.(event.pointerId);
    }
    function drag(event){
      const g=gesture;if(!g||event.pointerId!==g.pointer)return;event.preventDefault();event.stopImmediatePropagation();const point=local(event,g.model),m=g.model,c=m.config;
      workspace.mutate(scene=>{
        const owner=scene.entities.find(e=>e.id===g.target.ownerId),part=g.target.partId==='@self'?owner:owner?.parts.find(p=>p.id===g.target.partId);if(!part)return;
        if(g.kind==='move'){
          const dx=point.x-g.start.x,dy=point.y-g.start.y;
          global.EditorClassicV4PathExtensions.set(part,'elements.along',Math.round((c.along+dx*m.placement.tangent[0]+dy*m.placement.tangent[1])*10)/10);
          global.EditorClassicV4PathExtensions.set(part,'elements.normal',Math.round((c.normal+dx*m.placement.normal[0]+dy*m.placement.normal[1])*10)/10);
        }else{
          const center=m.placement.point,a=Math.atan2(point.y-center[1],point.x-center[0]),b=Math.atan2(g.start.y-center[1],g.start.x-center[0]),delta=((a-b+Math.PI*3)%(Math.PI*2))-Math.PI;
          global.EditorClassicV4PathExtensions.set(part,'elements.angle',Math.round((c.angle+delta*180/Math.PI)*10)/10);
        }
      });
    }
    function finish(event){if(!gesture||event.pointerId!==gesture.pointer)return;event.preventDefault();event.stopImmediatePropagation();const g=gesture;gesture=null;g.node.releasePointerCapture?.(g.pointer);changes.commit(g.token);refresh();}
    function pointerCancel(event){if(gesture&&event.pointerId===gesture.pointer){event.preventDefault();event.stopImmediatePropagation();cancel();}}
    function key(event){if(event.key!=='Escape'||!target)return;event.preventDefault();event.stopImmediatePropagation();event.__classicV4TransformHandled=true;if(!cancel())close();}
    move.addEventListener('pointerdown',e=>start('move',e));rotate.addEventListener('pointerdown',e=>start('rotate',e));
    global.addEventListener('pointermove',drag,true);global.addEventListener('pointerup',finish,true);global.addEventListener('pointercancel',pointerCancel,true);global.addEventListener('keydown',key,true);global.addEventListener('blur',cancel);
    const unsubscribe=workspace.subscribe(()=>{
      if(scope!==workspace.moduleScope){
        scope=workspace.moduleScope;
        // Opening another project must not cancel by restoring the old project's
        // gesture snapshot into the new document. Drop that transaction instead.
        const g=gesture;gesture=null;g?.node.releasePointerCapture?.(g.pointer);close(false);options.onProjectChange?.();return;
      }
      if(target){const owner=workspace.current()?.entities?.find(e=>e.id===target.ownerId),part=target.partId==='@self'?owner:owner?.parts?.find(p=>p.id===target.partId);if(!part?.extensions?.elements?.enabled||!part.extensions.elements.sourceId){close(false);return;}}
      refresh();
    }),unselect=view.subscribeSelection(()=>{if(target&&(view.selectedId!==target.ownerId||target.partId!=='@self'&&view.selectedPartId!==target.partId))close();});
    function stop(){close(false);stopped=true;unsubscribe();unselect();global.removeEventListener('pointermove',drag,true);global.removeEventListener('pointerup',finish,true);global.removeEventListener('pointercancel',pointerCancel,true);global.removeEventListener('keydown',key,true);global.removeEventListener('blur',cancel);svg.remove();move.remove();rotate.remove();}
    return Object.freeze({toggle,close,stop,refresh,get target(){return target;}});
  }
  global.EditorClassicV4PathInstanceEditor=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
