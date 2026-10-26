/* One progressive stroke-style form shared by tools and object/part Inspector. */
(function(global){
  'use strict';
  const labels={strokeCap:'端点',strokeJoin:'转角',smoothing:'平滑度',pathRevealEnabled:'路径截取',strokeCompletion:'截取终点',strokeTrimStart:'截取起点',strokeReverse:'反向绘制',pathStart:'起点位置',fillReveal:'填充显现',polygonMode:'多边形类型',sides:'边数',radius:'圆角',
    'strokeWave.enabled':'路径波形','strokeWave.amplitude':'幅度','strokeWave.wavelength':'波长','strokeWave.phase':'起始相位','strokeWave.fixEnds':'固定端点',
    'strokeWave.type':'波形节奏','strokeWave.digits':'节奏字符串','strokeWave.interpolation':'连接方式','strokeWave.seed':'随机种子',
    'strokeDash.enabled':'虚线','strokeDash.length':'线段长度','strokeDash.gap':'间隔长度','strokeDash.offset':'起始偏移',
    'pathEndpoints.enabled':'端点样式','pathEndpoints.type':'端点类型','pathEndpoints.size':'大小','pathEndpoints.width':'宽度','pathEndpoints.sourceId':'引用对象','pathEndpoints.start':'起点','pathEndpoints.end':'终点'};
  function render(grid,value,options){
    options=options||{};const root=options.root||document,write=options.write,
      api=global.ToSampoolRuntimeVNext.modules.pathStroke,style=api.normalize(value),open=['line','stroke','pencil'].includes(value.type);
    const add=(key,type,current,extra)=>{
      const row=root.createElement('label'),label=root.createElement('span'),input=root.createElement(type==='select'?'select':'input');
      row.className='global-field';label.textContent=labels[key];input.dataset.strokeParam=key;
      if(type==='select'){for(const [id,name]of extra){const option=root.createElement('option');option.value=id;option.textContent=name;input.append(option);}input.value=current;}
      else{input.type=type;if(type==='checkbox')input.checked=!!current;else{input.value=String(key==='strokeCompletion'?Math.round(current*10)/10:current);Object.assign(input,extra||{});}}
      input.addEventListener('change',()=>{
        const draft=Object.assign({},value),next=type==='checkbox'?input.checked:type==='number'?+input.value:input.value;
        try{set(draft,key,next);input.setCustomValidity('');write(key,key.includes('.')?draft[key.split('.')[0]][key.split('.')[1]]:draft[key],labels[key]);}
        catch(error){input.setCustomValidity(error.message||String(error));input.reportValidity();}
      });
      row.append(label,input);grid.append(row);options.parameterTiming?.(input,key,labels[key]);return input;
    };
    if(value.type==='stroke'||value.type==='pencil'){
      add('smoothing','number',style.smoothing,{min:'0',max:'100',step:'1'});
    }
    if(value.type==='poly'){
      add('polygonMode','select',style.polygonMode,[['free','自由多边形'],['regular','正多边形']]);
      if(style.polygonMode==='regular'){add('sides','number',style.sides,{min:'3',max:'64',step:'1'});add('radius','number',style.radius,{min:'0',step:'1'});}
    }
    add('pathRevealEnabled','checkbox',style.pathRevealEnabled).title='关闭时完整显示路径，保留截取参数与时序';
    if(style.pathRevealEnabled){
    add('strokeTrimStart','number',style.strokeTrimStart,{min:'0',max:'100',step:'.1'}).title='0–100%；开放路径终点小于起点时为空，封闭路径跨过原点截取';
    add('strokeCompletion','number',style.strokeCompletion,{min:'0',max:'100',step:'.1'}).title='0–100%；按路径弧长截取，支持所属对象轨 Linear';
    const marker=style.pathEndpoints;
    add('pathEndpoints.enabled','checkbox',marker.enabled);
    if(marker.enabled){
      add('pathEndpoints.type','select',marker.type,[['circle','圆点'],['bar','垂直线'],['object','引用对象']]);
      if(marker.type==='circle')add('pathEndpoints.size','number',marker.size,{min:'0',step:'.5'}).title='圆点直径';
      if(marker.type==='bar')add('pathEndpoints.width','number',marker.width,{min:'0',step:'.5'}).title='沿路径法向的总长度；线粗沿用路径描线';
      if(marker.type==='object'){
        const choices=options.scene?global.ToSampoolRuntimeVNext.modules.pathInstances.choices(options.scene,options.ownerId):[],items=[['','请选择对象'],...choices.map(e=>[e.id,e.name||e.id])];
        if(marker.sourceId&&!choices.some(e=>e.id===marker.sourceId))items.push([marker.sourceId,'不可用来源 · '+marker.sourceId]);
        const select=add('pathEndpoints.sourceId','select',marker.sourceId,items);select.disabled=!options.scene;select.title='继承来源内容、动画与对象效果，沿路径切线朝向；混合由载体控制';
      }
      add('pathEndpoints.start','checkbox',marker.start);add('pathEndpoints.end','checkbox',marker.end);
    }
    add('strokeReverse','checkbox',style.strokeReverse);
    if(!open){add('pathStart','number',style.pathStart,{min:'0',max:'1',step:'.01'});if(value.type!=='poly'||style.polygonMode==='regular')add('fillReveal','select',style.fillReveal,[['none','保持完整'],['center','中心展开']]);}
    }
    if(options.strokeEnabled!==false){
    if(open||style.strokeDash.enabled)add('strokeCap','select',style.strokeCap,[['butt','平头'],['round','圆头'],['square','方头']]);
    if(!['line','ellipse'].includes(value.type))add('strokeJoin','select',style.strokeJoin,[['miter','尖角'],['round','圆角'],['bevel','斜角']]);
    add('strokeDash.enabled','checkbox',style.strokeDash.enabled);
    if(style.strokeDash.enabled){
      const length=add('strokeDash.length','number',style.strokeDash.length,{min:'.01',step:'.1'}),
        gap=add('strokeDash.gap','number',style.strokeDash.gap,{min:'0',step:'.1'});
      length.title=gap.title='线宽的倍数';
      add('strokeDash.offset','number',style.strokeDash.offset,{min:'0',max:'1',step:'.05'}).title='一个虚线周期中的起始偏移';
    }
    }
    if(!open||options.strokeEnabled!==false){
    add('strokeWave.enabled','checkbox',style.strokeWave.enabled);
    if(style.strokeWave.enabled){
      add('strokeWave.type','select',style.strokeWave.type,[['sine','正弦'],['triangle','三角'],['saw','锯齿'],['square','方波'],['digits','数字节奏'],['noise','平滑随机']]);
      if(style.strokeWave.type==='digits'){
        add('strokeWave.digits','text',style.strokeWave.digits,{maxLength:'256'}).title='一串数字为一个波长周期；1=-幅度，5=原路径，9=+幅度。最多128位，可用空格或逗号分隔';
        add('strokeWave.interpolation','select',style.strokeWave.interpolation,[['hold','阶梯'],['linear','直线'],['smooth','平滑']]);
      }
      if(style.strokeWave.type==='noise')add('strokeWave.seed','number',style.strokeWave.seed,{step:'1'});
      add('strokeWave.amplitude','number',style.strokeWave.amplitude,{min:'0',step:'.5'});
      add('strokeWave.wavelength','number',style.strokeWave.wavelength,{min:'.5',step:'1'}).title='封闭路径匹配整周期；极长路径或过小波长受8192段预算限制';
      add('strokeWave.phase','number',style.strokeWave.phase,{min:'0',max:'1',step:'.01'});if(open)add('strokeWave.fixEnds','checkbox',style.strokeWave.fixEnds);
    }
    }
    return grid;
  }
  function set(value,key,next){
    if(key==='polygonMode'&&next==='free'&&value.polygonMode==='regular')value.points=global.ToSampoolRuntimeVNext.modules.pathGeometry.regularPoints(value.sides);
    const api=global.ToSampoolRuntimeVNext.modules.pathStroke,draft=Object.assign({},value);
    if(key.startsWith('strokeDash.')||key.startsWith('strokeWave.')||key.startsWith('pathEndpoints.')){const [group,field]=key.split('.');draft[group]=Object.assign({},value[group],{[field]:next});}
    else draft[key]=next;
    const normalized=api.normalize(draft);
    if(key.startsWith('strokeDash.')||key.startsWith('strokeWave.')||key.startsWith('pathEndpoints.')){const group=key.split('.')[0];value[group]=normalized[group];}else value[key]=normalized[key];
    return value;
  }
  global.EditorClassicV4StrokeStyle=Object.freeze({render,set,labels});
})(typeof window!=='undefined'?window:globalThis);
