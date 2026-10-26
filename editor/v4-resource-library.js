/* Explicit shared collection. Never restores a project or executes a module. */
(function(global){
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v));
  function publicationChange(rows,id,bundle,expected,name){
    const prior=rows.find(r=>r.id===id);
    if(expected==null?!!prior:!prior||prior.revision!==expected)throw Error('共享条目已变化，请刷新后重试');
    if(!bundle)return null;
    const names=new Set(rows.filter(r=>r.id!==id).map(r=>r.name)),base=String(name||prior?.name||'素材').trim().slice(0,120)||'素材';let label=base,n=2;while(names.has(label))label=base+' ('+(n++)+')';
    const kind=bundle.entries.find(entry=>global.EditorV4Resources.key(entry)===bundle.roots[0]).kind;
    return{format:'tosampool-material-publication/v1',id,name:label,hash:bundle.hash,revision:(prior?.revision||0)+1,root:bundle.roots[0],kind};
  }
  function memoryStorage(){
    const records=new Map(),publications=new Map(),content=new Map(),migrations=new Map();
    return{put:async(k,v)=>records.set(k,copy(v)),get:async k=>records.has(k)?copy(records.get(k)):null,list:async()=>[...records.values()].map(copy),remove:async k=>records.delete(k),
      publications:async()=>[...publications.values()].map(copy),sharedBundle:async hash=>content.has(hash)?copy(content.get(hash)):null,
      migrateMaterials:async(materials,guard)=>{
        guard?.();const result=migrationChange([...publications.values()],Object.fromEntries(migrations),materials);
        for(const item of result.created){content.set(item.bundle.hash,copy(item.bundle));publications.set(item.record.id,copy(item.record));migrations.set(item.source,item.record.id);}
        return migrationReport(result);
      },
      writePublication:async(id,bundle,expected,name,guard)=>{guard?.();const next=publicationChange([...publications.values()],id,bundle,expected,name);if(next){content.set(bundle.hash,copy(bundle));publications.set(id,next);}else publications.delete(id);const used=new Set([...publications.values()].map(r=>r.hash));for(const hash of content.keys())if(!used.has(hash))content.delete(hash);return next&&copy(next);}};
  }
  function indexedDBStorage(options){
    const name=options?.name||'tosampool-resource-library-v1';let pending;
    async function db(){if(!global.indexedDB)throw Error('当前Host不支持IndexedDB收藏库');if(!pending)pending=new Promise((resolve,reject)=>{const r=global.indexedDB.open(name,3);r.onupgradeneeded=()=>{for(const key of ['packages','publications','shared-content','legacy-material-migrations'])if(!r.result.objectStoreNames.contains(key))r.result.createObjectStore(key);};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();pending=null;};resolve(r.result);};r.onerror=()=>reject(r.error||Error('无法打开收藏库'));r.onblocked=()=>reject(Error('收藏库被其他窗口阻塞'));}).catch(e=>{pending=null;throw e;});return pending;}
    async function run(mode,operation){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('packages',mode),r=operation(tx.objectStore('packages'));let result;r.onsuccess=()=>result=r.result;r.onerror=()=>reject(r.error);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('收藏库事务失败'));tx.onabort=()=>reject(tx.error||Error('收藏库事务取消'));});}
    async function readShared(store,key){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(store,'readonly'),s=tx.objectStore(store),r=key==null?s.getAll():s.get(key);let value;r.onsuccess=()=>value=r.result;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error||Error('共享库读取失败'));tx.onabort=()=>reject(tx.error||Error('共享库读取取消'));});}
    async function writePublication(id,bundle,expected,label,guard){
      const d=await db();return new Promise((resolve,reject)=>{
        const tx=d.transaction(['publications','shared-content'],'readwrite'),pub=tx.objectStore('publications'),content=tx.objectStore('shared-content');let result,error;
        const request=pub.getAll();request.onsuccess=()=>{try{guard?.();const rows=request.result;result=publicationChange(rows,id,bundle,expected,label);
          if(result){content.put(bundle,bundle.hash);pub.put(result,id);}else pub.delete(id);
          const used=new Set(rows.filter(r=>r.id!==id).map(r=>r.hash));if(result)used.add(result.hash);
          const keys=content.getAllKeys();keys.onsuccess=()=>{for(const hash of keys.result)if(!used.has(hash))content.delete(hash);};
        }catch(cause){error=cause;tx.abort();}};
        tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('共享库事务取消'));tx.onerror=()=>reject(error||tx.error||Error('共享库写入失败'));
      });
    }
    async function migrateMaterials(materials,guard){
      const d=await db();return new Promise((resolve,reject)=>{
        const tx=d.transaction(['publications','shared-content','legacy-material-migrations'],'readwrite');
        const pub=tx.objectStore('publications'),content=tx.objectStore('shared-content'),ledger=tx.objectStore('legacy-material-migrations');
        const pubs=pub.getAll(),keys=ledger.getAllKeys(),values=ledger.getAll();let waiting=3,result,error;
        function ready(){if(--waiting)return;try{
          guard?.();const known=Object.fromEntries(keys.result.map((key,i)=>[key,values.result[i]]));
          const change=migrationChange(pubs.result,known,materials);result=migrationReport(change);
          for(const item of change.created){content.put(item.bundle,item.bundle.hash);pub.put(item.record,item.record.id);ledger.put(item.record.id,item.source);}
        }catch(cause){error=cause;tx.abort();}}
        pubs.onsuccess=keys.onsuccess=values.onsuccess=ready;
        tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('旧素材迁入已取消'));tx.onerror=()=>reject(error||tx.error||Error('旧素材迁入失败'));
      });
    }
    return{put:(k,v)=>run('readwrite',s=>s.put(v,k)),get:k=>run('readonly',s=>s.get(k)),list:()=>run('readonly',s=>s.getAll()),remove:k=>run('readwrite',s=>s.delete(k)),
      publications:()=>readShared('publications'),sharedBundle:hash=>readShared('shared-content',hash),writePublication,
      migrateMaterials,
      close:async()=>{if(pending)(await pending).close();pending=null;}};
  }
  // A durable source→publication relation survives unpublish. Repeating migration
  // neither overwrites a subsequently updated publication nor resurrects a removal.
  function migrationChange(rows,known,materials){
    const current=rows.slice(),created=[],existing=[],removed=[];
    for(const item of materials){
      if(Object.hasOwn(known,item.source)){
        const id=known[item.source],record=current.find(row=>row.id===id);
        (record?existing:removed).push({root:item.bundle.roots[0],id});continue;
      }
      const record=publicationChange(current,item.id,item.bundle,null,item.name);
      current.push(record);created.push({...item,record});
    }
    return{created,existing,removed};
  }
  function migrationReport(change){return{created:change.created.map(item=>copy(item.record)),existing:copy(change.existing),removed:copy(change.removed)};}
  function create(options){const core=global.EditorV4Resources,storage=options?.storage||indexedDBStorage(options);
    async function put(input){const p=await core.verify(input);await storage.put(p.hash,p);return p.hash;}
    async function pin(scene,selection,opts){const p=await core.capture(scene,selection,opts),hash=await put(p);scene.resourcePins=Array.from(new Set([...(scene.resourcePins||[]),hash]));return hash;}
    async function get(hash){const p=await storage.get(hash);if(!p)throw Error('收藏资源包不存在：'+hash);return core.verify(p);}
    async function importInto(scene,hash){return core.importInto(scene,await get(hash));}
    async function list(){const rows=await storage.list();return rows.map(p=>({hash:p.hash,roots:p.roots,count:p.entries.length,names:p.roots.map(k=>p.entries.find(r=>core.key(r)===k)?.name||k),kinds:p.roots.map(k=>p.entries.find(r=>core.key(r)===k)?.kind)}));}
    async function migrateMaterials(hash,options){
      if(!storage.migrateMaterials)throw Error('当前存储不支持旧素材迁入');
      const bundle=await get(hash),byKey=new Map(bundle.entries.map(r=>[core.key(r),r])),materials=[],retained=[];
      for(const root of bundle.roots){
        const record=byKey.get(root);
        if(!['image','sequence','element'].includes(record.kind)){retained.push({root,kind:record.kind});continue;}
        const closure=new Set();function visit(key){if(closure.has(key))return;closure.add(key);byKey.get(key).dependencies.forEach(visit);}visit(root);
        const single=await core.pack([root],bundle.entries.filter(r=>closure.has(core.key(r))));
        materials.push({source:hash+'|'+root,id:global.crypto.randomUUID(),bundle:single,name:record.name});
      }
      const result=await storage.migrateMaterials(materials,options?.guard);
      return{...result,retained,sourceHash:hash};
    }
    async function publications(){if(!storage.publications)throw Error('当前存储不支持共享发布');return storage.publications();}
    async function publication(id){return(await publications()).find(r=>r.id===id)||null;}
    async function sharedBundle(id){const record=await publication(id);if(!record)throw Error('共享素材已移除');const bundle=await storage.sharedBundle(record.hash);if(!bundle)throw Error('共享素材内容缺失，请刷新后重试');const verified=await core.verify(bundle);if(verified.hash!==record.hash||verified.roots[0]!==record.root)throw Error('共享素材索引与内容不一致');return{record,bundle:verified};}
    async function publish(input,options){const bundle=await core.verify(input);if(bundle.roots.length!==1)throw Error('每条共享素材只能有一个根');const root=bundle.entries.find(r=>core.key(r)===bundle.roots[0]);if(!['image','sequence','element','pattern'].includes(root?.kind))throw Error('共享发布只接收位图／序列／元素／图样');options=options||{};const id=options.id||global.crypto.randomUUID();if(typeof id!=='string'||!id||id.length>160||/[\x00-\x1f]/.test(id))throw Error('共享发布身份无效');return storage.writePublication(id,bundle,options.expectedRevision??null,options.name,options.guard);}
    async function unpublish(id,options){options=options||{};if(!Number.isInteger(options.expectedRevision))throw Error('移除共享需要当前发布版本');return storage.writePublication(id,null,options.expectedRevision,null,options.guard);}
    async function rename(id,name,options){options=options||{};const value=String(name??'').trim();if(!value||value.length>120||/[\x00-\x1f]/.test(value))throw Error('共享名称无效');const {record,bundle}=await sharedBundle(id);if(options.expectedRevision!==record.revision)throw Error('共享条目已变化，请刷新后重试');return publish(bundle,{id,name:value,expectedRevision:record.revision,guard:options.guard});}
    return Object.freeze({put,pin,get,importInto,list,migrateMaterials,remove:hash=>storage.remove(hash),publications,publication,sharedBundle,publish,unpublish,rename,close:()=>storage.close?.()});
  }
  global.EditorV4ResourceLibrary=Object.freeze({create,memoryStorage,indexedDBStorage});
})(typeof window!=='undefined'?window:globalThis);
