/* Opt-in browser ↔ host bridge for derived image assets. No model call lives
 * here; an in-app Agent, a Tauri command, or an E2E fixture supplies pixels. */
(function (global) {
  'use strict';
  const REQUEST='tosampool-derived-asset-request', RESPONSE='tosampool-derived-asset-response';let serial=0;
  function create(options){
    options=options||{};const target=options.target||global,timeout=Math.max(1000,+options.timeout||90000);
    if(!target||typeof target.dispatchEvent!=='function'||typeof target.addEventListener!=='function')throw new Error('派生素材桥接需要 EventTarget 宿主');
    function derive(payload){const requestId=`derived-${Date.now().toString(36)}-${(++serial).toString(36)}`;return new Promise((resolve,reject)=>{let timer=null;const done=()=>{target.removeEventListener(RESPONSE,onResponse);if(timer)global.clearTimeout(timer);};const onResponse=event=>{const detail=event&&event.detail||{};if(detail.requestId!==requestId)return;done();if(detail.error)reject(new Error(String(detail.error)));else resolve(detail.result);};target.addEventListener(RESPONSE,onResponse);timer=global.setTimeout(()=>{done();reject(new Error('派生素材宿主没有在限定时间内回应。'));},timeout);target.dispatchEvent(new CustomEvent(REQUEST,{detail:Object.freeze({format:'tosampool-derived-asset-bridge/v1',requestId,kind:'derive',payload})}));});}
    return Object.freeze({derive});
  }
  global.EditorVNextDerivedAssetBridge=Object.freeze({REQUEST,RESPONSE,create});
})(typeof window!=='undefined'?window:globalThis);
