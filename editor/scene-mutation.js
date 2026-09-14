(function (global) {
  'use strict';

  function create(adapter) {
    adapter = adapter || {};
    if (typeof adapter.capture !== 'function') throw new Error('Scene Mutation requires capture()');
    if (typeof adapter.commit !== 'function') throw new Error('Scene Mutation requires commit()');
    const listeners = new Set();

    function emit(event) {
      listeners.forEach(listener => { try { listener(Object.freeze(event)); } catch (_) {} });
    }

    function run(label, operation, options) {
      if (typeof operation !== 'function') throw new Error('Mutation operation is required');
      options = options || {};
      const record = options.record !== false;
      const before = record ? adapter.capture() : null;
      emit({ phase: 'start', label, options });
      try {
        const result = operation();
        const after = record ? adapter.capture() : null;
        const changed = record ? before !== after : result !== false;
        if (changed && record) adapter.commit({ label, before, after, meta: options.meta || null });
        if (changed && typeof adapter.invalidate === 'function') adapter.invalidate(options);
        if (typeof adapter.refresh === 'function' && options.refresh !== false) adapter.refresh(options);
        emit({ phase: 'success', label, changed, result, options });
        return result;
      } catch (error) {
        if (record && before != null && typeof adapter.restore === 'function') adapter.restore(before);
        if (typeof adapter.refresh === 'function' && options.refresh !== false) adapter.refresh(options);
        emit({ phase: 'error', label, error, options });
        throw error;
      }
    }

    function begin(label, options) {
      const token = { label, options: options || {}, before: adapter.capture(), closed: false };
      emit({ phase: 'start', label, options: token.options, gesture: true });
      return token;
    }

    function commit(token, result) {
      if (!token || token.closed) return false;
      token.closed = true;
      const after = adapter.capture();
      const changed = token.before !== after;
      if (changed) adapter.commit({ label: token.label, before: token.before, after, meta: token.options.meta || null });
      if (changed && typeof adapter.invalidate === 'function') adapter.invalidate(token.options);
      if (typeof adapter.refresh === 'function' && token.options.refresh !== false) adapter.refresh(token.options);
      emit({ phase: 'success', label: token.label, changed, result, options: token.options, gesture: true });
      return changed;
    }

    function abandon(token) {
      if (!token || token.closed) return false;
      token.closed = true;
      emit({ phase: 'success', label: token.label, changed: false, result: null, options: token.options, gesture: true, abandoned: true });
      return true;
    }

    function rollback(token) {
      if (!token || token.closed) return false;
      token.closed = true;
      if (typeof adapter.restore !== 'function') throw new Error('Scene Mutation rollback requires restore()');
      adapter.restore(token.before);
      if (typeof adapter.refresh === 'function' && token.options.refresh !== false) adapter.refresh(token.options);
      emit({ phase: 'rollback', label: token.label, changed: false, result: null, options: token.options, gesture: true });
      return true;
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Mutation listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    return Object.freeze({ run, begin, commit, abandon, rollback, subscribe });
  }

  global.EditorSceneMutation = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
