/* Lab host only. Captures and motion are provided by the formal Runtime. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id),output=$('output'),original=$('original'),lab=ToSampoolLayerFragmentProbe;
 let probe=null,uploaded=null,playing=false,last=0,time=0;const samples=[];
 function illustration(){const c=document.createElement('canvas');c.width=400;c.height=240;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,400,240);g.addColorStop(0,'#8ad7dc');g.addColorStop(1,'#eed19e');x.fillStyle=g;x.fillRect(0,0,400,240);x.fillStyle='#e55b4a';x.beginPath();x.arc(300,70,42,0,Math.PI*2);x.fill();x.fillStyle='#324b60';x.beginPath();x.moveTo(0,240);x.lineTo(110,100);x.lineTo(220,210);x.lineTo(310,120);x.lineTo(400,240);x.fill();x.fillStyle='#f5ead4';x.font='bold 34px sans-serif';x.fillText('ToSampool',22,52);return c;}
 const defaultImage=illustration();
 function scene(){const kind=$('kind').value,image=uploaded||defaultImage,W=512,H=320;let source;
  if(kind==='image'){const fit=Math.min(440/image.width,260/image.height),w=image.width*fit,h=image.height*fit;source={id:'source',type:'image',assetId:'image',x:(W-w)/2,y:(H-h)/2,w,h};}
  if(kind==='vector')source={id:'source',type:'vector',x:46,y:36,w:420,h:240,parts:[{id:'a',type:'rect',x:0,y:0,w:420,h:240,fill:'#e9dfc7',radius:30},{id:'b',type:'ellipse',x:32,y:35,w:150,h:150,fill:'#e54b47'},{id:'c',type:'poly',x:215,y:30,w:170,h:180,points:[[.5,0],[1,1],[0,1]],fill:'#3b7184'}]};
  if(kind==='text')source={id:'source',type:'text',text:'ToSampool',x:48,y:100,w:420,h:100,fontSize:64,fontFamily:'sans-serif',fill:'#ffd23f'};
  return{format:'tosampool-scene/v4',width:W,height:H,loop:4,background:{alpha:0},runtimeAssets:{image:{image}},entities:[source]};
 }
 function settings(){const o={};for(const id of ['life','speed','direction','spread','gravity','spinSpeed','seed'])o[id]=+$(id).value;o.fade=$('fade').checked;return o;}
 function paint(){if(!probe)return;const start=performance.now(),stats=probe.render(output,time,settings());samples.push(performance.now()-start);if(samples.length>120)samples.shift();const sorted=samples.slice().sort((a,b)=>a-b);$('seek').value=time;$('status').textContent=`${stats.cells} 个切片 · ${stats.drawn} 个绘制中 · ${time.toFixed(2)}s · P95 ${sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)].toFixed(1)}ms`;}
 function rebuild(){playing=false;$('play').textContent='播放';time=0;samples.length=0;try{const snapshot=lab.capture(scene(),'source',0);original.width=snapshot.width;original.height=snapshot.height;original.getContext('2d').drawImage(snapshot,0,0);probe=lab.create(snapshot,+$('cell').value);window.layerProbe=probe;paint();}catch(error){$('status').textContent=error.message;}}
 for(const id of ['kind','cell'])$(id).addEventListener('change',rebuild);
 for(const id of ['life','speed','direction','spread','gravity','spinSpeed','seed','fade'])$(id).addEventListener('input',()=>{$('seek').max=+$('life').value;time=Math.min(time,+$('life').value);paint();});
 $('file').addEventListener('change',async()=>{const file=$('file').files[0];if(!file)return;const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();uploaded=image;$('kind').value='image';rebuild();}finally{URL.revokeObjectURL(url);}});
 $('seek').addEventListener('input',()=>{playing=false;$('play').textContent='播放';time=+$('seek').value;paint();});
 $('reset').addEventListener('click',()=>{playing=false;$('play').textContent='播放';time=0;paint();});
 $('play').addEventListener('click',()=>{if(time>=+$('life').value)time=0;playing=!playing;last=performance.now();$('play').textContent=playing?'暂停':'播放';});
 function tick(at){if(playing){time=Math.min(+$('life').value,time+(at-last)/1000);last=at;paint();if(time>=+$('life').value){playing=false;$('play').textContent='播放';}}requestAnimationFrame(tick);}rebuild();requestAnimationFrame(tick);
})();
