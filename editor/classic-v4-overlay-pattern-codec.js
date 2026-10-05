(function (global) {
  'use strict';

  function finite(value,fallback){value=+value;return Number.isFinite(value)?value:fallback;}
  function unit(value,fallback){return Math.max(0,Math.min(1,finite(value,fallback)));}
  function style(pattern){
    if(pattern.type!=='lines')return pattern.type==='checker'?'dots':pattern.type;
    const layers=pattern.layers||[];
    if(pattern.lineMode==='layers')return'layers';
    if(pattern.lineMode==='grid'||(layers.length===2&&Math.abs(Math.abs(finite(layers[1].angle,0)-finite(layers[0].angle,0))-90)<.01))return'grid';
    return layers.length>1?'layers':'line';
  }

  function fromEffect(values){
    const texture=values.texture||'lines-horizontal';
    const base={phaseX:unit(values.phaseX,0),phaseY:unit(values.phaseY,0),color:values.color||'#ffffff'};
    if(texture==='noise')return Object.assign(base,{type:'noise',density:Math.max(0,Math.min(1,finite(values.noiseDensity,.18))),size:Math.max(1,Math.round(finite(values.noiseSize,1))),seed:Math.round(finite(values.noiseSeed,1))});
    if(texture==='dots'){
      const shape=values.shape||'circle';
      const point={circle:{sides:4,roundness:1},triangle:{sides:3,roundness:0},square:{sides:4,roundness:0},pentagon:{sides:5,roundness:0},hexagon:{sides:6,roundness:0}}[shape]||{sides:4,roundness:1};
      return Object.assign(base,{type:'dots',size:Math.max(1,finite(values.size,1)),spacing:Math.max(1,finite(values.spacing,4)),angle:finite(values.angle,0),shape,sides:point.sides,roundness:point.roundness,layout:values.layout==='stagger'?'stagger':'regular',phase:unit(values.rowPhase,.5)});
    }
    const spacing=Math.max(1,finite(values.spacing,4));
    const width=Math.max(1,Math.min(spacing,finite(values.size,1)));
    const angle=finite(values.angle,0);
    const layers=[{angle,width,spacing}];
    if(texture==='grid')layers.push({angle:angle+90,width,spacing});
    if(texture==='lines-layers'){
      layers.push({angle:finite(values.layer2Angle,angle+90),width:Math.max(1,finite(values.layer2Width,1)),spacing:Math.max(1,finite(values.layer2Spacing,spacing))});
      layers.push({angle:finite(values.layer3Angle,angle+135),width:Math.max(1,finite(values.layer3Width,1)),spacing:Math.max(1,finite(values.layer3Spacing,spacing))});
    }
    return Object.assign(base,{type:'lines',lineMode:texture==='grid'?'grid':texture==='lines-layers'?'layers':'line',layers});
  }

  function toEffect(pattern){
    const patternStyle=style(pattern);
    const patch={phaseX:unit(pattern.phaseX,0),phaseY:unit(pattern.phaseY,0)};
    if(patternStyle==='noise')return Object.assign(patch,{texture:'noise',noiseDensity:Math.max(0,Math.min(1,finite(pattern.density,.18))),noiseSize:Math.max(1,Math.round(finite(pattern.size,1))),noiseSeed:Math.round(finite(pattern.seed,1))});
    if(patternStyle==='dots')return Object.assign(patch,{
      texture:'dots',size:Math.max(1,finite(pattern.size,1)),spacing:Math.max(1,finite(pattern.spacing,pattern.cell||4)),angle:finite(pattern.angle,0),
      shape:pattern.roundness>=.98?'circle':({3:'triangle',4:'square',5:'pentagon',6:'hexagon'}[Math.round(finite(pattern.sides,4))]||'circle'),
      layout:pattern.layout==='stagger'?'stagger':'regular',rowPhase:unit(pattern.phase,.5)
    });
    const layers=pattern.layers||[];
    const first=layers[0]||{angle:0,width:1,spacing:4};
    Object.assign(patch,{texture:patternStyle==='grid'?'grid':patternStyle==='layers'?'lines-layers':'lines-horizontal',angle:finite(first.angle,0),size:Math.max(1,finite(first.width,1)),spacing:Math.max(1,finite(first.spacing,4))});
    if(patternStyle==='layers'){
      const second=layers[1]||{},third=layers[2]||{};
      Object.assign(patch,{layer2Angle:finite(second.angle,90),layer2Width:Math.max(1,finite(second.width,1)),layer2Spacing:Math.max(1,finite(second.spacing,4)),layer3Angle:finite(third.angle,135),layer3Width:Math.max(1,finite(third.width,1)),layer3Spacing:Math.max(1,finite(third.spacing,4))});
    }
    return patch;
  }

  global.EditorClassicV4OverlayPatternCodec=Object.freeze({fromEffect,toEffect,style});
})(typeof window!=='undefined'?window:globalThis);
