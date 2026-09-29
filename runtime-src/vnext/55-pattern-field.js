/* ToSampool Runtime vNext source module: shared procedural Pattern Field. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  // `cache` stores final, static stamps. `tileCache` stores the much smaller
  // repeat unit used by patterns whose period is exact.  Keeping these caches
  // separate lets animated phase only repaint a native CanvasPattern instead
  // of re-running the JS geometry loops every frame.
  const cache = new Map();
  const tileCache = new Map();
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function makeCanvas(width,height){if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);if(global.document&&global.document.createElement){const canvas=global.document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}return null;}
  function polygon(ctx,cx,cy,radius,sides,roundness){
    if(roundness>=.98){ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();return;}
    const vertices=Array.from({length:sides},(_,index)=>[cx+Math.cos(index*Math.PI*2/sides)*radius,cy+Math.sin(index*Math.PI*2/sides)*radius]),cut=clamp(roundness*.46,0,.46);
    ctx.beginPath();if(!cut){ctx.moveTo(vertices[0][0],vertices[0][1]);for(let index=1;index<vertices.length;index++)ctx.lineTo(vertices[index][0],vertices[index][1]);ctx.closePath();ctx.fill();return;}
    vertices.forEach((point,index)=>{const previous=vertices[(index+sides-1)%sides],next=vertices[(index+1)%sides],a=[point[0]+(previous[0]-point[0])*cut,point[1]+(previous[1]-point[1])*cut],b=[point[0]+(next[0]-point[0])*cut,point[1]+(next[1]-point[1])*cut];if(!index)ctx.moveTo(a[0],a[1]);else ctx.lineTo(a[0],a[1]);ctx.quadraticCurveTo(point[0],point[1],b[0],b[1]);});ctx.closePath();ctx.fill();
  }
  function pointShape(pattern){
    if(pattern.shape==='triangle')return{sides:3,roundness:0};
    if(pattern.shape==='square')return{sides:4,roundness:0};
    if(pattern.shape==='pentagon')return{sides:5,roundness:0};
    if(pattern.shape==='circle')return{sides:4,roundness:1};
    if(pattern.shape==='hexagon')return{sides:6,roundness:0};
    return{sides:Math.max(3,Math.min(6,Math.round(finite(pattern.sides,4)))),roundness:clamp(finite(pattern.roundness,0),0,1)};
  }
  function motionStep(raw,time){const motion=raw&&raw.motion||{};if(!motion.enabled)return raw;const period=Math.max(.001,finite(motion.period,2)),phase=((finite(time,0)/period)%1+1)%1,steps=Math.max(1,Math.round(finite(motion.steps,8)));
    // Grain is not a translated geometric tile.  Legacy-style noise refreshes
    // a sparse deterministic dot set each tick, while keeping its footprint
    // and object-alpha clip intact.
    if(raw&&raw.type==='noise'&&(motion.type==='noise-snow'||motion.type==='random-hold'))return Object.assign({},raw,{noiseTick:Math.floor(finite(time,0)/period*steps),motion:Object.assign({},motion)});
    const layer=raw&&Array.isArray(raw.layers)&&raw.layers[0],fallback=layer?finite(layer.spacing,finite(layer.width,1)+Math.max(0,finite(layer.gap,3))):4,type=motion.type==='texture-drift'?'pattern-drift':motion.type==='random-hold'?'pattern-random':motion.type,spacing=Math.max(1,finite(raw&&raw.spacing,finite(raw&&raw.cell,fallback))),next=Object.assign({},raw,{motion:Object.assign({},motion,{type})});
    if(type==='pattern-drift'){const steps=Math.max(1,Math.round(finite(motion.steps,16))),tick=Math.floor(phase*steps)%steps,progress=tick/steps;next.phaseX=finite(raw.phaseX,0)+progress*Math.round(finite(motion.cyclesX,1))*spacing;next.phaseY=finite(raw.phaseY,0)+progress*Math.round(finite(motion.cyclesY,0))*spacing;}
    else if(type==='pattern-step'){const steps=Math.max(1,Math.round(finite(motion.steps,8))),tick=Math.floor(phase*steps)%steps;next.phaseX=finite(raw.phaseX,0)+tick*Math.round(finite(motion.stepX,1));next.phaseY=finite(raw.phaseY,0)+tick*Math.round(finite(motion.stepY,0));}
    else if(type==='pattern-random'){const steps=Math.max(1,Math.round(finite(motion.steps,8))),tick=Math.floor(phase*steps)%steps,seed=(Math.imul((Math.round(finite(motion.seed,1))+tick+1)|0,1103515245)+12345)>>>0,rangeX=Math.max(0,finite(motion.rangeX,1))*spacing,rangeY=Math.max(0,finite(motion.rangeY,1))*spacing;next.phaseX=finite(raw.phaseX,0)+Math.round(((seed&65535)/65535*2-1)*rangeX);next.phaseY=finite(raw.phaseY,0)+Math.round((((seed>>>16)&65535)/65535*2-1)*rangeY);}
    else if(type==='pattern-pulse'){const steps=Math.max(2,Math.round(finite(motion.steps,6))),tick=Math.floor(phase*steps)%steps,wave=Math.sin(tick/steps*Math.PI*2),amount=clamp(finite(motion.amount,.35),0,1);if(Array.isArray(raw.layers)){next.layers=raw.layers.map(layer=>Object.assign({},layer,{width:Math.max(1,Math.round(finite(layer.width,1)*(1+wave*amount)))}));}else next.size=Math.max(1,Math.round(finite(raw.size,3)*(1+wave*amount)));}
    return next;
  }
  function canonical(raw,color){
    const source=raw||{},type=['lines','dots','checker','noise'].includes(source.type)?source.type:'lines',result={type,color:source.color&&source.color!=='inherit'?source.color:(color||'#ffffff'),phaseX:finite(source.phaseX,0),phaseY:finite(source.phaseY,0)};
    if(type==='noise'){result.density=clamp(finite(source.density,.15),0,1);result.size=Math.max(1,Math.round(finite(source.size,1)));result.seed=Math.round(finite(source.seed,1));result.noiseTick=Math.round(finite(source.noiseTick,0));return result;}
    if(type==='lines'){
      result.layers=(Array.isArray(source.layers)&&source.layers.length?source.layers:[{angle:45,width:1,gap:3}]).slice(0,3).map(layer=>{const width=Math.max(1,finite(layer&&layer.width,1)),spacing=Math.max(width,finite(layer&&layer.spacing,width+Math.max(0,finite(layer&&layer.gap,3))));return{angle:finite(layer&&layer.angle,45),width,spacing,gap:Math.max(0,spacing-width)};});
      return result;
    }
    result.size=Math.max(1,finite(source.size,3));result.cell=Math.max(result.size,finite(source.cell,finite(source.spacing,result.size+Math.max(0,finite(source.gap,2)))));result.spacing=result.cell;result.gap=Math.max(0,result.cell-result.size);result.phase=clamp(finite(source.phase,type==='checker'?.5:0),0,1);result.angle=finite(source.angle,0);result.layout=source.layout==='stagger'?'stagger':type==='checker'?'checker':'regular';Object.assign(result,pointShape(source));return result;
  }
  function keyFor(width,height,pattern,color){return JSON.stringify({width,height,pattern:canonical(pattern,color)});}
  function axisAngle(value){const angle=((finite(value,0)%180)+180)%180;return Math.abs(angle)<.001||Math.abs(angle-90)<.001?Math.round(angle):null;}
  function gcd(a,b){a=Math.abs(a|0);b=Math.abs(b|0);while(b){const next=a%b;a=b;b=next;}return a||1;}
  function lcm(a,b){return Math.abs(a*b)/gcd(a,b);}
  function integerPeriod(value){const n=Math.round(value);return Math.abs(value-n)<.001&&n>0?n:null;}
  function tileSpec(raw,color){
    const pattern=canonical(raw,color);
    if(pattern.type==='dots'||pattern.type==='checker'){
      const angle=axisAngle(pattern.angle);if(angle!==0||pattern.layout==='stagger')return null;
      const step=integerPeriod(pattern.cell||Math.max(pattern.size+1,pattern.size+pattern.gap));if(!step)return null;
      // Checker occupancy repeats every two cells; dots repeat every cell.
      const period=pattern.type==='checker'?step*2:step;
      if(period>512)return null;
      return { pattern, width:period, height:period, kind:'points' };
    }
    if(pattern.type!=='lines')return null;
    let width=1,height=1;
    for(const layer of pattern.layers){
      const angle=axisAngle(layer.angle),period=integerPeriod(layer.spacing==null?layer.width+layer.gap:layer.spacing);
      if(angle==null||!period)return null;
      if(angle===0)height=lcm(height,period);else width=lcm(width,period);
      if(width>512||height>512)return null;
    }
    return { pattern, width, height, kind:'lines' };
  }
  function tileKey(spec){const pattern=Object.assign({},spec.pattern,{phaseX:0,phaseY:0});return JSON.stringify({width:spec.width,height:spec.height,pattern});}
  function paintTile(ctx,spec){
    const pattern=spec.pattern,W=spec.width,H=spec.height;ctx.clearRect(0,0,W,H);ctx.fillStyle=pattern.color;
    if(spec.kind==='lines'){
      for(const layer of pattern.layers){const angle=axisAngle(layer.angle);if(angle===0)ctx.fillRect(0,0,W,layer.width);else ctx.fillRect(0,0,layer.width,H);}
      return;
    }
    const checker=pattern.type==='checker',step=checker?W/2:W;
    for(let row=0;row<(checker?2:1);row++)for(let column=0;column<(checker?2:1);column++){
      if(checker&&((row+column)&1))continue;
      polygon(ctx,column*step+(checker?0:step/2),row*step+(checker?0:step/2),checker?step/2:pattern.size/2,checker?4:pattern.sides,checker?0:pattern.roundness);
    }
  }
  function repeatingTexture(width,height,raw,color){
    const spec=tileSpec(raw,color);if(!spec)return null;
    const key=tileKey(spec);let tile=tileCache.get(key);
    if(!tile){tile=makeCanvas(spec.width,spec.height);const tileCtx=tile&&tile.getContext&&tile.getContext('2d');if(!tileCtx)return null;paintTile(tileCtx,spec);tileCache.set(key,tile);if(tileCache.size>32)tileCache.delete(tileCache.keys().next().value);}
    const result=makeCanvas(width,height),ctx=result&&result.getContext&&result.getContext('2d');if(!ctx||typeof ctx.createPattern!=='function')return null;
    const brush=ctx.createPattern(tile,'repeat');if(!brush)return null;
    const pattern=spec.pattern;ctx.save();ctx.translate(finite(pattern.phaseX,0),finite(pattern.phaseY,0));ctx.fillStyle=brush;ctx.fillRect(-finite(pattern.phaseX,0),-finite(pattern.phaseY,0),width,height);ctx.restore();return result;
  }
  function paint(ctx,width,height,raw,color){
    const pattern=canonical(raw,color),extent=Math.ceil(Math.hypot(width,height))+24;ctx.fillStyle=pattern.color;
    if(pattern.type==='noise'){
      // Matches the useful Legacy grain character: sparse final-size squares,
      // not a full getImageData recolour pass.  It is deterministic for a
      // given seed/tick and remains cheap at large canvas dimensions.
      const dots=Math.min(360,Math.max(1,Math.round(width*height*pattern.density/14))),hash=(index,salt)=>{const value=Math.sin((index+1)*12.9898+(pattern.seed+1)*78.233+(pattern.noiseTick+1)*37.719+salt*19.17)*43758.5453;return value-Math.floor(value);};
      for(let index=0;index<dots;index++)ctx.fillRect(Math.floor(hash(index,1)*width),Math.floor(hash(index,2)*height),pattern.size,pattern.size);
      return pattern;
    }
    if(pattern.type==='lines'){
      for(const layer of pattern.layers){const step=Math.max(1,layer.spacing==null?layer.width+layer.gap:layer.spacing),angle=layer.angle*Math.PI/180;ctx.save();ctx.translate(width/2,height/2);ctx.rotate(angle);for(let y=-extent+pattern.phaseY;y<=extent;y+=step)ctx.fillRect(-extent+pattern.phaseX,y,extent*2,layer.width);ctx.restore();}return pattern;
    }
    const checker=pattern.type==='checker'||pattern.layout==='checker',step=pattern.cell||Math.max(pattern.size+1,pattern.size+pattern.gap),count=Math.ceil(extent/step)+2,angle=pattern.angle*Math.PI/180;ctx.save();ctx.translate(width/2,height/2);ctx.rotate(angle);
    for(let row=-count;row<=count;row++){const offset=(pattern.layout==='stagger'||checker)?Math.abs(row)%2*pattern.phase*step:0;for(let column=-count;column<=count;column++){if(checker&&((row+column)&1))continue;polygon(ctx,column*step+offset+pattern.phaseX,row*step+pattern.phaseY,pattern.size/2,checker?4:pattern.sides,checker?0:pattern.roundness);}}
    ctx.restore();return pattern;
  }
  function texture(width,height,pattern,color,options){const W=Math.max(1,Math.round(width)),H=Math.max(1,Math.round(height)),source=options&&options.time!=null?motionStep(pattern,options.time):pattern,dynamic=!!(options&&options.dynamic),key=keyFor(W,H,source,color);if(!dynamic&&cache.has(key))return cache.get(key);const repeated=repeatingTexture(W,H,source,color);const canvas=repeated||makeCanvas(W,H),ctx=canvas&&canvas.getContext&&canvas.getContext('2d');if(!ctx)return null;if(!repeated){ctx.clearRect(0,0,W,H);paint(ctx,W,H,source,color);}if(!dynamic){cache.set(key,canvas);if(cache.size>16)cache.delete(cache.keys().next().value);}return canvas;}
  function overlay(config){
    const value=config||{},scale=Math.max(.1,finite(value.scale,1)),spacing=Math.max(1,Math.round(finite(value.spacing,4)*scale)),size=Math.min(spacing,Math.max(1,Math.round(finite(value.size,1)*scale))),style=value.texture||'lines-horizontal',angle=finite(value.angle,0),phaseX=finite(value.phaseX,0),phaseY=finite(value.phaseY,0),common={color:value.color||'#ffffff',phaseX,phaseY,motion:value.motion};
    if(style==='noise')return Object.assign(common,{type:'noise',density:clamp(finite(value.noiseDensity,.15),0,1),size:Math.max(1,Math.round(finite(value.noiseSize,1))),seed:Math.round(finite(value.noiseSeed,1))});
    if(style==='dots')return Object.assign(common,{type:'dots',size,spacing,cell:spacing,angle,phase:clamp(finite(value.rowPhase,.5),0,1),shape:value.shape||'circle',layout:value.layout==='stagger'?'stagger':'regular'});
    if(style==='checker')return Object.assign(common,{type:'checker',size:spacing,gap:0,cell:spacing,angle,phase:.5,layout:'checker'});
    const layers=[{angle,width:size,spacing}];if(style==='grid')layers.push({angle:angle+90,width:size,spacing});if(style==='lines-layers'){layers.push({angle:finite(value.layer2Angle,angle+90),width:Math.min(Math.max(1,finite(value.layer2Width,1)),Math.max(1,finite(value.layer2Spacing,spacing))),spacing:Math.max(1,finite(value.layer2Spacing,spacing))});layers.push({angle:finite(value.layer3Angle,angle+135),width:Math.min(Math.max(1,finite(value.layer3Width,1)),Math.max(1,finite(value.layer3Spacing,spacing))),spacing:Math.max(1,finite(value.layer3Spacing,spacing))});}return Object.assign(common,{type:'lines',layers});
  }
  function clear(){cache.clear();tileCache.clear();}
  api.modules.pattern=Object.freeze({ canonical, paint, texture, overlay, motionStep, clear });
})(typeof window !== 'undefined' ? window : globalThis);
