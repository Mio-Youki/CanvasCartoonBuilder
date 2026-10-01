/* Project asset-folder inspection. It performs no I/O and creates no links:
   callers supply selected files, then copy planned assets into their own vault. */
(function (global) {
  'use strict';
  const slash = value => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
  const dirname = path => { const clean=slash(path),index=clean.lastIndexOf('/'); return index < 0 ? '' : clean.slice(0,index+1); };
  const join = (base, value) => slash(`${base || ''}${value || ''}`);
  const image = record => /^image\//.test(String(record.type || '')) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(record.path || record.name || ''));
  function assetRecord(record) {
    try {
      const value=typeof record.text==='string'?JSON.parse(record.text):record.value;
      if(!value || value.format!=='tosampool-asset/v1') return null;
      const rawFrames=Array.isArray(value.frames)&&value.frames.length?value.frames:[value.source || value.file].filter(Boolean);
      if(!rawFrames.length) return {error:'素材描述没有 source 或 frames',path:slash(record.path)};
      const frames=rawFrames.map(frame=>join(dirname(record.path),typeof frame==='string'?frame:(frame.file || frame.locator)));
      return {path:slash(record.path),id:String(value.id || ''),name:String(value.name || value.id || '素材'),kind:value.kind==='sequence'||frames.length>1?'sequence':'image',frames,fps:Math.max(.1,+value.fps||8),frameLoop:value.frameLoop!==false,recipe:value.recipe || null};
    } catch (_) { return null; }
  }
  function plan(records) {
    records=Array.isArray(records)?records:[];
    const images=new Set(records.filter(image).map(record=>slash(record.path || record.name)));
    const claimed=new Set(), project=[], invalid=[];
    for(const record of records) {
      const asset=assetRecord(record); if(!asset) continue;
      if(asset.error){invalid.push(asset);continue;}
      const missing=asset.frames.filter(path=>!images.has(path));
      if(missing.length){invalid.push(Object.assign(asset,{error:`缺少 ${missing.join('、')}`}));continue;}
      asset.frames.forEach(path=>claimed.add(path));project.push(asset);
    }
    return { project, loose:records.filter(record=>image(record)&&!claimed.has(slash(record.path || record.name))), invalid };
  }
  const api=Object.freeze({version:1,slash,assetRecord,plan});
  global.ToSampoolAssetFolderPlan=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
