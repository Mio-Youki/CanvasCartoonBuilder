/* v4 Scene mutation boundary with deterministic undo / redo snapshots. */
(function (global) {
  'use strict';

  function requireWorkspace(workspace) {
    if (!workspace || typeof workspace.mutate !== 'function' || typeof workspace.replace !== 'function' || typeof workspace.requireDocument !== 'function') throw new Error('vNext 变更器需要 EditorVNextWorkspace');
    if (!global.EditorVNextScene) throw new Error('vNext 变更器需要 EditorVNextScene');
  }
  function snapshot(workspace) { return global.EditorVNextScene.serialize(workspace.requireDocument()); }
  function parse(text) { return JSON.parse(text); }
  function create(workspace, options) {
    requireWorkspace(workspace);
    const limit = Math.max(1, +(options && options.limit) || 100);
    const undoStack = [], redoStack = [];
    function trim(stack) { while (stack.length > limit) stack.shift(); }
    function run(label, operation) {
      if (typeof operation !== 'function') throw new Error('vNext 变更操作必须是函数');
      const before = snapshot(workspace), result = workspace.mutate(operation), after = snapshot(workspace);
      if (before !== after) { undoStack.push({ label: String(label || '编辑场景'), before, after }); trim(undoStack); redoStack.length = 0; }
      return result;
    }
    /* Snapshot serialization intentionally removes the transient module scope.
       Restoring it with a freshly generated scope makes already trusted
       project Modules disappear from Runtime: the selection reads the restored
       document, while the old canvas keeps its last frame after render fails.
       A history operation is within one Workspace, so retain its scope. */
    function restore(text) { return workspace.replace(parse(text), { moduleScope:workspace.moduleScope }); }
    function undo() {
      const entry = undoStack.pop();
      if (!entry) return false;
      restore(entry.before); redoStack.push(entry); return entry.label;
    }
    function redo() {
      const entry = redoStack.pop();
      if (!entry) return false;
      restore(entry.after); undoStack.push(entry); return entry.label;
    }
    function clear() { undoStack.length = 0; redoStack.length = 0; }
    function begin(label) { return Object.freeze({ label:String(label || '编辑场景'), before:snapshot(workspace) }); }
    function commit(token) { if (!token || typeof token.before !== 'string') throw new Error('无效的手势事务'); const after = snapshot(workspace); if (token.before !== after) { undoStack.push({ label:token.label, before:token.before, after }); trim(undoStack); redoStack.length = 0; return true; } return false; }
    function cancel(token) { if (!token || typeof token.before !== 'string') throw new Error('无效的手势事务'); restore(token.before); return true; }
    return Object.freeze({ run, begin, commit, cancel, undo, redo, clear, get canUndo() { return undoStack.length > 0; }, get canRedo() { return redoStack.length > 0; }, get undoLabel() { return undoStack.length ? undoStack[undoStack.length - 1].label : null; }, get redoLabel() { return redoStack.length ? redoStack[redoStack.length - 1].label : null; } });
  }
  global.EditorVNextSceneMutation = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
