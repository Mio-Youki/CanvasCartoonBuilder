#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root=resolve(import.meta.dirname,'../..'),pagePath=resolve(root,'img2asset-v4-classic.html'),source=readFileSync(pagePath,'utf8');
assert.doesNotMatch(source,/<script src="home-scene\.js"/,'v4 product entry must not load the Legacy Runtime');
assert.doesNotMatch(source,/<script src="runtime-inline\.js"/,'v4 product entry must not load the Legacy inline Runtime');
assert.doesNotMatch(source,/<script src="editor\/legacy-v4-converter\.js"/,'v4 product entry must not embed Legacy conversion');
assert.match(source,/__TOSAMPOOL_V4_ONLY__=true/,'v4 product entry must explicitly opt into one session');
assert.match(source,/if\(!classicV4Vertical\)\{[\s\S]{0,900}createGenericScene\(false\);/,'Legacy bootstrap must stay outside the v4 start path');
const executablePath=['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync),browser=await chromium.launch(executablePath?{headless:true,executablePath}:{headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
await page.goto(`${pathToFileURL(pagePath).href}?e2e=v4-product`,{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForFunction(()=>window.ToSampoolSession&&window.ToSampoolSession.activeId==='v4'&&window.ToSampoolV4Workspace,{timeout:15000});
const state=await page.evaluate(()=>({sessions:ToSampoolSession.list().map(item=>item.id),format:ToSampoolSession.format,legacy:typeof window.HOME_SCENE,scene:ToSampoolV4Workspace.current()?.format}));
assert.deepEqual(state.sessions,['v4'],'product entry must expose exactly one v4 session');assert.equal(state.format,'tosampool-scene/v4');assert.equal(state.legacy,'undefined','product entry must not initialize HOME_SCENE');assert.equal(state.scene,'tosampool-scene/v4');assert.deepEqual(errors,[],'product entry must start without page errors');
await browser.close();
console.log('✓ v4 产品边界：单会话、无 Legacy Runtime、无内部转换入口与启动流程通过');
