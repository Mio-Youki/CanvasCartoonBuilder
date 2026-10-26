/* One shared color/gradient popover implementation, isolated per document. */
(function(global){
  'use strict';
  const instances=new WeakMap();
  function create(document){
    const window=document.defaultView;
    const normColor=c=>(c&&c.length===4?'#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]:c);
function colorRgb(hex) { hex=normColor(hex||'#ffffff'); const n=parseInt(hex.slice(1),16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function rgbHex(r,g,b) { return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join(''); }
function rgbHsv(r,g,b) { r/=255;g/=255;b/=255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn; let h=0; if(d){if(mx===r)h=((g-b)/d+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;} return {h,s:mx?d/mx:0,v:mx}; }
function hsvRgb(h,s,v) { const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c; let q=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x]; return {r:(q[0]+m)*255,g:(q[1]+m)*255,b:(q[2]+m)*255}; }
let colorPopover, colorBinding, onOutside, onKey, disposed=false;
function close(reason='commit') {
  const binding=colorBinding;if(!binding)return;
  if(reason==='cancel')binding.cancel();
  binding.finish();for(const clock of binding.timing||[])binding.timingHome.append(clock);colorBinding=null;if(colorPopover)colorPopover.hidden=true;
}
function dispose(){close();if(onOutside)document.removeEventListener('pointerdown',onOutside,true);if(onKey)document.removeEventListener('keydown',onKey,true);colorPopover?.remove();colorPopover=null;disposed=true;instances.delete(document);}
function gradientDefaults(type,color){return{type,angle:0,cx:.5,cy:.5,radius:.5,stops:[{offset:0,color:color||'#ffffff',alpha:1},{offset:1,color:'#ffffff',alpha:1}]};}
function gradientCss(paint){
  if(!paint||!Array.isArray(paint.stops))return'';
  const stops=paint.stops.map(s=>{const c=colorRgb(s.color),a=Math.max(0,Math.min(1,s.alpha==null?1:+s.alpha));return`rgba(${c.r},${c.g},${c.b},${a}) ${Math.round(s.offset*100)}%`;}).join(',');
  return paint.type==='radial'?`radial-gradient(circle at ${Math.round((paint.cx??.5)*100)}% ${Math.round((paint.cy??.5)*100)}%,${stops})`:`linear-gradient(${90+(+paint.angle||0)}deg,${stops})`;
}
function gradientCommit(final){if(!colorBinding||!colorBinding.paintEnabled)return;colorBinding.commitPaint(final);updateColorPopover();}
function ensureColorPopover() {
  if(disposed)throw Error('取色器已释放，请重新获取文档适配器');
  if (colorPopover) return colorPopover;
  const pop=document.createElement('div'); pop.className='color-pop'; pop.hidden=true;
  pop.innerHTML='<div class="color-pop-head"><span>纯色</span><button class="color-pop-close" type="button">×</button></div><div class="color-sv"><i class="color-sv-dot"></i></div><div class="color-slider-row"><button class="color-eyedropper" type="button" title="从屏幕取色">☰</button><input class="color-hue" type="range" min="0" max="360" step="1"></div><div class="color-slider-row color-alpha-row"><button class="color-eyedropper" type="button" title="从屏幕取色">☰</button><input class="color-alpha-range" type="range" min="0" max="100" step="1"></div><div class="color-pop-values"><input class="color-hex" maxlength="7" spellcheck="false"><input class="color-alpha-input" type="number" min="0" max="100" step="1"></div>';
  const modes=document.createElement('div');modes.className='color-mode-tabs';modes.innerHTML='<button type="button" data-paint-mode="solid">纯色</button><button type="button" data-paint-mode="linear">线性</button><button type="button" data-paint-mode="radial">径向</button>';
  const gradient=document.createElement('div');gradient.className='color-gradient-panel';gradient.innerHTML='<div class="color-gradient-preview" title="点击增加色标"></div><div class="color-gradient-stops"></div><div class="color-gradient-tools"><button type="button" class="gradient-add" title="增加色标">+</button><button type="button" class="gradient-remove" title="删除所选色标">−</button><label>位置 <input class="gradient-position" type="number" min="0" max="100" step="1"></label></div><div class="color-gradient-geometry"><label class="gradient-angle-field">角度 <input class="gradient-angle" type="number" step="1"></label><label class="gradient-cx-field">中心 X <input class="gradient-cx" type="number" min="0" max="100" step="1"></label><label class="gradient-cy-field">中心 Y <input class="gradient-cy" type="number" min="0" max="100" step="1"></label><label class="gradient-radius-field">半径 <input class="gradient-radius" type="number" min="1" max="200" step="1"></label></div><label class="color-gradient-overall">整体透明度 <input class="gradient-overall" type="number" min="0" max="100" step="1"></label>';
  pop.querySelector('.color-pop-head').after(modes,gradient);
  const timing=document.createElement('div');timing.className='color-timing-controls';pop.append(timing);
  timing.addEventListener('click',()=>updateColorPopover());
  document.body.appendChild(pop); colorPopover=pop;
  modes.addEventListener('click',event=>{const button=event.target.closest('[data-paint-mode]');if(!button||!colorBinding||!colorBinding.paintEnabled)return;const mode=button.dataset.paintMode,old=colorBinding.paint;if(mode==='solid')colorBinding.paint=null;else colorBinding.paint=old?Object.assign({},old,{type:mode}):gradientDefaults(mode,colorBinding.solidColor);colorBinding.stopIndex=0;colorBinding.commitPaint(true);updateColorPopover();});
  gradient.querySelector('.gradient-add').addEventListener('click',()=>{const b=colorBinding;if(!b||!b.paint||b.paint.stops.length>=8)return;const selected=b.paint.stops[b.stopIndex]||b.paint.stops[0],offset=Math.min(.99,Math.max(.01,selected.offset+.1));b.paint.stops.push({offset,color:selected.color,alpha:selected.alpha});b.paint.stops.sort((a,c)=>a.offset-c.offset);b.stopIndex=b.paint.stops.findIndex(s=>s.offset===offset);gradientCommit(true);});
  gradient.querySelector('.gradient-remove').addEventListener('click',()=>{const b=colorBinding;if(!b||!b.paint||b.paint.stops.length<=2)return;b.paint.stops.splice(b.stopIndex,1);b.stopIndex=Math.min(b.stopIndex,b.paint.stops.length-1);gradientCommit(true);});
  const fields=[['.gradient-position','offset',v=>Math.max(0,Math.min(1,v/100))],['.gradient-angle','angle',v=>v],['.gradient-cx','cx',v=>Math.max(0,Math.min(1,v/100))],['.gradient-cy','cy',v=>Math.max(0,Math.min(1,v/100))],['.gradient-radius','radius',v=>Math.max(.01,Math.min(2,v/100))]];
  for(const [selector,key,convert] of fields){const input=gradient.querySelector(selector);for(const type of ['input','change'])input.addEventListener(type,()=>{const b=colorBinding;if(!b||!b.paint)return;const target=key==='offset'?b.paint.stops[b.stopIndex]:b.paint;target[key]=convert(+input.value||0);if(key==='offset'){b.paint.stops.sort((a,c)=>a.offset-c.offset);b.stopIndex=b.paint.stops.indexOf(target);}gradientCommit(type==='change');});}
  const overall=gradient.querySelector('.gradient-overall');for(const type of ['input','change'])overall.addEventListener(type,()=>{if(!colorBinding||!colorBinding.paint)return;colorBinding.baseAlpha=Math.max(0,Math.min(1,(+overall.value||0)/100));gradientCommit(type==='change');});
  const bar=gradient.querySelector('.color-gradient-preview');bar.addEventListener('click',event=>{const b=colorBinding;if(!b||!b.paint||event.target!==bar||b.paint.stops.length>=8)return;const rect=bar.getBoundingClientRect(),offset=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),selected=b.paint.stops[b.stopIndex]||b.paint.stops[0];b.paint.stops.push({offset,color:selected.color,alpha:selected.alpha});b.paint.stops.sort((a,c)=>a.offset-c.offset);b.stopIndex=b.paint.stops.findIndex(stop=>stop.offset===offset);gradientCommit(true);});
  let draggingStop=null;gradient.querySelector('.color-gradient-stops').addEventListener('pointerdown',event=>{const button=event.target.closest('[data-stop-index]');if(!button||!colorBinding||!colorBinding.paint)return;const b=colorBinding;b.stopIndex=+button.dataset.stopIndex;draggingStop=b.paint.stops[b.stopIndex];gradient.querySelector('.color-gradient-stops').setPointerCapture(event.pointerId);updateColorPopover();});
  gradient.querySelector('.color-gradient-stops').addEventListener('pointermove',event=>{if(!draggingStop||!colorBinding||!colorBinding.paint)return;const rect=bar.getBoundingClientRect();draggingStop.offset=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));const b=colorBinding;b.paint.stops.sort((a,c)=>a.offset-c.offset);b.stopIndex=b.paint.stops.indexOf(draggingStop);gradientCommit(false);});
  gradient.querySelector('.color-gradient-stops').addEventListener('pointerup',()=>{if(draggingStop){draggingStop=null;gradientCommit(true);}});
  const sv=pop.querySelector('.color-sv'), hue=pop.querySelector('.color-hue'), ar=pop.querySelector('.color-alpha-range'), hex=pop.querySelector('.color-hex'), ai=pop.querySelector('.color-alpha-input');
  const apply=(final)=>{ if(!colorBinding)return; const rgb=hsvRgb(+hue.value,colorBinding.hsv.s,colorBinding.hsv.v), color=colorBinding.colorEditable?rgbHex(rgb.r,rgb.g,rgb.b):colorBinding.color, alpha=!colorBinding.alphaEditable?colorBinding.alpha:Math.max(0,Math.min(1,(+ar.value||0)/100)); colorBinding.hsv.h=+hue.value;colorBinding.change(color,alpha,final); updateColorPopover(); };
  const svAt=e=>{if(!colorBinding?.colorEditable)return;const r=sv.getBoundingClientRect();colorBinding.hsv.s=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));colorBinding.hsv.v=Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height));apply(false);};
  let drag=false; sv.addEventListener('pointerdown',e=>{drag=true;sv.setPointerCapture(e.pointerId);svAt(e);});sv.addEventListener('pointermove',e=>{if(drag)svAt(e);});sv.addEventListener('pointerup',e=>{if(drag){drag=false;svAt(e);apply(true);}});
  hue.addEventListener('input',()=>apply(false)); hue.addEventListener('change',()=>apply(true)); ar.addEventListener('input',()=>apply(false)); ar.addEventListener('change',()=>apply(true));
  hex.addEventListener('change',()=>{if(!colorBinding?.colorEditable)return;const val=normColor(hex.value.trim());if(/^#[0-9a-f]{6}$/i.test(val)){const rgb=colorRgb(val);colorBinding.hsv=rgbHsv(rgb.r,rgb.g,rgb.b);colorBinding.change(val,colorBinding.alphaEditable?(+ar.value||0)/100:colorBinding.alpha,true);updateColorPopover();}});
  ai.addEventListener('input',()=>{if(!colorBinding?.alphaEditable||ai.value===''||!ai.validity.valid)return;ar.value=+ai.value;apply(false);});ai.addEventListener('change',()=>{if(ai.value!==''&&ai.validity.valid)apply(true);});
  pop.querySelectorAll('.color-eyedropper').forEach(btn=>btn.addEventListener('click',async()=>{const binding=colorBinding;if(!binding?.colorEditable)return;if(!window.EyeDropper){btn.title='当前浏览器不支持屏幕取色';return;}try{const picked=await new window.EyeDropper().open();if(colorBinding!==binding)return;const rgb=colorRgb(picked.sRGBHex);binding.hsv=rgbHsv(rgb.r,rgb.g,rgb.b);binding.change(picked.sRGBHex,binding.alpha,true);updateColorPopover();}catch(_){}}));
  pop.querySelector('.color-pop-close').addEventListener('click',()=>close());
  onOutside=e=>{if(!pop.hidden&&!pop.contains(e.target)&&(!colorBinding||!colorBinding.button.contains(e.target)))close();};
  onKey=e=>{if(!pop.hidden&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close('cancel');}};
  document.addEventListener('pointerdown',onOutside,true);document.addEventListener('keydown',onKey,true);
  return pop;
}
function updateColorPopover() {
  if(!colorPopover||!colorBinding)return;
  const b=colorBinding,pop=colorPopover,paint=b.paint,gradient=pop.querySelector('.color-gradient-panel'),tabs=pop.querySelector('.color-mode-tabs');
  const timing=pop.querySelector('.color-timing-controls');timing.replaceChildren();for(const clock of b.timing||[]){clock.refresh();if(clock.dataset.colorTimingChannel)b[clock.dataset.colorTimingChannel+'Editable']=clock.timingView.editable;const row=document.createElement('span'),label=document.createElement('span');label.textContent=clock.dataset.channelLabel||clock.dataset.parameterKey;row.append(label,clock);timing.append(row);}
  tabs.hidden=!b.paintEnabled||b.ramp;gradient.hidden=!paint;pop.querySelector('.color-pop-head span').textContent=b.ramp?'渐变映射':paint?(paint.type==='radial'?'径向渐变':'线性渐变'):'纯色';
  gradient.querySelector('.color-gradient-geometry').hidden=!!b.ramp;
  gradient.querySelector('.color-gradient-overall').hidden=!!b.ramp;
  for(const button of tabs.querySelectorAll('button'))button.classList.toggle('active',button.dataset.paintMode===(paint?paint.type:'solid'));
  if(paint){
    b.stopIndex=Math.max(0,Math.min(paint.stops.length-1,b.stopIndex||0));const stop=paint.stops[b.stopIndex];b.color=stop.color;b.alpha=stop.alpha;b.hsv=rgbHsv(...Object.values(colorRgb(stop.color)));
    const preview=gradient.querySelector('.color-gradient-preview');preview.style.backgroundImage=gradientCss(paint)+',repeating-conic-gradient(#777 0 25%,#444 0 50%)';preview.style.backgroundSize='100% 100%,8px 8px';
    const stops=gradient.querySelector('.color-gradient-stops');stops.replaceChildren();paint.stops.forEach((entry,index)=>{const button=document.createElement('button');button.type='button';button.className='color-gradient-stop'+(index===b.stopIndex?' active':'');button.dataset.stopIndex=index;button.style.left=(entry.offset*100)+'%';button.style.background=entry.color;button.title=`色标 ${index+1} · ${Math.round(entry.offset*100)}%`;stops.append(button);});
    gradient.querySelector('.gradient-position').value=Math.round(stop.offset*100);gradient.querySelector('.gradient-angle').value=paint.angle||0;gradient.querySelector('.gradient-cx').value=Math.round((paint.cx??.5)*100);gradient.querySelector('.gradient-cy').value=Math.round((paint.cy??.5)*100);gradient.querySelector('.gradient-radius').value=Math.round((paint.radius??.5)*100);gradient.querySelector('.gradient-overall').value=Math.round(b.baseAlpha*100);
    gradient.querySelector('.gradient-angle-field').hidden=paint.type!=='linear';for(const name of ['cx','cy','radius'])gradient.querySelector('.gradient-'+name+'-field').hidden=paint.type!=='radial';
  }else{b.color=b.solidColor;b.alpha=b.baseAlpha;b.hsv=rgbHsv(...Object.values(colorRgb(b.color)));}
  const {h,s,v}=b.hsv,dot=pop.querySelector('.color-sv-dot'),hue=pop.querySelector('.color-hue'),ar=pop.querySelector('.color-alpha-range'),hex=pop.querySelector('.color-hex'),ai=pop.querySelector('.color-alpha-input'),color='hsl('+h+',100%,50%)';
  for(const selector of ['.color-hue','.color-hex','.color-eyedropper','[data-paint-mode]','.color-gradient-panel input','.color-gradient-panel button'])for(const control of pop.querySelectorAll(selector))control.disabled=!b.colorEditable;
  ar.disabled=ai.disabled=!b.alphaEditable;pop.querySelector('.color-sv').setAttribute('aria-disabled',String(!b.colorEditable));
  pop.classList.toggle('no-alpha',b.alphaEnabled===false);pop.querySelector('.color-sv').style.background='linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,'+color+')';dot.style.left=(s*100)+'%';dot.style.top=((1-v)*100)+'%';hue.value=h;ar.value=Math.round(b.alpha*100);ar.style.background='linear-gradient(to right,transparent,'+color+'),repeating-conic-gradient(#777 0 25%,#444 0 50%) 0/8px 8px';hex.value=b.color.toUpperCase();ai.value=Math.round(b.alpha*100);
  // Inspector mutations may replace the swatch while this popover remains open.
  // Keep its opening position instead of reading a detached button's zero rect.
}
function colorField(color, alpha, change, label, options) {
  if(disposed)throw Error('取色器已释放，请重新获取文档适配器');
  options=options||{};
  const alphaEnabled=options.alpha!==false,paintEnabled=!!options.paintEnabled,wrap=document.createElement('div');
  wrap.className='color-field';
  const button=document.createElement('button');button.type='button';button.className='color-swatch';button.title=label||'选择颜色';
  const pct=document.createElement('span');pct.className='color-alpha';pct.hidden=!alphaEnabled||!!options.ramp;wrap.append(button,pct);
  let paint=options.paint?JSON.parse(JSON.stringify(options.paint)):null;
  let colorEditable=true,alphaEditable=alphaEnabled,timing=[];
  const timingHome=document.createElement('span');timingHome.hidden=true;wrap.append(timingHome);
  wrap.setTiming=clocks=>{timing=clocks;for(const clock of clocks)timingHome.append(clock);if(colorBinding?.button===button){colorBinding.timing=timing;updateColorPopover();}};
  const redraw=()=>{button.style.background=paint?gradientCss(paint):(color||'#ffffff');button.classList.toggle('gradient',!!paint);pct.textContent=Math.round((alpha==null?1:alpha)*100)+'%';};redraw();
  button.addEventListener('click',()=>{
    const rgb=colorRgb(color),pop=ensureColorPopover();close();const initial={color,alpha,paint:paint?JSON.parse(JSON.stringify(paint)):null};
    colorBinding={button,timing,timingHome,color:color||'#ffffff',solidColor:color||'#ffffff',alpha:alpha==null?1:alpha,baseAlpha:alpha==null?1:alpha,alphaEnabled,colorEditable,alphaEditable,paintEnabled,paint,ramp:!!options.ramp,stopIndex:0,hsv:rgbHsv(rgb.r,rgb.g,rgb.b),
      change:(next,a,final)=>{
        const binding=colorBinding;
        if(binding.paint){const stop=binding.paint.stops[binding.stopIndex];stop.color=next;stop.alpha=a;binding.color=next;binding.alpha=a;binding.commitPaint(final);}
        else{color=next;alpha=a;binding.solidColor=next;binding.baseAlpha=a;binding.color=next;binding.alpha=a;redraw();paintEnabled?change(next,a,null,final):change(next,a,final);}
      },
      commitPaint:final=>{paint=colorBinding.paint;alpha=colorBinding.baseAlpha;redraw();change(color,alpha,paint?JSON.parse(JSON.stringify(paint)):null,final);},
      finish:()=>{if(change.finish)change.finish();},
      cancel:()=>{color=initial.color;alpha=initial.alpha;paint=initial.paint;redraw();if(options.cancel)options.cancel(color,alpha,paint);else if(paintEnabled)change(color,alpha,paint,true);else change(color,alpha,true);}
    };
    const r=button.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(window.innerWidth-238,r.left))+'px';pop.hidden=false;updateColorPopover();pop.style.top=Math.max(8,Math.min(r.bottom+6,window.innerHeight-pop.getBoundingClientRect().height-8))+'px';
  });
  wrap.setPaint=(nextColor,nextAlpha,nextPaint)=>{color=nextColor||'#ffffff';alpha=nextAlpha==null?1:nextAlpha;paint=nextPaint?JSON.parse(JSON.stringify(nextPaint)):null;redraw();if(colorBinding?.button===button){Object.assign(colorBinding,{color,solidColor:color,alpha,baseAlpha:alpha,paint});updateColorPopover();}};
  wrap.setEditable=channels=>{colorEditable=channels.color!==false;alphaEditable=alphaEnabled&&channels.alpha!==false;button.disabled=!colorEditable&&!alphaEditable&&!timing.some(clock=>{clock.refresh();return !clock.disabled;});if(colorBinding?.button===button){Object.assign(colorBinding,{colorEditable,alphaEditable});updateColorPopover();}};
  wrap.value=()=>({color,alpha,paint:paint?JSON.parse(JSON.stringify(paint)):null});
  return wrap;
}
    return Object.freeze({field:colorField,close,dispose});
  }
  function forDocument(document){let instance=instances.get(document);if(!instance){instance=create(document);instances.set(document,instance);}return instance;}
  global.EditorV4ColorPopover=Object.freeze({VERSION:1,forDocument});
})(typeof window!=='undefined'?window:globalThis);

