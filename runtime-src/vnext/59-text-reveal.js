/* Portable text reveal: percentage is continuous; visible graphemes are discrete. */
(function (global) {
  'use strict';
  const api = global.ToSampoolRuntimeVNext;
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity:'grapheme' }) : null;
  const finite = (value, fallback) => Number.isFinite(+value) ? +value : fallback;
  function graphemes(text) {
    const value = String(text || '').replace(/\r\n?/g, '\n');
    return segmenter ? Array.from(segmenter.segment(value), item => item.segment) : Array.from(value);
  }
  function completion(values) { return Math.max(0, Math.min(100, finite(values.textCompletion, 100))); }
  function count(values) {
    return values.textLayout && Array.isArray(values.textLayout.glyphs)
      ? values.textLayout.glyphs.length : graphemes(values.text).filter(char => char !== '\n').length;
  }
  function visibleCount(values) { return Math.floor(count(values) * completion(values) / 100 + 1e-9); }
  function cursorVisible(values, time) {
    const cursor = values.textCursor || {}, period = Math.max(0, finite(cursor.period, 1));
    return !!cursor.enabled && completion(values) < 100 &&
      (!period || (((finite(time, 0) % period) + period) % period) < period / 2);
  }
  function drawCursor(ctx, values, position, bounds, time, layout) {
    if (!cursorVisible(values, time)) return;
    const cursor = values.textCursor || {}, sx = bounds.w / Math.max(1, layout.width),
      sy = bounds.h / Math.max(1, layout.height), size = Math.max(1, layout.fontSize),
      thickness = Math.max(1, Math.round(size * .08)), width = Math.max(thickness, size * .6);
    ctx.save();
    ctx.translate(bounds.x + position.x * sx, bounds.y + position.y * sy);
    ctx.scale(sx, sy);
    ctx.globalAlpha *= Math.max(0, Math.min(1, finite(values.fillAlpha, 1)));
    ctx.fillStyle = cursor.color || values.fill || '#ffffff';
    if (cursor.style === 'underline') ctx.fillRect(0, size - thickness, width, thickness);
    else if (cursor.style === 'block') ctx.fillRect(0, 0, width, size);
    else ctx.fillRect(0, 0, thickness, size);
    ctx.restore();
  }
  function draw(ctx, scene, values, frame, bounds, asset) {
    const progress = completion(values), layout = values.textLayout,
      raster = values.rasterAssetId && asset(scene, values.rasterAssetId),
      atlas = values.glyphAssetId && asset(scene, values.glyphAssetId), time = frame && frame.time || 0;
    if (progress === 100 && raster) {
      ctx.drawImage(raster, bounds.x, bounds.y, bounds.w, bounds.h);
      return;
    }
    const limit = visibleCount(values);
    if (layout && atlas && Array.isArray(layout.glyphs)) {
      const sx = bounds.w / Math.max(1, layout.width), sy = bounds.h / Math.max(1, layout.height);
      for (let index = 0; index < limit; index++) {
        const glyph = layout.glyphs[index];
        if (glyph.sw > 0 && glyph.sh > 0) ctx.drawImage(atlas, glyph.sx, glyph.sy, glyph.sw, glyph.sh,
          bounds.x + glyph.x * sx, bounds.y + glyph.y * sy, glyph.w * sx, glyph.h * sy);
      }
      drawCursor(ctx, values, layout.positions[Math.min(limit, layout.positions.length - 1)] || {x:0,y:0}, bounds, time, layout);
      return;
    }
    // Agent-authored native text can use the same semantics without an atlas.
    const size = Math.max(1, finite(values.fontSize, 16)), tracking = finite(values.letterSpacing, 0),
      lineHeight = Math.max(.5, finite(values.lineHeight, 1.25));
    ctx.save();
    ctx.font = `${size}px ${values.fontFamily || 'sans-serif'}`; ctx.textBaseline = 'top';
    ctx.globalAlpha *= Math.max(0, Math.min(1, finite(values.fillAlpha, 1)));
    ctx.fillStyle = api.modules.paint.style(ctx, values.fillPaint, bounds, values.fill);
    let x = 0, y = 0, index = 0;
    for (const char of graphemes(values.text)) {
      if (char === '\n') { x = 0; y += size * lineHeight; continue; }
      if (index >= limit) break;
      ctx.fillText(char, bounds.x + x, bounds.y + y);
      x += (ctx.measureText ? ctx.measureText(char).width : size * .6) + tracking; index++;
    }
    ctx.restore();
    drawCursor(ctx, values, {x,y}, bounds, time, {width:bounds.w,height:bounds.h,fontSize:size});
  }
  function cursorBounds(values) {
    if (!values.textCursor || !values.textCursor.enabled) return null;
    const layout = values.textLayout, size = Math.max(1, finite(values.fontSize, 16)),
      positions = layout && layout.positions || [{x:Math.max(1, +values.w || 1), y:Math.max(0, (+values.h || 1) - size)}],
      sx = (+values.w || 1) / Math.max(1, layout && layout.width || +values.w || 1),
      sy = (+values.h || 1) / Math.max(1, layout && layout.height || +values.h || 1);
    return {x:0,y:0,w:Math.max(...positions.map(point => (point.x + size * .6) * sx)),
      h:Math.max(...positions.map(point => (point.y + size) * sy))};
  }
  api.modules.textReveal = Object.freeze({graphemes,completion,count,visibleCount,cursorVisible,cursorBounds,draw});
})(typeof window !== 'undefined' ? window : globalThis);
