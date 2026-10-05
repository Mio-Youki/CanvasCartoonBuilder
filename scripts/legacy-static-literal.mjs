/** Parse a deliberately small, non-executable JavaScript object literal.
 * It exists only to recover configuration snapshots from known Legacy files.
 * Identifiers, calls, templates, spreads and functions are rejected. */
const fail=(message,index)=>{throw new Error(`${message}（字符 ${index}）`);};

class StaticLiteralParser {
  constructor(text){this.text=String(text||'');this.i=0;}
  skip(){while(this.i<this.text.length){if(/\s/.test(this.text[this.i])){this.i++;continue;}if(this.text.startsWith('//',this.i)){this.i=this.text.indexOf('\n',this.i);if(this.i<0)this.i=this.text.length;continue;}if(this.text.startsWith('/*',this.i)){const end=this.text.indexOf('*/',this.i+2);if(end<0)fail('未闭合注释',this.i);this.i=end+2;continue;}break;}}
  take(value){this.skip();if(!this.text.startsWith(value,this.i))return false;this.i+=value.length;return true;}
  expect(value){if(!this.take(value))fail(`期望「${value}」`,this.i);}
  string(){this.skip();const quote=this.text[this.i];if(quote!=="'"&&quote!=='\"')fail('期望字符串',this.i);this.i++;let out='';while(this.i<this.text.length){const char=this.text[this.i++];if(char===quote)return out;if(char==='\\'){const next=this.text[this.i++];const simple={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};if(next==='u'){const code=this.text.slice(this.i,this.i+4);if(!/^[0-9a-f]{4}$/i.test(code))fail('无效 Unicode 转义',this.i);out+=String.fromCharCode(parseInt(code,16));this.i+=4;}else out+=simple[next]??next;}else out+=char;}fail('未闭合字符串',this.i);}
  identifier(){this.skip();const match=/^[A-Za-z_$][\w$]*/.exec(this.text.slice(this.i));if(!match)fail('期望标识符',this.i);this.i+=match[0].length;return match[0];}
  number(){this.skip();const match=/^(?:\d+\.?(?:\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(this.text.slice(this.i));if(!match)fail('期望数值',this.i);this.i+=match[0].length;return Number(match[0]);}
  value(){this.skip();let value;if(this.take('{'))value=this.object(true);else if(this.take('['))value=this.array();else if(this.text[this.i]==="'"||this.text[this.i]==='\"')value=this.string();else if(this.take('(')){value=this.expression();this.expect(')');}else if(this.take('-'))value=-this.value();else if(/[\d.]/.test(this.text[this.i]||''))value=this.number();else{const word=this.identifier();if(word==='true')value=true;else if(word==='false')value=false;else if(word==='null')value=null;else fail(`不允许的标识符「${word}」`,this.i-word.length);}return value;}
  expression(){let value=this.value();for(;;){this.skip();const op=this.text[this.i];if(!['+','-','*','/'].includes(op))return value;this.i++;const right=this.value();if(op==='+')value+=right;else if(op==='-')value-=right;else if(op==='*')value*=right;else value/=right;}}
  array(){const out=[];this.skip();if(this.take(']'))return out;for(;;){out.push(this.expression());this.skip();if(this.take(']'))return out;this.expect(',');this.skip();if(this.take(']'))return out;}}
  object(opened=false){if(!opened)this.expect('{');const out={};this.skip();if(this.take('}'))return out;for(;;){this.skip();const key=this.text[this.i]==="'"||this.text[this.i]==='\"'?this.string():this.identifier();this.expect(':');out[key]=this.expression();this.skip();if(this.take('}'))return out;this.expect(',');this.skip();if(this.take('}'))return out;}}
  parse(){const value=this.expression();this.skip();if(this.i!==this.text.length)fail('对象字面量后存在不受支持的内容',this.i);return value;}
}

function skipStringOrComment(text,index){const quote=text[index];if(quote==="'"||quote==='\"'){let cursor=index+1;while(cursor<text.length){if(text[cursor]==='\\'){cursor+=2;continue;}if(text[cursor]===quote)return cursor+1;cursor++;}fail('未闭合字符串',index);}if(text.startsWith('//',index)){const end=text.indexOf('\n',index+2);return end<0?text.length:end+1;}if(text.startsWith('/*',index)){const end=text.indexOf('*/',index+2);if(end<0)fail('未闭合注释',index);return end+2;}return null;}

export function parseStaticObjectLiteral(source){return new StaticLiteralParser(source).parse();}
export function extractDeclaredStaticObject(source,name){
  const match=new RegExp(`(?:const|let|var)\\s+${String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*=\\s*\\{`,'m').exec(String(source||''));
  if(!match)return null;const text=String(source),start=match.index+match[0].lastIndexOf('{');let cursor=start,depth=0;
  while(cursor<text.length){const next=skipStringOrComment(text,cursor);if(next!=null){cursor=next;continue;}if(text[cursor]==='{')depth++;else if(text[cursor]==='}'&&!--depth){cursor++;break;}cursor++;}
  if(depth!==0)fail(`声明 ${name} 的对象未闭合`,start);const literal=text.slice(start,cursor);return Object.freeze({value:parseStaticObjectLiteral(literal),start,end:cursor});
}
