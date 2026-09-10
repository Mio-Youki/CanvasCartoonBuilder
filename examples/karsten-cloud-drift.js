/*
 * Patcharium / 拼好景 · 案例 02（语义分层试验）
 * 参考照片不会以完整图片直接显示：Agent 将它拆成连续远景底板、
 * 透明前景（山脊 + 旅人）与透明云层；三层可独立变换、调色和替换。
 */
const GENERIC_SCENE = {
  format: 'canvas-cartoon-scene', formatVersion: 1, kind: 'generic',
  name: '山脊旅人 · 分层风穿过山谷',
  w: 640, h: 960, loop: 24, bg: '#182234', transparent: false,
  scenes: ['金色山脊'],

  // 远景只包含天空、山体和连续谷地；下方的山脊与旅人被明确挖空。
  images: [
    {
      id: 'karsten-backdrop', name: '远景底板 · 天空与山谷', role: 'background',
      src: 'examples/assets/karsten-layer-backdrop.png', x: 0, y: 0, w: 640, h: 960,
      z: -100, layout: 'stretch', show: [[[0, 1]]],
    },
    {
      id: 'karsten-clouds', name: '透明云层 · 缓慢漂移',
      src: 'examples/assets/karsten-layer-clouds.png', x: 0, y: 0, w: 640, h: 960,
      z: -20, alpha: .42, blend: 'screen', show: [[[0, 1]]],
      pixelDiv: 2,
      anim: { bob: { amp: 7, period: 18, angle: 0 } },
      // 波带位移不移动整张云图，而是让不同水平带以不同相位缓慢横移。
      // 采样闪变只移动再像素化的采样格；seed 使预览、测试和逐帧导出可复现。
      style: {
        bandWave: { amp: 3, period: 9, band: 18, cycles: 1.3 },
        sampleJitter: { rate: 3, amount: 1, mode: 'step', seed: 17 },
      },
    },
    {
      id: 'karsten-foreground', name: '前景 · 山脊与旅人',
      src: 'examples/assets/karsten-layer-foreground.png', x: 0, y: 0, w: 640, h: 960,
      z: 20, show: [[[0, 1]]],
    },
  ],

  fx: {
    segs: [[{ f: [0, 1], vignette: true, vignetteStrength: .1, vignetteColor: '#152137' }]], transition: 'none',
    layers: [{
      id: 'valley-air', name: '谷地空气', alpha: .13, color: '#9ec6cf', colorOn: true, blend: 'screen',
      fog: true, fogColor: '#c6e1dd', fogBands: 3, fogScale: 54, fogDrift: 2,
      show: [[[0, 1]]],
      // 锚定前景只为获得可管理的局部 FX 归属；anchor 不会把雾裁进山脊 Alpha。
      bind: { targetId: 'karsten-foreground', mode: 'anchor' },
      // 只施加在中远景谷地，不覆盖透明前景的山脊与旅人。
      mask: { type: 'poly', points: [[0,425],[82,392],[166,408],[243,375],[326,401],[410,383],[505,406],[640,365],[640,690],[565,650],[482,624],[380,652],[280,626],[180,660],[70,640],[0,680]] },
    }],
  },

  grassWind: {
    id: 'grass-wind', name: '前景草尖 · 风感', z: 25,
    x: 0, y: 560, w: 640, h: 400, blend: 'lighter', show: [[[0, 1]]],
    params: { strength: .5, color: '#f4c56d' },
    editor: { controls: [{ path: 'params.strength', label: '草风强度', min: 0, max: 1, step: .05 }] },
    program: { code: `
      const p=el.params||{},a=helpers.clamp(p.strength == null ? .5 : p.strength,0,1),phase=t*1.3;ctx.strokeStyle=helpers.rgba(p.color||'#f4c56d',a*.28);ctx.lineWidth=1;
      for(let i=0;i<115;i++){const x=(helpers.noise(i*8.7)*640)|0,y=680+helpers.noise(i*19.2)*270,len=4+(i%8),bend=Math.sin(phase+i*.7)*a*5;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+bend,y-len*.5,x+bend*1.4,y-len);ctx.stroke();}
    ` },
  },
};
