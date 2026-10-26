/* Shared parameter semantics, not a page layout or an effect implementation. */
(function(global){
  'use strict';
  const VERSION=1;
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  function compile(definition){
    const parameters=JSON.parse(JSON.stringify(definition.parameters||[])),byKey=new Map(),used=new Set();
    for(const param of parameters){
      if(!param.key||byKey.has(param.key))throw Error('参数ID缺失或重复');
      if(!['number','color','boolean','select'].includes(param.type))throw Error('未支持的参数组件：'+param.type);
      global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(param);
      byKey.set(param.key,param);
    }
    for(const param of parameters)if(param.when){
      if(byKey.get(param.when)?.type!=='boolean')throw Error('渐进条件必须引用开关');
      const visited=new Set([param.key]);let current=param;
      while(current.when){if(visited.has(current.when))throw Error('渐进条件不能循环');visited.add(current.when);current=byKey.get(current.when);}
    }
    const controls=definition.controls||parameters.map(param=>({component:'field',key:param.key}));
    const bindings=controls.map(control=>{
      const param=byKey.get(control.key);if(!param)throw Error('控件引用未知参数');
      if(!['field','color-alpha'].includes(control.component))throw Error('未支持的控件绑定：'+control.component);
      const keys=[param.key];let alpha=null;
      if(control.component==='color-alpha'){
        alpha=byKey.get(control.alphaKey);
        if(param.type!=='color'||alpha?.type!=='number'||alpha.min!==0||alpha.max!==1||alpha.when!==param.when)throw Error('颜色透明度绑定无效');
        keys.push(alpha.key);
      }
      for(const key of keys){if(used.has(key))throw Error('参数不能重复生成控件');used.add(key);}
      return {component:control.component,param,alpha,keys};
    });
    if(used.size!==parameters.length)throw Error('存在未绑定的参数');
    return freeze({version:VERSION,parameters,bindings});
  }
  function visible(param,values,parameters){
    let current=param;
    while(current.when){if(!values[current.when])return false;current=parameters.find(p=>p.key===current.when);}
    return true;
  }
  function plan(model,values,options={}){
    const excluded=new Set(options.exclude||[]);
    return model.bindings.filter(binding=>!binding.keys.some(key=>excluded.has(key))&&visible(binding.param,values,model.parameters));
  }
  function display(param,value){return param.type==='number'?String(Math.round(value*(param.percent?100:1)*10000)/10000):String(value);}
  function configure(input,param,value){
    if(param.type==='select'){
      for(const [i,value]of param.options.entries()){const option=input.ownerDocument.createElement('option');option.value=value;option.textContent=param.labels?.[i]||value;input.append(option);}
      input.value=value;
    }else if(param.type==='boolean'){input.type='checkbox';input.checked=!!value;}
    else if(param.type==='color'){input.type='color';input.value=value;}
    else{
      input.type='number';const scale=param.percent?100:1;
      for(const key of ['min','max'])if(param[key]!=null)input[key]=String(param[key]*scale);
      input.step=String((param.step??(param.integer?1:.1))*scale);input.value=display(param,value);
    }
    return input;
  }
  function read(input,param){
    if(param.type==='boolean')return input.checked;
    if(param.type!=='number'){
      if(param.type==='select'&&!param.options.includes(input.value))throw Error('参数选项无效');
      return input.value;
    }
    const value=+input.value/(param.percent?100:1);
    if(input.value===''||!Number.isFinite(value)||!input.validity.valid||value<param.min||value>param.max||param.integer&&!Number.isInteger(value))throw Error('参数数值无效');
    return value;
  }
  function timingState(param,context={}){
    const capability=global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(param);
    const active=!!context.active,kind=capability.timing==='Linear'?'linear':'step',state=context.partial?'partial':active?(context.has?'set':'armed'):context.other?'elsewhere':'off';
    return Object.freeze({...capability,active,kind,state,editable:context.editable??!context.readOnly,disabled:capability.timing==='No'||!!context.readOnly,title:context.title||capability.timing});
  }
  function timingTarget(param,context={}){
    const capability=global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(param),has=Object.hasOwn(context.segment?.values||{},context.path),active=capability.timing!=='No'&&(has||!!context.armed),timed=capability.timing!=='No'&&(active||!!context.wholeSegment);
    return Object.freeze({...capability,has,active,target:timed?'segment':'base',readOnly:capability.timing!=='No'&&context.segment?.type==='linear'});
  }
  function glyph(button,kind){button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="'+(kind==='linear'?'M3 17L17 3':'M3 17H7V10H13V3H17')+'" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="3" cy="17" r="1.8" fill="currentColor"/><circle cx="17" cy="3" r="1.8" fill="currentColor"/></svg>';}
  function timingButton({root,param,read,change,className='parameter-clock'}){
    const button=root.createElement('button');button.type='button';button.dataset.parameterKey=param.key;
    button.refresh=()=>{const state=timingState(param,read());button.timingView=state;button.className=className+' v4-parameter-clock'+(state.active?' active':'');glyph(button,state.kind);button.dataset.timingState=state.state;button.dataset.timingKind=state.kind;button.disabled=state.disabled;button.title=param.label+' · '+state.title+' · '+({off:'未设置',armed:'待写入当前段',set:'当前段已设置',partial:'部分参数已设置',elsewhere:'其他时段已设置'}[state.state]);button.setAttribute('aria-label',param.label+'时序');button.setAttribute('aria-pressed',state.state==='partial'?'mixed':String(state.active));};
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const state=timingState(param,read());if(state.disabled)return;change(!state.active,event);button.refresh();});
    button.refresh();return button;
  }
  function placeTiming(control,button){
    const row=control.closest('.v4-pattern-parameter,.global-field,.review-field');if(!row)return;
    row.classList.add('v4-timed-field');
    const color=control.classList.contains('color-field')?control:control.querySelector?.('.color-field');
    if(!color?.setTiming){row.append(button);return;}
    const clocks=color.parameterClocks||(color.parameterClocks=[]);clocks.push(button);
    if(!color.parameterClock){
      const group=control.ownerDocument.createElement('button');group.type='button';group.className='v4-parameter-clock';group.dataset.colorTiming='';
      group.refresh=()=>{
        for(const clock of clocks)clock.refresh();
        const states=clocks.map(c=>c.timingView),count=states.filter(s=>s.active).length,partial=count>0&&count<states.length,mixedKind=states.some(s=>s.kind!==states[0].kind);
        const state=partial?'partial':count?(states.some(s=>s.state==='armed')?'armed':'set'):states.some(s=>s.state==='elsewhere')?'elsewhere':'off';
        group.dataset.timingState=state;group.dataset.timingKind=mixedKind?'mixed':states[0].kind;
        if(partial||mixedKind)group.textContent=partial?'◐':'◇';else glyph(group,states[0].kind);
        group.disabled=states.every(s=>s.disabled);group.setAttribute('aria-pressed',partial?'mixed':String(count>0));group.setAttribute('aria-label','颜色与透明度时序');
        group.title='颜色与透明度时序 · '+({off:'未设置',armed:'待写入当前段',set:'当前段已设置',partial:'部分参数已设置',elsewhere:'其他时段已设置'}[state]);
      };
      group.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();group.refresh();const all=clocks.every(c=>c.timingView.active),apply=()=>{for(const clock of clocks){clock.refresh();if(!clock.disabled&&clock.timingView.active===all)clock.click();}};if(color.runTimingBatch)color.runTimingBatch(apply);else apply();group.refresh();});
      color.parameterClock=group;row.append(group);
    }
    color.setTiming(clocks);color.parameterClock.refresh();
  }
  global.EditorV4ParameterControls=Object.freeze({VERSION,compile,plan,configure,read,display,timingState,timingTarget,timingButton,placeTiming});
})(typeof window!=='undefined'?window:globalThis);
