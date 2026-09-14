#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(resolve(import.meta.dirname, '../editor/sampling-motion-kernel.js'), 'utf8');
const sandbox = { Float32Array, Uint8ClampedArray, Math };
new vm.Script(source, { filename: 'sampling-motion-kernel.js' }).runInNewContext(sandbox);
const kernel = sandbox.SamplingMotionKernel;

function assert(value, message) { if (!value) throw new Error(message); }
function equalArray(a, b) { return a.length === b.length && a.every((value, index) => value === b[index]); }

const wave = { field: { type: 'wave', scale: 12, speed: 1, angle: 25, period: 4, steps: 16, seed: 7 } };
const start = kernel.buildField(wave, 0, 12, 8, 1, null);
const middle = kernel.buildField(wave, 1, 12, 8, 1, null);
const loop = kernel.buildField(wave, 4, 12, 8, 1, null);
assert(equalArray(start.field, loop.field), 'wave field does not close exactly at its period');
assert(!equalArray(start.field, middle.field), 'wave field does not move across time');

const radial = kernel.buildField({ field: { type: 'radial', scale: 10, speed: 1, centerX: .5, centerY: .5, period: 4, steps: 16, seed: 7 } }, 1, 12, 8, 1, null);
assert(!equalArray(middle.field, radial.field), 'radial field is indistinguishable from wave field');

const alpha = { data: new Uint8ClampedArray(12 * 8 * 4) };
for (let y = 1; y < 7; y++) for (let x = 1; x < 11; x++) alpha.data[(y * 12 + x) * 4 + 3] = 255;
const protectedField = kernel.buildField({ field: wave.field, edge: { mode: 'alpha', width: 3, strength: 1 } }, 1, 12, 8, 1, alpha);
assert(protectedField.field[0] === 0, 'transparent pixels were not excluded by alpha edge protection');
assert(protectedField.field[1 * 12 + 1] < middle.field[1 * 12 + 1], 'alpha edge protection did not reduce motion near the contour');
const cache = {};
kernel.buildField({ field: wave.field, edge: { mode: 'alpha', width: 3, strength: 1 } }, 0, 12, 8, 1, alpha, { cache, sourceKey: 'frame-0' });
const cachedSpatial = cache.spatial, cachedAttenuation = cache.attenuation;
kernel.buildField({ field: wave.field, edge: { mode: 'alpha', width: 3, strength: 1 } }, 1, 12, 8, 1, alpha, { cache, sourceKey: 'frame-0' });
assert(cache.spatial === cachedSpatial && cache.attenuation === cachedAttenuation, 'prepared field cache was rebuilt for a time-only change');
kernel.buildField({ field: wave.field, edge: { mode: 'alpha', width: 3, strength: 1 } }, 1, 12, 8, 1, alpha, { cache, sourceKey: 'frame-1' });
assert(cache.spatial !== cachedSpatial && cache.attenuation !== cachedAttenuation, 'prepared field cache ignored a source-frame change');

const image = { data: new Uint8ClampedArray(12 * 8 * 4) };
for (let i = 0; i < image.data.length; i += 4) { image.data[i] = i / 4; image.data[i + 3] = 255; }
const before = new Uint8ClampedArray(image.data);
kernel.applyGrain(image, 12, 8, kernel.grainTide({ amount: 1, coarseness: 6, targets: 'sampling' }, middle));
assert(!equalArray(before, image.data), 'grain tide did not alter sampled pixels');

console.log('✓ Sampling Motion Kernel：周期、场类型、Alpha 边缘保护、预计算缓存与颗粒采样通过');
