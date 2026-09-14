#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
let failed = false;
const fail = message => { failed = true; console.error(`✗ ${message}`); };
const pass = message => console.log(`✓ ${message}`);
const read = path => readFileSync(resolve(root, path), 'utf8');

const adapter = read('editor/tauri-host-adapter.js');
const rust = read('src-tauri/src/lib.rs');
const commands = [
  'patcharium_open_text',
  'patcharium_save_artifact',
  'patcharium_save_artifacts',
  'patcharium_pick_assets',
  'patcharium_read_asset',
  'patcharium_resolve_asset'
];
for (const command of commands) {
  if (adapter.includes(`'${command}'`) && rust.includes(command)) pass(`${command} 前后端合同存在`);
  else fail(`${command} 前后端合同缺失`);
}

const config = JSON.parse(read('src-tauri/tauri.conf.json'));
const pkg = JSON.parse(read('package.json'));
const cargoVersion = read('src-tauri/Cargo.toml').match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (pkg.version === config.version && pkg.version === cargoVersion) pass(`桌面产品版本已同步为 ${pkg.version}`);
else fail('package.json、Cargo.toml 与 tauri.conf.json 版本不一致');
if (config.build?.frontendDist === '../.tauri-dist' && config.app?.withGlobalTauri === true) pass('Tauri 使用隔离分发目录与全局 invoke bridge');
else fail('Tauri frontendDist / withGlobalTauri 配置不正确');
if (config.app?.windows?.[0]?.url === 'img2asset-layout-v1.html') pass('桌面入口固定为当前编辑器');
else fail('桌面入口不是 img2asset-layout-v1.html');

const capability = JSON.parse(read('src-tauri/capabilities/default.json'));
if (capability.windows?.includes('main') && capability.permissions?.includes('core:default')) pass('主窗口 capability 已声明');
else fail('主窗口 capability 缺失');

for (const ignored of ['.tauri-dist/', 'src-tauri/target/']) {
  if (read('.gitignore').includes(ignored)) pass(`${ignored} 已排除生成物`);
  else fail(`${ignored} 未写入 .gitignore`);
}

const prepare = read('scripts/prepare-tauri-frontend.mjs');
if (!prepare.includes("'img2asset.html'") && !prepare.includes("'examples/assets/")) pass('桌面白名单排除旧入口与示例资产');
else fail('桌面白名单不应包含旧入口或示例资产');
if (prepare.includes('writeIfChanged') && !prepare.includes('generatedAt:')) pass('桌面前端准备采用确定性增量写入');
else fail('桌面前端准备不得用构建时间戳触发无效重编译');

if (failed) process.exitCode = 1;
