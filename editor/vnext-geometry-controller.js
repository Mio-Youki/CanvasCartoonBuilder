/* v4 canvas selection geometry. Gesture state is transient; only one Mutation entry is committed on release. */
(function (global) {
  'use strict';
  const api = global.ToSampoolVNextEditor, $ = id => document.getElementById(id);
  if (!api) return;
  const wrap = $('stage-wrap'), canvas = $('vnext-stage'); let gesture = null;
  const overlay = document.createElement('div'), box = document.createElement('div'), rotate = document.createElement('button');
  overlay.className = 'v4-geometry-overlay'; box.className = 'v4-geometry-box'; rotate.type = 'button'; rotate.className = 'v4-geometry-rotate'; rotate.title = '拖拽旋转'; rotate.textContent = '↻'; box.append(rotate);
  for (const corner of ['nw','ne','se','sw']) { const handle = document.createElement('button'); handle.type = 'button'; handle.className = `v4-geometry-handle ${corner}`; handle.dataset.corner = corner; handle.title = '拖拽缩放'; box.append(handle); }
  overlay.append(box); wrap.append(overlay);
  const selected = () => api.selected();
  function point(event) { const rect = canvas.getBoundingClientRect(), scene = api.scene(); return { x:(event.clientX - rect.left) / Math.max(1, rect.width) * scene.width, y:(event.clientY - rect.top) / Math.max(1, rect.height) * scene.height }; }
  function baseOf(entity) { return { x:+entity.x || 0, y:+entity.y || 0, w:Math.max(1, +entity.w || 1), h:Math.max(1, +entity.h || 1), scaleX:Math.max(.01, +entity.scaleX || 1), scaleY:Math.max(.01, +entity.scaleY || 1), rot:+entity.rot || 0 }; }
  function refresh() {
    const entity = selected(); if (!entity || entity.type === 'group' || (api.ui.selectedIds || []).length > 1) { overlay.hidden = true; return; }
    const rect = canvas.getBoundingClientRect(), host = wrap.getBoundingClientRect(), scene = api.scene(), base = baseOf(entity), sx = rect.width / scene.width, sy = rect.height / scene.height;
    overlay.hidden = false; overlay.style.left = `${rect.left - host.left}px`; overlay.style.top = `${rect.top - host.top}px`; overlay.style.width = `${rect.width}px`; overlay.style.height = `${rect.height}px`;
    const width = base.w * base.scaleX * sx, height = base.h * base.scaleY * sy;
    box.style.left = `${base.x * sx}px`; box.style.top = `${base.y * sy}px`; box.style.width = `${Math.max(3, width)}px`; box.style.height = `${Math.max(3, height)}px`; box.style.transform = base.rot ? `rotate(${base.rot}deg)` : '';
  }
  function start(kind, event, corner) {
    const entity = selected(); if (!entity) return; event.preventDefault(); event.stopPropagation();
    gesture = { kind, corner, id:entity.id, base:baseOf(entity), start:point(event), token:api.beginGesture(kind === 'move' ? '移动对象' : kind === 'rotate' ? '旋转对象' : '缩放对象'), pointer:event.pointerId };
    if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
  }
  function update(event) {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const current = point(event), dx = current.x - gesture.start.x, dy = current.y - gesture.start.y, base = gesture.base;
    api.preview(document => {
      const entity = document.entities.find(item => item.id === gesture.id); if (!entity) return;
      if (gesture.kind === 'move') { entity.x = Math.round(base.x + dx); entity.y = Math.round(base.y + dy); }
      else if (gesture.kind === 'rotate') { const cx = base.x + base.w / 2, cy = base.y + base.h / 2, from = Math.atan2(gesture.start.y - cy, gesture.start.x - cx), to = Math.atan2(current.y - cy, current.x - cx); let value = base.rot + (to - from) * 180 / Math.PI; if (event.shiftKey) value = Math.round(value / 15) * 15; entity.rot = Math.round(value * 10) / 10; }
      else { const corner = gesture.corner || 'se', signX = corner.includes('e') ? 1 : -1, signY = corner.includes('s') ? 1 : -1; entity.scaleX = Math.max(.02, Math.round((base.scaleX + signX * dx / base.w) * 1000) / 1000); entity.scaleY = Math.max(.02, Math.round((base.scaleY + signY * dy / base.h) * 1000) / 1000); }
    }); refresh();
  }
  function finish(event, cancelled) {
    if (!gesture || event && event.pointerId !== gesture.pointer) return;
    const current = gesture; gesture = null; if (cancelled) api.cancelGesture(current.token); else api.commitGesture(current.token); refresh();
  }
  box.addEventListener('pointerdown', event => { if (event.target === rotate) return start('rotate', event); const corner = event.target.dataset && event.target.dataset.corner; start(corner ? 'scale' : 'move', event, corner); });
  canvas.addEventListener('pointerdown', event => { if (event.defaultPrevented || event.button !== 0) return; requestAnimationFrame(() => { if (!gesture && selected()) start('move', event); }); });
  window.addEventListener('pointermove', update); window.addEventListener('pointerup', event => finish(event, false)); window.addEventListener('keydown', event => { if (event.key === 'Escape' && gesture) { event.preventDefault(); finish(null, true); } });
  global.EditorVNextGeometry = Object.freeze({ refresh, cancel:() => finish(null, true) }); refresh();
})(typeof window !== 'undefined' ? window : globalThis);
