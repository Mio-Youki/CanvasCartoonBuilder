/* Classic Shell particle command bridge for the active v4 Workspace. */
(function(global){
  'use strict';
  function create(options){options=options||{};const workspace=options.workspace,view=options.view,changes=options.changes,active=options.active||(()=>true),state=global.EditorVNextParticleState,root=options.root||document,button=root.getElementById('btn-particle');if(!workspace||!view||!changes||!state||!button)throw new Error('Classic v4 Particle Controller dependencies are incomplete');let stopped=false;
    function selection(){const ids=view.selectedIds||[];if(ids.length!==1||view.selectedPartId)return null;return state.eligible(workspace.requireDocument(),ids[0])?ids[0]:null;}
    function sync(){if(stopped||!active())return;const ids=view.selectedIds||[],source=selection();button.disabled=ids.length>0&&!source;button.title=source?'将所选对象创建为动态关联粒子':'新建默认粒子';}
    function click(event){if(stopped||!active())return;event.preventDefault();event.stopImmediatePropagation();const sourceId=selection();if((view.selectedIds||[]).length&&!sourceId)return;const created=changes.run(sourceId?'将所选对象粒子化':'新建默认粒子',scene=>state.create(scene,{sourceId:sourceId||null,presetId:sourceId?'snow':'snow',name:sourceId?((state.entity(scene,sourceId).name||sourceId)+' · 粒子'):'雪 · 粒子'}));if(created)view.select(created.id);sync();}
    button.addEventListener('click',click,true);const offSelection=view.subscribeSelection(sync),offWorkspace=workspace.subscribe(sync);sync();
    function stop(){stopped=true;button.removeEventListener('click',click,true);offSelection();offWorkspace();}
    return Object.freeze({sync,stop,createFromSelection:click});
  }
  global.EditorClassicV4ParticleController=Object.freeze({version:1,create});
})(typeof window!=='undefined'?window:globalThis);
