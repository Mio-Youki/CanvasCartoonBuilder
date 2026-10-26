/* Publication identity is not a Canvas object, resource ID, or content hash. */
(function(global){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value)),hash=/^sha256:[a-f0-9]{64}$/;
  function core(){return global.EditorV4Resources;}
  function ref(value){if(!value||!['asset','element','pattern'].includes(value.kind)||typeof value.id!=='string'||!value.id)throw Error('只能共享位图／序列／元素／图样');return{kind:value.kind,id:value.id};}
  function validateScene(scene){
    const links=scene.materialShares;if(links==null)return;
    if(!links||Array.isArray(links)||typeof links!=='object'||Object.keys(links).length>1024)throw Error('素材共享关系无效');
    for(const [key,link]of Object.entries(links)){
      if(!/^(asset|element|pattern):[^\s]+@1$/.test(key)||!link||Object.keys(link).some(k=>!['publicationId','publishedHash','localHash'].includes(k))||typeof link.publicationId!=='string'||!link.publicationId||link.publicationId.length>160||!hash.test(link.publishedHash)||!hash.test(link.localHash))throw Error('素材共享关系无效：'+key);
    }
  }
  function create(options){
    const library=options.library;
    function linkFor(scene,selection){return scene.materialShares?.[core().key(ref(selection))]||null;}
    function setLink(scene,selection,value){const key=core().key(ref(selection));scene.materialShares={...scene.materialShares};if(value)scene.materialShares[key]=value;else delete scene.materialShares[key];validateScene(scene);}
    async function capture(scene,selection,opts){return core().capture(scene,[ref(selection)],opts);}
    async function state(scene,selection,opts){
      const link=linkFor(scene,selection),record=link&&await library.publication(link.publicationId);
      if(!record)return{active:false,changed:false,record:null};
      const bundle=await capture(scene,selection,opts);
      return{active:true,changed:bundle.hash!==link.localHash,remoteChanged:record.hash!==link.publishedHash,record};
    }
    async function publish(scene,selection,opts){
      opts=opts||{};const bundle=await capture(scene,selection,opts),link=linkFor(scene,selection);let prior=link&&await library.publication(link.publicationId);
      if(prior&&prior.hash!==link.publishedHash)throw Error('共享素材已由其他工程更新；请先取用新版本，或取消共享后另行发布');
      const root=bundle.entries.find(r=>core().key(r)===bundle.roots[0]);
      // A pattern is a single parameter clipboard, including when imported from
      // another project's folder without its project-local publication link.
      if(!prior&&selection.kind==='pattern')for(const row of await library.publications()){
        if(row.kind!=='pattern')continue;const saved=await library.sharedBundle(row.id),entry=saved.bundle.entries.find(r=>core().key(r)===row.root);
        if(entry&&core().patternIdentity(entry.payload.preset)===core().patternIdentity(root.payload.preset)){prior=row;break;}
      }
      const record=await library.publish(bundle,{id:prior?.id,expectedRevision:prior?.revision,name:root.payload.preset?.name||root.name,guard:opts.guard});
      return{record,link:{publicationId:record.id,publishedHash:record.hash,localHash:bundle.hash}};
    }
    async function unpublish(scene,selection,opts){
      opts=opts||{};const link=linkFor(scene,selection),record=link&&await library.publication(link.publicationId);
      if(record){if(opts.expectedRevision==null&&record.hash!==link.publishedHash)throw Error('共享素材已更新，请刷新后再移除');await library.unpublish(record.id,{expectedRevision:opts.expectedRevision??record.revision,guard:opts.guard});}return null;
    }
    function mappingRef(record,result){return record.kind==='element'?{kind:'element',id:result.elements[record.id]}:record.kind==='pattern'?{kind:'pattern',id:result.patterns[record.id]}:{kind:'asset',id:result.assets[record.id]};}
    async function take(scene,id,opts){
      opts=opts||{};const {record,bundle}=await library.sharedBundle(id),source=bundle.entries.find(r=>core().key(r)===record.root);
      if(!source||!['image','sequence','element','pattern'].includes(source.kind))throw Error('此共享资源不是位图／序列／元素／图样');
      for(const [key,link]of Object.entries(scene.materialShares||{}))if(link.publicationId===id&&link.publishedHash===record.hash){
        const type=key.startsWith('element:')?'element':key.startsWith('pattern:')?'pattern':'asset',selection={kind:type,id:decodeURIComponent(key.slice(key.indexOf(':')+1,key.lastIndexOf('@')))};
        try{if((await capture(scene,selection,opts)).hash===link.localHash){const draft=copy(scene);if(selection.kind==='asset')delete draft.assets[selection.id].libraryHidden;return{scene:draft,selection,reused:true,record};}}catch(_){}
      }
      const draft=copy(scene),result=await core().importInto(draft,bundle),selection=mappingRef(source,result);
      if(selection.kind==='element')draft.elementPresets[selection.id].name=record.name;else if(selection.kind==='pattern')draft.patternResources[selection.id].name=record.name;else draft.assets[selection.id].name=record.name;
      const local=await capture(draft,selection,opts);setLink(draft,selection,{publicationId:id,publishedHash:record.hash,localHash:local.hash});
      // Capture/import do not authorize Module code. Instantiation remains an
      // explicit, current-project trusted operation in the existing adapter.
      return{scene:draft,selection,reused:false,record};
    }
    return Object.freeze({library,linkFor,setLink,capture,state,publish,unpublish,take});
  }
  global.EditorV4MaterialSharing=Object.freeze({create,validateScene});
})(typeof window!=='undefined'?window:globalThis);
