/*
 * 参考图重绘练习：河谷松林 · 两幕循环
 * 可由 tools/img2asset.html 直接打开；所有可见内容均为当前 Runtime 支持的纯 parts。
 */
const GENERIC_SCENE = {
  format: 'canvas-cartoon-scene',
  formatVersion: 1,
  kind: 'generic',
  name: '河谷松林 · 白昼与夜幕',
  w: 320,
  h: 180,
  loop: 8,
  bg: ['#d9eef2', '#08142b'],
  transparent: false,
  scenes: ['河谷白昼', '月下河湾'],
  sceneBorders: [4],
  images: [],
  fx: {
    segs: [[{ f: [0, 1] }], [{ f: [0, 1], vignette: true, vignetteStrength: 0.28 }]],
    transition: ['none', 'dissolve'], transitionDur: [0.25, 0.55], transitionColor: '#071020',
  },

  dayClouds: {
    z: 1, show: [[[0, 1]], null],
    parts: [
      { type: 'ellipse', x: 12, y: 10, w: 56, h: 11, fill: '#f7ffff' },
      { type: 'ellipse', x: 36, y: 4, w: 52, h: 16, fill: '#f7ffff' },
      { type: 'ellipse', x: 188, y: 17, w: 68, h: 12, fill: '#f7ffff' },
      { type: 'ellipse', x: 224, y: 8, w: 50, h: 16, fill: '#f7ffff' },
    ], anim: { bob: { amp: 1, period: 1.2, angle: 90 } },
  },
  dayMountains: {
    z: 2, show: [[[0, 1]], null],
    parts: [
      { type: 'poly', points: [[0,68],[43,18],[92,68]], fill: '#b7bac5' },
      { type: 'poly', points: [[47,62],[83,35],[120,67]], fill: '#aaaeba' },
      { type: 'poly', points: [[145,69],[189,44],[221,69]], fill: '#b7bac5' },
      { type: 'poly', points: [[205,70],[258,9],[320,69]], fill: '#a8aab7' },
      { type: 'poly', points: [[250,19],[258,9],[269,23]], fill: '#e6edf0' },
      { type: 'poly', points: [[35,28],[43,18],[52,30]], fill: '#e8f0ee' },
    ],
  },
  dayHills: {
    z: 3, show: [[[0, 1]], null],
    parts: [
      { type: 'poly', points: [[0,67],[43,63],[74,70],[112,56],[156,70],[195,54],[232,68],[278,50],[320,63],[320,100],[0,100]], fill: '#68766c' },
      { type: 'poly', points: [[0,79],[43,70],[84,82],[116,69],[156,79],[202,67],[246,83],[286,63],[320,75],[320,104],[0,104]], fill: '#4f625a' },
      { type: 'rect', x: 12, y: 70, w: 46, h: 4, fill: '#a99b70' },
      { type: 'rect', x: 267, y: 56, w: 47, h: 5, fill: '#a99b70' },
    ],
  },
  dayRiver: {
    z: 4, show: [[[0, 1]], null],
    parts: [
      { type: 'poly', points: [[0,94],[78,91],[123,84],[202,88],[253,93],[320,95],[320,132],[0,129]], fill: '#bcdce2' },
      { type: 'poly', points: [[0,104],[78,101],[123,93],[202,97],[253,102],[320,103],[320,132],[0,129]], fill: '#cae8ea' },
      { type: 'line', x: 0, y: 94, x2: 320, y2: 96, stroke: '#768f9b', strokeWidth: 2 },
    ],
  },
  dayRiverGlints: {
    z: 5, show: [[[0, 1]], null], partsBand: true, speed: 9, span: 320,
    parts: [
      { type: 'rect', x: 18, y: 106, w: 28, h: 2, fill: '#efffff' },
      { type: 'rect', x: 77, y: 116, w: 17, h: 2, fill: '#e9ffff' },
      { type: 'rect', x: 137, y: 101, w: 39, h: 2, fill: '#f6ffff' },
      { type: 'rect', x: 226, y: 119, w: 26, h: 2, fill: '#ecffff' },
      { type: 'rect', x: 280, y: 108, w: 21, h: 2, fill: '#f6ffff' },
    ],
  },
  dayBanks: {
    z: 6, show: [[[0, 1]], null],
    parts: [
      { type: 'poly', points: [[0,76],[52,74],[91,85],[121,89],[104,104],[0,99]], fill: '#564b4a' },
      { type: 'poly', points: [[0,71],[45,70],[81,78],[110,84],[98,91],[0,88]], fill: '#8e8064' },
      { type: 'poly', points: [[214,75],[265,70],[320,73],[320,102],[260,97]], fill: '#55464a' },
      { type: 'poly', points: [[221,70],[268,61],[320,63],[320,84],[269,82]], fill: '#8f7d61' },
      { type: 'poly', points: [[126,117],[320,116],[320,180],[92,180]], fill: '#a79a72' },
      { type: 'poly', points: [[247,123],[274,113],[287,119],[274,128]], fill: '#4b4141' },
      { type: 'poly', points: [[218,150],[241,134],[260,145],[273,173],[248,180],[228,165]], fill: '#51454a' },
      { type: 'line', x: 236, y: 151, x2: 267, y2: 171, stroke: '#7b6a5d', strokeWidth: 2 },
    ],
  },
  dayPines: {
    z: 8, show: [[[0, 1]], null],
    parts: [
      { type: 'rect', x: 20, y: 121, w: 5, h: 55, fill: '#4a3431' },
      { type: 'poly', points: [[2,145],[22,87],[43,145]], fill: '#293f39' },
      { type: 'poly', points: [[0,157],[22,105],[49,157]], fill: '#243a35' },
      { type: 'rect', x: 61, y: 136, w: 4, h: 38, fill: '#4a3431' },
      { type: 'poly', points: [[44,151],[63,111],[84,151]], fill: '#31463d' },
      { type: 'poly', points: [[40,162],[63,123],[89,162]], fill: '#263c36' },
      { type: 'rect', x: 91, y: 141, w: 4, h: 34, fill: '#4a3431' },
      { type: 'poly', points: [[73,157],[93,116],[116,157]], fill: '#30483e' },
      { type: 'poly', points: [[69,169],[93,128],[120,169]], fill: '#253c36' },
      { type: 'rect', x: 111, y: 133, w: 5, h: 45, fill: '#4a3431' },
      { type: 'poly', points: [[90,151],[113,100],[139,151]], fill: '#31473e' },
      { type: 'poly', points: [[87,165],[113,112],[145,165]], fill: '#243b35' },
    ],
  },
  dayLeafSway: {
    z: 9, show: [[[0, 1]], null],
    parts: [
      { type: 'poly', points: [[97,142],[113,100],[129,142]], fill: '#425d4c', anim: { bob: { amp: 1, period: 0.36, angle: 90 } } },
      { type: 'poly', points: [[7,143],[22,96],[36,143]], fill: '#405b4b', anim: { bob: { amp: 1, period: 0.48, angle: 90 } } },
      { type: 'poly', points: [[47,153],[63,116],[78,153]], fill: '#46614f', anim: { bob: { amp: 1, period: 0.42, angle: 90 } } },
    ],
  },

  nightSky: {
    z: 1, show: [null, [[0, 1]]],
    parts: [
      { type: 'ellipse', x: 238, y: 20, w: 22, h: 22, fill: '#e8edcf' },
      { type: 'rect', x: 22, y: 27, w: 2, h: 2, fill: '#d9e5ff' },
      { type: 'rect', x: 74, y: 16, w: 2, h: 2, fill: '#d9e5ff' },
      { type: 'rect', x: 130, y: 35, w: 2, h: 2, fill: '#d9e5ff' },
      { type: 'rect', x: 194, y: 19, w: 2, h: 2, fill: '#d9e5ff' },
      { type: 'rect', x: 294, y: 41, w: 2, h: 2, fill: '#d9e5ff' },
    ],
  },
  nightValley: {
    z: 2, show: [null, [[0, 1]]],
    parts: [
      { type: 'poly', points: [[0,72],[43,20],[92,72]], fill: '#26344e' },
      { type: 'poly', points: [[47,65],[83,37],[120,70]], fill: '#202d46' },
      { type: 'poly', points: [[145,70],[189,43],[221,70]], fill: '#26344e' },
      { type: 'poly', points: [[205,71],[258,11],[320,71]], fill: '#222e48' },
      { type: 'poly', points: [[0,83],[59,68],[109,82],[158,67],[215,84],[272,62],[320,78],[320,108],[0,108]], fill: '#1b302f' },
      { type: 'poly', points: [[0,95],[80,90],[123,85],[205,89],[257,94],[320,96],[320,133],[0,130]], fill: '#355a70' },
      { type: 'poly', points: [[126,117],[320,116],[320,180],[92,180]], fill: '#394251' },
      { type: 'poly', points: [[0,77],[51,75],[95,87],[119,91],[102,105],[0,100]], fill: '#263137' },
      { type: 'poly', points: [[214,76],[270,69],[320,74],[320,102],[259,97]], fill: '#283036' },
    ],
  },
  nightWaterGlints: {
    z: 4, show: [null, [[0, 1]]], partsBand: true, speed: 7, span: 320,
    parts: [
      { type: 'rect', x: 18, y: 106, w: 25, h: 2, fill: '#b9d9e6' },
      { type: 'rect', x: 89, y: 118, w: 19, h: 2, fill: '#97c4d8' },
      { type: 'rect', x: 151, y: 102, w: 48, h: 2, fill: '#d8edf0' },
      { type: 'rect', x: 239, y: 116, w: 28, h: 2, fill: '#a9d0dc' },
    ],
  },
  nightPines: {
    z: 8, show: [null, [[0, 1]]],
    parts: [
      { type: 'rect', x: 20, y: 121, w: 5, h: 55, fill: '#1a2029' },
      { type: 'poly', points: [[2,145],[22,87],[43,145]], fill: '#172b2b' },
      { type: 'poly', points: [[0,157],[22,105],[49,157]], fill: '#142625' },
      { type: 'rect', x: 61, y: 136, w: 4, h: 38, fill: '#1a2029' },
      { type: 'poly', points: [[44,151],[63,111],[84,151]], fill: '#1a3030' },
      { type: 'poly', points: [[40,162],[63,123],[89,162]], fill: '#142625' },
      { type: 'rect', x: 91, y: 141, w: 4, h: 34, fill: '#1a2029' },
      { type: 'poly', points: [[73,157],[93,116],[116,157]], fill: '#1b3130' },
      { type: 'poly', points: [[69,169],[93,128],[120,169]], fill: '#142625' },
      { type: 'rect', x: 111, y: 133, w: 5, h: 45, fill: '#1a2029' },
      { type: 'poly', points: [[90,151],[113,100],[139,151]], fill: '#1d3330' },
      { type: 'poly', points: [[87,165],[113,112],[145,165]], fill: '#142625' },
    ],
  },
  nightFireflies: {
    z: 10, show: [null, [[0, 1]]],
    parts: [
      { type: 'rect', x: 0, y: 0, w: 2, h: 2, fill: '#f5e891' },
    ],
    particle: { count: 18, rate: 6, life: 4, speed: 7, dir: 270, spread: 120, wind: 4, alpha: 0.85, fade: true, seed: 18 },
  },
};
