/* Optional browser-to-host transport for the creative Agent surface.
 * It deliberately contains no API key, model call or Scene mutation. A host
 * (Codex simulation, MCP server, or future Tauri command) opts in by listening
 * for the request event and returning a response with the same requestId. */
(function (global) {
  'use strict';

  const REQUEST='tosampool-agent-creative-request';
  const RESPONSE='tosampool-agent-creative-response';
  let serial=0;
  function create(options) {
    options=options||{};
    const target=options.target||global,timeout=Math.max(1000,Number(options.timeout)||45000);
    if(!target||typeof target.dispatchEvent!=='function'||typeof target.addEventListener!=='function')throw new Error('创作桥接需要 EventTarget 宿主');
    function request(kind,payload) {
      const requestId=`creative-${Date.now().toString(36)}-${(++serial).toString(36)}`;
      return new Promise((resolve,reject)=>{
        let timer=null;
        const dispose=()=>{target.removeEventListener(RESPONSE,onResponse);if(timer)global.clearTimeout(timer);};
        const onResponse=event=>{const detail=event&&event.detail||{};if(detail.requestId!==requestId)return;dispose();if(detail.error)reject(new Error(String(detail.error)));else resolve(detail.result);};
        target.addEventListener(RESPONSE,onResponse);
        timer=global.setTimeout(()=>{dispose();reject(new Error('Agent 宿主没有在限定时间内回应。'));},timeout);
        target.dispatchEvent(new CustomEvent(REQUEST,{detail:Object.freeze({format:'tosampool-agent-bridge/v1',requestId,kind,payload})}));
      });
    }
    return Object.freeze({propose:payload=>request('propose',payload),build:payload=>request('build',payload)});
  }
  global.EditorVNextAgentCreativeBridge=Object.freeze({REQUEST,RESPONSE,create});
})(typeof window !== 'undefined' ? window : globalThis);
