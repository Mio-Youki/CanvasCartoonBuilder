#!/usr/bin/env node
/** Read-only structural validator for persisted ToSampool v4 documents. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const FORMAT = 'tosampool-scene/v4';
const TYPES = new Set(['rect', 'ellipse', 'line', 'poly', 'vector', 'text', 'image', 'group', 'particle-emitter', 'builtin']);
const builtinSandbox={};
for(const file of ['00-namespace.js','15-builtin-registry.js'])new vm.Script(readFileSync(resolve(import.meta.dirname,'..','runtime-src','vnext',file),'utf8'),{filename:file}).runInNewContext(builtinSandbox);
const BUILTIN_REGISTRY=builtinSandbox.ToSampoolRuntimeVNext.modules.builtins;
const BUILTINS = new Map(BUILTIN_REGISTRY.definitions.map(value=>[value.id,value.version]));
const finite = value => Number.isFinite(+value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export function validateVNextScene(scene) {
  const errors = [], fail = message => errors.push(message);
  if (!object(scene)) return { valid: false, errors: ['Scene 必须是对象'] };
  if (scene.format !== FORMAT) fail(`format 必须为 ${FORMAT}`);
  for (const key of ['width', 'height', 'loop']) if (!finite(scene[key]) || +scene[key] <= 0) fail(`${key} 必须为正数`);
  if (!object(scene.assets || {})) fail('assets 必须是 locator 映射对象');
  for (const [id, ref] of Object.entries(scene.assets || {})) if (!id || !object(ref) || typeof ref.locator !== 'string' || !ref.locator) fail(`assets.${id} 必须含非空 locator`);
  if (!Array.isArray(scene.entities)) fail('entities 必须为数组');
  const entities = Array.isArray(scene.entities) ? scene.entities : [], byId = new Map();
  for (const [index, entity] of entities.entries()) {
    const label = `entities[${index}]`;
    if (!object(entity) || typeof entity.id !== 'string' || !entity.id) { fail(`${label} 缺少稳定 id`); continue; }
    if (byId.has(entity.id)) fail(`实体 id 重复：${entity.id}`); else byId.set(entity.id, entity);
    if (!TYPES.has(entity.type || 'rect')) fail(`${label}.type 不受支持：${entity.type}`);
    for (const key of ['x', 'y', 'w', 'h', 'scaleX', 'scaleY', 'rot', 'alpha']) if (entity[key] !== undefined && !finite(entity[key])) fail(`${label}.${key} 必须为有限数值`);
    if (entity.pivot !== undefined && (!object(entity.pivot) || entity.pivot.mode !== 'custom' || !finite(entity.pivot.x) || !finite(entity.pivot.y) || +entity.pivot.x < 0 || +entity.pivot.x > 1 || +entity.pivot.y < 0 || +entity.pivot.y > 1)) fail(`${label}.pivot 必须是 0–1 范围内的 custom 归一化坐标`);
  }
  for (const entity of entities) {
    if (!object(entity) || !entity.id) continue;
    if (entity.parentId) { const parent = byId.get(entity.parentId); if (!parent || parent.type !== 'group') fail(`实体「${entity.id}」的 parentId 必须引用 group`); }
    if (entity.type === 'image' && (!entity.assetId || !scene.assets?.[entity.assetId])) fail(`图片实体「${entity.id}」必须引用 assets 中的 assetId`);
    if (entity.type === 'builtin') {
      const id=entity.builtin?.id,version=entity.builtin?.version==null?1:+entity.builtin.version;
      if(!BUILTINS.has(id))fail(`内建组件「${entity.id}」引用了未注册 id：${id||'(空)'}`);
      else if(BUILTINS.get(id)!==version)fail(`内建组件「${entity.id}」的版本无效：${version}`);
      if(entity.builtin?.params!==undefined&&!object(entity.builtin.params))fail(`内建组件「${entity.id}」的 params 必须是对象`);
      if(BUILTINS.has(id)&&object(entity.builtin?.params)){
        const definition=BUILTIN_REGISTRY.definition(id,version),allowed=new Set(definition.params.map(param=>param.key));
        for(const key of Object.keys(entity.builtin.params))if(!allowed.has(key))fail(`内建组件「${entity.id}」包含未声明参数：${key}`);
      }
    }
    if (entity.type === 'particle-emitter') { const source = byId.get(entity.particle?.sourceId); if (!source || source.type === 'group' || source.type === 'particle-emitter') fail(`粒子发射器「${entity.id}」必须引用普通 sourceId`); }
    const mask = entity.effects?.mask;
    validateMask(mask, `实体「${entity.id}」`, entity.id);
  }
  function validateMask(mask,label,ownerId){
    if(mask==null)return;
    if(!object(mask)||!['rect','ellipse','poly','alpha','element'].includes(mask.type)){fail(`${label}的蒙版类型无效`);return;}
    if(mask.invert!==undefined&&typeof mask.invert!=='boolean')fail(`${label}的蒙版 invert 必须为布尔值`);
    if(['rect','ellipse','alpha'].includes(mask.type))for(const key of ['x','y','w','h'])if(!finite(mask[key])||(key==='w'||key==='h')&&+mask[key]<=0)fail(`${label}的蒙版 ${key} 无效`);
    if(mask.type==='poly'&&(!Array.isArray(mask.points)||mask.points.length<3||mask.points.some(point=>!Array.isArray(point)||point.length<2||!finite(point[0])||!finite(point[1]))))fail(`${label}的多边形蒙版至少需要三个有效点`);
    if(mask.type==='alpha'&&!scene.assets?.[mask.assetId||mask.imageId])fail(`${label}的 Alpha 蒙版素材不存在`);
    if(mask.type==='alpha'&&mask.mode!==undefined&&!['alpha','luma'].includes(mask.mode))fail(`${label}的 Alpha 蒙版 mode 必须是 alpha 或 luma`);
    if(mask.type==='element'){
      const source=byId.get(mask.targetId);if(!source)fail(`${label}的元素蒙版来源不存在`);else if(source.type==='particle-emitter')fail(`${label}不能引用粒子发射器作为蒙版`);
      if(ownerId&&mask.targetId===ownerId)fail(`${label}不能引用自身作为蒙版`);
      if(mask.sourceVisibility!==undefined&&!['keep','mask-only'].includes(mask.sourceVisibility))fail(`${label}的 sourceVisibility 必须是 keep 或 mask-only`);
    }
  }
  for(const [stage,bucket] of Object.entries(scene.sceneEffects||{})){
    if(stage==='pipeline'||!object(bucket))continue;
    for(const [effectId,config] of Object.entries(bucket))if(object(config))validateMask(config.mask,`场景滤镜「${effectId}」`,null);
  }
  for (const start of entities) {
    if (!start?.id) continue;
    const visited = new Set(), chain = []; let current = start;
    while (current?.parentId) { if (visited.has(current.id)) { fail(`组父级存在循环引用：${chain.concat(current.id).join(' → ')}`); break; } visited.add(current.id); chain.push(current.id); current = byId.get(current.parentId); }
  }
  if (scene.timeline !== undefined && !object(scene.timeline)) fail('timeline 必须为对象');
  const tracks=scene.timeline?.tracks;
  if(tracks!==undefined&&!object(tracks))fail('timeline.tracks 必须是稳定键映射对象');
  for(const [key,track] of Object.entries(tracks||{})){
    if(!key||!object(track)||!Array.isArray(track.segments)||!track.segments.length){fail(`timeline.tracks.${key||'(空)'} 必须含非空 segments`);continue;}
    let edge=0;
    for(const [index,segment] of track.segments.entries()){
      const f=segment&&segment.f,type=segment&&segment.type||'step';
      if(!object(segment)||!Array.isArray(f)||f.length!==2||!finite(f[0])||!finite(f[1])||+f[0]<0||+f[1]>1||+f[1]<=+f[0]){fail(`timeline.tracks.${key}.segments[${index}] 区间无效`);continue;}
      if(Math.abs(+f[0]-edge)>.000001)fail(`timeline.tracks.${key} 必须连续覆盖整个循环`);edge=+f[1];
      if(!['step','linear'].includes(type))fail(`timeline.tracks.${key}.segments[${index}].type 必须是 step 或 linear`);
      if(type==='step'&&segment.values!==undefined&&!object(segment.values))fail(`timeline.tracks.${key}.segments[${index}].values 必须是对象`);
      if(segment.linearKeys!==undefined&&(type!=='linear'||!Array.isArray(segment.linearKeys)||segment.linearKeys.some(value=>typeof value!=='string'||!value)))fail(`timeline.tracks.${key}.segments[${index}].linearKeys 只能是 Linear 段的非空字符串数组`);
    }
    if(Math.abs(edge-1)>.000001)fail(`timeline.tracks.${key} 必须覆盖到循环末尾`);
  }
  const scenes=scene.timeline?.scenes;
  if(scenes!==undefined&&!Array.isArray(scenes))fail('timeline.scenes 必须为数组');
  if(Array.isArray(scenes)){
    if(!scenes.length)fail('timeline.scenes 不能为空');
    const ids=new Set();let edge=0;
    for(const [index,segment] of scenes.entries()){
      const f=segment&&segment.f;
      if(!object(segment)||typeof segment.id!=='string'||!segment.id)fail(`timeline.scenes[${index}] 缺少稳定 id`);
      else if(ids.has(segment.id))fail(`Scene id 重复：${segment.id}`);else ids.add(segment.id);
      if(!object(segment)||typeof segment.name!=='string'||!segment.name.trim())fail(`timeline.scenes[${index}] 缺少名称`);
      if(!Array.isArray(f)||f.length!==2||!finite(f[0])||!finite(f[1])||+f[0]<0||+f[1]>1||+f[1]<=+f[0])fail(`timeline.scenes[${index}] 区间无效`);
      else{if(Math.abs(+f[0]-edge)>.000001)fail('timeline.scenes 必须连续覆盖整个循环');edge=+f[1];}
      if(segment&&segment.transition!==undefined){const transition=segment.transition;if(!object(transition)||!['none','fade','scan','wipe','dissolve'].includes(transition.type||'none'))fail(`timeline.scenes[${index}].transition.type 无效`);else{if(transition.duration!==undefined&&(!finite(transition.duration)||+transition.duration<=0))fail(`timeline.scenes[${index}].transition.duration 必须为正数`);if(transition.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(String(transition.color)))fail(`timeline.scenes[${index}].transition.color 必须为六位 Hex`);}}
    }
    if(Math.abs(edge-1)>.000001)fail('timeline.scenes 必须覆盖到循环末尾');
  }
  const visibility = scene.timeline?.visibility;
  if (visibility !== undefined && !object(visibility)) fail('timeline.visibility 必须是实体 id 映射对象');
  for (const [id, track] of Object.entries(visibility || {})) {
    if (!byId.has(id)) { fail(`显示时段引用了不存在的实体：${id}`); continue; }
    if (!object(track) || !Array.isArray(track.segments) || !track.segments.length) { fail(`timeline.visibility.${id} 必须含非空 segments`); continue; }
    let edge = 0;
    for (const [index, segment] of track.segments.entries()) {
      const f=segment&&segment.f;
      if (!object(segment) || !Array.isArray(f) || f.length!==2 || !finite(f[0]) || !finite(f[1]) || +f[0] < 0 || +f[1] > 1 || +f[1] <= +f[0]) { fail(`timeline.visibility.${id}.segments[${index}] 区间无效`); continue; }
      if (Math.abs(+f[0]-edge)>.000001) fail(`timeline.visibility.${id} 必须连续覆盖整个循环`);
      if (segment.visible !== undefined && typeof segment.visible !== 'boolean') fail(`timeline.visibility.${id}.segments[${index}].visible 必须为布尔值`);
      edge=+f[1];
    }
    if (Math.abs(edge-1)>.000001) fail(`timeline.visibility.${id} 必须覆盖到循环末尾`);
  }
  return { valid: errors.length === 0, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const file = process.argv[2];
  if (!file) throw new Error('用法：node scripts/validate-scene-vnext.mjs scene.json');
  const result = validateVNextScene(JSON.parse(readFileSync(resolve(file), 'utf8')));
  if (!result.valid) throw new Error(result.errors.join('\n'));
  console.log('✓ ToSampool v4 Scene 合同通过');
}
