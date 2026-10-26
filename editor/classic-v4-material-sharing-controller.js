/* Explicit shared publication UI; never writes back from a Canvas instance. */
(function(global){
  'use strict';
  function create(options){
    const {workspace,changes,view,materials,patterns,previews}=options,root=options.root||document;
    const library=options.library||global.EditorV4ResourceLibrary.create(),service=global.EditorV4MaterialSharing.create({library});
    const lib=root.getElementById('lib'),container=root.getElementById('side-import'),scopes=root.createElement('div'),shared=root.createElement('div');
    scopes.className='v4-material-scopes';shared.className='lib';shared.id='v4-shared-materials';shared.hidden=true;
    const scopeToggle=root.createElement('button'),scopeIcon=root.createElement('span'),scopeName=root.createElement('span');
    scopeToggle.className='small v4-material-scope-toggle';scopeToggle.type='button';scopeToggle.dataset.materialScopeSwitch='';
    scopeToggle.setAttribute('aria-label','显示共享素材');scopeToggle.setAttribute('aria-controls','lib v4-shared-materials');scopeIcon.setAttribute('aria-hidden','true');
    scopeToggle.append(scopeIcon,scopeName);scopeToggle.onclick=event=>{event.stopPropagation();setScope(scope==='shared'?'project':'shared');};scopes.append(scopeToggle);
    const actionBar=root.querySelector('.asset-import-actions'),importButtons=[...actionBar.querySelectorAll('.asset-import-buttons button')].filter(b=>b.id.startsWith('btn-import'));actionBar.prepend(scopes);lib.after(shared);
    let scope='project',busy=false,stopped=false,serial=0,project=workspace.moduleScope;const pending=new Set(),states=new Map();
    // Keep immutable scalar leaves (including locator strings) by reference.
    // Canvas drags must not repeatedly decode/hash unchanged image packages.
    function fingerprint(scene,selection){const out=[selection.kind,selection.id];
      const walk=value=>{if(value&&typeof value==='object'){const keys=Object.keys(value).sort();out.push(Array.isArray(value)?'array':'object',keys.length);for(const key of keys){out.push(key);walk(value[key]);}}else out.push(value);};
      walk([scene.assets,scene.elementPresets,scene.modules,scene.patternDefinitions,scene.patternResources,scene.materialShares]);return out;
    }
    async function shareState(scene,selection,values){const key=selection.kind+':'+selection.id,prior=states.get(key);if(prior&&values.length===prior.values.length&&values.every((v,i)=>Object.is(v,prior.values[i])))return prior.result;
      if(!service.linkFor(scene,selection))return{active:false,changed:false,record:null};
      const entry={values,result:null};entry.result=service.state(JSON.parse(JSON.stringify(scene)),selection,resolver()).catch(error=>{if(states.get(key)===entry)states.delete(key);throw error;});states.set(key,entry);return entry.result;
    }
    function status(text,error){const node=root.getElementById('m-import');node.textContent=text;node.setAttribute('role',error?'alert':'status');}
    function token(){return{scene:workspace.current(),revision:workspace.revision,scope:workspace.moduleScope};}
    function ensure(guard){if(stopped||workspace.current()!==guard.scene||workspace.revision!==guard.revision||workspace.moduleScope!==guard.scope)throw Error('工程已变化，当前工程未写入；请重试');}
    function resolver(){return {...options.resolveOptions,resolveAsset:options.resolveAsset,resolveModule:options.resolveModule};}
    function track(task){pending.add(task);task.finally(()=>pending.delete(task));return task;}
    async function perform(fn){if(busy||stopped)return;busy=true;container.setAttribute('aria-busy','true');try{await fn();}catch(error){status(error.message||String(error),true);}finally{busy=false;states.clear();container.removeAttribute('aria-busy');renderProject();if(scope==='shared')void refresh();}}
    function setScope(next){
      previews.stop();states.clear();scope=next==='shared'?'shared':'project';
      lib.hidden=scope!=='project';shared.hidden=scope!=='shared';
      for(const panel of container.querySelectorAll('[data-material-project-only]'))panel.hidden=scope!=='project'||panel.dataset.contextEmpty==='true';
      scopeToggle.dataset.materialScope=scope==='shared'?'project':'shared';scopeToggle.dataset.materialScopeCurrent=scope;
      scopeToggle.setAttribute('aria-pressed',String(scope==='shared'));scopeToggle.title=scope==='shared'?'当前：共享；点击查看项目素材':'当前：项目；点击查看共享素材';
      scopeIcon.textContent=scope==='shared'?'♥':'♡';scopeName.textContent=scope==='shared'?'共享':'项目';
      if(scope==='shared')void refresh();else renderProject();materials.syncControls?.();
    }
    function button(label,fn,parent,action){const node=root.createElement('button');node.className='small';node.type='button';node.textContent=label;if(action)node.dataset.shareAction=action;node.onclick=event=>{event.stopPropagation();void perform(fn);};parent.append(node);return node;}
    async function publish(selection){
      const guard=token(),snapshot=JSON.parse(JSON.stringify(guard.scene));let saved=false;
      try{const result=await service.publish(snapshot,selection,{...resolver(),guard:()=>ensure(guard)});saved=true;ensure(guard);changes.run('发布共享素材',scene=>service.setLink(scene,selection,result.link));status('已发布到共享素材');}
      catch(error){if(saved)throw Error('共享已保存，但工程已变化；当前工程未写入，请在共享中查看');throw error;}
    }
    async function remove(selection,record){
      if(!(options.confirm||global.confirm)('从共享库移除“'+record.name+'”？各工程已复制的素材和画布对象不会删除。'))return;
      const guard=token();await library.unpublish(record.id,{expectedRevision:record.revision,guard:()=>ensure(guard)});
      try{ensure(guard);}catch(_){throw Error('已移出共享，但工程已变化；当前工程未写入，已有素材和画布不变');}
      changes.run('取消共享素材',scene=>{for(const [key,link]of Object.entries(scene.materialShares||{}))if(link.publicationId===record.id)delete scene.materialShares[key];});status('已移出共享，项目素材和画布保持不变');
    }
    async function decorate(card,selection,stamp,values){
      const controls=root.createElement('div');controls.className='v4-material-share-controls';controls.addEventListener('click',event=>event.stopPropagation());
      const toggle=root.createElement('button'),note=root.createElement('small');toggle.type='button';toggle.className='asset-card-action share';toggle.disabled=true;toggle.dataset.shareAction='toggle';toggle.textContent='♡';toggle.title='共享素材';toggle.setAttribute('aria-label','共享素材');controls.append(toggle,note);card.append(controls);
      const guard=token();try{const value=await shareState(guard.scene,selection,values);if(stopped||stamp!==serial||!controls.isConnected)return;ensure(guard);
        toggle.dataset.shareAction=value.active?'update':'toggle';toggle.setAttribute('aria-pressed',String(value.active));toggle.replaceChildren();const idle=root.createElement('span');idle.className='share-idle';idle.textContent=value.active?'♥':'♡';idle.setAttribute('aria-hidden','true');toggle.append(idle);if(value.active){const hover=root.createElement('span');hover.className='share-hover';hover.textContent='↥';hover.setAttribute('aria-hidden','true');toggle.append(hover);}toggle.disabled=busy;
        toggle.title=value.active?'更新共享素材':'共享素材';toggle.setAttribute('aria-label',toggle.title);
        if(value.remoteChanged)note.textContent='共享已有新版本';
        toggle.onclick=()=>{toggle.disabled=true;void perform(()=>publish(selection));};
      }catch(error){if(controls.isConnected&&stamp===serial)note.textContent=error.message||String(error);}
    }
    function renderProject(){
      if(stopped)return;serial++;const stamp=serial;lib.hidden=scope!=='project';shared.hidden=scope!=='shared';
      lib.querySelectorAll('.v4-material-share-controls').forEach(n=>n.remove());
      if(scope!=='project')return;
      const values=fingerprint(workspace.current(),{kind:'all',id:''});
      const available=new Set([...lib.querySelectorAll('[data-element-preset-id],[data-v4-asset-id]')].map(card=>card.dataset.elementPresetId?'element:'+card.dataset.elementPresetId:'asset:'+card.dataset.v4AssetId));for(const key of states.keys())if(!available.has(key))states.delete(key);
      for(const card of lib.querySelectorAll('.lib-item')){
        const selection=card.dataset.elementPresetId?{kind:'element',id:card.dataset.elementPresetId}:card.dataset.v4AssetId?{kind:'asset',id:card.dataset.v4AssetId}:null;
        if(selection)track(decorate(card,selection,stamp,values));
      }
    }
    async function take(id){
      const guard=token(),result=await service.take(guard.scene,id,resolver());ensure(guard);let entityId=null,requiresTrust=false;
      if(result.selection.kind==='element'){
        const ids=global.EditorV4ElementPresets.references(result.scene.elementPresets[result.selection.id]).filter(ref=>ref.kind==='module').map(ref=>ref.id);
        const loader=global.EditorVNextModuleLoader;
        if(ids.length){const accepted=await loader.authorizeImport(result.scene,ids,{scope:guard.scope,confirm:options.confirmImport,assertCurrent:()=>ensure(guard)});if(!accepted){status('已取消导入，当前工程保持不变');return;}await loader.loadAuthorized(result.scene,ids,{scope:guard.scope,assertCurrent:()=>ensure(guard)});}
        entityId=global.EditorV4ElementPresets.instantiate(result.scene,result.selection.id).id;
      }else entityId=global.EditorVNextAssetState.placeImage(result.scene,result.selection.id).entityId;
      changes.run('取用共享素材',scene=>{for(const key of ['assets','modules','patternResources','patternDefinitions','elementPresets','resourceOrigins','materialShares','entities'])if(Object.hasOwn(result.scene,key))scene[key]=result.scene[key];});
      if(result.selection.kind==='element')materials.selectPreset(result.selection.id);else{materials.clearElementSelection();global.ToSampoolV4Assets.select(result.selection.id);options.renderLibrary();}
      setScope('project');patterns.open('assets');if(entityId)view.select(entityId);
      status(requiresTrust?'已复制到项目；程序需在当前工程显式信任后加入画布':'已复制到项目并加入画布');
    }
    async function refresh(){
      const stamp=++serial;shared.setAttribute('aria-busy','true');
      try{const records=(await library.publications()).filter(record=>['image','sequence','element'].includes(record.kind));if(stopped||scope!=='shared'||stamp!==serial)return;
        shared.replaceChildren();for(const record of records){const card=root.createElement('div'),canvas=root.createElement('canvas'),name=root.createElement('div'),kind=root.createElement('small'),note=root.createElement('small');card.className='lib-item';card.dataset.publicationId=record.id;canvas.width=160;canvas.height=96;name.className='lib-name';name.textContent=record.name;name.title=record.name;kind.className='v4-material-kind';note.className='v4-material-note';kind.textContent=({element:'元素',sequence:'序列',image:'位图'})[record.kind]||(record.root.startsWith('element:')?'元素':'位图');card.append(canvas,name,kind,note);
          global.EditorClassicV4ResourceName.bind(name,{key:'shared:'+record.id,initial:()=>record.name,apply:value=>perform(async()=>{const guard=token();await library.rename(record.id,value,{expectedRevision:record.revision,guard:()=>ensure(guard)});status('已重命名共享素材，项目副本保持不变');}),error:e=>status(e.message,true)});
          const takeButton=button('→',()=>take(record.id),card,'take'),removeButton=button('×',()=>remove(null,record),card,'remove');
          takeButton.className='asset-card-action add';takeButton.title='加入到画布';takeButton.setAttribute('aria-label',takeButton.title);removeButton.className='asset-card-action delete';removeButton.title='移出共享';removeButton.setAttribute('aria-label',removeButton.title);shared.append(card);
          previews.bind({card,canvas,load:async()=>{const moduleScope=workspace.moduleScope,scene=JSON.parse(JSON.stringify(workspace.current())),{bundle}=await library.sharedBundle(record.id);if(moduleScope!==workspace.moduleScope)throw Error('项目已切换');return global.EditorV4MaterialPreview.shared(scene,bundle,{...options.resolveOptions,sceneLocator:workspace.locator});},error:error=>{note.textContent=error?.message||'';note.title=note.textContent;}});
        }
        if(!records.length){const empty=root.createElement('div');empty.className='asset-empty';empty.textContent='暂无共享素材';shared.append(empty);}
      }catch(error){status('共享库读取失败：'+error.message,true);}finally{if(stamp===serial)shared.removeAttribute('aria-busy');}
    }
    function changed(){if(project!==workspace.moduleScope){project=workspace.moduleScope;setScope('project');return;}renderProject();}
    const off=workspace.subscribe(changed);
    function clicked(event){if(event.target.closest('.lib-item'))queueMicrotask(renderProject);}
    function imported(event){if(event.target.closest('#btn-import-folder,#btn-import-sprite,#btn-import'))setScope('project');}
    function focused(){states.clear();if(scope==='shared')void refresh();else renderProject();}
    lib.addEventListener('click',clicked);for(const node of importButtons)node.addEventListener('click',imported);global.addEventListener('focus',focused);
    setScope('project');
    return Object.freeze({library,service,renderProject,refresh,setScope,take,publish,settled:()=>Promise.all([...pending]),get scope(){return scope;},stop(){stopped=true;serial++;off();lib.removeEventListener('click',clicked);for(const node of importButtons)node.removeEventListener('click',imported);global.removeEventListener('focus',focused);scopes.remove();shared.remove();void library.close();}});
  }
  global.EditorClassicV4MaterialSharingController=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
