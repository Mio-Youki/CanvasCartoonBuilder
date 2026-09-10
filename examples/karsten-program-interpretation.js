/* Patcharium / 拼好景 · 案例 02（重绘版）：单图参考 → 自生成程序小景。 */
const GENERIC_SCENE = {
  format: 'canvas-cartoon-scene', formatVersion: 1, kind: 'generic',
  name: '山脊旅人 · 气象观测站', w: 640, h: 960, loop: 24,
  bg: '#111725', transparent: false, scenes: ['风经过山脊'],
  fx: { segs: [[{ f: [0, 1], vignette: true, vignetteStrength: .18, vignetteColor: '#0b1020' }]], transition: 'none' },

  weatherSky: {
    id: 'weather-sky', name: '气象天空', z: 0, x: 0, y: 0, w: 640, h: 520, show: [[[0, 1]]],
    params: { cloudSpeed: 10, dusk: .65, grain: .28 },
    editor: { controls: [{ path: 'params.cloudSpeed', label: '云速', min: 0, max: 24, step: 1 }, { path: 'params.dusk', label: '暮色', min: 0, max: 1, step: .05 }, { path: 'params.grain', label: '天空颗粒', min: 0, max: 1, step: .05 }] },
    program: { code: `
      const x=el.x,y=el.y,w=el.w,h=el.h,p=el.params||{},d=helpers.clamp(p.dusk == null ? .65 : p.dusk,0,1);
      const top=[20+40*d,35+20*d,66+20*d],bottom=[119+55*d,132+38*d,146+8*d];
      for(let yy=0;yy<h;yy+=4){const q=yy/h,r=top[0]*(1-q)+bottom[0]*q,g=top[1]*(1-q)+bottom[1]*q,b=top[2]*(1-q)+bottom[2]*q;ctx.fillStyle='rgb('+r+' '+g+' '+b+')';ctx.fillRect(x,y+yy,w,4);}
      const grain=helpers.clamp(p.grain == null ? .28 : p.grain,0,1);ctx.fillStyle='rgba(236,211,173,'+(grain*.23)+')';
      for(let i=0;i<380;i++){const px=x+helpers.noise(i*7.1)*w,py=y+helpers.noise(i*13.7)*h*.76;ctx.fillRect(px|0,py|0,(i%5?1:2),1);}
      const speed=p.cloudSpeed==null?10:p.cloudSpeed,drift=(t*speed)%760;
      for(let bank=0;bank<2;bank++){const by=y+80+bank*116,alpha=bank?'.17':'.25';ctx.fillStyle='rgba(231,222,202,'+alpha+')';for(let i=-2;i<7;i++){const bx=x+i*145-drift*(bank?1:.58);ctx.beginPath();ctx.ellipse(bx+38,by+22,62,13,0,0,Math.PI*2);ctx.ellipse(bx+82,by+8,47,19,0,0,Math.PI*2);ctx.ellipse(bx+124,by+27,69,12,0,0,Math.PI*2);ctx.fill();}}
      ctx.fillStyle='rgba(255,191,125,'+(.16+d*.16)+')';ctx.fillRect(x,y+h*.56,w,8);
    ` },
  },

  distantRidges: {
    id: 'distant-ridges', name: '远山地貌', z: 3, x: 0, y: 270, w: 640, h: 390, show: [[[0, 1]]],
    params: { haze: .42, snow: .55 },
    editor: { controls: [{ path: 'params.haze', label: '空气透视', min: 0, max: 1, step: .05 }, { path: 'params.snow', label: '高光积雪', min: 0, max: 1, step: .05 }] },
    program: { code: `
      const x=el.x,y=el.y,w=el.w,h=el.h,p=el.params||{},snow=helpers.clamp(p.snow == null ? .55 : p.snow,0,1),haze=helpers.clamp(p.haze == null ? .42 : p.haze,0,1);
      const mountain=(pts,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y+h);for(const pt of pts)ctx.lineTo(x+pt[0],y+pt[1]);ctx.lineTo(x+w,y+h);ctx.closePath();ctx.fill();};
      mountain([[0,220],[55,168],[104,191],[166,125],[214,205],[272,178],[332,89],[391,170],[454,148],[520,190],[590,124],[640,162]],'rgba(55,82,99,'+(1-haze*.32)+')');
      mountain([[0,276],[72,201],[146,239],[221,146],[285,258],[363,192],[433,228],[507,159],[571,231],[640,184]],'#213845');
      ctx.strokeStyle='rgba(224,231,221,'+snow+')';ctx.lineWidth=3;ctx.lineJoin='bevel';ctx.beginPath();ctx.moveTo(x+166,y+125);ctx.lineTo(x+144,y+171);ctx.lineTo(x+123,y+181);ctx.moveTo(x+332,y+89);ctx.lineTo(x+307,y+158);ctx.lineTo(x+284,y+171);ctx.moveTo(x+507,y+159);ctx.lineTo(x+482,y+200);ctx.stroke();
      ctx.fillStyle='rgba(175,205,198,'+haze*.28+')';for(let i=0;i<130;i++){const px=x+helpers.noise(i*5.7)*w,py=y+190+helpers.noise(i*9.2)*160;ctx.fillRect(px|0,py|0,2,1);}
    ` },
  },

  ridgeStation: {
    id: 'ridge-station', name: '山脊观测站与旅人', z: 8, x: 0, y: 500, w: 640, h: 460, show: [[[0, 1]]],
    params: { lamp: 1, scarfWind: 1, groundTone: '#162c31' },
    editor: { controls: [{ path: 'params.lamp', label: '信号灯', min: 0, max: 1, step: .05 }, { path: 'params.scarfWind', label: '围巾风力', min: 0, max: 2, step: .05 }] },
    program: { code: `
      const x=el.x,y=el.y,w=el.w,h=el.h,p=el.params||{},lamp=helpers.clamp(p.lamp==null?1:p.lamp,0,1);
      ctx.fillStyle=p.groundTone||'#162c31';ctx.beginPath();ctx.moveTo(x,y+212);ctx.lineTo(x+72,y+150);ctx.lineTo(x+160,y+178);ctx.lineTo(x+236,y+119);ctx.lineTo(x+334,y+173);ctx.lineTo(x+428,y+92);ctx.lineTo(x+528,y+151);ctx.lineTo(x+w,y+111);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();
      ctx.fillStyle='#0b1c22';for(let i=0;i<120;i++){const px=x+helpers.noise(i*3.4)*w,py=y+160+helpers.noise(i*8.3)*(h-140),hh=3+(i%9);ctx.fillRect(px|0,py|0,2,hh);}
      const cx=x+330,cy=y+176;ctx.fillStyle='#0c151b';ctx.fillRect(cx-4,cy-50,8,52);ctx.fillRect(cx-20,cy-47,40,4);ctx.fillStyle='rgba(255,207,119,'+(lamp*.92)+')';ctx.fillRect(cx-3,cy-45,6,6);ctx.fillStyle='rgba(255,186,96,'+(lamp*.13)+')';ctx.beginPath();ctx.arc(cx,cy-42,48+Math.sin(t*2)*5,0,Math.PI*2);ctx.fill();
      const px=x+275,py=y+193;ctx.fillStyle='#10151b';ctx.fillRect(px-7,py-33,14,30);ctx.fillRect(px-11,py-48,22,17);ctx.fillRect(px-8,py-56,16,10);ctx.fillStyle='#c6554d';ctx.beginPath();ctx.moveTo(px+7,py-31);ctx.lineTo(px+45+Math.sin(t*1.7)*9*(p.scarfWind==null?1:p.scarfWind),py-22);ctx.lineTo(px+12,py-18);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(222,228,203,.32)';for(let i=0;i<66;i++){const sx=x+helpers.noise(i*11.8+t*.1)*w,sy=y+helpers.noise(i*17.1+t*.3)*h;ctx.fillRect(sx|0,sy|0,(i%4?1:2),1);}
    ` },
  },

  foregroundWind: {
    id: 'foreground-wind', name: '前景风痕', z: 12, x: 0, y: 0, w: 640, h: 960, show: [[[0, 1]]],
    params: { strength: .38, color: '#b8d2cc' },
    editor: { controls: [{ path: 'params.strength', label: '风痕强度', min: 0, max: 1, step: .05 }] },
    program: { code: `
      const p=el.params||{},a=helpers.clamp(p.strength == null ? .38 : p.strength,0,1);ctx.strokeStyle=helpers.rgba(p.color||'#b8d2cc',a*.34);ctx.lineWidth=1;
      for(let i=0;i<34;i++){const yy=430+helpers.noise(i*9.1)*430,xx=((i*79+t*22)%760)-60,len=20+(i%7)*9;ctx.beginPath();ctx.moveTo(xx,yy);ctx.quadraticCurveTo(xx+len*.45,yy-4,xx+len,yy+1);ctx.stroke();}
    ` },
  },
};
