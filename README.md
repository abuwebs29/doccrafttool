# FormFlow MVP

An internal link-based form platform with scheduling, sections, scoring, response management, and Excel export.

## Included
- Form dashboard
- Form builder with six question types
- Public shareable form page
- Immediate, scheduled, and manual opening modes
- Never, scheduled, and immediate closing modes
- Custom timezone and messages
- Submission-time availability re-check
- Supabase production schema and secure submission function

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000. Local storage is used as a development fallback; configure Supabase for shared participant links and centralized responses.

## Production database
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and add your keys.
4. Replace `lib/demo-store.ts` calls with Supabase queries.

The SQL function `submit_form_response` checks the server time during every submission, preventing users from bypassing opening or closing deadlines with an old browser tab or changed device clock.

## Sprint 2 dashboard

The dashboard now includes:

- Responsive workspace sidebar and header
- Form, response, open, scheduled, and closed statistics
- Search with `/` keyboard shortcut
- New form shortcut with `N`
- Status filters and sorting
- Grid and list layouts with saved preference
- Copy public link, preview, edit, duplicate, archive/restore, and delete actions
- Delete undo notification
- Empty and no-results states
- Backward-compatible localStorage data migration for response counts and archived forms

## Sprint 3 — Professional builder

This package adds a redesigned form-building workspace with native drag-and-drop question ordering, autosave, undo/redo history, question duplication and editing, an add-question toolbar, responsive mobile preview, and a live desktop preview. Existing dashboard, scheduling, public links, and Cloudflare OpenNext configuration remain included.

## Sprint 5: shared internal links and scoring

1. Create a free Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Cloudflare environment variables.
4. Redeploy, open a form, configure optional scores, then click Publish.
5. Share only the generated `/f/<slug>` link with participants.

The responses dashboard shows numeric total score and Pass/Fail. Excel export intentionally omits numeric score and includes only Result (Pass/Fail), as required.

This is designed for internal link-only use and has no public form directory, account registration, or respondent login.
