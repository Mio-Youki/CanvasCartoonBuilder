(function(global){
  'use strict';
  function refresh(open){const entries=global.classicV4ResourceEntries;if(!entries)return;if(open){global.classicV4Patterns?.open('patterns');entries.patterns.setScope('shared');}else void entries.refresh();}
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('tosampool-effect-delivery'):null;
  if(channel)channel.onmessage=event=>{if(event.data?.kind==='effect-shared')refresh(false);};
  if(new URLSearchParams(location.search).get('effectShared')==='1')global.addEventListener('load',()=>refresh(true),{once:true});
  global.addEventListener('pagehide',()=>channel?.close(),{once:true});
})(window);
