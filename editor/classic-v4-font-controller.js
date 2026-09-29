/* Classic Shell font picker/relink UI backed by v4 font references and session FontFace objects. */
(function (global) {
  'use strict';
  function create(options){
    options=options||{};
    const workspace=options.workspace,changes=options.changes,root=options.root||document,host=options.host||global.EditorHost,state=global.EditorVNextFontState;
    if(!workspace||!changes||!state)throw new Error('Classic v4 Font Controller dependencies are missing');
    const select=root.getElementById('text-font'),button=root.getElementById('btn-import-font'),input=root.getElementById('text-font-file');
    const loaded=new Map([['system',{family:'sans-serif'}]]),attempted=new Map();let selectedId='system',stopped=false,syncToken=0;
    function scene(){return workspace.requireDocument();}
    function refs(){return scene().fonts||{};}
    function optionLabel(id,item){return item.name+(loaded.has(id)?'':' · 未连接');}
    function refresh(){
      if(stopped||!select)return;
      const wanted=selectedId&&((selectedId==='system')||refs()[selectedId])?selectedId:'system';select.innerHTML='';const system=new Option('默认无衬线','system');system.dataset.family='sans-serif';select.append(system);
      for(const [id,item] of Object.entries(refs())){const option=new Option(optionLabel(id,item),id);option.dataset.family=loaded.has(id)?item.family:'sans-serif';select.append(option);}select.value=wanted;selectedId=wanted;
      if(button){button.disabled=false;button.title=wanted!=='system'&&!loaded.has(wanted)?'重连当前字体，或导入新字体':'导入字体';}
    }
    async function install(id,item,dataUrl){
      if(!global.FontFace)throw new Error('当前环境不支持自定义字体');
      const face=new FontFace(item.family,`url(${dataUrl})`);await face.load();root.fonts.add(face);loaded.set(id,{face,family:item.family});attempted.set(id,item.locator||item.fileName||id);refresh();return face;
    }
    async function resolveOne(id,item,token){
      if(!item||!item.locator||loaded.has(id)||attempted.get(id)===item.locator)return;
      attempted.set(id,item.locator);
      try{const dataUrl=await global.EditorAssetResolver.resolveToDataUrl(item.locator,{host,sceneLocator:workspace.locator||null});if(token!==syncToken||stopped)return;await install(id,item,dataUrl);}
      catch(_){if(token===syncToken)refresh();}
    }
    function sync(){const token=++syncToken;refresh();for(const [id,item] of Object.entries(refs()))resolveOne(id,item,token);}
    async function importFiles(files){
      const file=files&&files[0];if(!file)return null;
      const dataUrl=await host.readDataUrl(file),existing=state.findByFile(scene(),file.name),family=existing?refs()[existing].family:`ToSampool_${state.slug(file.name,'font').replace(/[^a-z0-9_]/gi,'_')}_${Date.now().toString(36)}`;
      const draft=state.descriptor({name:file.name,fileName:file.name,family,locator:file._patchariumLocator||null,mime:file.type});
      const id=existing||state.unique(new Set(Object.keys(refs())),state.slug(file.name,'font'));await install(id,draft,dataUrl);
      changes.run(existing?'重连字体':'导入字体',value=>{if(existing)state.relink(value,existing,draft);else state.add(value,Object.assign({id},draft));});selectedId=id;refresh();return{id,descriptor:refs()[id]};
    }
    async function choose(){try{const files=await host.pickAssets({accept:'.ttf,.otf,.woff,.woff2,font/*',multiple:false});return importFiles(files);}catch(error){const hint=root.getElementById('draw-hint');if(hint)hint.textContent='字体载入失败：'+(error&&error.message?error.message:error);return null;}}
    function onSelect(event){event.stopImmediatePropagation();selectedId=select.value||'system';refresh();}
    function onInput(event){event.stopImmediatePropagation();const files=[...(event.target.files||[])];event.target.value='';importFiles(files).catch(error=>{const hint=root.getElementById('draw-hint');if(hint)hint.textContent='字体载入失败：'+(error&&error.message?error.message:error);});}
    function onButton(event){if(host.kind!=='tauri')return;event.preventDefault();event.stopImmediatePropagation();choose();}
    select?.addEventListener('change',onSelect,true);input?.addEventListener('change',onInput,true);button?.addEventListener('click',onButton,true);
    const unsubscribe=workspace.subscribe(sync);sync();
    function selected(){const item=selectedId==='system'?null:refs()[selectedId];return{id:selectedId,family:item&&loaded.has(selectedId)?item.family:'sans-serif',connected:selectedId==='system'||loaded.has(selectedId)};}
    function selectFont(id){selectedId=id&&refs()[id]?id:'system';refresh();return selected();}
    function makeSelect(currentId,onChange){const node=root.createElement('select');const append=(id,label,family)=>{const option=new Option(label,id);option.dataset.family=family;node.append(option);};append('system','默认无衬线','sans-serif');for(const [id,item] of Object.entries(refs()))append(id,optionLabel(id,item),loaded.has(id)?item.family:'sans-serif');node.value=currentId&&refs()[currentId]?currentId:'system';node.addEventListener('change',()=>onChange(node.value,selectedFor(node.value)));return node;}
    function selectedFor(id){const item=id!=='system'&&refs()[id];return{id:id||'system',family:item&&loaded.has(id)?item.family:'sans-serif',connected:id==='system'||loaded.has(id)};}
    function stop(){stopped=true;unsubscribe();select?.removeEventListener('change',onSelect,true);input?.removeEventListener('change',onInput,true);button?.removeEventListener('click',onButton,true);}
    return Object.freeze({importFiles,choose,refresh,selected,selectedFor,selectFont,makeSelect,isConnected:id=>id==='system'||loaded.has(id),stop});
  }
  global.EditorClassicV4FontController=Object.freeze({version:1,create});
})(typeof window!=='undefined'?window:globalThis);
