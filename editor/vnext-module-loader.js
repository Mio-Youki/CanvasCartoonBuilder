/* Import-only consent, lazy authorized loading and explicit trusted project loading. Not a sandbox. */
(function (global) {
  'use strict';
  const approvals=new Map(),loadedApprovals=new WeakSet(),loading=new WeakMap();
  const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
  const scopeOf=(scene,options)=>options?.scope||scene?._moduleScope||scene?.moduleScope||'global';
  function identity(scene,id,scope){return scope+'::'+id+'@'+scene.modules?.[id]?.manifest?.version;}
  function approved(scene,id,scope){const descriptor=scene.modules?.[id],record=approvals.get(identity(scene,id,scope));return record&&record.locator===descriptor?.locator&&record.manifest===JSON.stringify(ordered(descriptor?.manifest))?record:null;}
  function remember(scene,id,scope,source){const descriptor=scene.modules[id],prior=approved(scene,id,scope);if(prior&&prior.source===source)return prior;const record={locator:descriptor.locator,manifest:JSON.stringify(ordered(descriptor.manifest)),source};approvals.set(identity(scene,id,scope),record);return record;}
  async function authorizeImport(scene,ids,options){
    options=options||{};const scope=scopeOf(scene,options),pending=[];
    for(const id of [...new Set(ids||[])]){const descriptor=scene.modules?.[id];if(!descriptor?.manifest||descriptor.manifest.format!=='tosampool-scene-module/v1')throw Error('程序构件描述无效：'+id);if(!approved(scene,id,scope))pending.push({id,source:await sourceFor(descriptor,options)});}
    options.assertCurrent?.();if(!pending.length)return true;
    const accepted=await(options.confirm||global.confirm)('导入素材包含可执行的程序：\n'+pending.map(item=>scene.modules[item.id].manifest.title||item.id).join('\n')+'\n\n仅在信任来源时继续。代码并非安全沙箱；允许这些程序在本工程中运行？');
    options.assertCurrent?.();if(!accepted)return false;
    for(const item of pending)remember(scene,item.id,scope,item.source);return true;
  }
  async function loadAuthorized(scene,ids,options){
    options=options||{};const scope=scopeOf(scene,options),registry=global.ToSampoolRuntimeVNext.modules.sceneModules;
    for(const id of [...new Set(ids||[])]){
      const record=approved(scene,id,scope);if(!record)throw Error('程序素材尚未在导入时显式信任；请重新导入素材或工程：'+id);
      options.assertCurrent?.();if(loadedApprovals.has(record)){try{registry.definition(id,scene.modules[id].manifest.version,{scope});continue;}catch(_){}}
      if(!loading.has(record)){const task=registry.withScope(scope,()=>execute(record.source,id)).then(()=>{registry.definition(id,scene.modules[id].manifest.version,{scope});loadedApprovals.add(record);}).finally(()=>loading.delete(record));loading.set(record,task);}
      await loading.get(record);options.assertCurrent?.();
    }
  }

  function dataUrlText(locator) {
    const match=/^data:.*?(?:;base64)?,(.*)$/is.exec(String(locator || ''));
    if(!match) return null;
    const encoded=match[1] || '', base64=/;base64,/.test(String(locator));
    if(base64){const binary=global.atob ? global.atob(encoded) : Buffer.from(encoded,'base64').toString('binary');let text='';for(let index=0;index<binary.length;index+=1)text+=String.fromCharCode(binary.charCodeAt(index));return decodeURIComponent(escape(text));}
    return decodeURIComponent(encoded);
  }
  function inspect(scene) { return Object.entries(scene && scene.modules || {}).map(([id,descriptor])=>Object.freeze({id,version:+(descriptor&&descriptor.version||descriptor&&descriptor.manifest&&descriptor.manifest.version||1),manifest:descriptor&&descriptor.manifest||null,locator:descriptor&&descriptor.locator||''})); }
  async function sourceFor(descriptor, options) {
    const inline=dataUrlText(descriptor&&descriptor.locator);if(inline != null)return inline;
    if(options&&typeof options.resolveSource==='function')return options.resolveSource(descriptor&&descriptor.locator,descriptor);
    throw new Error(`模块「${descriptor&&descriptor.id||'(未命名)'}」没有可读取源码`);
  }
  async function execute(source, label) {
    if(typeof document==='undefined'){Function(String(source))();return;}
    await new Promise((resolve,reject)=>{const script=document.createElement('script'),url=URL.createObjectURL(new Blob([String(source)],{type:'text/javascript'}));script.src=url;script.onload=()=>{URL.revokeObjectURL(url);script.remove();resolve();};script.onerror=()=>{URL.revokeObjectURL(url);script.remove();reject(new Error(`模块「${label}」执行失败`));};document.head.append(script);});
  }
  async function trustAndLoad(scene, ids, options) {
    const registry=global.ToSampoolRuntimeVNext&&global.ToSampoolRuntimeVNext.modules&&global.ToSampoolRuntimeVNext.modules.sceneModules;if(!registry)throw new Error('程序构件 Runtime 尚未加载');
    const trusted=new Set(Array.isArray(ids)?ids:[ids]), loaded=[], scope=options&&options.scope||scene&&scene._moduleScope||scene&&scene.moduleScope||'global';
    for(const item of inspect(scene)){
      if(!trusted.has(item.id))continue;
      if(!item.manifest||item.manifest.format!=='tosampool-scene-module/v1')throw new Error(`模块「${item.id}」Manifest 无效`);
      const source=await sourceFor(Object.assign({id:item.id},scene.modules[item.id]),options),record=remember(scene,item.id,scope,source);
      await registry.withScope(scope,async()=>execute(source,item.id));loadedApprovals.add(record);
      registry.definition(item.id,item.version,{scope});loaded.push(item.id);
    }
    return Object.freeze(loaded);
  }
  global.EditorVNextModuleLoader=Object.freeze({inspect,trustAndLoad,dataUrlText,authorizeImport,loadAuthorized});
})(typeof window !== 'undefined' ? window : globalThis);
