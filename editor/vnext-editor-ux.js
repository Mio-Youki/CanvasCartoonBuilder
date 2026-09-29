/* v4-only interaction polish inherited from the mature layout, without legacy state. */
(function (global) {
  'use strict';
  const api = global.ToSampoolVNextEditor, $ = id => document.getElementById(id);
  if (!api) return;
  const canvas = $('vnext-stage'), wrap = $('stage-wrap'), assetRoot = $('lib');
  const view = { zoom:1, x:0, y:0 }; let decorating = false, pan = null, tool = 'select', draw = null;
  const unique = (scene, base) => { let id = base, n = 2; const used = new Set(scene.entities.map(item => item.id)); while (used.has(id)) id = `${base}-${n++}`; return id; };

  function applyView() {
    const scene = api.scene(), fit = Math.min((wrap.clientWidth || 320) / scene.width, (wrap.clientHeight || 260) / scene.height, 1) * view.zoom;
    if (canvas.width !== scene.width) canvas.width = scene.width;
    if (canvas.height !== scene.height) canvas.height = scene.height;
    canvas.style.width = `${Math.max(1, Math.round(scene.width * fit))}px`; canvas.style.height = `${Math.max(1, Math.round(scene.height * fit))}px`;
    canvas.style.left = `${Math.round(((wrap.clientWidth || scene.width) - scene.width * fit) / 2 + view.x)}px`; canvas.style.top = `${Math.round(((wrap.clientHeight || scene.height) - scene.height * fit) / 2 + view.y)}px`;
    $('stage-zoom-value').textContent = `${Math.round(fit * 100)}%`;
  }
  function decorateAssets() {
    if (decorating) return; decorating = true;
    try {
      const scene = api.scene(), assets = Object.entries(scene.assets || {}); assetRoot.innerHTML = '';
      if (!assets.length) { assetRoot.innerHTML = '<div class="asset-empty">尚无素材<br>点击右上 <b>+</b> 导入图片。</div>'; return; }
      for (const [id, asset] of assets) {
        const card = document.createElement('div'); card.className = 'lib-item'; card.draggable = true; card.dataset.assetId = id;
        const preview = document.createElement('div'); preview.className = 'prev';
        const previewLocator = asset.frames && asset.frames[0] && asset.frames[0].locator || asset.locator;
        if (String(previewLocator || '').startsWith('data:image/')) { const image = document.createElement('img'); image.src = previewLocator; image.alt = id; preview.append(image); } else preview.textContent = '▧';
        const name = document.createElement('div'); name.className = 'nm'; name.textContent = `${id}${asset.frames && asset.frames.length > 1 ? ` · ${asset.frames.length}帧` : ''}`;
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'asset-card-action delete'; remove.textContent = '×'; remove.title = '删除素材';
        remove.onclick = event => {
          event.stopPropagation(); const current = api.scene(), referenced = current.entities.some(item => item.assetId === id);
          if (referenced) { $('m-import').textContent = '该素材仍被场景对象引用，不能删除。'; return; }
          api.mutate(`删除素材 ${id}`, document => { delete document.assets[id]; }); setTimeout(decorateAssets, 0);
        };
        const add = document.createElement('button'); add.type = 'button'; add.className = 'asset-card-action add'; add.textContent = '→'; add.title = '添加到画布中央';
        add.onclick = event => { event.stopPropagation(); const rect = canvas.getBoundingClientRect(); placeAsset(id, rect.left + rect.width / 2, rect.top + rect.height / 2); };
        card.append(preview, remove, add, name); card.addEventListener('dragstart', event => event.dataTransfer.setData('application/x-tosampool-asset', id)); assetRoot.append(card);
      }
    } finally { decorating = false; }
  }
  function placeAsset(assetId, clientX, clientY) {
    const scene = api.scene(), asset = scene.assets[assetId]; if (!asset) return;
    const rect = canvas.getBoundingClientRect(), x = (clientX - rect.left) / Math.max(1, rect.width) * scene.width, y = (clientY - rect.top) / Math.max(1, rect.height) * scene.height, w = Math.max(1, +asset.width || 64), h = Math.max(1, +asset.height || 64);
    api.mutate(`放置素材 ${assetId}`, document => { const id = unique(document, `image-${assetId}`); document.entities.push({ id, type:'image', assetId, x:Math.round(x - w / 2), y:Math.round(y - h / 2), w, h, scaleX:1, scaleY:1, alpha:1, effects:{ pipeline:['mask','decorate','sample'], mask:null, decorate:{}, sample:{} } }); api.ui.selected = id; api.ui.page = 'compose'; });
  }
  function scenePoint(event) { const rect = canvas.getBoundingClientRect(), scene = api.scene(); return { x:(event.clientX - rect.left) / Math.max(1, rect.width) * scene.width, y:(event.clientY - rect.top) / Math.max(1, rect.height) * scene.height }; }
  function addShape(type, start, end) {
    const x = Math.round(Math.min(start.x, end.x)), y = Math.round(Math.min(start.y, end.y)), w = Math.max(1, Math.round(Math.abs(end.x - start.x))), h = Math.max(1, Math.round(Math.abs(end.y - start.y)));
    const scene = api.scene(), id = unique(scene, type), entity = { id, type, x, y, w, h, scaleX:1, scaleY:1, rot:0, alpha:1, fill:'#ffffff', stroke:'#000000', strokeWidth:type === 'line' ? 1 : 0, effects:{ pipeline:['mask','decorate','sample'], mask:null, decorate:{}, sample:{} } };
    if (type === 'poly') entity.points = [[.5,0],[1,1],[0,1]];
    api.mutate(`绘制 ${type}`, document => { document.entities.push(entity); api.ui.selected = id; api.ui.page = 'compose'; });
  }
  function addText(event) {
    const point = scenePoint(event), scene = api.scene(), id = unique(scene, 'text');
    api.mutate('添加文字', document => { document.entities.push({ id, type:'text', x:Math.round(point.x), y:Math.round(point.y), w:96, h:24, scaleX:1, scaleY:1, rot:0, alpha:1, fill:'#ffffff', text:'Text', fontSize:16, fontFamily:'sans-serif', effects:{ pipeline:['mask','decorate','sample'], mask:null, decorate:{}, sample:{} } }); api.ui.selected = id; api.ui.page = 'compose'; });
  }
  function recipeInput(label, type, value, change) {
    const field = document.createElement('label'); field.className = 'v4-field'; field.append(document.createTextNode(label)); const input = document.createElement(type === 'select' ? 'select' : 'input');
    if (type !== 'select') { input.type = type; input.value = value; } input.oninput = change; input.onchange = change; field.append(input); return { field, input };
  }
  async function importWithRecipe() {
    const files = await global.EditorHost.pickAssets({ accept:'image/*', multiple:true }); if (!files || !files.length) return;
    const decoded = await Promise.all(files.map(async file => ({ file, dataUrl:await global.EditorHost.readDataUrl(file) }))); for (const item of decoded) item.image = await global.EditorVNextAssetLoader.imageFromDataUrl(item.dataUrl);
    const file = decoded[0].file, image = decoded[0].image, multi = decoded.length > 1;
    const state = { width:image.naturalWidth || image.width, height:image.naturalHeight || image.height, pixelDiv:1, palette:'none', quant:0, bgTolerance:0 };
    const mask = document.createElement('div'); mask.className = 'wizard-mask'; const panel = document.createElement('section'); panel.className = 'wizard';
    const title = document.createElement('h2'); title.textContent = `预处理 · ${file.name || '图片'}${multi ? ` · ${decoded.length} 帧` : ''}`; const hint = document.createElement('p'); hint.className = 'meta'; hint.textContent = multi ? '这些图片将作为有序循环帧保存；配方对每一帧一致重算。' : '原始素材与配方会一起保存；之后重新打开仍可重算。';
    const preview = document.createElement('div'); preview.className = 'preview'; const grid = document.createElement('div'); grid.className = 'v4-grid'; const controls = {};
    let previewIndex = 0, previewTimer = null;
    const refresh = () => { const recipe = global.EditorVNextAssetRecipe.normalize(state), output = global.EditorVNextAssetRecipe.apply(decoded[previewIndex].image, recipe); preview.replaceChildren(output); };
    for (const [key,label,min,max,step] of [['width','宽',1,8192,1],['height','高',1,8192,1],['pixelDiv','采样格',1,256,1],['quant','均匀量化',0,256,1],['bgTolerance','去背景容差',0,255,1]]) {
      const row = recipeInput(label, 'number', state[key], () => { state[key] = Math.max(min, Math.min(max, +controls[key].value || min)); refresh(); }); row.input.min = min; row.input.max = max; row.input.step = step; controls[key] = row.input; grid.append(row.field);
    }
    const palette = recipeInput('色板', 'select', '', () => { state.palette = controls.palette.value; refresh(); }); for (const value of ['none','pico8','nes','gb','vga']) { const option = document.createElement('option'); option.value = value; option.textContent = value === 'none' ? '不转换' : value.toUpperCase(); palette.input.append(option); } controls.palette = palette.input; grid.append(palette.field);
    if (multi) { const fps = recipeInput('帧率', 'number', 8, () => {}); fps.input.min = .1; fps.input.max = 60; fps.input.step = .1; controls.fps = fps.input; grid.append(fps.field); }
    const intent = recipeInput('导入为', 'select', '', () => {}); for (const [value,label] of [['object','画布对象'],['background','图片背景'],['new-background','由图片建立场景']]) { const option = document.createElement('option'); option.value = value; option.textContent = label; intent.input.append(option); } controls.intent = intent.input; grid.append(intent.field);
    const layout = recipeInput('背景布局', 'select', '', () => {}); for (const [value,label] of [['none','保持原状'],['stretch','拉伸图片'],['tile','重复纹理']]) { const option = document.createElement('option'); option.value = value; option.textContent = label; layout.input.append(option); } controls.layout = layout.input; grid.append(layout.field);
    const actions = document.createElement('div'); actions.className = 'props-actions'; const cancel = document.createElement('button'); cancel.textContent = '取消'; const accept = document.createElement('button'); accept.className = 'primary'; accept.textContent = '处理并入库';
    cancel.onclick = () => { if (previewTimer) clearInterval(previewTimer); mask.remove(); }; accept.onclick = () => {
      const recipe = global.EditorVNextAssetRecipe.normalize(state), frames = decoded.map(item => ({ locator:item.file._patchariumLocator || item.dataUrl, mime:item.file.type })), options = { name:file.name, locator:frames[0].locator, frames:multi ? frames : undefined, mime:file.type, width:recipe.width || image.naturalWidth || image.width, height:recipe.height || image.naturalHeight || image.height, recipe, fps:multi ? Math.max(.1, +controls.fps.value || 8) : undefined, frameLoop:true, layout:controls.layout.value, createScene:controls.intent.value === 'new-background' };
      const result = api.mutate(`导入并处理图片 ${file.name || '素材'}`, document => controls.intent.value === 'object' ? global.EditorVNextAssetState.addImage(document, options) : global.EditorVNextAssetState.addBackground(document, options));
      if (result && result.entityId) { api.ui.selected = result.entityId; api.ui.page = 'compose'; api.render(); } else if (result) { api.ui.selected = null; api.ui.page = 'compose'; api.render(); }
      if (previewTimer) clearInterval(previewTimer); mask.remove(); setTimeout(() => { decorateAssets(); applyView(); }, 0);
    };
    actions.append(cancel, accept); panel.append(title, hint, preview, grid, actions); mask.append(panel); document.body.append(mask); refresh(); if (multi) previewTimer = setInterval(() => { previewIndex = (previewIndex + 1) % decoded.length; refresh(); }, 125);
  }

  assetRoot.addEventListener('dragover', event => event.preventDefault()); wrap.addEventListener('dragover', event => event.preventDefault()); wrap.addEventListener('drop', event => { const id = event.dataTransfer.getData('application/x-tosampool-asset'); if (!id) return; event.preventDefault(); placeAsset(id, event.clientX, event.clientY); });
  wrap.addEventListener('wheel', event => { if (!event.altKey) return; event.preventDefault(); view.zoom = Math.max(.25, Math.min(8, view.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12))); applyView(); }, { passive:false });
  wrap.addEventListener('pointerdown', event => { if (event.button !== 1 && !event.shiftKey) return; pan = { x:event.clientX, y:event.clientY, ox:view.x, oy:view.y, pointer:event.pointerId }; wrap.setPointerCapture(event.pointerId); event.preventDefault(); event.stopImmediatePropagation(); }, true);
  wrap.addEventListener('pointermove', event => { if (!pan || event.pointerId !== pan.pointer) return; view.x = pan.ox + event.clientX - pan.x; view.y = pan.oy + event.clientY - pan.y; applyView(); });
  wrap.addEventListener('pointerup', event => { if (!pan || event.pointerId !== pan.pointer) return; if (wrap.hasPointerCapture(event.pointerId)) wrap.releasePointerCapture(event.pointerId); pan = null; });
  $('btn-reset-zoom').onclick = () => { view.zoom = 1; view.x = 0; view.y = 0; applyView(); };
  document.querySelectorAll('.toolbar-tool').forEach(button => button.onclick = () => { tool = button.dataset.toolbarMode; document.querySelectorAll('.toolbar-tool').forEach(item => item.classList.toggle('active', item === button)); $('toolbar-text').classList.remove('active'); $('m-stage').textContent = tool === 'select' ? '选择：点击对象；Shift + 拖拽平移舞台；Alt + 滚轮缩放。' : `绘制${button.title}：在舞台拖拽建立对象。`; });
  $('toolbar-text').onclick = () => { tool = 'text'; document.querySelectorAll('.toolbar-tool').forEach(item => item.classList.remove('active')); $('toolbar-text').classList.add('active'); $('m-stage').textContent = '文字：点击舞台放置可编辑文字。'; };
  canvas.addEventListener('pointerdown', event => { if (tool === 'select') return; event.preventDefault(); event.stopImmediatePropagation(); if (tool === 'text') { addText(event); return; } const start = scenePoint(event); draw = { start, pointer:event.pointerId }; canvas.setPointerCapture(event.pointerId); }, true);
  canvas.addEventListener('pointerup', event => { if (!draw || event.pointerId !== draw.pointer) return; const active = draw; draw = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); addShape(tool, active.start, scenePoint(event)); }, true);
  const splitter = $('asset-splitter'), tree = $('structure-tree'); let split = null; splitter.addEventListener('pointerdown', event => { split = { y:event.clientY, h:tree.clientHeight, pointer:event.pointerId }; splitter.setPointerCapture(event.pointerId); event.preventDefault(); }); splitter.addEventListener('pointermove', event => { if (!split || event.pointerId !== split.pointer) return; tree.style.setProperty('--structure-tree-h', `${Math.max(96, Math.min(520, split.h + event.clientY - split.y))}px`); }); splitter.addEventListener('pointerup', () => { split = null; });
  for (const id of ['btn-import','toolbar-image']) { const button = $(id); if (button) button.onclick = () => importWithRecipe().catch(error => { $('m-import').textContent = `⚠ ${error.message}`; }); }
  global.EditorVNextAssetUX = Object.freeze({ render:decorateAssets });
  global.EditorVNextViewport = Object.freeze({ fit:applyView, reset:() => { view.zoom = 1; view.x = 0; view.y = 0; applyView(); } });
  decorateAssets(); applyView(); window.addEventListener('resize', applyView);
})(typeof window !== 'undefined' ? window : globalThis);
