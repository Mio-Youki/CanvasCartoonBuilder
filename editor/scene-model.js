'use strict';

/* Scene 的无副作用基础规则：可由编辑器、预览与离线导出共同复用。 */
function normPart(p) {
  if (typeof p.fill === 'boolean') {
    if (p.fill) p.fill = p.color || null;
    else { p.stroke = p.color || null; p.fill = null; }
  } else if (!('fill' in p)) p.fill = p.color || null;
  if (!('stroke' in p)) p.stroke = null;
  if (!('strokeWidth' in p)) p.strokeWidth = p.width || 1;
  return p;
}

function partCenter(p) {
  if (p.type === 'rect' || p.type === 'ellipse') return { cx: (p.x || 0) + (p.w || 1) / 2, cy: (p.y || 0) + (p.h || 1) / 2 };
  if (p.type === 'line') return { cx: ((p.x || 0) + (p.x2 || 0)) / 2, cy: ((p.y || 0) + (p.y2 || 0)) / 2 };
  const box = partsLocalBox({ parts: [p] });
  return box ? { cx: box.x + box.w / 2, cy: box.y + box.h / 2 } : { cx: (p.x || 0) + .5, cy: (p.y || 0) + .5 };
}

function partsLocalBox(e) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const ext = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  (e.parts || []).forEach(p => {
    if (p.type === 'rect' || p.type === 'ellipse') { ext(p.x || 0, p.y || 0); ext((p.x || 0) + (p.w || 1), (p.y || 0) + (p.h || 1)); }
    else if (p.type === 'line') { ext(p.x || 0, p.y || 0); ext(p.x2 || 0, p.y2 || 0); }
    else if (p.type === 'poly') (p.points || []).forEach(pt => ext(pt[0], pt[1]));
  });
  return isFinite(minX) ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
}
