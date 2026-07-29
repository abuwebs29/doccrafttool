(() => {
  const TYPE_MAP = {
    text: 'text',
    email: 'email',
    phone: 'tel',
    number: 'number',
    currency: 'number',
    date: 'date',
    time: 'time',
    checkbox: 'checkbox',
    radio: 'radio',
    select: 'select',
    dropdown: 'select',
    textarea: 'textarea'
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const slugify = value => String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const normalizeOptions = options => (options || []).map(option => {
    if (typeof option === 'object') return { value: option.value, label: option.label ?? option.value };
    return { value: option, label: option };
  });

  const ruleString = field => {
    const rules = [];
    if (field.validation?.integer) rules.push('integer');
    if (field.validation?.currency || field.type === 'currency') rules.push('currency');
    if (field.validation?.minLength !== undefined) rules.push(`minLength:${field.validation.minLength}`);
    if (field.validation?.maxLength !== undefined) rules.push(`maxLength:${field.validation.maxLength}`);
    if (field.validation?.pattern) rules.push(`pattern:${field.validation.pattern}`);
    return rules.join('|');
  };

  const commonAttributes = field => {
    const attributes = [];
    attributes.push(`id="${escapeHtml(field.id)}"`);
    attributes.push(`name="${escapeHtml(field.name || field.id)}"`);
    if (field.state) attributes.push(`data-state="${escapeHtml(field.state)}"`);
    if (field.placeholder) attributes.push(`placeholder="${escapeHtml(field.placeholder)}"`);
    if (field.autocomplete) attributes.push(`autocomplete="${escapeHtml(field.autocomplete)}"`);
    if (field.required) attributes.push('required');
    if (field.disabled) attributes.push('disabled');
    if (field.readonly) attributes.push('readonly');
    if (field.min !== undefined) attributes.push(`min="${escapeHtml(field.min)}"`);
    if (field.max !== undefined) attributes.push(`max="${escapeHtml(field.max)}"`);
    if (field.step !== undefined) attributes.push(`step="${escapeHtml(field.step)}"`);
    if (field.minLength !== undefined) attributes.push(`minlength="${escapeHtml(field.minLength)}"`);
    if (field.maxLength !== undefined) attributes.push(`maxlength="${escapeHtml(field.maxLength)}"`);
    if (field.pattern) attributes.push(`pattern="${escapeHtml(field.pattern)}"`);
    const rules = ruleString(field);
    if (rules) attributes.push(`data-rules="${escapeHtml(rules)}"`);
    return attributes.join(' ');
  };

  const renderControl = field => {
    const type = TYPE_MAP[field.type] || 'text';
    const attrs = commonAttributes(field);

    if (type === 'textarea') {
      return `<textarea ${attrs} rows="${escapeHtml(field.rows || 4)}">${escapeHtml(field.defaultValue || '')}</textarea>`;
    }

    if (type === 'select') {
      const options = normalizeOptions(field.options);
      return `<select ${attrs}>${field.placeholder ? `<option value="">${escapeHtml(field.placeholder)}</option>` : ''}${options.map(option => `<option value="${escapeHtml(option.value)}"${String(option.value) === String(field.defaultValue ?? '') ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`;
    }

    if (type === 'checkbox') {
      return `<input type="checkbox" ${attrs}${field.defaultValue ? ' checked' : ''}>`;
    }

    if (type === 'radio') {
      return normalizeOptions(field.options).map((option, index) => {
        const optionId = `${field.id}-${slugify(option.value || index)}`;
        return `<label class="choice-control" for="${escapeHtml(optionId)}"><input type="radio" id="${escapeHtml(optionId)}" name="${escapeHtml(field.name || field.id)}" value="${escapeHtml(option.value)}"${field.state ? ` data-state="${escapeHtml(field.state)}"` : ''}${field.required ? ' required' : ''}${String(option.value) === String(field.defaultValue ?? '') ? ' checked' : ''}><span>${escapeHtml(option.label)}</span></label>`;
      }).join('');
    }

    const inputType = field.type === 'currency' ? 'number' : type;
    const currencyStep = field.type === 'currency' && field.step === undefined ? ' step="0.01" inputmode="decimal"' : '';
    return `<input type="${inputType}" ${attrs}${currencyStep}${field.defaultValue !== undefined ? ` value="${escapeHtml(field.defaultValue)}"` : ''}>`;
  };

  const renderField = field => {
    if (!field?.id || !field?.type) throw new Error('Each field requires an id and type.');
    const isChoice = ['checkbox', 'radio'].includes(field.type);
    const describedBy = field.help ? `${field.id}-help` : '';
    const conditional = field.visibleWhen
      ? ` data-visible-path="${escapeHtml(field.visibleWhen.path)}" data-visible-value="${escapeHtml(field.visibleWhen.equals)}"`
      : '';

    return `<div class="form-field form-field-${escapeHtml(field.type)}" data-field-id="${escapeHtml(field.id)}"${conditional}>
      ${field.type !== 'radio' ? `<label for="${escapeHtml(field.id)}">${escapeHtml(field.label || field.id)}${field.required ? ' <span aria-hidden="true">*</span>' : ''}</label>` : `<fieldset><legend>${escapeHtml(field.label || field.id)}${field.required ? ' <span aria-hidden="true">*</span>' : ''}</legend>`}
      ${isChoice && field.type === 'checkbox' ? `<div class="choice-control">${renderControl(field)}<span>${escapeHtml(field.checkboxLabel || field.label || field.id)}</span></div>` : renderControl({ ...field, describedBy })}
      ${field.help ? `<p class="field-help" id="${escapeHtml(field.id)}-help">${escapeHtml(field.help)}</p>` : ''}
      <p class="field-error" data-error-for="${escapeHtml(field.id)}" role="alert" hidden></p>
      ${field.type === 'radio' ? '</fieldset>' : ''}
    </div>`;
  };

  const renderSection = section => `<section class="form-section"${section.id ? ` id="${escapeHtml(section.id)}"` : ''}>
    ${section.title ? `<div class="form-section-heading"><h2>${escapeHtml(section.title)}</h2>${section.description ? `<p>${escapeHtml(section.description)}</p>` : ''}</div>` : ''}
    <div class="form-grid">${(section.fields || []).map(renderField).join('')}</div>
  </section>`;

  const render = (schema, target) => {
    if (!target) throw new Error('A target element is required.');
    const sections = Array.isArray(schema) ? [{ fields: schema }] : (schema.sections || [{ fields: schema.fields || [] }]);
    target.innerHTML = sections.map(renderSection).join('');
    target.dispatchEvent(new CustomEvent('doccraft:form-rendered', { bubbles: true, detail: { schema } }));
    return target;
  };

  const applyVisibility = (root, store) => {
    root.querySelectorAll('[data-visible-path]').forEach(wrapper => {
      const actual = store.get(wrapper.dataset.visiblePath);
      const expected = wrapper.dataset.visibleValue;
      const visible = String(actual) === String(expected);
      wrapper.hidden = !visible;
      wrapper.querySelectorAll('input, select, textarea').forEach(control => {
        control.disabled = !visible;
      });
    });
  };

  const mount = (schema, target, options = {}) => {
    render(schema, target);

    const store = options.store;
    if (store?.bind) {
      store.bind(target);
      applyVisibility(target, store);
      store.subscribe(() => applyVisibility(target, store), { immediate: false });
    }

    if (window.DocCraftValidation?.bindForm) {
      const form = target.matches('form') ? target : target.closest('form');
      if (form) window.DocCraftValidation.bindForm(form, options.validation || {});
    }

    return { target, store, schema };
  };

  const load = async (url, target, options = {}) => {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Unable to load form schema: ${response.status}`);
    const schema = await response.json();
    return mount(schema, target, options);
  };

  window.DocCraftForms = Object.freeze({
    renderField,
    renderSection,
    render,
    mount,
    load
  });
})();
