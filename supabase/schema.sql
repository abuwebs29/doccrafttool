create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()); $$;

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

alter table public.admin_users enable row level security;
alter table public.forms enable row level security;
alter table public.form_responses enable row level security;

drop policy if exists "admin reads own admin record" on public.admin_users;
create policy "admin reads own admin record" on public.admin_users for select using (user_id=auth.uid());

drop policy if exists "published forms are link-readable" on public.forms;
create policy "published forms are link-readable" on public.forms for select using (status='published' or public.is_admin());
drop policy if exists "admin creates forms" on public.forms;
create policy "admin creates forms" on public.forms for insert with check (public.is_admin());
drop policy if exists "admin updates forms" on public.forms;
create policy "admin updates forms" on public.forms for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes forms" on public.forms;
create policy "admin deletes forms" on public.forms for delete using (public.is_admin());

drop policy if exists "link respondents submit" on public.form_responses;
create policy "link respondents submit" on public.form_responses for insert with check (exists(select 1 from public.forms f where f.id=form_id and f.status='published'));
drop policy if exists "admin reads responses" on public.form_responses;
create policy "admin reads responses" on public.form_responses for select using (public.is_admin());
drop policy if exists "admin deletes responses" on public.form_responses;
create policy "admin deletes responses" on public.form_responses for delete using (public.is_admin());

create index if not exists form_responses_form_id_idx on public.form_responses(form_id);
create index if not exists forms_slug_idx on public.forms(slug);

-- After creating the admin in Authentication > Users, run:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email='YOUR_ADMIN_EMAIL';
