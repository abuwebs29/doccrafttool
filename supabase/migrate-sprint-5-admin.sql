-- Run after the main schema if upgrading an existing Sprint 5 database.
alter table public.form_responses drop column if exists result;
