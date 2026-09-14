(function (global) {
  'use strict';

  function create() {
    const commands = new Map();
    const listeners = new Set();

    function emit(event) {
      listeners.forEach(listener => {
        try { listener(Object.freeze(event)); } catch (_) {}
      });
    }

    function register(id, definition) {
      if (!id || typeof id !== 'string') throw new Error('Command id is required');
      const normalized = typeof definition === 'function' ? { execute: definition } : definition || {};
      if (typeof normalized.execute !== 'function') throw new Error('Command execute handler is required: ' + id);
      if (commands.has(id)) throw new Error('Command already registered: ' + id);
      const record = Object.freeze({
        id,
        title: normalized.title || id,
        execute: normalized.execute,
        enabled: typeof normalized.enabled === 'function' ? normalized.enabled : () => true,
      });
      commands.set(id, record);
      emit({ phase: 'registered', id, command: describe(id) });
      return () => { if (commands.get(id) === record) commands.delete(id); };
    }

    function describe(id) {
      const command = commands.get(id);
      return command ? Object.freeze({ id: command.id, title: command.title }) : null;
    }

    function list() { return [...commands.keys()].map(describe); }

    function canExecute(id, payload) {
      const command = commands.get(id);
      if (!command) return false;
      try { return command.enabled(payload || {}) !== false; } catch (_) { return false; }
    }

    async function execute(id, payload, options) {
      const command = commands.get(id);
      if (!command) throw new Error('Unknown command: ' + id);
      if (!canExecute(id, payload)) throw new Error('Command is disabled: ' + id);
      const context = Object.freeze({ id, payload: payload || {}, source: options && options.source || 'api' });
      emit({ phase: 'start', id, context });
      try {
        const result = await command.execute(context);
        emit({ phase: 'success', id, context, result });
        return result;
      } catch (error) {
        emit({ phase: 'error', id, context, error });
        throw error;
      }
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Command listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    return Object.freeze({ register, describe, list, canExecute, execute, subscribe });
  }

  global.EditorCommandRegistry = Object.freeze({ create });
  if (!global.EditorCommands) global.EditorCommands = create();
})(typeof window !== 'undefined' ? window : globalThis);
