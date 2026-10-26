// Experimental numeric calibration only. Never reads artwork or runs per frame.
// Kept outside the Runtime until 2D native-Canvas parity has been demonstrated.
export function calibrateNativeNearest(from, to, axis, willReadFrequently = false, surface = 'offscreen') {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1 || from > 32768 || to > 32768) {
    throw new Error('unsupported-resample-range');
  }
  const vertical = axis === 'y';
  const makeCanvas = (width, height) => {
    if (surface === 'offscreen') return new OffscreenCanvas(width, height);
    const value = document.createElement('canvas'); value.width = width; value.height = height; return value;
  };
  const source = makeCanvas(vertical ? 1 : from, vertical ? from : 1);
  const target = makeCanvas(vertical ? 1 : to, vertical ? to : 1);
  const inputContext = source.getContext('2d', {willReadFrequently});
  const outputContext = target.getContext('2d', {willReadFrequently});
  const input = inputContext.createImageData(source.width, source.height);
  for (let i = 0; i < from; i++) input.data.set([i & 255, i >>> 8, 0, 255], i * 4);
  inputContext.putImageData(input, 0, 0);
  outputContext.imageSmoothingEnabled = false;
  outputContext.drawImage(source, 0, 0, target.width, target.height);
  const bytes = outputContext.getImageData(0, 0, target.width, target.height).data;
  const map = new Uint32Array(to);
  let exceptions = 0;
  for (let i = 0; i < to; i++) {
    map[i] = bytes[i * 4] + bytes[i * 4 + 1] * 256;
    if (map[i] >= from || bytes[i * 4 + 3] !== 255) throw new Error('native-nearest-calibration-invalid');
    if (map[i] !== Math.floor((2 * i + 1) * from / (2 * to))) exceptions++;
  }
  source.width = source.height = target.width = target.height = 1;
  return {map, exceptions};
}
