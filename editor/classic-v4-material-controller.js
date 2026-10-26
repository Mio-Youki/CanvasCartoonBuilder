/* Project material projection. Definitions and Canvas instances stay independent. */
(function(global){
  'use strict';
  function create(options){
    const {workspace,changes,view,patterns}=options,root=options.root||document;
    const presets=global.EditorV4ElementPresets,lib=root.getElementById('lib');
    const button=root.createElement('button');button.id='btn-store-element';button.className='struct-action';button.type='button';button.textContent='库';button.title='将所选元素收入素材库';button.setAttribute('aria-label','收入素材库');
    root.getElementById('btn-particle').after(button);
    let selected=null,signature='',project=workspace.moduleScope,stopped=false,serial=0,moduleSignature=[];
    const previews=options.previews;
    function status(text,error){const node=root.getElementById('m-import');node.textContent=text;node.setAttribute('role',error?'alert':'status');}
    function eligible(){const ids=view.selectedIds||[],item=workspace.current()?.entities?.find(e=>e.id===ids[0]);return ids.length===1&&!view.selectedPartId&&item&&!item.referenceSourceOnly&&!item.particleSourceOnly;}
    function syncButton(){const linked=eligible()&&presets.linked(workspace.current(),view.selectedId);button.disabled=!eligible();button.textContent=linked?'↥':'库';button.dataset.materialCommand=linked?'update':'store';button.title=button.disabled?'选择一个完整元素或组后收入素材库':linked?'更新项目素材（不改变其他画布实例）':'将所选元素收入素材库';button.setAttribute('aria-label',linked?'更新项目素材':'收入素材库');const exportButton=root.getElementById('btn-export-material');if(exportButton)exportButton.disabled=lib.hidden||!(selected&&workspace.current()?.elementPresets?.[selected]||global.ToSampoolV4Assets?.selected());}
    function capture(){
      if(!eligible())throw Error('请选择一个完整元素或组；多选和单独图元不能直接入库');
      let id,updated;changes.run(presets.linked(workspace.current(),view.selectedId)?'更新项目素材':'收入素材库',scene=>{const result=presets.store(scene,view.selectedId);id=result.id;updated=result.updated;});
      selected=id;global.ToSampoolV4Assets?.select(null);patterns.open('assets');options.renderLibrary();
      lib.querySelector('[data-element-preset-id="'+CSS.escape(id)+'"]')?.scrollIntoView({block:'nearest'});
      status(updated?'已更新项目素材；其他画布实例保持不变':'已收入项目素材库');return id;
    }
    function place(id){
      const scene=workspace.current(),revision=workspace.revision,scope=workspace.moduleScope,ids=presets.references(scene.elementPresets[id]).filter(ref=>ref.kind==='module').map(ref=>ref.id);
      const put=()=>{if(workspace.current()!==scene||workspace.revision!==revision)throw Error('工程已变化，未加入画布');let item;changes.run('加入元素素材',value=>{item=presets.instantiate(value,id);});view.select(item.id);selected=id;options.renderLibrary();status('已加入画布');return item;};
      if(ids.some(moduleId=>!global.EditorV4ModuleInstances.ready(scene,moduleId,scope)))return global.EditorVNextModuleLoader.loadAuthorized(scene,ids,{scope}).then(put);return put();
    }
    function action(fn){const fail=error=>{status(error.message||String(error),true);return null;};try{const result=fn();return result?.then?result.catch(fail):result;}catch(error){return fail(error);}}
    function remove(id,kind){
      const scene=workspace.current(),name=kind==='asset'?scene.assets?.[id]?.name:scene.elementPresets?.[id]?.name;
      if(!(options.confirm||global.confirm)('从项目素材库移除“'+(name||id)+'”？画布对象、共享副本和工程所需资源会保留。'))return false;
      changes.run('移出项目素材库',value=>{if(kind==='asset')global.EditorVNextAssetState.hideAsset(value,id);else presets.remove(value,id);});
      if(selected===id)selected=null;options.renderLibrary();status('已移出项目素材库，画布对象保持不变');return true;
    }
    function appendBadge(card,label){if(card.querySelector('.v4-material-kind'))return;const node=root.createElement('span');node.className='v4-material-kind';node.textContent=label;card.append(node);}
    function renderElements(){
      if(stopped)return;serial++;const token=serial,scene=workspace.current();if(!scene)return;
      for(const card of lib.querySelectorAll('[data-v4-asset-id]')){const id=card.dataset.v4AssetId,descriptor=scene.assets?.[id],name=card.querySelector('.nm');appendBadge(card,descriptor?.frames?.length>1?'序列':'位图');if(selected)card.classList.remove('active');
        if(name){name.textContent=descriptor?.name||id;global.EditorClassicV4ResourceName.bind(name,{key:workspace.moduleScope+':asset:'+id,initial:()=>workspace.current().assets[id].name||id,apply:value=>changes.run('重命名素材',s=>{s.assets[id].name=value;}),error:e=>status(e.message,true)});}}
      lib.querySelectorAll('[data-element-preset-id]').forEach(node=>node.remove());
      const entries=Object.entries(scene.elementPresets||{});if(entries.length)lib.querySelector('.asset-empty')?.remove();
      for(const [id,preset]of entries){
        const card=root.createElement('div'),canvas=root.createElement('canvas'),name=root.createElement('div'),note=root.createElement('small'),add=root.createElement('button');
        card.className='lib-item v4-element-material'+(selected===id?' active':'');card.dataset.elementPresetId=id;card.tabIndex=0;card.setAttribute('role','group');card.setAttribute('aria-label',preset.name+' · 元素');
        canvas.width=160;canvas.height=96;name.className='lib-name';name.textContent=preset.name;name.title=preset.name;note.className='v4-material-note';
        global.EditorClassicV4ResourceName.bind(name,{key:workspace.moduleScope+':element:'+id,initial:()=>workspace.current().elementPresets[id].name,apply:value=>changes.run('重命名元素素材',s=>{s.elementPresets[id].name=value;}),error:e=>status(e.message,true)});
        add.type='button';add.className='asset-card-action add';add.textContent='→';add.title='加入到画布';add.setAttribute('aria-label','加入到画布');add.dataset.materialAction='place';add.onclick=event=>{event.stopPropagation();action(()=>place(id));};card.append(add);
        const del=root.createElement('button');del.className='asset-card-action delete';del.type='button';del.textContent='×';del.title='从项目素材库移除';del.dataset.materialAction='remove';del.onclick=event=>{event.stopPropagation();action(()=>remove(id,'element'));};card.append(del);
        const bake=root.createElement('button');bake.className='asset-card-action alpha';bake.type='button';bake.textContent='▧';bake.title='烘焙为位图或序列';bake.setAttribute('aria-label',bake.title);bake.dataset.materialAction='bake';bake.onclick=event=>{event.stopPropagation();action(()=>options.baking.open(id,bake));};card.append(bake);
        card.append(canvas,name,note);appendBadge(card,'元素');lib.append(card);
        const select=()=>{selected=id;global.ToSampoolV4Assets?.select(null);for(const row of lib.querySelectorAll('.lib-item')){const match=row.dataset.elementPresetId===id;row.classList.toggle('active',match);const actions=row.querySelector('.v4-material-actions');if(actions)actions.hidden=!match;}};
        card.onclick=()=>{select();syncButton();};card.onkeydown=event=>{if(event.target===card&&['Enter',' '].includes(event.key)){event.preventDefault();select();syncButton();}};
        previews.bind({card,canvas,load:()=>{if(workspace.current()!==scene||token!==serial)throw Error('项目已变化');return global.EditorV4MaterialPreview.element(scene,id,{...options.resolveOptions,sceneLocator:workspace.locator});},error:error=>{note.textContent=error?.message||'';note.title=note.textContent;}});
      }
      syncButton();
    }
    function clearElementSelection(){selected=null;}
    function selectPreset(id){selected=workspace.current()?.elementPresets?.[id]?id:null;global.ToSampoolV4Assets?.select(null);options.renderLibrary();}
    function assetClick(event){if(event.target.closest('[data-v4-asset-id]'))selected=null;}
    lib.addEventListener('click',assetClick,true);
    button.onclick=()=>action(capture);
    const offSelection=view.subscribeSelection(syncButton),offWorkspace=workspace.subscribe(()=>{
      if(project!==workspace.moduleScope){project=workspace.moduleScope;selected=null;previews.clear();serial++;}
      const scene=workspace.current(),next=JSON.stringify(scene?.elementPresets||{}),modules=Object.entries(scene?.modules||{}).flatMap(([id,value])=>[id,value.locator,value.source,JSON.stringify(value.manifest)]),implementationsChanged=modules.length!==moduleSignature.length||modules.some((value,index)=>value!==moduleSignature[index]);
      if(next!==signature||implementationsChanged){signature=next;moduleSignature=modules;const available=new Set(Object.keys(scene?.elementPresets||{}));if(!available.has(selected))selected=null;options.renderLibrary();}syncButton();
    });
    syncButton();options.renderLibrary();
    return Object.freeze({capture,place,remove,renderElements,clearElementSelection,selectPreset,syncControls:syncButton,settled:()=>previews.settled(),stop(){stopped=true;serial++;offSelection();offWorkspace();previews.clear();button.remove();lib.removeEventListener('click',assetClick,true);},get selected(){return selected;}});
  }
  global.EditorClassicV4MaterialController=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
