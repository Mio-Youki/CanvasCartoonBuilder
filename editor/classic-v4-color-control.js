(function(global){
  'use strict';

  function controls(options){
    const {root,value,alpha=1,change,label,allowAlpha=true}=options;
    if(typeof global.colorField==='function')return[global.colorField(value,alpha,change,label,{alpha:allowAlpha})];
    const color=root.createElement('input');color.type='color';color.value=/^#[0-9a-f]{6}$/i.test(value||'')?value:'#ffffff';
    const result=[color];
    let currentColor=color.value,currentAlpha=Math.max(0,Math.min(1,+alpha||0));
    color.addEventListener('input',()=>{currentColor=color.value;change(currentColor,currentAlpha,false);});
    if(allowAlpha){const opacity=root.createElement('input');opacity.type='number';opacity.min='0';opacity.max='100';opacity.step='1';opacity.value=String(Math.round(currentAlpha*100));opacity.title='透明度 (%)';opacity.addEventListener('change',()=>{currentAlpha=Math.max(0,Math.min(100,+opacity.value||0))/100;change(currentColor,currentAlpha,true);});result.push(opacity);}
    return result;
  }

  global.EditorClassicV4ColorControl=Object.freeze({controls});
})(typeof window!=='undefined'?window:globalThis);
