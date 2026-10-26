/* Provider-neutral execution boundary. Register only adapters that really exist. */
export function createHarnessRegistry(){
  const adapters=new Map();
  function register(adapter){
    if(!adapter||typeof adapter.id!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(adapter.id)||!['cli','app-server','acp','sdk','test'].includes(adapter.transport)||typeof adapter.execute!=='function')throw Error('Harness适配器合同无效');
    if(adapters.has(adapter.id))throw Error('Harness适配器重复');adapters.set(adapter.id,adapter);return()=>adapters.delete(adapter.id);
  }
  function list(){return[...adapters.values()].map(a=>({id:a.id,transport:a.transport,verified:a.verified===true,capabilities:{structuredResult:true,continuousSession:false,...a.capabilities}}));}
  async function execute(id,job,candidate){const a=adapters.get(id);if(!a)throw Error('Harness尚未配置：'+id);return a.execute(job,candidate);}
  return Object.freeze({register,list,execute,close(){for(const a of adapters.values())a.close?.();}});
}
