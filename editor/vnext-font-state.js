/* Persistent v4 font references. Font binaries stay outside the Scene; text keeps a raster fallback. */
(function (global) {
  'use strict';

  function slug(value, fallback) {
    const text=String(value||'').replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return text||fallback||'font';
  }
  function unique(existing, base) { let id=base,index=2;while(existing.has(id))id=`${base}-${index++}`;return id; }
  function descriptor(options) {
    options=options||{};
    const name=String(options.name||options.fileName||'外部字体').replace(/\.[^.]+$/,'');
    return {
      name,
      family:String(options.family||name||'sans-serif'),
      fileName:String(options.fileName||options.name||''),
      locator:options.locator?String(options.locator):null,
      mime:String(options.mime||''),
    };
  }
  function add(scene, options) {
    if(!scene)throw new Error('导入字体需要场景');
    scene.fonts=Object.assign({},scene.fonts||{});
    const requested=options&&options.id,base=requested||slug(options&&options.fileName||options&&options.name,'font');
    const id=requested&&scene.fonts[requested]?requested:unique(new Set(Object.keys(scene.fonts)),base);
    scene.fonts[id]=descriptor(Object.assign({},options,{family:options&&options.family||`ToSampool_${id.replace(/[^a-z0-9_]/gi,'_')}`}));
    return{id,descriptor:scene.fonts[id]};
  }
  function relink(scene,id,options) {
    if(!scene||!scene.fonts||!scene.fonts[id])throw new Error(`字体连接不存在：${id||'(空)'}`);
    const previous=scene.fonts[id];scene.fonts[id]=descriptor(Object.assign({},previous,options,{family:previous.family}));return scene.fonts[id];
  }
  function findByFile(scene,fileName) {
    const wanted=String(fileName||'').toLowerCase();
    return Object.entries(scene&&scene.fonts||{}).find(([,item])=>String(item&&item.fileName||'').toLowerCase()===wanted)?.[0]||null;
  }
  function attach(scene,entityId,fontId) {
    const entity=(scene&&scene.entities||[]).find(item=>item&&item.id===entityId);if(!entity||entity.type!=='text')throw new Error(`找不到文字对象「${entityId||'(空)'}」`);
    if(!fontId||fontId==='system'){delete entity.fontId;entity.fontFamily='sans-serif';return entity;}
    const font=scene.fonts&&scene.fonts[fontId];if(!font)throw new Error(`字体连接不存在：${fontId}`);entity.fontId=fontId;entity.fontFamily=font.family;return entity;
  }
  global.EditorVNextFontState=Object.freeze({slug,unique,descriptor,add,relink,findByFile,attach});
})(typeof window!=='undefined'?window:globalThis);
