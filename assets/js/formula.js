(() => {
  const getByPath = (object, path) => {
    if (!path) return object;
    return String(path).split('.').reduce((current, key) => current?.[key], object);
  };

  const toNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const flatten = values => values.flatMap(value => Array.isArray(value) ? flatten(value) : value);

  const FUNCTIONS = Object.freeze({
    SUM: (...values) => flatten(values).reduce((total, value) => total + toNumber(value), 0),
    AVG: (...values) => {
      const numbers = flatten(values).map(toNumber);
      return numbers.length ? numbers.reduce((total, value) => total + value, 0) / numbers.length : 0;
    },
    MIN: (...values) => Math.min(...flatten(values).map(toNumber)),
    MAX: (...values) => Math.max(...flatten(values).map(toNumber)),
    COUNT: (...values) => flatten(values).filter(value => value !== undefined && value !== null && value !== '').length,
    ROUND: (value, precision = 0) => {
      const factor = 10 ** toNumber(precision);
      return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
    },
    ABS: value => Math.abs(toNumber(value)),
    CEIL: value => Math.ceil(toNumber(value)),
    FLOOR: value => Math.floor(toNumber(value)),
    IF: (condition, truthy, falsy) => condition ? truthy : falsy
  });

  class Tokenizer {
    constructor(input) {
      this.input = String(input || '');
      this.index = 0;
      this.current = null;
      this.next();
    }

    next() {
      while (/\s/.test(this.input[this.index] || '')) this.index += 1;
      if (this.index >= this.input.length) return (this.current = { type: 'eof' });

      const rest = this.input.slice(this.index);
      const number = rest.match(/^(?:\d+\.?\d*|\.\d+)/);
      if (number) {
        this.index += number[0].length;
        return (this.current = { type: 'number', value: Number(number[0]) });
      }

      const string = rest.match(/^(["'])(.*?)\1/);
      if (string) {
        this.index += string[0].length;
        return (this.current = { type: 'string', value: string[2] });
      }

      const identifier = rest.match(/^[A-Za-z_$][A-Za-z0-9_.$]*/);
      if (identifier) {
        this.index += identifier[0].length;
        return (this.current = { type: 'identifier', value: identifier[0] });
      }

      const operator = rest.match(/^(>=|<=|==|!=|&&|\|\||[+\-*/%(),<>!])/);
      if (operator) {
        this.index += operator[0].length;
        return (this.current = { type: 'operator', value: operator[0] });
      }

      throw new SyntaxError(`Unexpected token near "${rest.slice(0, 12)}".`);
    }

    consume(value) {
      if (this.current.value !== value) throw new SyntaxError(`Expected "${value}".`);
      const token = this.current;
      this.next();
      return token;
    }
  }

  class Parser {
    constructor(expression, context) {
      this.tokens = new Tokenizer(expression);
      this.context = context || {};
    }

    parse() {
      const value = this.logicalOr();
      if (this.tokens.current.type !== 'eof') throw new SyntaxError('Unexpected trailing formula content.');
      return value;
    }

    logicalOr() {
      let value = this.logicalAnd();
      while (this.tokens.current.value === '||') {
        this.tokens.next();
        value = Boolean(value) || Boolean(this.logicalAnd());
      }
      return value;
    }

    logicalAnd() {
      let value = this.comparison();
      while (this.tokens.current.value === '&&') {
        this.tokens.next();
        value = Boolean(value) && Boolean(this.comparison());
      }
      return value;
    }

    comparison() {
      let value = this.additive();
      while (['>', '<', '>=', '<=', '==', '!='].includes(this.tokens.current.value)) {
        const operator = this.tokens.current.value;
        this.tokens.next();
        const right = this.additive();
        if (operator === '>') value = value > right;
        if (operator === '<') value = value < right;
        if (operator === '>=') value = value >= right;
        if (operator === '<=') value = value <= right;
        if (operator === '==') value = value == right; // intentional formula coercion
        if (operator === '!=') value = value != right; // intentional formula coercion
      }
      return value;
    }

    additive() {
      let value = this.multiplicative();
      while (['+', '-'].includes(this.tokens.current.value)) {
        const operator = this.tokens.current.value;
        this.tokens.next();
        const right = this.multiplicative();
        value = operator === '+' ? toNumber(value) + toNumber(right) : toNumber(value) - toNumber(right);
      }
      return value;
    }

    multiplicative() {
      let value = this.unary();
      while (['*', '/', '%'].includes(this.tokens.current.value)) {
        const operator = this.tokens.current.value;
        this.tokens.next();
        const right = toNumber(this.unary());
        if (operator === '*') value = toNumber(value) * right;
        if (operator === '/') value = right === 0 ? 0 : toNumber(value) / right;
        if (operator === '%') value = right === 0 ? 0 : toNumber(value) % right;
      }
      return value;
    }

    unary() {
      const operator = this.tokens.current.value;
      if (['+', '-', '!'].includes(operator)) {
        this.tokens.next();
        const value = this.unary();
        if (operator === '+') return toNumber(value);
        if (operator === '-') return -toNumber(value);
        return !value;
      }
      return this.primary();
    }

    primary() {
      const token = this.tokens.current;
      if (token.type === 'number' || token.type === 'string') {
        this.tokens.next();
        return token.value;
      }

      if (token.value === '(') {
        this.tokens.next();
        const value = this.logicalOr();
        this.tokens.consume(')');
        return value;
      }

      if (token.type === 'identifier') {
        this.tokens.next();
        const name = token.value;
        if (this.tokens.current.value === '(') return this.callFunction(name);
        if (name === 'true') return true;
        if (name === 'false') return false;
        if (name === 'null') return null;
        return this.resolvePath(name);
      }

      throw new SyntaxError(`Unexpected formula token "${token.value || token.type}".`);
    }

    callFunction(name) {
      this.tokens.consume('(');
      const args = [];
      while (this.tokens.current.value !== ')') {
        args.push(this.logicalOr());
        if (this.tokens.current.value !== ',') break;
        this.tokens.next();
      }
      this.tokens.consume(')');
      const fn = FUNCTIONS[name.toUpperCase()];
      if (!fn) throw new ReferenceError(`Unknown formula function "${name}".`);
      return fn(...args);
    }

    resolvePath(path) {
      if (path.includes('.*.')) {
        const [collectionPath, itemPath] = path.split('.*.');
        const collection = getByPath(this.context, collectionPath);
        return Array.isArray(collection) ? collection.map(item => getByPath(item, itemPath)) : [];
      }
      return getByPath(this.context, path);
    }
  }

  const evaluate = (expression, context = {}) => new Parser(expression, context).parse();

  class FormulaEngine extends EventTarget {
    constructor(store, formulas = {}, options = {}) {
      super();
      if (!store?.subscribe || !store?.set) throw new TypeError('A DocCraftState store is required.');
      this.store = store;
      this.formulas = { ...formulas };
      this.options = { precision: 6, ...options };
      this.running = false;
      this.unsubscribe = store.subscribe((state, detail) => {
        if (detail?.source === 'formula') return;
        this.recalculate(state);
      });
    }

    setFormulas(formulas = {}) {
      this.formulas = { ...formulas };
      this.recalculate(this.store.snapshot());
      return this;
    }

    recalculate(state = this.store.snapshot()) {
      if (this.running) return this;
      this.running = true;
      const results = {};
      const workingState = structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));

      try {
        Object.entries(this.formulas).forEach(([path, expression]) => {
          const value = evaluate(expression, workingState);
          const normalized = typeof value === 'number' && Number.isFinite(value)
            ? Number(value.toFixed(this.options.precision))
            : value;
          results[path] = normalized;
          const keys = path.split('.');
          let current = workingState;
          keys.slice(0, -1).forEach(key => {
            if (!current[key] || typeof current[key] !== 'object') current[key] = {};
            current = current[key];
          });
          current[keys.at(-1)] = normalized;
        });

        Object.entries(results).forEach(([path, value]) => {
          const current = getByPath(state, path);
          if (JSON.stringify(current) !== JSON.stringify(value)) {
            this.store.set(path, value, { source: 'formula', history: false });
          }
        });

        this.dispatchEvent(new CustomEvent('calculated', { detail: { results } }));
        document.dispatchEvent(new CustomEvent('doccraft:calculated', { detail: { results } }));
      } catch (error) {
        this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
        console.error('Formula calculation failed.', error);
      } finally {
        this.running = false;
      }
      return this;
    }

    destroy() {
      if (this.unsubscribe) this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  window.DocCraftFormula = Object.freeze({
    FormulaEngine,
    evaluate,
    functions: FUNCTIONS,
    create: (store, formulas, options) => new FormulaEngine(store, formulas, options)
  });
})();
