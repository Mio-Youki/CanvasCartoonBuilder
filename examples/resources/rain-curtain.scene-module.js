/* Trusted demo module. Deterministic rectangles, no external assets or services. */
(function () {
  'use strict';
  const manifest = {
    format:'tosampool-scene-module/v1', id:'example.rain-curtain', version:1,
    title:'雨幕', purpose:'可复用的轻量雨幕；每个实例独立控制雨量、周期和颜色。',
    recommendedCanvas:{width:480,height:270}, timeDependent:true, assets:[],
    parameters:[
      {key:'amount',label:'雨量',type:'number',default:60,min:0,max:240,integer:true,step:1,timing:'step'},
      {key:'period',label:'周期时间',type:'number',default:4,min:.2,max:60,step:.1,timing:'step'},
      {key:'color',label:'雨色',type:'color',default:'#77bbff',timing:'step'},
      {key:'seed',label:'随机种子',type:'number',default:7,min:0,max:65535,integer:true,step:1,timing:'step'}
    ]
  };
  function random(index,seed) {
    let n=Math.imul(index+1,374761393)^Math.imul(seed+1,668265263);
    n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;
  }
  ToSampoolRuntimeVNext.modules.sceneModules.register({manifest,
    render({ctx,width,height,params,time}) {
      const progress=((time/params.period)%1+1)%1;
      ctx.fillStyle=params.color;
      for(let i=0;i<params.amount;i++) {
        const x=random(i,params.seed)*width-width/2;
        const y=((random(i+256,params.seed)+progress)%1)*height-height/2;
        const length=3+Math.floor(random(i+512,params.seed)*6);
        ctx.fillRect(Math.round(x),Math.round(y),1,Math.min(length,height/2-y));
        if(y+length>height/2)ctx.fillRect(Math.round(x),-height/2,1,y+length-height/2);
      }
    }
  });
})();
