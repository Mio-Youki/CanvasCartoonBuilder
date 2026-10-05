#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),context={TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView};
new vm.Script(readFileSync(resolve(root,'editor/vnext-project-archive.js'),'utf8')).runInNewContext(context);
const original=[{path:'project.tosampool.json',data:'{"format":"tosampool-project/v1"}'},{path:'assets/a/source/0000.bin',data:new Uint8Array([0,1,2,255])}],archive=context.EditorVNextProjectArchive.pack(original),restored=context.EditorVNextProjectArchive.unpack(archive);
assert.equal(new TextDecoder().decode(restored[0].data),original[0].data);assert.deepEqual([...restored[1].data],[0,1,2,255]);assert.throws(()=>context.EditorVNextProjectArchive.unpack(new Uint8Array([1,2,3])),/ZIP/);
console.log('✓ v4 Project Archive：浏览器 ZIP 写入、恢复与损坏拒绝合同通过');
