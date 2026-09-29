/* v4 scene tree interaction. Keeps hierarchy UI separate from scene storage and rendering. */
(function (global) {
  'use strict';
  const api = global.ToSampoolVNextEditor;
  const state = global.EditorVNextStructureState;
  const $ = id => document.getElementById(id);
  if (!api || !state || !$('structure-tree')) return;

  const ui = api.ui;
  ui.selectedIds = Array.isArray(ui.selectedIds) ? ui.selectedIds : (ui.selected ? [ui.selected] : []);
  ui.expandedGroups = ui.expandedGroups || new Set();
  let applyingTree = false, treeDrag = null, suppressTreeClick = false;

  function entities() { return api.scene().entities || []; }
  function entity(id) { return state.byId(api.scene(), id); }
  function normalizeSelection() {
    const available = new Set(entities().map(item => item.id));
    ui.selectedIds = (ui.selectedIds || []).filter(id => available.has(id));
    // Page-level creation/open flows set the primary selected id before this controller
    // observes their render. Preserve that intent instead of silently clearing it.
    if (ui.selected && available.has(ui.selected) && !ui.selectedIds.includes(ui.selected)) ui.selectedIds.push(ui.selected);
    if (!ui.selectedIds.includes(ui.selected)) ui.selected = ui.selectedIds[ui.selectedIds.length - 1] || null;
    if (ui.selected) expandParents(ui.selected);
  }
  function expandParents(id) {
    let current = entity(id), guard = 0;
    while (current && current.parentId && guard++ < 100) {
      ui.expandedGroups.add(current.parentId);
      current = entity(current.parentId);
    }
  }
  function select(id, additive) {
    normalizeSelection();
    const current = new Set(additive ? ui.selectedIds : []);
    if (id) {
      if (additive && current.has(id)) current.delete(id);
      else current.add(id);
    } else current.clear();
    ui.selectedIds = Array.from(current);
    ui.selected = id && current.has(id) ? id : ui.selectedIds[ui.selectedIds.length - 1] || null;
    ui.effectId = null;
    ui.page = ui.selected ? 'compose' : 'compose';
    if (ui.selected) expandParents(ui.selected);
  }
  function icon(item) {
    if (item.type === 'group') return ui.expandedGroups.has(item.id) ? '▾' : '▸';
    if (item.type === 'image') return '▧';
    if (item.type === 'text') return 'T';
    return '◇';
  }
  function itemName(item) { return item.name || item.id; }
  function rowFor(item, depth) {
    const row = document.createElement('button');
    row.type = 'button'; row.dataset.entityId = item.id;
    row.className = 'v4-tree-row' + (ui.selectedIds.includes(item.id) ? ' active' : '');
    row.style.paddingLeft = `${6 + depth * 16}px`;
    const glyph = document.createElement('span'); glyph.className = 'v4-tree-glyph'; glyph.textContent = icon(item);
    const label = document.createElement('b'); label.textContent = itemName(item);
    const note = document.createElement('small'); note.textContent = item.type === 'group' ? '组' : item.type || '对象';
    row.append(glyph, label, note);
    glyph.addEventListener('click', event => {
      if (item.type !== 'group') return;
      event.preventDefault(); event.stopPropagation();
      if (ui.expandedGroups.has(item.id)) ui.expandedGroups.delete(item.id); else ui.expandedGroups.add(item.id);
      renderTree();
    });
    label.title = '双击重命名';
    label.addEventListener('dblclick', event => {
      event.preventDefault(); event.stopPropagation();
      const name = global.prompt('对象名称', itemName(item));
      if (!name || !name.trim() || name.trim() === itemName(item)) return;
      api.mutate('重命名对象', document => { const target = state.byId(document, item.id); if (target) target.name = name.trim(); });
    });
    row.addEventListener('click', event => {
      if (suppressTreeClick) { suppressTreeClick = false; return; }
      select(item.id, event.ctrlKey || event.metaKey);
      api.render();
    });
    row.addEventListener('dblclick', event => {
      if (item.type !== 'group') return;
      event.preventDefault();
      if (ui.expandedGroups.has(item.id)) ui.expandedGroups.delete(item.id); else ui.expandedGroups.add(item.id);
      renderTree();
    });
    bindPointerDrag(row, item);
    return row;
  }
  function clearDropMarks() {
    for (const node of document.querySelectorAll('.v4-tree-row.drop-before,.v4-tree-row.drop-after,.v4-tree-row.drop-inside,.v4-tree-row.dragging')) node.classList.remove('drop-before', 'drop-after', 'drop-inside', 'dragging');
  }
  function dropTargetAt(clientX, clientY) {
    const row = document.elementFromPoint(clientX, clientY) && document.elementFromPoint(clientX, clientY).closest('.v4-tree-row[data-entity-id]');
    if (!row || !treeDrag || row.dataset.entityId === treeDrag.id) return null;
    const target = entity(row.dataset.entityId); if (!target) return null;
    const bounds = row.getBoundingClientRect(), ratio = (clientY - bounds.top) / Math.max(1, bounds.height);
    return { row, target, mode:ratio > .28 && ratio < .72 ? 'inside' : ratio < .5 ? 'before' : 'after' };
  }
  function showDropTarget(target) {
    clearDropMarks();
    if (treeDrag) treeDrag.row.classList.add('dragging');
    if (!target) return;
    target.row.classList.add(target.mode === 'inside' ? 'drop-inside' : target.mode === 'before' ? 'drop-before' : 'drop-after');
  }
  function finishPointerDrag(event, cancelled) {
    if (!treeDrag || event && event.pointerId !== treeDrag.pointer) return;
    const drag = treeDrag; treeDrag = null;
    if (drag.row.hasPointerCapture && drag.row.hasPointerCapture(drag.pointer)) drag.row.releasePointerCapture(drag.pointer);
    const target = drag.target; clearDropMarks();
    if (!drag.moved || cancelled || !target) return;
    suppressTreeClick = true;
    const result = api.mutate('调整图层顺序', document => state.reorder(document, drag.id, target.target.id, target.mode));
    if (result && result.id) { ui.selected = result.id; ui.selectedIds = [result.id]; ui.expandedGroups.add(result.id); }
    else if (result) select(drag.id, false);
    api.render();
  }
  function bindPointerDrag(row, item) {
    row.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest && event.target.closest('input,select')) return;
      treeDrag = { id:item.id, row, pointer:event.pointerId, x:event.clientX, y:event.clientY, moved:false, target:null };
      row.setPointerCapture && row.setPointerCapture(event.pointerId);
    });
    row.addEventListener('pointermove', event => {
      if (!treeDrag || treeDrag.row !== row || event.pointerId !== treeDrag.pointer) return;
      if (!treeDrag.moved && Math.hypot(event.clientX - treeDrag.x, event.clientY - treeDrag.y) < 5) return;
      treeDrag.moved = true; treeDrag.target = dropTargetAt(event.clientX, event.clientY); showDropTarget(treeDrag.target);
      event.preventDefault();
    });
    row.addEventListener('pointerup', event => finishPointerDrag(event, false));
    row.addEventListener('pointercancel', event => finishPointerDrag(event, true));
  }
  function renderTree() {
    const root = $('structure-tree');
    if (!root || !api.workspace.hasDocument) return;
    normalizeSelection();
    applyingTree = true;
    root.innerHTML = '';
    const sceneRow = document.createElement('button');
    sceneRow.type = 'button'; sceneRow.className = 'v4-tree-row' + (!ui.selected ? ' active' : '');
    sceneRow.innerHTML = '<span class="v4-tree-glyph">▦</span><b>场景</b><small>v4</small>';
    sceneRow.onclick = () => { select(null, false); api.render(); };
    root.append(sceneRow);
    const children = parentId => entities().filter(item => (item.parentId || null) === parentId);
    const addBranch = (parentId, depth) => {
      for (const item of children(parentId)) {
        root.append(rowFor(item, depth));
        if (item.type === 'group' && ui.expandedGroups.has(item.id)) addBranch(item.id, depth + 1);
      }
    };
    addBranch(null, 0);
    const chosen = ui.selectedIds.map(entity).filter(Boolean);
    $('btn-group').disabled = chosen.length < 2 || new Set(chosen.map(item => item.parentId || null)).size !== 1;
    $('btn-ungroup').disabled = chosen.length !== 1 || chosen[0].type !== 'group';
    $('btn-delete-selection').disabled = chosen.length === 0;
    // MutationObserver sees the DOM replacement asynchronously. Keep the guard through
    // that observer turn, otherwise rebuilding our own tree would recurse forever.
    setTimeout(() => { applyingTree = false; }, 0);
  }
  function groupSelected() {
    const result = api.mutate('编组对象', document => state.createGroup(document, ui.selectedIds));
    if (result) { ui.selected = result.id; ui.selectedIds = [result.id]; ui.expandedGroups.add(result.id); api.render(); }
  }
  function ungroupSelected() {
    const current = api.selected();
    if (!current || current.type !== 'group') return;
    const result = api.mutate('解组对象', document => state.dissolveGroup(document, current.id));
    if (result) { ui.selected = null; ui.selectedIds = []; api.render(); }
  }
  function deleteSelected() {
    const ids = ui.selectedIds.slice();
    if (!ids.length) return;
    const result = api.mutate('删除所选对象', document => state.remove(document, ids));
    if (result) { ui.selected = null; ui.selectedIds = []; api.render(); }
  }
  $('btn-group').onclick = groupSelected;
  $('btn-ungroup').onclick = ungroupSelected;
  $('btn-delete-selection').onclick = deleteSelected;

  window.addEventListener('keydown', event => {
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target && event.target.isContentEditable) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      ui.selectedIds = entities().filter(item => item.type !== 'group').map(item => item.id);
      ui.selected = ui.selectedIds[ui.selectedIds.length - 1] || null;
      if (ui.selected) expandParents(ui.selected);
      api.render();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      if (event.shiftKey) ungroupSelected(); else groupSelected();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelected(); return; }
    if (event.key === 'Escape') { select(null, false); api.render(); }
  });

  // Canvas is kept single-select for direct transforms; Ctrl/Cmd augments the current tree selection.
  $('vnext-stage').addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    if (!event.ctrlKey && !event.metaKey) {
      const rect = event.currentTarget.getBoundingClientRect(), value = api.scene();
      const x = (event.clientX - rect.left) / Math.max(1, rect.width) * value.width;
      const y = (event.clientY - rect.top) / Math.max(1, rect.height) * value.height;
      const precise = global.EditorVNextCanvasHit && global.EditorVNextCanvasHit.pick(value, x, y, ui.time);
      requestAnimationFrame(() => {
        // The page's legacy-shaped fallback listener runs between this capture phase
        // and this frame. Replace its axis-aligned result with the Runtime-equivalent hit.
        if (document.querySelector('.toolbar-tool.active')?.dataset.toolbarMode !== 'select') return;
        ui.selected = precise ? precise.id : null;
        ui.effectId = null; ui.page = ui.selected ? 'compose' : 'compose';
        ui.selectedIds = ui.selected ? [ui.selected] : [];
        if (ui.selected) expandParents(ui.selected);
        api.render();
      });
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect(), value = api.scene();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width) * value.width;
    const y = (event.clientY - rect.top) / Math.max(1, rect.height) * value.height;
    const hit = global.EditorVNextCanvasHit ? global.EditorVNextCanvasHit.pick(value, x, y, ui.time) : [...entities()].reverse().find(item => item.type !== 'group' && x >= (+item.x || 0) && y >= (+item.y || 0) && x <= (+item.x || 0) + (+item.w || 0) * (+item.scaleX || 1) && y <= (+item.y || 0) + (+item.h || 0) * (+item.scaleY || 1));
    event.preventDefault(); event.stopImmediatePropagation();
    select(hit && hit.id, true); api.render();
  }, true);

  const observer = new MutationObserver(() => {
    if (applyingTree || !api.workspace.hasDocument) return;
    queueMicrotask(renderTree);
  });
  observer.observe($('structure-tree'), { childList:true });
  global.EditorVNextStructureController = Object.freeze({ renderTree, select, clearDropMarks });
  renderTree();
})(typeof window !== 'undefined' ? window : globalThis);
