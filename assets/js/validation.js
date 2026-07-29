(() => {
  const DEFAULT_MESSAGES = {
    required: 'This field is required.',
    email: 'Enter a valid email address.',
    phone: 'Enter a valid phone number.',
    number: 'Enter a valid number.',
    integer: 'Enter a whole number.',
    currency: 'Enter a valid amount.',
    date: 'Enter a valid date.',
    min: value => `Enter a value of at least ${value}.`,
    max: value => `Enter a value no greater than ${value}.`,
    minLength: value => `Enter at least ${value} characters.`,
    maxLength: value => `Enter no more than ${value} characters.`,
    pattern: 'Enter a value in the required format.'
  };

  const isEmpty = value => value === undefined || value === null || String(value).trim() === '';
  const asNumber = value => {
    if (typeof value === 'number') return value;
    const normalized = String(value ?? '').replace(/[$,\s]/g, '');
    return normalized === '' ? NaN : Number(normalized);
  };

  const rules = {
    required: value => !isEmpty(value),
    email: value => isEmpty(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()),
    phone: value => isEmpty(value) || /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,}$/.test(String(value).trim()),
    number: value => isEmpty(value) || Number.isFinite(asNumber(value)),
    integer: value => isEmpty(value) || Number.isInteger(asNumber(value)),
    currency: value => isEmpty(value) || /^-?\d+(?:\.\d{1,2})?$/.test(String(value).replace(/[$,\s]/g, '')),
    date: value => isEmpty(value) || !Number.isNaN(Date.parse(value)),
    min: (value, expected) => isEmpty(value) || asNumber(value) >= Number(expected),
    max: (value, expected) => isEmpty(value) || asNumber(value) <= Number(expected),
    minLength: (value, expected) => isEmpty(value) || String(value).length >= Number(expected),
    maxLength: (value, expected) => isEmpty(value) || String(value).length <= Number(expected),
    pattern: (value, expected) => isEmpty(value) || new RegExp(expected).test(String(value))
  };

  const getMessage = (ruleName, expected, customMessage) => {
    if (customMessage) return customMessage;
    const message = DEFAULT_MESSAGES[ruleName] || 'Enter a valid value.';
    return typeof message === 'function' ? message(expected) : message;
  };

  const normalizeRule = rule => {
    if (typeof rule === 'string') return { name: rule, value: true };
    if (Array.isArray(rule)) return { name: rule[0], value: rule[1], message: rule[2] };
    return rule || {};
  };

  const validateValue = (value, ruleList = []) => {
    const errors = [];

    for (const rawRule of ruleList) {
      const rule = normalizeRule(rawRule);
      const validator = rules[rule.name];
      if (!validator) {
        console.warn(`Unknown validation rule: ${rule.name}`);
        continue;
      }

      if (!validator(value, rule.value)) {
        errors.push({
          rule: rule.name,
          message: getMessage(rule.name, rule.value, rule.message)
        });
        if (rule.stop !== false) break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      firstError: errors[0]?.message || ''
    };
  };

  const rulesFromElement = element => {
    const elementRules = [];
    if (element.required) elementRules.push('required');
    if (element.type === 'email') elementRules.push('email');
    if (element.type === 'tel') elementRules.push('phone');
    if (element.type === 'number') elementRules.push('number');
    if (element.type === 'date') elementRules.push('date');
    if (element.min !== '') elementRules.push(['min', element.min]);
    if (element.max !== '') elementRules.push(['max', element.max]);
    if (element.minLength > -1) elementRules.push(['minLength', element.minLength]);
    if (element.maxLength > -1) elementRules.push(['maxLength', element.maxLength]);
    if (element.pattern) elementRules.push(['pattern', element.pattern]);

    const additional = element.dataset.rules;
    if (additional) {
      additional.split('|').map(value => value.trim()).filter(Boolean).forEach(entry => {
        const [name, expected] = entry.split(':');
        elementRules.push(expected === undefined ? name : [name, expected]);
      });
    }

    return elementRules;
  };

  const getErrorElement = element => {
    const id = element.id || element.name;
    if (!id) return null;
    let error = document.querySelector(`[data-error-for="${CSS.escape(id)}"]`);
    if (!error) {
      error = document.createElement('p');
      error.dataset.errorFor = id;
      error.className = 'field-error';
      error.setAttribute('role', 'alert');
      error.hidden = true;
      element.insertAdjacentElement('afterend', error);
    }
    return error;
  };

  const showFieldResult = (element, result) => {
    const error = getErrorElement(element);
    element.setAttribute('aria-invalid', String(!result.valid));

    if (!error) return result;
    if (result.valid) {
      error.textContent = '';
      error.hidden = true;
      element.removeAttribute('aria-describedby');
    } else {
      if (!error.id) error.id = `${element.id || element.name}-error`;
      error.textContent = result.firstError;
      error.hidden = false;
      element.setAttribute('aria-describedby', error.id);
    }
    return result;
  };

  const validateField = (element, customRules) => {
    const result = validateValue(element.value, customRules || rulesFromElement(element));
    return showFieldResult(element, result);
  };

  const validateForm = (form, options = {}) => {
    const fields = [...form.querySelectorAll('input, select, textarea')]
      .filter(element => !element.disabled && element.type !== 'button' && element.type !== 'submit' && element.type !== 'reset');
    const results = fields.map(field => ({ field, result: validateField(field) }));
    const invalid = results.filter(item => !item.result.valid);

    if (invalid.length && options.focus !== false) invalid[0].field.focus();

    form.dispatchEvent(new CustomEvent('doccraft:validation', {
      bubbles: true,
      detail: {
        valid: invalid.length === 0,
        invalidFields: invalid.map(item => item.field)
      }
    }));

    return {
      valid: invalid.length === 0,
      invalidFields: invalid.map(item => item.field),
      results
    };
  };

  const bindForm = (form, options = {}) => {
    const validateOn = options.validateOn || 'blur';
    form.noValidate = true;

    form.addEventListener(validateOn, event => {
      const field = event.target.closest('input, select, textarea');
      if (field && form.contains(field)) validateField(field);
    }, true);

    form.addEventListener('input', event => {
      const field = event.target.closest('input, select, textarea');
      if (field?.getAttribute('aria-invalid') === 'true') validateField(field);
    });

    form.addEventListener('submit', event => {
      const result = validateForm(form, options);
      if (!result.valid) event.preventDefault();
    });

    return form;
  };

  const bindAll = (selector = 'form[data-validate]') => {
    document.querySelectorAll(selector).forEach(form => bindForm(form));
  };

  window.DocCraftValidation = Object.freeze({
    rules,
    validateValue,
    validateField,
    validateForm,
    bindForm,
    bindAll
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bindAll(), { once: true });
  } else {
    bindAll();
  }
})();
