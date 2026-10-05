/* ToSampool Runtime vNext source module: base content only, before vNext effects. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  // Host adapters may hand the Runtime a CanvasImageSource directly or wrap it
  // as { image }, { canvas }, or { bitmap }.  Serialized scene data keeps only
  // the locator; the resolved drawable stays in this non-serialized asset map.
  function drawable(raw) {
    if (!raw) return null;
    if (raw.image || raw.canvas || raw.bitmap) return raw.image || raw.canvas || raw.bitmap;
    // Persisted asset descriptors are deliberately not drawable. The host must
    // resolve their locator and inject a matching runtimeAssets entry first.
    if (typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'locator')) return null;
    return raw;
  }
  function asset(scene, id) { return drawable(scene.assets && scene.assets[id]); }
  function assetFrame(scene, id, time, source) {
    const raw = scene.assets && scene.assets[id]; if (!raw) return null;
    const frames = Array.isArray(raw.frames) && raw.frames.length ? raw.frames : null;
    if (!frames) return drawable(raw);
    const fps = Math.max(.1, +(source && source.fps) || +raw.fps || 8), count = frames.length, explicit=source&&Number.isFinite(+source._assetFrame), index = explicit ? Math.max(0,Math.min(count-1,Math.round(+source._assetFrame))) : (source && source.frameLoop === false || raw.frameLoop === false ? Math.min(count - 1, Math.floor(Math.max(0, time) * fps)) : Math.floor(Math.max(0, time) * fps) % count);
    return drawable(frames[index]);
  }
  function roundedRect(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(+radius || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    if (!r) { ctx.rect(x, y, w, h); return; }
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  }
  function patternTexture(scene,part,time){const pat=part.fillPattern,color=pat.color&&pat.color!=='inherit'?pat.color:(part.fill||'#ffffff');return api.modules.pattern.texture(Math.max(1,scene.width),Math.max(1,scene.height),pat,color,{time:time||0,dynamic:!!(pat.motion&&pat.motion.enabled)});}
  function partMotion(part, time) {
    const out=Object.assign({},part),anim=part.anim||{},phase=time*Math.PI*2,curve=(period,mode)=>api.modules.frame.curve(time/Math.max(.001,+period||1),mode);
    if(anim.bob&&Number.isFinite(+anim.bob.amount)){const offset=curve(anim.bob.period,anim.bob.curve)*+anim.bob.amount,angle=(Number.isFinite(+anim.bob.angle)?+anim.bob.angle:90)*Math.PI/180,dx=Math.cos(angle)*offset,dy=Math.sin(angle)*offset;out.x=(+out.x||0)+dx;out.y=(+out.y||0)+dy;if(out.type==='line'){out.x2=(+out.x2||0)+dx;out.y2=(+out.y2||0)+dy;}else if(out.type==='stroke')out.points=(out.points||[]).map(point=>[(+point[0]||0)+dx,(+point[1]||0)+dy]);}
    if(anim.scroll&&Number.isFinite(+anim.scroll.speed)){const angle=(+anim.scroll.angle||0)*Math.PI/180,span=Math.max(0,+anim.scroll.span||0),raw=time*+anim.scroll.speed,distance=anim.scroll.repeat!==false&&span>0?((raw%span)+span)%span:raw,dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;out.x=(+out.x||0)+dx;out.y=(+out.y||0)+dy;if(out.type==='line'){out.x2=(+out.x2||0)+dx;out.y2=(+out.y2||0)+dy;}else if(out.type==='stroke')out.points=(out.points||[]).map(point=>[(+point[0]||0)+dx,(+point[1]||0)+dy]);}
    if(anim.spin&&Number.isFinite(+anim.spin.speed))out.rot=(+out.rot||0)+time*+anim.spin.speed;
    if(anim.blink)out.alpha=(out.alpha==null?1:+out.alpha)*api.modules.frame.blinkAlpha(anim.blink,time);
    if(anim.pulse&&Number.isFinite(+anim.pulse.amount)){const scale=1+curve(anim.pulse.period,anim.pulse.curve)*+anim.pulse.amount;out.scaleX=(Number.isFinite(+out.scaleX)?+out.scaleX:1)*scale;out.scaleY=(Number.isFinite(+out.scaleY)?+out.scaleY:1)*scale;}
    if(anim.wave&&Number.isFinite(+anim.wave.amount))out.rot=(+out.rot||0)+Math.sin(phase/Math.max(.001,+anim.wave.period||1))*+anim.wave.amount;
    return out;
  }
  function partBox(part){if(part.type==='line'){const x=Math.min(+part.x||0,+part.x2||0),y=Math.min(+part.y||0,+part.y2||0);return{x,y,w:Math.max(1,Math.abs((+part.x2||0)-(+part.x||0))),h:Math.max(1,Math.abs((+part.y2||0)-(+part.y||0)))};}if(part.type==='stroke'){const points=Array.isArray(part.points)&&part.points.length?part.points:[[+part.x||0,+part.y||0]],xs=points.map(point=>+point[0]||0),ys=points.map(point=>+point[1]||0),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(1,Math.max(...xs)-x),h:Math.max(1,Math.max(...ys)-y)};}return{x:+part.x||0,y:+part.y||0,w:Math.max(1,+part.w||1),h:Math.max(1,+part.h||1)};}
  function paintPath(ctx, part, scene, origin, time) {
    const pattern=part.fillPattern&&part.fillPattern.type&&part.fillPattern.type!=='none'?part.fillPattern:null,solid=part.fill&&(!pattern||pattern.mode!=='replace');
    if(solid&&part.type!=='line'&&part.type!=='stroke'){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,part.fillAlpha==null?1:+part.fillAlpha));ctx.fillStyle=pattern&&pattern.mode==='overlay'?(pattern.baseColor||part.fill):part.fill;ctx.fill();ctx.restore();}
    if(pattern&&part.type!=='line'&&part.type!=='stroke'){const texture=patternTexture(scene,part,time);if(texture){ctx.save();ctx.clip();if(ctx.setTransform)ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha*=Math.max(0,Math.min(1,pattern.opacity==null?1:+pattern.opacity));ctx.drawImage(texture,-(origin&&origin.x||0),-(origin&&origin.y||0));ctx.restore();}}
    if(part.stroke&&Math.max(0,+part.strokeWidth||0)>0){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,part.strokeAlpha==null?1:+part.strokeAlpha));ctx.strokeStyle=part.stroke;ctx.lineWidth=Math.max(0,+part.strokeWidth||0);ctx.stroke();ctx.restore();}
  }
  function drawPart(ctx, raw, ownerW, ownerH, time, scene, origin) {
    if(!raw||raw.hidden)return;const part=partMotion(raw,time||0),box=partBox(part),cx=box.x+box.w/2,cy=box.y+box.h/2;
    ctx.save();ctx.translate(-ownerW/2,-ownerH/2);ctx.globalAlpha*=Math.max(0,Math.min(1,part.alpha==null?1:+part.alpha));ctx.globalCompositeOperation=part.blend&&part.blend!=='normal'?part.blend:'source-over';ctx.translate(cx,cy);ctx.rotate((+part.rot||0)*Math.PI/180);ctx.scale(Number.isFinite(+part.scaleX)?+part.scaleX:1,Number.isFinite(+part.scaleY)?+part.scaleY:1);ctx.translate(-cx,-cy);ctx.beginPath();
    if(part.type==='ellipse')ctx.ellipse(box.x+box.w/2,box.y+box.h/2,box.w/2,box.h/2,0,0,Math.PI*2);
    else if(part.type==='line'){ctx.moveTo(+part.x||0,+part.y||0);ctx.lineTo(+part.x2||0,+part.y2||0);}
    else if(part.type==='stroke'&&Array.isArray(part.points)&&part.points.length>=2){part.points.forEach((point,index)=>{const x=+point[0]||0,y=+point[1]||0;if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);});}
    else if(part.type==='poly'&&Array.isArray(part.points)&&part.points.length>=3){part.points.forEach((point,index)=>{const x=box.x+(+point[0]||0)*box.w,y=box.y+(+point[1]||0)*box.h;if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();}
    else {roundedRect(ctx,box.x,box.y,box.w,box.h,part.radius);ctx.closePath();}
    paintPath(ctx,part,scene,origin,time);ctx.restore();
  }
  function drawParts(ctx, entity, values, frame, scene, origin){for(const part of values&&Array.isArray(values.parts)?values.parts:entity.parts||[])drawPart(ctx,part,values.w,values.h,frame&&frame.time||0,scene,origin);}
  function draw(ctx, scene, entity, values, frame, origin) {
    if (entity.type === 'group') return;
    const w = values.w, h = values.h;
    ctx.save();
    if (values.parentMatrix && ctx.transform) ctx.transform(...values.parentMatrix);
    /* An effected object is built at full Alpha in a transparent capsule.
       Both its opacity and blend belong to the final scene composite, after
       mask/decorate/sample work; otherwise an outer decoration leaks through
       the object's own semi-transparent source. */
    const deferComposite=origin&&origin.deferComposite;
    ctx.globalAlpha *= deferComposite?1:(values.parentAlpha == null ? 1 : values.parentAlpha) * values.alpha;
    ctx.globalCompositeOperation = deferComposite ? 'source-over' : ({normal:'source-over',screen:'screen',multiply:'multiply',lighter:'lighter'})[values.blend || entity.blend || 'normal'] || 'source-over';
    const pivot=api.modules.frame.pivotFor(values);
    ctx.translate(values.x + pivot.x, values.y + pivot.y);
    ctx.rotate(values.rot * Math.PI / 180);
    ctx.scale(values.scaleX, values.scaleY);
    const skewX=Math.tan(Math.max(-80,Math.min(80,+values.skewX||0))*Math.PI/180),skewY=Math.tan(Math.max(-80,Math.min(80,+values.skewY||0))*Math.PI/180);
    if(skewX||skewY)ctx.transform(1+skewX*skewY,skewY,skewX,1,0,0);
    ctx.translate(w / 2 - pivot.x, h / 2 - pivot.y);
    ctx.fillStyle = values.fill || '#ffffff';
    ctx.strokeStyle = values.stroke || '#000000';
    ctx.lineWidth = Math.max(0, +values.strokeWidth || 0);
    if (entity.type === 'builtin') { api.modules.builtins.render(ctx, entity, values, frame); drawParts(ctx, entity, values, frame, scene, origin); }
    else if (entity.type === 'procedural') { api.modules.sceneModules.render(ctx, entity, values, frame, scene); drawParts(ctx, entity, values, frame, scene, origin); }
    else if (entity.type === 'vector') { drawParts(ctx, entity, values, frame, scene, origin); }
    else if (entity.type === 'ellipse') { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); paintPath(ctx,Object.assign({},values,{type:'ellipse'}),scene,origin,frame&&frame.time||0); }
    else if (entity.type === 'poly' && Array.isArray(values.points) && values.points.length >= 3) { ctx.beginPath(); values.points.forEach((point, index) => { const x = (+point[0] - .5) * w, y = (+point[1] - .5) * h; if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); paintPath(ctx,Object.assign({},values,{type:'poly'}),scene,origin,frame&&frame.time||0); }
    else if (entity.type === 'line') { ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); paintPath(ctx,Object.assign({},values,{type:'line'}),scene,origin,frame&&frame.time||0); }
    else if (entity.type === 'text') {
      const raster = values.rasterAssetId && asset(scene, values.rasterAssetId);
      if (raster && ctx.drawImage) ctx.drawImage(raster, -w / 2, -h / 2, w, h);
      else {
        const size=Math.max(1,+values.fontSize||16),tracking=+values.letterSpacing||0,lineHeight=Math.max(.5,+values.lineHeight||1.25),lines=String(values.text||'').split('\n');ctx.font=`${size}px ${values.fontFamily||'sans-serif'}`;ctx.textBaseline='top';
        lines.forEach((line,row)=>{let x=-w/2;for(const char of Array.from(line)){ctx.fillText(char,x,-h/2+row*size*lineHeight);x+=ctx.measureText?ctx.measureText(char).width+tracking:size*.6+tracking;}});
      }
      drawParts(ctx, entity, values, frame, scene, origin);
    }
    else if (entity.type === 'image') {
      const image = assetFrame(scene, entity.assetId, frame && frame.time || 0, entity);
      if (!image) throw new Error(`图片实体「${entity.id}」缺少已解析素材：${entity.assetId || '(空)'}`);
      if (ctx.drawImage) ctx.drawImage(image, -w / 2, -h / 2, w, h);
      drawParts(ctx, entity, values, frame, scene, origin);
    }
    else if (entity.type === 'rect') { if(!values.fillPattern&&!+values.radius){if(values.fill){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,values.fillAlpha==null?1:+values.fillAlpha));ctx.fillStyle=values.fill;ctx.fillRect(-w/2,-h/2,w,h);ctx.restore();}if(values.stroke&&Math.max(0,+values.strokeWidth||0)>0){ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,values.strokeAlpha==null?1:+values.strokeAlpha));ctx.strokeStyle=values.stroke;ctx.lineWidth=Math.max(0,+values.strokeWidth||0);ctx.strokeRect(-w/2,-h/2,w,h);ctx.restore();}}else{ctx.beginPath();roundedRect(ctx,-w/2,-h/2,w,h,values.radius);ctx.closePath();paintPath(ctx,Object.assign({},values,{type:'rect'}),scene,origin,frame&&frame.time||0);}drawParts(ctx, entity, values, frame, scene, origin); }
    else { ctx.fillRect(-w / 2, -h / 2, w, h); if (ctx.lineWidth) ctx.strokeRect(-w / 2, -h / 2, w, h); drawParts(ctx, entity, values, frame, scene, origin); }
    ctx.restore();
  }
  function drawGroup(ctx, scene, group, frame) {
    for (const entity of scene.entities) {
      if (entity.parentId !== group.id) continue;
      if (entity.type === 'group') drawGroup(ctx, scene, entity, frame);
      else draw(ctx, scene, entity, frame.valuesFor(entity), frame);
    }
  }
  function drawBackground(ctx, scene, frame) {
    const layers = scene.background && scene.background.layers || [];
    for (const layer of layers) { if (!layer || layer.hidden || !layer.assetId) continue; const image = assetFrame(scene, layer.assetId, frame && frame.time || 0, layer); if (!image || !ctx.drawImage) continue; const alpha = Math.max(0, Math.min(1, layer.alpha == null ? 1 : +layer.alpha)); if (!alpha) continue; const w = Math.max(1, +layer.w || image.width || scene.width), h = Math.max(1, +layer.h || image.height || scene.height); ctx.save(); ctx.globalAlpha *= alpha; if (layer.layout === 'stretch') ctx.drawImage(image, 0, 0, scene.width, scene.height); else if (layer.layout === 'tile') { for (let y = (+layer.y || 0) - h; y < scene.height; y += h) for (let x = (+layer.x || 0) - w; x < scene.width; x += w) ctx.drawImage(image, x, y, w, h); } else ctx.drawImage(image, +layer.x || 0, +layer.y || 0, w, h); ctx.restore(); }
  }
  api.modules.content = Object.freeze({ draw, drawPart, drawParts, drawGroup, asset, assetFrame, drawBackground });
})(typeof window !== 'undefined' ? window : globalThis);
