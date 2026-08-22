const GENERIC_SCENE = {
  format: 'canvas-cartoon-scene',
  formatVersion: 1,
  kind: 'generic',
  name: '河谷松林 · 混合底图两幕',
  w: 360,
  h: 240,
  loop: 8,
  bg: ['#dceff1', '#07162c'],
  transparent: false,
  scenes: ['河谷白昼', '月下河湾'],
  sceneBorders: [4],
  fx: {
    segs: [[{ f: [0, 1] }], [{ f: [0, 1], vignette: true, vignetteStrength: 0.2 }]],
    transition: ['none', 'dissolve'], transitionDur: [0.25, 0.55], transitionColor: '#071020',
  },
  images: [
    {
      id: 'river-valley-day', name: '白天静态底图', role: 'background', z: -1000,
      src: 'examples/assets/river-valley-day.jpg', x: 0, y: 0, w: 360, h: 240,
      layout: 'stretch', anchor: 'center', alpha: 1, show: [[[0, 1]], null],
    },
    {
      id: 'river-valley-night', name: '夜晚静态底图', role: 'background', z: -999,
      src: 'examples/assets/river-valley-night-v1.png', x: 0, y: 0, w: 360, h: 240,
      layout: 'stretch', anchor: 'center', alpha: 1, show: [null, [[0, 1]]],
    },
  ],

  dayRiverGlints: {
    z: 10, show: [[[0, 1]], null], partsBand: true, speed: 7, span: 360,
    parts: [
      { type: 'rect', x: 15, y: 125, w: 22, h: 1, fill: 'rgba(247,255,249,.64)' },
      { type: 'rect', x: 63, y: 139, w: 16, h: 1, fill: 'rgba(247,255,249,.55)' },
      { type: 'rect', x: 102, y: 116, w: 29, h: 1, fill: 'rgba(247,255,249,.6)' },
      { type: 'rect', x: 149, y: 137, w: 36, h: 1, fill: 'rgba(247,255,249,.52)' },
      { type: 'rect', x: 209, y: 119, w: 31, h: 1, fill: 'rgba(247,255,249,.6)' },
      { type: 'rect', x: 256, y: 137, w: 25, h: 1, fill: 'rgba(247,255,249,.54)' },
      { type: 'rect', x: 307, y: 128, w: 23, h: 1, fill: 'rgba(247,255,249,.56)' },
    ],
  },
  dayWaterSparkle: {
    z: 11, show: [[[0, 1]], null],
    parts: [
      { type: 'rect', x: 82, y: 131, w: 3, h: 1, fill: '#ffffff', anim: { blink: { period: 1700, duty: 0.38, on: 1, off: 0.2, phase: 0.1 } } },
      { type: 'rect', x: 192, y: 130, w: 2, h: 1, fill: '#ffffff', anim: { blink: { period: 2100, duty: 0.32, on: 1, off: 0.15, phase: 0.5 } } },
      { type: 'rect', x: 276, y: 143, w: 3, h: 1, fill: '#ffffff', anim: { blink: { period: 1900, duty: 0.35, on: 1, off: 0.2, phase: 0.75 } } },
    ],
  },
  nightWaterGlints: {
    z: 10, show: [null, [[0, 1]]], partsBand: true, speed: 4, span: 360,
    parts: [
      { type: 'rect', x: 50, y: 135, w: 15, h: 1, fill: 'rgba(149,204,244,.34)' },
      { type: 'rect', x: 91, y: 142, w: 21, h: 1, fill: 'rgba(161,215,249,.38)' },
      { type: 'rect', x: 153, y: 132, w: 28, h: 1, fill: 'rgba(149,204,244,.35)' },
      { type: 'rect', x: 222, y: 145, w: 18, h: 1, fill: 'rgba(161,215,249,.34)' },
      { type: 'rect', x: 281, y: 133, w: 25, h: 1, fill: 'rgba(149,204,244,.35)' },
    ],
  },
  nightDistantStars: {
    z: 12, show: [null, [[0, 1]]],
    parts: [
      { type: 'rect', x: 20, y: 18, w: 1, h: 1, fill: '#bcd9ee', anim: { blink: { period: 2100, duty: 0.45, on: 1, off: 0.18 } } },
      { type: 'rect', x: 116, y: 29, w: 1, h: 1, fill: '#bcd9ee', anim: { blink: { period: 1700, duty: 0.4, on: 1, off: 0.2, phase: 0.3 } } },
      { type: 'rect', x: 200, y: 20, w: 1, h: 1, fill: '#d4e9f5', anim: { blink: { period: 2300, duty: 0.35, on: 1, off: 0.15, phase: 0.6 } } },
      { type: 'rect', x: 322, y: 30, w: 1, h: 1, fill: '#bcd9ee', anim: { blink: { period: 1900, duty: 0.4, on: 1, off: 0.2, phase: 0.9 } } },
    ],
  },
  nightFireflies: {
    z: 13, show: [null, [[0, 1]]], x: 140, y: 162, w: 85, h: 42,
    parts: [{ type: 'rect', x: 0, y: 0, w: 1, h: 1, fill: '#d5d47b' }],
    particle: { count: 8, rate: 2, life: 3.5, speed: 5, dir: 270, spread: 120, wind: 2, alpha: 0.65, fade: true, seed: 27 },
  },
};
