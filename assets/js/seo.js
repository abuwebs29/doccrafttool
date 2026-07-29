(() => {
  const SITE_NAME = 'DocCraftTools';
  const SITE_URL = 'https://doccrafttools.com';
  const REGISTRY_URL = '/assets/data/documents.json';

  const normalizePath = value => {
    const pathname = String(value || '/').split('?')[0].split('#')[0];
    if (pathname === '/') return '/';
    return `/${pathname.replace(/^\/+|\/+$/g, '')}/`;
  };

  const setMeta = (selector, attribute, value) => {
    if (!value) return;
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement('meta');
      const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
      if (!match) return;
      element.setAttribute(match[1], match[2]);
      document.head.appendChild(element);
    }
    element.setAttribute(attribute, value);
  };

  const setCanonical = value => {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = value;
  };

  const setJsonLd = (id, data) => {
    let script = document.head.querySelector(`script[data-seo-schema="${id}"]`);
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoSchema = id;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  };

  const buildBreadcrumbs = documentEntry => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Documents',
        item: `${SITE_URL}/tools/`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: documentEntry.title,
        item: `${SITE_URL}${documentEntry.url}`
      }
    ]
  });

  const buildApplicationSchema = documentEntry => ({
    '@context': 'https://schema.org',
    '@type': documentEntry.type === 'calculator' ? 'WebApplication' : 'SoftwareApplication',
    name: documentEntry.title,
    description: documentEntry.description,
    url: `${SITE_URL}${documentEntry.url}`,
    applicationCategory: documentEntry.type === 'calculator' ? 'FinanceApplication' : 'BusinessApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL
    }
  });

  const applyEntry = documentEntry => {
    const canonical = `${SITE_URL}${documentEntry.url}`;
    const title = `${documentEntry.title} | ${SITE_NAME}`;

    document.title = title;
    setCanonical(canonical);
    setMeta('meta[name="description"]', 'content', documentEntry.description);
    setMeta('meta[name="keywords"]', 'content', (documentEntry.keywords || []).join(', '));
    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[property="og:site_name"]', 'content', SITE_NAME);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', documentEntry.description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', documentEntry.description);

    setJsonLd('webpage', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: documentEntry.title,
      description: documentEntry.description,
      url: canonical,
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL
      }
    });
    setJsonLd('application', buildApplicationSchema(documentEntry));
    setJsonLd('breadcrumbs', buildBreadcrumbs(documentEntry));

    document.documentElement.dataset.seoReady = 'true';
    document.dispatchEvent(new CustomEvent('doccraft:seo-ready', { detail: documentEntry }));
  };

  const init = async () => {
    const currentPath = normalizePath(window.location.pathname);

    try {
      const response = await fetch(REGISTRY_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
      const registry = await response.json();
      const documents = Array.isArray(registry.documents) ? registry.documents : [];
      const documentEntry = documents.find(item => normalizePath(item.url) === currentPath);
      if (documentEntry) applyEntry(documentEntry);
    } catch (error) {
      console.error('Unable to initialize SEO metadata.', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
