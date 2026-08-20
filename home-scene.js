/* ============================================================
 * 首页氛围场景：原创低分辨率像素夜行列车
 * 列车固定在右侧；近/远景滚动制造行驶感。
 * 48 秒循环：夜原 → 雾幕 → 山口信号 → 月下桥面。
 *
 * 元素参数化：所有元素参数集中在 DEFAULT_HOME_SCENE；
 * 运行时优先读 window.HOME_SCENE（工具「像素风小动画装配器」可
 * 打开本文件 → 结构化调整参数 → 实时预览 → 保存写回）。
 * 动态效果（列车轻震/车窗闪烁/车头光束/星星闪烁/场景切换暗场）保留为代码叠加。
 * ============================================================ */
'use strict';

const DEFAULT_HOME_SCENE = {
  "w": 320,
  "h": 118,
  "loop": 48,
  "bg": [
    "#09132c",
    "#071126",
    "#0b1531",
    "#050b1d"
  ],
  "stars": {
    "z": 1,
    "color": ["#7597c9", "#7597c9", "#7597c9", "#bcd8ff"],
    "points": [
      [
        23,
        13
      ],
      [
        43,
        27
      ],
      [
        66,
        10
      ],
      [
        101,
        19
      ],
      [
        128,
        7
      ],
      [
        154,
        28
      ],
      [
        191,
        11
      ],
      [
        217,
        23
      ],
      [
        249,
        9
      ],
      [
        289,
        18
      ],
      [
        307,
        33
      ]
    ]
  },
  "moon": {
    "z": 2,
    "color": "#d5d8bb",
    "dark": "#9ba69d",
    "x": [253, 253, 253, 68],
    "y": [17, 17, 23, 17],
    "show": [[[0, 1]], null, [[0, 1]], [[0, 1]]],
    "parts": [
      { "type": "rect", "x": -7, "y": -7, "w": 15, "h": 15, "color": "#d5d8bb", "fill": true },
      { "type": "rect", "x": -9, "y": -4, "w": 19, "h": 9, "color": "#d5d8bb", "fill": true },
      { "type": "rect", "x": -4, "y": -9, "w": 9, "h": 19, "color": "#d5d8bb", "fill": true },
      { "type": "rect", "x": 4, "y": -3, "w": 4, "h": 4, "color": "#9ba69d", "fill": true },
      { "type": "rect", "x": -5, "y": 4, "w": 3, "h": 3, "color": "#9ba69d", "fill": true }
    ]
  },
  "clouds": {
    "z": 3,
    "speed": [-5, -13, -5, -5],
    "span": 92,
    "y": 29,
    "yOff": 7,
    "color": ["#182b4c", "#33445c", "#182b4c", "#182b4c"]
  },
  "mountains": {
    "z": 4,
    "speed": [-4, -4, -16, -4],
    "span": 170,
    "y": 79,
    "peak": [39, 39, 26, 39],
    "color": ["#162b45", "#162b45", "#162b45", "#142848"],
    "fill2": ["#233a57", "#233a57", "#30496a", "#233a57"]
  },
  "farForest": {
    "z": 5,
    "speed": -11,
    "span": 33,
    "color": ["#12333b", "#12333b", "#12333b", "#102c3a"],
    "trunk": "#0c2631",
    "leaf": "#17454a"
  },
  "poles": {
    "z": 6,
    "speed": -26,
    "span": 74,
    "body": "#18253b",
    "arm": "#263657",
    "lamp": "#ffd66c",
    "top": "#2f4f75"
  },
  "rail": {
    "z": 7,
    "speed": -52,
    "span": 18,
    "c1": "#34445c",
    "c2": "#1a2637",
    "tie": "#4a3740"
  },
  "train": {
    "z": 8,
    "x": 211,
    "y": 75,
    "body": "#12283b",
    "cab": "#17334a",
    "car": "#183148",
    "base": "#08131f",
    "wheel": "#050b12",
    "window": "#a5d8ff",
    "lampLit": "#ffd46b",
    "lampDim": "#45516a",
    "beam": ["rgba(255,222,125,.14)", "rgba(255,222,125,.24)", "rgba(255,222,125,.14)", "rgba(255,222,125,.14)"],
    "beamLen": [40, 62, 40, 40],
    "head": "#fff1a7",
    "tail": "#c14d57",
    "anim": "bob",
    "beamOrigin": { "x": 9, "y": 9 },
    "beamSpread": { "top": 5, "bottom": 21 },
    "parts": [
      { "type": "rect", "x": 0, "y": 0, "w": 110, "h": 24, "fill": "#12283b" },
      { "type": "rect", "x": 8, "y": -6, "w": 38, "h": 30, "fill": "#17334a" },
      { "type": "rect", "x": 50, "y": -2, "w": 69, "h": 26, "fill": "#183148" },
      { "type": "rect", "x": 5, "y": 22, "w": 116, "h": 4, "fill": "#08131f" },
      { "type": "rect", "x": 4, "y": 26, "w": 11, "h": 4, "fill": "#050b12" },
      { "type": "rect", "x": 72, "y": 26, "w": 12, "h": 4, "fill": "#050b12" },
      { "type": "rect", "x": 111, "y": 26, "w": 10, "h": 4, "fill": "#050b12" },
      { "type": "rect", "x": 9, "y": 2, "w": 22, "h": 13, "fill": "#091923" },
      { "type": "rect", "x": 12, "y": 5, "w": 4, "h": 4, "fill": "#a5d8ff" },
      { "type": "rect", "x": 7, "y": 9, "w": 4, "h": 4, "fill": "#fff1a7" },
      { "type": "rect", "x": 0, "y": 16, "w": 3, "h": 4, "fill": "#c14d57" },
      { "type": "rect", "x": 38, "y": 5, "w": 7, "h": 7, "fill": "#45516a" },
      { "type": "rect", "x": 51, "y": 5, "w": 7, "h": 7, "fill": "#45516a" },
      { "type": "rect", "x": 64, "y": 5, "w": 7, "h": 7, "fill": "#45516a" },
      { "type": "rect", "x": 77, "y": 5, "w": 7, "h": 7, "fill": "#45516a" },
      { "type": "rect", "x": 90, "y": 5, "w": 7, "h": 7, "fill": "#45516a" },
      { "type": "rect", "x": 103, "y": 5, "w": 7, "h": 7, "fill": "#45516a" },
      { "type": "rect", "x": 38, "y": 5, "w": 7, "h": 7, "fill": "#ffd46b", "anim": { "blink": { "period": 2333, "duty": 6 / 7, "phase": 1 / 7, "on": 1, "off": 0 } } },
      { "type": "rect", "x": 51, "y": 5, "w": 7, "h": 7, "fill": "#ffd46b", "anim": { "blink": { "period": 2333, "duty": 6 / 7, "phase": 1 / 7, "on": 1, "off": 0 } } },
      { "type": "rect", "x": 64, "y": 5, "w": 7, "h": 7, "fill": "#ffd46b", "anim": { "blink": { "period": 2333, "duty": 6 / 7, "phase": 1 / 7, "on": 1, "off": 0 } } },
      { "type": "rect", "x": 77, "y": 5, "w": 7, "h": 7, "fill": "#ffd46b", "anim": { "blink": { "period": 2333, "duty": 6 / 7, "phase": 1 / 7, "on": 1, "off": 0 } } },
      { "type": "rect", "x": 90, "y": 5, "w": 7, "h": 7, "fill": "#ffd46b", "anim": { "blink": { "period": 2333, "duty": 6 / 7, "phase": 1 / 7, "on": 1, "off": 0 } } },
      { "type": "rect", "x": 103, "y": 5, "w": 7, "h": 7, "fill": "#ffd46b", "anim": { "blink": { "period": 2333, "duty": 6 / 7, "phase": 1 / 7, "on": 1, "off": 0 } } }
    ]
  },
  "foreground": {
    "z": 9,
    "speed": -43,
    "span": 48,
    "color": ["#0c2627", "#0c2627", "#0c2627", "#081724"],
    "g1": "#12372f",
    "g2": "#154532",
    "g3": "#1d5a3c"
  },
  "fog": {
    "z": 10,
    "speed": -29,
    "span": 70,
    "a1": "rgba(111,139,154,.25)",
    "a2": "rgba(132,157,168,.23)",
    "a3": "rgba(142,168,176,.18)"
  },
  "signal": {
    "z": 10,
    "x": 161,
    "y": 54,
    "body": "#182537",
    "arm": "#21324c",
    "green": "#7dff5f",
    "red": "#ff4d5e",
    "parts": [
      { "type": "rect", "x": 0, "y": 0, "w": 3, "h": 48, "fill": "#182537" },
      { "type": "rect", "x": -6, "y": 2, "w": 15, "h": 8, "fill": "#21324c" },
      { "type": "rect", "x": -3, "y": 4, "w": 4, "h": 4, "fill": "#7dff5f", "anim": { "blink": { "period": 4000, "duty": 3 / 4, "phase": 1 / 4, "on": 1, "off": 0 } } },
      { "type": "rect", "x": -3, "y": 4, "w": 4, "h": 4, "fill": "#ff4d5e", "anim": { "blink": { "period": 4000, "duty": 1 / 4, "phase": 0, "on": 1, "off": 0 } } }
    ]
  },
  "bridge": {
    "z": 10,
    "speed": -38,
    "span": 26,
    "c1": "#486074",
    "c2": "#33495b"
  },
  "scenes": ["夜原", "雾", "山口", "桥"],
  "images": []
};

