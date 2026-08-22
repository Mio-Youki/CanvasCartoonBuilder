'use strict';

/* 纯几何：不读 DOM、不修改编辑器状态。页面控制器与后续导出器共享。 */
function scalePartAround(p, ax, ay, rw, rh) {
  const q = Object.assign({}, p);
  const tr = (x, y) => [ax + (x - ax) * rw, ay + (y - ay) * rh];
  if (q.type === 'rect' || q.type === 'ellipse') {
    const [x1, y1] = tr(q.x || 0, q.y || 0);
    const [x2, y2] = tr((q.x || 0) + (q.w || 1), (q.y || 0) + (q.h || 1));
    q.x = Math.round(Math.min(x1, x2)); q.y = Math.round(Math.min(y1, y2));
    q.w = Math.max(1, Math.round(Math.abs(x2 - x1))); q.h = Math.max(1, Math.round(Math.abs(y2 - y1)));
  } else if (q.type === 'line') {
    const [x1, y1] = tr(q.x || 0, q.y || 0);
    const [x2, y2] = tr(q.x2 || 0, q.y2 || 0);
    q.x = Math.round(x1); q.y = Math.round(y1); q.x2 = Math.round(x2); q.y2 = Math.round(y2);
  } else if (q.type === 'poly') {
    q.points = (q.points || []).map(pt => [Math.round(tr(pt[0], pt[1])[0]), Math.round(tr(pt[0], pt[1])[1])]);
  }
  return q;
}

function scalePartsWithParent(parts, oldBox, newBox, corner) {
  const ax = (corner === 'bl' || corner === 'tl') ? oldBox.x + oldBox.w : oldBox.x;
  const ay = (corner === 'tr' || corner === 'tl') ? oldBox.y + oldBox.h : oldBox.y;
  const rw = newBox.w / oldBox.w, rh = newBox.h / oldBox.h;
  return (parts || []).map(p => {
    const q = scalePartAround(p, ax - oldBox.x, ay - oldBox.y, rw, rh);
    const dx = oldBox.x - newBox.x, dy = oldBox.y - newBox.y;
    if (q.type === 'rect' || q.type === 'ellipse') { q.x += dx; q.y += dy; }
    else if (q.type === 'line') { q.x += dx; q.y += dy; q.x2 += dx; q.y2 += dy; }
    else if (q.type === 'poly') q.points = (q.points || []).map(pt => [pt[0] + dx, pt[1] + dy]);
    return q;
  });
}

function cornerResize(box, corner, dx, dy) {
  let nx = box.x, ny = box.y, nw = box.w, nh = box.h;
  if (corner === 'br') { nw = box.w + dx; nh = box.h + dy; }
  else if (corner === 'bl') { nw = box.w - dx; nx = box.x + dx; nh = box.h + dy; }
  else if (corner === 'tr') { nw = box.w + dx; nh = box.h - dy; ny = box.y + dy; }
  else if (corner === 'tl') { nw = box.w - dx; nx = box.x + dx; nh = box.h - dy; ny = box.y + dy; }
  return { nx, ny, nw: Math.max(4, nw), nh: Math.max(4, nh) };
}
