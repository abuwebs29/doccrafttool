(() => {
  const getByPath = (object, path) => {
    if (!path) return object;
    return String(path).split('.').reduce((current, key) => current?.[key], object);
  };

  const isEmpty = value => value === undefined || value === null || value === '';

  const formatters = {
    text(value) {
      return isEmpty(value) ? '' : String(value);
    },
    number(value, options = {}) {
      const number = Number(value);
      if (!Number.isFinite(number)) return '';
      return new Intl.NumberFormat(options.locale || 'en-US', options).format(number);
    },
    currency(value, options = {}) {
      const number = Number(value);
      if (!Number.isFinite(number)) return '';
      return new Intl.NumberFormat(options.locale || 'en-US', {
        style: 'currency',
        currency: options.currency || 'USD',
        minimumFractionDigits: options.minimumFractionDigits ?? 2,
        maximumFractionDigits: options.maximumFractionDigits ?? 2
      }).format(number);
    },
    percent(value, options = {}) {
      const number = Number(value);
      if (!Number.isFinite(number)) return '';
      return new Intl.NumberFormat(options.locale || 'en-US', {
        style: 'percent',
        minimumFractionDigits: options.minimumFractionDigits ?? 0,
        maximumFractionDigits: options.maximumFractionDigits ?? 2
      }).format(options.rawPercent ? number / 100 : number);
    },
    date(value, options = {}) {
      if (isEmpty(value)) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(options.locale || 'en-US', {
        year: options.year || 'numeric',
        month: options.month || 'short',
        day: options.day || '2-digit'
      }).format(date);
    },
    datetime(value, options = {}) {
      if (isEmpty(value)) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(options.locale || 'en-US', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        ...options
      }).format(date);
    },
    uppercase(value) {
      return isEmpty(value) ? '' : String(value).toUpperCase();
    },
    lowercase(value) {
      return isEmpty(value) ? '' : String(value).toLowerCase();
    }
  };

  const parseOptions = element => {
    const options = {};
    if (element.dataset.locale) options.locale = element.dataset.locale;
    if (element.dataset.currency) options.currency = element.dataset.currency;
    if (element.dataset.minimumFractionDigits) options.minimumFractionDigits = Number(element.dataset.minimumFractionDigits);
    if (element.dataset.maximumFractionDigits) options.maximumFractionDigits = Number(element.dataset.maximumFractionDigits);
    if (element.dataset.rawPercent === 'true') options.rawPercent = true;
    return options;
  };

  const formatValue = (value, format = 'text', options = {}) => {
    const formatter = formatters[format] || formatters.text;
    return formatter(value, options);
  };

  const renderTextBindings = (root, state) => {
    root.querySelectorAll('[data-bind]').forEach(element => {
      const value = getByPath(state, element.dataset.bind);
      const formatted = formatValue(value, element.dataset.format || 'text', parseOptions(element));
      element.textContent = formatted || element.dataset.placeholder || '';
    });
  };

  const renderHtmlBindings = (root, state) => {
    root.querySelectorAll('[data-bind-html]').forEach(element => {
      const value = getByPath(state, element.dataset.bindHtml);
      element.innerHTML = isEmpty(value) ? (element.dataset.placeholder || '') : String(value);
    });
  };

  const renderAttributeBindings = (root, state) => {
    root.querySelectorAll('[data-bind-src]').forEach(element => {
      const value = getByPath(state, element.dataset.bindSrc);
      if (isEmpty(value)) element.removeAttribute('src');
      else element.setAttribute('src', value);
    });

    root.querySelectorAll('[data-bind-href]').forEach(element => {
      const value = getByPath(state, element.dataset.bindHref);
      if (isEmpty(value)) element.removeAttribute('href');
      else element.setAttribute('href', value);
    });

    root.querySelectorAll('[data-bind-title]').forEach(element => {
      const value = getByPath(state, element.dataset.bindTitle);
      if (isEmpty(value)) element.removeAttribute('title');
      else element.setAttribute('title', value);
    });
  };

  const renderVisibility = (root, state) => {
    root.querySelectorAll('[data-show]').forEach(element => {
      element.hidden = !Boolean(getByPath(state, element.dataset.show));
    });

    root.querySelectorAll('[data-hide]').forEach(element => {
      element.hidden = Boolean(getByPath(state, element.dataset.hide));
    });

    root.querySelectorAll('[data-show-if]').forEach(element => {
      const expression = element.dataset.showIf;
      const separatorIndex = expression.indexOf('=');
      if (separatorIndex === -1) return;
      const path = expression.slice(0, separatorIndex).trim();
      const expected = expression.slice(separatorIndex + 1).trim();
      element.hidden = String(getByPath(state, path)) !== expected;
    });
  };

  const renderRepeaters = (root, state) => {
    root.querySelectorAll('[data-repeat]').forEach(container => {
      const items = getByPath(state, container.dataset.repeat);
      const template = container.querySelector(':scope > template[data-repeat-template]');
      if (!template) return;

      container.querySelectorAll(':scope > [data-repeat-item]').forEach(node => node.remove());
      if (!Array.isArray(items)) return;

      items.forEach((item, index) => {
        const fragment = template.content.cloneNode(true);
        fragment.querySelectorAll('[data-bind]').forEach(element => {
          const path = element.dataset.bind;
          const value = path === '$index' ? index : getByPath(item, path);
          const formatted = formatValue(value, element.dataset.format || 'text', parseOptions(element));
          element.textContent = formatted || element.dataset.placeholder || '';
        });
        fragment.querySelectorAll('[data-bind-html]').forEach(element => {
          const value = getByPath(item, element.dataset.bindHtml);
          element.innerHTML = isEmpty(value) ? '' : String(value);
        });
        [...fragment.children].forEach(child => child.dataset.repeatItem = '');
        container.appendChild(fragment);
      });
    });
  };

  class PreviewRenderer extends EventTarget {
    constructor(root, options = {}) {
      super();
      if (!root) throw new Error('A preview root element is required.');
      this.root = root;
      this.options = options;
      this.store = null;
      this.unsubscribe = null;
      this.state = {};
    }

    connect(store) {
      this.disconnect();
      this.store = store;
      if (!store?.subscribe) throw new TypeError('A DocCraftState store is required.');
      this.unsubscribe = store.subscribe(state => this.render(state));
      return this;
    }

    disconnect() {
      if (this.unsubscribe) this.unsubscribe();
      this.unsubscribe = null;
      this.store = null;
      return this;
    }

    render(state = this.state) {
      this.state = state || {};
      const beforeDetail = { state: this.state, root: this.root, renderer: this };
      this.dispatchEvent(new CustomEvent('beforeRender', { detail: beforeDetail }));
      this.root.dispatchEvent(new CustomEvent('doccraft:before-render', { bubbles: true, detail: beforeDetail }));

      renderTextBindings(this.root, this.state);
      renderHtmlBindings(this.root, this.state);
      renderAttributeBindings(this.root, this.state);
      renderVisibility(this.root, this.state);
      renderRepeaters(this.root, this.state);

      const detail = { state: this.state, root: this.root, renderer: this };
      this.dispatchEvent(new CustomEvent('render', { detail }));
      this.root.dispatchEvent(new CustomEvent('doccraft:render', { bubbles: true, detail }));
      requestAnimationFrame(() => {
        this.dispatchEvent(new CustomEvent('afterRender', { detail }));
        this.root.dispatchEvent(new CustomEvent('doccraft:after-render', { bubbles: true, detail }));
      });
      return this;
    }

    destroy() {
      this.disconnect();
      this.state = {};
    }
  }

  const create = (root, options) => new PreviewRenderer(root, options);

  const mount = (root, store, options = {}) => create(root, options).connect(store);

  window.DocCraftPreview = Object.freeze({
    PreviewRenderer,
    create,
    mount,
    formatters,
    formatValue,
    getByPath
  });
})();
