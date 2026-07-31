# FormFlow MVP

A Google-Forms-style prototype focused on scheduled form availability.

## Included
- Form dashboard
- Form builder with six question types
- Public shareable form page
- Immediate, scheduled, and manual opening modes
- Never, scheduled, and immediate closing modes
- Custom timezone and messages
- Submission-time availability re-check
- Supabase production schema and secure submission function

## Run the prototype
```bash
npm install
npm run dev
```
Open http://localhost:3000. The prototype stores forms in browser localStorage so it works without setup.

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