// 运行时配置：优先外部注入（工具可改 window.HOME_SCENE 实时生效），否则用默认。
// 注意：必须是可变的 let + 每帧同步（draw 开头 syncCfg），否则工具"打开 js → 调参"不会生效。
let CFG = (typeof window !== 'undefined' && window.HOME_SCENE) || DEFAULT_HOME_SCENE;
function syncCfg() {
  if (typeof window !== 'undefined' && window.HOME_SCENE) CFG = window.HOME_SCENE;
}

const HomeScene = (() => {
  let W = CFG.w, H = CFG.h, LOOP = CFG.loop;
  let canvas, ctx, raf = 0, last = 0, elapsed = 0, running = false;
  let reduceMotion = false;
  let inited = false;

  function init() {
    if (inited) return; // 幂等：工具兜底副本可能二次加载/手动再 init
    inited = true;
    canvas = document.getElementById('home-scene');
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    resize();
    reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    draw(0);
    document.addEventListener('visibilitychange', sync);
    if (!reduceMotion) start();
  }

  // 尺寸跟随配置（工具改全局高宽/打开不同尺寸场景时调用）：画布后备存储 = CFG.w × CFG.h，
  // 与工具 stage 画布同尺寸对齐，避免裁剪/黑边。先 syncCfg：重导入时 CFG 可能仍是旧对象。
  function resize() {
    syncCfg();
    W = CFG.w || 320;
    H = CFG.h || 118;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    if (ctx) { ctx.imageSmoothingEnabled = false; draw(elapsed); }
  }

  function sync() {
    if (document.hidden || reduceMotion) stop();
    else start();
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // 12fps 阶梯动画，保持像素游戏的节奏并控制首页功耗。
  function tick(now) {
    if (!running) return;
    if (now - last >= 82) {
      elapsed += Math.min(.18, (now - last) / 1000);
      last = now;
      draw(elapsed);
    }
    raf = requestAnimationFrame(tick);
  }

  function rect(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function wrap(x, span) { return ((x % span) + span) % span; }
  // 场景判定：优先 sceneBorders（工具可拖边界），否则按 scenes 数等分（兜底 4 段）
  function LOOPv() { return CFG.loop || LOOP; }
  function scene(t) {
    const lt = ((t % LOOPv()) + LOOPv()) % LOOPv();
    const b = CFG.sceneBorders && CFG.sceneBorders.length ? CFG.sceneBorders : null;
    const n = (CFG.scenes && CFG.scenes.length) || 4;
    if (b) { for (let i = 0; i < b.length; i++) if (lt < b[i]) return i; return b.length; }
    return Math.floor(lt / (LOOPv() / n));
  }
  // 参数统一取值：常量 number/string → 自身；按场景数组 [v0,v1,..] → 按场景取（长度不足取末位）；
  // {t:[..],v:[..]} 关键帧形态预留（PLAN P1 插值）。
  function valAt(e, k, part) {
    if (!e) return undefined;
    const v = e[k];
    if (v == null) return v;
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object' && v[0] !== null && 't' in v[0] && 'v' in v[0]) return v;
      return v[Math.min(part, v.length - 1)];
    }
    return v;
  }
  function val(e, k, t) { return valAt(e, k, scene(t)); }

  function draw(t) {
    syncCfg(); // 每帧同步外部注入的配置（工具实时调参生效的关键）
    const local = t % LOOPv();
    const part = scene(t);
    rect(0, 0, W, H, Array.isArray(CFG.bg) ? CFG.bg[Math.min(part, CFG.bg.length - 1)] : CFG.bg);
    // 图层按 z 排序渲染（z 越大越靠上；素材 images 默认 99）
    // 工具图层栏可删除程序元素（cfg 键缺失则跳过）、隐藏元素（hidden 为真则不绘制）；
    // 所有元素统一尊重 elShown；有 parts：partsMode==='overlay' 时原绘制+图元叠加，否则图元替代
    const elDraw = (el, fn, tt, pp) => {
      if (!el.parts || !el.parts.length) { fn(tt, pp); return; }
      if (el.partsMode === 'overlay') { fn(tt, pp); drawParts(el, tt); }
      else drawParts(el, tt);
    };
    const layers = [
      CFG.stars && { z: CFG.stars.z || 1, hidden: CFG.stars.hidden, fn: () => { if (elShown(CFG.stars, t)) elDraw(CFG.stars, stars, t, part); } },
      CFG.moon && { z: CFG.moon.z || 2, hidden: CFG.moon.hidden, fn: () => { if (elShown(CFG.moon, t)) elDraw(CFG.moon, moon, t, part); } },
      CFG.clouds && { z: CFG.clouds.z || 3, hidden: CFG.clouds.hidden, fn: () => { if (elShown(CFG.clouds, t)) elDraw(CFG.clouds, clouds, t, part); } },
      CFG.mountains && { z: CFG.mountains.z || 4, hidden: CFG.mountains.hidden, fn: () => { if (elShown(CFG.mountains, t)) elDraw(CFG.mountains, mountains, t, part); } },
      CFG.farForest && { z: CFG.farForest.z || 5, hidden: CFG.farForest.hidden, fn: () => { if (elShown(CFG.farForest, t)) elDraw(CFG.farForest, farForest, t, part); } },
      CFG.poles && { z: CFG.poles.z || 6, hidden: CFG.poles.hidden, fn: () => { if (elShown(CFG.poles, t)) elDraw(CFG.poles, poles, t, part); } },
      CFG.rail && { z: CFG.rail.z || 7, hidden: CFG.rail.hidden, fn: () => { if (elShown(CFG.rail, t)) elDraw(CFG.rail, rail, t, part); } },
      CFG.train && { z: CFG.train.z || 8, hidden: CFG.train.hidden, fn: () => { if (elShown(CFG.train, t)) { if (CFG.train.parts && CFG.train.parts.length && CFG.train.partsMode !== 'overlay') { drawParts(CFG.train, t); drawBeam(CFG.train, t); } else train(t, part); } } },
      CFG.foreground && { z: CFG.foreground.z || 9, hidden: CFG.foreground.hidden, fn: () => { if (elShown(CFG.foreground, t)) elDraw(CFG.foreground, foreground, t, part); } },
      CFG.fog && { z: CFG.fog.z || 10, hidden: CFG.fog.hidden, fn: () => { if (elShown(CFG.fog, t)) elDraw(CFG.fog, fogBank, t, part); } },
      CFG.signal && { z: CFG.signal.z || 10, hidden: CFG.signal.hidden, fn: () => { if (elShown(CFG.signal, t)) { if (CFG.signal.parts && CFG.signal.parts.length && CFG.signal.partsMode !== 'overlay') { drawParts(CFG.signal, t); } else signal(t, part); } } },
      CFG.bridge && { z: CFG.bridge.z || 10, hidden: CFG.bridge.hidden, fn: () => { if (elShown(CFG.bridge, t)) elDraw(CFG.bridge, bridge, t, part); } },
      ...(CFG.images || []).filter(e => !e.hidden).map(e => ({
        z: e.z != null ? e.z : 99,
        fn: () => { drawOneImage(e, t); if (e.parts && e.parts.length && elShown(e, t)) drawParts(e, t); }, // 图片 + 图元叠加
      })),
    ].filter(Boolean).filter(l => !l.hidden);
    layers.sort((a, b) => a.z - b.z).forEach(l => l.fn());
    // 极短的场景交接：暗场闪切而非平滑淡入，符合像素风。
    const n = (CFG.scenes && CFG.scenes.length) || 4;
    const edge = local % (LOOPv() / n);
    if (edge < .25) rect(0, 0, W, H, 'rgba(3,6,15,' + (1 - edge / .25) + ')');
  }

  function stars(t, part) {
    const c = val(CFG.stars, 'color', t);
    const pts = CFG.stars.points;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if ((i + Math.floor(t * 2)) % 5 !== 0) rect(x, y, i % 3 ? 1 : 2, 1, c);
    }
  }

  function moon(part) {
    // 场景显隐由配置 show 控制（原硬编码「雾幕阶段不画月亮」已参数化到 DEFAULT_HOME_SCENE.moon.show）
    const x = valAt(CFG.moon, 'x', part);
    const y = valAt(CFG.moon, 'y', part);
    rect(x - 7, y - 7, 15, 15, CFG.moon.color);
    rect(x - 9, y - 4, 19, 9, CFG.moon.color);
    rect(x - 4, y - 9, 9, 19, CFG.moon.color);
    rect(x + 4, y - 3, 4, 4, CFG.moon.dark);
    rect(x - 5, y + 4, 3, 3, CFG.moon.dark);
  }

  function clouds(t, part) {
    const sp = val(CFG.clouds, 'speed', t);
    const offset = wrap(t * sp, CFG.clouds.span);
    const col = val(CFG.clouds, 'color', t);
    for (let i = -1; i < 5; i++) {
      const x = i * CFG.clouds.span - offset;
      const y = CFG.clouds.y + (i & 1) * CFG.clouds.yOff;
      rect(x, y, 55, 5, col);
      rect(x + 12, y - 5, 38, 5, col);
      rect(x + 27, y - 9, 19, 4, col);
    }
  }

  function mountains(t, part) {
    const sp = val(CFG.mountains, 'speed', t);
    const ox = wrap(t * sp, CFG.mountains.span);
    const peak = val(CFG.mountains, 'peak', t);
    for (let i = -1; i < 4; i++) {
      const x = i * CFG.mountains.span - ox;
      const y = CFG.mountains.y;
      ctx.fillStyle = val(CFG.mountains, 'color', t);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 78, peak); ctx.lineTo(x + 164, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = val(CFG.mountains, 'fill2', t);
      ctx.beginPath(); ctx.moveTo(x + 78, peak); ctx.lineTo(x + 113, y); ctx.lineTo(x + 89, 62); ctx.closePath(); ctx.fill();
    }
  }

  function farForest(t, part) {
    const offset = wrap(t * CFG.farForest.speed, CFG.farForest.span);
    rect(0, 75, W, 18, val(CFG.farForest, 'color', t));
    for (let i = -1; i < 12; i++) {
      const x = i * CFG.farForest.span - offset;
      rect(x + 13, 66 + (i % 3) * 3, 3, 20, CFG.farForest.trunk);
      ctx.fillStyle = CFG.farForest.leaf;
      ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x + 15, 57 + (i % 4) * 4); ctx.lineTo(x + 30, 80); ctx.closePath(); ctx.fill();
    }
  }

  function poles(t, part) {
    const offset = wrap(t * CFG.poles.speed, CFG.poles.span);
    for (let i = -1; i < 7; i++) {
      const x = i * CFG.poles.span - offset;
      rect(x, 66, 3, 35, CFG.poles.body);
      rect(x - 7, 70, 17, 2, CFG.poles.arm);
      rect(x - 8, 72, 2, 3, CFG.poles.lamp);
      rect(x + 8, 72, 2, 3, CFG.poles.lamp);
      if (part === 2) rect(x - 2, 63, 7, 3, CFG.poles.top);
    }
  }

  function rail(t) {
    const offset = wrap(t * CFG.rail.speed, CFG.rail.span);
    rect(0, 102, W, 3, CFG.rail.c1);
    rect(0, 110, W, 3, CFG.rail.c2);
    for (let x = -18; x < W + 18; x += CFG.rail.span) rect(x - offset, 103, 9, 10, CFG.rail.tie);
  }

  function train(t, part) {
    // 无 parts（旧配置/未编辑）：原全量绘制；有 parts 时 layer 回调走 drawParts + drawBeam
    const T = CFG.train;
    const x = T.x, bob = Math.floor(t * 6) % 2;
    // 列车保持画面右侧；只以一像素轻震传递运行状态（动态保留）。
    rect(x, T.y + bob, 110, 24, T.body);
    rect(x + 8, T.y - 6 + bob, 38, 30, T.cab);
    rect(x + 50, T.y - 2 + bob, 69, 26, T.car);
    rect(x + 5, T.y + 22 + bob, 116, 4, T.base);
    rect(x + 4, T.y + 26 + bob, 11, 4, T.wheel); rect(x + 72, T.y + 26 + bob, 12, 4, T.wheel); rect(x + 111, T.y + 26 + bob, 10, 4, T.wheel);
    rect(x + 9, T.y + 2 + bob, 22, 13, '#091923');
    rect(x + 12, T.y + 5 + bob, 4, 4, T.window);
    const lit = Math.floor(t * 3) % 7 !== 0;
    for (let wx = x + 38; wx < x + 113; wx += 13) rect(wx, T.y + 5 + bob, 7, 7, lit ? T.lampLit : T.lampDim);
    // 车头灯：雾幕阶段加宽，照亮前方而不移动列车（动态保留）。
    const beam = val(T, 'beamLen', t);
    ctx.fillStyle = val(T, 'beam', t);
    ctx.beginPath(); ctx.moveTo(x + 9, T.y + 9 + bob); ctx.lineTo(x - beam, T.y + 21); ctx.lineTo(x - beam, T.y + 5); ctx.closePath(); ctx.fill();
    rect(x + 7, T.y + 9 + bob, 4, 4, T.head);
    rect(x + 0, T.y + 16 + bob, 3, 4, T.tail);
  }
  // 通用光束实体（几何参数化，非动画——光束长度按场景数组，属多关键帧范畴待关键帧系统）：
  // 元素声明 beam（颜色数组）+ beamLen（长度数组）+ beamOrigin/beamSpread（几何，相对元素原点）
  function drawBeam(e, t) {
    if (!e.beam || !e.beamLen) return;
    const x = val(e, 'x', t) || 0, y = val(e, 'y', t) || 0;
    const len = val(e, 'beamLen', t) || 0;
    const o = e.beamOrigin || { x: 9, y: 9 };
    const sp = e.beamSpread || { top: 5, bottom: 21 };
    const ea = applyAnims(animList(e.anim), t, { yOff: 0, scale: 1, alpha: 1 }); // 跟随元素 bob（仅光束起点，与列车原绘制一致）
    ctx.fillStyle = val(e, 'beam', t);
    ctx.beginPath();
    ctx.moveTo(x + o.x, y + o.y + ea.yOff);
    ctx.lineTo(x - len, y + sp.bottom);
    ctx.lineTo(x - len, y + sp.top);
    ctx.closePath(); ctx.fill();
  }

  function foreground(t, part) {
    const offset = wrap(t * CFG.foreground.speed, CFG.foreground.span);
    rect(0, 113, W, 5, val(CFG.foreground, 'color', t));
    for (let i = -1; i < 9; i++) {
      const x = i * CFG.foreground.span - offset;
      rect(x, 108, 28, 4, CFG.foreground.g1);
      rect(x + 6, 104, 15, 6, CFG.foreground.g2);
      rect(x + 13, 99, 4, 8, CFG.foreground.g3);
    }
  }

  function fogBank(t) {
    const offset = wrap(t * CFG.fog.speed, CFG.fog.span);
    for (let i = -1; i < 6; i++) {
      const x = i * CFG.fog.span - offset;
      rect(x, 72, 49, 8, CFG.fog.a1);
      rect(x + 12, 65, 37, 10, CFG.fog.a2);
      rect(x + 28, 59, 18, 8, CFG.fog.a3);
    }
  }

  function signal(t) {
    // 无 parts（旧配置/未编辑）：原全量绘制；有 parts 时 layer 回调走 drawParts（信号灯 = 绿/红两 part 反相 blink）
    const x = CFG.signal.x;
    rect(x, 54, 3, 48, CFG.signal.body); rect(x - 6, 56, 15, 8, CFG.signal.arm);
    const green = Math.floor(t * 2) % 8 > 1;
    rect(x - 3, 58, 4, 4, green ? CFG.signal.green : CFG.signal.red);
  }

  function bridge(t) {
    const offset = wrap(t * CFG.bridge.speed, CFG.bridge.span);
    rect(0, 99, W, 4, CFG.bridge.c1);
    for (let x = -26; x < W + 26; x += CFG.bridge.span) {
      rect(x - offset, 103, 3, 15, CFG.bridge.c2);
      rect(x - offset + 3, 114, 22, 3, CFG.bridge.c2);
    }
  }

  // 素材叠加层：与工具装配器同一渲染语义（滚动平铺 / 闪烁 / 脉动 / 显示时间 / 多帧）
  const imgCache = {};
  // 场景起止秒（按 sceneBorders 或等分）
  function sceneBounds(part) {
    const L = LOOPv();
    const b = CFG.sceneBorders && CFG.sceneBorders.length ? CFG.sceneBorders : null;
    const n = (CFG.scenes && CFG.scenes.length) || 4;
    if (b) return [part === 0 ? 0 : b[part - 1], part === b.length ? L : b[part]];
    return [part * L / n, (part + 1) * L / n];
  }
  // 显示条件控制（程序化元素与素材通用）：
  // 新模型 show = [win0, win1, …]（每场景一段，win=null 隐藏 | [f0,f1] 单窗口 | [[f0,f1],…] 多窗口，
  // f 为场景内 0~1 比例）；legacy：{scenes:[0,2]} 场景段 / [t0,t1] 秒区间 / 无 show=全程。
  function elShown(e, t) {
    if (!e || !e.show) return true;
    if (Array.isArray(e.show) && e.show.length && (e.show[0] === null || Array.isArray(e.show[0]))) {
      const p = scene(t);
      const w = p < e.show.length ? e.show[p] : null;
      if (!w) return false;
      const wins = Array.isArray(w[0]) ? w : [w];
      const [s0, s1] = sceneBounds(p);
      const wt = ((t % LOOPv()) + LOOPv()) % LOOPv();
      const lt = wt - s0;
      const dur = s1 - s0;
      return wins.some(seg => lt >= seg[0] * dur && lt < seg[1] * dur);
    }
    if (e.show && Array.isArray(e.show.scenes)) return e.show.scenes.indexOf(scene(t)) >= 0;
    if (Array.isArray(e.show)) {
      const a = e.show[0] || 0;
      const b = e.show[1] == null ? LOOPv() : e.show[1];
      const lt = t % LOOPv();
      return lt >= a && lt < b;
    }
    return true;
  }
  // 图元归一化（AI 式描边/填充）：legacy {color, fill:bool} → {fill, stroke, strokeWidth}
  // 注意：legacy fill 是布尔（true=用 color 填充 / false=用 color 描边），必须先于 'fill' in p 判断转换
  function normPart(p) {
    if (typeof p.fill === 'boolean') {
      if (p.fill) p.fill = p.color || null;
      else { p.stroke = p.color || null; p.fill = null; }
    } else if (!('fill' in p)) {
      p.fill = p.color || null;
    }
    if (!('stroke' in p)) p.stroke = null;
    if (!('strokeWidth' in p)) p.strokeWidth = p.width || 1;
    return p;
  }
  // 矢量图元集合渲染（parts）：局部坐标，以元素原点 (x,y)+滚动偏移平移；
  // 支持 rect / line / ellipse / poly；描边(色+线宽)/填充(色) 独立；滚动平铺（scroll.speed+span）
  // 图元变换中心：矩形/椭圆 = 中心；线段 = 中点；多边形 = 顶点包围盒中心
  function partCenter(p) {
    if (p.type === 'rect' || p.type === 'ellipse') return { cx: (p.x || 0) + (p.w || 1) / 2, cy: (p.y || 0) + (p.h || 1) / 2 };
    if (p.type === 'line') return { cx: ((p.x || 0) + (p.x2 || 0)) / 2, cy: ((p.y || 0) + (p.y2 || 0)) / 2 };
    if (p.type === 'poly' && (p.points || []).length) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      p.points.forEach(pt => { if (pt[0] < minX) minX = pt[0]; if (pt[1] < minY) minY = pt[1]; if (pt[0] > maxX) maxX = pt[0]; if (pt[1] > maxY) maxY = pt[1]; });
      return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
    }
    return { cx: (p.x || 0) + 0.5, cy: (p.y || 0) + 0.5 };
  }
  // 图元局部包围盒（pixelDiv 离屏重采样用；不含 scroll 偏移）
  function partsLocalBox(e) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const ext = (x, y) => { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; };
    (e.parts || []).forEach(p => {
      if (p.type === 'rect' || p.type === 'ellipse') { ext(p.x || 0, p.y || 0); ext((p.x || 0) + (p.w || 1), (p.y || 0) + (p.h || 1)); }
      else if (p.type === 'line') { ext(p.x || 0, p.y || 0); ext(p.x2 || 0, p.y2 || 0); }
      else if (p.type === 'poly') (p.points || []).forEach(pt => ext(pt[0], pt[1]));
    });
    if (!isFinite(minX)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  // —— 通用动画原语（元素级与 parts 级共用）——
  // anim 字段（可叠加多个，像标签一样挂在元素/part 上）：
  //   字符串简写 'bob' | 'wave' | 'blink' | 'pulse'（= 默认参数，旧配置兼容）
  //   单动画对象 { type:'bob', amp:1, period:0.5 }
  //   多动画叠加 { bob:{...}, wave:{...}, blink:{...} }（各原语互不冲突，按顺序叠加）
  // 作用顺序（文档化）：bob（平移，可带 angle 斜向）→ wave（旋转摆动）→ pulse（缩放）→ blink（透明度）
  function animList(a) {
    if (!a) return [];
    if (typeof a === 'string') return [{ type: a, params: {} }];
    if (a.type) return [{ type: a.type, params: a }];
    return Object.keys(a).map(k => ({ type: k, params: a[k] || {} }));
  }
  function applyAnims(list, t, init) {
    let yOff = init.yOff || 0, xOff = init.xOff || 0, rot = init.rot || 0, scale = init.scale != null ? init.scale : 1, alpha = init.alpha != null ? init.alpha : 1;
    for (const an of list) {
      const pr = an.params || {};
      if (an.type === 'bob') {
        const per = pr.period != null ? pr.period : 1 / 6; // 秒/翻转（默认 1/6s，与 train 原 floor(t*6)%2 一致）
        const phase = Math.floor(t / per) % 2 * (pr.amp != null ? pr.amp : 1);
        const ang = (pr.angle != null ? pr.angle : 0) * Math.PI / 180; // 角度：0=垂直，90=水平
        xOff += Math.sin(ang) * phase;
        yOff += Math.cos(ang) * phase;
      } else if (an.type === 'wave') {
        const per = pr.period != null ? pr.period : 1; // 秒/周期
        rot += (pr.amp != null ? pr.amp : 10) * Math.sin(t / per * Math.PI * 2); // 度：绕中心来回摆动
      } else if (an.type === 'pulse') {
        const per = pr.period != null ? pr.period : 0.7; // 秒/周期
        scale *= 1 + (pr.amp != null ? pr.amp : 0.15) * Math.sin(t / per * Math.PI * 2);
      } else if (an.type === 'blink') {
        const per = pr.period != null ? pr.period : 700; // 毫秒/周期
        const duty = pr.duty != null ? pr.duty : 0.5; // on 占比（0-1）
        const ph = pr.phase || 0; // on 区间起点（周期比例 0-1）
        const pos = (t * 1000 / per) % 1;
        const rel = (pos - ph + 1) % 1; // 相对 on 起点的位置
        alpha *= rel < duty ? (pr.on != null ? pr.on : 1) : (pr.off != null ? pr.off : 0.25);
      }
    }
    return { yOff, xOff, rot, scale, alpha };
  }
  function drawParts(e, t) {
    // 元素级重采样（pixelDiv > 1）：parts 画到「包围盒 ÷ 除数」离屏小画布 → 最近邻放大（锯齿感）
    const div = e.pixelDiv || 1;
    if (div > 1 && !e.partsBand && !(e.scroll && e.scroll.speed && e.scroll.span)) {
      const ox0 = 0, x0 = val(e, 'x', t) || 0, y0 = val(e, 'y', t) || 0;
      const lb = partsLocalBox(e);
      if (!lb) return;
      const bx = x0 + lb.x, by = y0 + lb.y;
      const W = Math.max(2, Math.round(lb.w / div)), H = Math.max(2, Math.round(lb.h / div));
      const oc = document.createElement('canvas');
      oc.width = W; oc.height = H;
      const og = oc.getContext('2d');
      og.imageSmoothingEnabled = false;
      og.scale(1 / div, 1 / div);
      og.translate(-bx, -by);
      const savedCtx = ctx;
      ctx = og;
      drawPartsRaw(e, t, 1); // 离屏画不透明版（元素 alpha 移到放大时应用，避免与边缘透明处理冲突）
      ctx = savedCtx;
      if (e.alphaMode === 'remove' || e.alphaMode === 'boost') {
        const aid = og.getImageData(0, 0, oc.width, oc.height);
        const ad = aid.data;
        if (e.alphaMode === 'remove') { for (let ai = 3; ai < ad.length; ai += 4) { const av = ad[ai]; if (av > 0 && av < 128) ad[ai] = 0; else if (av >= 128) ad[ai] = 255; } }
        else { for (let ai = 3; ai < ad.length; ai += 4) if (ad[ai] > 0) ad[ai] = 255; }
        og.putImageData(aid, 0, 0);
      }
      let elAlpha = e.alpha != null ? e.alpha : 1;
      elAlpha = applyAnims(animList(e.anim), t, { yOff: 0, scale: 1, alpha: elAlpha }).alpha;
      ctx.save();
      ctx.globalAlpha = elAlpha; // 元素级透明度（含 blink）在放大时应用
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(oc, 0, 0, W, H, Math.round(bx), Math.round(by), Math.round(lb.w), Math.round(lb.h));
      ctx.restore();
      return;
    }
    drawPartsRaw(e, t);
  }
  // 滚动偏移（支持斜向 scrollAngle）：元素 scroll.angle 或顶层 angle（度；0=水平滚动，90=垂直下落）
  function scrollOffsets(e, t) {
    if (!e.scroll || !e.scroll.speed) return { x: 0, y: 0 };
    const span = e.scroll.span || e.w || 1;
    const off = (t * e.scroll.speed) % span;
    const dir = e.scroll.dir === 'right' ? 1 : -1;
    const ang = ((e.scroll && e.scroll.angle) || e.angle || 0) * Math.PI / 180;
    // 位移向量：ox 沿水平 dir；oy = off×sin(angle) 恒正（angle>0 向下落）
    return { x: dir * off * Math.cos(ang), y: off * Math.sin(ang) };
  }
  function drawPartsRaw(e, t, alphaOverride) {
    const so = scrollOffsets(e, t);
    const x0 = val(e, 'x', t) || 0, y0 = val(e, 'y', t) || 0; // 缺失键按 0
    // 元素级动画（可叠加）：bob（平移，可 angle 斜向）→ wave（旋转摆动）→ pulse 缩放 → blink 透明度
    const ea = applyAnims(animList(e.anim), t, { yOff: 0, xOff: 0, rot: 0, scale: 1, alpha: alphaOverride != null ? alphaOverride : (e.alpha != null ? e.alpha : 1) });
    const X0 = x0 + ea.xOff + so.x, Y0 = y0 + ea.yOff + so.y;
    const scale = ea.scale;
    const alpha = ea.alpha;
    const blit = (dx, yAdd) => {
      const X = X0 + dx;
      const Y = Y0 + (yAdd || 0);
      for (const p of (e.parts || [])) {
        const q = normPart(p);
        // 图元级动画（bob/wave/blink；pulse 缩放留元素级）
        const pa = applyAnims(animList(q.anim), t, { yOff: 0, xOff: 0, rot: 0, scale: 1, alpha: q.alpha != null ? q.alpha : 1 });
        ctx.globalAlpha = alpha * pa.alpha; // 元素级 × 图元级 × 图元动画
        const PX = Math.round(X + pa.xOff + (q.x || 0)), PY = Math.round(Y + pa.yOff + (q.y || 0));
        const rot = (q.rot || 0) + (pa.rot || 0), fh = q.flipH ? -1 : 1, fv = q.flipV ? -1 : 1;
        if (rot || fh < 0 || fv < 0) {
          const c = partCenter(q);
          const cx = X + pa.xOff + c.cx, cy = Y + pa.yOff + c.cy;
          ctx.save();
          ctx.translate(cx, cy);
          // 先翻转后旋转（镜像作用于旋转角度；flip·R(rot) = R(-rot)·flip）
          if (rot) ctx.rotate(rot * Math.PI / 180);
          ctx.scale(fh, fv);
          ctx.translate(-cx, -cy);
        }
        const hasStroke = q.stroke && q.strokeWidth > 0;
        if (q.type === 'rect') {
          const w = Math.round((q.w || 1) * scale), h = Math.round((q.h || 1) * scale);
          if (q.fill) rect(PX, PY, w, h, q.fill);
          if (hasStroke) { ctx.strokeStyle = q.stroke; ctx.lineWidth = q.strokeWidth; ctx.strokeRect(PX, PY, w, h); }
        } else if (q.type === 'line') {
          ctx.strokeStyle = q.stroke || q.fill || '#fff';
          ctx.lineWidth = q.strokeWidth || 1;
          ctx.beginPath(); ctx.moveTo(PX, PY); ctx.lineTo(Math.round(X + (q.x2 || 0)), Math.round(y0 + (q.y2 || 0))); ctx.stroke();
        } else if (q.type === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(PX + (q.w || 1) / 2, PY + (q.h || 1) / 2, (q.w || 1) / 2, (q.h || 1) / 2, 0, 0, Math.PI * 2);
          if (q.fill) { ctx.fillStyle = q.fill; ctx.fill(); }
          if (hasStroke) { ctx.strokeStyle = q.stroke; ctx.lineWidth = q.strokeWidth; ctx.stroke(); }
        } else if (q.type === 'poly' && (q.points || []).length >= 2) {
          ctx.beginPath();
          ctx.moveTo(PX + q.points[0][0], PY + q.points[0][1]);
          for (let i = 1; i < q.points.length; i++) ctx.lineTo(PX + q.points[i][0], PY + q.points[i][1]);
          ctx.closePath();
          if (q.fill) { ctx.fillStyle = q.fill; ctx.fill(); }
          if (hasStroke) { ctx.strokeStyle = q.stroke; ctx.lineWidth = q.strokeWidth; ctx.stroke(); }
        }
        if (rot || fh < 0 || fv < 0) ctx.restore();
      }
    };
    ctx.globalAlpha = alpha;
    // 元素级旋转（e.rot 静态 + wave 动态）：绕元素包围盒中心（包住全部绘制；平铺元素旋转整个带）
    let wv = null;
    const totalRot = (e.rot || 0) + (ea.rot || 0);
    if (totalRot) {
      const lb = partsLocalBox(e);
      if (lb) wv = { cx: X0 + lb.x + lb.w / 2, cy: Y0 + lb.y + lb.h / 2 };
    }
    if (wv) { ctx.save(); ctx.translate(wv.cx, wv.cy); ctx.rotate(totalRot * Math.PI / 180); ctx.translate(-wv.cx, -wv.cy); }
    // 带元素判定：speed/span 可能在顶层（程序元素，含按场景数组）或 scroll 对象（图片素材）
    const bSpeed = (e.scroll && e.scroll.speed) || val(e, 'speed', t) || 0;
    const bSpan = (e.scroll && e.scroll.span) || e.span || e.w || 1;
    if (e.partsBand && bSpeed && bSpan) {
      // 带元素：母带同款 wrap 公式逐瓦片（图元 x 为瓦片相位偏移，随带同步滚动，不漂移）
      const offset = wrap(t * bSpeed, bSpan);
      const n = Math.ceil(W / bSpan) + 3;
      for (let j = -1; j < n; j++) blit(j * bSpan - offset);
    } else if (e.scroll && e.scroll.speed && e.scroll.span) {
      // 瓦片沿 scroll.angle 方向排列（斜向无缝）；位移已在 X0（so.x/so.y）
      const span = e.scroll.span;
      const angDeg = (e.scroll.angle != null) ? e.scroll.angle : (e.scroll.dir === 'right' ? 0 : 180);
      const ang = angDeg * Math.PI / 180;
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const n = Math.ceil(W / span) + 3;
      for (let j = 0; j < n; j++) blit(j * span * cosA, so.y + j * span * sinA);
    } else {
      blit(0, so.y);
    }
    if (wv) ctx.restore();
    ctx.globalAlpha = 1;
  }
  function drawOneImage(e, t) {
    if (!elShown(e, t)) return;
    // 工具注入的采样画布优先（_asset，同步可用）；否则按 src 缓存（键 = src：同名不同素材不串图）
    const img = e._asset || (e.src && (imgCache[e.src] || (imgCache[e.src] = (() => { const i = new Image(); i.src = e.src; return i; })())));
    if (!img || !img.width) return;
    // 多帧（sprite sheet 横向）：frames > 1 时按 fps 取帧
    const frames = e.frames > 1 ? e.frames : 1;
    const fps = e.fps || 8;
    const fx = frames > 1 ? Math.floor(t * fps) % frames : 0;
    const sw = frames > 1 ? Math.floor(img.width / frames) : img.width;
    const srcX = fx * sw;
    const so = scrollOffsets(e, t);
    let alpha = e.alpha != null ? e.alpha : 1;
    // 元素级动画（可叠加）：bob（平移，可 angle 斜向）→ wave（旋转摆动）→ pulse 缩放 → blink 透明度
    const ea = applyAnims(animList(e.anim), t, { yOff: 0, xOff: 0, rot: 0, scale: 1, alpha: alpha });
    alpha = ea.alpha;
    let scale = ea.scale;
    const w = e.w * scale, h = e.h * scale;
    const bobX = ea.xOff, bobY = ea.yOff;
    ctx.globalAlpha = alpha;
    const rot = (e.rot || 0) + (ea.rot || 0), fh = e.flipH ? -1 : 1, fv = e.flipV ? -1 : 1;
    const blit = (dx, dy) => {
      const dxx = dx + bobX, dyy = dy + bobY;
      if (rot || fh < 0 || fv < 0) {
        ctx.save();
        ctx.translate(dxx + w / 2, dyy + h / 2);
        // 先翻转后旋转（镜像作用于旋转角度；flip·R(rot) = R(-rot)·flip）
        if (rot) ctx.rotate(rot * Math.PI / 180);
        ctx.scale(fh, fv);
        ctx.drawImage(img, srcX, 0, sw, img.height, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, srcX, 0, sw, img.height, Math.round(dxx), Math.round(dyy), w, h);
      }
    };
    if (e.scroll && e.scroll.speed && e.scroll.span) {
      // 瓦片沿 scroll.angle 方向排列（位移并入 dx）
      const sp = e.scroll.span;
      const angDeg = (e.scroll.angle != null) ? e.scroll.angle : (e.scroll.dir === 'right' ? 0 : 180);
      const ang = angDeg * Math.PI / 180;
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const n = Math.ceil(W / sp) + 3;
      for (let j = 0; j < n; j++) blit(e.x + so.x + j * sp * cosA, e.y + so.y + j * sp * sinA);
    } else {
      blit(e.x + so.x, e.y + so.y);
    }
    ctx.globalAlpha = 1;
  }

  // 时间轴跳转：设置动画时钟并立即渲染（工具时间轴点击/拖动用）
  function seek(t) { elapsed = t % LOOPv(); if (ctx) draw(elapsed); }
  // 清空图片缓存（工具重像素化/素材失效时调用；键 = src，按引用重建）
  function clearImageCache() { Object.keys(imgCache).forEach(k => { delete imgCache[k]; }); }

  return { init, resize, start, stop, draw, seek, clearImageCache, W, H, LOOP };
})();

window.HomeScene = HomeScene;
window.HOME_SCENE_DEFAULT = DEFAULT_HOME_SCENE;
document.addEventListener('DOMContentLoaded', () => HomeScene.init());
