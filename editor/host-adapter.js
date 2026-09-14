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
      capabilities: Object.freeze({ directWrite: !!global.showSaveFilePicker, batchWrite: true, projectDirectory: false, persistentAssets: false, nativeEncoding: false }),
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
      async pickAssets(options) { options = options || {}; return fileInput(options.accept || 'image/*', options.multiple !== false); },
      async readDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error || new Error('文件读取失败')); reader.readAsDataURL(file); }); },
    });
  }
  const supplied = global.__PATCHARIUM_HOST__;
  global.EditorHost = supplied && supplied.openText && supplied.saveFile ? supplied : createBrowserHost();
})(typeof window !== 'undefined' ? window : globalThis);
