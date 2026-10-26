import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdirSync,mkdtempSync} from 'node:fs';
import {resolve} from 'node:path';
import {startHost} from '../host/effect-review-host.mjs';
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'.local'),{recursive:true});
const host=await startHost({port:0,folder:mkdtempSync(resolve(root,'.local/mcp-stdio-test-'))});
const candidate=[...host.candidates.values()][0],record={format:'tosampool-effect-review/v1',subject:candidate.subject,review:{name:candidate.name,labels:{},notes:{},note:'',defaults:null,confirmation:{decision:'approve-proposal',at:new Date().toISOString()}},preview:{},transport:'test'};
const job=host.jobs.submit(record),child=spawn(process.execPath,[resolve(root,'scripts/serve-editor-mcp.mjs')],{env:{...process.env,TOSAMPOOL_REVIEW_HOST:host.origin},stdio:['pipe','pipe','pipe'],windowsHide:true});
const pending=new Map();let serial=0,stderr='';child.stderr.on('data',d=>stderr+=d);
const lines=createInterface({input:child.stdout});lines.on('line',line=>{const value=JSON.parse(line);pending.get(value.id)?.(value);pending.delete(value.id);});
function rpc(method,params){const id=++serial;return new Promise((ok,no)=>{const timer=setTimeout(()=>{pending.delete(id);no(Error('MCP等待超时 '+stderr));},10000);pending.set(id,value=>{clearTimeout(timer);ok(value);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
try{
  const init=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}});assert.equal(init.result.serverInfo.name,'tosampool-editor-read');
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  assert.equal((await rpc('tools/list',{})).result.tools.length,4);
  const rows=await rpc('tools/call',{name:'tosampool_list_reviews',arguments:{}});assert.equal(rows.result.structuredContent.data[0].id,job.id);
  const read=await rpc('tools/call',{name:'tosampool_read_review',arguments:{jobId:job.id}});assert.equal(read.result.structuredContent.data.record.review.name,candidate.name);
  const caps=await rpc('tools/call',{name:'tosampool_capabilities',arguments:{}});assert.equal(caps.result.structuredContent.data.harnesses.length,0);assert.equal(caps.result.structuredContent.data.editor.canvasRead,false);
  console.log('✓ 真实MCP stdio子进程→已授权本机HTTP→同一操作服务→已确认修订；未调用模型或注册用户MCP配置');
}finally{child.kill();lines.close();await host.close();}
