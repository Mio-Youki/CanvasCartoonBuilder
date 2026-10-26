/* Formation domain contract. UI clocks do not grant new temporal capabilities. */
(function(global){
  'use strict';
  const number=(key,timing,defaultValue=0)=>({key,type:'number',timing,default:defaultValue});
  const object=Object.freeze([
    ...['x','y'].map(key=>number(key,'Linear')), ...['w','h'].map(key=>number(key,'Linear',1)),
    ...['scaleX','scaleY'].map(key=>number(key,'Linear',1)),number('rot','Linear'),number('alpha','Linear',1),
    {key:'blend',type:'select',timing:'Step',default:'normal'},number('skewX','No'),number('skewY','No')
  ].map(Object.freeze));
  const text=Object.freeze([
    number('textCompletion','Linear',100),{key:'textCursor.enabled',type:'boolean',timing:'Step',default:false},
    {key:'textCursor.style',type:'select',timing:'Step',default:'bar'},number('textCursor.period','Step',1),
    {key:'textCursor.color',type:'color',timing:'Step',default:null}
  ].map(Object.freeze));
  const path=Object.freeze([
    number('strokeCompletion','Linear',100),number('strokeTrimStart','Linear'),number('pathStart','Linear'),number('smoothing','Step'),
    {key:'pathRevealEnabled',type:'boolean',timing:'Step',default:false},{key:'strokeReverse',type:'boolean',timing:'Step',default:false},
    {key:'fillReveal',type:'select',timing:'Step',default:'none'},{key:'polygonMode',type:'select',timing:'Step',default:'free'},number('sides','Step',4),number('radius','No'),
    ...['strokeCap','strokeJoin'].map(key=>({key,type:'select',timing:'Step'})),
    ...['strokeDash.enabled','strokeWave.enabled','strokeWave.fixEnds'].map(key=>({key,type:'boolean',timing:'Step'})),
    ...['strokeDash.length','strokeDash.gap','strokeDash.offset','strokeWave.amplitude','strokeWave.wavelength','strokeWave.phase','strokeWave.seed'].map(key=>number(key,'Step')),
    ...['strokeWave.type','strokeWave.interpolation'].map(key=>({key,type:'select',timing:'Step'})),{key:'strokeWave.digits',type:'text',timing:'Step'},
    ...['pathEndpoints.enabled','pathEndpoints.start','pathEndpoints.end'].map(key=>({key,type:'boolean',timing:'No'})),
    ...['pathEndpoints.type','pathEndpoints.sourceId'].map(key=>({key,type:'select',timing:'No'})),
    number('pathEndpoints.size','No'),number('pathEndpoints.width','No')
  ].map(Object.freeze));
  const part=Object.freeze(['x','y','w','h','x2','y2','scaleX','scaleY','rot','alpha'].map(key=>Object.freeze(number(key,'No',['w','h','scaleX','scaleY','alpha'].includes(key)?1:0))));
  const groups=Object.freeze({object,text,path,part});
  const rhythms=[['linear','均匀'],['smooth','柔和'],['ease-in','加速'],['ease-out','减速']];
  const n=(key,label,value,extra={})=>({key,label,value,type:'number',timing:'Step',step:1,...extra});
  const rhythm=value=>({key:'curve',label:'运动节奏',value,type:'select',timing:'Step',options:rhythms});
  const stepped=[{key:'stepped',label:'逐帧',value:false,type:'boolean',timing:'Step'},n('periodFrames','周期帧数',8,{min:1,integer:true,when:'stepped'})];
  const period=n('period','周期时间',2,{min:.05,step:.05});
  const motion=(id,name,params)=>({id,name,params:[...params,...stepped]});
  const motions={
    position:{name:'位置',motions:[motion('bob','漂浮',[n('amount','幅度',8,{min:0}),period,n('angle','方向',90,{step:5}),rhythm('smooth')]),motion('scroll','循环滚动',[n('speed','速度',20),n('span','循环距离',320,{min:0}),n('angle','方向',0,{step:5}),{key:'repeat',label:'重复',value:true,type:'boolean',timing:'Step'},rhythm('linear')])]},
    scale:{name:'比例',motions:[motion('pulse','呼吸缩放',[n('amount','幅度',.1,{min:0,max:2,step:.01}),period,rhythm('smooth')])]},
    rotation:{name:'旋转',motions:[motion('spin','持续旋转',[n('speed','角速度',30,{step:5}),rhythm('linear')]),motion('wave','摆动',[n('amount','幅度',12,{min:0}),period,rhythm('smooth')])]},
    alpha:{name:'透明度',motions:[motion('blink','闪烁',[n('amount','幅度',.5,{min:0,max:1,step:.05}),{...period,value:1},rhythm('smooth')])]}
  };
  function motionVisible(motion,param,values){if(param.when&&!values[param.when])return false;if(motion.id==='scroll'&&['curve','stepped','periodFrames'].includes(param.key))return values.repeat!==false&&+values.span>0&&+values.speed!==0;if(motion.id==='spin'&&['stepped','periodFrames'].includes(param.key))return +values.speed!==0;return true;}
  function parameter(domain,key,label){const value=typeof domain==='object'?domain.parameter:groups[domain]?.find(p=>p.key===key);if(!value)throw Error('成样参数未登记：'+domain+'.'+key);const timing=global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(value).timing;return{...value,key,timing,label:label||value.label||key};}
  const prefix=part=>part?'partsById.'+encodeURIComponent(part.id).replace(/\./g,'%2E')+'.':'';
  function binding(domain,key,part,label){return{param:parameter(domain,key,label),path:prefix(part)+key};}
  function group(domain,key){return domain==='path'&&key==='polygonMode'?['polygonMode','points']:[key];}
  function linearKeys(owner){
    owner=owner||{};
    const keys=object.filter(p=>p.timing==='Linear').map(p=>p.key);
    if(owner.type==='text')keys.push('textCompletion');
    for(const value of [owner,...owner.parts||[]])if(['stroke','rect','ellipse','poly','line'].includes(value.type)){
      const root=value===owner?'':prefix(value);keys.push(root+'strokeCompletion',root+'strokeTrimStart');if(['rect','ellipse','poly'].includes(value.type))keys.push(root+'pathStart');
    }
    return keys;
  }
  global.EditorClassicV4FormationParameters=Object.freeze({groups,motions,motionVisible,parameter,binding,linearKeys,group});
})(typeof window!=='undefined'?window:globalThis);
