#!/usr/bin/env node
/**
 * GENERIC_SCENE 的只读合同校验器。
 *
 * 它验证可由 Agent 与编辑器共同依赖的结构不变量，而不评价画面好坏，
 * 也不用于限制 HOME_SCENE 等兼容项目脚本的 Runtime 导出。
 * 用法：node scripts/validate-scene.mjs examples/agent-contract-minimal.js
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const RESERVED = new Set([
  'format', 'formatVersion', 'kind', 'name', 'w', 'h', 'loop', 'fps', 'bg', 'transparent',
  'scenes', 'sceneBorders', 'images', 'groups', 'fx', 'timeline', 'markers', 'meta',
]);
const PART_TYPES = new Set(['rect', 'line', 'ellipse', 'poly', 'text']);
const MASK_TYPES = new Set(['rect', 'ellipse', 'poly', 'alpha', 'element']);
const BLENDS = new Set(['normal', 'screen', 'multiply', 'lighter']);

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function readGenericScene(path) {
  if (!existsSync(path)) throw new Error(`文件不存在：${path}`);
  const source = readFileSync(path, 'utf8');
  const context = vm.createContext(Object.create(null));
  try {
    new vm.Script(`${source}\n;globalThis.__PATCHARIUM_SCENE__ = typeof GENERIC_SCENE === 'undefined' ? null : GENERIC_SCENE;`, { filename: path })
      .runInContext(context, { timeout: 500 });
  } catch (error) {
    throw new Error(`无法解析 GENERIC_SCENE：${error.message}`);
  }
  if (!isObject(context.__PATCHARIUM_SCENE__)) throw new Error('未找到对象形式的 const GENERIC_SCENE = { ... };');
  return context.__PATCHARIUM_SCENE__;
}

function entityCandidates(scene) {
  const procedural = Object.entries(scene)
    .filter(([key, value]) => !RESERVED.has(key) && isObject(value) && (Array.isArray(value.parts) || value.particle || value.kind === 'builtin' || (isObject(value.program) && typeof value.program.code === 'string')))
    .map(([key, value]) => ({ ...value, __key: key, __source: 'top-level' }));
  const images = Array.isArray(scene.images)
    ? scene.images.filter(isObject).map((value, index) => ({ ...value, __key: `images[${index}]`, __source: 'image' }))
    : [];
  return [...procedural, ...images];
}

function fRange(value) {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber) && value[0] >= 0 && value[0] <= value[1] && value[1] <= 1;
}

export function validateScene(scene) {
  const errors = [];
  const warnings = [];
  const error = (message) => errors.push(message);
  const warn = (message) => warnings.push(message);

  if (scene.format !== 'canvas-cartoon-scene') error('format 必须为 canvas-cartoon-scene');
  if (scene.kind !== 'generic') error('kind 必须为 generic；兼容 HOME_SCENE 不使用本校验器');
  if (!isFiniteNumber(scene.formatVersion)) error('formatVersion 必须为数值');
  ['w', 'h', 'loop'].forEach((key) => {
    if (!isFiniteNumber(scene[key]) || scene[key] <= 0) error(`${key} 必须为大于 0 的有限数值`);
  });

  const sceneCount = Array.isArray(scene.scenes) ? scene.scenes.length : 1;
  if (scene.scenes !== undefined && (!Array.isArray(scene.scenes) || !scene.scenes.length || scene.scenes.some((name) => typeof name !== 'string' || !name.trim()))) {
    error('scenes 必须是非空场景名称数组');
  }
  if (scene.sceneBorders !== undefined) {
    if (!Array.isArray(scene.sceneBorders) || scene.sceneBorders.length !== Math.max(0, sceneCount - 1)) error('sceneBorders 长度必须为 scenes.length - 1');
    else {
      let previous = 0;
      scene.sceneBorders.forEach((border, index) => {
        if (!isFiniteNumber(border) || border <= previous || border >= scene.loop) error(`sceneBorders[${index}] 必须在 loop 内严格递增`);
        previous = border;
      });
    }
  }

  const entities = entityCandidates(scene);
  const byId = new Map();
  entities.forEach((entity) => {
    if (typeof entity.id !== 'string' || !entity.id.trim()) error(`${entity.__key} 缺少稳定 id`);
    else if (byId.has(entity.id)) error(`id 重复：${entity.id}`);
    else byId.set(entity.id, entity);
    if (entity.__source === 'image' && typeof entity.src !== 'string' && !Array.isArray(entity.parts)) error(`${entity.__key} 是图片元素时必须有 src 或 parts`);
    if (entity.program !== undefined) {
      if (!isObject(entity.program) || typeof entity.program.code !== 'string' || !entity.program.code.trim()) error(`${entity.__key}.program.code 必须是非空字符串`);
      if (!isFiniteNumber(entity.w) || !isFiniteNumber(entity.h) || entity.w <= 0 || entity.h <= 0) error(`${entity.__key} 程序元素需要正数 w/h 作为可选择边界`);
      if (typeof entity.program?.code === 'string') {
        try { new Function('ctx', 't', 'el', 'scene', 'helpers', '"use strict";\n' + entity.program.code); }
        catch (compileError) { error(`${entity.__key}.program.code 语法错误：${compileError.message}`); }
      }
    }
    ['x', 'y'].forEach((key) => {
      if (entity[key] !== undefined && !isFiniteNumber(entity[key])) error(`${entity.__key}.${key} 必须为有限数值`);
    });
    if (entity.show !== undefined && (!Array.isArray(entity.show) || entity.show.length !== sceneCount)) error(`${entity.__key}.show 必须按 scenes 长度保存`);
    if (entity.blend !== undefined && !BLENDS.has(entity.blend)) error(`${entity.__key}.blend 不受支持：${entity.blend}`);
    if (entity.pixelDiv !== undefined && (!isFiniteNumber(entity.pixelDiv) || entity.pixelDiv < 1)) error(`${entity.__key}.pixelDiv 必须为 ≥1 的有限数值`);
    const sampleJitter = entity.style?.sampleJitter;
    if (sampleJitter !== undefined) {
      if (entity.__source !== 'image' || typeof entity.src !== 'string') error(`${entity.__key}.style.sampleJitter 只支持图片元素或图片背景`);
      if (!(entity.pixelDiv > 1)) error(`${entity.__key}.style.sampleJitter 需要 pixelDiv > 1`);
      if (!isObject(sampleJitter)) error(`${entity.__key}.style.sampleJitter 必须为对象`);
      else {
        if (sampleJitter.mode !== undefined && !['step', 'drift'].includes(sampleJitter.mode)) error(`${entity.__key}.style.sampleJitter.mode 仅支持 step / drift`);
        if (sampleJitter.rate !== undefined && (!isFiniteNumber(sampleJitter.rate) || sampleJitter.rate <= 0)) error(`${entity.__key}.style.sampleJitter.rate 必须大于 0`);
        if (sampleJitter.amount !== undefined && (!isFiniteNumber(sampleJitter.amount) || sampleJitter.amount < 0 || sampleJitter.amount > entity.pixelDiv - 1)) error(`${entity.__key}.style.sampleJitter.amount 必须在 0..pixelDiv-1 内`);
        if (sampleJitter.seed !== undefined && (!isFiniteNumber(sampleJitter.seed) || sampleJitter.seed < 0)) error(`${entity.__key}.style.sampleJitter.seed 必须为非负数`);
        if (sampleJitter.show !== undefined && (!Array.isArray(sampleJitter.show) || sampleJitter.show.length !== sceneCount)) error(`${entity.__key}.style.sampleJitter.show 必须按 scenes 长度保存`);
      }
    }
    const imageMotion = entity.style?.imageFx?.motion;
    if (imageMotion !== undefined) {
      if (entity.__source !== 'image' || typeof entity.src !== 'string') error(`${entity.__key}.style.imageFx.motion 只支持图片元素或图片背景`);
      if (!isObject(imageMotion) || !['dither-drift', 'threshold-pulse'].includes(imageMotion.type)) error(`${entity.__key}.style.imageFx.motion.type 仅支持 dither-drift / threshold-pulse`);
      else {
        if (imageMotion.type === 'dither-drift' && entity.style.imageFx.mode !== 'halftone') error(`${entity.__key}.style.imageFx.motion dither-drift 需要 imageFx.mode='halftone'`);
        if (imageMotion.type === 'threshold-pulse' && entity.style.imageFx.mode !== 'threshold') error(`${entity.__key}.style.imageFx.motion threshold-pulse 需要 imageFx.mode='threshold'`);
        if (imageMotion.period !== undefined && (!isFiniteNumber(imageMotion.period) || imageMotion.period <= 0)) error(`${entity.__key}.style.imageFx.motion.period 必须大于 0`);
        if (imageMotion.steps !== undefined && (!isFiniteNumber(imageMotion.steps) || imageMotion.steps < 2 || imageMotion.steps > 60)) error(`${entity.__key}.style.imageFx.motion.steps 必须在 2..60 内`);
        if (imageMotion.direction !== undefined && !['horizontal','vertical','diagonal'].includes(imageMotion.direction)) error(`${entity.__key}.style.imageFx.motion.direction 不受支持`);
        if (imageMotion.show !== undefined && (!Array.isArray(imageMotion.show) || imageMotion.show.length !== sceneCount)) error(`${entity.__key}.style.imageFx.motion.show 必须按 scenes 长度保存`);
      }
    }
    const samplingMotion = entity.style?.samplingMotion;
    if (samplingMotion !== undefined) {
      if (entity.__source !== 'image' || typeof entity.src !== 'string') error(`${entity.__key}.style.samplingMotion 只支持图片元素或图片背景`);
      if (!isObject(samplingMotion)) error(`${entity.__key}.style.samplingMotion 必须为对象`);
      else {
        if (samplingMotion.show !== undefined && (!Array.isArray(samplingMotion.show) || samplingMotion.show.length !== sceneCount)) error(`${entity.__key}.style.samplingMotion.show 必须按 scenes 长度保存`);
        const boil=samplingMotion.pixelBoil,drift=samplingMotion.ditherDrift,pulse=samplingMotion.thresholdPulse,tide=samplingMotion.grainTide,field=samplingMotion.field,edge=samplingMotion.edge;
        if (boil !== undefined && !isObject(boil)) error(`${entity.__key}.style.samplingMotion.pixelBoil 必须为对象`);
        if (isObject(boil) && boil.mode !== undefined && !['step','drift'].includes(boil.mode)) error(`${entity.__key}.style.samplingMotion.pixelBoil.mode 仅支持 step / drift`);
        if (drift !== undefined && !isObject(drift)) error(`${entity.__key}.style.samplingMotion.ditherDrift 必须为对象`);
        if (isObject(drift) && drift.direction !== undefined && !['horizontal','vertical','diagonal'].includes(drift.direction)) error(`${entity.__key}.style.samplingMotion.ditherDrift.direction 不受支持`);
        if (pulse !== undefined && !isObject(pulse)) error(`${entity.__key}.style.samplingMotion.thresholdPulse 必须为对象`);
        if (tide !== undefined && !isObject(tide)) error(`${entity.__key}.style.samplingMotion.grainTide 必须为对象`);
        if (isObject(tide) && tide.targets !== undefined && !['combined','sampling','threshold','dots'].includes(tide.targets)) error(`${entity.__key}.style.samplingMotion.grainTide.targets 不受支持`);
        if (isObject(tide) && tide.amount !== undefined && (!isFiniteNumber(tide.amount) || tide.amount < 0 || tide.amount > 1)) error(`${entity.__key}.style.samplingMotion.grainTide.amount 必须在 0..1 内`);
        if (field !== undefined && !isObject(field)) error(`${entity.__key}.style.samplingMotion.field 必须为对象`);
        if (isObject(field) && field.type !== undefined && !['uniform','wave','radial'].includes(field.type)) error(`${entity.__key}.style.samplingMotion.field.type 仅支持 uniform / wave / radial`);
        if (isObject(field) && field.period !== undefined && (!isFiniteNumber(field.period) || field.period <= 0)) error(`${entity.__key}.style.samplingMotion.field.period 必须大于 0`);
        if (isObject(field) && field.steps !== undefined && (!isFiniteNumber(field.steps) || field.steps < 2 || field.steps > 60)) error(`${entity.__key}.style.samplingMotion.field.steps 必须在 2..60 内`);
        ['centerX','centerY'].forEach(key=>{if(isObject(field)&&field[key]!==undefined&&(!isFiniteNumber(field[key])||field[key]<0||field[key]>1))error(`${entity.__key}.style.samplingMotion.field.${key} 必须在 0..1 内`);});
        if (edge !== undefined && !isObject(edge)) error(`${entity.__key}.style.samplingMotion.edge 必须为对象`);
        if (isObject(edge) && edge.mode !== undefined && edge.mode !== 'alpha') error(`${entity.__key}.style.samplingMotion.edge.mode 目前仅支持 alpha`);
        if (isObject(edge) && edge.width !== undefined && (!isFiniteNumber(edge.width) || edge.width < 1 || edge.width > 8)) error(`${entity.__key}.style.samplingMotion.edge.width 必须在 1..8 内`);
        if (isObject(edge) && edge.strength !== undefined && (!isFiniteNumber(edge.strength) || edge.strength < 0 || edge.strength > 1)) error(`${entity.__key}.style.samplingMotion.edge.strength 必须在 0..1 内`);
        [drift,pulse,tide].filter(isObject).forEach((motion) => {
          if (motion.period !== undefined && (!isFiniteNumber(motion.period) || motion.period <= 0)) error(`${entity.__key}.style.samplingMotion 的 period 必须大于 0`);
          if (motion.steps !== undefined && (!isFiniteNumber(motion.steps) || motion.steps < 2 || motion.steps > 60)) error(`${entity.__key}.style.samplingMotion 的 steps 必须在 2..60 内`);
        });
      }
    }
    if (Array.isArray(entity.parts)) entity.parts.forEach((part, index) => {
      if (!isObject(part) || !PART_TYPES.has(part.type)) error(`${entity.__key}.parts[${index}] 的 type 不受支持`);
      if (part?.blend !== undefined && !BLENDS.has(part.blend)) error(`${entity.__key}.parts[${index}].blend 不受支持：${part.blend}`);
    });
  });

  const elementMaskEdges = new Map();
  function validateMask(mask, owner) {
    if (!isObject(mask)) return;
    if (!MASK_TYPES.has(mask.type)) {
      error(`${owner}.mask.type 不受支持：${mask.type}`);
      return;
    }
    if (mask.type === 'poly' && (!Array.isArray(mask.points) || mask.points.length < 3)) error(`${owner}.mask.poly 需要至少 3 个点`);
    if ((mask.type === 'rect' || mask.type === 'ellipse') && ['x', 'y', 'w', 'h'].some((key) => !isFiniteNumber(mask[key]))) error(`${owner}.mask.${mask.type} 需要 x/y/w/h`);
    if (mask.type === 'alpha' && (!byId.has(mask.imageId) || byId.get(mask.imageId).__source !== 'image')) error(`${owner}.mask.alpha.imageId 必须引用 images[] 中的稳定 id`);
    if (mask.type === 'element') {
      if (!byId.has(mask.targetId) && !(Array.isArray(scene.groups) && scene.groups.some((group) => group?.id === mask.targetId))) error(`${owner}.mask.element.targetId 不存在：${mask.targetId}`);
      else if (owner === mask.targetId) error(`${owner}.mask 不能引用自身`);
      else elementMaskEdges.set(owner, mask.targetId);
    }
  }

  entities.forEach((entity) => {
    validateMask(entity.mask, entity.id || entity.__key);
    const source = entity.particle?.source;
    if (source?.type === 'image' && (!byId.has(source.imageId) || byId.get(source.imageId).__source !== 'image')) error(`${entity.id || entity.__key}.particle.source.imageId 不存在或不是图片`);
  });

  const groupIds = new Set();
  if (scene.groups !== undefined && !Array.isArray(scene.groups)) error('groups 必须为数组');
  (scene.groups || []).forEach((group, index) => {
    const label = `groups[${index}]`;
    if (!isObject(group) || typeof group.id !== 'string' || !group.id.trim()) error(`${label} 缺少稳定 id`);
    else if (groupIds.has(group.id) || byId.has(group.id)) error(`${label}.id 重复：${group.id}`);
    else groupIds.add(group.id);
    if (!Array.isArray(group.memberIds) || group.memberIds.length < 2) error(`${label}.memberIds 至少需要两个成员`);
    else group.memberIds.forEach((id) => { if (!byId.has(id)) error(`${label}.memberIds 引用了不存在的元素：${id}`); });
    validateMask(group.mask, group.id || label);
  });

  // 元素蒙版只能形成一条无环引用链；组作为终点不参与元素环。
  for (const start of elementMaskEdges.keys()) {
    const visited = new Set([start]);
    let cursor = start;
    while (elementMaskEdges.has(cursor)) {
      cursor = elementMaskEdges.get(cursor);
      if (visited.has(cursor)) { error(`元素蒙版存在循环引用：${[...visited, cursor].join(' → ')}`); break; }
      visited.add(cursor);
    }
  }

  const layers = scene.fx?.layers;
  if (layers !== undefined && !Array.isArray(layers)) error('fx.layers 必须为数组');
  const fxIds = new Set();
  (layers || []).forEach((layer, index) => {
    const label = `fx.layers[${index}]`;
    if (typeof layer?.id !== 'string' || !layer.id.trim()) error(`${label} 缺少稳定 id`);
    else if (fxIds.has(layer.id)) error(`局部 FX id 重复：${layer.id}`);
    else fxIds.add(layer.id);
    if (layer?.blend !== undefined && !BLENDS.has(layer.blend)) error(`${label}.blend 不受支持：${layer.blend}`);
    if (layer?.pixelDiv !== undefined && (!isFiniteNumber(layer.pixelDiv) || layer.pixelDiv < 1)) error(`${label}.pixelDiv 必须为 ≥1 的有限数值`);
    validateMask(layer?.mask, layer?.id || label);
    if (layer?.bind?.targetId && !byId.has(layer.bind.targetId)) error(`${label}.bind.targetId 不存在：${layer.bind.targetId}`);
  });

  const tracks = scene.timeline?.tracks;
  if (tracks !== undefined && !isObject(tracks)) error('timeline.tracks 必须为对象');
  Object.entries(tracks || {}).forEach(([id, perScene]) => {
    if (!byId.has(id)) error(`timeline.tracks 引用了不存在的元素：${id}`);
    if (!isObject(perScene)) error(`timeline.tracks.${id} 必须为按场景索引的对象`);
    Object.entries(perScene || {}).forEach(([index, track]) => {
      if (!Number.isInteger(Number(index)) || Number(index) < 0 || Number(index) >= sceneCount) error(`timeline.tracks.${id} 的场景索引非法：${index}`);
      if (!Array.isArray(track?.segments)) error(`timeline.tracks.${id}.${index}.segments 必须为数组`);
      else track.segments.forEach((segment, segmentIndex) => {
        if (!fRange(segment?.f)) error(`timeline.tracks.${id}.${index}.segments[${segmentIndex}].f 必须为 [0..1, 0..1]`);
        if (segment?.type !== undefined && segment.type !== 'linear') error(`timeline.tracks.${id}.${index}.segments[${segmentIndex}].type 仅支持 linear`);
      });
    });
  });

  if (!entities.length) warn('场景没有可编辑实体；这可以是空模板，但不适合作为 Agent 完整交付。');
  return { errors, warnings, entityCount: entities.length };
}

export function validateSceneFile(path) {
  const scene = readGenericScene(resolve(path));
  return validateScene(scene);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error('用法：node scripts/validate-scene.mjs <scene.js> [...scene.js]');
    process.exitCode = 2;
  } else {
    let failed = false;
    paths.forEach((path) => {
      try {
        const result = validateSceneFile(path);
        result.warnings.forEach((message) => console.warn(`△ ${path}：${message}`));
        result.errors.forEach((message) => console.error(`✗ ${path}：${message}`));
        if (result.errors.length) failed = true;
        else console.log(`✓ ${path}：Scene 合同通过（${result.entityCount} 个实体）`);
      } catch (error) {
        failed = true;
        console.error(`✗ ${path}：${error.message}`);
      }
    });
    process.exitCode = failed ? 1 : 0;
  }
}
