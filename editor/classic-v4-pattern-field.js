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
    let activeKey=null;
    const commit=(label,operation,reflow,key=activeKey)=>{
      if(options.readOnly?.(key))return;
      const before=partsState.normalizeTexture(draft,color);operation(draft);
      write(label,partsState.normalizeTexture(draft,color),{key,before});redraw();if(reflow&&typeof onReflow==='function')onReflow();
    };
    const bind=(input,key)=>{if(options.parameterTiming&&!key)throw Error('图样控件缺少稳定参数键');input.dataset.patternParameter=key;options.parameterTiming?.(input,key);return input;};
    const add=(label,config,apply,key)=>{
      const node=root.createElement('label'),caption=root.createElement('span'),input=root.createElement(config?.select?'select':'input');node.className='v4-pattern-parameter';caption.textContent=label;
      if(config?.select)(config.options||[]).forEach(option=>input.append(new Option(option.label,option.value)));
      else{input.type='number';if(config?.min!=null)input.min=String(config.min);if(config?.max!=null)input.max=String(config.max);input.step=String(config?.step??1);}
      input.value=String(config?.value??'');input.addEventListener('change',()=>{activeKey=key;try{apply(input.value);}finally{activeKey=null;}});
      node.append(caption,input);fields.append(node);return bind(input,key);
    };
    const style=textureStyle(draft);
    add('类型',{select:true,value:style,options:[{value:'line',label:'单线'},{value:'grid',label:'网格'},{value:'layers',label:'叠线'},{value:'dots',label:'点阵'},{value:'custom',label:'自定义纹理'},...(style==='noise'?[{value:'noise',label:'屏幕噪点（旧项目）'}]:[])]},value=>commit('设置纹理类型',next=>{
      const angle=next.layers?.[0]?.angle??45,first=next.layers?.[0]||{width:1,spacing:4};
      if(value==='dots'||value==='noise'||value==='custom'){const replacement=partsState.defaultTexture(value,next.color||color);Object.keys(next).forEach(key=>delete next[key]);Object.assign(next,replacement);return;}
      const spacing=Math.max(+first.width||1,+first.spacing||((+first.width||1)+(+first.gap||0)));next.type='lines';next.lineMode=value;
      next.layers=value==='grid'?[{angle,width:first.width,spacing},{angle:angle+90,width:first.width,spacing}]:value==='layers'?(next.layers?.length>1?next.layers:[{angle,width:first.width,spacing},{angle:angle+90,width:first.width,spacing}]):[{angle,width:first.width,spacing}];
    },true),'texture');
    if(draft.type==='custom'){
      const resize=(width,height)=>{const next=Array(width*height).fill('#00000000');for(let y=0;y<Math.min(height,draft.tileHeight);y++)for(let x=0;x<Math.min(width,draft.tileWidth);x++)next[y*width+x]=draft.tilePixels[y*draft.tileWidth+x];draft.tileWidth=width;draft.tileHeight=height;draft.tilePixels=next;};
      add('宽（格）',{value:draft.tileWidth,min:1,max:64,step:1},value=>commit('设置自定义纹理宽度',()=>resize(Math.max(1,Math.min(64,Math.round(finite(value,4)))),draft.tileHeight),true),'tileWidth');
      add('高（格）',{value:draft.tileHeight,min:1,max:64,step:1},value=>commit('设置自定义纹理高度',()=>resize(draft.tileWidth,Math.max(1,Math.min(64,Math.round(finite(value,4))))),true),'tileHeight');
      add('单格单位',{select:true,value:draft.tileScaleMode,options:[{value:'pixel',label:'画布像素'},{value:'sampling',label:'跟随采样尺寸'}]},value=>commit('设置自定义纹理单格单位',next=>next.tileScaleMode=value,true),'tileScaleMode');
      if(draft.tileScaleMode!=='sampling')add('单格大小',{value:draft.tileScale,min:1,max:16,step:1},value=>commit('设置自定义纹理单格大小',next=>next.tileScale=Math.max(1,Math.min(16,Math.round(finite(value,1))))),'tileScale');
      const tools=root.createElement('div'),preset=root.createElement('select'),importButton=root.createElement('button'),rotateButton=root.createElement('button'),mirrorButton=root.createElement('button'),file=root.createElement('input'),edit=root.createElement('canvas'),paint=root.createElement('div'),brush=root.createElement('input'),tone=root.createElement('input'),opacity=root.createElement('input'),erase=root.createElement('input'),status=root.createElement('small');
      tools.className='v4-custom-tile-tools';edit.className='v4-custom-tile-editor';paint.className='v4-custom-tile-paint';file.type='file';file.accept='image/png';file.hidden=true;
      for(const [value,label] of [['','新建 / 预设'],['blank','空白'],['bayer2','Bayer 2×2'],['bayer4','Bayer 4×4'],['bayer8','Bayer 8×8']])preset.append(new Option(label,value));
      preset.addEventListener('change',()=>{const value=preset.value;preset.value='';if(!value)return;const pattern=value==='blank'?partsState.defaultTexture('custom',draft.color):global.ToSampoolRuntimeVNext?.modules?.pattern?.bayer(+value.slice(5));if(!pattern)return;commit('生成自定义纹理',next=>{Object.keys(next).forEach(key=>delete next[key]);Object.assign(next,pattern);},true,'tilePixels');});
      importButton.type='button';importButton.textContent='导入 PNG';importButton.addEventListener('click',()=>file.click());
      rotateButton.type='button';rotateButton.textContent='↻ 90°';rotateButton.addEventListener('click',()=>commit('旋转自定义纹理',next=>{const width=next.tileWidth,height=next.tileHeight,pixels=next.tilePixels.slice();next.tileWidth=height;next.tileHeight=width;next.tilePixels=Array.from({length:width*height},(_,index)=>{const x=index%height,y=Math.floor(index/height);return pixels[(height-1-x)*width+y];});},true,'tilePixels'));
      mirrorButton.type='button';mirrorButton.textContent='⇄ 镜像';mirrorButton.addEventListener('click',()=>commit('镜像自定义纹理',next=>{const width=next.tileWidth,pixels=next.tilePixels.slice();next.tilePixels=pixels.map((_,index)=>pixels[Math.floor(index/width)*width+(width-1-index%width)]);},true,'tilePixels'));
      tools.append(preset,importButton,rotateButton,mirrorButton,file);panel.append(tools);
      const unit=Math.max(3,Math.floor(216/Math.max(draft.tileWidth,draft.tileHeight))),canvasWidth=draft.tileWidth*unit,canvasHeight=draft.tileHeight*unit;edit.width=canvasWidth;edit.height=canvasHeight;
      const redrawCells=()=>{const ctx=edit.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,edit.width,edit.height);for(let y=0;y<draft.tileHeight;y++)for(let x=0;x<draft.tileWidth;x++){const at=y*draft.tileWidth+x,hex=draft.tilePixels[at],px=x*unit,py=y*unit;ctx.fillStyle=(x+y)%2?'#343a46':'#596272';ctx.fillRect(px,py,unit,unit);if(hex&&hex!=='#00000000'){ctx.fillStyle=hex;ctx.fillRect(px,py,unit,unit);}ctx.strokeStyle='#12172266';ctx.strokeRect(px+.5,py+.5,unit-1,unit-1);}};
      const label=(name,node)=>{const row=root.createElement('label'),caption=root.createElement('span');caption.textContent=name;row.append(caption,node);paint.append(row);};
      brush.type='color';brush.value='#ffffff';label('画笔颜色',brush);tone.type='checkbox';tone.checked=true;label('灰阶',tone);opacity.type='number';opacity.min='0';opacity.max='100';opacity.step='1';opacity.value='100';label('画笔透明度 %',opacity);erase.type='checkbox';label('擦除',erase);
      let dragging=false,dirty=false,last=-1,paintBefore=null;const atPointer=event=>{const rect=edit.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)/rect.width*draft.tileWidth),y=Math.floor((event.clientY-rect.top)/rect.height*draft.tileHeight);return x<0||y<0||x>=draft.tileWidth||y>=draft.tileHeight?-1:y*draft.tileWidth+x;};
      const apply=event=>{const at=atPointer(event);if(at<0||at===last)return;last=at;const raw=brush.value.slice(1),r=parseInt(raw.slice(0,2),16),g=parseInt(raw.slice(2,4),16),b=parseInt(raw.slice(4,6),16),gray=Math.round(r*.2126+g*.7152+b*.0722).toString(16).padStart(2,'0'),rgb=tone.checked?gray+gray+gray:raw,alpha=Math.round(Math.max(0,Math.min(100,finite(opacity.value,100)))*2.55).toString(16).padStart(2,'0'),next=erase.checked?'#00000000':`#${rgb}${alpha}`;if(draft.tilePixels[at]===next)return;draft.tilePixels[at]=next;dirty=true;redrawCells();redraw();};
      edit.addEventListener('pointerdown',event=>{if(options.readOnly?.('tilePixels'))return;event.preventDefault();paintBefore=partsState.normalizeTexture(draft,color);dragging=true;last=-1;edit.setPointerCapture(event.pointerId);apply(event);});edit.addEventListener('pointermove',event=>{if(dragging)apply(event);});const finish=()=>{if(!dragging)return;dragging=false;last=-1;if(dirty){dirty=false;write('绘制自定义纹理',partsState.normalizeTexture(draft,color),{key:'tilePixels',before:paintBefore});}};edit.addEventListener('pointerup',finish);edit.addEventListener('pointercancel',finish);
      let importRequest=0;
      file.addEventListener('change',()=>{
        const selected=file.files&&file.files[0];if(!selected)return;
        const request=++importRequest,stamp=options.captureContext?.(),reader=new FileReader();
        const current=()=>panel.isConnected&&request===importRequest&&(!options.sameContext||options.sameContext(stamp));
        reader.onload=()=>{
          if(!current())return;const image=new Image();
          image.onload=()=>{
            if(!current())return;
            const divisor=Math.max(1,image.width/64,image.height/64),width=Math.max(1,Math.round(image.width/divisor)),height=Math.max(1,Math.round(image.height/divisor)),canvas=root.createElement('canvas');canvas.width=width;canvas.height=height;
            const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,width,height);
            const bytes=ctx.getImageData(0,0,width,height).data,pixels=Array.from({length:width*height},(_,index)=>'#'+Array.from(bytes.slice(index*4,index*4+4),value=>value.toString(16).padStart(2,'0')).join(''));
            commit('导入自定义纹理',next=>{next.tileWidth=width;next.tileHeight=height;next.tilePixels=pixels;},true,'tilePixels');
          };image.src=reader.result;
        };reader.readAsDataURL(selected);
      });
      const tileRow=root.createElement('div');tileRow.className='v4-pattern-parameter';tileRow.append(edit);panel.append(tileRow,paint,status);bind(edit,'tilePixels');
      for(const action of [preset,importButton,rotateButton,mirrorButton])action.disabled=!!options.readOnly?.('tilePixels');
      status.textContent='逐格绘制；透明格不会覆盖原图。Bayer 预设可继续手绘修改。';redrawCells();
    } else if(draft.type==='noise'){
      add('噪点强度',{value:draft.density,min:0,max:1,step:.01},value=>commit('设置噪点强度',next=>next.density=Math.max(0,Math.min(1,finite(value,.18)))),'noiseDensity');
      add('颗粒大小',{value:draft.size,min:1,max:16,step:1},value=>commit('设置噪点颗粒大小',next=>next.size=Math.max(1,Math.round(finite(value,1)))),'noiseSize');
      add('随机种子',{value:draft.seed,step:1},value=>commit('设置噪点随机种子',next=>next.seed=Math.round(finite(value,1))),'noiseSeed');
    } else if(draft.type==='lines'){
      const layers=draft.layers||[],base=layers[0]||{angle:45,width:1,spacing:4};
      if(style==='layers')layers.forEach((layer,index)=>{
        const prefix=index?'layer'+(index+1):null;
        add(`第 ${index+1} 层角度`,{value:layer.angle,step:1},value=>commit('设置叠线角度',next=>next.layers[index].angle=finite(value,0)),prefix?prefix+'Angle':'angle');
        add(`第 ${index+1} 层线宽`,{value:layer.width,min:1,step:1},value=>commit('设置叠线线宽',next=>{next.layers[index].width=Math.max(1,finite(value,1));next.layers[index].spacing=Math.max(next.layers[index].width,+next.layers[index].spacing||next.layers[index].width);}),prefix?prefix+'Width':'size');
        add(`第 ${index+1} 层格距`,{value:layer.spacing??layer.width+layer.gap,min:layer.width,step:1},value=>commit('设置叠线格距',next=>next.layers[index].spacing=Math.max(next.layers[index].width,finite(value,next.layers[index].width))),prefix?prefix+'Spacing':'spacing');
      });
      else{
        add('整体旋转',{value:base.angle,step:1},value=>commit('设置纹理旋转',next=>{const angle=finite(value,0);next.layers.forEach((layer,index)=>layer.angle=angle+(style==='grid'?index*90:0));}),'angle');
        add('线宽',{value:base.width,min:1,step:1},value=>commit('设置纹理线宽',next=>next.layers.forEach(layer=>{layer.width=Math.max(1,finite(value,1));layer.spacing=Math.max(layer.width,+layer.spacing||layer.width);})),'size');
        add('格距',{value:base.spacing??base.width+base.gap,min:base.width,step:1},value=>commit('设置纹理格距',next=>next.layers.forEach(layer=>layer.spacing=Math.max(layer.width,finite(value,layer.width)))),'spacing');
      }
      if(style==='layers'&&layers.length<3){const more=root.createElement('button');more.type='button';more.className='small';more.textContent='+ 线层';more.disabled=!!options.readOnly?.('texture');more.addEventListener('click',()=>commit('增加叠线',next=>next.layers.push({angle:next.layers.length===1?135:0,width:1,spacing:4}),true,'texture'));panel.append(more);}
    }else{
      add('整体旋转',{value:draft.angle,step:1},value=>commit('设置纹理旋转',next=>next.angle=finite(value,0)),'angle');
      add('图样大小',{value:draft.size,min:1,step:1},value=>commit('设置纹理大小',next=>{next.size=Math.max(1,finite(value,1));next.spacing=Math.max(next.size,+next.spacing||next.size);}),'size');
      add('格距',{value:draft.spacing??draft.size+draft.gap,min:draft.size,step:1},value=>commit('设置纹理格距',next=>next.spacing=Math.max(next.size,finite(value,next.size))),'spacing');
      if(draft.type==='dots'){
        add('点形',{select:true,value:draft.roundness>=.98?'circle':String(draft.sides||4),options:['circle','3','4','5','6'].map(pointOption)},value=>commit('设置点纹形状',next=>{next.roundness=value==='circle'?1:0;next.sides=value==='circle'?4:Math.max(3,Math.min(6,finite(value,4)));}),'shape');
        add('排列',{select:true,value:draft.layout||'regular',options:[{value:'regular',label:'整齐'},{value:'stagger',label:'错列'}]},value=>commit('设置点纹排列',next=>next.layout=value),'layout');
        if(draft.layout==='stagger')add('错列偏移',{value:draft.phase,min:0,max:1,step:.05},value=>commit('设置错列偏移',next=>next.phase=Math.max(0,Math.min(1,finite(value,0)))),'rowPhase');
      }
    }
    if(draft.type!=='noise'){
      add('起始偏移 X',{value:Math.max(0,Math.min(1,draft.phaseX||0)),min:0,max:1,step:.05},value=>commit('设置纹理起始偏移 X',next=>{next.phaseX=Math.max(0,Math.min(1,finite(value,0)));}),'phaseX');
      add('起始偏移 Y',{value:Math.max(0,Math.min(1,draft.phaseY||0)),min:0,max:1,step:.05},value=>commit('设置纹理起始偏移 Y',next=>{next.phaseY=Math.max(0,Math.min(1,finite(value,0)));}),'phaseY');
    }
    redraw();return panel;
  }

  global.EditorClassicV4PatternField=Object.freeze({render});
})(typeof window!=='undefined'?window:globalThis);
