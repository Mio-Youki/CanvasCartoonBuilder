(function(global){
  'use strict';

  function textureStyle(pattern){
    if(pattern.type!=='lines')return pattern.type==='checker'?'dots':pattern.type;
    const layers=pattern.layers||[];
    if(pattern.lineMode==='layers')return'layers';
    if(pattern.lineMode==='grid'||(layers.length===2&&Math.abs(Math.abs(finite(layers[1].angle,0)-finite(layers[0].angle,0))-90)<.01))return'grid';
    return layers.length>1?'layers':'line';
  }
  function finite(value,fallback){value=+value;return Number.isFinite(value)?value:fallback;}
  function pointOption(value){return{value,label:{circle:'圆点',3:'三角',4:'矩形',5:'五边形',6:'六边形'}[value]||String(value)};}

  function render(options){
    const {root,partsState,pattern,color,write,onReflow}=options;
    const draft=partsState.normalizeTexture(pattern,color);
    if(draft.type==='checker')Object.assign(draft,{type:'dots',layout:'regular',phase:0,sides:4,roundness:0});
    const panel=root.createElement('div'),head=root.createElement('div'),preview=root.createElement('canvas'),fields=root.createElement('div');
    panel.className='v4-inline-texture';head.className='v4-inline-texture-head';head.textContent='图案';preview.className='v4-inline-texture-preview';fields.className='v4-inline-texture-grid';panel.append(head,preview,fields);
    const redraw=()=>{const ctx=preview.getContext&&preview.getContext('2d'),runtime=global.ToSampoolRuntimeVNext;if(ctx&&runtime?.modules?.pattern){preview.width=120;preview.height=42;ctx.clearRect(0,0,120,42);ctx.fillStyle='#11151c';ctx.fillRect(0,0,120,42);runtime.modules.pattern.paint(ctx,120,42,draft,draft.color||color);return;}if(typeof global.drawTexturePreview==='function')global.drawTexturePreview(preview,draft,draft.color||color);};
    const commit=(label,operation,reflow)=>{operation(draft);write(label,partsState.normalizeTexture(draft,color));redraw();if(reflow&&typeof onReflow==='function')onReflow();};
    const add=(label,config,apply)=>{const node=root.createElement('label'),caption=root.createElement('span'),input=root.createElement(config?.select?'select':'input');caption.textContent=label;if(config?.select)(config.options||[]).forEach(option=>input.append(new Option(option.label,option.value)));else{input.type='number';if(config?.min!=null)input.min=String(config.min);if(config?.max!=null)input.max=String(config.max);input.step=String(config?.step??1);}input.value=String(config?.value??'');input.addEventListener('change',()=>apply(input.value));node.append(caption,input);fields.append(node);return input;};
    const style=textureStyle(draft);
    add('类型',{select:true,value:style,options:[{value:'line',label:'单线'},{value:'grid',label:'网格'},{value:'layers',label:'叠线'},{value:'dots',label:'点阵'}]},value=>commit('设置纹理类型',next=>{
      const angle=next.layers?.[0]?.angle??45,first=next.layers?.[0]||{width:1,spacing:4};
      if(value==='dots'){const replacement=partsState.defaultTexture(value,next.color||color);Object.keys(next).forEach(key=>delete next[key]);Object.assign(next,replacement);return;}
      const spacing=Math.max(+first.width||1,+first.spacing||((+first.width||1)+(+first.gap||0)));next.type='lines';next.lineMode=value;
      next.layers=value==='grid'?[{angle,width:first.width,spacing},{angle:angle+90,width:first.width,spacing}]:value==='layers'?(next.layers?.length>1?next.layers:[{angle,width:first.width,spacing},{angle:angle+90,width:first.width,spacing}]):[{angle,width:first.width,spacing}];
    },true));
    if(draft.type==='lines'){
      const layers=draft.layers||[],base=layers[0]||{angle:45,width:1,spacing:4};
      if(style==='layers')layers.forEach((layer,index)=>{add(`第 ${index+1} 层角度`,{value:layer.angle,step:1},value=>commit('设置叠线角度',next=>next.layers[index].angle=finite(value,0)));add(`第 ${index+1} 层线宽`,{value:layer.width,min:1,step:1},value=>commit('设置叠线线宽',next=>{next.layers[index].width=Math.max(1,finite(value,1));next.layers[index].spacing=Math.max(next.layers[index].width,+next.layers[index].spacing||next.layers[index].width);}));add(`第 ${index+1} 层格距`,{value:layer.spacing??layer.width+layer.gap,min:layer.width,step:1},value=>commit('设置叠线格距',next=>next.layers[index].spacing=Math.max(next.layers[index].width,finite(value,next.layers[index].width))));});
      else{add('整体旋转',{value:base.angle,step:1},value=>commit('设置纹理旋转',next=>{const angle=finite(value,0);next.layers.forEach((layer,index)=>layer.angle=angle+(style==='grid'?index*90:0));}));add('线宽',{value:base.width,min:1,step:1},value=>commit('设置纹理线宽',next=>next.layers.forEach(layer=>{layer.width=Math.max(1,finite(value,1));layer.spacing=Math.max(layer.width,+layer.spacing||layer.width);})));add('格距',{value:base.spacing??base.width+base.gap,min:base.width,step:1},value=>commit('设置纹理格距',next=>next.layers.forEach(layer=>layer.spacing=Math.max(layer.width,finite(value,layer.width)))));}
      if(style==='layers'&&layers.length<3){const more=root.createElement('button');more.type='button';more.className='small';more.textContent='+ 线层';more.addEventListener('click',()=>commit('增加叠线',next=>next.layers.push({angle:next.layers.length===1?135:0,width:1,spacing:4}),true));panel.append(more);}
    }else{
      add('整体旋转',{value:draft.angle,step:1},value=>commit('设置纹理旋转',next=>next.angle=finite(value,0)));add('图样大小',{value:draft.size,min:1,step:1},value=>commit('设置纹理大小',next=>{next.size=Math.max(1,finite(value,1));next.spacing=Math.max(next.size,+next.spacing||next.size);}));add('格距',{value:draft.spacing??draft.size+draft.gap,min:draft.size,step:1},value=>commit('设置纹理格距',next=>next.spacing=Math.max(next.size,finite(value,next.size))));
      if(draft.type==='dots'){add('点形',{select:true,value:draft.roundness>=.98?'circle':String(draft.sides||4),options:['circle','3','4','5','6'].map(pointOption)},value=>commit('设置点纹形状',next=>{next.roundness=value==='circle'?1:0;next.sides=value==='circle'?4:Math.max(3,Math.min(6,finite(value,4)));}));add('排列',{select:true,value:draft.layout||'regular',options:[{value:'regular',label:'整齐'},{value:'stagger',label:'错列'}]},value=>commit('设置点纹排列',next=>next.layout=value));if(draft.layout==='stagger')add('错列偏移',{value:draft.phase,min:0,max:1,step:.05},value=>commit('设置错列偏移',next=>next.phase=Math.max(0,Math.min(1,finite(value,0)))));}
    }
    add('起始偏移 X',{value:Math.max(0,Math.min(1,draft.phaseX||0)),min:0,max:1,step:.05},value=>commit('设置纹理起始偏移 X',next=>{next.phaseX=Math.max(0,Math.min(1,finite(value,0)));}));
    add('起始偏移 Y',{value:Math.max(0,Math.min(1,draft.phaseY||0)),min:0,max:1,step:.05},value=>commit('设置纹理起始偏移 Y',next=>{next.phaseY=Math.max(0,Math.min(1,finite(value,0)));}));
    redraw();return panel;
  }

  global.EditorClassicV4PatternField=Object.freeze({render});
})(typeof window!=='undefined'?window:globalThis);
