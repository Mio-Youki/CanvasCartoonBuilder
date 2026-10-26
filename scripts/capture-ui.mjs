// Project-owned launcher: preserve the external screenshot skill, choose a tested browser explicitly.
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const tool=join(homedir(),'.codex/skills/oil-ui-pro/scripts/shoot.mjs');
const browser=process.env.CHROME_PATH||[
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
].find(existsSync);
if(!existsSync(tool)||!browser||!existsSync(browser)){console.error('截图预检失败：缺少截图工具或浏览器。');process.exit(1);}
if(!process.argv[2]){console.error('用法：node scripts/capture-ui.mjs <URL> [shoot选项]');process.exit(1);}
console.log('截图浏览器：'+browser);
const child=spawn(process.execPath,[tool,...process.argv.slice(2)],{env:{...process.env,CHROME_PATH:browser},stdio:'inherit'});
child.on('error',e=>{console.error('截图启动失败：'+e.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
