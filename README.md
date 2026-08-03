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
