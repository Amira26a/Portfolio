-- Run this in the Supabase SQL Editor after replacing the admin email below.
-- Create the admin user separately in Supabase Authentication; public sign-ups are not needed.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('excel-sql', 'python', 'power-bi')),
  description text not null default '',
  tools text[] not null default '{}',
  github_url text not null default '',
  dashboard_url text not null default '',
  sort_order integer not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  value integer not null default 0 check (value >= 0),
  suffix text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null default '',
  details text not null default '',
  status text not null default 'completed' check (status in ('completed', 'in-progress', 'upcoming')),
  credential_url text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('analysis', 'tools')),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 5000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.metrics enable row level security;
alter table public.certificates enable row level security;
alter table public.skills enable row level security;
alter table public.messages enable row level security;

grant select on public.projects, public.metrics, public.certificates, public.skills to anon, authenticated;
grant insert, update, delete on public.projects, public.metrics, public.certificates, public.skills to authenticated;
grant insert on public.messages to anon, authenticated;
grant select, update, delete on public.messages to authenticated;

-- Public visitors can read portfolio content; only the configured admin can change it.
drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects" on public.projects for select to anon, authenticated using (true);
drop policy if exists "Admin manages projects" on public.projects;
create policy "Admin manages projects" on public.projects for all to authenticated
  using (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'))
  with check (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'));

drop policy if exists "Public can read metrics" on public.metrics;
create policy "Public can read metrics" on public.metrics for select to anon, authenticated using (true);
drop policy if exists "Admin manages metrics" on public.metrics;
create policy "Admin manages metrics" on public.metrics for all to authenticated
  using (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'))
  with check (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'));

drop policy if exists "Public can read certificates" on public.certificates;
create policy "Public can read certificates" on public.certificates for select to anon, authenticated using (true);
drop policy if exists "Admin manages certificates" on public.certificates;
create policy "Admin manages certificates" on public.certificates for all to authenticated
  using (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'))
  with check (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'));

drop policy if exists "Public can read skills" on public.skills;
create policy "Public can read skills" on public.skills for select to anon, authenticated using (true);
drop policy if exists "Admin manages skills" on public.skills;
create policy "Admin manages skills" on public.skills for all to authenticated
  using (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'))
  with check (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'));

-- Contact messages are insert-only for visitors and private to the admin.
drop policy if exists "Visitors can send messages" on public.messages;
create policy "Visitors can send messages" on public.messages for insert to anon, authenticated
  with check (char_length(name) between 1 and 120 and char_length(email) between 3 and 254 and char_length(message) between 1 and 5000);
drop policy if exists "Admin reads messages" on public.messages;
create policy "Admin reads messages" on public.messages for select to authenticated
  using (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'));
drop policy if exists "Admin updates messages" on public.messages;
create policy "Admin updates messages" on public.messages for update to authenticated
  using (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'))
  with check (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'));
drop policy if exists "Admin deletes messages" on public.messages;
create policy "Admin deletes messages" on public.messages for delete to authenticated
  using (lower((select auth.jwt() ->> 'email')) = lower('your-admin@email.com'));

create index if not exists projects_sort_order_idx on public.projects (sort_order, created_at desc);
create index if not exists metrics_sort_order_idx on public.metrics (sort_order, created_at desc);
create index if not exists certificates_sort_order_idx on public.certificates (sort_order, created_at desc);
create index if not exists skills_category_sort_order_idx on public.skills (category, sort_order);
create index if not exists messages_created_at_idx on public.messages (created_at desc);