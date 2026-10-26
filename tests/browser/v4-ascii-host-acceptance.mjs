/* Existing desktop binary/WebView may be selected with --tauri. No installer,
 * default entry, Rust source or persistent user settings are changed. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..'),desktop=process.argv.includes('--tauri');
const host=desktop?'tauri-webview':'edge-editor';
const errors=[];let browser,child,context,nativeShell=null;
const server=createServer((request,response)=>{
  try{
    const route=decodeURIComponent(new URL(request.url,'http://localhost').pathname),file=resolve(root,'.'+route);
    if(!file.startsWith(root+sep)||route.split('/').some(part=>part.startsWith('.'))){response.writeHead(403);response.end();return;}
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
    response.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');response.end(readFileSync(file));
  }catch{response.writeHead(404);response.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/img2asset-v4-classic.html?ascii-host-acceptance=1`;
try{
  let page;
  if(desktop){
    const exe=resolve(root,'src-tauri/target/release/patcharium.exe');assert.ok(existsSync(exe),'现有桌面二进制不存在');
    nativeShell={path:exe,sha256:createHash('sha256').update(readFileSync(exe)).digest('hex'),modifiedAt:statSync(exe).mtime.toISOString()};
    // Allocate an isolated temporary debugging port and WebView profile.
    const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
    const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
    mkdirSync(resolve(root,'.local'),{recursive:true});const profile=mkdtempSync(resolve(root,'.local/ascii-webview-'));
    child=spawn(exe,[],{cwd:root,windowsHide:true,stdio:'pipe',env:{...process.env,WEBVIEW2_USER_DATA_FOLDER:profile,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`}});
    const logs=[];child.stderr.on('data',data=>logs.push(data.toString()));child.on('error',error=>logs.push(String(error)));
    let endpoint;
    for(let i=0;i<80;i++){
      if(child.exitCode!==null)throw Error('桌面进程提前退出 '+child.exitCode+' '+logs.join(''));
      try{const result=await fetch(`http://127.0.0.1:${port}/json/version`);if(result.ok){endpoint=await result.json();break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    assert.ok(endpoint?.webSocketDebuggerUrl,'桌面WebView调试端口未就绪 '+logs.join(''));
    browser=await chromium.connectOverCDP(endpoint.webSocketDebuggerUrl);context=browser.contexts()[0];
    const pages=context.pages().filter(page=>!page.url().startsWith('devtools:'));assert.equal(pages.length,1,'需要唯一的测试桌面WebView');page=pages[0];
    console.log('Existing desktop WebView attached; original entry:',page.url());
  }else{
    const edge=[process.env.TOSAMPOOL_EDGE_PATH,'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find(file=>file&&existsSync(file));
    browser=await chromium.launch({executablePath:edge,headless:true});context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();
  }
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ToSampoolV4Workspace?.hasDocument&&typeof classicV4View!=='undefined'&&classicV4View&&window.ToSampoolRuntimeVNext?.modules.asciiGpuAnalysis);
  const environment=await page.evaluate(()=>{
    const gl=document.createElement('canvas').getContext('webgl'),ext=gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return{userAgent:navigator.userAgent,renderer,tauri:!!window.__TAURI_INTERNALS__,visibility:document.visibilityState,entry:location.pathname};
  });
  await page.addScriptTag({content:readFileSync(resolve(root,'tests/fixtures/ascii-editor-acceptance.js'),'utf8')});
  const glyphOnly=process.argv.includes('--glyphs');
  let functional,performance=null;
  if(glyphOnly){
    await page.addScriptTag({content:readFileSync(resolve(root,'tests/fixtures/ascii-reference-v1.js'),'utf8').replace('api.modules.ascii = Object.freeze(', 'global.AsciiGlyphReference = Object.freeze(')});
    await page.addScriptTag({content:readFileSync(resolve(root,'tests/fixtures/ascii-glyph-extension-check.js'),'utf8')});
    functional=await page.evaluate(async()=>{const {contactSheet,...result}=await AsciiGlyphExtensionCheck.run();return result;});
  }else{
    functional=await page.evaluate(()=>AsciiEditorAcceptance.functional());
    performance=await page.evaluate(()=>AsciiEditorAcceptance.performanceRun());
  }
  assert.deepEqual(errors,[]);
  if(desktop)assert.equal(environment.tauri,true,'测试页面不在原生Tauri宿主中');
  const report={host,environment,nativeShell,runtimeSha256:createHash('sha256').update(readFileSync(resolve(root,'home-scene-vnext.js'))).digest('hex'),functional,performance,errors,desktopBoundary:desktop?'Existing release shell + temporary localhost v4 frontend; not packaged-resource or native file-dialog acceptance.':null};
  writeFileSync(resolve(root,`docs/architecture/v4-ascii-${host}${glyphOnly?'-glyphs':''}-acceptance.json`),JSON.stringify(report,null,2)+'\n');
  console.log(host+' acceptance passed',JSON.stringify(report));
}finally{
  if(browser)await browser.close().catch(()=>{});
  if(child&&child.exitCode===null)child.kill(); // Only the process created by this test.
  await new Promise(resolve=>server.close(resolve));
}
