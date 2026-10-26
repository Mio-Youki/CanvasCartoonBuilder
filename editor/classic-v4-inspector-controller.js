/* Classic Shell Inspector projection for the active v4 Workspace. */
(function (global) {
  'use strict';

  function finite(value,fallback){value=+value;return Number.isFinite(value)?value:fallback;}
  function create(options){
    options=options||{};
    const workspace=options.workspace,view=options.view,changes=options.changes,fonts=options.fonts||null,timeline=options.timeline||null,maskEditor=options.maskEditor||null,transformController=options.transformController||null,externalPanel=options.externalPanel||null,importMaskAsset=options.importMaskAsset||null,timelineState=global.EditorVNextTimelineState,effectState=global.EditorVNextEffectState,maskState=global.EditorVNextMaskState,particleState=global.EditorVNextParticleState,inspectorModel=global.EditorVNextInspectorModel,registry=global.EditorEffectRegistryVNext,time=options.time||(()=>0),root=options.root||document,partsState=global.EditorVNextPartsState;
    if(!workspace||!view||!changes)throw new Error('Classic v4 Inspector requires Workspace, View and SceneMutation');
    const host=root.getElementById('inspector-context'),globalTabs=root.getElementById('global-inspector-tabs'),elementTabs=root.getElementById('element-inspector-tabs'),title=root.getElementById('props-title'),legacyForm=root.getElementById('cfgform'),legacyTools=root.querySelector('.props-tools'),timing=root.getElementById('btn-timing-mode');
    const blendChoices=(current)=>{const choices=(registry.blendOptions||['normal']).map(value=>({value,label:registry.blendLabels&&registry.blendLabels[value]||value}));if(current==='lighter')choices.push({value:'lighter',label:'加亮（旧项目）'});return choices;};
    if(!host||!globalTabs||!elementTabs)throw new Error('Classic v4 Inspector cannot find the Classic Shell Inspector');
    let stopped=false,sceneTab='props',objectTab='props',formationPage='basic',selectedMotion='bob',timingArmed=null,effectFocus=null,controllerFocus=null;
    function ensureInlineTextureStyles(){if(root.getElementById('v4-inline-texture-style'))return;const style=root.createElement('style');style.id='v4-inline-texture-style';style.textContent='.v4-inline-texture{grid-column:1 / -1;display:grid;grid-template-columns:78px minmax(0,1fr);gap:6px 8px;width:100%;margin:6px 0 2px;padding:7px;border:1px solid #39424f;border-radius:6px;background:#151920}.v4-inline-texture-head{align-self:center;color:var(--dim);font-size:10px}.v4-inline-texture-preview{width:100%;height:42px;border:1px solid var(--line);background:#0e1218;image-rendering:pixelated}.v4-inline-texture-grid{grid-column:1 / -1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.v4-inline-texture-grid label{display:grid;grid-template-columns:1fr;gap:2px;color:var(--dim);font-size:9px}.v4-inline-texture-grid input,.v4-inline-texture-grid select{min-width:0;height:23px;padding:2px 4px;border:1px solid var(--line);background:#11161e;color:var(--ink);font:inherit}.v4-inline-texture-motion{grid-column:1 / -1;display:flex!important;align-items:center;justify-content:space-between;color:var(--dim);font-size:10px;border-top:1px solid #2b3440;padding-top:6px}.v4-inline-texture-motion input{width:auto}.v4-inline-texture>.small{grid-column:1 / -1;justify-self:start}';(root.head||root.documentElement).append(style);}
    ensureInlineTextureStyles();
    const motionExpanded=new Set(),extensionParameterArmed=new Set(),effectParameterArmed=new Set();
    let parameterTimingBatch=false;
    function runParameterTiming(label,operation){return parameterTimingBatch?workspace.mutate(operation):changes.run(label,operation);}
    function configureColorTimingBatch(control){const color=control.classList.contains('color-field')?control:control.querySelector?.('.color-field');if(!color)return;color.runTimingBatch=action=>{const token=changes.begin('设置颜色与透明度时序');parameterTimingBatch=true;try{action();changes.commit(token);}catch(error){changes.cancel(token);throw error;}finally{parameterTimingBatch=false;}};}
    function syncTimingPaint(control,values){
      const color=control.classList.contains('color-field')?control:control.querySelector?.('.color-field');if(!color||!values)return;
      const key=channel=>color.parameterClocks?.find(clock=>clock.dataset.colorTimingChannel===channel)?.dataset.parameterKey;
      if(key('color'))color.setPaint(values[key('color')],key('alpha')?values[key('alpha')]:1,null);
    }
    const extensionArmKey=(ownerId,path,index)=>JSON.stringify([scene()._moduleScope||'',ownerId,index,path]);
    const effectArmKey=(track,key,index)=>JSON.stringify([scene()._moduleScope||'',track,index,key]);
    let extensionFocus=null,extensionColorToken=null;
    const instanceEditor=global.EditorClassicV4PathInstanceEditor?.create({workspace,view,changes,root,time,onChange:()=>render(),onProjectChange:()=>{extensionFocus=null;}});
    function finishExtensionColor(){if(extensionColorToken){changes.commit(extensionColorToken);extensionColorToken=null;}}
    function configureTabs(){
      const sceneProps=globalTabs.querySelector('[data-global-inspector="props"]'),sceneEffects=globalTabs.querySelector('[data-global-inspector="fx"],[data-global-inspector="overlay"]');
      if(sceneProps)sceneProps.textContent='成样';
      if(sceneEffects){sceneEffects.dataset.globalInspector='overlay';sceneEffects.textContent='叠加滤镜';}
      let sceneSampling=globalTabs.querySelector('[data-global-inspector="sampling"]');
      if(!sceneSampling){sceneSampling=root.createElement('button');sceneSampling.type='button';sceneSampling.dataset.globalInspector='sampling';globalTabs.append(sceneSampling);}
      sceneSampling.textContent='采样滤镜';
      if(!elementTabs.querySelector('[data-element-inspector="extensions"]')){const button=root.createElement('button');button.type='button';button.dataset.elementInspector='extensions';button.textContent='拓展';elementTabs.append(button);}
      const labels={props:'成样',fx:'加样',sampling:'采样'};
      for(const button of elementTabs.querySelectorAll('[data-element-inspector]')){
        const key=button.dataset.elementInspector;
        if(labels[key])button.textContent=labels[key];
        button.style.display=labels[key]?'':'none';
      }
    }
    configureTabs();
    const scene=()=>workspace.requireDocument(),entity=id=>(scene().entities||[]).find(item=>item&&item.id===id)||null;
    const colorControl=global.EditorClassicV4ColorControl||null;
    function section(name,note){const wrap=root.createElement('section');wrap.className='global-section';const heading=root.createElement('div');heading.className='global-section-title';heading.textContent=name;wrap.append(heading);if(note){const hint=root.createElement('div');hint.className='global-note';hint.textContent=note;wrap.append(hint);}const grid=root.createElement('div');grid.className='global-grid';wrap.append(grid);return{wrap,grid,heading};}
    function field(grid,label,control,wide){const group=control.getAttribute('role')==='group',row=root.createElement(group?'div':'label');row.className='global-field'+(wide||group?' wide':'')+(group?' v4-group-field':'');const text=root.createElement('span');text.textContent=label;row.append(text,control);grid.append(row);return control;}
    function transform(){return typeof transformController==='function'?transformController():transformController;}
    function pivotControl(grid,item){const button=root.createElement('button'),controller=transform();button.type='button';button.className='small';button.textContent=controller&&controller.pivotEditing?'取消设置':'设置中心';button.title='点击后在画布指定旋转中心；Canvas 控件右键可复位';button.addEventListener('click',event=>{event.preventDefault();const current=transform();if(!current||typeof current.setPivotMode!=='function')return;current.setPivotMode(!current.pivotEditing);render();});return field(grid,'旋转中心',button);}
    function displayLabel(label){return label==='溶解颗粒'?'颗粒尺寸':label;}
    function number(grid,label,value,write,opts){opts=opts||{};const raw=opts.pixel&&Number.isFinite(+value)?Math.round(+value):value,shown=opts.decimals!=null&&Number.isFinite(+raw)?(+raw).toFixed(opts.decimals):raw,input=root.createElement('input');input.type='number';input.value=Number.isFinite(+shown)?String(shown):String(opts.fallback??0);if(opts.step!=null)input.step=opts.step;if(opts.min!=null)input.min=opts.min;if(opts.max!=null)input.max=opts.max;input.addEventListener('change',()=>{let next=finite(input.value,finite(value,0));if(opts.pixel)next=Math.round(next);if(opts.decimals!=null){const factor=10**opts.decimals;next=Math.round(next*factor)/factor;input.value=next.toFixed(opts.decimals);}if(opts.min!=null)next=Math.max(+opts.min,next);if(opts.max!=null)next=Math.min(+opts.max,next);write(next);});return field(grid,displayLabel(label),input,opts.wide);}
    function textField(grid,label,value,write,wide){const input=wide?root.createElement('textarea'):root.createElement('input');input.value=value==null?'':String(value);if(wide)input.rows=3;input.addEventListener('change',()=>write(input.value));return field(grid,label,input,wide);}
    function color(grid,label,value,write){
      if(typeof global.colorField==='function'){
        let token=null;
        const finish=()=>{if(!token)return;changes.commit(token);token=null;};
        const change=(nextColor,unused,final)=>{if(!token)token=changes.begin('设置'+label);write(nextColor);if(final)finish();};
        change.finish=finish;
        return field(grid,label,(colorControl?colorControl.controls({root,value,alpha:1,change,label,allowAlpha:false}):[global.colorField(value,1,change,label,{alpha:false})])[0]);
      }
      const input=root.createElement('input');input.type='color';input.value=/^#[0-9a-f]{6}$/i.test(value||'')?value:'#ffffff';input.addEventListener('input',()=>write(input.value));return field(grid,label,input);
    }
    function select(grid,label,value,choices,write,wide){const input=root.createElement('select');for(const choice of choices){const option=root.createElement('option');option.value=choice.value;option.textContent=choice.label;input.append(option);}input.value=value;input.addEventListener('change',()=>write(input.value));return field(grid,label,input,wide);}
    function disclosure(control,key,label,active){const row=control&&control.parentElement;if(!row)return control;const body=root.createElement('span'),button=root.createElement('button');body.className='v4-control-disclosure';button.type='button';button.className='v4-motion-button'+(active?' active':'');button.textContent=motionExpanded.has(key)?'动态 ▾':'动态 ▸';button.title=(active?'已启用动态；':'')+'展开'+label+'动态';row.replaceChild(body,control);body.append(control,button);button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();motionExpanded.has(key)?motionExpanded.delete(key):motionExpanded.add(key);render();});return control;}
    function paintRow(grid,label,enabled,onToggle,controls,detail){const row=root.createElement('div');row.className='global-field wide v4-paint-field';const name=root.createElement('span');name.textContent=label;const body=root.createElement('span');body.className='v4-paint-row';const toggle=root.createElement('input');toggle.type='checkbox';toggle.checked=!!enabled;toggle.title=enabled?'关闭'+label:'启用'+label;toggle.addEventListener('change',()=>onToggle(toggle.checked));body.append(toggle);for(const control of controls||[])body.append(control);row.append(name,body);if(detail)row.append(detail);grid.append(row);return row;}
    function paintColor(value,write,alpha,writeAlpha){const colorInput=root.createElement('input');colorInput.type='color';colorInput.value=/^#[0-9a-f]{6}$/i.test(value||'')?value:'#ffffff';colorInput.title='颜色';colorInput.addEventListener('input',()=>write(colorInput.value));const alphaInput=root.createElement('input');alphaInput.type='number';alphaInput.min='0';alphaInput.max='100';alphaInput.step='1';alphaInput.value=String(Math.round(Math.max(0,Math.min(1,finite(alpha,1)))*100));alphaInput.title='颜色透明度 (%)';alphaInput.addEventListener('change',()=>writeAlpha(Math.max(0,Math.min(100,finite(alphaInput.value,100)))/100));return[colorInput,alphaInput];}
    function partColor(ownerId,partId,label,value,alpha,apply){if(typeof global.colorField!=='function'&&!colorControl){let currentColor=value,currentAlpha=finite(alpha,1);return paintColor(currentColor,next=>{currentColor=next;mutatePart('设置图元'+label,ownerId,partId,target=>apply(target,currentColor,currentAlpha));},currentAlpha,next=>{currentAlpha=next;mutatePart('设置图元'+label+'透明度',ownerId,partId,target=>apply(target,currentColor,currentAlpha));});}let token=null;const finish=()=>{if(!token)return;changes.commit(token);token=null;},change=(nextColor,nextAlpha,final)=>{if(!token)token=changes.begin('设置图元'+label);workspace.mutate(scene=>{const owner=(scene.entities||[]).find(item=>item.id===ownerId),part=owner&&(owner.parts||[]).find(item=>item.id===partId);if(part)apply(part,nextColor,nextAlpha);});if(final)finish();};change.finish=finish;return colorControl?colorControl.controls({root,value,alpha,change,label}):[global.colorField(value,alpha,change,label)];}
    function gradientControl(value,alpha,paint,label,write){
      if(typeof global.paintField!=='function'){const change=(color,opacity)=>changes.run('设置'+label,document=>write(color,opacity,null,document));return colorControl?colorControl.controls({root,value,alpha,change,label}):paintColor(value,color=>change(color,alpha),alpha,opacity=>change(value,opacity));}
      let token=null;const finish=()=>{if(token){changes.commit(token);token=null;}},change=(color,opacity,gradient,final)=>{if(!token)token=changes.begin('设置'+label);workspace.mutate(document=>write(color,opacity,gradient,document));if(final)finish();};change.finish=finish;
      return[global.paintField(value,alpha,paint,change,label)];
    }
    function partPaint(ownerId,partId,value,alpha,paint){return gradientControl(value,alpha,paint,'图元填充',(color,opacity,gradient,document)=>{const owner=(document.entities||[]).find(item=>item.id===ownerId),part=owner&&(owner.parts||[]).find(item=>item.id===partId);if(part){part.fill=color;part.fillAlpha=opacity;part.fillPaint=gradient;}});}
    function entityPaint(ownerId,value,alpha,paint){return gradientControl(value,alpha,paint,'对象填充',(color,opacity,gradient,document)=>{const target=(document.entities||[]).find(item=>item.id===ownerId);if(target){target.fill=color;target.fillAlpha=opacity;target.fillPaint=gradient;}});}
    function textPaint(ownerId,value,alpha,paint){return gradientControl(value,alpha,paint,'文字填充',(color,opacity,gradient,document)=>global.EditorVNextTextState.update(document,ownerId,{fill:color,fillAlpha:opacity,fillPaint:gradient},root));}
    function scenePaint(value,alpha,paint){return gradientControl(value,alpha,paint,'场景填充',(color,opacity,gradient,document)=>{const context=sceneBackgroundContext(document,false),target=timelineState.sceneSegments(document,true)[context.current.index];target.background=Object.assign({},sceneBackgroundBase(document,context),{color,alpha:opacity,fillPaint:gradient});});}
    function textureStyle(pattern){if(pattern.type!=='lines')return pattern.type==='checker'?'dots':pattern.type;const layers=pattern.layers||[];if(pattern.lineMode==='layers')return'layers';if(pattern.lineMode==='grid'||(layers.length===2&&Math.abs(Math.abs(finite(layers[1].angle,0)-finite(layers[0].angle,0))-90)<.01))return'grid';return layers.length>1?'layers':'line';}
    function patternMotionDefaults(type){const definition=registry.motionById&&registry.motionById[type],result={enabled:true,type};for(const param of definition&&definition.params||[])result[param.key]=param.default;return result;}
    function inlineTextureEditor(pattern,color,write,adapters={}){
      if(global.EditorClassicV4PatternField&&typeof global.EditorClassicV4PatternField.render==='function')return global.EditorClassicV4PatternField.render({root,partsState,pattern,color,write,onReflow:render,...adapters});
      const draft=partsState.normalizeTexture(pattern,color),panel=root.createElement('div'),head=root.createElement('div'),preview=root.createElement('canvas'),fields=root.createElement('div');delete draft.motion;if(draft.type==='checker'){draft.type='dots';draft.layout='regular';draft.phase=0;draft.sides=4;draft.roundness=0;}panel.className='v4-inline-texture';head.className='v4-inline-texture-head';head.textContent='图案';preview.className='v4-inline-texture-preview';fields.className='v4-inline-texture-grid';panel.append(head,preview,fields);
      const redraw=()=>{const ctx=preview.getContext&&preview.getContext('2d'),runtime=global.ToSampoolRuntimeVNext;if(ctx&&runtime&&runtime.modules&&runtime.modules.pattern){preview.width=120;preview.height=42;ctx.clearRect(0,0,120,42);ctx.fillStyle='#11151c';ctx.fillRect(0,0,120,42);runtime.modules.pattern.paint(ctx,120,42,draft,draft.color||color);return;}if(typeof global.drawTexturePreview==='function')global.drawTexturePreview(preview,draft,draft.color||color);};
      const commit=(label,operation,reflow)=>{operation(draft);write(label,partsState.normalizeTexture(draft,color));redraw();if(reflow)render();};
      const add=(label,value,operation)=>{const field=root.createElement('label'),caption=root.createElement('span'),input=root.createElement(value&&value.select?'select':'input');caption.textContent=label;if(value&&value.select)(value.options||[]).forEach(option=>input.append(new Option(option.label,option.value)));else{input.type='number';if(value&&value.min!=null)input.min=String(value.min);if(value&&value.max!=null)input.max=String(value.max);input.step=String(value&&value.step!=null?value.step:1);}input.value=String(value&&value.value!=null?value.value:'');input.addEventListener('change',()=>operation(input.value));field.append(caption,input);fields.append(field);return input;};
      const style=textureStyle(draft);
      add('类型',{select:true,value:style,options:[{value:'line',label:'单线'},{value:'grid',label:'网格'},{value:'layers',label:'叠线'},{value:'dots',label:'点阵'},...(style==='noise'?[{value:'noise',label:'屏幕噪点（旧项目）'}]:[])]},value=>commit('设置纹理类型',next=>{const angle=next.layers&&next.layers[0]?next.layers[0].angle:45,first=next.layers&&next.layers[0]||{width:1,spacing:4};if(value==='dots'||value==='noise'){const replacement=partsState.defaultTexture(value,next.color||color);Object.keys(next).forEach(key=>delete next[key]);Object.assign(next,replacement);return;}const spacing=Math.max(+first.width||1,+first.spacing||((+first.width||1)+(+first.gap||0)));next.type='lines';next.lineMode=value;next.layers=value==='grid'?[{angle,width:first.width,spacing},{angle:angle+90,width:first.width,spacing}]:value==='layers'?(next.layers&&next.layers.length>1?next.layers:[{angle,width:first.width,spacing},{angle:angle+90,width:first.width,spacing}]):[{angle,width:first.width,spacing}];},true));
      if(draft.type==='noise'){
        add('噪点强度',{value:draft.density,min:0,max:1,step:.01},value=>commit('设置噪点强度',next=>next.density=Math.max(0,Math.min(1,finite(value,.18)))));
        add('颗粒大小',{value:draft.size,min:1,max:16,step:1},value=>commit('设置噪点颗粒大小',next=>next.size=Math.max(1,Math.round(finite(value,1)))));
        add('随机种子',{value:draft.seed,step:1},value=>commit('设置噪点随机种子',next=>next.seed=Math.round(finite(value,1))));
      }else if(draft.type==='lines'){
        const layers=draft.layers||[],base=layers[0]||{angle:45,width:1,spacing:4};
        if(style==='layers')layers.forEach((layer,index)=>{add(`线 ${index+1} 角度`,{value:layer.angle,step:1},value=>commit('设置叠线角度',next=>next.layers[index].angle=finite(value,0)));add(`线 ${index+1} 线宽`,{value:layer.width,min:1,step:1},value=>commit('设置叠线线宽',next=>{next.layers[index].width=Math.max(1,finite(value,1));next.layers[index].spacing=Math.max(next.layers[index].width,+next.layers[index].spacing||next.layers[index].width);}));add(`线 ${index+1} 格距`,{value:layer.spacing==null?layer.width+layer.gap:layer.spacing,min:layer.width,step:1},value=>commit('设置叠线格距',next=>next.layers[index].spacing=Math.max(next.layers[index].width,finite(value,next.layers[index].width))));});
        else {add('整体旋转',{value:base.angle,step:1},value=>commit('设置纹理旋转',next=>{const angle=finite(value,0);next.layers.forEach((layer,index)=>layer.angle=angle+(style==='grid'?index*90:0));}));add('线宽',{value:base.width,min:1,step:1},value=>commit('设置纹理线宽',next=>next.layers.forEach(layer=>{layer.width=Math.max(1,finite(value,1));layer.spacing=Math.max(layer.width,+layer.spacing||layer.width);})));add('格距',{value:base.spacing==null?base.width+base.gap:base.spacing,min:base.width,step:1},value=>commit('设置纹理格距',next=>next.layers.forEach(layer=>layer.spacing=Math.max(layer.width,finite(value,layer.width)))));}
        if(style==='layers'&&layers.length<3){const more=root.createElement('button');more.type='button';more.className='small';more.textContent='+ 线层';more.addEventListener('click',()=>commit('增加叠线',next=>next.layers.push({angle:next.layers.length===1?135:0,width:1,spacing:4}),true));panel.append(more);}
      }else{
        add('整体旋转',{value:draft.angle,step:1},value=>commit('设置纹理旋转',next=>next.angle=finite(value,0)));add('图样大小',{value:draft.size,min:1,step:1},value=>commit('设置纹理大小',next=>{next.size=Math.max(1,finite(value,1));next.spacing=Math.max(next.size,+next.spacing||next.size);}));add('格距',{value:draft.spacing==null?draft.size+draft.gap:draft.spacing,min:draft.size,step:1},value=>commit('设置纹理格距',next=>next.spacing=Math.max(next.size,finite(value,next.size))));
        if(draft.type==='dots'){add('点形',{select:true,value:draft.roundness>=.98?'circle':String(draft.sides||4),options:[{value:'circle',label:'圆点'},{value:'3',label:'三角'},{value:'4',label:'矩形'},{value:'5',label:'五边形'},{value:'6',label:'六边形'}]},value=>commit('设置点纹形状',next=>{next.roundness=value==='circle'?1:0;next.sides=value==='circle'?4:Math.max(3,Math.min(6,finite(value,4)));}));add('排列',{select:true,value:draft.layout||'regular',options:[{value:'regular',label:'整齐'},{value:'stagger',label:'错列'}]},value=>commit('设置点纹排列',next=>next.layout=value));if(draft.layout==='stagger')add('错列偏移',{value:draft.phase,min:0,max:1,step:.05},value=>commit('设置错列偏移',next=>next.phase=Math.max(0,Math.min(1,finite(value,0)))));}
      }
      if(draft.type!=='noise'){
        add('起始偏移 X',{value:Math.max(0,Math.min(1,draft.phaseX||0)),min:0,max:1,step:.05},value=>commit('设置纹理起始偏移 X',next=>{next.phaseX=Math.max(0,Math.min(1,finite(value,0)));}));
        add('起始偏移 Y',{value:Math.max(0,Math.min(1,draft.phaseY||0)),min:0,max:1,step:.05},value=>commit('设置纹理起始偏移 Y',next=>{next.phaseY=Math.max(0,Math.min(1,finite(value,0)));}));
      }
      const motionTypes=['pattern-drift','pattern-step','pattern-random','pattern-pulse'].filter(type=>registry.motionById&&registry.motionById[type]),motion=draft.motion||{},motionRow=root.createElement('label'),motionName=root.createElement('span'),motionToggle=root.createElement('input');motionRow.className='v4-inline-texture-motion';motionName.textContent='图案运动';motionToggle.type='checkbox';motionToggle.checked=!!motion.enabled;motionToggle.addEventListener('change',()=>commit(motionToggle.checked?'启用图案运动':'关闭图案运动',next=>{if(motionToggle.checked)next.motion=Object.assign(patternMotionDefaults(motionTypes.includes(next.motion&&next.motion.type)?next.motion.type:motionTypes[0]),next.motion||{},{enabled:true});else delete next.motion;},true));motionRow.append(motionName,motionToggle);fields.append(motionRow);
      if(motion.enabled&&motionTypes.length){const type=motionTypes.includes(motion.type)?motion.type:motionTypes[0],definition=registry.motionById[type];add('运动预设',{select:true,value:type,options:motionTypes.map(value=>({value,label:registry.motionById[value].name}))},value=>commit('切换图案运动预设',next=>next.motion=patternMotionDefaults(value),true));for(const param of definition.params||[])add(param.label,{value:motion[param.key]==null?param.default:motion[param.key],min:param.min,max:param.max,step:param.step},value=>commit('设置图案运动 · '+param.label,next=>{next.motion=Object.assign(patternMotionDefaults(type),next.motion||{},{enabled:true,type});next.motion[param.key]=param.integer?Math.round(finite(value,param.default)):finite(value,param.default);}));}
      const staleMotion=panel.querySelector('.v4-inline-texture-motion');if(staleMotion)staleMotion.remove();
      redraw();return panel;
    }
    function entityColor(ownerId,label,value,alpha,apply){if(typeof global.colorField!=='function'&&!colorControl){let currentColor=value,currentAlpha=finite(alpha,1);return paintColor(currentColor,next=>{currentColor=next;mutate('设置对象'+label,ownerId,target=>apply(target,currentColor,currentAlpha));},currentAlpha,next=>{currentAlpha=next;mutate('设置对象'+label+'透明度',ownerId,target=>apply(target,currentColor,currentAlpha));});}let token=null;const finish=()=>{if(!token)return;changes.commit(token);token=null;},change=(nextColor,nextAlpha,final)=>{if(!token)token=changes.begin('设置对象'+label);workspace.mutate(scene=>{const target=(scene.entities||[]).find(item=>item.id===ownerId);if(target)apply(target,nextColor,nextAlpha);});if(final)finish();};change.finish=finish;return colorControl?colorControl.controls({root,value,alpha,change,label}):[global.colorField(value,alpha,change,label)];}
    function header(kicker,name,note){host.innerHTML='';const k=root.createElement('div');k.className='inspector-kicker';k.textContent=kicker;const n=root.createElement('div');n.className='inspector-name';n.textContent=name;host.append(k,n);if(note){const d=root.createElement('div');d.className='inspector-note';d.textContent=note;host.append(d);}}
    function trackContext(key,create){if(!key||!timelineState)return null;const all=scene().timeline&&scene().timeline.tracks,input=all&&all[key];if(!input&&!create)return{key,index:0,segment:null,hasData:false};const track=create?timelineState.track(scene(),key):input,position=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4))),found=track?timelineState.at(track,position):{index:0,segment:null},segment=found.segment,values=segment&&segment.values||{},effectTrack=/^effect:(object|scene):/.test(key),hasData=!!(segment&&(segment.type==='linear'||Object.keys(values).some(name=>!effectTrack||name!=='enabled')));return{key,index:found.index,segment,hasData};}
    function propertyContext(item,create){const context=trackContext(item&&item.id,create);if(!context)return context;const segment=context.segment,values=segment&&segment.values||{};return Object.assign({},context,{hasData:!!(segment&&(segment.type==='linear'||Object.keys(values).some(key=>!key.startsWith('anim.'))))});}
    function sceneBackgroundContext(document){const value=document||scene(),rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+value.loop||4)));return{current:timelineState.sceneAt(value,rel)};}
    function sceneBackgroundBase(document,context){const current=context||sceneBackgroundContext(document,false),segment=current.current&&current.current.segment||{},value=document||scene();return Object.assign({color:'#000000',alpha:1},value.background||{},segment.background||{});}
    function sceneBackgroundValues(){return sceneBackgroundBase(scene(),sceneBackgroundContext(scene(),false));}
    function writeSceneBackground(label,patch){changes.run(label,document=>{const context=sceneBackgroundContext(document,false),target=timelineState.sceneSegments(document,true)[context.current.index];target.background=Object.assign({},sceneBackgroundBase(document,context),patch);});}
    function sceneColor(label,value,alpha,apply){if(typeof global.colorField!=='function'&&!colorControl){return paintColor(value,next=>writeSceneBackground('设置背景'+label,apply(next,alpha)),alpha,next=>writeSceneBackground('设置背景'+label+'透明度',apply(value,next)));}let token=null;const finish=()=>{if(token){changes.commit(token);token=null;}},change=(nextColor,nextAlpha,final)=>{if(!token)token=changes.begin('设置背景'+label);workspace.mutate(document=>{const context=sceneBackgroundContext(document,false),target=timelineState.sceneSegments(document,true)[context.current.index];target.background=Object.assign({},sceneBackgroundBase(document,context),apply(nextColor,nextAlpha));});if(final)finish();};change.finish=finish;return colorControl?colorControl.controls({root,value,alpha,change,label}):[global.colorField(value,alpha,change,label)];}
    function timingWriteIndex(document,id){const input=timelineState.track(document,id),position=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+document.loop||4))),found=timelineState.at(input,position),segment=found.segment;if(!segment||segment.type!=='linear')return found.index;let left=found.index-1,right=found.index+1;while(left>=0&&input.segments[left].type==='linear')left--;while(right<input.segments.length&&input.segments[right].type==='linear')right++;if(left<0)return right<input.segments.length?right:found.index;if(right>=input.segments.length)return left;return Math.abs(position-segment.f[0])<=Math.abs(segment.f[1]-position)?left:right;}
    function shouldWriteTrack(key){const ctx=trackContext(key,false);return!!(ctx&&(ctx.hasData||timingArmed&&timingArmed.key===key&&timingArmed.index===ctx.index));}
    function shouldWriteTiming(id){const item=entity(id),context=item&&propertyContext(item,false);return!!(context&&(context.hasData||timingArmed&&timingArmed.key===id&&timingArmed.index===context.index&&!timingArmed.motionId));}
    function motionPrefix(id){return 'anim.'+id;}
    function motionContext(item,id){const context=trackContext(item.id,false),values=context&&context.segment&&context.segment.values||{};return Object.assign({},context,{hasData:Object.keys(values).some(key=>key===motionPrefix(id)||key.startsWith(motionPrefix(id)+'.'))});}
    function shouldWriteMotion(item,id){const context=motionContext(item,id);return!!(context.hasData||timingArmed&&timingArmed.key===item.id&&timingArmed.index===context.index&&timingArmed.motionId===id);}
    function writeTimedPatch(document,id,patch){if(!shouldWriteTrack(id))return false;timelineState.setStep(document,id,timingWriteIndex(document,id),patch);timingArmed=null;if(timeline&&timeline.mode!=='property')timeline.setMode('property');return true;}
    function setTabs(kind,item){
      const sceneMode=kind==='scene',partMode=kind==='part',particle=!!(item&&item.type==='particle-emitter');
      globalTabs.style.display=sceneMode?'flex':'none';elementTabs.style.display=sceneMode?'none':'flex';
      if(timing){
        if(!sceneMode&&timing.parentElement!==elementTabs)elementTabs.appendChild(timing);
        timing.style.display=sceneMode||!item||partMode&&!!extensionFocus?'none':'';
        if(!sceneMode&&item&&objectTab==='props'){
          const ctx=propertyContext(item,false),armed=timingArmed&&timingArmed.key===item.id&&timingArmed.index===ctx.index;
          if(timingArmed&&timingArmed.key===item.id&&timingArmed.index!==ctx.index)timingArmed=null;
          timing.classList.toggle('active',ctx.hasData||armed);timing.classList.toggle('has-data',ctx.hasData);
          timing.title=ctx.hasData?'当前时段已有参数覆层；点击清除':'点击后下一次参数修改写入当前时段';
        }
      }
      if(sceneMode)for(const button of globalTabs.querySelectorAll('[data-global-inspector]')){
        const supported=['props','overlay','sampling'].includes(button.dataset.globalInspector);button.style.display=supported?'':'none';button.disabled=!supported;button.classList.toggle('active',supported&&sceneTab===button.dataset.globalInspector);
      }else for(const button of elementTabs.querySelectorAll('[data-element-inspector]')){
        const key=button.dataset.elementInspector,supported=partMode?['props','extensions'].includes(key):particle?key==='props':['props','fx','sampling'].includes(key)&&(!item||item.type!=='group'||key==='props');
        button.style.display=supported?'':'none';button.disabled=!supported||partMode&&key==='extensions'&&(view.selectedPartIds||[]).length>1;
        button.textContent={props:particle?'粒子':'成样',extensions:'拓展',fx:'加样',sampling:'采样'}[key]||key;
        if(partMode&&key==='props')button.dataset.pathExtensionBack='';else delete button.dataset.pathExtensionBack;
        button.classList.toggle('active',supported&&(partMode?(extensionFocus?'extensions':'props'):objectTab)===key);
      }
    }
    function mutate(label,id,operation){changes.run(label,value=>{const target=id?(value.entities||[]).find(item=>item.id===id):value;if(target)operation(target,value);});}
    function valueAt(value,key,fallback){let cursor=value;for(const part of String(key||'').split('.')){if(cursor==null||!Object.prototype.hasOwnProperty.call(cursor,part))return fallback;cursor=cursor[part];}return cursor===undefined?fallback:cursor;}
    let evaluationRevision=-1,evaluationSource=null,evaluationScene=null;
    function inspectorTimelineScene(){
      const source=scene();if(evaluationSource===source&&evaluationRevision===workspace.revision)return evaluationScene;
      // Runtime capability caches expect immutable track identities. Workspace
      // tracks are editable; give each revision new shallow track identities,
      // without serializing the project or cloning assets on every frame.
      const tracks=Object.fromEntries(Object.entries(source.timeline?.tracks||{}).map(([key,track])=>[key,track?{...track}:track]));
      evaluationSource=source;evaluationRevision=workspace.revision;evaluationScene={...source,timeline:{...source.timeline,tracks}};return evaluationScene;
    }
    function assignAt(value,key,next){const parts=String(key||'').split('.');let cursor=value;for(let index=0;index<parts.length-1;index++){const part=parts[index];cursor[part]=Object.assign({},cursor[part]||{});cursor=cursor[part];}cursor[parts[parts.length-1]]=next;}
    function timedValues(item){const runtime=global.ToSampoolRuntimeVNext,rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4)));return runtime&&runtime.modules&&runtime.modules.timeline?runtime.modules.timeline.valuesFor(inspectorTimelineScene(),item.id,item,rel):item;}
    function timedValue(item,key){const values=timedValues(item);return valueAt(values,key,valueAt(item,key,undefined));}
    function formationStatus(item,domain,key,part,label){
      const binding=global.EditorClassicV4FormationParameters.binding(domain,key,part,label),context=propertyContext(item,false),arm=extensionArmKey(item.id,binding.path,context.index);
      const paths=global.EditorClassicV4FormationParameters.group(domain,key).map(field=>binding.path.slice(0,binding.path.length-key.length)+field);
      const has=paths.some(path=>Object.hasOwn(context.segment?.values||{},path)),armed=paths.some(path=>extensionParameterArmed.has(extensionArmKey(item.id,path,context.index)));
      const other=(scene().timeline?.tracks?.[item.id]?.segments||[]).some((s,index)=>index!==context.index&&paths.some(path=>Object.hasOwn(s.values||{},path)));
      return{...binding,context,arm,paths,other,armed,...global.EditorV4ParameterControls.timingTarget(binding.param,{segment:context.segment,path:binding.path,armed:armed||has}),has};
    }
    function formationClock(input,item,domain,key,part,label){
      const status=formationStatus(item,domain,key,part,label);input.dataset.formationParameter=key;input.dataset.formationPath=status.path;input.dataset.formationTiming=status.timing;
      if(status.timing==='No')return input;
      const button=global.EditorV4ParameterControls.timingButton({root,param:status.param,read:()=>({...formationStatus(item,domain,key,part,label),title:'所属对象 · 当前时段参数'}),change:()=>{
        const current=formationStatus(item,domain,key,part,label);timingArmed=null;
        const clear=()=>current.paths.forEach(path=>extensionParameterArmed.delete(extensionArmKey(item.id,path,current.context.index)));
        if(current.has){changes.run('清除 '+current.param.label+' 时序',doc=>{const values=timelineState.track(doc,item.id).segments[current.context.index].values;for(const path of current.paths)delete values[path];});clear();}
        else if(current.armed)clear();else extensionParameterArmed.add(current.arm);
        timeline?.setTrack(item.id,item.name||item.id,{linearKeys:objectLinearKeys(item)});render();
      }});button.dataset.formationParameterClock=key;button.dataset.formationPath=status.path;
      global.EditorV4ParameterControls.placeTiming(input,button);input.disabled=status.readOnly;input.setEditable?.({color:!status.readOnly,alpha:false});return input;
    }
    function writeFormation(label,item,domain,key,value,part,options={}){
      const status=formationStatus(item,domain,key,part),whole=timingArmed?.key===item.id&&timingArmed.index===status.context.index&&!timingArmed.motionId;
      const motionWhole=typeof domain==='object'&&domain.motionId&&timingArmed?.key===item.id&&timingArmed.index===status.context.index&&timingArmed.motionId===domain.motionId;
      const target=global.EditorV4ParameterControls.timingTarget(status.param,{segment:status.context.segment,path:status.path,armed:status.active,wholeSegment:whole||motionWhole});
      if(target.readOnly)throw Error('过渡段只读，请在两侧时段设置参数');
      changes.run(label,doc=>{
        options.ensure?.(doc);
        if(target.target==='segment'){
          // A motion on/off value is a structural object/null, not a scalar.
          // Drop descendants before replacing it so stale values cannot revive it.
          if(/^anim\.[^.]+$/.test(key)){const values=timelineState.track(doc,item.id).segments[status.context.index].values;for(const path of Object.keys(values||{}))if(path.startsWith(status.path+'.'))delete values[path];}
          const patch={[status.path]:value};for(const [path,next]of Object.entries(options.linked||{}))patch[status.path.slice(0,status.path.length-key.length)+path]=next;
          timelineState.setStep(doc,item.id,status.context.index,patch);
        }else{
          const owner=doc.entities.find(e=>e.id===item.id),content=part?owner?.parts?.find(p=>p.id===part.id):owner;if(!content)throw Error('目标对象或图元已不存在');
          if(options.base)options.base(content,owner,doc);else assignAt(content,key,value);
          if(domain==='part'&&owner.type==='vector')partsState.normalizeBounds(doc,owner.id);
        }
      });for(const path of status.paths)extensionParameterArmed.delete(extensionArmKey(item.id,path,status.context.index));
    }
    function formationNumber(grid,item,domain,key,label,opts={},part){
      const spec=global.EditorClassicV4FormationParameters.parameter(domain,key,label),evaluated=spec.timing==='No'?item:timedValues(item),source=part?(spec.timing==='No'?part:evaluated.parts?.find(p=>p.id===part.id)||part):evaluated;
      const value=finite(valueAt(source,key,spec.default),spec.default??0),shown=opts.percent?Math.round(value*100):value;
      const input=number(grid,label,shown,next=>writeFormation('设置 '+label,item,domain,key,opts.percent?next/100:next,part),opts);
      return formationClock(input,item,domain,key,part,label);
    }
    function timedParticle(item,key){const runtime=global.ToSampoolRuntimeVNext,rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4))),values=runtime&&runtime.modules&&runtime.modules.timeline?runtime.modules.timeline.valuesFor(inspectorTimelineScene(),item.id,item,rel):item;return values&&values.particle&&values.particle[key]!=null?values.particle[key]:particleState.defaults[key];}
    function builtinDefinition(item){const builtins=global.ToSampoolRuntimeVNext&&global.ToSampoolRuntimeVNext.modules&&global.ToSampoolRuntimeVNext.modules.builtins;return builtins&&item&&item.builtin?builtins.definition(item.builtin.id,item.builtin.version):null;}
    function timedBuiltin(item){const runtime=global.ToSampoolRuntimeVNext,rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4))),values=runtime&&runtime.modules&&runtime.modules.timeline?runtime.modules.timeline.valuesFor(inspectorTimelineScene(),item.id,item,rel):item,builtins=runtime&&runtime.modules&&runtime.modules.builtins;return builtins?builtins.normalize(values.builtin||item.builtin).params:(values.builtin&&values.builtin.params||{});}
    function moduleDefinition(item){const sceneModules=global.ToSampoolRuntimeVNext&&global.ToSampoolRuntimeVNext.modules&&global.ToSampoolRuntimeVNext.modules.sceneModules;if(!sceneModules||!item||item.type!=='procedural')return null;try{return sceneModules.definition(item.moduleId,item.moduleVersion,{scope:scene()&&scene()._moduleScope});}catch(error){return null;}}
    function timedModule(item){const runtime=global.ToSampoolRuntimeVNext,rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4))),values=runtime&&runtime.modules&&runtime.modules.timeline?runtime.modules.timeline.valuesFor(inspectorTimelineScene(),item.id,item,rel):item,sceneModules=runtime&&runtime.modules&&runtime.modules.sceneModules;try{return sceneModules?sceneModules.normalize(values,{scope:scene()&&scene()._moduleScope}).params:(values.params||{});}catch(error){return values&&values.params||item.params||{};}}
    function moduleParameters(definition,item){const manifest=definition&&definition.manifest,params=Array.isArray(manifest&&manifest.parameters)?manifest.parameters:Array.isArray(manifest&&manifest.params)?manifest.params:[];if(!item)return params;const values=item.params||{};return params.filter(param=>{if(param.internal)return false;const applies=param.appliesTo;if(!applies)return true;return Object.entries(applies).every(([key,allowed])=>(Array.isArray(allowed)?allowed:[allowed]).includes(nested(values,key,undefined)));});}
    function objectLinearKeys(item){
      const keys=global.EditorClassicV4FormationParameters.linearKeys(item);
      for(const part of [item,...item?.parts||[]])if(part?.recipe?.definition){const prefix=part===item?'recipe.params.':`partsById.${encodeURIComponent(part.id).replace(/\./g,'%2E')}.recipe.params.`;for(const param of part.recipe.definition.parameters)if(param.timing==='Linear')keys.push(prefix+param.key);}
      for(const part of [item,...item?.parts||[]])for(const id of part?.extensions?.attached||[]){const config=part.extensions[id];if(!config?.definition)continue;const prefix=(part===item?'':`partsById.${encodeURIComponent(part.id).replace(/\./g,'%2E')}.`)+global.ToSampoolRuntimeVNext.modules.pathGenerators.prefix(id);for(const p of config.definition.parameters)if(p.timing==='Linear')keys.push(prefix+p.key);}
      const builtin=item&&item.type==='builtin'&&builtinDefinition(item),module=item&&item.type==='procedural'&&moduleDefinition(item);
      for(const param of builtin&&builtin.params||[])if(param.timing==='linear-safe')keys.push('builtin.params.'+param.key);
      for(const param of moduleParameters(module,item))if(param.timing==='linear-safe')keys.push('params.'+param.key);
      return keys;
    }
    function writeEntity(label,item,key,value){
      if(['x','y','w','h'].includes(key))value=Math.round(value);
      if(global.EditorClassicV4FormationParameters.groups.object.some(p=>p.key===key))return writeFormation(label,item,'object',key,value);
      if(key.startsWith('anim.')){const [,id,field]=key.split('.'),motion=entityMotionList().find(m=>m.id===id),param=field?motion?.params.find(p=>p.key===field):{type:'boolean',timing:'Step',label:motion?.name};if(!param)throw Error('动态参数未登记：'+key);return writeFormation(label,item,{parameter:param,motionId:id},key,value);}
      if(shouldWriteTiming(item.id))changes.run(label+' · 时段',document=>writeTimedPatch(document,item.id,{[key]:value},item.id));else mutate(label,item.id,target=>assignAt(target,key,value));
    }
    function writeParticle(label,item,key,value){if(shouldWriteTiming(item.id))changes.run(label+' · 时段',document=>writeTimedPatch(document,item.id,{['particle.'+key]:value},item.id));else changes.run(label,document=>particleState.set(document,item.id,key,value));}
    function writeBuiltin(label,item,param,value){writeFormation(label,item,{parameter:param},'builtin.params.'+param.key,value);}
    function writeModule(label,item,param,value){writeFormation(label,item,{parameter:param},'params.'+param.key,value);}
    function declaredField(grid,item,param,path,current,write,part){
      const label=param.label||param.name||param.key,domain={parameter:param};
      let input;
      if(param.type==='number')input=number(grid,label,current,write,{min:param.min,max:param.max,step:param.step??1,decimals:param.decimals});
      else if(param.type==='color')input=color(grid,label,current,write);
      else if(param.type==='select')input=select(grid,label,current,moduleChoiceList(param),write);
      else if(param.type==='boolean'){input=root.createElement('input');input.type='checkbox';input.checked=!!current;input.addEventListener('change',()=>write(input.checked));field(grid,label,input);}
      else input=textField(grid,label,current,write,!!param.multiline);
      formationClock(input,item,domain,path,part,label);return input;
    }
    function moduleChoiceList(param){return(param.options||[]).map(option=>Array.isArray(option)?{value:option[0],label:option[1]}:typeof option==='object'?{value:option.value,label:option.label||option.value}:{value:option,label:option});}
    function renderModule(item){
      const definition=moduleDefinition(item),runtime=global.ToSampoolRuntimeVNext,sceneModules=runtime&&runtime.modules&&runtime.modules.sceneModules;
      if(!definition){const unavailable=section('程序构件','此构件尚未被信任或未加载；工程打开时需明确确认其 Manifest。');host.append(unavailable.wrap);return;}
      const manifest=definition.manifest||{},name=manifest.title||manifest.name||item.name||manifest.id,values=timedModule(item),block=section('程序构件',`${manifest.purpose||'由项目模块提供的受控画面。'} · ${manifest.id}@${manifest.version}`);
      block.wrap.dataset.v4ProceduralModule=manifest.id||'';
      const parameters=moduleParameters(definition,item);
      for(const param of parameters){
        const label=param.label||param.name||param.key,normalize=value=>sceneModules?.normalizeParam?sceneModules.normalizeParam(param,value):value;
        declaredField(block.grid,item,param,'params.'+param.key,values[param.key],value=>writeModule('设置'+name+' · '+label,item,param,normalize(value)));
      }
      if(!parameters.length){const empty=root.createElement('div');empty.className='global-note';empty.textContent='此程序构件没有对编辑器公开可调参数。';block.grid.append(empty);}
      host.append(block.wrap);
      if(timeline&&timeline.mode==='property')timeline.setTrack(item.id,item.name||name,{linearKeys:objectLinearKeys(item)});
    }
    function mutatePart(label,ownerId,partId,operation){changes.run(label,value=>{const owner=(value.entities||[]).find(item=>item.id===ownerId),part=owner&&(owner.parts||[]).find(item=>item.id===partId);if(!owner||!part)return;operation(part,owner,value);if(owner.type==='vector')partsState.normalizeBounds(value,ownerId);});}
    function mutateText(label,id,patch){changes.run(label,value=>global.EditorVNextTextState.update(value,id,patch,root));}
    function writeTextReveal(item,key,value,label){
      writeFormation(label,item,'text',key,value,null,{ensure:doc=>global.EditorVNextTextState.ensure(doc,item.id,root)});
    }
    function renderTextAppearance(item){
      const appearance=section('文字'),id=item.id;
      textField(appearance.grid,'文字',item.text||'',value=>mutateText('设置文字内容',id,{text:value}),true);
      number(appearance.grid,'字号',item.fontSize||16,value=>mutateText('设置文字字号',id,{fontSize:Math.max(1,value)}),{min:1,step:1});
      number(appearance.grid,'字距',item.letterSpacing||0,value=>mutateText('设置文字字距',id,{letterSpacing:value}),{step:1});
      number(appearance.grid,'行高',item.lineHeight||1.25,value=>mutateText('设置文字行高',id,{lineHeight:value}),{min:.5,max:4,step:.05});
      if(fonts){const fontSelect=fonts.makeSelect(item.fontId||'system',(fontId,choice)=>mutateText('设置文字字体',id,{fontId:fontId==='system'?undefined:fontId,fontFamily:choice.family||'sans-serif'}));field(appearance.grid,'字体连接',fontSelect);}
      else textField(appearance.grid,'字体连接',item.fontFamily||'sans-serif',value=>mutateText('设置文字字体',id,{fontFamily:value||'sans-serif'}));
      for(const control of textPaint(id,item.fill||'#ffffff',item.fillAlpha,item.fillPaint))field(appearance.grid,'填充',control);
      const complete=number(appearance.grid,'完成度',finite(timedValue(item,'textCompletion'),100),
        value=>writeTextReveal(item,'textCompletion',value,'设置文字完成度'),{min:0,max:100,step:1,decimals:1});
      complete.dataset.textParam='completion';complete.title='0–100%；支持时间轴 Linear，按完整字符显现';
      formationClock(complete,item,'text','textCompletion',null,'完成度');
      const cursor=timedValue(item,'textCursor')||{},toggle=root.createElement('input');
      toggle.type='checkbox';toggle.checked=!!cursor.enabled;toggle.dataset.textParam='cursor-enabled';
      toggle.addEventListener('change',()=>writeTextReveal(item,'textCursor.enabled',toggle.checked,'设置文字光标'));
      field(appearance.grid,'光标',toggle);
      formationClock(toggle,item,'text','textCursor.enabled',null,'光标');
      if(cursor.enabled){
        const style=select(appearance.grid,'光标样式',cursor.style||'bar',[
          {value:'bar',label:'竖线'},{value:'underline',label:'下划线'},{value:'block',label:'方块'}],
          value=>writeTextReveal(item,'textCursor.style',value,'设置光标样式'));
        style.dataset.textParam='cursor-style';
        formationClock(style,item,'text','textCursor.style',null,'光标样式');
        const period=number(appearance.grid,'闪烁周期',finite(cursor.period,1),
          value=>writeTextReveal(item,'textCursor.period',value,'设置光标闪烁周期'),{min:0,step:.1,decimals:1});
        period.dataset.textParam='cursor-period';period.title='秒；0 为常亮，文字完成后隐藏';
        formationClock(period,item,'text','textCursor.period',null,'闪烁周期');
        const follow=root.createElement('input');follow.type='checkbox';follow.checked=!cursor.color;
        follow.addEventListener('change',()=>writeTextReveal(item,'textCursor.color',follow.checked?null:(item.fill||'#ffffff'),'设置光标颜色跟随'));
        field(appearance.grid,'跟随文字颜色',follow);
        formationClock(follow,item,'text','textCursor.color',null,'光标颜色');
        if(cursor.color)color(appearance.grid,'光标颜色',cursor.color,value=>writeTextReveal(item,'textCursor.color',value,'设置光标颜色'));
      }
      host.append(appearance.wrap);
    }
    function nested(value,key,fallback){let cursor=value;for(const part of String(key).split('.')){if(cursor==null)return fallback;cursor=cursor[part];}return cursor==null?fallback:cursor;}
    function effectStage(scope,card){const storage=card.storage;return scope==='scene'?storage:null;}
    function effectTrack(scope,owner,card){return inspectorModel.trackKey(scope,scope==='scene'?effectStage(scope,card):owner.id,registry.effectById[card.id]);}
    function effectLinearKeys(card){const definition=registry.effectById[card.id];return(definition.params||[]).filter(param=>global.EditorClassicV4EffectParameterTiming.binding(definition,param.key).timing==='Linear').map(param=>param.key);}
    function effectConfig(scope,owner,card){const source=scope==='scene'?scene().sceneEffects&&scene().sceneEffects[card.storage]:owner.effects&&owner.effects[card.storage];return source&&source[card.id]||null;}
    function effectValues(scope,owner,card){const base=Object.assign(effectState.defaults(registry.effectById[card.id]),effectConfig(scope,owner,card)||{}),runtime=global.ToSampoolRuntimeVNext,rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4))),stage=scope==='scene'?effectStage(scope,card):owner.id;return runtime&&runtime.modules&&runtime.modules.timeline?runtime.modules.timeline.effectValuesFor(scene(),scope,stage,card.id,base,rel):base;}
    function effectParameterStatus(scope,owner,card,key){
      const param=global.EditorClassicV4EffectParameterTiming.parameter(registry.effectById[card.id],key);if(!param)return null;
      const track=effectTrack(scope,owner,card),context=trackContext(track,false),arm=effectArmKey(track,key,context.index);
      const paths=global.EditorClassicV4EffectParameterTiming.group(registry.effectById[card.id],key),has=paths.some(path=>Object.hasOwn(context.segment?.values||{},path)),armed=paths.some(path=>effectParameterArmed.has(effectArmKey(track,path,context.index)));
      const other=(scene().timeline?.tracks?.[track]?.segments||[]).some((segment,index)=>index!==context.index&&paths.some(path=>Object.hasOwn(segment.values||{},path)));
      return {param,track,context,arm,other,paths,armed,...global.EditorV4ParameterControls.timingTarget(param,{segment:context.segment,path:key,armed:armed||has}),has};
    }
    function effectParameterClock(control,scope,owner,card,key){
      const status=effectParameterStatus(scope,owner,card,key);if(!status||status.timing==='No')return status;
      const button=global.EditorV4ParameterControls.timingButton({root,param:status.param,read:()=>{const current=effectParameterStatus(scope,owner,card,key);return{active:current.active,has:current.has,other:current.other,segmentType:current.context.segment?.type,readOnly:current.readOnly,title:current.readOnly?'过渡段：请在两侧时段设置目标值':current.timing+' · 当前效果时段参数'};},change:()=>{
        const current=effectParameterStatus(scope,owner,card,key);if(current.readOnly)return;
        timingArmed=null; // An explicit per-parameter action exits whole-segment editing.
        effectFocus={scope,ownerId:owner&&owner.id||null,effectId:card.id};controllerFocus=null;
        const clearArms=()=>current.paths.forEach(path=>effectParameterArmed.delete(effectArmKey(current.track,path,current.context.index)));
        if(current.has){runParameterTiming('清除 '+card.name+' · '+status.param.label+' 时序',document=>{const values=timelineState.track(document,current.track).segments[current.context.index].values;for(const path of current.paths)delete values[path];});clearArms();}
        else if(current.armed)clearArms();else effectParameterArmed.add(current.arm);
        timeline?.setTrack(status.track,card.name,{linearKeys:effectLinearKeys(card)});render();
      }});button.dataset.effectParameterClock=key;button.dataset.effectTrack=status.track;
      button.dataset.channelLabel=status.param.label;
      if(control.classList.contains('color-field'))button.dataset.colorTimingChannel=status.param.type==='color'?'color':'alpha';
      global.EditorV4ParameterControls.placeTiming(control,button);
      configureColorTimingBatch(control);
      button.addEventListener('click',()=>syncTimingPaint(control,effectValues(scope,owner,card)));
      if(control.tagName==='INPUT'||control.tagName==='SELECT')control.disabled=status.readOnly;
      else for(const input of control.querySelectorAll('input,select,button:not(.v4-parameter-clock)'))input.disabled=status.readOnly;
      return status;
    }
    function effectParameterField(grid,scope,owner,card,param,values){
      const color=param.type==='color',control=color?effectColorControl(scope,owner,card,param,values):effectControl(scope,owner,card,param,values);
      if(color||!['INPUT','SELECT'].includes(control.tagName))control.setAttribute('role','group');control.dataset.effectParameter=param.key;
      field(grid,param.label,control,color||param.type==='texture'||param.type==='palette');
      const status=effectParameterClock(control,scope,owner,card,param.key);
      if(param.type==='gradient')control.setEditable?.({color:!status?.readOnly,alpha:!status?.readOnly});
      if(color){const alphaKey=param.alphaKey||'alpha',alpha=(registry.effectById[card.id].params||[]).find(p=>p.key===alphaKey),alphaStatus=alpha&&effectParameterClock(control,scope,owner,card,alphaKey);control.setEditable?.({color:!status?.readOnly,alpha:!alphaStatus?.readOnly});}
      return control;
    }
    function controllerConfig(scope,owner,definition){const target=scope==='scene'?scene():owner,group=scope==='scene'?target.sceneEffects&&target.sceneEffects.sample:target.effects&&target.effects.sample;return group&&group.controllers&&group.controllers[definition.id]||null;}
    function controllerTrack(scope,owner,definition){return inspectorModel.controllerTrackKey(scope,scope==='scene'?'sample':owner.id,definition);}
    function controllerValues(scope,owner,definition){const base=effectState.controllerValues(scene(),{scope,ownerId:owner&&owner.id,controllerId:definition.id}),runtime=global.ToSampoolRuntimeVNext,rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4))),ownerId=scope==='scene'?'sample':owner.id;return runtime&&runtime.modules&&runtime.modules.timeline?runtime.modules.timeline.controllerValuesFor(scene(),scope,ownerId,definition.id,base,rel):base;}
    function showTrackTiming(parent,key,label,linearKeys){if(!timing)return;const ctx=trackContext(key,false),armed=timingArmed&&timingArmed.key===key&&timingArmed.index===ctx.index;if(timing.parentElement!==parent)parent.appendChild(timing);timing.style.display='';timing.classList.toggle('active',ctx.hasData||armed);timing.classList.toggle('has-data',ctx.hasData);timing.title=ctx.hasData?'当前效果时段已有覆层；点击清除':'点击后下一次效果参数修改写入当前时段';if(timeline)timeline.setTrack(key,label,{linearKeys,readOnlyVisibility:key.startsWith('effect:object:')||key.startsWith('controller:object:')});}
    function effectParamVisible(param,values){const planner=global.EditorClassicV4EffectParameters;return planner&&typeof planner.visible==='function'?planner.visible(param,values):(!param.visibleWhen?!param.visibleFor||(Array.isArray(param.visibleFor)?param.visibleFor:[param.visibleFor]).some(value=>[values.type,values.mode,values.texture].includes(value)):Object.entries(param.visibleWhen).every(([key,allowed])=>(Array.isArray(allowed)?allowed:[allowed]).includes(nested(values,key,undefined))));}
    let paletteJob=0,palettePending=null;
    async function updateColorMap(scope,owner,card,patch,control,forceBase){
      const key=effectTrack(scope,owner,card),definition=registry.effectById[card.id];
      const extractionTarget=()=>{const current=trackContext(key,false),plan=global.EditorClassicV4EffectParameterTiming.partition(definition,{...patch,extracted:null},{segment:current.segment,wholeSegment:timingArmed?.key===key&&timingArmed.index===current.index,armed:name=>effectParameterArmed.has(effectArmKey(key,name,current.index))});return Object.hasOwn(plan.timed,'extracted');};
      const job=++paletteJob,revision=workspace.revision,at=+time()||0,timed=!forceBase&&extractionTarget(),context=trackContext(key,false),index=context&&context.index;
      const values=Object.assign(effectState.defaults(registry.effectById[card.id]),effectValues(scope,owner,card)||{},patch),oldText=control&&control.textContent;
      palettePending={scope,ownerId:owner&&owner.id||null,patch};
      if(control){control.disabled=true;if(control.tagName==='BUTTON')control.textContent='提取中…';}
      try{
        const extracted=effectState.normalizeParam(registry.effectById[card.id],'extracted',await global.EditorClassicV4ColorMapControl.extract({workspace,scope,ownerId:owner&&owner.id,values,time:at}));
        if(stopped||job!==paletteJob)return;
        if(workspace.revision!==revision||(!forceBase&&extractionTarget()!==timed)||trackContext(key,false)?.index!==index)throw new Error('工程或当前时段已变化，请重新提取');
        palettePending=null;
        changes.run('重新提取颜色映射'+(timed?' · 时段':''),document=>{const next=Object.assign({},patch,{extracted});if(forceBase){for(const [key,value]of Object.entries(next)){const options={scope,ownerId:owner&&owner.id,effectId:card.id,key,value};if(key==='enabled')effectState.setEnabled(document,options,value);else effectState.setParam(document,options);}}else writeEffectPatch(document,scope,owner,card,next);});
        render();
      }catch(error){
        if(stopped||job!==paletteJob)return;palettePending=null;render();const target=host.querySelector('[data-v4-effect-id="color-map"] .global-grid');
        if(target){const note=root.createElement('div');note.className='global-note wide';note.setAttribute('role','alert');note.textContent=error.message||String(error);target.append(note);}
      }finally{if(job===paletteJob&&palettePending){palettePending=null;if(!stopped)render();}if(control){control.disabled=false;if(control.tagName==='BUTTON')control.textContent=oldText;}}
    }
    function effectControl(scope,owner,card,param,values){
      if(param.control==='segmented'){
        const tabs=root.createElement('span');tabs.className='color-mode-tabs';tabs.dataset.effectParam=param.key;tabs.setAttribute('role','group');tabs.setAttribute('aria-label',param.label);
        for(const value of param.options){const button=root.createElement('button');button.type='button';button.textContent=param.optionLabels[value]||value;button.classList.toggle('active',nested(values,param.key,param.default)===value);button.setAttribute('aria-pressed',String(nested(values,param.key,param.default)===value));button.addEventListener('click',()=>{if(card.id==='color-map'&&value==='discrete'&&(!values.palette||values.palette==='auto')&&!global.ToSampoolRuntimeVNext.modules.sampling.extractedPalette(values)){updateColorMap(scope,owner,card,{mode:value},button);return;}changes.run('设置 '+card.name+' · '+param.label,document=>writeEffectPatch(document,scope,owner,card,{[param.key]:value}));render();});tabs.append(button);}return tabs;
      }
      if(param.type==='gradient'){
        const paint=global.ToSampoolRuntimeVNext.modules.paint.normalize(nested(values,param.key,param.default));
        let token=null;const finish=()=>{if(token){changes.commit(token);token=null;}},change=(_color,_alpha,gradient,final)=>{if(!token)token=changes.begin('设置 '+card.name+' · '+param.label);workspace.mutate(document=>writeEffectPatch(document,scope,owner,card,{[param.key]:gradient}));if(final)finish();};change.finish=finish;
        const control=global.paintField('#000000',1,paint,change,param.label,{ramp:true});control.setAttribute('role','group');control.setAttribute('aria-label',param.label);return control;
      }
      if(card.id==='ascii-mapping'&&param.type==='font')return global.EditorClassicV4AsciiControl.fontInput({root,fonts,values,change:patch=>{changes.run('设置 ASCII 字体',document=>writeAsciiPatch(document,scope,owner,card,patch));render();}});
      if(card.id==='ascii-mapping'&&param.key==='colorAlpha'){
        const input=root.createElement('input');input.type='number';input.min=0;input.max=100;input.step=1;input.value=String(Math.round(finite(values.colorAlpha,1)*100));
        input.addEventListener('change',()=>{const value=Math.max(0,Math.min(100,+input.value||0))/100;changes.run('设置 ASCII 透明度',document=>writeAsciiPatch(document,scope,owner,card,{colorAlpha:value}));render();});return input;
      }
      let input;
      if(param.type==='select'||(param.type==='number'&&Array.isArray(param.options))){
        input=root.createElement('select');
        const current=nested(values,param.key,param.default);
        for(const option of param.options||[]){const node=root.createElement('option');node.value=option;node.textContent=param.optionLabels&&param.optionLabels[option]||option;input.append(node);}
        if(param.key==='blend'&&current==='lighter'&&!(param.options||[]).includes('lighter')){const legacy=root.createElement('option');legacy.value='lighter';legacy.textContent='加亮（旧项目）';input.append(legacy);}
      }else if(param.type==='boolean'){input=root.createElement('input');input.type='checkbox';input.checked=!!nested(values,param.key,param.default);}
      else if(param.type==='color'){input=root.createElement('input');input.type='color';}
      else if(param.type==='number'){input=root.createElement('input');input.type='number';if(param.min!=null)input.min=param.min;if(param.max!=null)input.max=param.max;if(param.step!=null)input.step=param.step;}
      else{input=root.createElement('input');input.type='text';}
      if(param.type!=='boolean')input.value=String(nested(values,param.key,param.default));
      const write=()=>{
        const definition=registry.effectById[card.id],raw=param.type==='boolean'?input.checked:input.value;
        const value=effectState.normalizeParam(param.key.startsWith('motion.')?{...definition,params:[param]}:definition,param.key,raw);
        if(param.key==='motion.type')writeEffectMotion('切换 '+card.name+'动态方式',scope,owner,card,(target,holder)=>holder.motion=Object.assign(effectMotionDefaults(value),{enabled:target.enabled!==false}),'motion.type');
        else{
          const patch={[param.key]:value};
          changes.run('设置 '+card.name+' · '+param.label,document=>writeEffectPatch(document,scope,owner,card,patch,{atomicKey:param.key.startsWith('motion.')?param.key:undefined}));
        }
        render();
      };
      if(card.id==='crt-display'&&param.key==='theme')input.addEventListener('change',event=>{
        event.stopImmediatePropagation();
        const presets=global.ToSampoolRuntimeVNext&&global.ToSampoolRuntimeVNext.modules&&global.ToSampoolRuntimeVNext.modules.crtScreen&&global.ToSampoolRuntimeVNext.modules.crtScreen.presets;
        const preset=presets&&presets[input.value];if(!preset)return;
        changes.run('切换 CRT 主题',document=>writeEffectPatch(document,scope,owner,card,Object.assign({theme:input.value},preset),{atomicKey:'theme'}));
        render();
      },true);
      if(card.id==='ascii-mapping')input.addEventListener('change',async event=>{
        event.stopImmediatePropagation();
        const value=effectState.normalizeParam(registry.effectById[card.id],param.key,param.type==='boolean'?input.checked:input.value);
        let patch={[param.key]:value};
        if(['characters','edgeCharacters'].includes(param.key)){
          const documentAtStart=workspace.current();input.disabled=true;input.setCustomValidity('');
          try{await global.EditorClassicV4AsciiControl.ensureBuiltinFont(Object.assign({},values,patch));if(workspace.current()!==documentAtStart||!input.isConnected)return;patch=global.EditorClassicV4AsciiControl.preparePatch(values,patch,fonts);}
          catch(error){input.setCustomValidity(error.message);input.reportValidity();return;}
          finally{input.disabled=false;}
        }
        changes.run('设置 ASCII · '+param.label,document=>writeAsciiPatch(document,scope,owner,card,patch));render();
      },true);
      if(card.id==='color-map'&&['colors','palette'].includes(param.key))input.addEventListener('change',event=>{
        if(param.key==='colors'||input.value==='auto'){event.stopImmediatePropagation();const value=effectState.normalizeParam(registry.effectById[card.id],param.key,input.value);updateColorMap(scope,owner,card,{[param.key]:value},input);}
      },true);
      input.addEventListener('change',write);
      if(card.id==='color-map'&&param.key==='colors'){
        const group=root.createElement('span'),button=root.createElement('button');group.className='color-field v4-control-with-action';group.setAttribute('role','group');group.setAttribute('aria-label',param.label);
        button.type='button';button.className='small';button.textContent='重新提取';button.title=values.extracted?'从当前画面重新提取；保存后移动和播放继续使用固定色板':'当前尚未固定色板；从当前画面提取并保存';button.dataset.colorMapExtract='';button.addEventListener('click',()=>updateColorMap(scope,owner,card,{},button));group.append(input,button);return group;
      }
      return input;
    }
    function writeAsciiPatch(document,scope,owner,card,patch){
      const {glyphAtlas,...parameters}=patch;
      if(!glyphAtlas){writeEffectPatch(document,scope,owner,card,parameters);return;}
      const key=effectTrack(scope,owner,card),context=trackContext(key,false);
      const plan=global.EditorClassicV4EffectParameterTiming.partition(registry.effectById[card.id],parameters,{segment:context.segment,wholeSegment:timingArmed?.key===key&&timingArmed.index===context.index,armed:name=>effectParameterArmed.has(effectArmKey(key,name,context.index))});
      // Font/characters and their baked atlas form one atomic authoring operation.
      const trigger=['font','characters','edgeCharacters'].find(name=>Object.hasOwn(parameters,name));
      if(trigger&&Object.hasOwn(plan.timed,trigger))timelineState.setStep(document,key,context.index,patch);
      else{
        let config;for(const [name,value]of Object.entries(parameters))config=effectState.setParam(document,{scope,ownerId:owner&&owner.id,effectId:card.id,key:name,value});
        if(config)config.glyphAtlas=glyphAtlas;
      }
      for(const name of Object.keys(parameters))effectParameterArmed.delete(effectArmKey(key,name,context.index));
    }
    function writeEffectPatch(document,scope,owner,card,patch,writeOptions={}){
      const key=effectTrack(scope,owner,card),definition=registry.effectById[card.id],context=trackContext(key,false),partition=global.EditorClassicV4EffectParameterTiming.partition(definition,patch,{segment:context.segment,atomicKey:writeOptions.atomicKey,wholeSegment:timingArmed?.key===key&&timingArmed.index===context.index,armed:name=>effectParameterArmed.has(effectArmKey(key,name,context.index))});
      if(partition){
        for(const [entry,value]of Object.entries(partition.base)){
          if(entry.startsWith('motion.')){
            const target=scope==='scene'?document:document.entities.find(item=>item.id===owner.id),path=inspectorModel.path(scope,definition),stored=path.reduce((v,k)=>v?.[k],target);
            const config=effectState.setEnabled(document,{scope,ownerId:owner?.id,effectId:card.id},stored?.enabled!==false);assignAt(config,entry,value);
          }else effectState.setParam(document,{scope,ownerId:owner?.id,effectId:card.id,key:entry,value});
        }
        if(card.id==='texture-overlay'&&Object.hasOwn(partition.base,'texture')){
          const config=effectState.setParam(document,{scope,ownerId:owner&&owner.id,effectId:card.id,key:'texture',value:partition.base.texture});
          if(config.motion?.enabled){const type=config.texture,allowed=type==='noise'?['noise-snow','random-hold']:type==='custom'?['pattern-drift','pattern-step','pattern-random']:['pattern-drift','pattern-step','pattern-random','pattern-pulse'];if(!allowed.includes(config.motion.type))config.motion=effectMotionDefaults(allowed[0]);}
        }
        if(Object.keys(partition.timed).length){timelineState.setStep(document,key,context.index,partition.timed);if(!(timingArmed?.key===key&&timingArmed.index===context.index))timingArmed=null;}
        for(const name of Object.keys(patch))effectParameterArmed.delete(effectArmKey(key,name,context.index));return;
      }
      if(shouldWriteTrack(key)){writeTimedPatch(document,key,patch);return;}for(const [entry,value] of Object.entries(patch||{}))effectState.setParam(document,{scope,ownerId:owner&&owner.id,effectId:card.id,key:entry,value});
    }
    function effectColorControl(scope,owner,card,param,values){
      const definition=registry.effectById[card.id],alphaKey=param.alphaKey||'alpha',alphaParam=(definition.params||[]).find(entry=>entry.key===alphaKey),alpha=alphaParam?finite(nested(values,alphaKey,alphaParam.default),alphaParam.default):1,initial=nested(values,param.key,param.default);
      if(typeof global.colorField!=='function'&&!colorControl){const input=root.createElement('input');input.type='color';input.value=/^#[0-9a-f]{6}$/i.test(initial||'')?initial:'#ffffff';input.addEventListener('input',()=>changes.run('设置 '+card.name+' · '+param.label,document=>writeEffectPatch(document,scope,owner,card,{[param.key]:input.value})));return input;}
      let token=null,previousColor=initial,previousAlpha=alpha;
      const finish=()=>{if(!token)return;changes.commit(token);token=null;};
      const change=(nextColor,nextAlpha,final)=>{
        const patch={};if(nextColor!==previousColor)patch[param.key]=nextColor;if(alphaParam&&nextAlpha!==previousAlpha)patch[alphaKey]=nextAlpha;
        if(Object.keys(patch).length){if(!token)token=changes.begin('设置 '+card.name+' · '+param.label);workspace.mutate(document=>writeEffectPatch(document,scope,owner,card,patch));previousColor=nextColor;previousAlpha=nextAlpha;}
        if(final)finish();
      };change.finish=finish;
      return colorControl?colorControl.controls({root,value:initial,alpha,change,label:param.label,allowAlpha:!!alphaParam})[0]:global.colorField(initial,alpha,change,param.label,{alpha:!!alphaParam});
    }
    function effectMotionDefaults(type){const definition=registry.motionById&&registry.motionById[type],result={enabled:true,type};for(const param of definition&&definition.params||[])result[param.key]=param.default;return result;}
    function writeEffectMotion(label,scope,owner,card,operation,primary){
      const before=effectValues(scope,owner,card).motion||{},holder={motion:{...before}};operation(holder.motion,holder);
      const patch={},definition=registry.effectById[card.id];
      for(const [key,value]of Object.entries(holder.motion))if(global.EditorClassicV4EffectParameterTiming.parameter(definition,'motion.'+key)&&(primary==='motion.type'||JSON.stringify(before[key])!==JSON.stringify(value)))patch['motion.'+key]=value;
      if(primary&&Object.keys(patch).length)patch[primary]=holder.motion[primary.slice(7)];
      const key=primary||['motion.enabled','motion.type',...Object.keys(patch)].find(key=>Object.hasOwn(patch,key));if(!key||!Object.keys(patch).length)return;
      changes.run(label,document=>writeEffectPatch(document,scope,owner,card,patch,{atomicKey:key}));
    }
    function renderEffectMotion(grid,scope,owner,card,definition,expanded){
      if(!definition.motion||!definition.motion.length)return;const config=effectValues(scope,owner,card),motion=config.motion||{};let types=definition.motion.filter(id=>registry.motionById&&registry.motionById[id]);
      if(card.id==='texture-overlay')types=types.filter(id=>config.texture==='noise'?['noise-snow','random-hold'].includes(id):config.texture==='custom'?['pattern-drift','pattern-step','pattern-random'].includes(id):!['noise-snow','random-hold'].includes(id));
      if(!types.length)return;
      const defaultActive=card.id==='offset-sampling'&&motion.enabled!==false,active=motion.enabled===true||defaultActive,row=root.createElement('label'),name=root.createElement('span'),body=root.createElement('span'),toggle=root.createElement('input'),button=root.createElement('button'),isPattern=card.id==='texture-overlay';row.className='global-field wide';name.textContent=isPattern?'图案运动':'动态';body.className='v4-motion-head';toggle.type='checkbox';toggle.checked=active;button.type='button';button.className='v4-motion-button'+(active?' active':'');button.textContent=expanded?'参数 ▾':'参数 ▸';body.append(toggle,button);row.append(name,body);grid.append(row);
      toggle.dataset.effectParameter='motion.enabled';effectParameterClock(toggle,scope,owner,card,'motion.enabled');
      toggle.addEventListener('change',()=>{writeEffectMotion((toggle.checked?'启用 ':'关闭 ')+card.name+(isPattern?'图案运动':'动态'),scope,owner,card,(target,holder)=>{if(toggle.checked)holder.motion=Object.assign(effectMotionDefaults(target.type&&types.includes(target.type)?target.type:types[0]),target,{enabled:true});else target.enabled=false;});motionExpanded.add(`effect:${scope}:${owner&&owner.id||'scene'}:${card.id}`);render();});
      button.addEventListener('click',event=>{event.preventDefault();const key=`effect:${scope}:${owner&&owner.id||'scene'}:${card.id}`;motionExpanded.has(key)?motionExpanded.delete(key):motionExpanded.add(key);render();});
      if(!expanded)return;const type=types.includes(motion.type)?motion.type:types[0];
      if(types.length>1)effectParameterField(grid,scope,owner,card,{key:'motion.type',label:'动态方式',type:'select',default:type,timing:'step',options:types,optionLabels:Object.fromEntries(types.map(id=>[id,registry.motionById[id].name]))},config);
      const spec=registry.motionById[type];for(const param of spec.params||[]){if(param.when&&!nested(motion,param.when,spec.params.find(p=>p.key===param.when)?.default))continue;effectParameterField(grid,scope,owner,card,{...param,key:'motion.'+param.key},config);}
    }
    function renderUnevenSampling(grid,scope,owner,card,definition,values){
      const planner=global.EditorClassicV4EffectParameters,plan=planner&&typeof planner.unevenPlan==='function'?planner.unevenPlan(definition,values,scope):null;
      if(plan){for(const param of plan.params)effectParameterField(grid,scope,owner,card,param,values);if(plan.sceneNote){const note=root.createElement('div');note.className='global-note';note.textContent=plan.sceneNote;grid.append(note);}return;}
      const byKey=Object.fromEntries((definition.params||[]).map(param=>[param.key,param]));
      const add=key=>{const param=byKey[key];if(param)field(grid,param.label,effectControl(scope,owner,card,param,values));};
      add('amount');add('coarseness');
      // The sampling field is intrinsic to uneven sampling.  A separate
      // disabled state previously made Runtime fall back to a uniform maximum
      // coarse cell, which read as an unintended second pixelation pass.
      add('field.type');const type=nested(values,'field.type','wave');add('field.contrast');add('field.scale');
      if(type==='wave')add('field.direction');else if(type==='radial'){add('field.centerX');add('field.centerY');}else if(type==='noise')add('field.seed');
      if(scope==='object'){
        add('edge.mode');if(nested(values,'edge.mode','off')!=='off')add('edge.width');
      } else {
        const note=root.createElement('div');note.className='global-note';note.textContent='边缘保护只在对象级可用：完整场景通常没有可供识别的 Alpha 轮廓。';grid.append(note);
      }
    }
    function controllerParameterField(grid,scope,owner,definition,param,values){
      const normalized=global.EditorClassicV4EffectParameterTiming.parameter(definition,param.key),key=controllerTrack(scope,owner,definition);
      const input=global.EditorV4ParameterControls.configure(root.createElement(param.type==='select'?'select':'input'),normalized,nested(values,param.key,param.default));
      if(param.type==='select')for(const option of input.options)option.textContent=param.optionLabels?.[option.value]||option.textContent;
      input.dataset.controllerParameter=param.key;field(grid,param.label,input);
      const status=()=>{const context=trackContext(key,false),arm=effectArmKey(key,param.key,context.index);return{...global.EditorV4ParameterControls.timingTarget(normalized,{segment:context.segment,path:param.key,armed:effectParameterArmed.has(arm)}),context,arm,other:(scene().timeline?.tracks?.[key]?.segments||[]).some((s,index)=>index!==context.index&&Object.hasOwn(s.values||{},param.key))};};
      const button=global.EditorV4ParameterControls.timingButton({root,param:normalized,read:()=>({...status(),title:definition.name+' · 当前时段参数'}),change:()=>{
        const current=status();timingArmed=null;controllerFocus={scope,ownerId:owner?.id||null,controllerId:definition.id};effectFocus=null;
        if(current.has){changes.run('清除 '+param.label+' 时序',doc=>delete timelineState.track(doc,key).segments[current.context.index].values[param.key]);effectParameterArmed.delete(current.arm);}
        else if(effectParameterArmed.has(current.arm))effectParameterArmed.delete(current.arm);else effectParameterArmed.add(current.arm);
        timeline?.setTrack(key,definition.name,{linearKeys:[]});render();
      }});button.dataset.controllerParameterClock=param.key;global.EditorV4ParameterControls.placeTiming(input,button);input.disabled=status().readOnly;
      input.addEventListener('change',()=>{
        const current=status(),value=effectState.normalizeParam(definition,param.key,global.EditorV4ParameterControls.read(input,normalized));
        const partition=global.EditorClassicV4EffectParameterTiming.partition(definition,{[param.key]:value},{segment:current.context.segment,wholeSegment:timingArmed?.key===key&&timingArmed.index===current.context.index,armed:name=>effectParameterArmed.has(effectArmKey(key,name,current.context.index))});
        changes.run('设置 '+definition.name+' · '+param.label,doc=>{
          if(Object.hasOwn(partition.timed,param.key)){effectState.enableController(doc,{scope,ownerId:owner?.id,controllerId:definition.id});timelineState.setStep(doc,key,current.context.index,partition.timed);}
          else effectState.setController(doc,{scope,ownerId:owner?.id,controllerId:definition.id,key:param.key,value});
        });effectParameterArmed.delete(current.arm);render();
      });return input;
    }
    function maskCheckbox(grid,label,value,write){const input=root.createElement('input');input.type='checkbox';input.checked=!!value;input.addEventListener('change',()=>write(input.checked));return field(grid,label,input);}
    function maskPreviewMatches(target){const active=view.maskPreview;return!!active&&active.scope===target.scope&&active.ownerId===target.ownerId&&active.effectId===target.effectId;}
    function syncMaskPreviewButtons(){for(const button of host.querySelectorAll('[data-mask-preview]')){const active=maskPreviewMatches(button.maskPreviewTarget);button.textContent=active?'返回画面':'预览蒙版';button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);}}
    function maskPreviewField(grid,target){
      if(!view.setMaskPreview)return;
      const button=root.createElement('button');button.type='button';button.className='small';button.dataset.maskPreview='true';button.maskPreviewTarget={...target};button.textContent=maskPreviewMatches(target)?'返回画面':'预览蒙版';button.setAttribute('aria-pressed',String(maskPreviewMatches(target)));
      button.addEventListener('pointerdown',event=>event.stopPropagation());
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();view.setMaskPreview(maskPreviewMatches(target)?null:target);});field(grid,'蒙版预览',button,true);
    }
    const selectedMaskShapes=new Map();
    function maskShapeFields(grid,options,mask){
      const key=JSON.stringify([options.scope,options.ownerId,options.effectId]),active=maskEditor?.active;
      const selected=maskState.editable(mask,maskEditor?.isEditing({...options,shapeId:active?.shapeId})?active.shapeId:selectedMaskShapes.get(key));
      let editOptions={...options,...(mask.type==='shapes'?{shapeId:selected.id}:{})};
      const names={rect:'矩形',ellipse:'椭圆',poly:'多边形'};
      const finish=()=>{if(maskEditor?.active&&maskEditor.active.scope===options.scope&&maskEditor.active.ownerId===options.ownerId&&maskEditor.active.effectId===options.effectId)maskEditor.end(true);};
      if(mask.type==='shapes')select(grid,'当前图形',selected.id,mask.shapes.map((s,i)=>({value:s.id,label:s.name||`${i+1} · ${names[s.type]}`})),id=>{const editing=maskEditor?.isEditing(editOptions);finish();selectedMaskShapes.set(key,id);if(editing)maskEditor.begin({...options,shapeId:id});render();},true);
      select(grid,'图形类型',selected.type,Object.entries(names).map(([value,label])=>({value,label})),type=>{finish();changes.run('设置蒙版图形类型',document=>maskState.replaceShape(document,editOptions,maskState.defaults(document,options,type)));},true);
      const actions=root.createElement('span');actions.className='v4-paint-row';
      const button=(text,title,action)=>{const b=root.createElement('button');b.type='button';b.className='small';b.textContent=text;b.title=title;b.addEventListener('click',event=>{event.preventDefault();action();});actions.append(b);return b;};
      button('＋','添加图形',()=>{finish();changes.run('添加蒙版图形',document=>{selectedMaskShapes.set(key,maskState.addShape(document,options,selected.type));});render();}).disabled=mask.type==='shapes'&&mask.shapes.length>=64;
      button('复制','复制当前图形',()=>{finish();changes.run('复制蒙版图形',document=>{selectedMaskShapes.set(key,maskState.addShape(document,options,selected.type,mask.type==='shapes'?selected.id:'shape-1'));});render();}).disabled=mask.type==='shapes'&&mask.shapes.length>=64;
      button('删除','删除当前图形',()=>{finish();changes.run('删除蒙版图形',document=>maskState.removeShape(document,options,selected.id));selectedMaskShapes.delete(key);render();});
      field(grid,'图形操作',actions,true);return{shape:selected,options:editOptions};
    }
    function maskOptions(scope,owner,effectId){if(scope==='scene')return{scope:'scene',effectId};if(scope==='particle-emission'||scope==='particle-motion')return{scope,ownerId:owner.id};return{scope:'object',ownerId:owner.id};}
    function availableMaskAssets(document){return Object.entries(document.assets||{}).filter(([,asset])=>asset&&!asset.internal&&asset.generated!=='text-raster');}
    function availableMaskObjects(document,owner){
      const byId=new Map((document.entities||[]).map(item=>[item.id,item])),ancestors=new Set();let parent=owner?.parentId;
      while(parent&&!ancestors.has(parent)){ancestors.add(parent);parent=byId.get(parent)?.parentId;}
      return(document.entities||[]).filter(item=>item.id!==owner?.id&&!ancestors.has(item.id)&&item.type!=='particle-emitter'&&!item.particleSourceOnly&&item.referenceSourceOnly!==true);
    }
    async function chooseMaskAsset(options){
      if(typeof importMaskAsset!=='function')throw new Error('当前环境无法导入蒙版素材');
      const assetId=await importMaskAsset();
      if(!assetId)return false;
      changes.run('导入并设置 Alpha 蒙版素材',document=>{
        const current=maskState.current(document,options);
        const next=current&&current.type==='alpha'?current:maskState.defaults(document,options,'alpha');
        next.assetId=assetId;
        maskState.set(document,options,next);
      });
      return true;
    }
    function reportMaskImportError(error){const message=error&&error.message||String(error),status=root.getElementById('m-import');if(status)status.textContent='蒙版素材导入失败：'+message;else console.error(error);}
    function ownerFollowMatrix(owner){
      const runtime=global.ToSampoolRuntimeVNext,frame=runtime&&runtime.modules&&runtime.modules.frame&&runtime.modules.frame.create(scene(),+time()||0),values=frame&&owner&&frame.valuesFor(owner);
      return values&&Array.isArray(values.worldMatrix)&&values.worldMatrix.length===6?values.worldMatrix.slice():[1,0,0,1,0,0];
    }
    function maskBehaviorRow(grid,scope,mask,onInvert,onFollow){
      const row=root.createElement('label'),name=root.createElement('span'),body=root.createElement('span'),invert=root.createElement('input'),invertText=root.createElement('span');
      row.className='global-field wide';name.textContent='范围选项';body.className='v4-paint-row';invert.type='checkbox';invert.checked=!!mask.invert;invertText.textContent='反相';invert.addEventListener('change',()=>onInvert(invert.checked));body.append(invert,invertText);
      if(scope!=='scene'&&mask.type!=='element'){
        const follow=root.createElement('input'),followText=root.createElement('span');follow.type='checkbox';follow.checked=!!mask.follow;follow.title='让该静态蒙版跟随对象的变换与成样动态';followText.textContent='跟随';follow.addEventListener('change',()=>onFollow(follow.checked));body.append(follow,followText);
      }
      row.append(name,body);grid.append(row);
    }
    function renderMaskFields(grid,scope,owner,effectId,required,config){
      if(!maskState)return;config=config||{};const particleRange=scope==='particle-emission'||scope==='particle-motion',options=maskOptions(scope,owner,effectId),mask=maskState.current(scene(),options),types=[{value:'none',label:config.defaultType?'默认（完整范围）':required?'未设置（必需）':'无'},{value:'shapes',label:'图形'},{value:'alpha',label:'图片'},{value:'element',label:'场景对象'}],type=root.createElement('select');
      for(const choice of types){const option=root.createElement('option');option.value=choice.value;option.textContent=choice.label;type.append(option);}type.value=mask?['rect','ellipse','poly'].includes(mask.type)?'shapes':mask.type:'none';field(grid,config.label||(scope==='scene'?'范围蒙版':'蒙版'),type,true);
      type.addEventListener('change',()=>{if(maskEditor&&maskEditor.isEditing(options))maskEditor.end(true);const nextType=type.value;if(nextType==='none'){changes.run('清除蒙版',document=>maskState.clear(document,options));return;}if(nextType==='alpha'&&!availableMaskAssets(scene()).length){chooseMaskAsset(options).then(imported=>{if(!imported)render();}).catch(error=>{render();reportMaskImportError(error);});return;}changes.run('设置蒙版类型',document=>{const next=maskState.defaults(document,options,nextType);if(nextType==='alpha')next.assetId=availableMaskAssets(document)[0][0];if(nextType==='element'){const first=availableMaskObjects(document,owner)[0];if(!first)throw new Error('场景中没有可用的蒙版元素或组');next.targetId=first.id;}maskState.set(document,options,next);});});
      if(!mask){if(particleRange&&config.defaultType&&maskEditor){const actions=root.createElement('span'),edit=root.createElement('button');actions.className='v4-paint-row';edit.type='button';edit.className='small';edit.textContent='编辑';edit.addEventListener('click',event=>{event.preventDefault();changes.run('设置'+(config.label||'粒子范围'),document=>maskState.set(document,options,maskState.defaults(document,options,config.defaultType)));maskEditor.begin(options);render();});actions.append(edit);field(grid,'画布范围',actions,true);}return;}
      const update=(label,key,value)=>changes.run(label,document=>{const current=maskState.current(document,options);current[key]=value;maskState.set(document,options,current);});
      maskBehaviorRow(grid,scope,mask,value=>update('设置蒙版反相','invert',value),value=>changes.run(value?'启用蒙版跟随':'关闭蒙版跟随',document=>maskState.setFollow(document,options,value,ownerFollowMatrix(owner))));
      maskPreviewField(grid,options);
      const shapeInfo=['shapes','rect','ellipse','poly'].includes(mask.type)?maskShapeFields(grid,options,mask):{shape:mask,options},editMask=shapeInfo.shape,editOptions=shapeInfo.options;
      if(mask.type==='alpha'){
        const assets=availableMaskAssets(scene()).map(([id,asset])=>({value:id,label:asset.name||id}));if(!assets.some(item=>item.value===mask.assetId))assets.unshift({value:mask.assetId,label:scene().assets[mask.assetId]?.name||mask.assetId});assets.push({value:'__import_file__',label:'从文件导入+'});select(grid,'Alpha 素材',mask.assetId,assets,value=>{if(value==='__import_file__'){chooseMaskAsset(options).then(imported=>{if(!imported)render();}).catch(error=>{reportMaskImportError(error);render();});return;}update('设置 Alpha 蒙版素材','assetId',value);},true);
      }
      if(mask.type==='element'){
        select(grid,'来源处理',mask.sourceQuality||'full',[{value:'full',label:'完整'},{value:'no-sample',label:'不含采样'},{value:'no-decorate',label:'不含加样'},{value:'base',label:'不含加样与采样'}],value=>update('设置蒙版来源处理','sourceQuality',value),true);
        const shown=root.createElement('input');shown.type='checkbox';shown.checked=!!mask.showSource;shown.addEventListener('change',()=>update('设置蒙版来源显示','showSource',shown.checked));field(grid,'显示来源',shown);
        const choices=availableMaskObjects(scene(),owner).map(item=>({value:item.id,label:item.name||item.id}));if(!choices.some(item=>item.value===mask.targetId)){const currentSource=(scene().entities||[]).find(item=>item.id===mask.targetId);if(currentSource)choices.unshift({value:currentSource.id,label:currentSource.name||currentSource.id});}select(grid,'引用对象',mask.targetId,choices,value=>update('设置元素蒙版来源','targetId',value),true);
      }
      if(['alpha','element'].includes(mask.type))select(grid,'提取方式',mask.mode||'alpha',[{value:'alpha',label:'透明度'},{value:'luma',label:'亮度'}],value=>update('设置蒙版提取方式','mode',value));
      const editing=mask.type!=='element'&&maskEditor&&maskEditor.isEditing(editOptions);
      if(mask.type!=='element'&&maskEditor){const actions=root.createElement('span'),edit=root.createElement('button');actions.className='v4-paint-row';edit.type='button';edit.className='small';edit.textContent=editing?'完成':'编辑';edit.addEventListener('click',event=>{event.preventDefault();maskEditor.isEditing(editOptions)?maskEditor.end(false):maskEditor.begin(editOptions);});actions.append(edit);if(editMask.type==='poly'&&!editing){const redraw=root.createElement('button');redraw.type='button';redraw.className='small';redraw.textContent='点选重绘';redraw.addEventListener('click',event=>{event.preventDefault();maskEditor.begin(editOptions,{recreate:true});});actions.append(redraw);}field(grid,'画布范围',actions,true);}
      if(editing){const range=maskState.bounds(editMask);if(range)for(const key of ['x','y','w','h'])number(grid,key.toUpperCase(),range[key],value=>changes.run('设置蒙版 '+key,document=>{const current=maskState.bounds(maskState.editable(maskState.current(document,options),editOptions.shapeId));current[key]=key==='w'||key==='h'?Math.max(1,value):value;maskState.setBounds(document,editOptions,current);}),{min:key==='w'||key==='h'?1:undefined,step:1});}
      if(editMask.type==='poly'){const note=root.createElement('div');note.className='global-note';note.textContent=`${editMask.points.length} 个点 · 绿框可拖点、点边插点；点选重绘后双击或 Enter 闭合`;grid.append(note);}
    }
    function renderControllerCards(scope,owner,model){const parent=scope==='scene'?globalTabs:elementTabs;for(const definition of model.controllers){const focused=controllerFocus&&controllerFocus.scope===scope&&controllerFocus.ownerId===(owner&&owner.id||null)&&controllerFocus.controllerId===definition.id,block=section(definition.name,definition.purpose),values=controllerValues(scope,owner,definition);block.wrap.dataset.v4ControllerId=definition.id;block.wrap.dataset.v4Rule='true';block.wrap.classList.toggle('active',focused);block.wrap.addEventListener('pointerdown',()=>{controllerFocus={scope,ownerId:owner&&owner.id||null,controllerId:definition.id};effectFocus=null;showTrackTiming(parent,controllerTrack(scope,owner,definition),definition.name,[]);});for(const param of definition.params||[])if(effectParamVisible(param,values))controllerParameterField(block.grid,scope,owner,definition,param,values);host.append(block.wrap);}}
    function overlayPattern(values){
      const codec=global.EditorClassicV4OverlayPatternCodec;if(codec&&typeof codec.fromEffect==='function')return codec.fromEffect(values);
      const texture=values.texture||'lines-horizontal',base={phaseX:Math.max(0,Math.min(1,finite(values.phaseX,0))),phaseY:Math.max(0,Math.min(1,finite(values.phaseY,0))),color:values.color||'#ffffff'};
      if(texture==='noise')return Object.assign(base,{type:'noise',density:Math.max(0,Math.min(1,finite(values.noiseDensity,.18))),size:Math.max(1,Math.round(finite(values.noiseSize,1))),seed:Math.round(finite(values.noiseSeed,1))});
      if(texture==='dots'){
        const shape=values.shape||'circle',point={circle:{sides:4,roundness:1},triangle:{sides:3,roundness:0},square:{sides:4,roundness:0},pentagon:{sides:5,roundness:0},hexagon:{sides:6,roundness:0}}[shape]||{sides:4,roundness:1};
        return Object.assign(base,{type:'dots',size:Math.max(1,finite(values.size,1)),spacing:Math.max(1,finite(values.spacing,4)),angle:finite(values.angle,0),shape,sides:point.sides,roundness:point.roundness,layout:values.layout==='stagger'?'stagger':'regular',phase:Math.max(0,Math.min(1,finite(values.rowPhase,.5)))});
      }
      const spacing=Math.max(1,finite(values.spacing,4)),width=Math.max(1,Math.min(spacing,finite(values.size,1))),angle=finite(values.angle,0),layers=[{angle,width,spacing}];if(texture==='grid')layers.push({angle:angle+90,width,spacing});if(texture==='lines-layers'){layers.push({angle:finite(values.layer2Angle,angle+90),width:Math.max(1,finite(values.layer2Width,1)),spacing:Math.max(1,finite(values.layer2Spacing,spacing))});layers.push({angle:finite(values.layer3Angle,angle+135),width:Math.max(1,finite(values.layer3Width,1)),spacing:Math.max(1,finite(values.layer3Spacing,spacing))});}return Object.assign(base,{type:'lines',lineMode:texture==='grid'?'grid':texture==='lines-layers'?'layers':'line',layers});
    }
    function overlayPatch(pattern,values){const codec=global.EditorClassicV4OverlayPatternCodec;if(codec&&typeof codec.toEffect==='function')return codec.toEffect(pattern);const style=textureStyle(pattern),patch={phaseX:Math.max(0,Math.min(1,finite(pattern.phaseX,0))),phaseY:Math.max(0,Math.min(1,finite(pattern.phaseY,0)))};if(style==='noise')return Object.assign(patch,{texture:'noise',noiseDensity:Math.max(0,Math.min(1,finite(pattern.density,.18))),noiseSize:Math.max(1,Math.round(finite(pattern.size,1))),noiseSeed:Math.round(finite(pattern.seed,1))});if(style==='dots')return Object.assign(patch,{texture:'dots',size:Math.max(1,finite(pattern.size,1)),spacing:Math.max(1,finite(pattern.spacing,pattern.cell||4)),angle:finite(pattern.angle,0),shape:pattern.roundness>=.98?'circle':({3:'triangle',4:'square',5:'pentagon',6:'hexagon'}[Math.round(finite(pattern.sides,4))]||'circle'),layout:pattern.layout==='stagger'?'stagger':'regular',rowPhase:Math.max(0,Math.min(1,finite(pattern.phase,.5)))});const layers=pattern.layers||[],first=layers[0]||{angle:0,width:1,spacing:4};Object.assign(patch,{texture:style==='grid'?'grid':style==='layers'?'lines-layers':'lines-horizontal',angle:finite(first.angle,0),size:Math.max(1,finite(first.width,1)),spacing:Math.max(1,finite(first.spacing,4))});if(style==='layers'){const second=layers[1]||{},third=layers[2]||{};Object.assign(patch,{layer2Angle:finite(second.angle,90),layer2Width:Math.max(1,finite(second.width,1)),layer2Spacing:Math.max(1,finite(second.spacing,4)),layer3Angle:finite(third.angle,135),layer3Width:Math.max(1,finite(third.width,1)),layer3Spacing:Math.max(1,finite(third.spacing,4))});}return patch;}
    function renderTextureOverlay(grid,scope,owner,card,definition,values){
      const colorParam=(definition.params||[]).find(param=>param.key==='color');
      const alphaParam=(definition.params||[]).find(param=>param.key==='alpha');
      const blendParam=(definition.params||[]).find(param=>param.key==='blend');
      const custom=values.texture==='custom';
      if(colorParam&&!custom)effectParameterField(grid,scope,owner,card,colorParam,values);
      if(custom&&alphaParam)effectParameterField(grid,scope,owner,card,{...alphaParam,label:'整体透明度'},values);
      const detail=inlineTextureEditor(overlayPattern(values),values.color||'#ffffff',(label,pattern,meta)=>{
        const patch=meta?global.EditorClassicV4OverlayPatternCodec.editPatch(meta.before,pattern,meta.key):overlayPatch(pattern,values);
        if(Object.keys(patch).length)changes.run(label,document=>writeEffectPatch(document,scope,owner,card,patch,{atomicKey:meta?.key}));
      },{
        parameterTiming:(input,key)=>{input.dataset.effectParameter=key;const status=effectParameterClock(input,scope,owner,card,key);if(!status)throw Error('纹理字段尚未登记：'+key);input.setAttribute('aria-disabled',String(!!status.readOnly));},
        readOnly:key=>!!effectParameterStatus(scope,owner,card,key)?.readOnly,
        captureContext:()=>({revision:workspace.revision,time:+time()||0}),
        sameContext:stamp=>stamp.revision===workspace.revision&&stamp.time===(+time()||0)
      });
      field(grid,'图样设置',detail,true);
      if(blendParam)effectParameterField(grid,scope,owner,card,blendParam,values);
      if(values.blend==='hard-mix'){
        const note=root.createElement('div');note.className='global-note';
        note.textContent='实色混合需逐像素处理；大画布连续播放建议使用 Draft 预览。';
        grid.append(note);
      }
    }
    function renderEffectParameters(grid,scope,owner,card,definition,values,motionOpen,motionActive){
      const planner=global.EditorClassicV4EffectParameters;
      const plan=planner&&typeof planner.plan==='function'?planner.plan(card,definition,values):{special:null,params:(definition.params||[]).filter(param=>effectParamVisible(param,values)&&!(param.key==='alpha'&&(definition.params||[]).some(entry=>entry.type==='color')))};
      const crtMotionParams=['noise','flicker','sweep'];
      if(plan.special==='uneven')renderUnevenSampling(grid,scope,owner,card,definition,values);
      else if(plan.special==='texture')renderTextureOverlay(grid,scope,owner,card,definition,values);
      else for(const param of plan.params){
        if(card.id==='crt-display'&&crtMotionParams.includes(param.key))continue;
        effectParameterField(grid,scope,owner,card,param,values);
      }
      renderEffectMotion(grid,scope,owner,card,definition,motionOpen);
      if(card.id==='crt-display'&&motionOpen&&motionActive)for(const key of crtMotionParams){
        const param=(definition.params||[]).find(entry=>entry.key===key);if(param)effectParameterField(grid,scope,owner,card,param,values);
      }
      if(scope==='scene'&&definition.mask!=='object')renderMaskFields(grid,'scene',null,card.id,definition.mask==='required');
    }
    function renderEffects(scope,owner,page){
      const model=inspectorModel.create(scope,owner||scene()),pages=page==='all'?['overlay','sample']:[page],cards=pages.flatMap(name=>model.cardsFor(name)),showControllers=pages.includes('sample');
      const pageName=scope==='scene'?(page==='sample'?'采样滤镜':'叠加滤镜'):(page==='sample'?'采样':'加样');
      if(title)title.textContent=pageName+' Inspector';
      header('INSPECTOR · '+pageName,scope==='scene'?'场景':owner.name||owner.id,'');
      const effectHeading=root.createElement('div');effectHeading.className='v4-panel-heading';effectHeading.textContent=scope==='scene'?pageName:page==='sample'?'采样效果':'加样效果';host.append(effectHeading);
      if(showControllers)renderControllerCards(scope,owner,model);
      if(!cards.length&&!showControllers){const empty=section('暂无可用效果');host.append(empty.wrap);return;}
      let focus=effectFocus&&effectFocus.scope===scope&&effectFocus.ownerId===(owner&&owner.id||null)&&cards.find(card=>card.id===effectFocus.effectId);
      if(!focus&&!controllerFocus)focus=cards.find(card=>card.present)||cards[0];
      if(focus)effectFocus={scope,ownerId:owner&&owner.id||null,effectId:focus.id};
      for(const card of cards){
        const definition=registry.effectById[card.id],config=effectConfig(scope,owner,card),values=config?effectValues(scope,owner,card):null,enabled=card.enabled,motionKey=`effect:${scope}:${owner&&owner.id||'scene'}:${card.id}`,motionOpen=motionExpanded.has(motionKey),motionConfig=values&&values.motion,motionActive=motionConfig&&motionConfig.enabled!==false||card.id==='offset-sampling'&&(!motionConfig||motionConfig.enabled!==false),effectCardModule=global.EditorClassicV4InspectorEffectCard;
        const onToggleMotion=()=>{motionOpen?motionExpanded.delete(motionKey):motionExpanded.add(motionKey);render();},effectCardUi=effectCardModule&&typeof effectCardModule.create==='function'?effectCardModule.create({root,section,card:Object.assign({},card,{enabled}),definition,scope,focused:!!(focus&&focus.id===card.id&&!controllerFocus),motionActive,motionOpen,onToggleMotion}):null;
        let block,head,label,toggle;
        if(effectCardUi){block=effectCardUi.block;toggle=effectCardUi.toggle;}
        else{block=section(card.name,card.purpose);head=root.createElement('label');label=root.createElement('span');toggle=root.createElement('input');if(definition.motion&&definition.motion.length){const motionButton=root.createElement('button');motionButton.type='button';motionButton.className='v4-motion-title-button'+(motionActive?' active':'');motionButton.textContent=motionOpen?'动 ▾':'动 ▸';motionButton.title='展开当前效果的动态参数';motionButton.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();onToggleMotion();});block.heading.append(motionButton);}head.className='global-field wide';label.textContent='启用';toggle.type='checkbox';toggle.checked=enabled;toggle.disabled=!card.editable;head.append(label,toggle);block.grid.append(head);block.wrap.dataset.v4EffectId=card.id;block.wrap.dataset.v4EffectScope=scope;block.wrap.classList.toggle('active',!!(focus&&focus.id===card.id&&!controllerFocus));}
        block.wrap.addEventListener('pointerdown',()=>{effectFocus={scope,ownerId:owner&&owner.id||null,effectId:card.id};controllerFocus=null;if(card.present)showTrackTiming(scope==='scene'?globalTabs:elementTabs,effectTrack(scope,owner,card),card.name,effectLinearKeys(card));});
        if(card.id==='color-map'&&palettePending?.scope===scope&&palettePending.ownerId===(owner&&owner.id||null)&&palettePending.patch.enabled){toggle.checked=true;toggle.disabled=true;}
        if(card.id==='color-map')toggle.addEventListener('change',event=>{
          const current=values||effectState.defaults(definition);
          if(toggle.checked&&current.mode!=='gradient'&&(!current.palette||current.palette==='auto')&&!global.ToSampoolRuntimeVNext.modules.sampling.extractedPalette(current)){event.stopImmediatePropagation();effectFocus={scope,ownerId:owner&&owner.id||null,effectId:card.id};controllerFocus=null;updateColorMap(scope,owner,card,{enabled:true},toggle,true);}
        },true);
        toggle.addEventListener('change',event=>{event.stopPropagation();changes.run((toggle.checked?'全局启用 ':'全局停用 ')+card.name,document=>{const next=effectState.setEnabled(document,{scope,ownerId:owner&&owner.id,effectId:card.id},toggle.checked);if(toggle.checked&&card.id==='offset-sampling')next.motion=Object.assign(effectMotionDefaults('sampling-step'),next.motion||{},{enabled:true});if(toggle.checked&&scope==='scene'&&definition.mask==='required'&&!next.mask&&maskState)maskState.set(document,{scope:'scene',effectId:card.id},maskState.defaults(document,{scope:'scene',effectId:card.id},'rect'));return next;});effectFocus={scope,ownerId:owner&&owner.id||null,effectId:card.id};controllerFocus=null;render();});
        if(config)renderEffectParameters(block.grid,scope,owner,card,definition,values,motionOpen,motionActive);
        host.append(block.wrap);
      }
      const controller=controllerFocus&&controllerFocus.scope===scope&&controllerFocus.ownerId===(owner&&owner.id||null)&&model.controllers.find(item=>item.id===controllerFocus.controllerId);
      if(controller&&controllerConfig(scope,owner,controller))showTrackTiming(scope==='scene'?globalTabs:elementTabs,controllerTrack(scope,owner,controller),controller.name,[]);
      else if(focus&&focus.present)showTrackTiming(scope==='scene'?globalTabs:elementTabs,effectTrack(scope,owner,focus),focus.name,effectLinearKeys(focus));
      else if(timing)timing.style.display='none';
    }
    function renderScene(){
      setTabs('scene');if(sceneTab==='overlay')return renderEffects('scene',null,'overlay');if(sceneTab==='sampling')return renderEffects('scene',null,'sample');if(title)title.textContent='场景 Inspector';
      if(timeline)timeline.setSceneBackgroundTrack();
      header('INSPECTOR · 成样','画布与背景','场景成样只管理画布、背景与 Scene 入口过渡。');
      const canvas=section('画布');number(canvas.grid,'宽度',scene().width,value=>mutate('设置画布宽度',null,target=>target.width=Math.max(1,Math.round(value))),{min:1,step:1});number(canvas.grid,'高度',scene().height,value=>mutate('设置画布高度',null,target=>target.height=Math.max(1,Math.round(value))),{min:1,step:1});number(canvas.grid,'周期时间',scene().loop,value=>mutate('设置周期时间',null,target=>target.loop=Math.max(.05,value)),{min:.05,step:.1,wide:true});host.append(canvas.wrap);
      const sceneContext=sceneBackgroundContext(scene(),false),bg=sceneBackgroundValues(),background=section('背景',`当前 Scene：${sceneContext.current.segment&&sceneContext.current.segment.name||`场景 ${sceneContext.current.index+1}`} · 背景跟随 Scene 分段。`);
      const sceneFill=paintRow(background.grid,'填充',true,()=>{},scenePaint(bg.color||'#000000',finite(bg.alpha,1),bg.fillPaint));sceneFill.querySelector('input[type="checkbox"]')?.remove();
      const pattern=bg.fillPattern,textureOn=!!(pattern&&pattern.type&&pattern.type!=='none'),textureControls=[],textureDetail=textureOn?inlineTextureEditor(pattern,pattern.color||bg.color||'#ffffff',(label,next)=>writeSceneBackground(label,{fillPattern:next})):null;
      if(textureOn)textureControls.push(...sceneColor('纹理颜色',pattern.color||bg.color||'#ffffff',pattern.opacity,(nextColor,nextAlpha)=>({fillPattern:Object.assign({},pattern,{color:nextColor,opacity:nextAlpha})})));
      paintRow(background.grid,'纹理填充',textureOn,checked=>writeSceneBackground(checked?'启用背景纹理':'关闭背景纹理',checked?{fillPattern:partsState.defaultTexture('lines',bg.color||'#ffffff')}:{fillPattern:null}),textureControls,textureDetail);
      host.append(background.wrap);if(timing)timing.style.display='none';
      const rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4))),current=timelineState.sceneAt(scene(),rel),segment=current.segment||{},transition=Object.assign({type:'none',duration:.25,direction:'right',cell:6,seed:13},segment.transition||{}),transitionBlock=section('过渡',`当前 Scene：${segment.name||`场景 ${current.index+1}`} · 在此段开头，以前一 Scene 画面自然切入。`),writeTransition=(label,key,value)=>changes.run(label,document=>{const target=timelineState.sceneSegments(document,true)[current.index];target.transition=Object.assign({type:'none',duration:.25,direction:'right',cell:6,seed:13},target.transition||{});target.transition[key]=value;});
      if(transition.type==='scan'){transition.type='wipe';transition.direction='down';}
      select(transitionBlock.grid,'场景切换',transition.type,[{value:'none',label:'无过渡'},{value:'blackout',label:'黑场转场'},{value:'fade',label:'淡入淡出'},{value:'wipe',label:'扫描擦除'},{value:'dissolve',label:'溶解'}],value=>writeTransition('设置场景过渡','type',value),true);number(transitionBlock.grid,'持续时间',transition.duration,value=>writeTransition('设置过渡持续时间','duration',Math.max(.01,value)),{min:.01,step:.05});if(transition.type==='blackout'){let colorToken=null;const finish=()=>{if(colorToken){changes.commit(colorToken);colorToken=null;}},writeColor=(next,unused,final)=>{if(!colorToken)colorToken=changes.begin('设置转场颜色');workspace.mutate(document=>{const target=timelineState.sceneSegments(document,true)[current.index];target.transition=Object.assign({type:'blackout',duration:.25,color:'#000000'},target.transition||{},{color:next});});if(final)finish();};writeColor.finish=finish;const control=typeof global.colorField==='function'?global.colorField(transition.color||'#000000',1,writeColor,'转场颜色',{alpha:false}):paintColor(transition.color||'#000000',next=>writeTransition('设置转场颜色','color',next),1,()=>{});for(const node of(Array.isArray(control)?control:[control]))field(transitionBlock.grid,'转场颜色',node);}if(transition.type==='wipe')select(transitionBlock.grid,'方向',transition.direction,[{value:'right',label:'向右'},{value:'left',label:'向左'},{value:'down',label:'向下'},{value:'up',label:'向上'}],value=>writeTransition('设置扫描方向','direction',value));if(transition.type==='dissolve'){number(transitionBlock.grid,'溶解颗粒',transition.cell,value=>writeTransition('设置溶解颗粒', 'cell',Math.max(1,Math.round(value))),{min:1,max:128,step:1});number(transitionBlock.grid,'随机种子',transition.seed,value=>writeTransition('设置溶解种子','seed',Math.round(value)),{min:0,step:1});}host.append(transitionBlock.wrap);
    }
    function renderMulti(ids){objectTab='props';setTabs('object');if(title)title.textContent='多选 Inspector';header('INSPECTOR · 多选',ids.length+' 个对象','联合框负责整体变换；批量属性将在对应 Registry 字段迁移后开放。');}
    function renderPartMulti(owner,ids){objectTab='props';setTabs('part',owner);if(title)title.textContent='图元多选 Inspector';header('INSPECTOR · 图元多选',ids.length+' 个图元',`${owner.name||owner.id} · 联合青框负责整体移动、缩放、旋转和镜像；外观仍按图元分别保留。`);}
    function renderMedia(item){if(!item||item.type!=='image')return;const descriptor=scene().assets&&scene().assets[item.assetId],frames=Array.isArray(descriptor&&descriptor.frames)?descriptor.frames.length:Math.max(1,+item.frames||1);if(frames<2)return;const media=section('多帧',`${frames} 帧 · 帧顺序来自素材库，图层只保存播放方式。`),id=item.id;number(media.grid,'帧率',item.fps||descriptor.fps||8,value=>mutate('设置多帧帧率',id,target=>target.fps=Math.max(.1,value)),{min:.1,max:60,step:.1});const row=root.createElement('label');row.className='global-field';const text=root.createElement('span');text.textContent='循环播放';const input=root.createElement('input');input.type='checkbox';input.checked=item.frameLoop!==false;input.addEventListener('change',()=>mutate('设置多帧循环',id,target=>target.frameLoop=input.checked));row.append(text,input);media.grid.append(row);host.append(media.wrap);}
    // Paint belongs to the part, never to the object's timing track.  Keeping this
    // renderer shared lets a single-part vector expose the same concise paint rows
    // while its yellow object selection remains active.
    function renderStrokeSettings(grid,owner,part){
      if(part?.type==='custom')return;
      const component=global.EditorClassicV4StrokeStyle;if(!component)return;
      const values=part?(timedValues(owner).parts||[]).find(item=>item.id===part.id)||part:timedValues(owner);
      component.render(grid,values,{root,scene:scene(),ownerId:owner.id,strokeEnabled:!!values.stroke&&+values.strokeWidth>0,
      parameterTiming:(input,key,label)=>formationClock(input,owner,'path',key,part,label),write:(key,value,label)=>{
        if(key==='pathEndpoints.sourceId'&&value){const valid=global.ToSampoolRuntimeVNext.modules.pathInstances.canReference(scene(),owner.id,value);if(!valid.ok)throw Error(valid.reason);}
        const linked={};if(key==='polygonMode'&&value==='free'&&values.polygonMode==='regular'){
          const draft=JSON.parse(JSON.stringify(values));component.set(draft,key,value);linked.points=draft.points;
        }
        writeFormation('设置描线 '+label,owner,'path',key,value,part,{linked,base:content=>component.set(content,key,value)});
      }});
    }
    function renderExtensionEntry(owner,part){
      if(!global.EditorClassicV4PathExtensions)return;
      const block=section('拓展'),button=root.createElement('button');button.type='button';button.className='small';button.dataset.pathExtensionEntry='';
      button.textContent=part?'编辑拓展 · '+(part.name||part.id):'选择图元并拓展';
      button.addEventListener('click',()=>{finishExtensionColor();extensionFocus={ownerId:owner.id,partId:part===owner?'@self':part?part.id:null};if(part&&part!==owner)view.selectPart(owner.id,part.id);render();});
      block.grid.append(button);host.append(block.wrap);
    }
    function renderExtensionPage(owner,part){
      setTabs(part?'part':'object',owner);if(title)title.textContent='图元拓展';if(timing)timing.style.display=part&&global.ToSampoolRuntimeVNext.modules.pathGenerators?.active(part)?'':'none';
      header('INSPECTOR · 拓展',part?(part.name||part.id):(owner.name||owner.id),'显示与变换继承所属对象。');
      if(!part){
        const block=section('目标图元');select(block.grid,'选择图元','',[{value:'',label:'请选择图元'},...(owner.parts||[]).map(p=>({value:p.id,label:p.name||p.id}))],id=>{
          if(!id)return;extensionFocus={ownerId:owner.id,partId:id};view.selectPart(owner.id,id);render();
        },true);host.append(block.wrap);return;
      }
      const component=global.EditorClassicV4PathExtensions;
      const partKey=part===owner?'@self':part.id;
      const rel=Math.max(0,Math.min(1,(+time()||0)/Math.max(.001,+scene().loop||4))),evaluated=global.ToSampoolRuntimeVNext.modules.timeline.valuesFor(inspectorTimelineScene(),owner.id,owner,rel),displayPart=part===owner?evaluated:evaluated.parts?.find(p=>p.id===part.id)||part;
      const parameterPath=key=>(part===owner?'':`partsById.${encodeURIComponent(part.id).replace(/\./g,'%2E')}.`)+'recipe.params.'+key;
      component.render(host,displayPart,{root,colorControl,scene:scene(),ownerId:owner.id,time:time(),finish:finishExtensionColor,
        parameterTiming:(input,param,binding)=>{
          const capability=global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(param);if(capability.timing==='No')return;
          const prefix=binding?.generatorId?(part===owner?'':`partsById.${encodeURIComponent(part.id).replace(/\./g,'%2E')}.`)+global.ToSampoolRuntimeVNext.modules.pathGenerators.prefix(binding.generatorId):null;
          const path=prefix?prefix+param.key:parameterPath(param.key),context=propertyContext(owner,false),armKey=extensionArmKey(owner.id,path,context.index),status=global.EditorV4ParameterControls.timingTarget(param,{segment:context.segment,path,armed:extensionParameterArmed.has(armKey)}),has=status.has,armed=extensionParameterArmed.has(armKey);
          const currentStatus=()=>{const now=propertyContext(owner,false),next=global.EditorV4ParameterControls.timingTarget(param,{segment:now.segment,path,armed:extensionParameterArmed.has(extensionArmKey(owner.id,path,now.index))});return{...next,segmentType:now.segment?.type,other:(scene().timeline?.tracks?.[owner.id]?.segments||[]).some((segment,index)=>index!==now.index&&Object.hasOwn(segment.values||{},path))};};
          const button=global.EditorV4ParameterControls.timingButton({root,param,read:()=>({...currentStatus(),title:'当前时段参数'}),change:()=>{const now=propertyContext(owner,false),next=currentStatus(),key=extensionArmKey(owner.id,path,now.index);if(next.has){runParameterTiming('清除图样参数时序',doc=>{delete timelineState.track(doc,owner.id).segments[now.index].values[path];});extensionParameterArmed.delete(key);}else if(extensionParameterArmed.has(key))extensionParameterArmed.delete(key);else extensionParameterArmed.add(key);timeline?.setTrack(owner.id,owner.name||owner.id,{linearKeys:objectLinearKeys(owner)});render();}});button.dataset.parameterTiming=param.key;button.dataset.parameterPath=path;if(binding?.generatorId)button.dataset.parameterGenerator=binding.generatorId;
          if(context.segment?.type==='linear'&&(!binding?.generatorId||input.tagName!=='FIELDSET'))input.disabled=true;
          button.dataset.channelLabel=param.label;button.dataset.colorTimingChannel=param.type==='color'?'color':'alpha';
          global.EditorV4ParameterControls.placeTiming(input,button);
          configureColorTimingBatch(input);
          if(binding?.generatorId)button.addEventListener('click',()=>{
            const current=scene().entities.find(item=>item.id===owner.id);if(!current)return;
            const evaluated=timedValues(current),source=part===owner?evaluated:evaluated.parts?.find(item=>item.id===part.id);
            syncTimingPaint(input,source?.extensions?.[binding.generatorId]?.params);
          });
          return status;
        },
        add:()=>{finishExtensionColor();root.getElementById('toolbar-pattern')?.click();},
        remove:id=>{finishExtensionColor();changes.run('移除图样 · '+global.EditorV4PatternRegistry.byId(id).name,document=>{
          const target=document.entities.find(item=>item.id===owner.id),source=target&&(part===owner?target:target.parts?.find(p=>p.id===part.id));
          if(!source)throw Error('目标图元已不存在');global.EditorV4PatternRegistry.remove(source,id,document);
        });},
        editing:instanceEditor?.target?.ownerId===owner.id&&instanceEditor?.target?.partId===partKey,
        editSample:instanceEditor?()=>{finishExtensionColor();instanceEditor.toggle(owner.id,partKey);}:null,
        write:(key,next,label,final)=>{
        const operation=document=>{
          const target=(document.entities||[]).find(item=>item.id===owner.id),source=target&&(part===owner?target:(target.parts||[]).find(p=>p.id===part.id));
          if(source){
            if(key.startsWith('generator|')){
              const [,id,name]=key.split('|'),config=source.extensions?.[id];if(!config?.definition)throw Error('目标图样已移除');
              const draft=JSON.parse(JSON.stringify(source));component.set(draft,key,next);
              const prefix=(part===owner?'':`partsById.${encodeURIComponent(part.id).replace(/\./g,'%2E')}.`)+'extensionsById.'+encodeURIComponent(id).replace(/\./g,'%2E')+'.';
              const context=propertyContext(owner,false),wholeSegment=timingArmed?.key===owner.id&&timingArmed.index===context.index&&!timingArmed.motionId,patch={},baseParams={...config.params};let baseChanged=false;
              if(name==='enabled'){
                if(shouldWriteTiming(owner.id)){if(context.segment?.type==='linear')throw Error('请在过渡两侧设置图样参数');patch[prefix+'enabled']=draft.extensions[id].enabled;}else source.extensions=draft.extensions;
              }else for(const p of config.definition.parameters){
                if(name!==p.key&&!(name==='$paint'&&(next.changedKeys||[next.key,next.alphaKey]).includes(p.key)))continue;
                const path=prefix+'params.'+p.key,armKey=extensionArmKey(owner.id,path,context.index),status=global.EditorV4ParameterControls.timingTarget(p,{segment:context.segment,path,armed:extensionParameterArmed.has(armKey),wholeSegment});
                if(status.readOnly)throw Error('请在过渡两侧设置图样参数');
                if(status.target==='segment')patch[path]=draft.extensions[id].params[p.key];else{baseParams[p.key]=draft.extensions[id].params[p.key];baseChanged=true;}
                extensionParameterArmed.delete(armKey);
              }
              if(baseChanged)source.extensions={...source.extensions,[id]:{...config,params:baseParams}};
              if(Object.keys(patch).length){timelineState.setStep(document,owner.id,context.index,patch);timingArmed=null;}return;
            }
            if(key.startsWith('provider.')){
              if(key==='provider.$paint'){
                const definition=source.recipe?.definition,binding=definition?.controls?.find(c=>c.component==='color-alpha'&&c.key===next.key&&c.alphaKey===next.alphaKey);if(!binding)throw Error('颜色组件绑定无效');
                const context=propertyContext(owner,false),patch={};
                for(const [name,value]of [[binding.key,next.color],[binding.alphaKey,next.alpha]]){
                  const path=parameterPath(name),parameter=definition.parameters.find(p=>p.key===name),capability=global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(parameter),armed=extensionParameterArmed.has(extensionArmKey(owner.id,path,context.index)),has=Object.hasOwn(context.segment?.values||{},path);
                  if(capability.timing!=='No'&&(armed||has)){if(context.segment?.type==='linear')throw Error('请在过渡两侧设置参数');patch[path]=value;}
                  else component.set(source,'provider.'+name,value);
                }
                if(Object.keys(patch).length)timelineState.setStep(document,owner.id,context.index,patch);
                for(const name of [binding.key,binding.alphaKey])extensionParameterArmed.delete(extensionArmKey(owner.id,parameterPath(name),context.index));return;
              }
              const parameter=source.recipe?.definition?.parameters.find(p=>p.key===key.slice(9)),path=parameterPath(key.slice(9)),context=propertyContext(owner,false),capability=parameter&&global.ToSampoolRuntimeVNext.modules.parameterTiming.capability(parameter);
              const armKey=extensionArmKey(owner.id,path,context.index),armed=extensionParameterArmed.has(armKey),has=Object.hasOwn(context.segment?.values||{},path);
              if(capability?.timing!=='No'&&(armed||has)){if(context.segment?.type==='linear')throw Error('请在过渡两侧设置参数');timelineState.setStep(document,owner.id,context.index,{[path]:next});extensionParameterArmed.delete(armKey);return;}
            }
            const draft=Object.assign({},source);component.set(draft,key,next);
            if(source.type==='custom'){source.recipe=draft.recipe;source.stroke=draft.stroke;source.strokeWidth=draft.strokeWidth;source.strokeAlpha=draft.strokeAlpha;return;}
            const config=draft.extensions.elements;
            if(config.enabled&&config.sourceId){const valid=global.ToSampoolRuntimeVNext.modules.pathInstances.canReference(document,owner.id,config.sourceId);if(!valid.ok)throw new Error(valid.reason);}
            source.extensions=draft.extensions;
            if(key==='elements.sourceId')global.EditorV4ElementReferences?.prunePrivate(document);
          }
        };
        if(final===false){if(!extensionColorToken)extensionColorToken=changes.begin('设置拓展颜色');workspace.mutate(operation);}
        else if(extensionColorToken){workspace.mutate(operation);finishExtensionColor();}
        else changes.run('设置拓展 · '+label,operation);
      }});
    }
    function renderPartAppearance(owner,part){
      if(part.recipe?.definition?.format==='tosampool-pattern-generator/v1'){renderExtensionEntry(owner,part);return;}
      if(part.type==='custom'&&!global.ToSampoolRuntimeVNext.modules.customShapes.supports(part.recipe)){
        const cached=section('外观'),note=root.createElement('div');note.className='inspector-note';note.dataset.patternAppearanceLocked='';note.textContent='保留图样缓存；颜色、粗细及内部参数暂不可编辑。';cached.grid.append(note);host.append(cached.wrap);if(view.selectedPartId!==part.id)renderExtensionEntry(owner,part);return;
      }
      const appearance=section('外观','路径描线、纯色和纹理是三个独立开关；颜色透明度只影响对应 Paint，不改变图元整体透明度。');
      if(part.type==='rect')number(appearance.grid,'圆角',part.radius||0,value=>mutatePart('设置图元圆角',owner.id,part.id,target=>target.radius=Math.max(0,Math.min(value,target.w/2,target.h/2))),{min:0,step:1});
      const strokeOn=!!part.stroke&&finite(part.strokeWidth,0)>0,strokeControls=partColor(owner.id,part.id,'描线颜色',part.stroke||'#000000',part.strokeAlpha,(target,color,alpha)=>{target.stroke=color;target.strokeAlpha=alpha;}),strokeWidth=root.createElement('input');strokeWidth.type='number';strokeWidth.min='0';strokeWidth.step='1';strokeWidth.value=String(Math.max(0,finite(part.strokeWidth,0)));strokeWidth.title='描线宽度';strokeWidth.addEventListener('change',()=>mutatePart('设置图元描线宽度',owner.id,part.id,target=>target.strokeWidth=Math.max(0,finite(strokeWidth.value,0))));strokeControls.push(strokeWidth);paintRow(appearance.grid,'路径描线',strokeOn,checked=>mutatePart(checked?'启用图元描线':'关闭图元描线',owner.id,part.id,target=>{target.stroke=checked?(target.stroke||'#000000'):null;target.strokeWidth=checked?Math.max(1,finite(target.strokeWidth,1)):0;}),strokeControls);
      renderStrokeSettings(appearance.grid,owner,part);
      if(part.type!=='line'&&part.type!=='stroke'&&part.type!=='custom'){
        const fillOn=!!(part.fill||part.fillPaint),fillControls=partPaint(owner.id,part.id,part.fill||'#ffffff',part.fillAlpha,part.fillPaint);paintRow(appearance.grid,'填充',fillOn,checked=>mutatePart(checked?'启用图元填色':'关闭图元填色',owner.id,part.id,target=>{target.fill=checked?(target.fill||'#ffffff'):null;if(!checked)target.fillPaint=null;if(target.fillPattern)target.fillPattern.mode=checked?'overlay':'replace';}),fillControls);
        const pattern=part.fillPattern,textureOn=!!(pattern&&pattern.type&&pattern.type!=='none'),textureControls=[],textureDetail=textureOn?inlineTextureEditor(pattern,pattern.color||part.fill||'#ffffff',(label,next)=>mutatePart(label,owner.id,part.id,target=>target.fillPattern=next)):null;if(textureOn)textureControls.push(...partColor(owner.id,part.id,'纹理颜色',pattern.color||part.fill||'#ffffff',pattern.opacity,(target,color,alpha)=>{target.fillPattern.color=color;target.fillPattern.opacity=alpha;}));
        paintRow(appearance.grid,'纹理填充',textureOn,checked=>mutatePart(checked?'启用图元纹理':'关闭图元纹理',owner.id,part.id,target=>{if(checked){target.fillPattern=partsState.defaultTexture('lines',target.fill||'#ffffff');target.fillPattern.mode=target.fill?'overlay':'replace';}else delete target.fillPattern;}),textureControls,textureDetail);
      }
      host.append(appearance.wrap);
      if(view.selectedPartId!==part.id)renderExtensionEntry(owner,part);
    }
    function renderPart(owner,part,index){
      objectTab='props';
      setTabs('part',owner);if(title)title.textContent='图元 Inspector';
      if(timeline)timeline.setTrack(owner.id,owner.name||owner.id,{linearKeys:objectLinearKeys(owner)});
      header('INSPECTOR · 图元',part.name||part.id,`${owner.name||owner.id} · #${index+1} · 图元只拥有局部几何和外观，对象效果作用于组合后的整体。`);
      const basic=section('基本'),write=(label,key,value,opts)=>formationNumber(basic.grid,owner,'part',key,label,{...(opts||{step:1}),percent:['scaleX','scaleY','alpha'].includes(key)},part),moveStroke=(axis,next)=>mutatePart('移动像素笔触',owner.id,part.id,target=>{const points=target.points||[],first=points[0]||[0,0],delta=Math.round(next-(+first[axis]||0));target.points=points.map(point=>axis===0?[Math.round((+point[0]||0)+delta),+point[1]||0]:[+point[0]||0,Math.round((+point[1]||0)+delta)]);target[axis===0?'x':'y']=Math.round((+target[axis===0?'x':'y']||0)+delta);});
      if(part.type==='stroke'){const first=(part.points||[])[0]||[0,0];number(basic.grid,'X',first[0],value=>moveStroke(0,value),{step:1,pixel:true});disclosure(number(basic.grid,'Y',first[1],value=>moveStroke(1,value),{step:1,pixel:true}),`part:${owner.id}:${part.id}:position`,'图元位置',partMotionActive(owner,part,'position'));}else{write('X','x',part.x,{step:1,pixel:true},value=>Math.round(value));disclosure(write('Y','y',part.y,{step:1,pixel:true},value=>Math.round(value)),`part:${owner.id}:${part.id}:position`,'图元位置',partMotionActive(owner,part,'position'));}
      if(part.type==='line'){write('终点 X','x2',part.x2,{step:1,pixel:true},value=>Math.round(value));write('终点 Y','y2',part.y2,{step:1,pixel:true},value=>Math.round(value));}
      else if(part.type==='stroke'){const info=root.createElement('div');info.className='inspector-note';info.textContent=`像素笔触 · ${(part.points||[]).length} 个路径点；拖动青色选框可整体移动、缩放、旋转。`;basic.wrap.append(info);}
      else{write('宽度','w',part.w,{min:1,step:1,pixel:true},value=>Math.max(1,Math.round(value)));write('高度','h',part.h,{min:1,step:1,pixel:true},value=>Math.max(1,Math.round(value)));}
      write('宽比例','scaleX',Math.round(finite(part.scaleX,1)*100),{step:1},value=>value/100);
      disclosure(write('高比例','scaleY',Math.round(finite(part.scaleY,1)*100),{step:1},value=>value/100),`part:${owner.id}:${part.id}:scale`,'图元比例',partMotionActive(owner,part,'scale'));
      disclosure(write('旋转','rot',part.rot,{step:1}),`part:${owner.id}:${part.id}:rotation`,'图元旋转',partMotionActive(owner,part,'rotation'));
      disclosure(write('透明度','alpha',Math.round(finite(part.alpha,1)*100),{min:0,max:100,step:1},value=>Math.max(0,Math.min(1,value/100))),`part:${owner.id}:${part.id}:alpha`,'图元透明度',partMotionActive(owner,part,'alpha'));
      host.append(basic.wrap);for(const groupKey of ['position','scale','rotation','alpha'])renderPartMotion(owner,part,groupKey);
      renderPartAppearance(owner,part);
    }
    const entityMotionGroups=global.EditorClassicV4FormationParameters.motions;
    function entityMotionActive(item,groupKey){const anim=timedValue(item,'anim')||item.anim||{},group=entityMotionGroups[groupKey];return!!(group&&group.motions.some(motion=>anim[motion.id]));}
    function entityMotionList(){return Object.values(entityMotionGroups).flatMap(group=>group.motions);}
    function showMotionTrack(item,motion){if(timeline)timeline.setTrack(item.id,'动态 · '+motion.name,{visibilityKey:`motion:object:${item.id}:${motion.id}`,visibilityLabel:'动态 · '+motion.name,linearKeys:[],valuePrefix:motionPrefix(motion.id)});}
    function motionTimingButton(item,motion,heading){
      const context=motionContext(item,motion.id),armed=timingArmed&&timingArmed.key===item.id&&timingArmed.index===context.index&&timingArmed.motionId===motion.id;
      const button=root.createElement('button');button.type='button';button.className='v4-motion-timing'+(context.hasData||armed?' active':'');button.textContent='◷';button.title=context.hasData?'清除当前时段的'+motion.name+'参数':'下一次修改'+motion.name+'参数写入当前时段';button.setAttribute('aria-label',button.title);
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(context.hasData){changes.run('清除'+motion.name+'当前时段参数',document=>timelineState.clearSegmentPrefix(document,item.id,context.index,motionPrefix(motion.id)));timingArmed=null;}else timingArmed=armed?null:{key:item.id,index:context.index,motionId:motion.id};showMotionTrack(item,motion);render();});
      heading.append(button);
    }
    function renderFormationSwitch(item){
      const bar=root.createElement('div'),label=root.createElement('span'),button=root.createElement('button');bar.className='v4-panel-heading v4-formation-heading';label.textContent=formationPage==='motion'?'动态':'基本';button.type='button';button.className='v4-formation-toggle'+(formationPage==='motion'?' active':'');button.textContent='⌁';button.title=formationPage==='motion'?'返回基本参数':'查看动态效果';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(formationPage==='motion'));button.addEventListener('click',()=>{formationPage=formationPage==='motion'?'basic':'motion';timingArmed=null;render();});bar.append(label,button);host.append(bar);
      if(formationPage==='motion')renderMotionGallery(item);
    }
    function transformPair(grid,label,fields){const row=root.createElement('div'),name=root.createElement('span');row.className='v4-transform-row';name.className='v4-transform-label';name.textContent=label;row.append(name);for(const renderField of fields)renderField(row);grid.append(row);return row;}
    function transformDivider(grid){const line=root.createElement('div');line.className='v4-transform-divider';grid.append(line);}
    function renderMotionGallery(item){
      const motions=entityMotionList(),chosen=motions.find(motion=>motion.id===selectedMotion)||motions[0],gallery=root.createElement('div');gallery.className='v4-motion-gallery';
      for(const motion of motions){const current=timedValue(item,motionPrefix(motion.id)),card=root.createElement('div'),power=root.createElement('button');card.className='v4-motion-card'+(motion.id===chosen.id?' selected':'')+(current?' enabled':'');card.dataset.motionId=motion.id;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','选择'+motion.name);card.append(root.createTextNode(motion.name));const choose=()=>{selectedMotion=motion.id;showMotionTrack(item,motion);render();};card.addEventListener('click',choose);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}});power.type='button';power.className='v4-motion-power'+(current?' active':'');power.textContent='⏻';power.title=current?'关闭'+motion.name:'启用'+motion.name;power.setAttribute('aria-label',power.title);power.addEventListener('click',event=>{event.stopPropagation();selectedMotion=motion.id;const next={};for(const param of motion.params)next[param.key]=param.value;writeEntity((current?'关闭':'启用')+motion.name,item,motionPrefix(motion.id),current?null:next);showMotionTrack(item,motion);});card.append(power);gallery.append(card);}
      host.append(gallery);const current=timedValue(item,motionPrefix(chosen.id)),details=section(chosen.name);details.wrap.dataset.v4MotionDetail=chosen.id;motionTimingButton(item,chosen,details.heading);
      const enabled=root.createElement('input');enabled.type='checkbox';enabled.checked=!!current;enabled.addEventListener('change',()=>writeEntity('设置 '+chosen.name,item,motionPrefix(chosen.id),enabled.checked?Object.fromEntries(chosen.params.map(p=>[p.key,p.value])):null));field(details.grid,'启用',enabled,true);formationClock(enabled,item,{parameter:{type:'boolean',timing:'Step'}},motionPrefix(chosen.id),null,'启用'+chosen.name);
      if(current)renderMotionFields(details.grid,item,null,chosen,current);
      host.append(details.wrap);showMotionTrack(item,chosen);
    }
    function partTimingPath(owner,part,key){return global.EditorClassicV4FormationParameters.binding({parameter:{type:'number',timing:'Step'}},key,part).path;}
    function timedPartValue(owner,part,key){return valueAt(timedValues(owner).parts?.find(p=>p.id===part.id)||part,key,undefined);}
    function partMotionActive(owner,part,groupKey){const anim=timedPartValue(owner,part,'anim')||{},group=entityMotionGroups[groupKey];return!!(group&&group.motions.some(motion=>anim[motion.id]));}
    function renderMotionFields(grid,owner,part,motion,current){
      const values=Object.fromEntries(motion.params.map(p=>[p.key,current[p.key]??p.value]));
      for(const param of motion.params){
        if(!global.EditorClassicV4FormationParameters.motionVisible(motion,param,values))continue;
        const key='anim.'+motion.id+'.'+param.key,domain={parameter:param,motionId:motion.id};
        declaredField(grid,owner,param,key,values[param.key],value=>writeFormation('设置 '+motion.name+' · '+param.label,owner,domain,key,param.integer?Math.max(1,Math.round(value)):value,part),part);
      }
    }
    function renderFormationGrade(item){
      const model=inspectorModel.create('object',item),card=model.cards.find(entry=>entry.id==='color-grade');if(!card)return;
      const block=section('调色四轴','成样阶段的 Step 调色；四轴为零时不增加渲染处理。'),values=effectValues('object',item,card);
      block.wrap.dataset.v4EffectId=card.id;block.wrap.addEventListener('pointerdown',()=>{effectFocus={scope:'object',ownerId:item.id,effectId:card.id};controllerFocus=null;if(card.enabled)showTrackTiming(elementTabs,effectTrack('object',item,card),card.name,[]);});
      for(const param of card.params||[])effectParameterField(block.grid,'object',item,card,param,values);host.append(block.wrap);
      if(effectFocus&&effectFocus.scope==='object'&&effectFocus.ownerId===item.id&&effectFocus.effectId===card.id&&card.enabled)showTrackTiming(elementTabs,effectTrack('object',item,card),card.name,[]);
    }
    function renderPartMotion(owner,part,groupKey){
      const group=entityMotionGroups[groupKey],key='part:'+owner.id+':'+part.id+':'+groupKey;
      if(!group||!motionExpanded.has(key))return;
      const block=section('动态 · '+group.name);
      for(const motion of group.motions){
        const path='anim.'+motion.id,current=timedPartValue(owner,part,path),param={type:'boolean',timing:'Step',label:motion.name},toggle=root.createElement('input');
        toggle.type='checkbox';toggle.checked=!!current;toggle.addEventListener('change',()=>{const next=Object.fromEntries(motion.params.map(p=>[p.key,p.value]));writeFormation('设置图元 '+motion.name,owner,{parameter:param},path,toggle.checked?next:null,part);});
        field(block.grid,motion.name,toggle,true);formationClock(toggle,owner,{parameter:param},path,part,motion.name);
        if(current)renderMotionFields(block.grid,owner,part,motion,current);
      }
      host.append(block.wrap);
    }
    function renderParticle(item){
      objectTab='props';setTabs('object',item);if(title)title.textContent='粒子 Inspector';header('INSPECTOR · 粒子',item.name||item.id,'粒子层动态引用实体外观；发射、运动与外观参数均为 Step 时序。');
      const config=item.particle||{},presetBlock=section('预设','切换预设会更新粒子参数；“使用预设实体”开启时也替换粒子实体。'),presetChoices=[{value:'custom',label:'当前自定义'}].concat(particleState.presets().map(value=>({value:value.id,label:value.name}))),presetId=config.presetId||'custom';
      select(presetBlock.grid,'预设',presetId,presetChoices,value=>{if(value==='custom'){changes.run('切换为自定义粒子',document=>{const target=particleState.emitter(document,item.id);target.particle.presetId='custom';});return;}changes.run('应用粒子预设',document=>particleState.applyPreset(document,item.id,value,!!config.usePresetSource));},true);
      const presetEntity=root.createElement('input');presetEntity.type='checkbox';presetEntity.checked=!!config.usePresetSource;presetEntity.addEventListener('change',()=>{const chosen=presetId==='custom'?'snow':presetId;changes.run(presetEntity.checked?'启用预设粒子实体':'保留当前粒子实体',document=>{if(presetEntity.checked)particleState.applyPreset(document,item.id,chosen,true);else particleState.emitter(document,item.id).particle.usePresetSource=false;});});field(presetBlock.grid,'使用预设实体',presetEntity,true);host.append(presetBlock.wrap);
      const sourceBlock=section('实体',config.mode==='layer'?'捕获开始时的完整对象，原位切片后飞散。':'引用保持动态：源对象的外观、图元动态和对象处理会在每帧进入粒子精灵。');
      const choices=(scene().entities||[]).filter(value=>value.type!=='group'&&value.type!=='particle-emitter').map(value=>({value:value.id,label:value.name||value.id}));
      select(sourceBlock.grid,'粒子实体',config.sourceId||'',choices,value=>changes.run('设置粒子实体',document=>particleState.setSource(document,item.id,value)),true);
      const sourceEntity=(scene().entities||[]).find(value=>value.id===config.sourceId),sourceAsset=sourceEntity?.type==='image'&&scene().assets?.[sourceEntity.assetId],frameCount=sourceAsset?.frames?.length||0;
      if(frameCount>1&&config.mode!=='layer'){
        select(sourceBlock.grid,'播放方式',timedParticle(item,'playback')==='particle-age'?'particle-age':'static',[{value:'static',label:'静态帧'},{value:'particle-age',label:'按粒子寿命播放'}],value=>writeParticle('设置粒子播放方式',item,'playback',value));
        if(timedParticle(item,'playback')==='particle-age'){
          number(sourceBlock.grid,'帧率',timedParticle(item,'frameFps'),value=>writeParticle('设置粒子帧率',item,'frameFps',value),{min:.1,max:60,step:.1});
          const loop=root.createElement('input');loop.type='checkbox';loop.checked=timedParticle(item,'frameLoop')!==false;loop.addEventListener('change',()=>writeParticle('设置粒子帧循环',item,'frameLoop',loop.checked));field(sourceBlock.grid,'循环',loop);
        }else number(sourceBlock.grid,'帧序号',timedParticle(item,'frame'),value=>writeParticle('设置粒子帧序号',item,'frame',Math.round(value)),{min:0,max:frameCount-1,step:1});
      }
      host.append(sourceBlock.wrap);
      select(sourceBlock.grid,'实体方式',config.mode==='layer'?'layer':'sprite',[{value:'sprite',label:'重复实体'},{value:'layer',label:'图层切片'}],value=>changes.run('设置粒子实体方式',document=>particleState.set(document,item.id,'mode',value)),true);
      if(config.mode==='layer'){
        select(sourceBlock.grid,'发射方式',config.layerEmission==='continuous'?'continuous':'burst',[{value:'burst',label:'一次碎裂'},{value:'continuous',label:'持续取样发射'}],value=>changes.run('设置图层发射方式',document=>particleState.set(document,item.id,'layerEmission',value)),true);
        select(sourceBlock.grid,'粒子形状',config.fragmentShape==='circle'?'circle':'rect',[{value:'rect',label:'矩形'},{value:'circle',label:'圆形'}],value=>changes.run('设置切片形状',document=>particleState.set(document,item.id,'fragmentShape',value)));
        number(sourceBlock.grid,'切片尺寸',config.cellSize||32,value=>changes.run('设置切片尺寸',document=>particleState.set(document,item.id,'cellSize',value)),{min:1,step:1});
        if(config.layerEmission==='continuous'){
          select(sourceBlock.grid,'来源取样',config.sampleTime==='fixed'?'fixed':'birth',[{value:'birth',label:'出生时刻'},{value:'fixed',label:'固定时刻'}],value=>changes.run('设置图层取样时间',document=>particleState.set(document,item.id,'sampleTime',value)),true);
          if(config.sampleTime!=='fixed')number(sourceBlock.grid,'来源刷新率',config.sourceFps||12,value=>changes.run('设置来源刷新率',document=>particleState.set(document,item.id,'sourceFps',value)),{min:1,max:30,step:1});
        }
        if(config.layerEmission!=='continuous'||config.sampleTime==='fixed')number(sourceBlock.grid,config.layerEmission==='continuous'?'取样时刻':'开始时间',config.startTime||0,value=>changes.run('设置切片开始时间',document=>particleState.set(document,item.id,'startTime',value)),{min:0,max:scene().loop-.001,step:.1});
        const showSource=root.createElement('input');showSource.type='checkbox';showSource.checked=config.showSource!==false;showSource.addEventListener('change',()=>changes.run('设置原对象显示',document=>particleState.set(document,item.id,'showSource',showSource.checked)));field(sourceBlock.grid,'显示原对象',showSource,true);
      }
      const emission=section('发射'),continuous=config.mode!=='layer'||config.layerEmission==='continuous';if(continuous)number(emission.grid,'数量',timedParticle(item,'count'),value=>writeParticle('设置粒子数量',item,'count',Math.round(value)),{min:0,max:600,step:1});number(emission.grid,'随机种子',timedParticle(item,'seed'),value=>writeParticle('设置粒子随机种子',item,'seed',Math.round(value)),{step:1});if(continuous)renderMaskFields(emission.grid,'particle-emission',item,null,false,{label:'发射范围',defaultType:'rect'});host.append(emission.wrap);
      const motion=section('运动');
      for(const [label,key,limits]of [
        ['寿命','life',{min:.001,step:.1}],['速度','speed',{min:0}],['方向','direction',{}],['扩散角','spread',{min:0,max:360}],
        ['重力','gravity',{}],['风力','wind',{}],['初始旋转','spin',{}],['旋转速度','spinSpeed',{}],['旋转差异','spinVar',{min:0}]
      ])number(motion.grid,label,timedParticle(item,key),value=>writeParticle('设置粒子'+label,item,key,value),{step:1,...limits});
      renderMaskFields(motion.grid,'particle-motion',item,null,false,{label:'显示范围'});host.append(motion.wrap);
      const appearance=section('外观');number(appearance.grid,'粒子尺寸',timedParticle(item,'size'),value=>writeParticle('设置粒子尺寸',item,'size',value),{min:.01,step:.05});number(appearance.grid,'尺寸差异',Math.round(finite(timedParticle(item,'sizeVar'),0)*100),value=>writeParticle('设置粒子尺寸差异',item,'sizeVar',Math.max(0,Math.min(1,value/100))),{min:0,max:100,step:1});number(appearance.grid,'透明度',Math.round(finite(timedParticle(item,'alpha'),1)*100),value=>writeParticle('设置粒子透明度',item,'alpha',Math.max(0,Math.min(1,value/100))),{min:0,max:100,step:1});const fade=root.createElement('input');fade.type='checkbox';fade.checked=timedParticle(item,'fade')!==false;fade.addEventListener('change',()=>writeParticle('设置粒子淡出',item,'fade',fade.checked));field(appearance.grid,'随寿命淡出',fade);host.append(appearance.wrap);
      if(timeline)timeline.setTrack(item.id,item.name||'粒子',{linearKeys:[]});
    }
    function renderEntity(item){
      if(item.type==='particle-emitter')return renderParticle(item);
      setTabs('object',item);if(title)title.textContent=(item.type==='group'?'编组':'对象')+' Inspector';
      if(timeline&&formationPage!=='motion')timeline.setTrack(item.id,item.name||item.id,{linearKeys:objectLinearKeys(item)});
      if(objectTab==='fx')return renderEffects('object',item,'decorate');
      if(objectTab==='sampling')return renderEffects('object',item,'sample');
      header(item.type==='group'?'INSPECTOR · 编组':'INSPECTOR · 对象',item.name||item.id,item.type==='group'?'组是成员的变换父级，不创建额外渲染容器。':'基础变换直接写入 v4 Scene，并由同一 Runtime 预览。');
      renderFormationSwitch(item);
      if(formationPage==='motion'){if(timing)timing.style.display='none';return;}
      const basic=section('变换'),id=item.id;basic.wrap.classList.add('v4-transform-card');
      transformPair(basic.grid,'位置',[
        row=>formationNumber(row,item,'object','x','X',{step:1,pixel:true}),
        row=>formationNumber(row,item,'object','y','Y',{step:1,pixel:true})]);
      if(item.type!=='group')transformPair(basic.grid,'尺寸',[
        row=>formationNumber(row,item,'object','w','宽',{min:1,step:1,pixel:true}),
        row=>formationNumber(row,item,'object','h','高',{min:1,step:1,pixel:true})]);
      transformPair(basic.grid,'比例',[
        row=>formationNumber(row,item,'object','scaleX','宽比',{step:1,percent:true}),
        row=>formationNumber(row,item,'object','scaleY','高比',{step:1,percent:true})]);
      transformDivider(basic.grid);
      transformPair(basic.grid,'斜切',[
        row=>formationNumber(row,item,'object','skewX','水平',{min:-80,max:80,step:.1,decimals:1}),
        row=>formationNumber(row,item,'object','skewY','垂直',{min:-80,max:80,step:.1,decimals:1})]);
      transformPair(basic.grid,'旋转',[
        row=>formationNumber(row,item,'object','rot','角度',{step:1}),
        row=>{const button=pivotControl(row,item),caption=button.parentElement.querySelector('span');caption?.remove();button.parentElement.classList.add('v4-transform-pivot-field');}]);
      transformDivider(basic.grid);
      transformPair(basic.grid,'混合',[
        row=>formationClock(select(row,'模式',timedValue(item,'blend')||item.blend||'normal',blendChoices(timedValue(item,'blend')||item.blend),value=>writeEntity('设置对象叠加方式',item,'blend',value)),item,'object','blend',null,'混合方式'),
        row=>formationNumber(row,item,'object','alpha','透明度',{min:0,max:100,step:1,percent:true})]);
      host.append(basic.wrap);if(item.type!=='group'){renderFormationGrade(item);const mask=section('蒙版','对象蒙版属于可调序处理阶段；引用来源仅作蒙版，不修改来源对象自身的 hidden。');renderMaskFields(mask.grid,'object',item,null,false);host.append(mask.wrap);}
      if(item.type==='vector'&&Array.isArray(item.parts)&&item.parts.length===1)renderPartAppearance(item,item.parts[0]);
      else if(Array.isArray(item.parts)&&item.parts.length===1)renderExtensionEntry(item,item.parts[0]);
      else if(Array.isArray(item.parts)&&item.parts.length>1)renderExtensionEntry(item,null);
      if(item.type==='builtin'){
        const definition=builtinDefinition(item),values=timedBuiltin(item),block=section('内建组件',definition.purpose+' · '+definition.id+'@'+definition.version);
        for(const param of definition.params)declaredField(block.grid,item,param,'builtin.params.'+param.key,values[param.key],value=>writeBuiltin('设置'+definition.name+' · '+param.label,item,param,global.ToSampoolRuntimeVNext.modules.builtins.normalizeParam(param,value)));
        host.append(block.wrap);
        if(timeline&&timeline.mode==='property')timeline.setTrack(item.id,item.name||definition.name,{linearKeys:objectLinearKeys(item)});
      }
      if(item.type==='procedural')renderModule(item);
      if(item.type==='text'){renderTextAppearance(item);return;}
      if(!['rect','ellipse','line','poly'].includes(item.type))return;
      const appearance=section('外观','单图形对象和组合对象的内部图元复用同一 Paint 数据与弹层。');if(item.type==='rect')number(appearance.grid,'圆角',item.radius||0,value=>mutate('设置矩形圆角',id,target=>target.radius=Math.max(0,Math.min(value,Math.min(target.w,target.h)/2))),{min:0,step:1});
      const strokeOn=!!item.stroke&&finite(item.strokeWidth,0)>0,strokeControls=entityColor(id,'描线颜色',item.stroke||'#000000',item.strokeAlpha,(target,next,alpha)=>{target.stroke=next;target.strokeAlpha=alpha;}),strokeWidth=root.createElement('input');strokeWidth.type='number';strokeWidth.min='0';strokeWidth.step='1';strokeWidth.value=String(Math.max(0,finite(item.strokeWidth,0)));strokeWidth.title='描线宽度';strokeWidth.addEventListener('change',()=>mutate('设置路径描线宽度',id,target=>target.strokeWidth=Math.max(0,finite(strokeWidth.value,0))));strokeControls.push(strokeWidth);paintRow(appearance.grid,'路径描线',strokeOn,checked=>mutate(checked?'启用路径描线':'关闭路径描线',id,target=>{target.stroke=checked?(target.stroke||'#000000'):null;target.strokeWidth=checked?Math.max(1,finite(target.strokeWidth,1)):0;}),strokeControls);
      renderStrokeSettings(appearance.grid,item,null);
      if(item.type!=='line'){const fillOn=!!(item.fill||item.fillPaint),fillControls=entityPaint(id,item.fill||'#ffffff',item.fillAlpha,item.fillPaint);paintRow(appearance.grid,'填充',fillOn,checked=>mutate(checked?'启用对象填色':'关闭对象填色',id,target=>{target.fill=checked?(target.fill||'#ffffff'):null;if(!checked)target.fillPaint=null;if(target.fillPattern)target.fillPattern.mode=checked?'overlay':'replace';}),fillControls);const pattern=item.fillPattern,textureOn=!!(pattern&&pattern.type&&pattern.type!=='none'),textureControls=[],textureDetail=textureOn?inlineTextureEditor(pattern,pattern.color||item.fill||'#ffffff',(label,next)=>mutate(label,id,target=>target.fillPattern=next)):null;if(textureOn)textureControls.push(...entityColor(id,'纹理颜色',pattern.color||item.fill||'#ffffff',pattern.opacity,(target,next,alpha)=>{target.fillPattern.color=next;target.fillPattern.opacity=alpha;}));paintRow(appearance.grid,'纹理填充',textureOn,checked=>mutate(checked?'启用对象纹理':'关闭对象纹理',id,target=>{if(checked){target.fillPattern=partsState.defaultTexture('lines',target.fill||'#ffffff');target.fillPattern.mode=target.fill?'overlay':'replace';}else delete target.fillPattern;}),textureControls,textureDetail);}
      host.append(appearance.wrap);renderExtensionEntry(item,item);
    }
    function render(){
      if(stopped)return;if(!extensionFocus&&instanceEditor?.target)instanceEditor.close(false);if(typeof externalPanel==='function'&&externalPanel({host,scene:scene(),view,render}))return;
      const ids=view.selectedIds||[];if(!ids.length){extensionFocus=null;return renderScene();}if(ids.length>1){extensionFocus=null;return renderMulti(ids);}
      const item=entity(ids[0]);if(!item){extensionFocus=null;return renderScene();}
      const partIds=view.selectedPartIds||[];if(partIds.length>1){extensionFocus=null;return renderPartMulti(item,partIds);}
      const partId=view.selectedPartId,part=partId&&(item.parts||[]).find(entry=>entry.id===partId);
      if(extensionFocus?.partId&&extensionFocus.partId!=='@self'&&!part){extensionFocus=null;instanceEditor?.close(false);}
      if(extensionFocus&&extensionFocus.ownerId===item.id&&objectTab==='props'){
        if(part&&part.id!==extensionFocus.partId)extensionFocus.partId=part.id;
        const target=extensionFocus.partId==='@self'?item:(item.parts||[]).find(p=>p.id===extensionFocus.partId);
        if(!extensionFocus.partId||target)return renderExtensionPage(item,target||null);
      }
      extensionFocus=null;if(part)return renderPart(item,part,(item.parts||[]).indexOf(part));renderEntity(item);renderMedia(item);
    }
    function focusedTimelineTarget(){
      const ids=view.selectedIds||[];
      if(controllerFocus){const owner=controllerFocus.scope==='object'&&ids.length===1?entity(ids[0]):null;if(controllerFocus.scope==='object'&&(!owner||owner.id!==controllerFocus.ownerId||objectTab!=='sampling'))return null;if(controllerFocus.scope==='scene'&&(ids.length||sceneTab!=='sampling'))return null;const model=inspectorModel.create(controllerFocus.scope,owner||scene()),definition=model.controllers.find(item=>item.id===controllerFocus.controllerId);if(definition&&controllerConfig(controllerFocus.scope,owner,definition))return{scope:controllerFocus.scope,owner,name:definition.name,key:controllerTrack(controllerFocus.scope,owner,definition),linearKeys:[]};}
      if(!effectFocus)return null;const owner=effectFocus.scope==='object'&&ids.length===1?entity(ids[0]):null;if(effectFocus.scope==='object'&&(!owner||owner.id!==effectFocus.ownerId||!['props','fx','sampling'].includes(objectTab)))return null;if(effectFocus.scope==='scene'&&(ids.length||!['overlay','sampling'].includes(sceneTab)))return null;const model=inspectorModel.create(effectFocus.scope,owner||scene()),card=model.cards.find(item=>item.id===effectFocus.effectId);if(!card||!card.present)return null;return{scope:effectFocus.scope,owner,name:card.name,key:effectTrack(effectFocus.scope,owner,card),linearKeys:effectLinearKeys(card)};
    }
    function focusEffect(scope,ownerId,effectId){const definition=registry.effectById[effectId];if(!definition)return false;if(scope==='scene'){if((view.selectedIds||[]).length)view.select(null);sceneTab=inspectorModel.pageFor(definition,'scene')==='sample'?'sampling':'overlay';}else{const owner=entity(ownerId);if(!owner)return false;if(view.selectedId!==ownerId)view.select(ownerId);objectTab=definition.family==='formation'?'props':definition.family==='decorate'?'fx':'sampling';}effectFocus={scope:scope==='scene'?'scene':'object',ownerId:scope==='scene'?null:ownerId,effectId};controllerFocus=null;timingArmed=null;render();const node=host.querySelector(`[data-v4-effect-id="${effectId}"]`);if(node)node.scrollIntoView({block:'center'});return true;}
    function focusController(scope,ownerId,controllerId){const definition=registry.controllerById&&registry.controllerById[controllerId];if(!definition)return false;if(scope==='scene'){if((view.selectedIds||[]).length)view.select(null);sceneTab='sampling';}else{const owner=entity(ownerId);if(!owner)return false;if(view.selectedId!==ownerId)view.select(ownerId);objectTab='sampling';}controllerFocus={scope:scope==='scene'?'scene':'object',ownerId:scope==='scene'?null:ownerId,controllerId};effectFocus=null;timingArmed=null;render();const node=host.querySelector(`[data-v4-controller-id="${controllerId}"]`);if(node)node.scrollIntoView({block:'center'});return true;}
    function focusMask(ownerId){const owner=entity(ownerId);if(!owner)return false;if(view.selectedId!==ownerId)view.select(ownerId);objectTab='props';effectFocus=null;controllerFocus=null;timingArmed=null;if(timeline)timeline.setMode('visibility');render();const node=Array.from(host.querySelectorAll('.global-section')).find(section=>section.querySelector('.global-section-title')?.textContent==='蒙版');if(node)node.scrollIntoView({block:'center'});return true;}
    function focusMotion(ownerId,motionId){const owner=entity(ownerId),motion=entityMotionList().find(entry=>entry.id===motionId);if(!owner||!motion)return false;if(view.selectedId!==ownerId)view.select(ownerId);objectTab='props';formationPage='motion';selectedMotion=motionId;effectFocus=null;controllerFocus=null;timingArmed=null;render();showMotionTrack(owner,motion);host.querySelector(`[data-v4-motion-detail="${motionId}"]`)?.scrollIntoView({block:'center'});return true;}
    function focusModule(ownerId){
      const owner=entity(ownerId);if(!owner||owner.type!=='procedural')return false;
      if(view.selectedId!==ownerId)view.select(ownerId);
      objectTab='props';formationPage='basic';effectFocus=null;controllerFocus=null;timingArmed=null;
      render();host.querySelector('[data-v4-procedural-module]')?.scrollIntoView({block:'nearest'});return true;
    }
    function focusExtension(ownerId,partId,extensionId){
      const owner=entity(ownerId),part=owner&&(partId==='@self'?owner:(owner.parts||[]).find(p=>p.id===partId));
      if(!part)return false;finishExtensionColor();instanceEditor?.close(false);
      if(partId==='@self'){if(view.selectedId!==ownerId||view.selectedPartId)view.select(ownerId);}
      else if(view.selectedId!==ownerId||view.selectedPartId!==partId)view.selectPart(ownerId,partId);
      effectFocus=null;controllerFocus=null;timingArmed=null;objectTab='props';extensionFocus={ownerId,partId};render();
      const field=host.querySelector('[data-extension-param="generator|'+extensionId+'|enabled"]')||host.querySelector('[data-extension-param="'+extensionId+'.enabled"]')||host.querySelector('[data-extension-param^="'+extensionId+'."]')||host.querySelector('[data-pattern-provider] [data-extension-param]'),section=field?.closest('.global-section');
      section?.scrollIntoView({block:'nearest'});field?.focus({preventScroll:true});return true;
    }
    const tabCapture=event=>{
      if(stopped)return;
      const globalButton=event.target.closest&&event.target.closest('[data-global-inspector]'),elementButton=event.target.closest&&event.target.closest('[data-element-inspector]');
      if(!globalButton&&!elementButton)return;event.preventDefault();event.stopImmediatePropagation();finishExtensionColor();instanceEditor?.close(false);extensionFocus=null;
      if(elementButton&&elementButton.dataset.elementInspector==='extensions'){
        const owner=entity(view.selectedId),part=owner&&(owner.parts||[]).find(p=>p.id===view.selectedPartId);
        if(owner&&part){extensionFocus={ownerId:owner.id,partId:part.id};objectTab='props';render();}return;
      }
      if(globalButton)sceneTab=globalButton.dataset.globalInspector;if(elementButton)objectTab=elementButton.dataset.elementInspector;
      effectFocus=null;controllerFocus=null;timingArmed=null;
      if(timeline&&(globalButton&&sceneTab==='props'||elementButton&&objectTab==='props'))timeline.setMode('visibility');render();
    };
    const timingCapture=event=>{
      if(stopped)return;
      event.preventDefault();event.stopImmediatePropagation();
      const effectTarget=focusedTimelineTarget(),ids=view.selectedIds||[];
      const owner=ids.length===1&&entity(ids[0]),selectedPart=owner&&view.selectedPartId&&(owner.parts||[]).find(part=>part.id===view.selectedPartId);
      const item=!effectTarget&&owner&&(!view.selectedPartId||selectedPart&&['stroke','rect','ellipse','poly','line'].includes(selectedPart.type))&&owner;
      const key=effectTarget?effectTarget.key:item&&item.id;
      if(!key)return;
      const ctx=item?propertyContext(item,false):trackContext(key,false),armed=timingArmed&&timingArmed.key===key&&timingArmed.index===ctx.index;
      const showTrack=()=>{
        if(!timeline)return;
        if(effectTarget)timeline.setTrack(key,effectTarget.name,{linearKeys:effectTarget.linearKeys,readOnlyVisibility:key.startsWith('effect:object:')||key.startsWith('controller:object:')});
        else timeline.setTrack(key,item.name||key,{linearKeys:item.type==='particle-emitter'?[]:objectLinearKeys(item)});
      };
      if(ctx.hasData){changes.run('清除当前参数时段',value=>timelineState.clearSegment(value,key,ctx.index));timingArmed=null;showTrack();}
      else if(armed){timingArmed=null;if(timeline&&!effectTarget)timeline.setMode('visibility');}
      else{timingArmed={key,index:ctx.index};showTrack();}
      render();
    };
    globalTabs.addEventListener('click',tabCapture,true);elementTabs.addEventListener('click',tabCapture,true);if(legacyForm)legacyForm.style.display='none';if(legacyTools)legacyTools.style.display='none';
    if(timing)timing.addEventListener('click',timingCapture,true);
    const unsubscribeSelection=view.subscribeSelection(()=>{effectFocus=null;controllerFocus=null;timingArmed=null;extensionParameterArmed.clear();effectParameterArmed.clear();render();}),unsubscribeWorkspace=workspace.subscribe(event=>{if(event?.type==='replace'){extensionParameterArmed.clear();effectParameterArmed.clear();}render();}),unsubscribeMask=maskEditor?maskEditor.subscribe(render):()=>{},unsubscribePreview=view.subscribeMaskPreview?view.subscribeMaskPreview(syncMaskPreviewButtons):()=>{};render();
    function stop(){stopped=true;evaluationScene=evaluationSource=null;evaluationRevision=-1;extensionParameterArmed.clear();effectParameterArmed.clear();instanceEditor?.stop();unsubscribeSelection();unsubscribeWorkspace();unsubscribeMask();unsubscribePreview();globalTabs.removeEventListener('click',tabCapture,true);elementTabs.removeEventListener('click',tabCapture,true);if(timing)timing.removeEventListener('click',timingCapture,true);}
    return Object.freeze({render,stop,focusExtension,focusEffect,focusController,focusMask,focusMotion,focusModule,shouldWriteTiming,writeTimedPatch,get timingArmed(){return timingArmed;},get context(){return{sceneTab,objectTab,effectFocus:effectFocus&&Object.assign({},effectFocus),controllerFocus:controllerFocus&&Object.assign({},controllerFocus)};}});
  }
  global.EditorClassicV4InspectorController=Object.freeze({version:1,create});
})(typeof window!=='undefined'?window:globalThis);
