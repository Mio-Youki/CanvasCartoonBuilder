/* Shared progressive form. Always edits the source part's base configuration. */
(function(global){
  'use strict';
  function render(host,part,options){
    const root=options.root||document,api=global.ToSampoolRuntimeVNext.modules.pathExtensions,settings=api.normalize(part),write=options.write,
      registry=global.EditorV4PatternRegistry,attached=new Set(registry.attached(part));
    function field(grid,label,key,type,current,extra,parameter){
      const row=root.createElement('label'),name=root.createElement('span'),input=root.createElement(type==='select'?'select':'input');
      row.className='global-field';name.textContent=label;input.dataset.extensionParam=key;
      if(type==='select'){for(const [value,text]of extra){const option=root.createElement('option');option.value=value;option.textContent=text;input.append(option);}input.value=current;}
      else{input.type=type;if(type==='checkbox')input.checked=!!current;else input.value=current;Object.assign(input,extra||{});}
      input.addEventListener('change',()=>{
        try{
          if(type==='number'&&(input.value===''||!Number.isFinite(+input.value)||input.validity.rangeUnderflow||input.validity.rangeOverflow||input.validity.badInput)){input.reportValidity();return;}
          let value=parameter?global.EditorV4ParameterControls.read(input,parameter):type==='checkbox'?input.checked:type==='number'?+input.value:input.value;
          if(key==='elements.scale')value/=100;
          write(key,value,label,true);input.setCustomValidity('');
        }catch(error){input.setCustomValidity(error.message||String(error));input.reportValidity();}
      });
      input.addEventListener('input',()=>input.setCustomValidity(''));row.append(name,input);grid.append(row);return input;
    }
    function section(name,id){
      if(id&&options.scene){const resourceId=global.EditorV4Resources?.patternId(options.scene,{engineId:id});name=options.scene.patternResources?.[resourceId]?.name||name;}
      const wrap=root.createElement('section'),title=root.createElement('div'),grid=root.createElement('div');wrap.className='global-section';title.className='global-section-title';title.textContent=name;grid.className='global-grid';wrap.append(title,grid);
      if(!id||attached.has(id))host.append(wrap);
      if(id){wrap.dataset.attachedPattern=id;if(options.remove){const button=root.createElement('button');button.type='button';button.className='small';button.textContent='×';button.title='移除'+name;button.setAttribute('aria-label',button.title);button.dataset.removePattern=id;button.addEventListener('click',()=>options.remove(id));title.append(button);}}
      return grid;
    }
    function paint(grid,group,config){
      const row=root.createElement('div'),name=root.createElement('span');row.className='global-field wide';name.textContent=group==='nested'&&['stroke','bands'].includes(config.style)?'末层颜色':'颜色';row.append(name);
      const change=(color,alpha,final)=>write(group,Object.assign({},config,{color,alpha}),'颜色',final);
      change.finish=()=>options.finish?.();
      if(options.colorControl){for(const node of options.colorControl.controls({root,value:config.color,alpha:config.alpha,change,label:'拓展颜色',allowAlpha:true}))row.append(node);}
      else{const input=root.createElement('input'),alpha=root.createElement('input');input.type='color';input.value=config.color;input.addEventListener('change',()=>change(input.value,config.alpha,true));alpha.type='number';alpha.min=0;alpha.max=100;alpha.value=config.alpha*100;alpha.title='透明度';alpha.addEventListener('change',()=>change(config.color,Math.max(0,Math.min(1,+alpha.value/100)),true));row.append(input,alpha);}
      grid.append(row);
    }
    function renderCorner(config,intrinsic){
      const grid=section('角点箭头',intrinsic?null:'corner-arrows');
      if(!intrinsic)field(grid,'启用','corner-arrows.enabled','checkbox',config.enabled);
      if(!config.enabled)return;
      field(grid,'箭头大小','corner-arrows.size','number',config.size,{min:0,step:1});
      field(grid,'箭杆长度','corner-arrows.length','number',config.length,{min:0,step:1});
      field(grid,'缩进','corner-arrows.inset','number',config.inset,{step:1});
      field(grid,'方向','corner-arrows.direction','select',config.direction,[['out','向外'],['in','向内']]);
      field(grid,'箭杆角度','corner-arrows.shaftMode','select',config.shaftMode,[['center','几何中心'],['fixed','固定角度']]);
      if(config.shaftMode==='fixed')field(grid,'角度','corner-arrows.shaftAngle','number',config.shaftAngle,{step:1}).title='以水平轴为基准的倾角，按角点方向左右／上下镜像；0°水平、90°垂直，轴上角点沿轴线';
      field(grid,'箭杆端头','corner-arrows.shaftCap','select',config.shaftCap,[['butt','平头'],['round','圆头'],['point','尖头']]);
      field(grid,'圆角','corner-arrows.radius','number',config.radius,{min:0,step:.5});
      field(grid,'线宽','corner-arrows.width','number',config.width,{min:0,step:.5});paint(grid,'corner-arrows',config);
      if(!intrinsic){const status=global.ToSampoolRuntimeVNext.modules.customShapes.build(part,null,config).status;if(status){const note=root.createElement('div');note.className='inspector-note';note.setAttribute('role','status');note.textContent=status;grid.append(note);}}
    }
    function renderBrackets(config,intrinsic){
      const grid=section('括号／角标',intrinsic?null:'brackets');
      if(!intrinsic)field(grid,'启用','brackets.enabled','checkbox',config.enabled);
      if(!config.enabled)return;
      field(grid,'造型','brackets.shape','select',config.shape,[['square','直角'],['round','圆弧']]);
      field(grid,'布局','brackets.layout','select',config.layout,[['full','完整括号'],['corners','角标']]);
      if(config.layout==='full')field(grid,'侧别','brackets.side','select',config.side,[['both','左右成对'],['left','仅左'],['right','仅右']]);
      else field(grid,'角标位置','brackets.corners','select',config.corners,[['all','四角'],['tl-br','左上＋右下'],['bl-tr','左下＋右上'],['tl','左上'],['tr','右上'],['bl','左下'],['br','右下']]);
      field(grid,'横向长度','brackets.armX','number',config.armX,{min:0,step:1}).title='按路径中心线测量；框定范围不足时限幅，保留输入值';
      if(config.layout==='corners')field(grid,'纵向长度','brackets.armY','number',config.armY,{min:0,step:1}).title='按路径中心线测量';
      if(config.shape==='square')field(grid,'圆角','brackets.radius','number',config.radius,{min:0,step:.5});
      field(grid,'水平偏移','brackets.offsetX','number',config.offsetX,{step:1});
      field(grid,'垂直偏移','brackets.offsetY','number',config.offsetY,{step:1});
      field(grid,'粗细','brackets.width','number',config.width,{min:0,step:.5});paint(grid,'brackets',config);
      const status=global.ToSampoolRuntimeVNext.modules.bracketShapes.build(part,null,config).status;
      if(status){const note=root.createElement('div');note.className='inspector-note';note.setAttribute('role','status');note.textContent=status;grid.append(note);}
    }
    if(part.type==='custom'){
      if(part.recipe.definition){
        const recipe=global.ToSampoolRuntimeVNext.modules.patternProviders.normalizeRecipe(part.recipe),grid=section(recipe.definition.name);grid.dataset.patternProvider=recipe.id;
        const parameters=new Map(recipe.definition.parameters.map(p=>[p.key,p]));
        const controls=recipe.definition.controls||recipe.definition.parameters.map(p=>({component:'field',key:p.key}));
        for(const control of controls){
          const param=parameters.get(control.key);if(param.when&&!recipe.params[param.when])continue;
          if(control.component==='color-alpha'){
            const row=root.createElement('div'),name=root.createElement('span'),container=root.createElement('fieldset');row.className='global-field wide';name.textContent=param.label;container.style.cssText='border:0;padding:0;margin:0;min-width:0';container.dataset.generatorColor=param.key;row.append(name,container);grid.append(row);
            const change=(color,alpha,final)=>write('provider.$paint',{key:param.key,alphaKey:control.alphaKey,color,alpha},param.label,final);change.finish=()=>options.finish?.();
            for(const node of (options.colorControl||global.EditorClassicV4ColorControl).controls({root,value:recipe.params[param.key],alpha:recipe.params[control.alphaKey],change,label:param.label,allowAlpha:true}))container.append(node);
            options.parameterTiming?.(container,param);options.parameterTiming?.(container,parameters.get(control.alphaKey));
          }else{
            const input=field(grid,param.label,'provider.'+param.key,param.type==='boolean'?'checkbox':param.type==='select'?'select':'number',recipe.params[param.key],param.type==='select'?param.options.map((value,i)=>[value,param.labels?.[i]||value]):param.type==='number'?{min:param.min,max:param.max,step:param.step??(param.integer?1:.1)}:{});options.parameterTiming?.(input,param);
          }
        }
        return host;
      }
      const result=global.ToSampoolRuntimeVNext.modules.customShapes.custom(part);if(result.snapshot){const note=root.createElement('div');note.className='inspector-note';note.dataset.patternSnapshot='';note.setAttribute('role','status');note.textContent='图样生成器不可用，已保留外观；内部参数暂不可编辑。';host.append(note);return host;}const config=result.settings;if(part.recipe.id==='brackets')renderBrackets(config,true);else renderCorner(config,true);return host;
    }
    const add=root.createElement('button');add.type='button';add.className='small';add.dataset.addPattern='';add.textContent='＋ 添加图样';add.addEventListener('click',()=>options.add?.());host.append(add);
    if(!attached.size)return host;
    const common=section('拓展');field(common,'显示原图元','showSource','checkbox',settings.showSource).parentElement.classList.add('wide');
    for(const id of attached){
      const definition=global.ToSampoolRuntimeVNext.modules.pathGenerators?.definition(id),config=settings[id];if(!definition||!config)continue;
      const grid=section(definition.name,id),key=name=>'generator|'+id+'|'+name;grid.dataset.pathGenerator=id;
      field(grid,'启用',key('enabled'),'checkbox',config.enabled);if(!config.enabled)continue;
      const shared=global.EditorV4ParameterControls,model=shared.compile(config.definition);
      for(const binding of shared.plan(model,config.params,{exclude:['carrier']})){const param=binding.param,control={component:binding.component,alphaKey:binding.alpha?.key};
        if(control.component==='color-alpha'){
          const row=root.createElement('div'),name=root.createElement('span'),container=root.createElement('fieldset');row.className='global-field wide';row.dataset.generatorColor=param.key;name.textContent=param.label;container.style.cssText='border:0;padding:0;margin:0;min-width:0';row.append(name,container);
          let previousColor=config.params[param.key],previousAlpha=config.params[control.alphaKey];
          const change=(color,alpha,final)=>{const changedKeys=[];if(color!==previousColor)changedKeys.push(param.key);if(alpha!==previousAlpha)changedKeys.push(control.alphaKey);previousColor=color;previousAlpha=alpha;if(changedKeys.length)write(key('$paint'),{key:param.key,alphaKey:control.alphaKey,color,alpha,changedKeys},param.label,final);else if(final)options.finish?.();};change.finish=()=>options.finish?.();
          const nodes=(options.colorControl||global.EditorClassicV4ColorControl).controls({root,value:config.params[param.key],alpha:config.params[control.alphaKey],change,label:param.label,allowAlpha:true});for(const node of nodes)container.append(node);grid.append(row);
          const colorTiming=options.parameterTiming?.(container,param,{generatorId:id}),alphaTiming=options.parameterTiming?.(container,binding.alpha,{generatorId:id});
          for(const node of nodes)node.setEditable?.({color:!colorTiming?.readOnly,alpha:!alphaTiming?.readOnly});
        }else{
          const input=field(grid,param.label,key(param.key),param.type==='boolean'?'checkbox':param.type==='select'?'select':'number',config.params[param.key],param.type==='select'?param.options.map((value,i)=>[value,param.labels?.[i]||value]):{},param);
          if(param.type==='number')shared.configure(input,param,config.params[param.key]);
          options.parameterTiming?.(input,param,{generatorId:id});
        }
      }
    }
    if(attached.has('corner-arrows')&&global.ToSampoolRuntimeVNext.modules.customShapes.eligible(part))renderCorner(settings['corner-arrows'],false);
    if(attached.has('brackets')&&global.ToSampoolRuntimeVNext.modules.bracketShapes.eligible(part))renderBrackets(settings.brackets,false);
    const ticks=section('刻度排布','ticks'),t=settings.ticks;
    field(ticks,'启用','ticks.enabled','checkbox',t.enabled);
    if(t.enabled){
      field(ticks,'数量','ticks.count','number',t.count,{min:1,max:api.limits.ticks,step:1});
      field(ticks,'起始偏移','ticks.offset','number',t.offset,{min:0,max:1,step:.01});
      field(ticks,'刻度长度','ticks.length','number',t.length,{min:0,step:1});
      field(ticks,'起端位置','ticks.start','number',t.start,{step:.1});field(ticks,'末端位置','ticks.end','number',t.end,{step:.1});
      field(ticks,'线宽','ticks.width','number',t.width,{min:0,step:.5});paint(ticks,'ticks',t);
      field(ticks,'朝向','ticks.orientation','select',t.orientation,[['path','相对路径'],['fixed','固定方向']]);
      field(ticks,'角度偏移','ticks.angle','number',t.angle,{step:1});
      field(ticks,'主刻度','ticks.major.enabled','checkbox',t.major.enabled);
      if(t.major.enabled){field(ticks,'每隔几条','ticks.major.every','number',t.major.every,{min:1,max:api.limits.ticks,step:1});field(ticks,'长度倍率','ticks.major.length','number',t.major.length,{min:0,step:.1});field(ticks,'线宽倍率','ticks.major.width','number',t.major.width,{min:0,step:.1});}
      field(ticks,'节奏变化','ticks.variation.enabled','checkbox',t.variation.enabled);
      if(t.variation.enabled){const v=t.variation;
        field(ticks,'变化目标','ticks.variation.target','select',v.target,[['length','长度'],['angle','角度']]);
        field(ticks,'波形节奏','ticks.variation.type','select',v.type,[['sine','正弦'],['triangle','三角'],['saw','锯齿'],['square','方波'],['digits','数字节奏'],['noise','平滑随机']]);
        field(ticks,'周期数','ticks.variation.cycles','number',v.cycles,{min:0,step:.25}).title='沿完整路径的空间重复次数，不是周期时间';
        field(ticks,'幅度','ticks.variation.amplitude','number',v.amplitude,{step:.1});field(ticks,'起始相位','ticks.variation.phase','number',v.phase,{min:0,max:1,step:.01});
        if(v.type==='digits'){field(ticks,'节奏字符串','ticks.variation.digits','text',v.digits,{maxLength:256});field(ticks,'连接方式','ticks.variation.interpolation','select',v.interpolation,[['hold','阶梯'],['linear','直线'],['smooth','平滑']]);}
        if(v.type==='noise')field(ticks,'随机种子','ticks.variation.seed','number',v.seed,{step:1});
      }
    }
    const elements=section('元素排布','elements'),e=settings.elements,instances=global.ToSampoolRuntimeVNext.modules.pathInstances;
    field(elements,'启用','elements.enabled','checkbox',e.enabled);
    if(e.enabled){
      const choices=instances.choices(options.scene,options.ownerId),select=field(elements,'引用对象','elements.sourceId','select',e.sourceId,[['','请选择元素或组'],...choices.map(v=>[v.id,(v.type==='group'?'组 · ':'')+(v.name||v.id)])]);
      if(e.sourceId&&!choices.some(v=>v.id===e.sourceId)){const option=root.createElement('option');option.value=e.sourceId;option.textContent='不可用来源 · '+e.sourceId;option.disabled=true;select.append(option);select.value=e.sourceId;}
      field(elements,'数量','elements.count','number',e.count,{min:1,max:api.limits.instances,step:1});
      field(elements,'起始偏移','elements.offset','number',e.offset,{min:0,max:1,step:.01});
      field(elements,'比例','elements.scale','number',e.scale*100,{min:.1,step:1}).title='百分比，100为原尺寸';
      field(elements,'朝向','elements.orientation','select',e.orientation,[['path','相对路径'],['fixed','固定方向']]);
      field(elements,'角度偏移','elements.angle','number',e.angle,{step:1});
      field(elements,'沿线偏移','elements.along','number',e.along,{step:1});field(elements,'法向偏移','elements.normal','number',e.normal,{step:1});
      field(elements,'保留源对象','elements.keepSource','checkbox',e.keepSource);
      const valid=instances.canReference(options.scene,options.ownerId,e.sourceId),frame=global.ToSampoolRuntimeVNext.modules.frame.create(options.scene,options.time||0),plan=valid.ok?instances.plan(options.scene,frame,options.ownerId,e.sourceId):valid;
      const status=!valid.ok?valid.reason:plan.status|| (plan.hidden?'来源当前处于隐藏时段':'');
      if(status){const note=root.createElement('div');note.className='inspector-note';note.dataset.instanceStatus='';note.textContent=status;elements.append(note);}
      if(options.editSample){const button=root.createElement('button');button.type='button';button.className='small'+(options.editing?' active':'');button.dataset.instanceEdit='';button.textContent=options.editing?'结束样本编辑':'编辑样本';button.disabled=!valid.ok||!!plan.status||plan.hidden;button.addEventListener('click',()=>options.editSample());elements.append(button);}
    }
    if(api.eligible(part)){
      const nested=section('轮廓嵌套','nested'),n=settings.nested;field(nested,'启用','nested.enabled','checkbox',n.enabled);
      if(n.enabled){
        field(nested,'生成方式','nested.method','select',n.method,[['scale','中心缩放'],['offset','等距轮廓']]);
        field(nested,'层数','nested.count','number',n.count,{min:1,max:api.limits.layers,step:1});
        field(nested,'方向','nested.direction','select',n.direction,[['in','向内'],['out','向外']]);
        if(n.method==='scale')field(nested,'缩放步差','nested.scaleStep','number',n.scaleStep,{min:.0001,step:.01});else field(nested,'轮廓间距','nested.spacing','number',n.spacing,{min:.001,step:1});
        field(nested,'旋转步差','nested.rotation','number',n.rotation,{step:1});
        field(nested,'外观','nested.style','select',n.style,[['stroke','描线'],['fill','实心填充'],['bands','层间色带']]);paint(nested,'nested',n);
        if(n.style==='stroke')field(nested,'末层宽度','nested.width','number',n.width,{min:0,step:.5}).title='从基准图元描线宽度插值到实际生成的最后一层';
        const reveal=global.ToSampoolRuntimeVNext.modules.pathStroke.normalize(part).pathRevealEnabled;
        if(n.style==='stroke'&&(part.strokeDash?.enabled||reveal)||n.style!=='stroke'&&reveal&&part.fillReveal==='center')field(nested,'逐层起点偏移','nested.pathStep','number',n.pathStep,{step:.01}).title='每层相对上一层偏移的完整路径比例';
        const status=api.build(part,global.ToSampoolRuntimeVNext.modules.pathGeometry.full(part)).status;
        if(status){const note=root.createElement('div');note.className='inspector-note';note.dataset.extensionStatus='';note.textContent=status;nested.append(note);}
      }
    }
    return host;
  }
  function set(part,key,value){
    if(key.startsWith('generator|')){
      const [,id,name]=key.split('|'),api=global.ToSampoolRuntimeVNext.modules,settings=api.pathExtensions.normalize(part),config=settings[id];if(!config)throw Error('图样未附着到此图元');
      if(name==='enabled')config.enabled=!!value;
      else if(name==='$paint'){const binding=config.definition.controls.find(c=>c.component==='color-alpha'&&c.key===value.key&&c.alphaKey===value.alphaKey);if(!binding)throw Error('图样颜色绑定无效');config.params[binding.key]=value.color;config.params[binding.alphaKey]=value.alpha;}
      else{if(!config.definition.parameters.some(p=>p.key===name&&p.key!=='carrier'))throw Error('图样参数未声明');config.params[name]=value;}
      settings[id]=api.pathGenerators.normalize(id,config,part);return global.EditorV4PatternRegistry.commit(part,settings,id);
    }
    if(part.type==='custom'){
      if(!global.ToSampoolRuntimeVNext.modules.customShapes.supports(part.recipe))throw Error('缓存图样内部参数已锁定，请恢复对应生成器');
      if(part.recipe.definition){
        const provider=global.ToSampoolRuntimeVNext.modules.patternProviders,recipe=provider.normalizeRecipe(part.recipe),name=key.startsWith('provider.')?key.slice(9):null;
        if(!recipe.definition.parameters.some(p=>p.key===name))throw Error('模板参数未声明');
        part.recipe=provider.normalizeRecipe({...recipe,params:{...recipe.params,[name]:value}});return part.recipe;
      }
      const api=global.ToSampoolRuntimeVNext.modules.customShapes,config={...api.custom(part).settings};
      if(key===part.recipe.id)Object.assign(config,value);else{const [group,field]=key.split('.');if(group!==part.recipe.id)throw Error('自定义图样不支持此参数');config[field]=value;}
      const c=part.recipe.id==='brackets'?api.normalizeBrackets(config,part):api.normalize(config,part);part.recipe=api.normalizeRecipe({id:part.recipe.id,version:part.recipe.version,params:c});part.stroke=c.color;part.strokeWidth=c.width;part.strokeAlpha=c.alpha;return part.recipe;
    }
    const api=global.ToSampoolRuntimeVNext.modules.pathExtensions,draft=JSON.parse(JSON.stringify(api.normalize(part))),keys=key.split('.');
    let target=draft;for(const name of keys.slice(0,-1))target=target[name];target[keys.at(-1)]=value;
    return global.EditorV4PatternRegistry.commit(part,api.normalize(Object.assign({},part,{extensions:draft})),keys[0]);
  }
  global.EditorClassicV4PathExtensions=Object.freeze({render,set});
})(typeof window!=='undefined'?window:globalThis);
