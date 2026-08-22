/* Runtime Adapter 的第一位消费者：固定时间帧、PNG 封面和精灵图。
 * 不依赖 DOM 以外的编码库；动图/视频编码器将在此 API 之上按需接入。 */
(function () {
  'use strict';
  function canvasFor(scene, w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w || scene.w || 320); c.height = Math.max(1, h || scene.h || 180); return c;
  }
  async function runtimeFor(scene) {
    if (!window.HomeScene || !HomeScene.createRuntime) throw new Error('当前 Runtime 不支持离线渲染');
    const runtime = HomeScene.createRuntime(scene); await runtime.ready(); return runtime;
  }
  function blob(canvas, type) { return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('浏览器未能编码 ' + type)), type)); }
  function download(data, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // 仅做提示，不决定格式合法性、更不以通用场景 schema 限制导出。
  // Runtime 能绘制的兼容项目脚本、图片背景和已注册 builtin 都可进入离线渲染。
  function diagnose(scene) {
    const notes = [];
    if (!scene || !Number.isFinite(scene.w) || scene.w <= 0 || !Number.isFinite(scene.h) || scene.h <= 0) notes.push('画布尺寸无效，已按默认尺寸尝试渲染');
    (scene && scene.images || []).forEach((img, i) => {
      if (img && typeof img.src === 'string' && !img.src.startsWith('data:')) notes.push('图片素材 ' + (img.id || i + 1) + ' 使用外部链接；链接不可访问时该层会缺失');
    });
    return [...new Set(notes)];
  }
  async function frame(scene, t, opt) {
    opt = opt || {}; const c = canvasFor(scene, opt.width, opt.height), runtime = await runtimeFor(scene);
    try { if (!runtime.render(c, { t: t || 0, width: c.width, height: c.height })) throw new Error('固定时间帧渲染失败'); return c; }
    finally { runtime.dispose(); }
  }
  async function png(scene, t, opt) { return blob(await frame(scene, t, opt), 'image/png'); }
  function frameTimes(scene, opt, limit) {
    opt = opt || {};
    if (Array.isArray(opt.times) && opt.times.length) return opt.times.slice();
    const fps = Math.max(1, Math.round(opt.fps || 12));
    const loop = Math.max(0.001, Number(scene && scene.loop) || 1);
    const ranges = Array.isArray(opt.ranges) && opt.ranges.length ? opt.ranges : [[0, loop]];
    const out = [];
    ranges.forEach(range => {
      const from = Math.max(0, Math.min(loop, Number(range[0]) || 0));
      const to = Math.max(from, Math.min(loop, Number(range[1]) || loop));
      for (let t = from; t < to - 1e-8; t += 1 / fps) out.push(+t.toFixed(8));
    });
    if (!out.length) out.push(0);
    if (limit && out.length > limit) throw new Error('所选时段在当前帧率下共有 ' + out.length + ' 帧，超过上限 ' + limit + '；请降低帧率或缩小时段');
    return out;
  }
  async function spriteSheet(scene, opt) {
    opt = opt || {};
    const times = frameTimes(scene, opt, 240), count = times.length;
    const cols = Math.max(1, Math.round(opt.cols || Math.ceil(Math.sqrt(count))));
    const cellW = Math.max(1, opt.width || scene.w || 320), cellH = Math.max(1, opt.height || scene.h || 180);
    const out = document.createElement('canvas'); out.width = cols * cellW; out.height = Math.ceil(count / cols) * cellH;
    const outCtx = out.getContext('2d'); outCtx.imageSmoothingEnabled = false;
    const runtime = await runtimeFor(scene), cell = canvasFor(scene, cellW, cellH);
    try {
      for (let i = 0; i < count; i++) { runtime.render(cell, { t: times[i], width: cellW, height: cellH }); outCtx.drawImage(cell, (i % cols) * cellW, Math.floor(i / cols) * cellH); }
      return blob(out, 'image/png');
    } finally { runtime.dispose(); }
  }
  async function pngFrames(scene, opt) {
    opt = opt || {};
    const times = frameTimes(scene, opt, 120);
    const width = Math.max(1, opt.width || scene.w || 320), height = Math.max(1, opt.height || scene.h || 180);
    const runtime = await runtimeFor(scene), c = canvasFor(scene, width, height);
    try {
      const frames = [];
      for (const t of times) { runtime.render(c, { t, width, height }); frames.push({ t, blob: await blob(c, 'image/png') }); }
      return frames;
    } finally { runtime.dispose(); }
  }
  // 这是视觉审阅用的时间采样拼图，不是尚未落地的 {t,v} 关键帧轨道。
  async function contactSheet(scene, opt) {
    opt = opt || {};
    const allTimes = frameTimes(scene, opt, 240);
    const max = Math.max(1, Math.min(24, Math.round(opt.maxFrames || 16)));
    const times = allTimes.length <= max ? allTimes : Array.from({ length: max }, (_, i) => allTimes[Math.round(i * (allTimes.length - 1) / Math.max(1, max - 1))]);
    const cellW = Math.max(1, opt.width || scene.w || 320), cellH = Math.max(1, opt.height || scene.h || 180), labelH = 16;
    const cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(times.length))));
    const out = document.createElement('canvas'); out.width = cols * cellW; out.height = Math.ceil(times.length / cols) * (cellH + labelH);
    const g = out.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#0b1026'; g.fillRect(0, 0, out.width, out.height);
    const runtime = await runtimeFor(scene), cell = canvasFor(scene, cellW, cellH);
    try {
      times.forEach((t, i) => {
        const x = (i % cols) * cellW, y = Math.floor(i / cols) * (cellH + labelH);
        runtime.render(cell, { t, width: cellW, height: cellH }); g.drawImage(cell, x, y);
        g.fillStyle = '#101736'; g.fillRect(x, y + cellH, cellW, labelH); g.fillStyle = '#e8ecff'; g.font = '10px monospace'; g.fillText('t=' + t.toFixed(2) + 's', x + 4, y + cellH + 11);
      });
      return blob(out, 'image/png');
    } finally { runtime.dispose(); }
  }
  function le(n) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
  function ascii(s) { return new TextEncoder().encode(s); }
  function gifPalette(colors) {
    const p = new Uint8Array(256 * 3);
    (colors || []).slice(0, 255).forEach((c, i) => { p[i * 3] = c >>> 16; p[i * 3 + 1] = (c >>> 8) & 255; p[i * 3 + 2] = c & 255; });
    return p;
  }
  // GIF LZW：每帧独立词典，避免长循环占用常驻内存。
  function gifLzw(indices) {
    const clear = 256, end = 257, out = [], dict = new Map();
    let next = 258, bits = 9, acc = 0, accBits = 0;
    const emit = code => { acc |= code << accBits; accBits += bits; while (accBits >= 8) { out.push(acc & 255); acc >>>= 8; accBits -= 8; } };
    const reset = () => { dict.clear(); next = 258; bits = 9; };
    emit(clear); reset();
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const value = indices[i], key = prefix + ',' + value, found = dict.get(key);
      if (found != null) { prefix = found; continue; }
      emit(prefix);
      if (next < 4096) {
        dict.set(key, next++);
        // GIF 解码器在读入当前码后才把新词条写入词典；码宽提升必须滞后一位，
        // 否则在 9→10 位边界会提前多读一位，后续像素全部失步为彩色乱码。
        if (next > (1 << bits) && bits < 12) bits++;
      } else { emit(clear); reset(); }
      prefix = value;
    }
    emit(prefix); emit(end); if (accBits) out.push(acc & 255);
    return new Uint8Array(out);
  }
  function gifIndex(rgba, colors) {
    const out = new Uint8Array(rgba.length / 4);
    const exact = new Map(colors.map((c, i) => [c, i])), nearest = new Map();
    const find = c => {
      if (exact.has(c)) return exact.get(c);
      if (nearest.has(c)) return nearest.get(c);
      const r = c >>> 16, g = (c >>> 8) & 255, b = c & 255; let bi = 0, bd = Infinity;
      colors.forEach((q, i) => { const dr = r - (q >>> 16), dg = g - ((q >>> 8) & 255), db = b - (q & 255), d = dr * dr + dg * dg + db * db; if (d < bd) { bd = d; bi = i; } });
      nearest.set(c, bi); return bi;
    };
    for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
      if (rgba[i + 3] < 128) { out[j] = 255; continue; }
      out[j] = find((rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2]);
    }
    return out;
  }
  function gifBlocks(bytes, chunks) {
    for (let at = 0; at < bytes.length; at += 255) {
      const n = Math.min(255, bytes.length - at); chunks.push(new Uint8Array([n]), bytes.slice(at, at + n));
    }
    chunks.push(new Uint8Array([0]));
  }
  async function gif(scene, opt) {
    opt = opt || {};
    const fps = Math.max(1, Math.min(30, Math.round(opt.fps || 12)));
    const times = frameTimes(scene, opt, 600), frames = times.length;
    const width = Math.max(1, opt.width || scene.w || 320), height = Math.max(1, opt.height || scene.h || 180);
    const delay = Math.max(1, Math.round(100 / fps));
    const runtime = await runtimeFor(scene), c = canvasFor(scene, width, height), g = c.getContext('2d');
    try {
      // GIF 只有 256 色。先扫描整个循环，保留出现频率最高的 255 个原始像素色，
      // 而不是套通用 3-3-2 色板；第 256 个索引固定留给二值透明。
      const counts = new Map();
      for (let i = 0; i < frames; i++) {
        runtime.render(c, { t: times[i], width, height }); const d = g.getImageData(0, 0, width, height).data;
        for (let p = 0; p < d.length; p += 4) if (d[p + 3] >= 128) { const k = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2]; counts.set(k, (counts.get(k) || 0) + 1); }
      }
      const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 255).map(x => x[0]);
      if (!colors.length) colors.push(0);
      const chunks = [ascii('GIF89a'), le(width), le(height), new Uint8Array([0xf7, 255, 0]), gifPalette(colors), new Uint8Array([0x21, 0xff, 0x0b]), ascii('NETSCAPE2.0'), new Uint8Array([3, 1, 0, 0, 0])];
      for (let i = 0; i < frames; i++) {
        runtime.render(c, { t: times[i], width, height });
        const idx = gifIndex(g.getImageData(0, 0, width, height).data, colors), data = gifLzw(idx);
        chunks.push(new Uint8Array([0x21, 0xf9, 4, 1]), le(delay), new Uint8Array([255, 0]));
        chunks.push(new Uint8Array([0x2c]), le(0), le(0), le(width), le(height), new Uint8Array([0, 8]));
        gifBlocks(data, chunks);
      }
      chunks.push(new Uint8Array([0x3b]));
      return new Blob(chunks, { type: 'image/gif' });
    } finally { runtime.dispose(); }
  }
  window.SceneExporter = { frame, frameTimes, png, pngFrames, spriteSheet, contactSheet, gif, diagnose, download };
})();
