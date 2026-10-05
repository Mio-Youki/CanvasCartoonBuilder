#!/usr/bin/env node
import assert from 'node:assert/strict';
import { parseStaticObjectLiteral, extractDeclaredStaticObject } from '../scripts/legacy-static-literal.mjs';
import { extractLegacyDefaultSnapshot } from '../scripts/extract-legacy-default-snapshot.mjs';

assert.deepEqual(parseStaticObjectLiteral('{rate: 6 / 7, name:"cab\\\"in", flags:[true,false,null], nested:{x:-2}}'),{rate:6/7,name:'cab"in',flags:[true,false,null],nested:{x:-2}});
assert.equal(extractDeclaredStaticObject('/* a */ const SAMPLE = { a: 3 / 4, label: "{safe}" };','SAMPLE').value.a,.75);
assert.throws(()=>parseStaticObjectLiteral('{value: makeThing()}'),/不允许的标识符|对象字面量后/);
assert.deepEqual(extractLegacyDefaultSnapshot('const DEFAULT_HOME_SCENE={w:4,h:2,blink:{duty:6/7}};'),{w:4,h:2,blink:{duty:6/7}});
console.log('✓ Legacy 静态字面量提取：只接受数据/算术，不执行 JS 通过');
