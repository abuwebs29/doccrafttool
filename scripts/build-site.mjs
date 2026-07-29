import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, 'assets/data/documents.json');
const SITE_URL = 'https://doccrafttools.com';
const CHECK_ONLY = process.argv.includes('--check');
const ALLOWED_CATEGORIES = new Set(['Business', 'Finance', 'Human Resources']);
const STATIC_ROUTES = [
  '/',
  '/tools/',
  '/categories/',
  '/templates/',
  '/blog/',
  '/about/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/disclaimer/'
];

const errors = [];
const warnings = [];

const fail = message => errors.push(message);
const warn = message => warnings.push(message);
const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;
const duplicates = values => [...new Set(values.filter((value, index, list) => list.indexOf(value) !== index))];
const xmlEscape = value => String(value).replace(/[<>&'\"]/g, character => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;'
}[character]));

async function loadRegistry() {
  let raw;
  try {
    raw = await readFile(REGISTRY_PATH, 'utf8');
  } catch (error) {
    fail(`Cannot read ${path.relative(ROOT, REGISTRY_PATH)}: ${error.message}`);
    return { documents: [] };
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON in ${path.relative(ROOT, REGISTRY_PATH)}: ${error.message}`);
    return { documents: [] };
  }
}

async function validatePageExists(document) {
  const relative = document.url === '/' ? 'index.html' : `${document.url.replace(/^\//, '')}index.html`;
  const absolute = path.join(ROOT, relative);
  try {
    await access(absolute, constants.F_OK);
  } catch {
    fail(`${document.id}: page missing at ${relative}`);
  }
}

async function validateRegistry(registry) {
  if (!registry || !Array.isArray(registry.documents)) {
    fail('Registry must contain a documents array.');
    return [];
  }

  const documents = registry.documents;
  if (!documents.length) fail('Registry contains no documents.');

  for (const [index, document] of documents.entries()) {
    const label = document?.id || `entry ${index + 1}`;
    if (!isNonEmptyString(document?.id)) fail(`Entry ${index + 1}: id is required.`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document?.id || '')) fail(`${label}: id must be lowercase kebab-case.`);
    if (!isNonEmptyString(document?.title)) fail(`${label}: title is required.`);
    if (!isNonEmptyString(document?.shortTitle)) warn(`${label}: shortTitle is missing.`);
    if (!isNonEmptyString(document?.url) || !/^\/[a-z0-9-]+\/$/.test(document?.url || '')) fail(`${label}: url must look like /example-generator/.`);
    if (!ALLOWED_CATEGORIES.has(document?.category)) fail(`${label}: unsupported category "${document?.category}".`);
    if (!['generator', 'calculator'].includes(document?.type)) fail(`${label}: type must be generator or calculator.`);
    if (!isNonEmptyString(document?.description)) fail(`${label}: description is required.`);
    if ((document?.description || '').length > 170) warn(`${label}: description is longer than 170 characters.`);
    if (!Array.isArray(document?.keywords) || document.keywords.length < 2) fail(`${label}: provide at least two keywords.`);
    if (document?.keywords?.some(keyword => !isNonEmptyString(keyword))) fail(`${label}: keywords must be non-empty strings.`);
    if (document?.featured !== undefined && typeof document.featured !== 'boolean') fail(`${label}: featured must be true or false.`);
    await validatePageExists(document);
  }

  for (const [field, values] of [
    ['id', documents.map(document => document.id)],
    ['url', documents.map(document => document.url)],
    ['title', documents.map(document => document.title)]
  ]) {
    for (const duplicate of duplicates(values)) fail(`Duplicate ${field}: ${duplicate}`);
  }

  return documents;
}

function buildSitemap(documents) {
  const routes = [...new Set([...STATIC_ROUTES, ...documents.map(document => document.url)])].sort();
  const urls = routes.map(route => `  <url>\n    <loc>${xmlEscape(`${SITE_URL}${route}`)}</loc>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

function buildSeoIndex(documents) {
  const pages = Object.fromEntries(documents.map(document => [document.url, {
    id: document.id,
    title: `${document.title} | DocCraftTools`,
    description: document.description,
    canonical: `${SITE_URL}${document.url}`,
    category: document.category,
    type: document.type,
    keywords: document.keywords
  }]));

  return `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), pages }, null, 2)}\n`;
}

async function writeGeneratedFile(relativePath, content) {
  if (CHECK_ONLY) return;
  await writeFile(path.join(ROOT, relativePath), content, 'utf8');
  console.log(`Generated ${relativePath}`);
}

async function main() {
  const registry = await loadRegistry();
  const documents = await validateRegistry(registry);

  for (const message of warnings) console.warn(`Warning: ${message}`);
  if (errors.length) {
    for (const message of errors) console.error(`Error: ${message}`);
    console.error(`\nValidation failed with ${errors.length} error${errors.length === 1 ? '' : 's'}.`);
    process.exitCode = 1;
    return;
  }

  if (CHECK_ONLY) {
    console.log(`Registry valid: ${documents.length} documents checked.`);
    return;
  }

  await writeGeneratedFile('sitemap.xml', buildSitemap(documents));
  await writeGeneratedFile('robots.txt', buildRobots());
  await writeGeneratedFile('assets/data/seo-index.json', buildSeoIndex(documents));
  console.log(`Build complete: ${documents.length} documents validated.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
