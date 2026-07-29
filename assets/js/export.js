(() => {
  const DEFAULTS = Object.freeze({
    title: 'DocCraft Document',
    pageSize: 'A4',
    orientation: 'portrait',
    margin: '12mm',
    printBackground: true,
    closeAfterPrint: true,
    copyStyles: true
  });

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const collectStyles = () => [...document.querySelectorAll('link[rel="stylesheet"], style')]
    .map(node => node.outerHTML)
    .join('\n');

  const waitForImages = root => Promise.all(
    [...root.querySelectorAll('img')].map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    })
  );

  const waitForFonts = async documentRef => {
    if (documentRef.fonts?.ready) {
      try { await documentRef.fonts.ready; } catch (_) { /* browser fallback */ }
    }
  };

  const buildPrintCss = options => `
    @page {
      size: ${options.pageSize} ${options.orientation};
      margin: ${options.margin};
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: ${options.printBackground ? 'exact' : 'economy'};
      print-color-adjust: ${options.printBackground ? 'exact' : 'economy'};
    }
    [data-screen-only], .screen-only, .no-print { display: none !important; }
    [data-print-only], .print-only { display: initial !important; }
    [data-export-root] { width: 100%; }
    img { max-width: 100%; }
    table { border-collapse: collapse; }
    tr, img, blockquote, pre { break-inside: avoid; }
  `;

  const cloneForExport = source => {
    const clone = source.cloneNode(true);
    clone.setAttribute('data-export-root', '');
    clone.querySelectorAll('[data-screen-only], .screen-only, .no-print').forEach(node => node.remove());
    clone.querySelectorAll('input, textarea, select').forEach(control => {
      const replacement = document.createElement(control.tagName === 'TEXTAREA' ? 'div' : 'span');
      if (control.type === 'checkbox' || control.type === 'radio') {
        replacement.textContent = control.checked ? '✓' : '';
      } else if (control.tagName === 'SELECT') {
        replacement.textContent = control.selectedOptions[0]?.textContent || '';
      } else {
        replacement.textContent = control.value || '';
      }
      replacement.className = control.className;
      replacement.setAttribute('data-export-value', '');
      control.replaceWith(replacement);
    });
    return clone;
  };

  const createPrintWindow = options => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) throw new Error('The print window was blocked by the browser.');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(options.title)}</title>${options.copyStyles ? collectStyles() : ''}<style>${buildPrintCss(options)}${options.css || ''}</style></head><body></body></html>`);
    printWindow.document.close();
    return printWindow;
  };

  const prepare = async (source, customOptions = {}) => {
    if (!source) throw new Error('An export source element is required.');
    const options = { ...DEFAULTS, ...customOptions };
    const clone = cloneForExport(source);
    const printWindow = createPrintWindow(options);
    printWindow.document.body.appendChild(printWindow.document.importNode(clone, true));
    await waitForFonts(printWindow.document);
    await waitForImages(printWindow.document);
    return { printWindow, options };
  };

  const print = async (source, customOptions = {}) => {
    const detail = { source, options: { ...DEFAULTS, ...customOptions } };
    document.dispatchEvent(new CustomEvent('doccraft:before-export', { detail }));
    const { printWindow, options } = await prepare(source, customOptions);

    return new Promise(resolve => {
      let completed = false;
      const finish = () => {
        if (completed) return;
        completed = true;
        document.dispatchEvent(new CustomEvent('doccraft:after-export', { detail: { source, options } }));
        if (options.closeAfterPrint) printWindow.close();
        resolve();
      };

      printWindow.addEventListener('afterprint', finish, { once: true });
      printWindow.focus();
      printWindow.print();
      setTimeout(finish, 1500);
    });
  };

  const savePdf = async (source, customOptions = {}) => {
    document.dispatchEvent(new CustomEvent('doccraft:pdf-requested', {
      detail: { source, options: { ...DEFAULTS, ...customOptions } }
    }));
    return print(source, {
      ...customOptions,
      title: customOptions.title || document.title || DEFAULTS.title
    });
  };

  const bindButtons = (root = document) => {
    root.querySelectorAll('[data-print-target], [data-pdf-target]').forEach(button => {
      if (button.dataset.exportBound === 'true') return;
      button.dataset.exportBound = 'true';
      button.addEventListener('click', async event => {
        event.preventDefault();
        const selector = button.dataset.printTarget || button.dataset.pdfTarget;
        const source = selector ? document.querySelector(selector) : document.querySelector('[data-document-preview]');
        if (!source) {
          console.error(`Export target not found: ${selector || '[data-document-preview]'}`);
          return;
        }

        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        try {
          const options = {
            title: button.dataset.exportTitle || document.title,
            pageSize: button.dataset.pageSize || DEFAULTS.pageSize,
            orientation: button.dataset.orientation || DEFAULTS.orientation,
            margin: button.dataset.margin || DEFAULTS.margin
          };
          if (button.dataset.pdfTarget !== undefined) await savePdf(source, options);
          else await print(source, options);
        } catch (error) {
          console.error('Document export failed.', error);
          document.dispatchEvent(new CustomEvent('doccraft:export-error', { detail: { error } }));
        } finally {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => bindButtons());
  document.addEventListener('doccraft:form-rendered', () => bindButtons());

  window.DocCraftExport = Object.freeze({
    prepare,
    print,
    savePdf,
    bindButtons,
    cloneForExport
  });
})();
