# DocCraftTools static website

Upload the contents of this folder to Cloudflare Pages as a static site.

Recommended Cloudflare Pages settings:
- Build command: leave empty
- Output directory: `.`
- Root directory: this folder

Included improvements:
- Mobile-safe generator layout with no horizontal page overflow
- Accessible labels and names for generator form controls
- Lazy-loaded PDF export libraries
- Canonical, Open Graph, Twitter and JSON-LD metadata
- Updated sitemap with `lastmod` values
- Cloudflare Pages `_headers` for security and cache headers
- Cloudflare Pages `_redirects` for canonical non-www HTTPS routing
- Clean package without macOS `__MACOSX` or `.DS_Store` files

Tool export features:
- Download PDF
- Download Word-compatible `.doc`
- Download Excel-compatible `.xls`
- Print / Save PDF
- Multi-line items
- Auto totals, tax, discount and currency
