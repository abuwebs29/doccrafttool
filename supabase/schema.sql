create extension if not exists "pgcrypto";

create table if not exists public.forms (
  id uuid primary key,
  slug text unique not null,
  status text not null default 'draft',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.form_responses (
  id uuid primary key,
  form_id uuid not null references public.forms(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb,
  total_score numeric not null default 0,
  max_score numeric not null default 0
);

alter table public.forms enable row level security;
alter table public.form_responses enable row level security;

-- Browser clients receive no direct table access. All reads and writes go through
-- authenticated Next.js API routes using the server-only service-role key.
drop policy if exists "published forms are link-readable" on public.forms;
drop policy if exists "admin creates forms" on public.forms;
drop policy if exists "admin updates forms" on public.forms;
drop policy if exists "admin deletes forms" on public.forms;
drop policy if exists "link respondents submit" on public.form_responses;
drop policy if exists "admin reads responses" on public.form_responses;
drop policy if exists "admin deletes responses" on public.form_responses;

create index if not exists form_responses_form_id_idx on public.form_responses(form_id);
create index if not exists forms_slug_idx on public.forms(slug);

-- Sprint 6 response-management fields. Safe to run on an existing database.
alter table public.form_responses add column if not exists reference_number text;
alter table public.form_responses add column if not exists respondent_email text;
alter table public.form_responses add column if not exists browser_token text;
create unique index if not exists form_responses_reference_number_idx on public.form_responses(form_id, reference_number) where reference_number is not null;
create index if not exists form_responses_email_idx on public.form_responses(form_id, respondent_email);
create index if not exists form_responses_browser_idx on public.form_responses(form_id, browser_token);
