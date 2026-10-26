// Shared real-Player workload; used by short and interleaved performance tests.
window.createGpuPlayerFixture = function (photo, w, h, mode = 'dual-mask') {
  const entities = [{ id: 'photo', type: 'image', assetId: 'photo', x: 0, y: 0, w, h, alpha: .85,
    anim: { bob: { amount: 6, period: 2, angle: 0 } } }];
  for (let i = 0; i < 8; i++) entities.push({ id: `shape-${i}`, type: 'rect', x: w * (.05 + i * .1),
    y: h * (.15 + i % 3 * .2), w: w * .05, h: h * .08, fill: i % 2 ? '#d46153' : '#eac67a', alpha: .65,
    anim: { bob: { amount: 5, period: 2 + i * .2, angle: 90 } } });
  if (mode !== 'single') entities.push({ id: 'range', type: 'ellipse', x: w * .15, y: h * .14,
    w: w * .58, h: h * .7, fill: '#fff', anim: { bob: { amount: w * .01, period: 2, angle: 0 } } });
  return { format: 'tosampool-scene/v4', width: w, height: h, loop: 8,
    background: { color: '#142536', alpha: 1 }, assets: { photo: { image: photo } }, entities,
    ...(mode === 'dual-mask' ? { timeline: { scenes: [
      { id: 'a', f: [0, .5], background: { color: '#142536', alpha: 1 } },
      { id: 'b', f: [.5, 1], background: { color: '#5b343e', alpha: 1 }, transition: { type: 'fade', duration: 2 } }
    ] } } : {}),
    sceneEffects: { sample: { controllers: { 'sampling-grid': { size: 3 } },
      'uneven-sampling': { enabled: true, amount: .85, coarseness: 5,
        field: { enabled: true, type: 'wave', scale: 63, contrast: .8, seed: 5 },
        motion: { enabled: true, type: 'uneven-motion', period: 3, steps: 24, flowSpeed: 1, tideAmount: .2 },
        ...(mode !== 'single' ? { mask: { type: 'element', targetId: 'range' } } : {}) } } } };
};
