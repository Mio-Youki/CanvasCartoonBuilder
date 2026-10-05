import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..'),sandbox={};
new vm.Script(readFileSync(resolve(root,'editor/vnext-agent-reference.js'),'utf8'),{filename:'vnext-agent-reference.js'}).runInNewContext(sandbox);
const api=sandbox.EditorVNextAgentReference,scene={assets:{photo:{name:'参考照片',width:640,height:360,mime:'image/jpeg',locator:'data:image/jpeg;base64,AA==',recipe:{width:320,height:180}}}};
assert.deepEqual(JSON.parse(JSON.stringify(api.descriptor(scene,'photo'))),{assetId:'photo',name:'参考照片',width:640,height:360,mime:'image/jpeg',recipe:{width:320,height:180},frames:1});
assert.throws(()=>api.descriptor({assets:{seq:{frames:[{locator:'a'},{locator:'b'}]}}},'seq'),/静态图片/);
const frozen=api.validate({format:api.FORMAT,version:2,id:'reference-photo',assetId:'photo',name:'参考照片',role:'composition',width:320,height:180,mime:'image/png',source:'processed-asset',dataUrl:'data:image/png;base64,AA=='});
assert.equal(frozen.assetId,'photo');assert.equal(frozen.role,'composition');assert.equal(frozen.useAsMaterial,false);assert.throws(()=>api.validate({format:api.FORMAT,assetId:'photo'}),/有效的冻结图片参考/);
console.log('✓ v4 Agent 图片参考：静态素材边界、处理后参考格式与多帧拒绝合同通过');
