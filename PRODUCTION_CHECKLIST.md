# FormFlow Production Launch Checklist

## Security
- [ ] Use a unique 48+ character `ADMIN_SESSION_SECRET`.
- [ ] Use a strong admin password stored only as a Cloudflare secret.
- [ ] Confirm no service-role key appears in browser source or network responses.
- [ ] Confirm `/dashboard`, `/forms`, `/settings`, `/system`, `/audit`, and `/templates` redirect when signed out.
- [ ] Confirm admin mutation APIs reject unauthenticated requests.
- [ ] Confirm login locks out repeated attempts temporarily.
- [ ] Confirm public submissions reject cross-origin requests and excessive attempts.
- [ ] Review the Content Security Policy after adding any new external services.

## Functional QA
- [ ] Single-page form with branching disabled.
- [ ] Multi-step form with branching enabled.
- [ ] Scheduled opening and closing in `Asia/Dubai`.
- [ ] Manual open, close, archive, restore, and clone.
- [ ] One response per email, browser, and access code.
- [ ] Maximum response limit and expired link behavior.
- [ ] Required, email, URL, number, date, rating, and choice validation.
- [ ] Scored and unscored questions.
- [ ] Excel export with at least 1,000 responses.
- [ ] Backup download, restore, and retention cleanup.

## Accessibility and devices
- [ ] Complete a form using keyboard only.
- [ ] Verify visible focus indicators.
- [ ] Verify reduced-motion preference.
- [ ] Test current Chrome, Safari, Edge, iPhone Safari, and Android Chrome.
- [ ] Verify labels and error messages are understandable at 200% zoom.

## Operations
- [ ] Run every Supabase migration, including `migrate-final-stabilization.sql`.
- [ ] Confirm `/api/health` and `/system` diagnostics are healthy.
- [ ] Create and securely store a full backup before launch.
- [ ] Configure Cloudflare uptime monitoring for `/api/health`.
- [ ] Review Cloudflare Worker errors after pilot submissions.
- [ ] Pilot with a small internal group before general use.
