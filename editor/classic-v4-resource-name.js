/* Resource labels are metadata, never foreign keys. Survives card re-projection. */
(function(global){
  'use strict';
  let press=null,last=null;
  function normalize(value){
    const name=String(value??'').trim();
    if(!name||name.length>120||/[\x00-\x1f]/.test(name))throw Error('名称需为1～120个字符，且不含换行或控制字符');
    return name;
  }
  function bind(node,options){
    if(!node||node.dataset.resourceRename===options.key)return;
    node.dataset.resourceRename=options.key;node.title='双击名称重命名';
    const open=()=>{
      const now=Date.now();if(last?.key===options.key&&now-last.at<300)return;last={key:options.key,at:now};
      const value=global.prompt('名称：',options.initial());if(value===null)return;
      try{const name=normalize(value);if(name===options.initial())return;Promise.resolve(options.apply(name)).catch(options.error||(()=>{}));}
      catch(error){options.error?.(error);}
    };
    node.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;const now=Date.now();
      if(press?.key===options.key&&now-press.at<450){press=null;event.preventDefault();event.stopImmediatePropagation();open();}
      else press={key:options.key,at:now};
    },true);
    node.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();press=null;open();});
  }
  global.EditorClassicV4ResourceName=Object.freeze({normalize,bind});
})(typeof window!=='undefined'?window:globalThis);
