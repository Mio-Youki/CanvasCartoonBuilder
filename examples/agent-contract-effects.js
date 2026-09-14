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
  images: [{
    id: 'sample-motion-chip', name: '采样运动夹具', z: 2, x: 8, y: 8, w: 16, h: 16, pixelDiv: 2,
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQ9AAAAABJRU5ErkJggg==',
    style: { samplingMotion: { show: [[[0, 1]], [[0.2, 0.8]]], field: { type: 'wave', scale: 48, speed: 1, angle: 20, period: 4, steps: 24, seed: 1 }, edge: { mode: 'alpha', width: 3, strength: 1 }, thresholdPulse: { threshold: 128, period: 2, steps: 8, amount: 24, dark: '#182033', light: '#e8dbc3' }, ditherDrift: { cell: 5, period: 3, steps: 8, direction: 'diagonal', dark: '#182033', light: '#e8dbc3' }, grainTide: { amount: .65, coarseness: 5, targets: 'combined' } } },
  }],
  fx: { segs: [[{ f: [0, 1] }], [{ f: [0, 1], vignette: true, vignetteStrength: 0.4 }]], transition: ['none', 'dissolve'], transitionDur: [0.25, 0.35], transitionColor: '#03060f' },
  rain: {
    id: 'rain-main',
    z: 20,
    show: [null, [[0, 1]]],
    parts: [{ type: 'line', x: 0, y: 0, x2: -2, y2: 8, stroke: '#9bbbe8', strokeWidth: 1 }],
    particle: { count: 45, rate: 45, life: 0.9, speed: 100, dir: 100, spread: 8, wind: -14, alpha: 0.65, fade: true, seed: 7 },
  },
};
