(() => {
  const clone = value => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const getByPath = (object, path) => {
    if (!path) return object;
    return String(path).split('.').reduce((current, key) => current?.[key], object);
  };

  const setByPath = (object, path, value) => {
    const keys = String(path).split('.').filter(Boolean);
    if (!keys.length) return object;
    let current = object;
    keys.slice(0, -1).forEach(key => {
      if (!current[key] || typeof current[key] !== 'object') current[key] = {};
      current = current[key];
    });
    current[keys.at(-1)] = value;
    return object;
  };

  const removeByPath = (object, path) => {
    const keys = String(path).split('.').filter(Boolean);
    const parent = keys.slice(0, -1).reduce((current, key) => current?.[key], object);
    if (parent && keys.length) delete parent[keys.at(-1)];
    return object;
  };

  const toInputValue = value => value === undefined || value === null ? '' : value;

  class DocCraftStore extends EventTarget {
    constructor(initialState = {}, options = {}) {
      super();
      this.options = {
        historyLimit: 50,
        autosaveDelay: 800,
        storageKey: '',
        ...options
      };
      this.state = clone(initialState);
      this.initialState = clone(initialState);
      this.history = [];
      this.future = [];
      this.bindings = new Set();
      this.autosaveTimer = null;
      this.batchDepth = 0;
      this.batchSnapshot = null;
    }

    get(path) {
      return clone(getByPath(this.state, path));
    }

    snapshot() {
      return clone(this.state);
    }

    set(path, value, meta = {}) {
      if (!path) throw new Error('A state path is required.');
      this.captureHistory(meta);
      setByPath(this.state, path, clone(value));
      this.commit({ type: 'set', path, value: clone(value), ...meta });
      return this;
    }

    update(patch, meta = {}) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new TypeError('State updates must be plain objects.');
      }
      this.captureHistory(meta);
      Object.entries(patch).forEach(([path, value]) => setByPath(this.state, path, clone(value)));
      this.commit({ type: 'update', paths: Object.keys(patch), ...meta });
      return this;
    }

    remove(path, meta = {}) {
      this.captureHistory(meta);
      removeByPath(this.state, path);
      this.commit({ type: 'remove', path, ...meta });
      return this;
    }

    replace(nextState, meta = {}) {
      this.captureHistory(meta);
      this.state = clone(nextState || {});
      this.commit({ type: 'replace', ...meta });
      return this;
    }

    reset(meta = {}) {
      return this.replace(this.initialState, { type: 'reset', ...meta });
    }

    batch(callback, meta = {}) {
      this.batchDepth += 1;
      if (this.batchDepth === 1) this.batchSnapshot = clone(this.state);
      try {
        callback(this);
      } finally {
        this.batchDepth -= 1;
        if (this.batchDepth === 0) {
          if (JSON.stringify(this.batchSnapshot) !== JSON.stringify(this.state)) {
            this.history.push(this.batchSnapshot);
            this.trimHistory();
            this.future = [];
            this.commit({ type: 'batch', ...meta });
          }
          this.batchSnapshot = null;
        }
      }
      return this;
    }

    captureHistory(meta = {}) {
      if (this.batchDepth || meta.history === false) return;
      this.history.push(clone(this.state));
      this.trimHistory();
      this.future = [];
    }

    trimHistory() {
      const overflow = this.history.length - this.options.historyLimit;
      if (overflow > 0) this.history.splice(0, overflow);
    }

    undo() {
      const previous = this.history.pop();
      if (!previous) return false;
      this.future.push(clone(this.state));
      this.state = previous;
      this.commit({ type: 'undo', history: false });
      return true;
    }

    redo() {
      const next = this.future.pop();
      if (!next) return false;
      this.history.push(clone(this.state));
      this.state = next;
      this.commit({ type: 'redo', history: false });
      return true;
    }

    canUndo() {
      return this.history.length > 0;
    }

    canRedo() {
      return this.future.length > 0;
    }

    subscribe(listener, options = {}) {
      const handler = event => listener(event.detail.state, event.detail);
      this.addEventListener('change', handler);
      if (options.immediate !== false) listener(this.snapshot(), { type: 'initial', state: this.snapshot() });
      return () => this.removeEventListener('change', handler);
    }

    commit(detail = {}) {
      this.syncBindings();
      this.scheduleAutosave();
      const payload = { ...detail, state: this.snapshot(), canUndo: this.canUndo(), canRedo: this.canRedo() };
      this.dispatchEvent(new CustomEvent('change', { detail: payload }));
      document.dispatchEvent(new CustomEvent('doccraft:state-change', { detail: payload }));
    }

    bind(root = document) {
      const elements = [...root.querySelectorAll('[data-state]')];
      elements.forEach(element => {
        if (this.bindings.has(element)) return;
        this.bindings.add(element);
        const path = element.dataset.state;
        const eventName = element.matches('input, textarea, select') ? 'input' : 'change';
        element.addEventListener(eventName, () => {
          let value;
          if (element.type === 'checkbox') value = element.checked;
          else if (element.type === 'number') value = element.value === '' ? '' : Number(element.value);
          else value = element.value;
          this.set(path, value, { source: 'binding' });
        });
      });
      this.syncBindings();
      return this;
    }

    syncBindings() {
      this.bindings.forEach(element => {
        if (!element.isConnected) {
          this.bindings.delete(element);
          return;
        }
        const value = getByPath(this.state, element.dataset.state);
        if (element.type === 'checkbox') element.checked = Boolean(value);
        else if ('value' in element && element.value !== String(toInputValue(value))) element.value = toInputValue(value);
      });

      document.querySelectorAll('[data-state-text]').forEach(element => {
        const value = getByPath(this.state, element.dataset.stateText);
        element.textContent = toInputValue(value);
      });

      document.querySelectorAll('[data-state-html]').forEach(element => {
        const value = getByPath(this.state, element.dataset.stateHtml);
        element.innerHTML = toInputValue(value);
      });
    }

    save(storageKey = this.options.storageKey) {
      if (!storageKey) return false;
      try {
        localStorage.setItem(storageKey, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state: this.state }));
        this.dispatchEvent(new CustomEvent('saved', { detail: { storageKey, state: this.snapshot() } }));
        return true;
      } catch (error) {
        console.error('Unable to save document draft.', error);
        return false;
      }
    }

    load(storageKey = this.options.storageKey) {
      if (!storageKey) return false;
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return false;
        const saved = JSON.parse(raw);
        if (!saved || typeof saved.state !== 'object') return false;
        this.state = clone(saved.state);
        this.history = [];
        this.future = [];
        this.commit({ type: 'load', storageKey, history: false });
        return true;
      } catch (error) {
        console.error('Unable to load document draft.', error);
        return false;
      }
    }

    clearSaved(storageKey = this.options.storageKey) {
      if (!storageKey) return false;
      localStorage.removeItem(storageKey);
      return true;
    }

    scheduleAutosave() {
      if (!this.options.storageKey) return;
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(() => this.save(), this.options.autosaveDelay);
    }

    destroy() {
      clearTimeout(this.autosaveTimer);
      this.bindings.clear();
    }
  }

  const createStore = (initialState, options) => new DocCraftStore(initialState, options);

  window.DocCraftState = Object.freeze({
    DocCraftStore,
    createStore,
    getByPath,
    setByPath
  });
})();
