/* Extract authored shelf roots from a saved project folder, never its Canvas. */
(function(global){
  'use strict';
  async function read(files){
    const list=Array.from(files||[]),path=file=>String(file.webkitRelativePath||file.path||file.name||'').replace(/\\/g,'/');
    const projects=list.filter(file=>/(^|\/)project\.tosampool\.json$/.test(path(file)));if(projects.length>1)throw Error('请选择单个项目文件夹，当前包含多个项目');const project=projects[0];if(!project){if(list.some(file=>/(^|\/)assets\.manifest\.json$/.test(path(file))))throw Error('项目文件夹缺少 project.tosampool.json');return null;}
    const prefix=path(project).slice(0,-'project.tosampool.json'.length),entries=[];
    for(const file of list)if(path(file).startsWith(prefix))entries.push({path:path(file).slice(prefix.length),data:file.data??new Uint8Array(await file.arrayBuffer()),mime:file.type});
    const {scene}=await global.EditorVNextProjectPackage.restore(entries),roots=[];
    for(const [id,asset]of Object.entries(scene.assets||{}))if(!asset.libraryHidden&&!asset.internal&&asset.generated!=='text-raster')roots.push({kind:'asset',id});
    for(const id of Object.keys(scene.elementPresets||{}))roots.push({kind:'element',id});
    for(const id of Object.keys(scene.patternResources||{}))roots.push({kind:'pattern',id});
    return{bundle:roots.length?await global.EditorV4Resources.capture(scene,roots):null,count:roots.length};
  }
  global.EditorV4ProjectMaterialTransfer=Object.freeze({read});
})(typeof window!=='undefined'?window:globalThis);
