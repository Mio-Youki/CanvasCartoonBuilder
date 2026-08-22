/* Agent contract fixture: pure vector, single scene. Open → save → reopen must preserve it. */
const GENERIC_SCENE = {
  format: 'canvas-cartoon-scene',
  formatVersion: 1,
  kind: 'generic',
  name: 'Agent 合同 · 基础图元',
  w: 320,
  h: 180,
  loop: 4,
  bg: '#10131d',
  transparent: false,
  scenes: ['夜景'],
  images: [],
  fx: { segs: [[{ f: [0, 1] }]], transition: 'none', transitionDur: 0.25, transitionColor: '#03060f' },
  lantern: {
    z: 10, x: 136, y: 58,
    parts: [
      { type: 'rect', x: 0, y: 8, w: 48, h: 68, fill: '#26385a', stroke: '#0b1026', strokeWidth: 2 },
      { type: 'rect', x: 8, y: 18, w: 32, h: 38, fill: '#ffd66c' },
      { type: 'line', x: 24, y: 0, x2: 24, y2: 8, stroke: '#9bb4d8', strokeWidth: 2 },
    ],
  },
};
