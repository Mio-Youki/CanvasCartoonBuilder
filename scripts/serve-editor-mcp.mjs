import {createInterface} from 'node:readline';
import {createMcpReadAdapter} from '../host/editor-mcp-read-adapter.mjs';
const origin=new URL(process.env.TOSAMPOOL_REVIEW_HOST||'http://127.0.0.1:8780/');
if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('MCP仅可连接明确的本机审阅宿主');
try{
  const bootstrap=await fetch(new URL('/__effect-review/bootstrap',origin),{signal:AbortSignal.timeout(5000)});if(!bootstrap.ok)throw Error('审阅宿主不可用');const {token}=await bootstrap.json();
  async function get(path){const r=await fetch(new URL('/__effect-review/'+path,origin),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(5000)}),value=await r.json();if(!r.ok)throw Error(value.error||'读取失败');return value;}
  const adapter=createMcpReadAdapter({capabilities:()=>get('capabilities'),listReviews:({limit=20,status}={})=>get('jobs?limit='+limit+(status?'&status='+encodeURIComponent(status):'')),readReview:id=>get('jobs/'+id),readDelivery:id=>get('jobs/'+id+'/delivery')});
  const lines=createInterface({input:process.stdin,crlfDelay:Infinity});let pending=Promise.resolve();
  lines.on('line',line=>{pending=pending.then(async()=>{let response;try{if(Buffer.byteLength(line)>1024*1024)throw Error('request too large');response=await adapter.dispatch(JSON.parse(line));}catch{response={jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}};}if(response)process.stdout.write(JSON.stringify(response)+'\n');});});
}catch(e){process.stderr.write('ToSampool MCP启动失败：'+e.message+'\n');process.exitCode=1;}
