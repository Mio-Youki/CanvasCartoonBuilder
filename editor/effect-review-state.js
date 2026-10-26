/* Review metadata is separate from the live preview and product registration. */
(function(global){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function identity(candidate){
    const source=JSON.stringify({id:candidate.id,version:candidate.version,parameters:candidate.parameters,paint:String(candidate.paint),normalize:String(candidate.normalize),source:candidate.reviewSource});
    let hash=2166136261;for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return{id:candidate.id,version:candidate.version,fingerprint:(hash>>>0).toString(16)};
  }
  function create(candidate,storage){
    const subject=identity(candidate),key='tosampool.effect-review.v1:'+subject.id+':'+subject.version+':'+subject.fingerprint;
    const empty=()=>({name:candidate.name,labels:{},notes:{},note:'',defaults:null,confirmation:null});
    let data=empty(),preview=null,error=null;
    try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved?.format==='tosampool-effect-review/v1'&&saved.subject?.fingerprint===subject.fingerprint){
      if(saved.review&&typeof saved.review.name==='string'&&saved.review.labels&&saved.review.notes){data={...empty(),...saved.review};preview=saved.preview||null;}
    }}catch(e){error=String(e.message||e);}
    const changed=()=>data.name!==candidate.name||Object.keys(data.labels).length>0||Object.values(data.notes).some(Boolean)||!!data.note||data.defaults!==null;
    const record=()=>clone({format:'tosampool-effect-review/v1',subject,review:data,preview,transport:'local-only'});
    function persist(){try{if(!storage)throw Error('本地存储不可用');storage.setItem(key,JSON.stringify(record()));error=null;return true;}catch(e){error=String(e.message||e);return false;}}
    function invalidate(){data.confirmation=null;}
    function setName(value){data.name=value;invalidate();persist();}
    function setLabel(param,value){if(!candidate.parameters.some(p=>p.key===param))throw Error('未知参数');const original=candidate.parameters.find(p=>p.key===param).label;if(value===original)delete data.labels[param];else data.labels[param]=value;invalidate();persist();}
    function setNote(param,value){if(param===null)data.note=value;else if(candidate.parameters.some(p=>p.key===param))data.notes[param]=value;else throw Error('未知参数');invalidate();persist();}
    function setPreview(value){preview=clone(value);invalidate();persist();}
    function confirm(){if(!data.name.trim()||Object.values(data.labels).some(label=>!label.trim()))throw Error('名称不能为空');data.confirmation={decision:changed()?'request-changes':'approve-proposal',at:new Date().toISOString()};if(!persist()){data.confirmation=null;throw Error('未能保存确认记录：'+error);}return record();}
    return Object.freeze({key,subject,changed,record,flush:persist,get data(){return clone(data);},get preview(){return preview&&clone(preview);},get error(){return error;},setName,setLabel,setNote,setPreview,
      adoptDefaults(value){data.defaults=clone(value);invalidate();persist();},reset(){data=empty();persist();},confirm});
  }
  global.ToSampoolEffectReviewState=Object.freeze({create,identity});
})(typeof window!=='undefined'?window:globalThis);
