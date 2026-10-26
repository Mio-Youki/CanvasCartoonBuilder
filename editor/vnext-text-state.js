/* Editable text, portable full-text PNG and independently revealable glyph atlas. */
(function (global) {
  'use strict';
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  function settings(entity) {
    return {fontSize:Math.max(1, finite(entity && entity.fontSize, 16)),
      fontFamily:String(entity && entity.fontFamily || 'sans-serif'),
      letterSpacing:finite(entity && entity.letterSpacing, 0),
      lineHeight:Math.max(.5, Math.min(4, finite(entity && entity.lineHeight, 1.25))),
      fill:entity && entity.fill || '#ffffff', fillPaint:entity && entity.fillPaint || null,
      fillAlpha:Math.max(0, Math.min(1, finite(entity && entity.fillAlpha, 1)))};
  }
  function graphemes(text) {
    const reveal = global.ToSampoolRuntimeVNext && global.ToSampoolRuntimeVNext.modules.textReveal;
    if (reveal) return reveal.graphemes(text);
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity:'grapheme'}) : null;
    return segmenter ? Array.from(segmenter.segment(String(text || '')), item => item.segment) : Array.from(String(text || ''));
  }
  function measure(root, entity) {
    const ctx = root.createElement('canvas').getContext('2d'), config = settings(entity),
      lines = String(entity && entity.text || '').replace(/\r\n?/g, '\n').split('\n');
    ctx.font = config.fontSize + 'px ' + config.fontFamily;
    const widths = lines.map(line => graphemes(line).reduce((sum, char, index, chars) =>
      sum + ctx.measureText(char).width + (index < chars.length - 1 ? config.letterSpacing : 0), 0));
    return {width:Math.max(1, Math.ceil(Math.max(...widths))),
      height:Math.max(1, Math.ceil(lines.length * config.fontSize * config.lineHeight)), lines, config};
  }
  function configure(ctx, config, width, height) {
    ctx.font = config.fontSize + 'px ' + config.fontFamily; ctx.textBaseline = 'top';
    const paint = global.ToSampoolRuntimeVNext && global.ToSampoolRuntimeVNext.modules.paint;
    ctx.fillStyle = paint ? paint.style(ctx, config.fillPaint, {x:0,y:0,w:width,h:height}, config.fill) : config.fill;
    ctx.globalAlpha = config.fillAlpha;
  }
  const descriptor = (canvas, width, height, generated) => ({locator:canvas.toDataURL('image/png'),
    mime:'image/png', width, height, generated, internal:true});
  function prepare(root, entity) {
    const measured = measure(root, entity), {width,height,config,lines} = measured,
      scale = 2, canvas = root.createElement('canvas');
    canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext('2d'); ctx.scale(scale, scale); configure(ctx, config, width, height);
    const glyphs = [], positions = [{x:0,y:0}];
    for (let row = 0; row < lines.length; row++) {
      let x = 0; const y = row * config.fontSize * config.lineHeight, chars = graphemes(lines[row]);
      // Newlines take no typing beat, but move the insertion point to the new line.
      positions[positions.length - 1] = {x:0,y};
      for (let index = 0; index < chars.length; index++) {
        const char = chars[index], metrics = ctx.measureText(char),
          left = Math.max(0, Math.floor(x - finite(metrics.actualBoundingBoxLeft, 0) - 1)),
          top = Math.max(0, Math.floor(y - finite(metrics.actualBoundingBoxAscent, 0) - 1)),
          right = Math.min(width, Math.ceil(x + finite(metrics.actualBoundingBoxRight, metrics.width) + 1)),
          bottom = Math.min(height, Math.ceil(y + finite(metrics.actualBoundingBoxDescent, config.fontSize) + 1));
        ctx.fillText(char, x, y);
        glyphs.push({char,penX:x,penY:y,x:left,y:top,w:Math.max(0,right-left),h:Math.max(0,bottom-top)});
        x += metrics.width + (index < chars.length - 1 ? config.letterSpacing : 0);
        positions.push({x,y});
      }
    }
    // A packed atlas keeps overlapping/italic glyphs independent. No font file
    // or one-image-per-prefix sequence is required for exported playback.
    let packedX = 0, packedY = 0, rowHeight = 0, atlasWidth = 1;
    const rowLimit = Math.max(512, ...glyphs.map(glyph => glyph.w * scale));
    for (const glyph of glyphs) {
      glyph.sw = glyph.w * scale; glyph.sh = glyph.h * scale;
      if (packedX && packedX + glyph.sw > rowLimit) { packedY += rowHeight; packedX = 0; rowHeight = 0; }
      glyph.sx = packedX; glyph.sy = packedY;
      packedX += glyph.sw + 2; rowHeight = Math.max(rowHeight, glyph.sh + 2); atlasWidth = Math.max(atlasWidth, packedX);
    }
    const atlas = root.createElement('canvas'); atlas.width = atlasWidth; atlas.height = Math.max(1, packedY + rowHeight);
    const atlasCtx = atlas.getContext('2d');
    for (const glyph of glyphs) {
      if (!glyph.sw || !glyph.sh) continue;
      atlasCtx.save(); atlasCtx.beginPath(); atlasCtx.rect(glyph.sx,glyph.sy,glyph.sw,glyph.sh); atlasCtx.clip();
      atlasCtx.translate(glyph.sx - glyph.x * scale, glyph.sy - glyph.y * scale); atlasCtx.scale(scale,scale);
      configure(atlasCtx, config, width, height); atlasCtx.fillText(glyph.char,glyph.penX,glyph.penY); atlasCtx.restore();
    }
    return {raster:descriptor(canvas,width,height,'text-raster'),
      glyphAtlas:descriptor(atlas,atlas.width,atlas.height,'text-glyph-atlas'),
      layout:{version:1,width,height,fontSize:config.fontSize,positions,
        glyphs:glyphs.map(({sx,sy,sw,sh,x,y,w,h}) => ({sx,sy,sw,sh,x,y,w,h}))}};
  }
  function rasterize(root, entity) { return prepare(root, entity).raster; }
  function update(scene, id, patch, root) {
    const entity = (scene && scene.entities || []).find(item => item && item.id === id);
    if (!entity || entity.type !== 'text') throw new Error(`找不到文字对象「${id || '(空)'}」`);
    Object.assign(entity, patch || {});
    const prepared = prepare(root,entity), rasterId = 'text-raster-' + entity.id,
      glyphId = 'text-glyphs-' + entity.id;
    scene.assets = scene.assets || {}; scene.assets[rasterId] = prepared.raster; scene.assets[glyphId] = prepared.glyphAtlas;
    entity.rasterAssetId = rasterId; entity.glyphAssetId = glyphId; entity.textLayout = prepared.layout;
    entity.w = prepared.layout.width; entity.h = prepared.layout.height;
    entity.textCompletion = Math.max(0, Math.min(100, finite(entity.textCompletion,100)));
    return entity;
  }
  function ensure(scene, id, root) {
    const entity = (scene.entities || []).find(item => item.id === id);
    if (entity && entity.type === 'text' && (!entity.textLayout || !entity.glyphAssetId)) {
      const w = entity.w, h = entity.h; update(scene,id,{},root); entity.w = w; entity.h = h;
    }
  }
  global.EditorVNextTextState = Object.freeze({settings,measure,rasterize,prepare,update,ensure});
})(typeof window !== 'undefined' ? window : globalThis);
