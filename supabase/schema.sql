create extension if not exists "pgcrypto";

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  open_mode text not null default 'now' check (open_mode in ('now','scheduled','closed')),
  close_mode text not null default 'never' check (close_mode in ('never','scheduled','closed')),
  opens_at timestamptz,
  closes_at timestamptz,
  timezone text not null default 'Asia/Dubai',
  before_open_message text not null default 'This form is not open yet.',
  closed_message text not null default 'This form is no longer accepting responses.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_schedule check (opens_at is null or closes_at is null or closes_at > opens_at)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  type text not null,
  title text not null,
  required boolean not null default false,
  options jsonb,
  position integer not null default 0
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb
);

alter table public.forms enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;

create policy "owners manage forms" on public.forms for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners manage questions" on public.questions for all using (exists(select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())) with check (exists(select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));
create policy "owners read responses" on public.responses for select using (exists(select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()));

create or replace function public.submit_form_response(p_slug text, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_form public.forms;
  response_id uuid;
begin
  select * into target_form from public.forms where slug = p_slug and status = 'published' for share;
  if target_form.id is null then raise exception 'FORM_NOT_FOUND'; end if;
  if target_form.open_mode = 'closed' or target_form.close_mode = 'closed' or target_form.status = 'closed' then raise exception 'FORM_CLOSED'; end if;
  if target_form.open_mode = 'scheduled' and (target_form.opens_at is null or now() < target_form.opens_at) then raise exception 'FORM_NOT_OPEN'; end if;
  if target_form.close_mode = 'scheduled' and target_form.closes_at is not null and now() >= target_form.closes_at then raise exception 'FORM_CLOSED'; end if;
  insert into public.responses(form_id, answers) values (target_form.id, p_answers) returning id into response_id;
  return response_id;
end;
$$;

-- Sprint 5 shared internal forms and response storage
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
  max_score numeric not null default 0,
  result text not null default 'Not scored' check (result in ('Pass','Fail','Not scored'))
);

alter table public.forms enable row level security;
alter table public.form_responses enable row level security;

drop policy if exists "published forms are link-readable" on public.forms;
create policy "published forms are link-readable" on public.forms for select using (status = 'published');
drop policy if exists "internal client can sync forms" on public.forms;
create policy "internal client can sync forms" on public.forms for insert with check (true);
drop policy if exists "internal client can update forms" on public.forms;
create policy "internal client can update forms" on public.forms for update using (true) with check (true);
drop policy if exists "any link respondent can submit" on public.form_responses;
create policy "any link respondent can submit" on public.form_responses for insert with check (true);
drop policy if exists "internal client can read responses" on public.form_responses;
create policy "internal client can read responses" on public.form_responses for select using (true);

create index if not exists form_responses_form_id_idx on public.form_responses(form_id);
create index if not exists forms_slug_idx on public.forms(slug);
