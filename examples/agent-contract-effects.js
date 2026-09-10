/* Agent contract fixture: scenes + show + particle + built-in transition. */
const GENERIC_SCENE = {
  format: 'canvas-cartoon-scene',
  formatVersion: 1,
  kind: 'generic',
  name: 'Agent 合同 · 时段与粒子',
  w: 320,
  h: 180,
  loop: 6,
  bg: ['#10131d', '#081226'],
  transparent: false,
  scenes: ['静夜', '微雨'],
  sceneBorders: [3],
  images: [],
  fx: { segs: [[{ f: [0, 1] }], [{ f: [0, 1], vignette: true, vignetteStrength: 0.4 }]], transition: ['none', 'dissolve'], transitionDur: [0.25, 0.35], transitionColor: '#03060f' },
  rain: {
    id: 'rain-main',
    z: 20,
    show: [null, [[0, 1]]],
    parts: [{ type: 'line', x: 0, y: 0, x2: -2, y2: 8, stroke: '#9bbbe8', strokeWidth: 1 }],
    particle: { count: 45, rate: 45, life: 0.9, speed: 100, dir: 100, spread: 8, wind: -14, alpha: 0.65, fade: true, seed: 7 },
  },
};
