import {resolve} from 'node:path';
import {startHost} from '../host/effect-review-host.mjs';
import {codexAgent} from '../host/effect-review-agent.mjs';
const index=process.argv.indexOf('--codex'),executable=index<0?null:process.argv[index+1];
if(index>=0&&(!executable||executable.startsWith('--')))throw Error('--codex需要明确的CLI可执行文件路径');
const folder=resolve(import.meta.dirname,'../.local/effect-review');
const host=await startHost({agent:executable?codexAgent({executable,folder:resolve(folder,'agent')}):null});
console.log('效果审阅宿主：'+host.origin+'/examples/pattern-proposals/dual-ray/preview.html');
console.log('编辑器共享库：'+host.origin+'/img2asset-v4-classic.html');
console.log('Agent执行器：'+(executable?'已配置；备注确认后调用':'未配置；元数据交付仍自动处理，备注不会伪执行'));
// Shutdown is scoped to this exact service; never kill unrelated browser/server processes.
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await host.close();process.exit(0);});
