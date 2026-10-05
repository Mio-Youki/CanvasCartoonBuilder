(function (global) {
  'use strict';
  function fileInput(accept, multiple) {
    return new Promise(resolve => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = accept || ''; input.multiple = !!multiple;
      input.style.display = 'none'; document.body.appendChild(input);
      const done = files => { input.remove(); resolve(files); };
      input.addEventListener('change', () => done([...input.files]), { once: true });
      input.addEventListener('cancel', () => done([]), { once: true });
      input.click();
    });
  }
  function download(data, name, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { mode: 'download', name };
  }
  function createBrowserHost() {
    return Object.freeze({
      kind: 'browser',
      capabilities: Object.freeze({ directWrite: !!global.showSaveFilePicker, batchWrite: true, projectDirectory: false, projectPackage: true, persistentAssets: false, nativeEncoding: false }),
      async openText(options) {
        options = options || {}; let files = [];
        if (global.showOpenFilePicker) {
          try { const handles = await global.showOpenFilePicker({ multiple: false, types: options.types }); files = handles.length ? [await handles[0].getFile()] : []; }
          catch (error) { if (error && error.name === 'AbortError') return null; throw error; }
        } else files = await fileInput(options.accept || '.js,.json,text/javascript,application/json', false);
        if (!files.length) return null; const file = files[0]; return { name: file.name, text: await file.text(), file };
      },
      async saveFile(options) {
        options = options || {}; const name = options.name || 'untitled.bin', mime = options.mime || 'application/octet-stream';
        const blob = options.data instanceof Blob ? options.data : new Blob([options.data == null ? '' : options.data], { type: mime });
        if (global.showSaveFilePicker) {
          try {
            const ext = options.ext || (name.match(/\.[^.]+$/) || [''])[0];
            const handle = await global.showSaveFilePicker({ suggestedName: name, types: [{ description: options.description || 'File', accept: { [mime]: ext ? [ext] : ['.bin'] } }] });
            const writable = await handle.createWritable(); await writable.write(blob); await writable.close();
            return { mode: 'direct', name: handle.name || name };
          } catch (error) { if (error && error.name === 'AbortError') return null; throw error; }
        }
        return download(blob, name, mime);
      },
      async saveBatch(options) {
        options = options || {};
        const artifacts = Array.isArray(options.artifacts) ? options.artifacts : [];
        return artifacts.map(item => download(item.data, item.name, item.mime));
      },
      async saveProject(options) {
        options = options || {};
        if (!global.EditorVNextProjectArchive) throw new Error('项目包归档器尚未加载');
        const archive = global.EditorVNextProjectArchive.pack(options.files || []);
        return this.saveFile({ kind:'project', name:options.name || 'untitled.tosampool.zip', ext:'.zip', mime:'application/zip', description:'ToSampool Project', data:archive });
      },
      async openProject() {
        let files = [];
        if (global.showOpenFilePicker) {
          try { const handles = await global.showOpenFilePicker({ multiple:false, types:[{ description:'ToSampool Project', accept:{ 'application/zip':['.zip'] } },{ description:'ToSampool Scene Snapshot', accept:{ 'application/json':['.json'] } }] }); files = handles.length ? [await handles[0].getFile()] : []; }
          catch (error) { if (error && error.name === 'AbortError') return null; throw error; }
        } else files = await fileInput('.zip,.json,application/zip,application/json', false);
        if (!files.length) return null;
        const file = files[0], data = new Uint8Array(await file.arrayBuffer());
        if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
          if (!global.EditorVNextProjectArchive) throw new Error('项目包归档器尚未加载');
          return { kind:'project', name:file.name, files:global.EditorVNextProjectArchive.unpack(data), file };
        }
        const text = await file.text();
        try {
          const document=JSON.parse(text);
          // A raw project root is useful during Agent/Codex experiments where
          // the complete Draft Package is a directory, not an archive yet.
          // Treat it as a one-file project package rather than accidentally
          // passing tosampool-project/v1 to the Scene-only workspace.
          if(document && document.format==='tosampool-project/v1')return { kind:'project', name:file.name, files:[{path:'project.tosampool.json',data,mime:'application/json'}], file };
          return { kind:'scene', name:file.name, text, document, file };
        }
        catch (_) { throw new Error('请选择 ToSampool 项目包或有效的 Scene JSON'); }
      },
      async pickAssets(options) { options = options || {}; return fileInput(options.accept || 'image/*', options.multiple !== false); },
      async readDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error || new Error('文件读取失败')); reader.readAsDataURL(file); }); },
    });
  }
  const supplied = global.__PATCHARIUM_HOST__;
  global.EditorHost = supplied && supplied.openText && supplied.saveFile ? supplied : createBrowserHost();
})(typeof window !== 'undefined' ? window : globalThis);
