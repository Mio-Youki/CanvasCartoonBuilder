#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..'),source=readFileSync(resolve(root,'editor/vnext-exporter.js'),'utf8');
for(const name of ['frameTimes','png','pngFrames','spriteSheet','gif'])assert.match(source,new RegExp(`global\\.EditorVNextExporter=Object\\.freeze\\(\\{[^}]*${name}`),'v4 export public API must declare '+name);
assert.match(source,/ToSampoolRuntimeVNext\.createRuntime/,'v4 exports must instantiate the v4 Runtime');
assert.doesNotMatch(source,/HomeScene\s*\.|SceneExporter\s*\./,'v4 exports must not fall back to Legacy Runtime');
console.log('✓ v4 Exporter contract: fixed-time public API is isolated from Legacy Runtime');
