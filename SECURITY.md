# Security notes

FormFlow uses a single-admin signed HttpOnly cookie, server-side Supabase access, same-origin checks, and endpoint rate limiting.

The included in-memory rate limiter is effective per active Cloudflare Worker isolate. For strict globally consistent limits at high traffic, replace it with Cloudflare Rate Limiting rules, Durable Objects, or a database-backed counter. The current implementation is suitable as an application-level safety layer but should not be treated as the only perimeter control.

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, or `ADMIN_SESSION_SECRET` in any `NEXT_PUBLIC_` variable. Rotate a secret immediately if it is copied into a public issue, screenshot, client bundle, or repository.

Report production errors using the short reference ID shown to the user and locate the matching structured Cloudflare log entry.
