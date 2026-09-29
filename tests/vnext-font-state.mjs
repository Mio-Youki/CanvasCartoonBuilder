#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const context={};vm.createContext(context);
vm.runInContext(readFileSync(resolve(import.meta.dirname,'..','editor','vnext-font-state.js'),'utf8'),context);
const state=context.EditorVNextFontState,scene={fonts:{},entities:[{id:'title',type:'text',fontFamily:'sans-serif'}]};
const added=state.add(scene,{name:'Display Font.ttf',fileName:'Display Font.ttf',locator:'assets/display.ttf',mime:'font/ttf'});
assert.equal(added.id,'display-font');assert.equal(scene.fonts[added.id].locator,'assets/display.ttf');assert.ok(scene.fonts[added.id].family.startsWith('ToSampool_'));
state.attach(scene,'title',added.id);assert.equal(scene.entities[0].fontId,added.id);assert.equal(scene.entities[0].fontFamily,scene.fonts[added.id].family);
state.relink(scene,added.id,{locator:'fonts/display.woff2',mime:'font/woff2',fileName:'Display Font.woff2'});assert.equal(scene.fonts[added.id].locator,'fonts/display.woff2');assert.equal(scene.fonts[added.id].family,added.descriptor.family,'relink must preserve the stable CSS family');
assert.equal(state.findByFile(scene,'DISPLAY FONT.WOFF2'),added.id);
state.attach(scene,'title','system');assert.equal(scene.entities[0].fontId,undefined);assert.equal(scene.entities[0].fontFamily,'sans-serif');
console.log('✓ vNext Font State：外部连接、稳定 family、重连与系统字体回退合同通过');
