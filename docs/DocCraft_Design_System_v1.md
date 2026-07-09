# DocCraft Design System v1.0

## Brand promise
Professional Business Tools. Simplified.

## Design philosophy
Professional, fast, clear. Every page must help users find a business tool quickly, complete a task confidently, and discover related resources.

## Core files
- `assets/css/variables.css` — design tokens
- `assets/css/base.css` — reset, typography, global styles
- `assets/css/layout.css` — grid, containers, sections
- `assets/css/components.css` — header, buttons, cards, forms, tables, FAQ, footer
- `assets/css/utilities.css` — helper classes
- `assets/css/doccraft-ui.css` — one import file for new v2 pages

## Colors
- Primary: `#2563EB`
- Primary hover: `#1D4ED8`
- Navy: `#0F172A`
- Background: `#F8FAFC`
- Border: `#E2E8F0`
- Body text: `#475569`
- Success: `#10B981`
- Warning: `#F59E0B`
- Error: `#EF4444`

## Typography
- Headings: Manrope
- Body: Inter
- Hero: responsive clamp from 42px to 72px
- Section titles: responsive clamp from 32px to 48px

## Component rules
- Use `.dc-btn` plus `.dc-btn-primary`, `.dc-btn-secondary`, or `.dc-btn-ghost`.
- Use `.dc-card` for all cards.
- Use `.dc-tool-card` for tool cards.
- Use `.dc-field`, `.dc-input`, `.dc-select`, and `.dc-textarea` for form layouts.
- Use `.dc-faq` with native `details` elements for accessible FAQs.

## Accessibility rules
- All buttons and links must have clear text.
- Inputs must have visible labels.
- Use native HTML controls where possible.
- Keep color contrast high.
- Never remove focus outlines.

## Mobile rules
- Use single-column layout below 900px.
- Keep tap targets at least 44px high.
- Avoid horizontal scrolling.

## Next step
Use this system to rebuild the homepage and then convert each generator page to the new tool page template.
