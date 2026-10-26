/* ToSampool Runtime vNext: explicit Photoshop-style Hard Mix for texture overlays. */
(function (global) {
  'use strict';

  const api = global.ToSampoolRuntimeVNext;
  function composite(base, layer, surfaces) {
    if (base.width !== layer.width || base.height !== layer.height) throw new Error('Hard Mix 需要尺寸一致的底色与纹理层');
    const output = surfaces.acquire(base.width, base.height);
    const ctx = output.getContext('2d');
    let background, foreground, result;
    try {
      background = base.getContext('2d').getImageData(0, 0, base.width, base.height).data;
      foreground = layer.getContext('2d').getImageData(0, 0, layer.width, layer.height).data;
      result = ctx.createImageData(base.width, base.height);
    } catch (error) {
      surfaces.release(output);
      throw new Error(`Hard Mix 读取失败：${error.message || 'Canvas 可能被跨域素材污染'}`);
    }
    const target = result.data;
    for (let i = 0; i < target.length; i += 4) {
      const baseByte = background[i + 3], layerByte = foreground[i + 3];
      if (layerByte === 0) {
        target[i] = background[i]; target[i + 1] = background[i + 1]; target[i + 2] = background[i + 2]; target[i + 3] = baseByte;
        continue;
      }
      if (baseByte === 255 && layerByte === 255) {
        target[i] = background[i] + foreground[i] >= 255 ? 255 : 0;
        target[i + 1] = background[i + 1] + foreground[i + 1] >= 255 ? 255 : 0;
        target[i + 2] = background[i + 2] + foreground[i + 2] >= 255 ? 255 : 0;
        target[i + 3] = 255;
        continue;
      }
      const baseAlpha = baseByte / 255, layerAlpha = layerByte / 255;
      const outputAlpha = layerAlpha + baseAlpha * (1 - layerAlpha);
      target[i + 3] = Math.round(outputAlpha * 255);
      if (outputAlpha <= 0) continue;
      for (let channel = 0; channel < 3; channel++) {
        const baseValue = background[i + channel], layerValue = foreground[i + channel];
        const hard = baseValue + layerValue >= 255 ? 255 : 0;
        target[i + channel] = Math.round((layerAlpha * ((1 - baseAlpha) * layerValue + baseAlpha * hard) + baseAlpha * (1 - layerAlpha) * baseValue) / outputAlpha);
      }
    }
    ctx.putImageData(result, 0, 0);
    if (surfaces.notePixels) surfaces.notePixels(base.width, base.height, 1);
    return output;
  }
  api.modules.hardMix = Object.freeze({ composite });
})(typeof window !== 'undefined' ? window : globalThis);
