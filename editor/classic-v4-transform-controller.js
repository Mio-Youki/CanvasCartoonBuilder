/* Classic Shell pointer transforms for v4 entities. One gesture creates one history entry. */
(function (global) {
  'use strict';

  function finite(value, fallback) { value=+value; return Number.isFinite(value)?value:fallback; }
  function multiply(left,right){return[left[0]*right[0]+left[2]*right[1],left[1]*right[0]+left[3]*right[1],left[0]*right[2]+left[2]*right[3],left[1]*right[2]+left[3]*right[3],left[0]*right[4]+left[2]*right[5]+left[4],left[1]*right[4]+left[3]*right[5]+left[5]];}
  function around(cx,cy,a,b,c,d){return[a,b,c,d,cx-a*cx-c*cy,cy-b*cx-d*cy];}
  function create(options) {
    options=options||{};
    const workspace=options.workspace, view=options.view, timing=options.timing||null, root=options.root||document;
    if(!workspace||!view||!global.EditorVNextSceneMutation)throw new Error('Classic v4 Transform Controller requires Workspace, View and SceneMutation');
    const wrap=root.getElementById('stage-wrap');
    if(!wrap)throw new Error('Classic v4 Transform Controller cannot find the stage');
    const changes=options.changes||global.EditorVNextSceneMutation.create(workspace);
    const layer=root.createElement('div'); layer.id='v4-transform-layer';
    Object.assign(layer.style,{position:'absolute',zIndex:'5',pointerEvents:'none',overflow:'visible'});
    const box=root.createElement('div'); box.className='v4-transform-box';
    Object.assign(box.style,{position:'absolute',boxSizing:'border-box',border:'1px solid #ffd23f',transformOrigin:'50% 50%',pointerEvents:'auto',cursor:'move'});
    // The border follows the object matrix. Controls deliberately live beside it so
    // skew / scale never turns their fixed-size hit targets into giant buttons.
    const controls=root.createElement('div'); controls.className='v4-transform-controls';
    Object.assign(controls.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'visible',zIndex:'3'});
    const handles={};
    const handleCursor={nw:'nwse-resize',n:'ns-resize',ne:'nesw-resize',e:'ew-resize',se:'nwse-resize',s:'ns-resize',sw:'nesw-resize',w:'ew-resize'};
    for(const corner of ['nw','n','ne','e','se','s','sw','w']){const handle=root.createElement('button');handle.type='button';handle.dataset.corner=corner;handle.className='v4-transform-handle '+corner;handle.setAttribute('aria-label','缩放 '+corner);Object.assign(handle.style,{position:'absolute',width:'9px',height:'9px',minWidth:'0',minHeight:'0',boxSizing:'border-box',padding:'0',border:'1px solid #1a1d25',background:'#ffd23f',zIndex:'2',cursor:handleCursor[corner],pointerEvents:'auto',transform:'translate(-50%,-50%)'});controls.append(handle);handles[corner]=handle;}
    const rotate=root.createElement('button');rotate.type='button';rotate.className='v4-transform-rotate';rotate.setAttribute('aria-label','旋转');rotate.textContent='↻';Object.assign(rotate.style,{position:'absolute',width:'18px',height:'18px',minWidth:'0',minHeight:'0',boxSizing:'border-box',padding:'0',border:'1px solid #ffd23f',borderRadius:'50%',background:'#161a22',color:'#ffd23f',fontSize:'12px',lineHeight:'15px',cursor:'grab',pointerEvents:'auto',transform:'translate(-50%,-50%)'});controls.append(rotate);
    const mirrorH=root.createElement('button'),mirrorV=root.createElement('button');
    mirrorH.type=mirrorV.type='button';mirrorH.className='v4-transform-mirror h';mirrorV.className='v4-transform-mirror v';mirrorH.setAttribute('aria-label','水平镜像');mirrorV.setAttribute('aria-label','垂直镜像');mirrorH.textContent='↔';mirrorV.textContent='↕';
    const mirrorStyle={position:'absolute',width:'18px',height:'18px',minWidth:'0',minHeight:'0',boxSizing:'border-box',padding:'0',border:'1px solid #ffd23f',background:'#161a22',color:'#ffd23f',fontSize:'11px',lineHeight:'15px',cursor:'pointer',pointerEvents:'auto',transform:'translate(-50%,-50%)'};Object.assign(mirrorH.style,mirrorStyle);Object.assign(mirrorV.style,mirrorStyle);controls.append(mirrorH,mirrorV);
    const pivotButton=root.createElement('button');pivotButton.type='button';pivotButton.className='v4-transform-pivot';pivotButton.setAttribute('aria-label','设置旋转中心');pivotButton.title='单击后在画布设置旋转中心；右键恢复默认中心';pivotButton.textContent='◎';Object.assign(pivotButton.style,mirrorStyle);controls.append(pivotButton);
    const pivotMarker=root.createElement('div');pivotMarker.className='v4-transform-pivot-marker';Object.assign(pivotMarker.style,{position:'absolute',width:'13px',height:'13px',marginLeft:'-7px',marginTop:'-7px',border:'1px solid #ffd23f',borderRadius:'50%',boxSizing:'border-box',pointerEvents:'none',display:'none'});pivotMarker.innerHTML='<span style="position:absolute;left:5px;top:-4px;width:1px;height:19px;background:#ffd23f"></span><span style="position:absolute;left:-4px;top:5px;width:19px;height:1px;background:#ffd23f"></span>';layer.append(box,controls,pivotMarker);wrap.append(layer);
    let gesture=null, stopped=false, pivotEditing=false;
    function scene(){return workspace.requireDocument();}
    function entity(){return(scene().entities||[]).find(item=>item&&item.id===view.selectedId)||null;}
    function selectedEntities(){if(view.selectedPartId)return[];const ids=new Set(view.selectedIds||[]),items=(scene().entities||[]).filter(item=>ids.has(item.id)),byId=new Map((scene().entities||[]).map(item=>[item.id,item]));return items.filter(item=>{let cursor=item,parent=byId.get(item.parentId),guard=0;if(cursor.locked)return false;while(parent&&guard++<100){if(parent.locked)return false;if(ids.has(parent.id))return false;parent=byId.get(parent.parentId);}return true;});}
    function frame(){return global.ToSampoolRuntimeVNext.modules.frame.create(scene(),options.time?options.time():0);}
    function selectionBounds(items,at){const points=[];for(const item of items){const values=at.valuesFor(item),matrix=values.worldMatrix,w=Math.max(1,finite(values.w,1)),h=Math.max(1,finite(values.h,1));for(const point of [[0,0],[w,0],[w,h],[0,h]])points.push({x:matrix[0]*point[0]+matrix[2]*point[1]+matrix[4],y:matrix[1]*point[0]+matrix[3]*point[1]+matrix[5]});}if(!points.length)return null;const xs=points.map(point=>point.x),ys=points.map(point=>point.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(1,Math.max(...xs)-Math.min(...xs)),h:Math.max(1,Math.max(...ys)-Math.min(...ys))};}
    function syncLayer(){const canvasRect=view.canvas.getBoundingClientRect(),wrapRect=wrap.getBoundingClientRect();Object.assign(layer.style,{left:(canvasRect.left-wrapRect.left)+'px',top:(canvasRect.top-wrapRect.top)+'px',width:canvasRect.width+'px',height:canvasRect.height+'px'});}
    function pivotFor(item){const pivot=item&&item.pivot,custom=pivot&&pivot.mode==='custom';return{x:custom?Math.max(0,Math.min(1,finite(pivot.x,.5))):.5,y:custom?Math.max(0,Math.min(1,finite(pivot.y,.5))):.5,custom};}
    function applyAccent(accent){box.style.borderColor=accent;for(const handle of Object.values(handles)){handle.style.background=accent;handle.style.borderColor='#1a1d25';}for(const control of [rotate,mirrorH,mirrorV,pivotButton]){control.style.borderColor=accent;if(control!==pivotButton||!pivotEditing)control.style.color=accent;}pivotMarker.style.borderColor=accent;for(const line of pivotMarker.querySelectorAll('span'))line.style.background=accent;}
    function setControl(control,point,visible){control.style.display=visible?'block':'none';if(visible){control.style.left=point.x+'px';control.style.top=point.y+'px';}}
    function midpoint(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
    function normalFrom(a,b,inside){let x=-(b.y-a.y),y=b.x-a.x,length=Math.hypot(x,y)||1;x/=length;y/=length;if(x*(inside.x-a.x)+y*(inside.y-a.y)>0){x=-x;y=-y;}return{x,y};}
    function positionControls(points,showPivot){
      controls.style.display='block';
      const [nw,ne,se,sw]=points,center={x:(nw.x+ne.x+se.x+sw.x)/4,y:(nw.y+ne.y+se.y+sw.y)/4};
      const pointsByHandle={nw,n:midpoint(nw,ne),ne,e:midpoint(ne,se),se,s:midpoint(se,sw),sw,w:midpoint(sw,nw)};
      for(const [name,handle] of Object.entries(handles))setControl(handle,pointsByHandle[name],true);
      const top=pointsByHandle.n,right=pointsByHandle.e,topNormal=normalFrom(nw,ne,center),rightNormal=normalFrom(ne,se,center);
      const topVector={x:(ne.x-nw.x)/(Math.hypot(ne.x-nw.x,ne.y-nw.y)||1),y:(ne.y-nw.y)/(Math.hypot(ne.x-nw.x,ne.y-nw.y)||1)};
      setControl(rotate,{x:top.x+topNormal.x*28,y:top.y+topNormal.y*28},true);
      setControl(pivotButton,{x:top.x+topNormal.x*49-topVector.x*22,y:top.y+topNormal.y*49-topVector.y*22},showPivot);
      setControl(mirrorH,{x:top.x+topNormal.x*49+topVector.x*22,y:top.y+topNormal.y*49+topVector.y*22},true);
      setControl(mirrorV,{x:right.x+rightNormal.x*20,y:right.y+rightNormal.y*20},true);
    }
    function hideControls(){controls.style.display='none';}
    function refresh(){
      if(stopped)return;
      syncLayer();
      const items=selectedEntities();
      if(!items.length){box.style.display='none';hideControls();pivotMarker.style.display='none';return;}
      const accent=items.length===1&&items[0].type==='group'?'#c879ff':'#ffd23f';
      applyAccent(accent);
      if(items.length===1&&view.scopeContainerId===items[0].id){box.style.display='none';hideControls();pivotMarker.style.display='none';return;}
      const value=scene(),sx=layer.clientWidth/Math.max(1,value.width),sy=layer.clientHeight/Math.max(1,value.height),at=frame();
      if(items.length>1){
        const bounds=selectionBounds(items,at);
        box.style.display='block';box.style.left=bounds.x*sx+'px';box.style.top=bounds.y*sy+'px';box.style.width=Math.max(8,bounds.w*sx)+'px';box.style.height=Math.max(8,bounds.h*sy)+'px';box.style.transformOrigin='50% 50%';box.style.transform='none';
        positionControls([{x:bounds.x*sx,y:bounds.y*sy},{x:(bounds.x+bounds.w)*sx,y:bounds.y*sy},{x:(bounds.x+bounds.w)*sx,y:(bounds.y+bounds.h)*sy},{x:bounds.x*sx,y:(bounds.y+bounds.h)*sy}],false);
        pivotMarker.style.display='none';
        return;
      }
      const item=items[0],values=at.valuesFor(item),matrix=values.worldMatrix,baseW=Math.max(1,finite(values.w,1)),baseH=Math.max(1,finite(values.h,1)),pivot=pivotFor(item),pivotLocalX=baseW*pivot.x,pivotLocalY=baseH*pivot.y,pivotWorldX=matrix[0]*pivotLocalX+matrix[2]*pivotLocalY+matrix[4],pivotWorldY=matrix[1]*pivotLocalX+matrix[3]*pivotLocalY+matrix[5];
      box.style.display='block';
      if(Math.abs(+values.skewX||0)>.001||Math.abs(+values.skewY||0)>.001){box.style.left='0px';box.style.top='0px';box.style.width=Math.max(8,baseW)+'px';box.style.height=Math.max(8,baseH)+'px';box.style.transformOrigin='0 0';box.style.transform=`matrix(${matrix[0]*sx},${matrix[1]*sy},${matrix[2]*sx},${matrix[3]*sy},${matrix[4]*sx},${matrix[5]*sy})`;}
      else{const scaleX=Math.hypot(matrix[0],matrix[1])||1,scaleY=(matrix[0]*matrix[3]-matrix[1]*matrix[2])/scaleX,displayW=baseW*Math.abs(scaleX),displayH=baseH*Math.abs(scaleY),pivotDisplayX=(scaleX<0?1-pivot.x:pivot.x)*displayW,pivotDisplayY=(scaleY<0?1-pivot.y:pivot.y)*displayH,rotation=Math.atan2(matrix[1],matrix[0])*180/Math.PI;box.style.left=(pivotWorldX-pivotDisplayX)*sx+'px';box.style.top=(pivotWorldY-pivotDisplayY)*sy+'px';box.style.width=Math.max(8,displayW*sx)+'px';box.style.height=Math.max(8,displayH*sy)+'px';box.style.transformOrigin=(pivotDisplayX*sx)+'px '+(pivotDisplayY*sy)+'px';box.style.transform='rotate('+rotation+'deg)';}
      const controlPoints=[[0,0],[baseW,0],[baseW,baseH],[0,baseH]].map(point=>({x:(matrix[0]*point[0]+matrix[2]*point[1]+matrix[4])*sx,y:(matrix[1]*point[0]+matrix[3]*point[1]+matrix[5])*sy}));
      positionControls(controlPoints,true);
      pivotButton.style.background=pivotEditing?accent:'#161a22';pivotButton.style.color=pivotEditing?'#161a22':accent;
      pivotMarker.style.left=pivotWorldX*sx+'px';pivotMarker.style.top=pivotWorldY*sy+'px';pivotMarker.style.display=pivot.custom||pivotEditing?'block':'none';
    }
    function point(event){const rect=layer.getBoundingClientRect(),value=scene();return{x:(event.clientX-rect.left)/Math.max(1,rect.width)*value.width,y:(event.clientY-rect.top)/Math.max(1,rect.height)*value.height};}
    function writeMatrix(item,matrix){const w=Math.max(1,finite(item.w,1)),h=Math.max(1,finite(item.h,1)),pivot=pivotFor(item),px=w*pivot.x,py=h*pivot.y,sx=Math.hypot(matrix[0],matrix[1])||1,det=matrix[0]*matrix[3]-matrix[1]*matrix[2],sy=det/sx;item.scaleX=sx;item.scaleY=sy;item.rot=Math.atan2(matrix[1],matrix[0])*180/Math.PI;item.x=Math.round(matrix[4]-px+matrix[0]*px+matrix[2]*py);item.y=Math.round(matrix[5]-py+matrix[1]*px+matrix[3]*py);}
    function matrixPoint(matrix,x,y){return{x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]};}
    function matrixVector(matrix,x,y){return{x:matrix[0]*x+matrix[2]*y,y:matrix[1]*x+matrix[3]*y};}
    function anchoredPatch(base,candidate,anchor){const runtime=global.ToSampoolRuntimeVNext,frameApi=runtime&&runtime.modules&&runtime.modules.frame;if(!frameApi)return candidate;const oldAnchor=matrixPoint(base.worldMatrix,anchor.x,anchor.y),nextWorld=frameApi.multiply(base.parentMatrix,frameApi.matrixFor(candidate)),nextAnchor=matrixPoint(nextWorld,anchor.x,anchor.y),inverse=global.EditorVNextCanvasHit&&global.EditorVNextCanvasHit.invert(base.parentMatrix);if(!inverse)return candidate;const worldDelta={x:oldAnchor.x-nextAnchor.x,y:oldAnchor.y-nextAnchor.y},localDelta=matrixVector(inverse,worldDelta.x,worldDelta.y);candidate.x+=localDelta.x;candidate.y+=localDelta.y;return candidate;}
    function applyDelta(delta){workspace.mutate(value=>{for(const snap of gesture.base.items){const item=(value.entities||[]).find(entry=>entry&&entry.id===snap.id);if(!item)continue;const inverse=global.EditorVNextCanvasHit.invert(snap.parentMatrix);if(!inverse)continue;writeMatrix(item,multiply(inverse,multiply(delta,snap.worldMatrix)));}});}
    function begin(kind,event,corner){let items=selectedEntities(),token=null;if(!items.length||gesture||pivotEditing)return;event.preventDefault();event.stopPropagation();if(kind==='move'&&event.altKey&&typeof options.duplicate==='function'){token=changes.begin(items.length>1?'复制并移动多个对象':'复制并移动对象');const duplicated=options.duplicate({history:false,offset:{x:0,y:0}});if(!duplicated||!duplicated.length){changes.cancel(token);return;}items=selectedEntities();}const p=point(event),at=frame(),bounds=selectionBounds(items,at),multi=items.length>1;if(multi){const base={multi:true,bounds,pivotWorldX:bounds.x+bounds.w/2,pivotWorldY:bounds.y+bounds.h/2,items:items.map(item=>{const values=at.valuesFor(item);return{id:item.id,worldMatrix:values.worldMatrix.slice(),parentMatrix:(values.parentMatrix||[1,0,0,1,0,0]).slice()};})};gesture={kind,corner,start:p,base,token:token||changes.begin(kind==='move'?'移动多个对象':kind==='scale'?'缩放多个对象':'旋转多个对象'),pointerId:event.pointerId,target:event.currentTarget};if(kind==='rotate')gesture.angle=Math.atan2(p.y-base.pivotWorldY,p.x-base.pivotWorldX)*180/Math.PI;event.currentTarget.setPointerCapture?.(event.pointerId);return;}const item=items[0],values=at.valuesFor(item),pivot=pivotFor(item),base={id:item.id,x:finite(values.x,item.x||0),y:finite(values.y,item.y||0),w:Math.max(1,finite(values.w,item.w||1)),h:Math.max(1,finite(values.h,item.h||1)),scaleX:finite(values.scaleX,item.scaleX??1),scaleY:finite(values.scaleY,item.scaleY??1),rot:finite(values.rot,item.rot||0),skewX:finite(values.skewX,item.skewX||0),skewY:finite(values.skewY,item.skewY||0),pivot:item.pivot?JSON.parse(JSON.stringify(item.pivot)):null,pivotX:pivot.x,pivotY:pivot.y,worldMatrix:(values.worldMatrix||[1,0,0,1,0,0]).slice(),parentMatrix:(values.parentMatrix||[1,0,0,1,0,0]).slice()};const pivotWorld=matrixPoint(base.worldMatrix,base.w*base.pivotX,base.h*base.pivotY);base.pivotWorldX=pivotWorld.x;base.pivotWorldY=pivotWorld.y;gesture={kind,corner,start:p,base,timed:!!(timing&&timing.shouldWriteTiming&&timing.shouldWriteTiming(item.id)),token:token||changes.begin(kind==='move'?'移动对象':kind==='scale'?'缩放对象':'旋转对象'),pointerId:event.pointerId,target:event.currentTarget};if(kind==='rotate')gesture.angle=Math.atan2(p.y-base.pivotWorldY,p.x-base.pivotWorldX)*180/Math.PI-base.rot;event.currentTarget.setPointerCapture?.(event.pointerId);}
    function writePatch(patch){for(const key of ['x','y','w','h'])if(Number.isFinite(+patch[key]))patch[key]=Math.round(+patch[key]);workspace.mutate(value=>{const item=(value.entities||[]).find(entry=>entry&&entry.id===gesture.base.id);if(!item)return;if(gesture.timed&&timing&&timing.writeTimedPatch)timing.writeTimedPatch(value,item.id,patch);else Object.assign(item,patch);});}
    function move(event){
      if(!gesture||event.pointerId!==gesture.pointerId)return;
      event.preventDefault();
      const p=point(event),base=gesture.base,sideHandle=['n','e','s','w'].includes(gesture.corner);
      if(base.multi){
        if(gesture.kind==='move'){applyDelta([1,0,0,1,p.x-gesture.start.x,p.y-gesture.start.y]);return;}
        if(gesture.kind==='rotate'){let angle=Math.atan2(p.y-base.pivotWorldY,p.x-base.pivotWorldX)*180/Math.PI-gesture.angle;if(event.shiftKey)angle=Math.round(angle/15)*15;const radians=angle*Math.PI/180;applyDelta(around(base.pivotWorldX,base.pivotWorldY,Math.cos(radians),Math.sin(radians),-Math.sin(radians),Math.cos(radians)));return;}
        if(sideHandle){
          if(gesture.corner==='n'||gesture.corner==='s'){const anchorY=gesture.corner==='n'?base.bounds.y+base.bounds.h:base.bounds.y,scaleY=Math.max(1/base.bounds.h,Math.abs((p.y-anchorY)/(gesture.corner==='n'?-base.bounds.h:base.bounds.h)));applyDelta(around(base.bounds.x+base.bounds.w/2,anchorY,1,0,0,scaleY));}
          else{const anchorX=gesture.corner==='w'?base.bounds.x+base.bounds.w:base.bounds.x,scaleX=Math.max(1/base.bounds.w,Math.abs((p.x-anchorX)/(gesture.corner==='w'?-base.bounds.w:base.bounds.w)));applyDelta(around(anchorX,base.bounds.y+base.bounds.h/2,scaleX,0,0,1));}
          return;
        }
        const signs={nw:[-1,-1],ne:[1,-1],se:[1,1],sw:[-1,1]}[gesture.corner],signX=signs[0],signY=signs[1],oppositeX=signX>0?base.bounds.x:base.bounds.x+base.bounds.w,oppositeY=signY>0?base.bounds.y:base.bounds.y+base.bounds.h;let width=Math.max(1,(p.x-oppositeX)*signX),height=Math.max(1,(p.y-oppositeY)*signY),scaleX=width/base.bounds.w,scaleY=height/base.bounds.h;if(event.shiftKey){const uniform=Math.max(scaleX,scaleY);scaleX=uniform;scaleY=uniform;}applyDelta(around(oppositeX,oppositeY,scaleX,0,0,scaleY));return;
      }
      if(gesture.kind==='move'){writePatch({x:base.x+p.x-gesture.start.x,y:base.y+p.y-gesture.start.y});return;}
      if(gesture.kind==='rotate'){let rot=Math.atan2(p.y-base.pivotWorldY,p.x-base.pivotWorldX)*180/Math.PI-gesture.angle;if(event.shiftKey)rot=Math.round(rot/15)*15;writePatch({rot});return;}
      if(sideHandle){
        const inverse=global.EditorVNextCanvasHit&&global.EditorVNextCanvasHit.invert(base.worldMatrix);if(!inverse)return;
        const local=global.EditorVNextCanvasHit.apply(inverse,p.x,p.y),startLocal=global.EditorVNextCanvasHit.apply(inverse,gesture.start.x,gesture.start.y),candidate=Object.assign({},base);
        if(event.altKey){
          if(gesture.corner==='n'||gesture.corner==='s'){const sign=gesture.corner==='n'?-1:1;candidate.skewX=Math.round(Math.max(-80,Math.min(80,base.skewX+sign*Math.atan((local.x-startLocal.x)/Math.max(1,base.h))*180/Math.PI))*10)/10;Object.assign(candidate,anchoredPatch(base,candidate,{x:base.w/2,y:gesture.corner==='n'?base.h:0}));writePatch({x:candidate.x,y:candidate.y,skewX:candidate.skewX,skewY:candidate.skewY});}
          else{const sign=gesture.corner==='w'?-1:1;candidate.skewY=Math.round(Math.max(-80,Math.min(80,base.skewY+sign*Math.atan((local.y-startLocal.y)/Math.max(1,base.w))*180/Math.PI))*10)/10;Object.assign(candidate,anchoredPatch(base,candidate,{x:gesture.corner==='w'?base.w:0,y:base.h/2}));writePatch({x:candidate.x,y:candidate.y,skewX:candidate.skewX,skewY:candidate.skewY});}
          return;
        }
        if(gesture.corner==='e'||gesture.corner==='w'){const dragX=gesture.corner==='e'?(base.scaleX<0?0:base.w):(base.scaleX<0?base.w:0),anchorX=dragX===0?base.w:0,factor=Math.max(1/base.w,Math.abs((local.x-anchorX)/((dragX-anchorX)||1)));candidate.scaleX=(base.scaleX<0?-1:1)*Math.abs(base.scaleX)*factor;Object.assign(candidate,anchoredPatch(base,candidate,{x:anchorX,y:base.h/2}));writePatch({x:candidate.x,y:candidate.y,scaleX:candidate.scaleX,scaleY:candidate.scaleY});}
        else{const dragY=gesture.corner==='s'?(base.scaleY<0?0:base.h):(base.scaleY<0?base.h:0),anchorY=dragY===0?base.h:0,factor=Math.max(1/base.h,Math.abs((local.y-anchorY)/((dragY-anchorY)||1)));candidate.scaleY=(base.scaleY<0?-1:1)*Math.abs(base.scaleY)*factor;Object.assign(candidate,anchoredPatch(base,candidate,{x:base.w/2,y:anchorY}));writePatch({x:candidate.x,y:candidate.y,scaleX:candidate.scaleX,scaleY:candidate.scaleY});}
        return;
      }
      const signs={nw:[-1,-1],ne:[1,-1],se:[1,1],sw:[-1,1]}[gesture.corner],visualX=signs[0],visualY=signs[1],localSignX=visualX*(base.scaleX<0?-1:1),localSignY=visualY*(base.scaleY<0?-1:1),dragX=localSignX>0?base.w:0,dragY=localSignY>0?base.h:0,oppositeLocalX=localSignX>0?0:base.w,oppositeLocalY=localSignY>0?0:base.h,angle=base.rot*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),pivotLocalX=base.w*base.pivotX,pivotLocalY=base.h*base.pivotY,opDx=(oppositeLocalX-pivotLocalX)*base.scaleX,opDy=(oppositeLocalY-pivotLocalY)*base.scaleY,oppositeX=base.pivotWorldX+cos*opDx-sin*opDy,oppositeY=base.pivotWorldY+sin*opDx+cos*opDy,dx=p.x-oppositeX,dy=p.y-oppositeY,localX=cos*dx+sin*dy,localY=-sin*dx+cos*dy;let nextScaleX=localX/((dragX-oppositeLocalX)||1),nextScaleY=localY/((dragY-oppositeLocalY)||1),minX=1/base.w,minY=1/base.h;nextScaleX=(base.scaleX<0?-1:1)*Math.max(minX,Math.abs(nextScaleX));nextScaleY=(base.scaleY<0?-1:1)*Math.max(minY,Math.abs(nextScaleY));if(event.shiftKey){const ratio=Math.max(.0001,Math.abs(base.scaleX)/Math.max(.0001,Math.abs(base.scaleY)));if(Math.abs(nextScaleX)/Math.abs(nextScaleY)>ratio)nextScaleY=(nextScaleY<0?-1:1)*Math.abs(nextScaleX)/ratio;else nextScaleX=(nextScaleX<0?-1:1)*Math.abs(nextScaleY)*ratio;}const nextOpDx=(oppositeLocalX-pivotLocalX)*nextScaleX,nextOpDy=(oppositeLocalY-pivotLocalY)*nextScaleY,nextX=oppositeX-pivotLocalX-(cos*nextOpDx-sin*nextOpDy),nextY=oppositeY-pivotLocalY-(sin*nextOpDx+cos*nextOpDy);writePatch({x:nextX,y:nextY,scaleX:nextScaleX,scaleY:nextScaleY});
    }
    function finish(event){if(!gesture||event.pointerId!==gesture.pointerId)return;event.preventDefault();gesture.target.releasePointerCapture?.(gesture.pointerId);changes.commit(gesture.token);gesture=null;refresh();}
    function cancel(){if(!gesture)return false;changes.cancel(gesture.token);gesture=null;refresh();return true;}
    box.addEventListener('pointerdown',event=>{if(event.target===box)begin('move',event);});
    box.addEventListener('dblclick',event=>{if(view.enterDrill&&view.enterDrill()){event.preventDefault();event.stopImmediatePropagation();}});
    for(const [corner,handle] of Object.entries(handles))handle.addEventListener('pointerdown',event=>begin('scale',event,corner));
    rotate.addEventListener('pointerdown',event=>begin('rotate',event));
    function mirror(axis,event){event.preventDefault();event.stopPropagation();const items=selectedEntities();if(!items.length)return;if(items.length===1){const target=items[0];changes.run(axis==='h'?'水平镜像':'垂直镜像',value=>{const item=(value.entities||[]).find(entry=>entry&&entry.id===target.id);if(!item)return;if(axis==='h')item.scaleX=-finite(item.scaleX,1);else item.scaleY=-finite(item.scaleY,1);item.rot=-finite(item.rot,0);});refresh();return;}const at=frame(),bounds=selectionBounds(items,at),cx=bounds.x+bounds.w/2,cy=bounds.y+bounds.h/2,delta=axis==='h'?around(cx,cy,-1,0,0,1):around(cx,cy,1,0,0,-1),snapshots=items.map(item=>{const values=at.valuesFor(item);return{id:item.id,worldMatrix:values.worldMatrix.slice(),parentMatrix:(values.parentMatrix||[1,0,0,1,0,0]).slice()};});changes.run(axis==='h'?'水平镜像多个对象':'垂直镜像多个对象',value=>{for(const snap of snapshots){const item=(value.entities||[]).find(entry=>entry&&entry.id===snap.id),inverse=global.EditorVNextCanvasHit.invert(snap.parentMatrix);if(item&&inverse)writeMatrix(item,multiply(inverse,multiply(delta,snap.worldMatrix)));}});refresh();}
    mirrorH.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();});mirrorV.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();});mirrorH.addEventListener('click',event=>mirror('h',event));mirrorV.addEventListener('click',event=>mirror('v',event));
    function setPivotMode(enabled){pivotEditing=!!enabled;layer.style.pointerEvents=pivotEditing?'auto':'none';layer.style.cursor=pivotEditing?'crosshair':'';refresh();}
    pivotButton.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();});pivotButton.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();setPivotMode(!pivotEditing);});pivotButton.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();const target=entity();if(!target)return;setPivotMode(false);changes.run('旋转中心复位',value=>{const item=(value.entities||[]).find(entry=>entry&&entry.id===target.id);if(item)delete item.pivot;});});
    layer.addEventListener('pointerdown',event=>{if(!pivotEditing)return;event.preventDefault();event.stopImmediatePropagation();const target=entity(),runtime=global.ToSampoolRuntimeVNext;if(!target||!runtime||!runtime.modules||!runtime.modules.frame)return;const p=point(event),frame=runtime.modules.frame.create(scene(),options.time?options.time():0),values=frame.valuesFor(target),inverse=global.EditorVNextCanvasHit&&global.EditorVNextCanvasHit.invert(values.worldMatrix);if(!inverse)return;const local=global.EditorVNextCanvasHit.apply(inverse,p.x,p.y),next={mode:'custom',x:Math.max(0,Math.min(1,local.x/Math.max(1,finite(target.w,1)))),y:Math.max(0,Math.min(1,local.y/Math.max(1,finite(target.h,1))))};changes.run('设置旋转中心',value=>{const item=(value.entities||[]).find(entry=>entry&&entry.id===target.id);if(item)item.pivot=next;});setPivotMode(false);},true);
    global.addEventListener('pointermove',move);global.addEventListener('pointerup',finish);global.addEventListener('pointercancel',finish);
    const keydown=event=>{if(event.key!=='Escape')return;if(pivotEditing){event.__classicV4TransformHandled=true;setPivotMode(false);event.preventDefault();event.stopPropagation();return;}if(cancel()){event.__classicV4TransformHandled=true;event.preventDefault();event.stopPropagation();}};global.addEventListener('keydown',keydown,true);
    const unsubscribeWorkspace=workspace.subscribe(refresh),unsubscribeSelection=view.subscribeSelection(()=>{setPivotMode(false);refresh();});const resize=global.ResizeObserver?new ResizeObserver(refresh):null;if(resize)resize.observe(wrap);refresh();
    function stop(){stopped=true;cancel();unsubscribeWorkspace();unsubscribeSelection();if(resize)resize.disconnect();global.removeEventListener('pointermove',move);global.removeEventListener('pointerup',finish);global.removeEventListener('pointercancel',finish);global.removeEventListener('keydown',keydown,true);layer.remove();}
    return Object.freeze({refresh,cancel,stop,changes,setPivotMode,get activeGesture(){return gesture&&gesture.kind;},get pivotEditing(){return pivotEditing;},layer,box});
  }
  global.EditorClassicV4TransformController=Object.freeze({version:1,create});
})(typeof window!=='undefined'?window:globalThis);
