/* Minimal, deterministic ZIP (store-only) adapter for browser project packages. */
(function (global) {
  'use strict';
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  const bytes = value => typeof value === 'string' ? encoder.encode(value) : (value instanceof Uint8Array ? value : new Uint8Array(value || []));
  const join = parts => { const length=parts.reduce((sum,part)=>sum+part.length,0), result=new Uint8Array(length); let at=0; for(const part of parts){result.set(part,at);at+=part.length;}return result; };
  const crcTable = (() => { const out=new Uint32Array(256); for(let index=0;index<256;index+=1){let value=index;for(let bit=0;bit<8;bit+=1)value=value&1?(value>>>1)^0xedb88320:value>>>1;out[index]=value>>>0;}return out; })();
  const crc32 = data => { let value=0xffffffff; for(const byte of data)value=crcTable[(value^byte)&255]^(value>>>8); return (value^0xffffffff)>>>0; };
  const write16=(view,at,value)=>view.setUint16(at,value,true),write32=(view,at,value)=>view.setUint32(at,value>>>0,true);
  function pack(files) {
    const locals=[], directory=[], entries=[]; let offset=0;
    for (const file of files || []) {
      const name=encoder.encode(String(file.path||'').replace(/\\/g,'/')); if(!name.length)throw new Error('项目包中存在空文件名');
      const data=bytes(file.data), crc=crc32(data), local=new Uint8Array(30+name.length+data.length), view=new DataView(local.buffer);
      write32(view,0,0x04034b50);write16(view,4,20);write16(view,6,0);write16(view,8,0);write16(view,10,0);write16(view,12,0);write32(view,14,crc);write32(view,18,data.length);write32(view,22,data.length);write16(view,26,name.length);write16(view,28,0);local.set(name,30);local.set(data,30+name.length);locals.push(local);
      const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);write32(cv,0,0x02014b50);write16(cv,4,20);write16(cv,6,20);write16(cv,8,0);write16(cv,10,0);write16(cv,12,0);write16(cv,14,0);write32(cv,16,crc);write32(cv,20,data.length);write32(cv,24,data.length);write16(cv,28,name.length);write16(cv,30,0);write16(cv,32,0);write16(cv,34,0);write16(cv,36,0);write32(cv,38,0);write32(cv,42,offset);central.set(name,46);directory.push(central);entries.push({path:decoder.decode(name),offset,length:data.length,crc});offset+=local.length;
    }
    const directoryBytes=join(directory), trailer=new Uint8Array(22),tv=new DataView(trailer.buffer);write32(tv,0,0x06054b50);write16(tv,4,0);write16(tv,6,0);write16(tv,8,entries.length);write16(tv,10,entries.length);write32(tv,12,directoryBytes.length);write32(tv,16,offset);write16(tv,20,0);return join([...locals,directoryBytes,trailer]);
  }
  function unpack(input) {
    const archive=bytes(input), view=new DataView(archive.buffer,archive.byteOffset,archive.byteLength); let end=-1;
    for(let index=Math.max(0,archive.length-65557);index<=archive.length-22;index+=1)if(view.getUint32(index,true)===0x06054b50)end=index;
    if(end<0)throw new Error('不是有效的 ZIP 项目包'); const count=view.getUint16(end+10,true), directoryOffset=view.getUint32(end+16,true), files=[]; let at=directoryOffset;
    for(let index=0;index<count;index+=1){if(view.getUint32(at,true)!==0x02014b50)throw new Error('项目包目录损坏');const method=view.getUint16(at+10,true),size=view.getUint32(at+24,true),nameLength=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true),localOffset=view.getUint32(at+42,true),name=decoder.decode(archive.slice(at+46,at+46+nameLength));if(method!==0)throw new Error('项目包使用了当前浏览器不支持的压缩方式');if(view.getUint32(localOffset,true)!==0x04034b50)throw new Error(`项目文件「${name}」损坏`);const localName=view.getUint16(localOffset+26,true),localExtra=view.getUint16(localOffset+28,true),start=localOffset+30+localName+localExtra;files.push({path:name,data:archive.slice(start,start+size)});at+=46+nameLength+extra+comment;}
    return files;
  }
  global.EditorVNextProjectArchive=Object.freeze({pack,unpack,crc32});
})(typeof window !== 'undefined' ? window : globalThis);
