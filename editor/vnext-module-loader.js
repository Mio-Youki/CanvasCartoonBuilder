/* Explicitly trusted loading for project-scoped procedural modules. Never runs on project open. */
(function (global) {
  'use strict';

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
      await registry.withScope(scope,async()=>execute(await sourceFor(Object.assign({id:item.id},scene.modules[item.id]),options),item.id));
      registry.definition(item.id,item.version,{scope});loaded.push(item.id);
    }
    return Object.freeze(loaded);
  }
  global.EditorVNextModuleLoader=Object.freeze({inspect,trustAndLoad,dataUrlText});
})(typeof window !== 'undefined' ? window : globalThis);
