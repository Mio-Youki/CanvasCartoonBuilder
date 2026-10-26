/* Explicit resource commands and transitional package archive. Async work guards Scene identity. */
(function(global){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  function create(options){
    const {workspace,changes,view,patterns,drawing,inspector}=options;
    const root=options.root||document,core=global.EditorV4Resources;
    const library=options.library||global.EditorV4ResourceLibrary.create();
    const host=root.createElement('div');host.id='v4-resource-library';host.className='asset-content';
    host.setAttribute('role','tabpanel');host.setAttribute('aria-label','收藏');
    const actions=root.createElement('div'),fileInput=root.createElement('input'),message=root.createElement('div');
    const current=root.createElement('div'),saved=root.createElement('div'),missing=root.createElement('div'),bakePanel=root.createElement('div');
    actions.className='v4-resource-actions';message.className='v4-resource-message';message.setAttribute('role','status');
    fileInput.type='file';fileInput.accept='.tosampool-resource.json,.tosampool-pattern.json,application/json';fileInput.hidden=true;
    host.append(actions,message,missing,bakePanel,current,saved,fileInput);
    bakePanel.dataset.moduleBakePanel='';
    let stopped=false,busy=false,listSerial=0,rows=[],signature='',lastRemoved=null,bakeJob=null,contextual=false,bakeSignature='';
    const statusListeners=new Set(),stopListeners=new Set(),libraryListeners=new Set();
    const previews=new Map(),bakeCounts=new Map();
    const previewObserver=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        previewObserver.unobserve(entry.target);const hash=previews.get(entry.target);previews.delete(entry.target);
        if(!hash)continue;const serial=listSerial;
        const task=(async()=>{try{const bundle=await library.get(hash);if(serial===listSerial)await preview(bundle,entry.target);}catch(error){if(serial===listSerial&&entry.target.isConnected){const warning=root.createElement('small');warning.textContent='预览不可用：'+error.message;entry.target.append(warning);}}})();
        pending.add(task);task.finally(()=>pending.delete(task));
      }
    },{rootMargin:'100px'});
    const pending=new Set();
    function button(label,action,parent,data){
      const node=root.createElement('button');node.type='button';node.className='small';node.textContent=label;
      if(data)Object.assign(node.dataset,data);
      node.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();void perform(node,action);});
      parent.append(node);return node;
    }
    function status(text,error){message.textContent=text;message.setAttribute('role',error?'alert':'status');for(const listener of statusListeners)listener(text,error);}
    function ensureLive(token){if(stopped||workspace.current()!==token.scene||workspace.revision!==token.revision)throw Error('工程已变化，本次操作未写入；请重试');}
    function token(){return{scene:workspace.requireDocument(),revision:workspace.revision};}
    function commit(label,draft,guard){
      ensureLive(guard);
      changes.run(label,scene=>{for(const key of ['assets','modules','patternResources','elementPresets','resourceOrigins','resourcePins','patternDefinitions','entities']){
        if(Object.hasOwn(draft,key))scene[key]=draft[key];
      }});
    }
    async function perform(node,action){
      if(busy||stopped)return;busy=true;node.disabled=true;host.setAttribute('aria-busy','true');
      try{await action();}catch(error){if(!stopped)status(error.message||String(error),error.name!=='AbortError');}
      finally{busy=false;if(!stopped){node.disabled=false;host.removeAttribute('aria-busy');renderCurrent();}}
    }
    function rootRecord(bundle){return bundle.entries.find(entry=>core.key(entry)===bundle.roots[0]);}
    async function collect(selection){
      const guard=token(),draft=copy(guard.scene),bundle=await core.capture(draft,selection,options.resolveOptions||{});
      ensureLive(guard);await library.put(bundle);ensureLive(guard);
      draft.resourcePins=[...new Set([...(draft.resourcePins||[]),bundle.hash])];
      commit('收藏资源',draft,guard);await refresh();status('已收藏，可在其他工程取用');return bundle.hash;
    }
    function selectedPattern(){
      const target=global.EditorV4PatternRegistry.target(workspace.current(),view);
      return target?.part.type==='custom'?target:null;
    }
    async function collectPattern(){
      const target=selectedPattern();if(!target)throw Error('请先选中一个图样');
      const guard=token(),part=target.part,draft=copy(guard.scene);
      const id=core.addPattern(draft,{id:part.recipe.id+'-preset',name:part.name||global.EditorV4PatternRegistry.byId(part.recipe.id)?.name,
        engineId:part.recipe.id,engineVersion:part.recipe.version,params:part.recipe.params,
        style:{color:part.stroke,width:part.strokeWidth,alpha:part.strokeAlpha},geometrySnapshot:part.geometrySnapshot,definition:part.recipe.definition,providerKey:part.recipe.providerKey});
      let presetId=id;const hash=await core.digest(draft.patternResources[id]);
      for(const [candidate,preset]of Object.entries(draft.patternResources))if(candidate!==id&&await core.digest(preset)===hash){presetId=candidate;delete draft.patternResources[id];break;}
      const bundle=await core.capture(draft,[{kind:'pattern',id:presetId}],options.resolveOptions||{});
      ensureLive(guard);await library.put(bundle);ensureLive(guard);
      draft.resourcePins=[...new Set([...(draft.resourcePins||[]),bundle.hash])];commit('收藏图样参数',draft,guard);
      await refresh();status('已收藏当前图样参数');return bundle.hash;
    }
    async function importBundle(bundle,guard){
      guard=guard||token();ensureLive(guard);
      const draft=copy(guard.scene),result=await core.importInto(draft,bundle);
      const ids=bundle.entries.filter(entry=>entry.kind==='module').map(entry=>entry.id);
      if(ids.length&&!await global.EditorVNextModuleLoader.authorizeImport(draft,ids,{scope:workspace.moduleScope,confirm:options.confirmImport||options.confirmModule,assertCurrent:()=>ensureLive(guard)})){const error=Error('已取消导入，工程保持不变');error.name='AbortError';throw error;}
      for(const entry of bundle.entries)if(entry.kind==='module'&&bundle.roots.includes(core.key(entry)))global.EditorV4ElementPresets.fromModule(draft,entry.id);
      commit('取用资源',draft,guard);status('已复制到当前工程；程序代码未执行');return result;
    }
    async function take(hash){const guard=token();return importBundle(await library.get(hash),guard);}
    async function importProjectFiles(files){const guard=token(),prepared=await global.EditorV4ProjectMaterialTransfer.read(files);ensureLive(guard);if(!prepared)return false;if(prepared.bundle)await importBundle(prepared.bundle,guard);status('已从项目文件夹复制 '+prepared.count+' 项素材／图样；未导入画布和共享关系');return{count:prepared.count};}
    async function importFile(file,kind){
      const guard=token();if(file.size>core.limits.bytes)throw Error('资源包超出64MB预算');
      const input=JSON.parse(await file.text());ensureLive(guard);
      if(input.format===global.ToSampoolRuntimeVNext.modules.patternProviders.FORMAT){
        if(kind&&kind!=='pattern')throw Error('请在图样管理中导入图样定义');return installDefinition(input,guard);
      }
      const bundle=await core.verify(input);
      if(kind&&bundle.roots.some(key=>bundle.entries.find(entry=>core.key(entry)===key)?.kind!==kind))throw Error('此入口只接收'+(kind==='pattern'?'图样':'程序构件')+'根资源包；其他资源请从素材导入');
      return importBundle(bundle,guard);
    }
    function installDefinition(definition,guard){
      guard=guard||token();const draft=copy(guard.scene),result=global.EditorV4PatternLifecycle.install(draft,definition);
      commit('安装图样定义',draft,guard);status('已安装 '+definition.name+' v'+definition.version+'；已有其他版本保持不变');return result;
    }
    function providerAction(key,action){
      const guard=token(),draft=copy(guard.scene),result=global.EditorV4PatternLifecycle[action](draft,key);
      commit(action==='remove'?'停用图样定义':'应用图样版本',draft,guard);
      status(action==='remove'?'已停用，'+result.frozen+' 个实例保留缓存；可撤销':'已应用此版本，更新 '+result.changed+' 个实例');return result;
    }
    async function createModule(id){
      const guard=token(),scope=workspace.moduleScope,instances=global.EditorV4ModuleInstances;
      if(!instances.ready(guard.scene,id,scope)){
        await global.EditorVNextModuleLoader.loadAuthorized(guard.scene,[id],{...(options.moduleLoadOptions||{}),scope,assertCurrent:()=>ensureLive(guard)});
        ensureLive(guard);
      }
      const draft=copy(guard.scene),entity=instances.create(draft,id,{scope});
      commit('新建程序构件',draft,guard);
      drawing.setMode?.('select');view.select(entity.id);inspector.focusModule(entity.id);
      status('已新建独立实例；公开参数可在成样中调整');return entity.id;
    }
    function selectedModule(){
      const ids=view.selectedIds||[view.selectedId];
      if(ids.length!==1||view.selectedPartId)return null;
      return(workspace.current()?.entities||[]).find(item=>item.id===ids[0]&&item.type==='procedural')||null;
    }
    async function bakeModule(mode,frames){
      if(bakeJob)throw Error('已有烘焙任务正在运行');
      const target=selectedModule();if(!target)throw Error('请选中一个程序构件对象');
      const guard=token(),source=copy(guard.scene),abort=new AbortController(),baker=global.EditorV4ModuleBaker;
      const config={mode,time:options.time?options.time():0,frames},plan=baker.plan(source,target.id,config);
      bakeJob={abort,id:target.id};
      const cancel=bakePanel.querySelector('[data-resource-action="cancel-bake"]');if(cancel)cancel.hidden=false;
      try{
        status('正在'+(mode==='freeze'?'冻结':'烘焙')+' · 0/'+plan.count);
        const result=await baker.render(source,target.id,{...config,signal:abort.signal,
          assetOptions:{sceneLocator:workspace.locator},assertCurrent:()=>ensureLive(guard),
          onProgress:progress=>{if(!stopped)status('正在'+(mode==='freeze'?'冻结':'烘焙')+' · '+progress.completed+'/'+progress.total);}});
        ensureLive(guard);const draft=copy(guard.scene),added=baker.add(draft,result);
        commit(mode==='freeze'?'冻结构件到素材':'烘焙构件到序列素材',draft,guard);
        status('已添加素材：'+result.name+' · '+plan.count+' 帧 · '+(result.bytes/1024).toFixed(1)+' KB；原构件保持不变');return added.assetId;
      }finally{bakeJob=null;bakeSignature='';if(!stopped)renderCurrent();}
    }
    function cancelBake(){bakeJob?.abort.abort();}
    function renderBakePanel(){
      if(bakeJob)return;
      const target=selectedModule(),scene=workspace.current(),next=JSON.stringify([workspace.moduleScope,target?.id,scene?.width,scene?.height,scene?.loop,target&&global.EditorV4ModuleInstances.ready(scene,target.moduleId,workspace.moduleScope)]);
      if(contextual&&bakeSignature===next)return;bakeSignature=next;
      bakePanel.hidden=!target;if(!target){bakePanel.replaceChildren();return;}
      section(bakePanel,'选中构件 · '+(target.name||target.moduleId));
      let plan;
      try{plan=global.EditorV4ModuleBaker.plan(workspace.current(),target.id,{mode:'sequence'});}catch(error){
        const warning=root.createElement('small');warning.textContent=error.message;bakePanel.append(warning);return;
      }
      const controls=root.createElement('div');controls.className='v4-resource-actions';bakePanel.append(controls);
      button('冻结当前帧',()=>bakeModule('freeze'),controls,{resourceAction:'freeze-module'});
      const field=root.createElement('label'),input=root.createElement('input'),summary=root.createElement('small');
      field.className='global-field';field.append(root.createTextNode('周期帧数'));
      const countKey=workspace.moduleScope+'::'+target.id;
      input.type='number';input.min='2';input.max=String(plan.capacity);input.step='1';input.value=bakeCounts.get(countKey)||String(plan.count);input.dataset.moduleBakeFrames='';field.append(input);bakePanel.append(field,summary);
      const update=()=>{bakeCounts.set(countKey,input.value);try{const next=global.EditorV4ModuleBaker.plan(workspace.current(),target.id,{mode:'sequence',frames:+input.value});summary.textContent=next.width+'×'+next.height+' · '+next.loop+'s · '+next.fps.toFixed(2)+'fps · 最多'+next.capacity+'帧 · 解码约'+(next.sampledPixels*4/1048576).toFixed(1)+'MB';}catch(error){summary.textContent=error.message;}};
      input.addEventListener('input',update);update();
      button('烘焙序列',()=>bakeModule('sequence',+input.value),controls,{resourceAction:'bake-module'});
      const cancel=root.createElement('button');cancel.type='button';cancel.className='small';cancel.textContent='取消';cancel.dataset.resourceAction='cancel-bake';cancel.hidden=true;cancel.addEventListener('click',cancelBake);controls.append(cancel);
      const note=root.createElement('small');note.textContent='透明画布尺寸；包含对象处理，不含背景和场景滤镜。生成后进入素材库，不替换原对象。';bakePanel.append(note);
    }
    async function remove(hash){
      const bundle=await library.get(hash);await library.remove(hash);lastRemoved=bundle;
      restoreButton.hidden=false;await refresh();status('已移出收藏，当前工程不变');
    }
    async function restore(){
      if(!lastRemoved)return;await library.put(lastRemoved);lastRemoved=null;restoreButton.hidden=true;
      await refresh();status('已恢复收藏');
    }
    async function exportBundle(hash){
      const bundle=await library.get(hash),record=rootRecord(bundle);
      const name=String(record?.name||'resource').replace(/[\\/:*?"<>|]/g,'-')+'.tosampool-resource.json';
      const result=await (options.saveFile||((artifact)=>global.EditorHost.saveFile(artifact)))({kind:'resource',name,ext:'.json',mime:'application/json',description:'ToSampool Resource Package',data:JSON.stringify(bundle)});
      if(result===null||result===false)status('已取消导出');else status('资源包已导出');
    }
    async function beginPreset(id,beginOptions){
      beginOptions=beginOptions||{};const candidate=beginOptions.scene||workspace.current(),preset=candidate.patternResources?.[id];if(!preset)throw Error('图样预设已不存在');
      const guard=token();
      if(preset.mode==='path'){
        const ids=global.EditorV4PathPatternPresets.references(preset).filter(ref=>ref.kind==='module').map(ref=>ref.id);
        if(ids.length){await global.EditorVNextModuleLoader.loadAuthorized(candidate,ids,{scope:workspace.moduleScope,assertCurrent:()=>ensureLive(guard)});ensureLive(guard);}
      }
      const entry=global.EditorV4PatternRegistry.byId(preset.engineId),carrier=beginOptions.carrier||global.EditorV4PatternRegistry.carriers.find(c=>c.id===(preset.mode==='path'?preset.carrier:entry?.createCarrier||'rect'));
      if(!carrier||!entry&&!preset.geometrySnapshot&&!preset.definition)throw Error('当前版本不支持此图样生成器');
      drawing.beginPattern({id:preset.engineId,presetId:id,carrier,target:beginOptions.target||{parentId:null},pendingScene:beginOptions.scene,
        assertCurrent:beginOptions.scene?()=>ensureLive(guard):undefined,
        prepare:beginOptions.scene?document=>{ensureLive(guard);for(const key of ['assets','modules','patternResources','patternDefinitions','materialShares','resourceOrigins'])if(candidate[key])document[key]=copy(candidate[key]);}:undefined,
        onCommit:result=>{inspector.focusExtension(result.entity.id,result.part.id,preset.engineId);beginOptions.onCommit?.(result);}});
      status('在画布拖拽绘制图样');
    }
    function section(parent,title){parent.replaceChildren();const h=root.createElement('h3');h.textContent=title;parent.append(h);}
    function row(parent,label,kind,id){
      const item=root.createElement('div'),name=root.createElement('span'),controls=root.createElement('span');
      item.className='v4-resource-row';item.dataset.resourceKind=kind;item.dataset.resourceId=id;
      name.className='v4-resource-name';name.textContent=label;name.title=label;controls.className='v4-resource-row-actions';
      item.append(name,controls);parent.append(item);return{item,controls};
    }
    function renderCurrent(){
      if(stopped)return;
      const scene=workspace.current();if(!scene)return;
      renderBakePanel();
      if(contextual){if(patterns.shelf==='collection')renderMissing(scene);return;}
      signature=JSON.stringify([scene.assets,scene.modules,scene.patternResources,scene.patternDefinitions,core.inspect(scene),selectedPattern()?.part.recipe]);
      section(current,'当前工程');renderMissing(scene);
      const definitions=[
        ...Object.entries(scene.assets||{}).map(([id,a])=>({kind:'asset',id,label:a.name||id})),
        ...Object.entries(scene.patternResources||{}).map(([id,p])=>({kind:'pattern',id,label:(p.name||id)+(p.providerKey?' · v'+p.engineVersion:'')})),
        ...Object.entries(scene.modules||{}).map(([id,d])=>({kind:'module',id,label:d.manifest?.title||id,version:+d.manifest?.version||1}))
      ];
      for(const entry of definitions){const value=row(current,entry.label,entry.kind,entry.id);
        button('收藏',()=>collect([entry]),value.controls,{resourceAction:'collect'});
        if(entry.kind==='pattern')button('新建',()=>beginPreset(entry.id),value.controls,{resourceAction:'create'});
        if(entry.kind==='module'){
          value.item.title='收藏与取用不执行代码；使用前仍需显式信任';
          button('新建',()=>createModule(entry.id),value.controls,{resourceAction:'create-module'});
        }
      }
      for(const [key,definition]of Object.entries(scene.patternDefinitions||{})){
        const value=row(current,definition.name+' · v'+definition.version,'provider',key);
        const update=button('应用此版本',()=>providerAction(key,'upgrade'),value.controls,{resourceAction:'upgrade'});update.title='显式更新该图样的实例与预设；参数按新声明归一化，可撤销';
        const remove=button('停用',()=>providerAction(key,'remove'),value.controls,{resourceAction:'uninstall'});remove.title='先保留轮廓缓存，再停用内部编辑；可撤销';
      }
      if(!definitions.length&&!Object.keys(scene.patternDefinitions||{}).length){const empty=root.createElement('div');empty.className='asset-empty';empty.textContent='先导入素材，或在画布创建图样';current.append(empty);}
      patternButton.disabled=busy||!selectedPattern();
    }
    function renderMissing(scene){
      section(missing,'缺失资源');const issues=core.inspect(scene);missing.hidden=!issues.length;
      for(const issue of issues){const item=root.createElement('div');item.className='v4-resource-issue';item.textContent=({asset:'素材',module:'程序构件',pattern:'图样'}[issue.kind]||'资源')+'：'+issue.id+' · '+(issue.reason==='cached'?'生成器缺失，使用缓存':issue.reason==='version'?'版本不符':issue.reason==='unsupported'?'当前版本不支持':'缺失');missing.append(item);}
    }
    async function preview(bundle,parent){
      const record=rootRecord(bundle);if(!record)return;
      const canvas=root.createElement('canvas');canvas.className='v4-resource-preview';canvas.width=160;canvas.height=72;canvas.setAttribute('aria-hidden','true');
      if(record.kind==='pattern'){
        const temp=global.EditorVNextScene.blank({width:160,height:72}),id=record.id;temp.patternResources={[id]:record.payload.preset};
        temp.entities=[{id:'preview',type:'vector',x:16,y:12,w:128,h:48,parts:[core.createPatternPart(temp,id,{id:'p',w:128,h:48})]}];
        const player=global.ToSampoolRuntimeVNext.createRuntime(temp);try{player.renderTo(canvas,0);}finally{player.dispose();}
      }else if(['image','sequence'].includes(record.kind)){
        // Reuse the recipe/Alpha pipeline; a derived preview must not show its unmasked source.
        const temp=global.EditorVNextScene.blank();temp.assets={};
        for(const entry of bundle.entries)if(['image','sequence'].includes(entry.kind)){
          const asset=Object.assign({},entry.payload.asset);
          if(asset.frames?.length){asset.locator=asset.frames[0].locator;delete asset.frames;}
          temp.assets[entry.id]=asset;
        }
        temp.entities=[{id:'preview',type:'image',assetId:record.id}];
        const decoded=await global.EditorVNextAssetLoader.resolve(temp,{referencedOnly:true});
        const image=decoded[record.id]?.image;if(!image)return;
        const scale=Math.min(canvas.width/image.width,canvas.height/image.height),w=image.width*scale,h=image.height*scale;
        const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;context.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
      }else return;
      if(!stopped&&parent.isConnected)parent.prepend(canvas);
    }
    async function refresh(){
      const serial=++listSerial;saved.setAttribute('aria-busy','true');
      try{
        const next=await library.list();if(stopped||serial!==listSerial)return;rows=next;for(const listener of libraryListeners)listener(rows);
        previewObserver.disconnect();previews.clear();section(saved,'我的收藏');
        if(!rows.length){const empty=root.createElement('div');empty.className='asset-empty';empty.textContent='收藏后，可在其他工程继续取用';saved.append(empty);}
        for(const entry of rows){const value=row(saved,entry.names.join('、'), 'saved',entry.hash);
          button('取用',()=>take(entry.hash),value.controls,{resourceAction:'take'});
          button('导出',()=>exportBundle(entry.hash),value.controls,{resourceAction:'export'});
          button('移除',()=>remove(entry.hash),value.controls,{resourceAction:'remove'});
          previews.set(value.item,entry.hash);previewObserver.observe(value.item);
        }
      }catch(error){if(!stopped&&serial===listSerial)status('收藏库无法读取：'+error.message,true);}
      finally{if(serial===listSerial)saved.removeAttribute('aria-busy');}
    }
    const patternButton=button('收藏所选图样',collectPattern,actions,{resourceAction:'collect-pattern'});
    button('导入图样/资源',()=>fileInput.click(),actions,{resourceAction:'import-file'});
    const restoreButton=button('撤销移除',restore,actions,{resourceAction:'restore'});restoreButton.hidden=true;
    fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];fileInput.value='';if(!file)return;const guard=token();
      void perform(actions.querySelector('[data-resource-action="import-file"]'),async()=>{
        ensureLive(guard);await importFile(file);
      });
    });
    const unregister=()=>{};missing.id='v4-resource-missing';root.getElementById('side-import').prepend(missing);
    const off=workspace.subscribe(()=>{
      if(contextual){renderBakePanel();renderMissing(workspace.current());return;}
      if(patterns.shelf!=='collection'||stopped)return;
      const scene=workspace.current(),next=JSON.stringify([scene.assets,scene.modules,scene.patternResources,scene.patternDefinitions,core.inspect(scene),selectedPattern()?.part.recipe]);
      if(next!==signature)renderCurrent();
    });
    const offSelection=view.subscribeSelection(()=>{if(contextual||patterns.shelf==='collection')renderCurrent();});
    function attachContexts(parent){
      if(contextual)throw Error('资源入口已挂载');contextual=true;bakeSignature='';current.hidden=true;patternButton.hidden=true;parent.append(bakePanel);renderBakePanel();
      return()=>{contextual=false;current.hidden=false;patternButton.hidden=false;host.insertBefore(bakePanel,current);renderCurrent();};
    }
    function open(){patterns.open('assets');}
    async function stop(){stopped=true;for(const listener of stopListeners)listener();stopListeners.clear();statusListeners.clear();libraryListeners.clear();cancelBake();listSerial++;off();offSelection();previewObserver.disconnect();previews.clear();drawing.cancelPattern?.();unregister();missing.remove();await Promise.allSettled([...pending]);await library.close();}
    return Object.freeze({open,refresh,stop,collect,collectPattern,take,importProjectFiles,importBundle,importFile,remove,restore,beginPreset,installDefinition,providerAction,createModule,bakeModule,cancelBake,attachContexts,listSaved:()=>library.list(),onLibraryChange(fn){libraryListeners.add(fn);return()=>libraryListeners.delete(fn);},onStatus(fn){statusListeners.add(fn);return()=>statusListeners.delete(fn);},onStop(fn){stopListeners.add(fn);return()=>stopListeners.delete(fn);},get busy(){return busy;}});
  }
  global.EditorClassicV4ResourceController=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
