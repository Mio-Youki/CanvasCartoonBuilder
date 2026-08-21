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
// 内置键（结构性 + 硬编码元素名）：其余顶层对象视为「通用程序元素」（有 parts → 图元渲染；
// 有 particle → 粒子系统渲染）——工具/Agent 生成的新元素无需改渲染器即可生效
const SCENE_KEYS = ['format', 'formatVersion', 'kind', 'name', 'meta', 'w', 'h', 'loop', 'bg', 'scenes', 'sceneBorders', 'images', 'fx',
  'stars', 'moon', 'clouds', 'mountains', 'farForest', 'poles', 'rail', 'train', 'foreground', 'fog', 'signal', 'bridge'];

const HomeScene = (() => {
  let W = CFG.w, H = CFG.h, LOOP = CFG.loop;
  let canvas, ctx, raf = 0, last = 0, elapsed = 0, running = false;
  let sceneOverride = null; // 过渡活帧：渲染旧场景时临时覆盖 scene(t) 返回值
  let altCanvas = null;     // 过渡活帧：旧场景离屏（scan/wipe/dissolve 合成用）
  let transFrom = null;     // 过渡的旧场景号（边界处记录，过渡结束清空）
  let lastPart = -1;        // 上一帧场景号（边界检测）
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
    if (sceneOverride != null) return sceneOverride; // 过渡活帧：旧场景渲染时覆盖
    const lt = ((t % LOOPv()) + LOOPv()) % LOOPv();
    const n = (CFG.scenes && CFG.scenes.length) || 4;
    const b = CFG.sceneBorders && CFG.sceneBorders.length === n - 1 ? CFG.sceneBorders : null; // 边界数必须 = 场景数-1（防脏数据越界：返回 n 会导致 show 隐藏/越界取段）
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

  // ---------- 后处理 fx（全局配置，默认无字段 = 全关，零开销） ----------
  // 新模型 CFG.fx = { segs: [[ {f:[f0,f1], crt, glitch, vignette, noise, palette, hue, brightness, contrast, saturation, ...}, ... ], ...], transition, transitionDur }
  //   segs[scene] = 该场景的时段段数组（f 为场景内 0~1 比例，段按 f 排序覆盖 [0,1]）；每段独立存全套 A+B 参数
  // 旧模型（向后兼容）CFG.fx = { crt, glitch, ..., palette, hue, transition }：常量 / 按场景数组 / 窗口数组
  // 当前时段段：segs 存在时按 t 找段；否则返回 null（走旧模型）
  function fxSeg(t) {
    const f = CFG.fx;
    if (!f || !f.segs || !f.segs.length) return null;
    const p = scene(t);
    const segs = f.segs[Math.min(p, f.segs.length - 1)];
    if (!segs || !segs.length) return null;
    const [s0, s1] = sceneBounds(p);
    const lt = ((t % LOOPv()) + LOOPv()) % LOOPv() - s0;
    const dur = s1 - s0;
    const rel = dur > 0 ? lt / dur : 0;
    for (const seg of segs) {
      const a = seg.f ? seg.f[0] : 0, b = seg.f ? seg.f[1] : 1;
      if (rel >= a && rel < b) return seg;
    }
    return segs[0] || null;
  }
  function fxOn(k, t) {
    const f = CFG.fx;
    if (!f) return false;
    const seg = fxSeg(t);
    if (seg) return !!seg[k]; // 新模型：读当前段
    if (f[k] == null) return false; // 旧模型
    const v = valAt({ [k]: f[k] }, k, scene(t));
    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && v[0] !== null && Array.isArray(v[0])) {
      const p = scene(t);
      const [s0, s1] = sceneBounds(p);
      const lt = ((t % LOOPv()) + LOOPv()) % LOOPv() - s0;
      const dur = s1 - s0;
      return v.some(seg2 => lt >= seg2[0] * dur && lt < seg2[1] * dur);
    }
    return !!v;
  }
  function fxVal(k, t, def) {
    const f = CFG.fx;
    if (!f) return def;
    const seg = fxSeg(t);
    if (seg) return seg[k] != null ? seg[k] : def; // 新模型：读当前段
    if (f[k] == null) return def; // 旧模型
    const v = valAt({ [k]: f[k] }, k, scene(t));
    return (Array.isArray(v) && v.length && typeof v[0] === 'object' && v[0] !== null && Array.isArray(v[0])) ? def : v;
  }
  // 预生成纹理缓存：尺寸变化 / 参数变化时重建（fxTex 存纹理 + LUT + 矩阵 + 参数快照）
  // 色板定义（与工具 PALETTES 共用值）：pico8 32 色 / nes 16 色 / vga 16 色 / gb 4 色
  const FX_PALETTES = {
    pico8: [[0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],[255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170],[41,54,111],[43,83,120],[112,120,51],[131,143,196],[159,73,28],[83,54,32],[81,31,25],[141,135,123],[79,91,40],[87,79,74],[187,160,119],[142,154,114],[129,156,143],[105,115,98],[178,161,131],[227,204,155]],
    nes: [[0,0,0],[124,124,124],[248,248,248],[252,60,48],[252,152,56],[252,252,88],[184,248,24],[88,216,84],[32,184,152],[0,136,196],[72,60,168],[168,64,208],[252,60,148],[252,152,192],[64,64,64],[188,188,188]],
    vga: [[0,0,0],[128,0,0],[0,128,0],[128,128,0],[0,0,128],[128,0,128],[0,128,128],[192,192,192],[128,128,128],[255,0,0],[0,255,0],[255,255,0],[0,0,255],[255,0,255],[0,255,255],[255,255,255]],
    gb: [[15,56,15],[48,98,48],[139,172,15],[155,188,15]],
  };
  // 通用 LUT 构建：任意色板定义 → 65536 项（r5g6b5）查找表
  function buildLut(pal) {
    const lut = new Uint8Array(65536 * 3);
    for (let i = 0; i < 65536; i++) {
      const r = (i >> 11) << 3, g = ((i >> 5) & 63) << 2, b = (i & 31) << 3;
      let bi = 0, bd = Infinity;
      for (let j = 0; j < pal.length; j++) {
        const dr = r - pal[j][0], dg = g - pal[j][1], db = b - pal[j][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; bi = j; }
      }
      lut[i * 3] = pal[bi][0]; lut[i * 3 + 1] = pal[bi][1]; lut[i * 3 + 2] = pal[bi][2];
    }
    return lut;
  }
  let fxTex = null;
  // 调色矩阵构建（饱和度/对比度/亮度 基础矩阵 × 色相旋转级联 → 单 3×3 + 偏移）——fx 整帧与粒子颜色抖动共用
  function colorMatrixOf(hueDeg, brightness, contrast, saturation) {
    const cst = contrast != null ? contrast : 1;
    const sat = saturation != null ? saturation : 1;
    const b = (brightness || 0); // 亮度偏移（-100~100 直接作用于 0~255 值域）
    const mo = 128 * (1 - cst) + b;
    const lumR = .213, lumG = .715, lumB = .072;
    const sr = (1 - sat) * lumR, sg = (1 - sat) * lumG, sb = (1 - sat) * lumB;
    let base = [
      cst * (sat + sr), cst * sg, cst * sb,
      cst * sr, cst * (sat + sg), cst * sb,
      cst * sr, cst * sg, cst * (sat + sb),
    ];
    if (hueDeg) {
      const a = hueDeg * Math.PI / 180, s = Math.sin(a), c2 = Math.cos(a);
      const hueM = [
        .213 + c2 * .787 - s * .213, .715 - c2 * .715 - s * .715, .072 - c2 * .072 + s * .928,
        .213 - c2 * .213 + s * .143, .715 + c2 * .285 + s * .140, .072 - c2 * .072 - s * .283,
        .213 - c2 * .213 - s * .787, .715 - c2 * .715 + s * .715, .072 + c2 * .928 + s * .072,
      ];
      // base × hueM（先调色再色相）
      const mm = (a1, a2, a3, b1, b2, b3) => a1 * b1 + a2 * b2 + a3 * b3;
      base = [
        mm(base[0], base[1], base[2], hueM[0], hueM[3], hueM[6]),
        mm(base[0], base[1], base[2], hueM[1], hueM[4], hueM[7]),
        mm(base[0], base[1], base[2], hueM[2], hueM[5], hueM[8]),
        mm(base[3], base[4], base[5], hueM[0], hueM[3], hueM[6]),
        mm(base[3], base[4], base[5], hueM[1], hueM[4], hueM[7]),
        mm(base[3], base[4], base[5], hueM[2], hueM[5], hueM[8]),
        mm(base[6], base[7], base[8], hueM[0], hueM[3], hueM[6]),
        mm(base[6], base[7], base[8], hueM[1], hueM[4], hueM[7]),
        mm(base[6], base[7], base[8], hueM[2], hueM[5], hueM[8]),
      ];
    }
    return { m: base, mo: mo };
  }
  // hex 颜色 → {r,g,b}（支持 #rgb/#rrggbb；其他字符串按不透明处理为 255 白）
  function hexToRgb(c) {
    if (typeof c === 'string' && c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (/^[0-9a-fA-F]{6}$/.test(h)) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    return { r: 255, g: 255, b: 255 };
  }
  function fxEnsureTex(t) {
    const f = CFG.fx;
    if (!f) return;
    const need = {
      crt: fxOn('crt', t), vignette: fxOn('vignette', t), noise: fxOn('noise', t),
      palette: fxVal('palette', t, 'none'), hue: fxVal('hue', t, 0),
      brightness: fxVal('brightness', t, 0), contrast: fxVal('contrast', t, 1), saturation: fxVal('saturation', t, 1),
      noiseAlpha: fxVal('noiseAlpha', t, .1), vignetteStrength: fxVal('vignetteStrength', t, .38),
      vignetteColor: fxVal('vignetteColor', t, '#000000'),
      crtOpacity: fxVal('crtOpacity', t, .28), crtSpacing: fxVal('crtSpacing', t, 3),
      pixelDiv: fxVal('pixelDiv', t, 1),
    };
    const same = fxTex && fxTex.w === W && fxTex.h === H
      && ['crt','vignette','noise','palette','hue','brightness','contrast','saturation','noiseAlpha','vignetteStrength','vignetteColor','crtOpacity','crtSpacing','pixelDiv'].every(k => fxTex[k] === need[k]);
    if (same) return;
    fxTex = Object.assign({ w: W, h: H }, need);
    if (need.crt) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,' + need.crtOpacity + ')';
      for (let y = 0; y < H; y += need.crtSpacing) g.fillRect(0, y, W, 1);
      fxTex.crtTex = c;
    }
    if (need.vignette) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const vc = hexToRgb(need.vignetteColor);
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .72);
      gr.addColorStop(0, 'rgba(' + vc.r + ',' + vc.g + ',' + vc.b + ',0)');
      gr.addColorStop(1, 'rgba(' + vc.r + ',' + vc.g + ',' + vc.b + ',' + need.vignetteStrength + ')');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      fxTex.vigTex = c;
    }
    if (need.noise) {
      // N 帧噪点（noiseFrames，默认 3）：独立随机纹理，逐帧轮换 + 平移 → 更活
      const nf = Math.max(1, Math.min(8, fxVal('noiseFrames', t, 3) | 0));
      const arr = [];
      for (let fi = 0; fi < nf; fi++) {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d');
        const id = g.createImageData(W, H);
        const d = id.data;
        const a = Math.round(need.noiseAlpha * 255);
        for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = a; }
        g.putImageData(id, 0, 0);
        arr.push(c);
      }
      fxTex.noiseTexes = arr;
      fxTex.noiseFrames = nf;
    }
    if (need.palette !== 'none' && FX_PALETTES[need.palette]) fxTex.lut = buildLut(FX_PALETTES[need.palette]);
    // 调色矩阵：饱和度/对比度/亮度 合成基础矩阵，再与色相旋转级联 → 单个 3×3（每像素 9 次乘加）
    const cm = colorMatrixOf(need.hue, need.brightness, need.contrast, need.saturation);
    fxTex.matrix = cm.m;
    fxTex.offset = cm.mo;
  }
  // B 档像素滤镜：降采样(pixelDiv) → 调色矩阵 → LUT 色板（在缩小画布上）→ 放大回原尺寸
  function applyPixelFilter(t) {
    const f = CFG.fx;
    if (!f) return;
    const needPalette = fxVal('palette', t, 'none');
    const needHue = fxVal('hue', t, 0);
    const needB = fxVal('brightness', t, 0), needC = fxVal('contrast', t, 1), needS = fxVal('saturation', t, 1);
    const needDiv = fxVal('pixelDiv', t, 1);
    // 纯降采样（pixelDiv>1 且无调色）也需进入：先缩后放产生颗粒感
    if (needPalette === 'none' && !needHue && !needB && needC === 1 && needS === 1 && needDiv <= 1) return;
    fxEnsureTex(t);
    if (!fxTex) return;
    // 降采样：pixelDiv=1 不降（全分辨率）；2/4 = 降采样（颗粒感 + 调色开销 ÷ div²）
    const div = Math.max(1, Math.min(4, fxTex.pixelDiv | 0));
    const sw = Math.max(2, Math.round(W / div)), sh = Math.max(2, Math.round(H / div));
    const oc = document.createElement('canvas'); oc.width = sw; oc.height = sh;
    const og = oc.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(canvas, 0, 0, W, H, 0, 0, sw, sh);
    const id = og.getImageData(0, 0, sw, sh);
    const d = id.data;
    const m = fxTex.matrix, mo = fxTex.offset || 0;
    if (m) {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        d[i] = Math.min(255, Math.max(0, m[0] * r + m[1] * g + m[2] * b + mo));
        d[i + 1] = Math.min(255, Math.max(0, m[3] * r + m[4] * g + m[5] * b + mo));
        d[i + 2] = Math.min(255, Math.max(0, m[6] * r + m[7] * g + m[8] * b + mo));
      }
    }
    if (fxTex.lut) {
      for (let i = 0; i < d.length; i += 4) {
        const idx = ((d[i] >> 3) << 11) | ((d[i + 1] >> 2) << 5) | (d[i + 2] >> 3);
        d[i] = fxTex.lut[idx * 3]; d[i + 1] = fxTex.lut[idx * 3 + 1]; d[i + 2] = fxTex.lut[idx * 3 + 2];
      }
    }
    og.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(oc, 0, 0, sw, sh, 0, 0, W, H);
  }
  // A 档叠加层 + 故障位移条（glitch 用 t 做确定性随机种子）
  function applyOverlays(t) {
    const f = CFG.fx;
    if (!f) return;
    fxEnsureTex(t);
    if (!fxTex) return;
    if (fxOn('crt', t) && fxTex.crtTex) ctx.drawImage(fxTex.crtTex, 0, 0);
    if (fxOn('vignette', t) && fxTex.vigTex) ctx.drawImage(fxTex.vigTex, 0, 0);
    if (fxOn('noise', t) && fxTex.noiseTexes && fxTex.noiseTexes.length) {
      // N 帧轮换（12fps 阶梯下每帧换帧）+ 确定性小幅平移 → 雪花闪烁感
      const nf = fxTex.noiseFrames || fxTex.noiseTexes.length;
      const fi = Math.floor(t * 12) % nf;
      const seed = (tt => { const s = Math.sin(tt * 127.1) * 43758.5453; return s - Math.floor(s); })(t * 3.1);
      const ox = (seed * 3 | 0) - 1, oy = (seed * 3 | 0) - 1;
      ctx.drawImage(fxTex.noiseTexes[fi], ox, oy);
    }
    if (fxOn('glitch', t)) {
      const seed = (tt => { const s = Math.sin(tt * 127.1) * 43758.5453; return s - Math.floor(s); })(t * 13.7);
      const n = 3 + (seed * 4 | 0);
      for (let i = 0; i < n; i++) {
        const sy = (seed * 137 + i * 37) % H | 0;
        const bh = 2 + ((seed * 91 + i * 17) % 6 | 0);
        const dx = (((seed * 53 + i * 23) % 21 | 0) - 10);
        ctx.drawImage(canvas, 0, sy, W, bh, dx, sy, W, bh);
      }
    }
  }
  // 过渡：升级硬编码暗场（fade 默认 = 现状）；scan/wipe 新样式。transition/transitionDur 为场景级（按场景独立，不进时段段）
  // 段内位置用 sceneBounds（按 sceneBorders/等分）计算——拖拽边界后仍对齐当前场景起点
  // 场景过渡样式（按场景取；缺省 fade；'none'=无过渡）
  function transitionStyleOf(part) {
    const f = CFG.fx;
    if (!f || f.transition == null) return 'fade';
    const v = valAt({ transition: f.transition }, 'transition', part);
    return typeof v === 'string' ? v : 'fade';
  }
  // 过渡状态：{edge, dur, p, style} 或 null（非过渡期 / 样式 none 无过渡）
  function transitionState(t, part) {
    const f = CFG.fx;
    if (!f) return null;
    const style = transitionStyleOf(part);
    if (style === 'none') return null; // 无过渡：不渲染任何覆盖、不活帧合成
    const local = ((t % LOOPv()) + LOOPv()) % LOOPv();
    const [s0, s1] = sceneBounds(part);
    const edge = Math.max(0, local - s0);
    const rawDur = f.transitionDur != null ? f.transitionDur : .25;
    const dur = Array.isArray(rawDur) ? (rawDur[Math.min(part, rawDur.length - 1)] != null ? rawDur[Math.min(part, rawDur.length - 1)] : .25) : rawDur;
    if (edge >= dur) return null;
    return { edge: edge, dur: dur, p: edge / dur, style: style };
  }
  function applyTransition(t) {
    const part = scene(t);
    const tr = transitionState(t, part);
    if (!tr) return;
    const p = tr.p;
    const style = tr.style;
    const tc = hexToRgb(CFG.fx.transitionColor != null ? valAt({ transitionColor: CFG.fx.transitionColor }, 'transitionColor', part) : '#03060f');
    const colA = (a) => 'rgba(' + tc.r + ',' + tc.g + ',' + tc.b + ',' + a + ')';
    const hasAlt = altCanvas && altCanvas.width === W && altCanvas.height === H;
    if (style === 'fade') { rect(0, 0, W, H, colA(1 - p)); return; }
    if (style === 'scan') {
      // 上→下揭示：上方（条带后）= 新场景；下方（条带前）= 旧场景活帧
      if (hasAlt) { ctx.save(); ctx.beginPath(); ctx.rect(0, Math.max(1, H * p), W, H); ctx.clip(); ctx.drawImage(altCanvas, 0, 0); ctx.restore(); }
      else rect(0, 0, W, Math.max(1, H * p), colA(1 - p));
      return;
    }
    if (style === 'wipe') {
      // 左→右揭示：左侧（条带后）= 新场景；右侧（条带前）= 旧场景活帧
      if (hasAlt) { ctx.save(); ctx.beginPath(); ctx.rect(Math.max(1, W * p), 0, W, H); ctx.clip(); ctx.drawImage(altCanvas, 0, 0); ctx.restore(); }
      else rect(0, 0, Math.max(1, W * p), H, colA(1 - p));
      return;
    }
    if (style === 'dissolve') {
      // 场景→场景溶解：每像素确定性 hash，hash >= p 保留旧场景（altCanvas 活帧）像素、否则新场景像素
      const id = ctx.getImageData(0, 0, W, H);
      const d = id.data;
      let pd = null;
      if (hasAlt) pd = altCanvas.getContext('2d').getImageData(0, 0, W, H).data;
      const seed = 13;
      if (pd) {
        for (let i = 0; i < d.length; i += 4) {
          const px = (i / 4) % W, py = ((i / 4) / W) | 0;
          const s = Math.sin(px * 127.1 + py * 311.7 + seed * 74.7) * 43758.5453;
          const h = s - Math.floor(s);
          if (h >= p) { d[i] = pd[i]; d[i + 1] = pd[i + 1]; d[i + 2] = pd[i + 2]; }
        }
        ctx.putImageData(id, 0, 0);
      } else {
        // 无旧帧（理论不发生）：退化为暗场显现
        for (let i = 0; i < d.length; i += 4) {
          const px = (i / 4) % W, py = ((i / 4) / W) | 0;
          const s = Math.sin(px * 127.1 + py * 311.7 + seed * 74.7) * 43758.5453;
          const h = s - Math.floor(s);
          if (h >= p) { d[i] = tc.r; d[i + 1] = tc.g; d[i + 2] = tc.b; }
        }
        ctx.putImageData(id, 0, 0);
      }
      return;
    }
  }

  // —— 粒子系统（程序元素变体）：cfg.<名> = { z, show, x,y,w,h, parts, particle:{...} } ——
  // 实体 = 元素自身 parts（每粒按粒子参数运动绘制；part 级 anim 仍生效）；x/y/w/h = 发射区（缺省 = 全画布 → 全局雨/雪）。
  // 确定性：每粒用 rnd(i, salt)（种子随机：显式 seed 优先，否则按元素 key 哈希）→ 同 t 渲染稳定（可像素回归），
  // 不同元素互不串模式。参数：count 同时粒子数 / rate 连续补给(个/秒) / burst 一次性爆发（每 loop 起点触发一次）/
  // life 寿命(秒) / speed dir(度,0=右 90=下 180=左 270=上) spread(扩散锥) gravity wind(水平加速度) /
  // spin(初始自旋度) spinSpeed(度/秒) sizeVar(尺寸抖动 [1-a,1+a]) alpha(初始透明度) fade(淡出) /
  // colorJitter(每粒颜色抖动 0~1，映射色相/亮度/饱和度/对比度各自最大档) pixelDiv(精灵像素化除数)
  // 精灵缓存：每帧每元素把 parts 渲染一次到离屏（应用 pixelDiv/alphaMode；part 级 anim 生效；元素级 anim/scroll
  // 不参与——粒子运动归粒子参数），粒子本体只做 blit —— 每粒属性（pixelDiv/颜色抖动）成本 ≈ 0
  function particleSprites(e, t, cj, cjDim) {
    const lb = partsLocalBox(e);
    if (!lb) return null;
    const div = (e.pixelDiv && e.pixelDiv > 1) ? e.pixelDiv : 1;
    // 尺寸下限 1：纯竖线/水平线 part 包围盒宽/高可为 0 → 精灵至少 1px（否则 blit 宽 0 不可见）
    const W = Math.max(1, Math.round(lb.w / div)), H = Math.max(1, Math.round(lb.h / div));
    const render = () => {
      const oc = document.createElement('canvas');
      oc.width = W; oc.height = H;
      const og = oc.getContext('2d');
      og.imageSmoothingEnabled = false;
      og.scale(1 / div, 1 / div);
      og.translate(-lb.x, -lb.y);
      const savedCtx = ctx;
      ctx = og;
      drawPartsRaw({ x: 0, y: 0, parts: e.parts, anim: null, scroll: null, rot: 0 }, t, 1); // 局部坐标不透明版（粒子 alpha 在 blit 时应用）
      ctx = savedCtx;
      if (e.alphaMode === 'remove' || e.alphaMode === 'boost') {
        const id = og.getImageData(0, 0, oc.width, oc.height);
        const d = id.data;
        if (e.alphaMode === 'remove') { for (let ai = 3; ai < d.length; ai += 4) { const av = d[ai]; if (av > 0 && av < 128) d[ai] = 0; else if (av >= 128) d[ai] = 255; } }
        else { for (let ai = 3; ai < d.length; ai += 4) if (d[ai] > 0) d[ai] = 255; }
        og.putImageData(id, 0, 0);
      }
      return oc;
    };
    const base = render();
    if (!(cj > 0)) return { base: base, lb: lb, W: W, H: H, variants: null };
    // 颜色抖动分桶（8 档确定性幅度）：只抖动所选维度（colorJitterDim：hue/brightness/saturation/contrast）
    const variants = [];
    const B = 8;
    for (let b = 0; b < B; b++) {
      const amt = ((b / (B - 1)) - 0.5) * 2; // [-1, 1]
      const cm = cjDim === 'brightness' ? colorMatrixOf(0, amt * cj * 30, 1, 1)
        : cjDim === 'saturation' ? colorMatrixOf(0, 0, 1, 1 + amt * cj * 0.3)
        : cjDim === 'contrast' ? colorMatrixOf(0, 0, 1 + amt * cj * 0.2, 1)
        : colorMatrixOf(amt * cj * 40, 0, 1, 1); // 默认色相
      const v = document.createElement('canvas');
      v.width = W; v.height = H;
      const vg = v.getContext('2d');
      vg.drawImage(base, 0, 0);
      const id = vg.getImageData(0, 0, W, H);
      const d = id.data, m = cm.m, mo = cm.mo;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b2 = d[i + 2];
        d[i] = Math.min(255, Math.max(0, m[0] * r + m[1] * g + m[2] * b2 + mo));
        d[i + 1] = Math.min(255, Math.max(0, m[3] * r + m[4] * g + m[5] * b2 + mo));
        d[i + 2] = Math.min(255, Math.max(0, m[6] * r + m[7] * g + m[8] * b2 + mo));
      }
      vg.putImageData(id, 0, 0);
      variants.push(v);
    }
    return { base: base, lb: lb, W: W, H: H, variants: variants };
  }
  function drawParticles(e, t, key) {
    const p = e.particle || {};
    const count = Math.max(0, Math.min(600, p.count != null ? p.count : 40));
    if (!count || !e.parts || !e.parts.length) return;
    const loop = LOOPv();
    const t0 = ((t % loop) + loop) % loop;
    const rate = p.rate != null ? p.rate : 40;
    const life = p.life != null ? p.life : 1.5;
    const burst = !!p.burst;
    const rx = val(e, 'x', t) != null ? val(e, 'x', t) : 0, ry = val(e, 'y', t) != null ? val(e, 'y', t) : 0; // 发射区（缺省 → 全画布）
    const rw = val(e, 'w', t) != null ? val(e, 'w', t) : W, rh = val(e, 'h', t) != null ? val(e, 'h', t) : H;
    let seed = p.seed != null ? p.seed : 1;
    if (p.seed == null && key) { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0; seed = h || 1; }
    const rnd = (i, salt) => { const s = Math.sin(i * 127.1 + seed * 311.7 + salt * 74.7) * 43758.5453; return s - Math.floor(s); };
    const dirRad = (p.dir != null ? p.dir : 90) * Math.PI / 180;
    const spreadRad = (p.spread != null ? p.spread : 0) * Math.PI / 180;
    const speed = p.speed != null ? p.speed : 30;
    const gravity = p.gravity != null ? p.gravity : 0;
    const wind = p.wind != null ? p.wind : 0;
    const spin = p.spin != null ? p.spin : 0;
    const spinSpeed = p.spinSpeed != null ? p.spinSpeed : 0;
    const sizeVar = p.sizeVar != null ? p.sizeVar : 0;
    const alpha0 = p.alpha != null ? p.alpha : 1;
    const fade = p.fade !== false;
    const cj = p.colorJitter || 0;
    const cjDim = p.colorJitterDim || 'hue'; // hue/brightness/saturation/contrast（只抖动所选维度）
    const sprites = particleSprites(e, t, cj, cjDim);
    if (!sprites) return;
    const sprW = sprites.W, sprH = sprites.H; // 精灵实际尺寸（含下限 1：竖线/水平线 part 不会不可见）
    const period = burst ? 0 : Math.max(0.01, Math.max(life, count / Math.max(0.01, rate)));
    const w0 = scrollWindowStart(e, t); // burst 触发 = 当前 [S] 窗口段起点（无 show → 0）
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < count; i++) {
      let age;
      if (burst) {
        const birth = Math.floor(t / loop) * loop + w0; // 每段显示窗口起点爆发（多段窗口 → 多次）；无 show → 每循环起点
        age = t - birth;
        if (age > life) continue;
      } else {
        const phase = (i / count) * period; // 错峰出生：稳态同时粒子数 ≈ count
        age = (t0 - phase + period) % period;
        if (age > life) continue; // 已消亡（等下一周期重生）
      }
      const sx = rx + rnd(i, 1) * rw;
      const sy = ry + rnd(i, 2) * rh;
      const ang = dirRad + (rnd(i, 3) - 0.5) * spreadRad;
      const vx = Math.cos(ang) * speed, vy = Math.sin(ang) * speed;
      const px = sx + vx * age + wind * age * age * 0.5;
      const py = sy + vy * age + gravity * age * age * 0.5;
      const size = 1 + (rnd(i, 5) * 2 - 1) * sizeVar; // 全幅 [1-a, 1+a]
      const a = alpha0 * (fade ? Math.max(0, 1 - age / life) : 1);
      const rot = spin + spinSpeed * age;
      const spr = (cj > 0 && sprites.variants) ? sprites.variants[(rnd(i, 7) * sprites.variants.length) | 0] : sprites.base;
      const wpx = sprW * size, hpx = sprH * size;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(Math.round(px), Math.round(py));
      if (rot) ctx.rotate(rot * Math.PI / 180);
      ctx.drawImage(spr, -wpx / 2, -hpx / 2, wpx, hpx);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // 渲染「背景 + 图层」（不含 fx/过渡）；sceneOverride 生效时按覆盖场景渲染（过渡活帧用）
  function renderLayers(t) {
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
      // 通用程序元素层：非内置键的顶层对象（有 particle → 粒子系统；否则有 parts → 图元）。
      // 工具/Agent 生成的新元素无需硬编码即渲染（粒子/图元实体均可，z 缺省 50）
      ...(Object.keys(CFG).filter(k => SCENE_KEYS.indexOf(k) < 0 && CFG[k] && typeof CFG[k] === 'object' && !Array.isArray(CFG[k])).map(k => {
        const el = CFG[k];
        return {
          z: el.z != null ? el.z : 50,
          hidden: el.hidden,
          fn: () => {
            if (!elShown(el, t)) return;
            if (el.particle && el.parts && el.parts.length) drawParticles(el, t, k);
            else if (el.parts && el.parts.length) drawParts(el, t);
          },
        };
      })),
    ].filter(Boolean).filter(l => !l.hidden);
    layers.sort((a, b) => a.z - b.z).forEach(l => l.fn());
  }
  // 过渡活帧：把旧场景（transFrom）实时渲染到 altCanvas。
  // 时间映射 tAlt = 旧场景起点 + (t - 新场景起点)：旧场景的窗口判定（elShown/scrollWindowStart/粒子）
  // 落在旧场景时间域内 → show 元素可见；tAlt 随 t 推进 → 仍为活帧（滚动/动画/粒子在动）
  function renderAltLive(t) {
    if (transFrom == null) return;
    if (!altCanvas) altCanvas = document.createElement('canvas');
    if (altCanvas.width !== W || altCanvas.height !== H) { altCanvas.width = W; altCanvas.height = H; }
    const part = scene(t);
    const [s0n, s1n] = sceneBounds(part);
    const [s0o, s1o] = sceneBounds(transFrom);
    const tAlt = Math.min(s0o + (t - s0n), Math.max(s0o, s1o - 0.001)); // 钳制在旧场景内
    const og = altCanvas.getContext('2d');
    const savedCtx = ctx, savedCanvas = canvas;
    canvas = altCanvas; ctx = og;
    sceneOverride = transFrom;
    try { renderLayers(tAlt); } finally { sceneOverride = null; ctx = savedCtx; canvas = savedCanvas; }
  }
  function draw(t) {
    syncCfg(); // 每帧同步外部注入的配置（工具实时调参生效的关键）
    const local = t % LOOPv();
    const part = scene(t);
    // 场景边界：记录旧场景号（scan/wipe/dissolve 活帧过渡用）
    if (part !== lastPart) { if (lastPart >= 0) transFrom = lastPart; lastPart = part; }
    // 过渡活帧：当前场景过渡为 scan/wipe/dissolve 且处于过渡期时，先渲染旧场景到 alt
    const tr = CFG.fx ? transitionState(t, part) : null;
    if (tr && transFrom != null && (tr.style === 'scan' || tr.style === 'wipe' || tr.style === 'dissolve')) renderAltLive(t);
    renderLayers(t);
    // 后处理 fx（默认无 CFG.fx → 全跳过，零开销）：B 滤镜（¼ 采样）→ A 叠加层 → 场景过渡
    if (CFG.fx) {
      applyPixelFilter(t);
      applyOverlays(t);
      applyTransition(t);
    } else {
      // 无 fx 配置：保留原有硬编码暗场闪切（视觉不变）
      const n = (CFG.scenes && CFG.scenes.length) || 4;
      const edge = local % (LOOPv() / n);
      if (edge < .25) rect(0, 0, W, H, 'rgba(3,6,15,' + (1 - edge / .25) + ')');
    }
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
    const n = (CFG.scenes && CFG.scenes.length) || 4;
    const b = CFG.sceneBorders && CFG.sceneBorders.length === n - 1 ? CFG.sceneBorders : null;
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
  // 滚动相位窗口起点：元素当前所在显示窗口的起点（秒）；无 show → 0（全局起算）
  // 窗口模型与 elShown 同一套：新模型 show 数组（每场景窗口，f 为场景内比例）/ legacy scenes / [t0,t1]
  function scrollWindowStart(e, t) {
    if (!e.show) return 0;
    if (Array.isArray(e.show) && e.show.length && (e.show[0] === null || Array.isArray(e.show[0]))) {
      const p = scene(t);
      const winsOf = (pi) => {
        const w = pi < e.show.length ? e.show[pi] : null;
        if (!w) return null;
        return Array.isArray(w[0]) ? w : [w];
      };
      let cur = p, curWins = winsOf(p);
      if (!curWins) return 0;
      // 当前所在窗口段起点
      let seg = null;
      for (let i = 0; i < curWins.length; i++) {
        const [s0, s1] = sceneBounds(cur);
        const wt = ((t % LOOPv()) + LOOPv()) % LOOPv();
        const lt = wt - s0;
        const dur = s1 - s0;
        if (lt >= curWins[i][0] * dur && lt < curWins[i][1] * dur) { seg = curWins[i]; break; }
      }
      if (!seg) seg = curWins[0] || [0, 1];
      // 连续窗口回溯：本场景窗口从 0 开始且上一场景有窗口以 1 结束 → 视为同一连续窗口（相位不重置、burst 不重复触发）
      const EPS = 1e-6;
      while (cur > 0 && seg[0] < EPS) {
        const prevWins = winsOf(cur - 1);
        if (!prevWins) break;
        const prevEnd = prevWins.find(sg => sg[1] > 1 - EPS);
        if (!prevEnd) break;
        const [ps0, ps1] = sceneBounds(cur - 1);
        seg = prevEnd;
        cur = cur - 1;
        if (ps1 - ps0 <= 0) break;
        // 回溯到上一场景该窗口起点（该窗口若也连续则继续回溯）
        if (seg[0] < EPS) continue;
        return ps0 + seg[0] * (ps1 - ps0);
      }
      const [s0, s1] = sceneBounds(cur);
      return s0 + seg[0] * (s1 - s0);
    }
    if (e.show && Array.isArray(e.show.scenes)) return sceneBounds(scene(t))[0];
    if (Array.isArray(e.show)) return e.show[0] || 0;
    return 0;
  }
  // 滚动偏移（支持斜向 scrollAngle）：scroll.angle 完整定义方向（0=右，90=下，180=左，270=上）；
  // 旧 dir 字段仅兼容：无 angle 时 left→180° / right→0°。相位从当前显示窗口起点归零（无 show → t=0）。
  function scrollOffsets(e, t) {
    if (!e.scroll || !e.scroll.speed) return { x: 0, y: 0 };
    const span = e.scroll.span || e.w || 1;
    const off = wrap((t - scrollWindowStart(e, t)) * e.scroll.speed, span);
    const angDeg = (e.scroll && e.scroll.angle != null) ? e.scroll.angle : (e.scroll && e.scroll.dir === 'right' ? 0 : 180);
    const ang = angDeg * Math.PI / 180;
    return { x: off * Math.cos(ang), y: off * Math.sin(ang) };
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
          ctx.beginPath(); ctx.moveTo(PX, PY); ctx.lineTo(Math.round(X + pa.xOff + (q.x2 || 0)), Math.round(Y + pa.yOff + (q.y2 || 0))); ctx.stroke();
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
    } else if (e.scroll && e.scroll.speed && e.scroll.span && e.scroll.repeat !== false) {
      // 瓦片沿 scroll.angle 方向排列（斜向无缝）；位移已在 X0/Y0（so.x/so.y），yAdd 只含瓦片间距
      const span = e.scroll.span;
      const angDeg = (e.scroll.angle != null) ? e.scroll.angle : (e.scroll.dir === 'right' ? 0 : 180);
      const ang = angDeg * Math.PI / 180;
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const n = Math.ceil(W / span) + 3;
      for (let j = 0; j < n; j++) blit(j * span * cosA, j * span * sinA);
    } else {
      // 单本体（无 span / repeat:false）：相位位移已在 Y0，不重复叠加
      blit(0, 0);
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
    if (e.scroll && e.scroll.speed && e.scroll.span && e.scroll.repeat !== false) {
      // 瓦片沿 scroll.angle 方向排列（位移并入 dx）；repeat:false → 单本体
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
