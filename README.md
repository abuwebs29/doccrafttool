# FormFlow — Simple Admin Login

Internal form builder with a single administrator account, scheduled forms, sections, branching, optional numeric scoring, response storage, and Excel export. Respondents do not log in; they only receive a form link.

## Authentication

Supabase Authentication is no longer used. The admin email and password are stored as Cloudflare Secrets. A successful login creates a signed, HttpOnly session cookie valid for 12 hours. Dashboard and form-management routes are also protected by middleware.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Open **Project Settings → API** and copy:
   - Project URL
   - `service_role` key

The service-role key is server-only. Never expose it in a `NEXT_PUBLIC_` variable.

## Cloudflare variables

Open **Workers & Pages → your project → Settings → Variables and Secrets**. Add all five as **Secrets**, not JSON:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_SESSION_SECRET=a-long-random-secret-at-least-32-characters
```

Generate the session secret locally with one of these commands:

```bash
openssl rand -base64 48
```

or

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Save the values and redeploy. The admin login is `/login`. Participants use `/f/<form-slug>`.

## Cloudflare deployment

Use this deploy command:

```bash
bun run deploy
```

## Security model

- Only the signed admin session can access `/dashboard` and `/forms/*`.
- Admin form writes and response reads use protected server API routes.
- Public form lookup and submission use limited server API routes.
- Supabase tables have RLS enabled with no browser policies.
- The service-role key is used only on the server.
- Respondents cannot read responses or manage forms.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, fill in the values, then run:

```bash
npm install
npm run dev
```

## Important Cloudflare runtime fix

The deploy command includes `--keep-vars` so runtime secrets configured on the Worker are not removed during Git deployments. Form save and publish now wait for the Supabase upsert to finish before leaving the editor.

After deployment, verify:

```text
https://your-domain.com/api/health
```

Expected response:

```json
{"ok":true,"configured":true}
```

## Sprint 6 upgrade

Sprint 6 adds individual response pages, search/sort/date filters, pagination, bulk deletion, selected-response export, reference numbers, response limits, and duplicate-submission controls.

When upgrading an existing database, run `supabase/migrate-sprint-6.sql` once in the Supabase SQL Editor before testing new submissions.

## Sprint 7 — controlled forms

Sprint 7 keeps FormFlow focused on internal forms and adds:

- Optional branching. New forms use normal sequential navigation by default.
- One submission per email, browser, or access code.
- Case-insensitive access-code lists.
- Expiring participant links.
- Maximum response limits.
- Manual and scheduled opening/closing.
- Server-side duplicate checks and answer validation.
- Honeypot and rapid-submission spam protection.
- Form cloning, archive, and restore from the dashboard.
- Admin audit log at `/audit`.
- Automatic response backup records in Supabase.

### Upgrade an existing database

Run `supabase/migrate-sprint-7.sql` once in the Supabase SQL Editor before accepting Sprint 7 responses.

## Sprint 7.1 and Sprint 8

- Branching disabled: respondents see all sections and questions on one continuous page.
- Branching enabled: respondents use the section-by-section flow with Next, Back, and branch rules.
- Save any form as a reusable template from the builder.
- Create a new draft form from a template at `/templates`.
- Archive, restore, search, and delete templates.
- Save individual questions to the reusable question bank.
- Search and manage reusable questions at `/templates`.

Templates and question-bank items are stored in the admin browser for this internal single-admin deployment. Forms created from templates are saved to Supabase normally.

## Sprint 9 additions

Sprint 9 adds question help text, placeholders, character and number limits, date restrictions, URL/number/date/time/rating/linear-scale/acknowledgment questions, custom validation messages, publish-time checks, unsaved-change warnings, branding controls, and optional post-submission redirects. No database migration is required because these settings are stored inside each form's JSON data.

## Sprint 10 analytics

Run `supabase/migrate-sprint-10.sql` once in the Supabase SQL editor before using analytics. The analytics dashboard is available at `/forms/[form-id]/analytics` and tracks anonymous views, starts, completions, abandonment, completion time, device/browser/country summaries, and score performance. FormFlow does not store participant IP addresses for analytics.
