(function(global){
  'use strict';
  async function connect(){
    if(!document.querySelector('meta[name="tosampool-effect-review-host"]'))return null;
    const result=await fetch('/__effect-review/bootstrap',{cache:'no-store'});if(!result.ok)throw Error('回传宿主连接失败');const info=await result.json();
    async function request(path,data){const response=await fetch('/__effect-review/'+path,{method:data?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+info.token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const value=await response.json();if(!response.ok)throw Error(value.error||'回传失败');return value;}
    return Object.freeze({submit:record=>request('jobs',record),get:id=>request('jobs/'+id),answer:(id,answers)=>request('jobs/'+id+'/answers',{answers}),shared:(id,receipt)=>request('jobs/'+id+'/shared',receipt),retry:id=>request('jobs/'+id+'/retry'),
      async download(id){const r=await request('jobs/'+id+'/package'),url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=id+'.tosampool-resource.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}});
  }
  global.ToSampoolEffectReviewTransport=Object.freeze({connect});
})(typeof window!=='undefined'?window:globalThis);
