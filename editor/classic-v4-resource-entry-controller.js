/* Context entry composition. Pattern cards replace the retired management list. */
(function(global){
  'use strict';
  function create(options){
    const {workspace,view,resources,sharing}=options,root=options.root||document;
    const cards=global.EditorClassicV4PatternCards.create(options),bake=root.createElement('details'),summary=root.createElement('summary'),body=root.createElement('div'),note=root.createElement('div');
    bake.id='v4-material-baking';bake.className='v4-resource-section';bake.dataset.materialProjectOnly='';bake.open=true;summary.textContent='烘焙选中构件';note.className='v4-resource-message';note.setAttribute('role','status');body.append(note);bake.append(summary,body);root.getElementById('side-import').append(bake);
    const detach=resources.attachContexts(body);let stopped=false;
    function render(){if(stopped)return;const ids=view.selectedIds||[],target=ids.length===1&&!view.selectedPartId&&workspace.current()?.entities.find(e=>e.id===ids[0]&&e.type==='procedural');bake.dataset.contextEmpty=String(!target);bake.hidden=sharing.scope==='shared'||!target;cards.render();}
    const offStatus=resources.onStatus((text,error)=>{note.textContent=text;note.setAttribute('role',error?'alert':'status');}),offSelection=view.subscribeSelection(render),offWorkspace=workspace.subscribe(render);
    let offStop=()=>{};function stop(){if(stopped)return;stopped=true;offStop();offSelection();offWorkspace();offStatus();detach();cards.stop();bake.remove();}
    offStop=resources.onStop(stop);render();
    return Object.freeze({render,refresh:cards.refresh,stop,patterns:cards,settled:cards.settled});
  }
  global.EditorClassicV4ResourceEntryController=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
