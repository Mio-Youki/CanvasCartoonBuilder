/*
 * Patcharium / 拼好景 · 案例 01
 * 纯自然语言 → 结构化微缩景观。1920×1080，36 秒，三段各 12 秒。
 * 设计预算：高层级图元 + 三套局部粒子；不以本案例验证高保真插画重绘。
 */
const GENERIC_SCENE = {
  format: 'canvas-cartoon-scene',
  formatVersion: 1,
  kind: 'generic',
  name: '雪花球 · 三季小景',
  w: 1920,
  h: 1080,
  loop: 36,
  bg: ['#16233e', '#0d3346', '#3b2021'],
  transparent: false,
  scenes: ['冬 · 暖屋雪夜', '夏 · 鱼缸布景', '秋 · 红杉落叶'],
  sceneBorders: [12, 24],
  images: [],
  fx: {
    segs: [
      [{ f: [0, 1], vignette: true, vignetteStrength: 0.18, vignetteColor: '#07101c' }],
      [{ f: [0, 1], vignette: true, vignetteStrength: 0.12, vignetteColor: '#082b38', saturation: 0.08 }],
      [{ f: [0, 1], vignette: true, vignetteStrength: 0.18, vignetteColor: '#291213', saturation: 0.08 }],
    ],
    transition: ['none', 'scan', 'scan'],
    transitionDur: [0.25, 0.8, 0.8],
    transitionColor: '#f2ead7',
  },

  // 舞台与玻璃球本体：三段共享，使“切换季节”读作同一容器里的换景。
  stage: {
    id: 'stage', z: -20, x: 0, y: 0,
    parts: [
      { type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#111827' },
      { type: 'rect', x: 0, y: 896, w: 1920, h: 184, fill: '#09101d' },
      { type: 'ellipse', x: 340, y: 788, w: 1240, h: 160, fill: '#050914', alpha: 0.52 },
    ],
  },
  winterAtmosphere: {
    id: 'winter-atmosphere', z: 1, x: 0, y: 0, show: [[[0, 1]], null, null],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [
      { type: 'rect', x: 430, y: 90, w: 1060, h: 760, fill: '#9ab9d0' },
      { type: 'ellipse', x: 620, y: 170, w: 190, h: 190, fill: '#e9f6ff', alpha: 0.78 },
      { type: 'poly', points: [[430,610],[610,360],[770,585],[925,330],[1110,594],[1310,398],[1490,620]], fill: '#5d7698' },
      { type: 'poly', points: [[430,680],[610,470],[770,660],[940,430],[1130,678],[1300,500],[1490,690]], fill: '#3c5677' },
      { type: 'poly', points: [[430,730],[690,650],[960,705],[1230,630],[1490,720],[1490,850],[430,850]], fill: '#dbeaf1' },
      { type: 'poly', points: [[430,760],[680,710],[940,755],[1170,700],[1490,770],[1490,850],[430,850]], fill: '#b7d3e3' },
    ],
  },
  winterForest: {
    id: 'winter-forest', z: 8, x: 0, y: 0, show: [[[0, 1]], null, null],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [
      { type: 'rect', x: 545, y: 505, w: 24, h: 265, fill: '#314254' },
      { type: 'poly', points: [[510,560],[557,340],[612,560]], fill: '#456477' },
      { type: 'poly', points: [[495,645],[557,400],[625,645]], fill: '#3c596d' },
      { type: 'poly', points: [[475,735],[557,475],[645,735]], fill: '#304b60' },
      { type: 'rect', x: 1374, y: 470, w: 22, h: 290, fill: '#314254' },
      { type: 'poly', points: [[1335,545],[1385,315],[1434,545]], fill: '#456477' },
      { type: 'poly', points: [[1320,635],[1385,370],[1450,635]], fill: '#3c596d' },
      { type: 'poly', points: [[1295,735],[1385,455],[1475,735]], fill: '#304b60' },
      { type: 'line', x: 485, y: 555, x2: 625, y2: 555, stroke: '#dbeaf1', strokeWidth: 10 },
      { type: 'line', x: 1316, y: 542, x2: 1453, y2: 542, stroke: '#dbeaf1', strokeWidth: 10 },
    ],
  },
  winterCabin: {
    id: 'winter-cabin', z: 18, x: 0, y: 0, show: [[[0, 1]], null, null],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    style: { shadow: { color: '#17253a', distance: 10, angle: 90 }, outline: { color: '#1d3043', width: 2 } },
    parts: [
      { type: 'rect', x: 805, y: 570, w: 320, h: 184, fill: '#6f4739', stroke: '#293044', strokeWidth: 8 },
      { type: 'poly', points: [[755,580],[965,412],[1175,580]], fill: '#4f3540', stroke: '#293044', strokeWidth: 8 },
      { type: 'poly', points: [[755,580],[965,430],[1175,580]], fill: '#e7eef0', alpha: 0.94 },
      { type: 'rect', x: 922, y: 628, w: 74, h: 126, fill: '#3b3040', stroke: '#293044', strokeWidth: 6 },
      { type: 'rect', x: 834, y: 620, w: 60, h: 58, fill: '#ffc96b', stroke: '#4a3540', strokeWidth: 6, anim: { blink: { period: 2100, duty: 0.78, on: 1, off: 0.55, phase: 0.1 } } },
      { type: 'rect', x: 1036, y: 620, w: 60, h: 58, fill: '#ffc96b', stroke: '#4a3540', strokeWidth: 6, anim: { blink: { period: 1800, duty: 0.72, on: 1, off: 0.5, phase: 0.48 } } },
      { type: 'rect', x: 1070, y: 450, w: 36, h: 102, fill: '#35435a', stroke: '#293044', strokeWidth: 6 },
      { type: 'ellipse', x: 1060, y: 390, w: 86, h: 76, fill: '#dceef5', alpha: 0.22, anim: { pulse: { period: 2.5, amp: 0.15 } } },
    ],
  },
  winterSnow: {
    id: 'winter-snow', z: 40, x: 490, y: 130, w: 940, h: 620, show: [[[0, 1]], null, null],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [{ type: 'rect', x: 0, y: 0, w: 9, h: 9, radius: 4, fill: '#f6fbff' }],
    particle: { count: 84, rate: 36, life: 5.6, speed: 58, dir: 92, spread: 28, wind: -12, size: 0.8, sizeJitter: 0.65, alpha: 0.84, fade: true, seed: 31 },
  },

  summerAtmosphere: {
    id: 'summer-atmosphere', z: 1, x: 0, y: 0, show: [null, [[0, 1]], null],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [
      { type: 'rect', x: 430, y: 90, w: 1060, h: 760, fill: '#1b738a' },
      { type: 'rect', x: 430, y: 90, w: 1060, h: 330, fill: '#74d5d4', alpha: 0.38 },
      { type: 'poly', points: [[430,710],[690,676],[980,722],[1240,690],[1490,728],[1490,850],[430,850]], fill: '#d7c27d' },
      { type: 'rect', x: 430, y: 760, w: 1060, h: 90, fill: '#a6825d', alpha: 0.48 },
      { type: 'line', x: 560, y: 245, x2: 940, y2: 245, stroke: '#c0fff0', strokeWidth: 9, alpha: 0.38 },
      { type: 'line', x: 1000, y: 330, x2: 1360, y2: 330, stroke: '#c0fff0', strokeWidth: 7, alpha: 0.24 },
    ],
  },
  summerAquarium: {
    id: 'summer-aquarium', z: 12, x: 0, y: 0, show: [null, [[0, 1]], null],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [
      { type: 'poly', points: [[600,745],[620,560],[665,640],[694,485],[718,748]], fill: '#267a72', stroke: '#174f58', strokeWidth: 6, anim: { wave: { period: 2.3, amp: 5 } } },
      { type: 'poly', points: [[1240,748],[1265,535],[1310,645],[1340,470],[1374,748]], fill: '#287d6e', stroke: '#174f58', strokeWidth: 6, anim: { wave: { period: 2.8, amp: 4 } } },
      { type: 'ellipse', x: 820, y: 530, w: 180, h: 84, fill: '#ffbd6b', stroke: '#75465c', strokeWidth: 8, anim: { bob: { amp: 18, period: 3.2, angle: 90 } } },
      { type: 'poly', points: [[992,572],[1068,516],[1068,626]], fill: '#ee6d64', stroke: '#75465c', strokeWidth: 8, anim: { bob: { amp: 18, period: 3.2, angle: 90 } } },
      { type: 'ellipse', x: 866, y: 553, w: 15, h: 15, fill: '#17243b' },
      { type: 'ellipse', x: 1095, y: 410, w: 126, h: 58, fill: '#bc6ee6', stroke: '#4c466e', strokeWidth: 7, anim: { bob: { amp: 13, period: 2.6, angle: 90 } } },
      { type: 'poly', points: [[1210,438],[1260,398],[1260,478]], fill: '#5a72c8', stroke: '#4c466e', strokeWidth: 7, anim: { bob: { amp: 13, period: 2.6, angle: 90 } } },
      { type: 'ellipse', x: 1132, y: 428, w: 12, h: 12, fill: '#17243b' },
    ],
  },
  summerBubbles: {
    id: 'summer-bubbles', z: 35, x: 600, y: 260, w: 720, h: 470, show: [null, [[0, 1]], null],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [{ type: 'ellipse', x: 0, y: 0, w: 14, h: 14, fill: null, stroke: '#d7fff7', strokeWidth: 4 }],
    particle: { count: 26, rate: 16, life: 4.2, speed: 43, dir: 272, spread: 18, wind: 6, size: 0.72, sizeJitter: 0.5, alpha: 0.72, fade: true, seed: 57 },
  },

  autumnAtmosphere: {
    id: 'autumn-atmosphere', z: 1, x: 0, y: 0, show: [null, null, [[0, 1]]],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [
      { type: 'rect', x: 430, y: 90, w: 1060, h: 760, fill: '#d87d4a' },
      { type: 'ellipse', x: 1090, y: 170, w: 230, h: 230, fill: '#ffd38a', alpha: 0.68 },
      { type: 'poly', points: [[430,670],[640,530],[820,670],[1050,480],[1220,660],[1490,510],[1490,850],[430,850]], fill: '#8c3c36' },
      { type: 'poly', points: [[430,760],[730,690],[970,745],[1210,675],[1490,770],[1490,850],[430,850]], fill: '#583331' },
    ],
  },
  autumnRedwoods: {
    id: 'autumn-redwoods', z: 16, x: 0, y: 0, show: [null, null, [[0, 1]]],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [
      { type: 'rect', x: 600, y: 325, w: 66, h: 460, fill: '#4a292b', stroke: '#2a202a', strokeWidth: 8 },
      { type: 'rect', x: 1250, y: 250, w: 78, h: 540, fill: '#45282a', stroke: '#2a202a', strokeWidth: 8 },
      { type: 'poly', points: [[485,530],[590,260],[730,360],[785,565]], fill: '#972f31' },
      { type: 'poly', points: [[540,430],[650,175],[810,340],[850,520]], fill: '#c54935' },
      { type: 'poly', points: [[1120,480],[1260,150],[1445,320],[1480,570]], fill: '#8e2d31' },
      { type: 'poly', points: [[1190,400],[1330,115],[1490,280],[1490,500]], fill: '#c84935' },
      { type: 'line', x: 630, y: 350, x2: 630, y2: 760, stroke: '#d88b55', strokeWidth: 8, alpha: 0.52 },
      { type: 'line', x: 1290, y: 275, x2: 1290, y2: 770, stroke: '#d88b55', strokeWidth: 9, alpha: 0.5 },
    ],
  },
  autumnLeaves: {
    id: 'autumn-leaves', z: 42, x: 515, y: 160, w: 890, h: 580, show: [null, null, [[0, 1]]],
    mask: { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760 },
    parts: [{ type: 'poly', points: [[0,0],[16,7],[5,17]], fill: '#f2b34e', stroke: '#8c3431', strokeWidth: 2 }],
    particle: { count: 62, rate: 28, life: 5.2, speed: 74, dir: 103, spread: 42, wind: 26, gravity: 8, spin: 125, size: 1, sizeJitter: 0.72, alpha: 0.88, fade: true, seed: 83 },
  },

  glassAndBase: {
    id: 'glass-and-base', z: 100, x: 0, y: 0,
    parts: [
      { type: 'ellipse', x: 430, y: 90, w: 1060, h: 760, fill: null, stroke: '#e3f6ff', strokeWidth: 20, alpha: 0.86 },
      { type: 'ellipse', x: 454, y: 115, w: 1012, h: 711, fill: null, stroke: '#79aebf', strokeWidth: 7, alpha: 0.58 },
      { type: 'ellipse', x: 520, y: 172, w: 190, h: 420, fill: null, stroke: '#ffffff', strokeWidth: 18, alpha: 0.18 },
      { type: 'poly', points: [[610,790],[1310,790],[1480,972],[440,972]], fill: '#2e354a', stroke: '#111727', strokeWidth: 12 },
      { type: 'poly', points: [[515,968],[1405,968],[1510,1035],[410,1035]], fill: '#1b2033', stroke: '#0b0e18', strokeWidth: 12 },
      { type: 'line', x: 565, y: 930, x2: 1352, y2: 930, stroke: '#6e7588', strokeWidth: 8, alpha: 0.6 },
      { type: 'rect', x: 824, y: 868, w: 274, h: 62, radius: 12, fill: '#d7be84', stroke: '#101426', strokeWidth: 8 },
      { type: 'rect', x: 844, y: 885, w: 234, h: 28, radius: 5, fill: '#5e4b46' },
    ],
  },
};
