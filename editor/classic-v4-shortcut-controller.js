/* V4 keyboard contract: unified document history and internal scene clipboard. */
(function (global) {
  'use strict';

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const editableTarget = target => {
    const tag = target && target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!(target && target.isContentEditable);
  };
  function create(options) {
    options = options || {};
    const workspace = options.workspace, view = options.view, changes = options.changes;
    const active = options.active || (() => true), togglePlay = options.togglePlay || (() => {}), root = options.root || document;
    const structure = global.EditorVNextStructureState, parts = global.EditorVNextPartsState;
    if (!workspace || !view || !changes || !structure || !parts) throw new Error('Classic v4 Shortcut Controller requires Workspace, View, SceneMutation and structure state');
    let clipboard = null;
    const scene = () => workspace.requireDocument();
    const entities = value => value.entities || [];
    const byId = (value, id) => entities(value).find(item => item && item.id === id) || null;
    const partHost = item => !!item && ['vector','image','text','builtin'].includes(item.type);
    const unique = (used, base) => { let id = String(base || 'copy'), index = 2; while (used.has(id)) id = `${base || 'copy'}-${index++}`; used.add(id); return id; };
    const roots = (value, ids) => {
      const chosen = new Set(ids || []);
      return entities(value).filter(item => chosen.has(item.id) && !function hasChosenParent(entry) {
        let parent = entry.parentId && byId(value, entry.parentId), guard = 0;
        while (parent && guard++ < 100) { if (chosen.has(parent.id)) return true; parent = parent.parentId && byId(value, parent.parentId); }
        return false;
      }(item));
    };
    const family = (value, rootIds) => {
      const ids = new Set(rootIds || []), queue = [...ids];
      while (queue.length) {
        const parentId = queue.shift();
        for (const item of entities(value)) if (item.parentId === parentId && !ids.has(item.id)) { ids.add(item.id); queue.push(item.id); }
      }
      return entities(value).filter(item => ids.has(item.id));
    };
    const move = (item, dx, dy) => {
      item.x = (+item.x || 0) + dx; item.y = (+item.y || 0) + dy;
      if (item.type === 'line') { item.x2 = (+item.x2 || 0) + dx; item.y2 = (+item.y2 || 0) + dy; }
    };
    function timingKeyForCopy(key, map) {
      if (map.has(key)) return map.get(key);
      const scoped = /^(effect|controller):object:([^:]+):(.*)$/.exec(String(key || ''));
      return scoped && map.has(scoped[2]) ? `${scoped[1]}:object:${map.get(scoped[2])}:${scoped[3]}` : null;
    }
    function timingOwner(key) { const scoped=/^(?:effect|controller):object:([^:]+):/.exec(String(key||'')); return scoped&&scoped[1]||null; }
    function timingSnapshot(value, ids) {
      const chosen = new Set(ids || []), timeline = value.timeline || {}, tracks = {}, visibility = {};
      for (const [key, input] of Object.entries(timeline.tracks || {})) if(chosen.has(key)||chosen.has(timingOwner(key)))tracks[key]=clone(input);
      for (const [key, input] of Object.entries(timeline.visibility || {})) if (chosen.has(key)) visibility[key] = clone(input);
      return { tracks, visibility };
    }
    function restoreTiming(value, snapshot, map) {
      if (!snapshot) return;
      value.timeline = Object.assign({ tracks:{} }, value.timeline || {});
      value.timeline.tracks = Object.assign({}, value.timeline.tracks || {});
      for (const [key, input] of Object.entries(snapshot.tracks || {})) { const next = timingKeyForCopy(key, map); if (next) value.timeline.tracks[next] = clone(input); }
      if (Object.keys(snapshot.visibility || {}).length) {
        value.timeline.visibility = Object.assign({}, value.timeline.visibility || {});
        for (const [key, input] of Object.entries(snapshot.visibility)) if (map.has(key)) value.timeline.visibility[map.get(key)] = clone(input);
      }
    }
    function removeTiming(value, ids) {
      const chosen = new Set(ids || []), timeline = value.timeline;
      if (!timeline) return;
      for (const key of Object.keys(timeline.tracks || {})) if(chosen.has(key)||chosen.has(timingOwner(key)))delete timeline.tracks[key];
      for (const key of Object.keys(timeline.visibility || {})) if (chosen.has(key)) delete timeline.visibility[key];
    }
    function cloneEntities(value, payload, offset) {
      const originals = payload.entities || [], used = new Set(entities(value).map(item => item.id)), map = new Map();
      for (const item of originals) map.set(item.id, unique(used, item.id));
      const copied = originals.map(item => {
        const next = remapReferences(clone(item), map); next.id = map.get(item.id);
        if (Array.isArray(next.parts)) { const partIds = new Set(); next.parts = next.parts.map(part => { const result = clone(part); result.id = unique(partIds, part.id); return result; }); }
        return next;
      });
      const rootSet = new Set(payload.rootIds || []), delta = Object.assign({ x:8, y:8 }, offset || {});
      for (let index = 0; index < originals.length; index++) if (rootSet.has(originals[index].id)) move(copied[index], +delta.x || 0, +delta.y || 0);
      value.entities.push(...copied); restoreTiming(value, payload.timing, map);
      return (payload.rootIds || []).map(id => map.get(id)).filter(Boolean);
    }
    function copySelection() {
      const value = scene(), ownerId = view.selectedId, partIds = view.selectedPartIds || [];
      if (ownerId && partIds.length) {
        const owner = byId(value, ownerId), selected = (owner && owner.parts || []).filter(part => partIds.includes(part.id));
        if (!selected.length) return false;
        clipboard = { kind:'parts', ownerId, owner:clone(owner), parts:clone(selected) };
        return true;
      }
      const selected = roots(value, view.selectedIds || []);
      if (!selected.length) return false;
      const copied=family(value, selected.map(item => item.id));
      clipboard = { kind:'entities', rootIds:selected.map(item => item.id), entities:clone(copied), timing:timingSnapshot(value,copied.map(item=>item.id)) };
      return true;
    }
    function remapReferences(value, map, key) {
      if (!value || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(item => remapReferences(item, map, key));
      for (const [name, current] of Object.entries(value)) {
        if (typeof current === 'string' && /(?:parent|source|target|owner|element|bind).*Id$/i.test(name) && map.has(current)) value[name] = map.get(current);
        else if (current && typeof current === 'object') remapReferences(current, map, name);
      }
      return value;
    }
    function pasteSelection() {
      if (!clipboard) return false;
      let selected = [];
      const result = changes.run('粘贴', value => {
        if (clipboard.kind === 'parts') {
          const selectedOwner=(view.selectedIds||[]).length===1?byId(value,view.selectedId):null,owner=partHost(selectedOwner)?selectedOwner:null;
          if (owner) {
            const added = clipboard.parts.map(raw => { const part=clone(raw); move(part,8,8); return parts.add(value,{ownerId:owner.id,part,normalize:false}); });
            if(owner.type==='vector'&&owner.parts.length)parts.normalizeBounds(value,owner.id);
            selected=added.map(part=>part.id);return{kind:'parts',ownerId:owner.id};
          }
          const source=clipboard.owner||{},used=new Set(entities(value).map(item=>item.id)),holder={id:unique(used,'vector'),name:'矢量',type:'vector',parentId:source.parentId||view.scopeContainerId||null,x:+source.x||0,y:+source.y||0,w:1,h:1,scaleX:+source.scaleX||1,scaleY:+source.scaleY||1,rot:+source.rot||0,alpha:source.alpha==null?1:+source.alpha,parts:[]};
          value.entities.push(holder);
          const added=clipboard.parts.map(raw=>{const part=clone(raw);move(part,8,8);return parts.add(value,{ownerId:holder.id,part,normalize:false});});
          if(holder.parts.length)parts.normalizeBounds(value,holder.id);
          selected=added.map(part=>part.id);return{kind:'parts',ownerId:holder.id};
        }
        selected=cloneEntities(value,clipboard,{x:8,y:8});
        return { kind:'entities' };
      });
      if (!result) return false;
      if (clipboard.kind === 'parts') view.selectPart(result.ownerId, selected[selected.length - 1], false, { keepDrill:true });
      else view.selectMany(selected);
      return true;
    }
    function duplicateSelection(options) {
      options=options||{};
      if(!copySelection()||!clipboard||clipboard.kind!=='entities')return false;
      let selected=[];
      const operation=value=>{selected=cloneEntities(value,clipboard,options.offset||{x:0,y:0});};
      if(options.history===false)workspace.mutate(operation);else changes.run(options.label||'复制对象',operation);
      if(selected.length)view.selectMany(selected);
      return selected;
    }
    function cutSelection() {
      if (!copySelection()) return false;
      const ownerId = view.selectedId, partIds = (view.selectedPartIds || []).slice();
      if (ownerId && partIds.length) {
        changes.run('剪切图元', value => {
          for (const partId of partIds) parts.remove(value, { ownerId, partId, normalize:false });
          const owner = byId(value, ownerId); if (owner && owner.type === 'vector' && owner.parts.length) parts.normalizeBounds(value, ownerId);
        });
        view.select(ownerId, false, { keepDrill:true });
        return true;
      }
      const ids = (view.selectedIds || []).slice();
      if (!ids.length) return false;
      // Delete keeps the established “remove group = ungroup” behavior.  Cut is
      // different: its clipboard contains the complete group tree, so the source
      // tree must leave the document as a whole and be restorable by one undo.
      changes.run('剪切对象', value => {const removed=family(value,roots(value,ids).map(item=>item.id)).map(item=>item.id);structure.remove(value,removed);removeTiming(value,removed);}); view.select(null); return true;
    }
    function nudge(dx, dy) {
      const value = scene(), ownerId = view.selectedId, partIds = view.selectedPartIds || [];
      if (ownerId && partIds.length) {
        changes.run('微移图元', document => { const owner = byId(document, ownerId); for (const id of partIds) { const part = owner && (owner.parts || []).find(item => item.id === id); if (part) move(part, dx, dy); } if (owner && owner.type === 'vector') parts.normalizeBounds(document, ownerId); });
        return true;
      }
      const selected = roots(value, view.selectedIds || []);
      if (!selected.length) return false;
      changes.run('微移对象', document => { for (const source of selected) { const target = byId(document, source.id); if (target) move(target, dx, dy); } });
      return true;
    }
    function applyHistory(redo) {
      const label = redo ? changes.redo() : changes.undo();
      if (!label) return false;
      view.renderTree(); view.scheduleRender(redo ? 'redo' : 'undo');
      return true;
    }
    function keydown(event) {
      if (!active() || editableTarget(event.target)) return;
      const command = event.ctrlKey || event.metaKey, key = String(event.key || '').toLowerCase();
      if (command && key === 'z') { event.preventDefault(); event.stopImmediatePropagation(); applyHistory(event.shiftKey); return; }
      if (command && key === 'y') { event.preventDefault(); event.stopImmediatePropagation(); applyHistory(true); return; }
      if (command && key === 'c') { event.preventDefault(); event.stopImmediatePropagation(); copySelection(); return; }
      if (command && key === 'x') { event.preventDefault(); event.stopImmediatePropagation(); cutSelection(); return; }
      if (command && key === 'v') { event.preventDefault(); event.stopImmediatePropagation(); pasteSelection(); return; }
      const arrows = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }, arrow = arrows[event.key];
      if (arrow) { if (nudge(arrow[0] * (event.shiftKey ? 10 : 1), arrow[1] * (event.shiftKey ? 10 : 1))) { event.preventDefault(); event.stopImmediatePropagation(); } return; }
      if (event.code === 'Space') { event.preventDefault(); event.stopImmediatePropagation(); togglePlay(); }
    }
    global.addEventListener('keydown', keydown, true);
    return Object.freeze({ copy:copySelection, cut:cutSelection, paste:pasteSelection, duplicate:duplicateSelection, undo:() => applyHistory(false), redo:() => applyHistory(true), get hasClipboard(){return !!clipboard;}, stop(){global.removeEventListener('keydown', keydown, true);} });
  }
  global.EditorClassicV4ShortcutController = Object.freeze({ version:1, create });
})(typeof window !== 'undefined' ? window : globalThis);
