/* One pattern shelf: project definitions and explicit shared publications. */
(function(global){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  function create(options){
    const {workspace,view,changes,patterns,resources,sharing,inspector}=options,root=options.root||document,
      registry=global.EditorV4PatternRegistry,core=global.EditorV4Resources,paths=global.EditorV4PathPatternPresets,service=sharing.service;
    const node=root.createElement('div'),bar=root.createElement('div'),toggle=root.createElement('button'),buttons=root.createElement('div'),body=root.createElement('div'),message=root.createElement('div'),file=root.createElement('input'),folder=root.createElement('input'),saveChoice=root.createElement('select');
    node.id='v4-pattern-cards';bar.className='asset-import-actions v4-pattern-actions';buttons.className='asset-import-buttons';toggle.className='small v4-material-scope-toggle';toggle.type='button';toggle.dataset.patternScopeSwitch='';
    message.className='v4-resource-message';message.setAttribute('role','status');file.type=folder.type='file';file.hidden=folder.hidden=true;file.accept='.json';folder.multiple=true;folder.setAttribute('webkitdirectory','');file.dataset.patternImport='';folder.dataset.patternFolder='';saveChoice.hidden=true;saveChoice.setAttribute('aria-label','选择要保存的图样');
    bar.append(toggle,buttons);node.append(bar,saveChoice,body,message,file,folder);
    let scope='project',selected=null,expanded=null,stopped=false,busy=false,signature=[],renderSerial=0,requestSerial=0,records=[],project=workspace.moduleScope;
    const pending=new Set();
    function status(text,error){message.textContent=text;message.setAttribute('role',error?'alert':'status');}
    function token(){return{scene:workspace.current(),revision:workspace.revision,scope:workspace.moduleScope};}
    function ensure(t){if(stopped||workspace.current()!==t.scene||workspace.revision!==t.revision||workspace.moduleScope!==t.scope)throw Error('工程已变化，操作未写入；请重试');}
    function resolver(){return options.resolveOptions||{};}
    function launch(fn){
      if(busy||stopped)return Promise.resolve();
      const task=(async()=>{busy=true;node.setAttribute('aria-busy','true');node.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{return await fn();}catch(e){status(e.message||String(e),e.name!=='AbortError');}
        finally{busy=false;node.removeAttribute('aria-busy');signature=[];if(!stopped)render();}})();
      pending.add(task);void task.finally(()=>pending.delete(task));return task;
    }
    function button(parent,icon,label,action,kind){const b=root.createElement('button');b.type='button';b.className='small';b.textContent=icon;b.title=label;b.setAttribute('aria-label',label);if(kind)b.dataset.patternAction=kind;b.onclick=e=>{e.stopPropagation();void launch(action);};parent.append(b);return b;}
    button(buttons,'▥','导入图样文件夹',()=>folder.click(),'import-folder');
    button(buttons,'↧','导入图样',()=>file.click(),'import');
    const save=button(buttons,'＋','保存图样预设',()=>saveSelected(),'save');
    buttons.prepend(save);
    function setScope(value){scope=value==='shared'?'shared':'project';selected=null;expanded=null;saveChoice.hidden=true;signature=[];render();if(scope==='shared')void refresh();}
    toggle.onclick=()=>setScope(scope==='project'?'shared':'project');
    function commitDraft(label,draft,t){ensure(t);changes.run(label,scene=>{for(const k of ['assets','modules','patternResources','patternDefinitions','materialShares','resourceOrigins','entities'])if(draft[k])scene[k]=draft[k];});}
    function asPath(preset){
      if(preset.mode==='path')return paths.normalize(preset);
      if(preset.definition?.format==='tosampool-pattern-generator/v1')return paths.fromGeneratorPreset(preset);
      if(preset.definition||preset.providerKey)return null;
      const entry=registry.byId(preset.engineId);if(!entry)return null;
      return paths.normalize({mode:'path',name:preset.name,engineId:preset.engineId,engineVersion:preset.engineVersion,carrier:entry.createCarrier||'rect',params:{...preset.params,color:preset.style?.color,width:preset.style?.width,alpha:preset.style?.alpha}});
    }
    function builtin(entry){return paths.normalize({mode:'path',name:entry.name,engineId:entry.id,engineVersion:1,carrier:entry.createCarrier||registry.supportedCarriers(entry.id)[0].id,params:{}});}
    function compatible(preset,target){if(!target)return true;const p=asPath(preset);return!!p&&(registry.byId(p.engineId).supports(target.part)||target.part.type==='custom'&&target.part.recipe?.id===p.engineId&&!!p.definition);}
    async function authorize(scene,preset,t){
      if(preset.mode!=='path')return;
      const ids=paths.references(preset).filter(r=>r.kind==='module').map(r=>r.id);if(!ids.length)return;
      const ok=await global.EditorVNextModuleLoader.authorizeImport(scene,ids,{scope:t.scope,assertCurrent:()=>ensure(t)});
      if(!ok){const e=Error('已取消取用，工程保持不变');e.name='AbortError';throw e;}
    }
    async function prepare(item,t){
      if(item.type==='shared'){const result=await service.take(t.scene,item.record.id,resolver());ensure(t);await authorize(result.scene,result.scene.patternResources[result.selection.id],t);return{scene:result.scene,id:result.selection.id};}
      const scene=copy(t.scene);let id=item.id;
      if(item.type==='builtin'){
        const p=item.preset,base='builtin-'+p.engineId+'-v1';
        id=core.addPattern(scene,{id:base,...p});
      }
      if(scene.patternResources[id]?.definition?.format==='tosampool-pattern-generator/v1')scene.patternResources[id]=paths.fromGeneratorPreset(scene.patternResources[id]);return{scene,id};
    }
    async function use(item,carrier){
      const t=token(),target=registry.target(t.scene,view);
      const prepared=await prepare(item,t),preset=prepared.scene.patternResources[prepared.id];ensure(t);
      if(target){
        const path=asPath(preset);if(!path||!compatible(preset,target))throw Error('图样不支持当前图元');
        const owner=prepared.scene.entities.find(e=>e.id===target.ownerId),part=target.partId==='@self'?owner:owner.parts.find(p=>p.id===target.partId);
        if(part.type==='custom'&&path.definition)paths.restoreCarrier(part);
        let same=false;
        if(registry.attached(part).includes(path.engineId)){
          try{const current=paths.fromPart(prepared.scene,part,path.engineId,{ownerId:owner.id});
            same=await core.digest({params:current.params,source:current.source||null})===await core.digest({params:path.params,source:path.source||null});
          }catch(_){same=false;} // A missing old reference must not prevent applying a valid replacement.
          ensure(t);
        }
        if(same){if(!part.extensions[path.engineId].enabled)registry.enable(part,path.engineId);}
        else{
          const ids=paths.references(path).filter(r=>r.kind==='module').map(r=>r.id);
          if(ids.length)await global.EditorVNextModuleLoader.loadAuthorized(prepared.scene,ids,{scope:t.scope,assertCurrent:()=>ensure(t)});
          paths.apply(prepared.scene,path,part,{replace:true});
        }
        if(JSON.stringify(prepared.scene)!==JSON.stringify(t.scene))commitDraft('取用并应用图样',prepared.scene,t);
        selected=prepared.id;scope='project';inspector.focusExtension(target.ownerId,target.partId,path.engineId);status('已应用图样');return;
      }
      const ids=view.selectedIds||[],owner=ids.length===1&&t.scene.entities.find(e=>e.id===ids[0]),destination=owner&&!['group','particle-emitter'].includes(owner.type)?{ownerId:owner.id}:{parentId:null};
      await resources.beginPreset(prepared.id,{scene:prepared.scene,carrier,target:destination,onCommit:()=>{scope='project';selected=prepared.id;signature=[];render();status('已创建图样');}});ensure(t);status('在画布绘制载体；Esc取消');
    }
    async function publish(id){
      const t=token(),ref={kind:'pattern',id};let written=false;
      try{const result=await service.publish(copy(t.scene),ref,{...resolver(),guard:()=>ensure(t)});written=true;ensure(t);changes.run('发布／更新共享图样',s=>service.setLink(s,ref,result.link));status('已更新共享图样');}
      catch(e){if(written)throw Error('共享已保存，但当前工程已变化；请到共享页查看');throw e;}
    }
    function removeProject(id){
      if(!global.confirm('从项目图样库移除此卡片？画布上已应用的图样保持不变。'))return;
      changes.run('移出项目图样',s=>{delete s.patternResources[id];if(s.materialShares)delete s.materialShares[core.key({kind:'pattern',id})];for(const e of s.entities||[])for(const p of [e,...e.parts||[]])if(p.resourceBindings?.pattern===id){delete p.resourceBindings.pattern;if(!Object.keys(p.resourceBindings).length)delete p.resourceBindings;}});selected=null;status('已移出项目图样，画布保持不变');
    }
    async function removeShared(record){
      if(!global.confirm('移出共享“'+record.name+'”？各项目已取用的图样保持不变。'))return;
      const t=token();await sharing.library.unpublish(record.id,{expectedRevision:record.revision,guard:()=>ensure(t)});ensure(t);
      changes.run('移出共享图样',s=>{for(const [key,link]of Object.entries(s.materialShares||{}))if(link.publicationId===record.id)delete s.materialShares[key];});await refresh();status('已移出共享，项目图样保持不变');
    }
    async function importFile(){
      const f=file.files?.[0];file.value='';if(!f)return;
      const result=await resources.importFile(f,'pattern');scope='project';selected=result?.presetId||Object.values(result?.patterns||{})[0]||null;expanded=null;status('已导入项目图样，尚未应用');
    }
    file.onchange=()=>void launch(importFile);
    folder.onchange=()=>{const files=[...folder.files];folder.value='';if(!files.length)return;void launch(async()=>{
      const t=token(),prepared=await global.EditorV4ProjectMaterialTransfer.read(files);ensure(t);if(!prepared?.bundle)throw Error('请选择包含保存工程的文件夹');
      const bundle=prepared.bundle,byKey=new Map(bundle.entries.map(r=>[core.key(r),r])),roots=bundle.roots.filter(k=>byKey.get(k)?.kind==='pattern'),seen=new Set();
      if(!roots.length)throw Error('此工程文件夹没有项目图样');
      function visit(key){if(seen.has(key))return;seen.add(key);for(const dep of byKey.get(key).dependencies)visit(dep);}roots.forEach(visit);
      const subset=await core.pack(roots,bundle.entries.filter(r=>seen.has(core.key(r))));ensure(t);const result=await resources.importBundle(subset);scope='project';selected=Object.values(result.patterns)[0]||null;status('已提取项目图样，未导入画布或其他素材卡');
    });};
    function saveSelected(id){
      const t=registry.target(workspace.current(),view);if(!t)throw Error('请先选择唯一图元');
      const list=t.part.type==='custom'?['@body']:registry.attached(t.part);
      if(!id&&list.length>1){saveChoice.replaceChildren();for(const [value,label]of [['','选择要保存的图样'],...list.map(k=>[k,registry.byId(k).name])]){const o=root.createElement('option');o.value=value;o.textContent=label;saveChoice.append(o);}saveChoice.hidden=false;return;}
      id=id||list[0];if(!id)throw Error('此图元尚未添加图样');
      changes.run('回写项目图样预设',s=>{
        const owner=s.entities.find(e=>e.id===t.ownerId),part=t.partId==='@self'?owner:owner.parts.find(p=>p.id===t.partId);
        const p=id==='@body'?{name:part.name||part.recipe.id,engineId:part.recipe.id,engineVersion:part.recipe.version,params:part.recipe.params,style:{color:part.stroke,width:part.strokeWidth,alpha:part.strokeAlpha},definition:part.recipe.definition,providerKey:part.recipe.providerKey,geometrySnapshot:part.geometrySnapshot}:paths.fromPart(s,part,id,{ownerId:owner.id});
        const prior=core.patternId(s,p);if(prior)p.name=s.patternResources[prior].name;
        selected=core.addPattern(s,{id:(id==='@body'?part.recipe.id:id)+'-preset',...p});
      });scope='project';saveChoice.hidden=true;status('已回写项目预设；共享版本未自动更新');
    }
    saveChoice.onchange=()=>{if(saveChoice.value)void launch(()=>saveSelected(saveChoice.value));};
    function group(label){const title=root.createElement('div'),grid=root.createElement('div');title.className='v4-pattern-group-title';title.textContent=label;grid.className='lib';body.append(title,grid);return grid;}
    async function preview(canvas,preset,serial,note,bundle){
      let player;
      try{
        const current=workspace.current(),scene=global.EditorVNextScene.blank({width:160,height:96});scene.background.alpha=0;scene.assets=current.assets||{};scene.modules=current.modules||{};scene._moduleScope=workspace.moduleScope;
        if(bundle){scene.assets={};scene.modules={};const result=await core.importInto(scene,bundle),record=bundle.entries.find(r=>core.key(r)===bundle.roots[0]);preset=scene.patternResources[result.patterns[record.id]];}
        if(preset.mode==='path'&&paths.references(preset).some(r=>r.kind==='module'))throw Error('程序来源不自动执行预览；取用时按当前工程授权加载');
        scene.patternResources={preview:preset};let p;
        if(preset.mode==='path'){
          const c=paths.carrier(preset.carrier),geometry={id:'p',type:c.type,x:0,y:0,w:104,h:48,stroke:'#ffd23f',strokeWidth:2,...(c.type==='line'?{x2:104,y2:0}:{}),...(c.type==='stroke'?{points:[[0,36],[35,0],[70,48],[104,12]]}:{}),...(c.polygonMode?{polygonMode:c.polygonMode,sides:c.sides,points:[[0,1],[.5,0],[1,1]]}:{})};
          p=core.createPatternPart(scene,'preview',geometry);
          if(preset.engineId==='elements'&&!preset.source){scene.entities.push({id:'guide-stamp',type:'ellipse',x:0,y:0,w:6,h:6,fill:'#ffd23f'});p.extensions.elements.sourceId='guide-stamp';p.extensions.elements.keepSource=false;}
        }else p=core.createPatternPart(scene,'preview',{id:'p',w:104,h:48});
        scene.entities.push({id:'preview-owner',type:'vector',x:28,y:24,w:104,h:48,parts:[p]});
        const assets=await global.EditorVNextAssetLoader.resolve(scene,{referencedOnly:true,host:global.EditorHost,sceneLocator:workspace.locator,baseUrl:global.location?.href});
        if(stopped||serial!==renderSerial||!canvas.isConnected)return;
        player=global.ToSampoolRuntimeVNext.createRuntime(global.EditorVNextScene.hydrate(scene,assets));player.renderTo(canvas,0);
      }catch(e){if(serial===renderSerial&&note.isConnected){note.textContent='预览不可用';note.title=e.message||String(e);}}finally{player?.dispose();}
    }
    function card(grid,item,target,serial){
      const p=item.preset,entry=registry.byId(p.engineId),key=item.type+':'+item.id,wrap=root.createElement('div'),canvas=root.createElement('canvas'),name=root.createElement('div'),note=root.createElement('small');
      wrap.className='lib-item v4-pattern-card'+(selected===item.id?' active':'');wrap.tabIndex=0;wrap.dataset.patternKey=key;wrap.dataset.patternId=p.engineId;wrap.dataset.patternResourceId=item.id;wrap.setAttribute('role','group');wrap.setAttribute('aria-label',p.name||p.engineId);canvas.width=160;canvas.height=96;name.className='lib-name';name.textContent=p.name||p.engineId;note.className='v4-material-note';wrap.append(canvas,name,note);
      if(item.type==='shared'){name.textContent=item.record.name;wrap.setAttribute('aria-label',item.record.name);}
      const applied=target&&registry.attached(target.part).includes(p.engineId)&&target.part.extensions[p.engineId]?.enabled;
      name.classList.toggle('active',!!applied);wrap.dataset.patternApplied=String(!!applied);
      if(item.type!=='builtin')global.EditorClassicV4ResourceName.bind(name,{
        key:(item.type==='shared'?'shared:':workspace.moduleScope+':pattern:')+item.id,
        initial:()=>item.type==='shared'?item.record.name:workspace.current().patternResources[item.id].name,
        apply:value=>item.type==='shared'?launch(async()=>{const t=token();await sharing.library.rename(item.record.id,value,{expectedRevision:item.record.revision,guard:()=>ensure(t)});await refresh();status('已重命名共享图样，项目副本保持不变');}):changes.run('重命名图样',s=>{s.patternResources[item.id].name=value;}),error:e=>status(e.message,true)
      });else name.title='自带图样名称只读';
      wrap.onclick=()=>{selected=item.id;for(const n of body.querySelectorAll('.lib-item'))n.classList.toggle('active',n===wrap);if(applied)inspector.focusExtension(target.ownerId,target.partId,p.engineId);};wrap.onkeydown=e=>{if(e.target===wrap&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();wrap.click();}};
      const action=button(wrap,target?'↗':'→',target?'应用图样':'新建图样',async()=>{
        if(!target&&p.mode==='path'&&entry?.category==='attached'){selected=item.id;expanded=expanded===key?null:key;signature=[];render();return;}
        await use(item);
      },target?'apply':'create');action.className='asset-card-action add';
      if(item.type==='project'){
        if(applied){const write=button(wrap,'↥','回写图样参数',()=>saveSelected(p.engineId),'writeback');write.className='asset-card-action alpha';}
        const del=button(wrap,'×','移出项目图样',()=>removeProject(item.id),'remove');del.className='asset-card-action delete';
        const share=button(wrap,'♡','共享图样',()=>publish(item.id),'publish');share.className='asset-card-action share';share.dataset.shareAction='toggle';
        const link=service.linkFor(workspace.current(),{kind:'pattern',id:item.id});
        if(link)void service.state(copy(workspace.current()),{kind:'pattern',id:item.id},resolver()).then(state=>{
          if(stopped||serial!==renderSerial||!share.isConnected)return;
          if(state.active){share.replaceChildren();const idle=root.createElement('span'),hover=root.createElement('span');idle.className='share-idle';idle.textContent='♥';hover.className='share-hover';hover.textContent='↥';share.append(idle,hover);share.title='更新共享图样';share.setAttribute('aria-label',share.title);share.dataset.patternAction='update';share.dataset.shareAction='update';}
        }).catch(e=>{if(note.isConnected)note.title=e.message;});
      }else if(item.type==='shared'){
        const del=button(wrap,'×','移出共享图样',()=>removeShared(item.record),'remove-shared');del.className='asset-card-action delete';
      }
      grid.append(wrap);void preview(canvas,p,serial,note,item.record?.bundle);
      if(expanded===key&&!target){const choices=root.createElement('div');choices.className='v4-pattern-carriers';choices.dataset.patternCarriers='';for(const c of registry.supportedCarriers(p.engineId)){
        const b=button(choices,c.name,'使用'+c.name+'载体',()=>use(item,c));b.dataset.patternCarrier=c.id;
      }grid.append(choices);}
    }
    function maintenance(){
      const definitions=Object.entries(workspace.current().patternDefinitions||{});if(!definitions.length)return;
      const details=root.createElement('details'),summary=root.createElement('summary');details.dataset.patternMaintenance='';summary.textContent='图样依赖';details.append(summary);
      for(const [id,def]of definitions){const row=root.createElement('div');row.className='v4-resource-row';row.dataset.patternProvider=id;const name=root.createElement('span');name.textContent=def.name+' · v'+def.version;row.append(name);
        button(row,'↥','应用此版本',()=>resources.providerAction(id,'upgrade'),'upgrade');button(row,'×','停用图样定义',()=>resources.providerAction(id,'remove'),'uninstall');details.append(row);
      }body.append(details);
    }
    function render(){
      if(stopped)return;if(project!==workspace.moduleScope){project=workspace.moduleScope;scope='project';selected=null;expanded=null;records=[];requestSerial++;signature=[];}
      if(patterns.shelf!=='patterns')return;
      const s=workspace.current();if(!s){body.replaceChildren();return;}const target=registry.target(s,view),next=[workspace.moduleScope,scope,selected,expanded,busy,target?.ownerId,target?.partId,target?.part.type,target?.part.polygonMode];
      function leaves(v){if(v&&typeof v==='object'){const keys=Object.keys(v).sort();next.push(keys.length);for(const k of keys){next.push(k);leaves(v[k]);}}else next.push(v);}
      leaves([s.patternResources,s.patternDefinitions,s.assets,s.modules,s.materialShares,records,target?.part.extensions]);
      if(next.length===signature.length&&next.every((v,i)=>Object.is(v,signature[i])))return;signature=next;const serial=++renderSerial;body.replaceChildren();node.dataset.mode=target?'apply':'create';node.dataset.scope=scope;const panel=node.closest('#v4-pattern-library');if(panel)panel.dataset.mode=node.dataset.mode;
      toggle.textContent=(scope==='shared'?'♥ 共享':'♡ 项目');toggle.title=scope==='shared'?'显示项目图样':'显示共享图样';toggle.setAttribute('aria-label',toggle.title);toggle.setAttribute('aria-pressed',String(scope==='shared'));
      save.disabled=busy||!target||target.part.type!=='custom'&&!registry.attached(target.part).length;
      let count=0;
      if(scope==='project'){
        const grid=group('项目图样');for(const [id,preset]of Object.entries(s.patternResources||{})){try{if(compatible(preset,target)){card(grid,{type:'project',id,preset},target,serial);count++;}}catch(e){status(e.message,true);}}
        maintenance();
      }else{
        const grid=group('自带');for(const entry of registry.entries){const preset=builtin(entry);if(compatible(preset,target)){card(grid,{type:'builtin',id:entry.id,preset},target,serial);count++;}}
        const available=records.filter(record=>{try{return compatible(record.preset,target);}catch(e){status(e.message,true);return false;}});
        if(available.length){const custom=group('我的');for(const record of available){card(custom,{type:'shared',id:record.id,preset:record.preset,record},target,serial);count++;}}
      }
      if(!count){const empty=root.createElement('div');empty.className='asset-empty';empty.textContent=target?'当前图元没有适用图样':'项目中还没有图样';body.append(empty);if(scope==='project')button(empty,'→','从共享取用',()=>setScope('shared'));}
      node.querySelectorAll('button').forEach(b=>{if(b!==save)b.disabled=busy;});
    }
    async function refresh(){
      const serial=++requestSerial,scopeId=workspace.moduleScope;
      try{const rows=(await sharing.library.publications()).filter(r=>r.kind==='pattern'),ready=[];for(const row of rows){const result=await sharing.library.sharedBundle(row.id),rootRecord=result.bundle.entries.find(r=>core.key(r)===row.root);if(rootRecord)ready.push({...row,preset:rootRecord.payload.preset,bundle:result.bundle});}
        if(stopped||serial!==requestSerial||workspace.moduleScope!==scopeId)return;records=ready;signature=[];render();
      }catch(e){if(!stopped&&serial===requestSerial)status(e.message,true);}
    }
    const offWorkspace=workspace.subscribe(render),offSelection=view.subscribeSelection(()=>{saveChoice.hidden=true;expanded=null;signature=[];render();});
    const unmount=patterns.mount({node,render,onOpen(){signature=[];if(!Object.keys(workspace.current()?.patternResources||{}).length)scope='shared';void refresh();}});
    function focus(){if(patterns.shelf==='patterns')void refresh();}global.addEventListener('focus',focus);
    let offStop=()=>{};function stop(){if(stopped)return;stopped=true;requestSerial++;renderSerial++;offWorkspace();offSelection();offStop();unmount();global.removeEventListener('focus',focus);node.remove();}
    offStop=resources.onStop(stop);
    return Object.freeze({render,refresh,setScope,stop,settled:()=>Promise.all([...pending]),get scope(){return scope;},get selected(){return selected;}});
  }
  global.EditorClassicV4PatternCards=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
