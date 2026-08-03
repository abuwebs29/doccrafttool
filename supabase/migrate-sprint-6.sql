-- Run this once in Supabase SQL Editor when upgrading an existing FormFlow database.
alter table public.form_responses add column if not exists reference_number text;
alter table public.form_responses add column if not exists respondent_email text;
alter table public.form_responses add column if not exists browser_token text;
create unique index if not exists form_responses_reference_number_idx on public.form_responses(form_id, reference_number) where reference_number is not null;
create index if not exists form_responses_email_idx on public.form_responses(form_id, respondent_email);
create index if not exists form_responses_browser_idx on public.form_responses(form_id, browser_token);
