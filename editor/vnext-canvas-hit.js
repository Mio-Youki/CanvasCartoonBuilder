/* v4 Canvas hit testing mirrors the Runtime world matrix, not the tree's local boxes. */
(function (global) {
  'use strict';
  const runtime = global.ToSampoolRuntimeVNext;
  function invert(matrix) {
    const [a,b,c,d,e,f] = matrix, det = a * d - b * c;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-8) return null;
    return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
  }
  function apply(matrix, x, y) { return { x:matrix[0] * x + matrix[2] * y + matrix[4], y:matrix[1] * x + matrix[3] * y + matrix[5] }; }
  function polygonContains(points, x, y) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) || 1e-8) + a[0]) inside = !inside;
    }
    return inside;
  }
  function distanceToSegment(point, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, size = dx * dx + dy * dy;
    const t = size ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / size)) : 0;
    return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
  }
  function contains(entity, values, x, y) {
    const inverse = invert(values.worldMatrix); if (!inverse) return false;
    const point = apply(inverse, x, y), w = Math.max(1, +values.w || 1), h = Math.max(1, +values.h || 1);
    if (entity.type === 'ellipse') { const nx = (point.x - w / 2) / (w / 2), ny = (point.y - h / 2) / (h / 2); return nx * nx + ny * ny <= 1; }
    if (entity.type === 'poly' && Array.isArray(values.points) && values.points.length >= 3) return polygonContains(values.points.map(p => [(+p[0] || 0) * w, (+p[1] || 0) * h]), point.x, point.y);
    if (entity.type === 'line') return distanceToSegment(point, { x:0, y:0 }, { x:w, y:h }) <= Math.max(4, +values.strokeWidth || 1);
    return point.x >= 0 && point.y >= 0 && point.x <= w && point.y <= h;
  }
  function partBox(part) { if(part.type==='line'){const x=Math.min(+part.x||0,+part.x2||0),y=Math.min(+part.y||0,+part.y2||0);return{x,y,w:Math.max(1,Math.abs((+part.x2||0)-(+part.x||0))),h:Math.max(1,Math.abs((+part.y2||0)-(+part.y||0)))};}return{x:+part.x||0,y:+part.y||0,w:Math.max(1,+part.w||1),h:Math.max(1,+part.h||1)}; }
  function containsPart(part, x, y) {
    const box=partBox(part),cx=box.x+box.w/2,cy=box.y+box.h/2,sx=Number.isFinite(+part.scaleX)?+part.scaleX:1,sy=Number.isFinite(+part.scaleY)?+part.scaleY:1,a=(+part.rot||0)*Math.PI/180,cos=Math.cos(-a),sin=Math.sin(-a),dx=x-cx,dy=y-cy,point={x:cx+(cos*dx-sin*dy)/(Math.abs(sx)<1e-8?1:sx),y:cy+(sin*dx+cos*dy)/(Math.abs(sy)<1e-8?1:sy)};
    if(part.type==='ellipse'){const nx=(point.x-cx)/(box.w/2),ny=(point.y-cy)/(box.h/2);return nx*nx+ny*ny<=1;}
    if(part.type==='poly'&&Array.isArray(part.points)&&part.points.length>=3)return polygonContains(part.points.map(value=>[box.x+(+value[0]||0)*box.w,box.y+(+value[1]||0)*box.h]),point.x,point.y);
    if(part.type==='line')return distanceToSegment(point,{x:+part.x||0,y:+part.y||0},{x:+part.x2||0,y:+part.y2||0})<=Math.max(4,+part.strokeWidth||1);
    return point.x>=box.x&&point.y>=box.y&&point.x<=box.x+box.w&&point.y<=box.y+box.h;
  }
  function pickPart(scene, entity, x, y, time) {
    if(!scene||!entity||!Array.isArray(entity.parts)||!entity.parts.length||!runtime||!runtime.modules||!runtime.modules.frame)return null;
    const values=runtime.modules.frame.create(scene,time||0).valuesFor(entity),matrix=invert(values&&values.worldMatrix);if(!matrix)return null;const point=apply(matrix,x,y);
    for(const part of [...entity.parts].reverse())if(part&&!part.hidden&&!part.locked&&containsPart(part,point.x,point.y))return part;
    return null;
  }
  function pick(scene, x, y, time) {
    if (!scene || !runtime || !runtime.modules || !runtime.modules.frame) return null;
    const frame = runtime.modules.frame.create(scene, time || 0), byId = new Map((scene.entities || []).map(item => [item.id, item]));
    const locked = entity => { let item=entity,guard=0;while(item&&guard++<100){if(item.locked)return true;item=byId.get(item.parentId);}return false; };
    for (const entity of [...(scene.entities || [])].reverse()) {
      if (entity.type === 'group' || entity.type === 'particle-emitter' || entity.particleSourceOnly || entity.hidden || locked(entity)) continue;
      const values = frame.valuesFor(entity);
      if (values.parentHidden || !(+values.alpha > 0) || !(+values.parentAlpha > 0)) continue;
      if (contains(entity, values, x, y)) return entity;
    }
    return null;
  }
  global.EditorVNextCanvasHit = Object.freeze({ invert, apply, contains, containsPart, pickPart, pick });
})(typeof window !== 'undefined' ? window : globalThis);
