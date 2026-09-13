-- Nepal Live accounts — run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (IF NOT EXISTS). Only the Nepal Live server, using the project's secret key,
-- can read or write these tables: row-level security is on and there are no policies, so the
-- public anon key (and anyone using it) gets nothing.

create table if not exists public.nl_users (
  id          text primary key,
  email       text not null unique,          -- lower-cased by the server
  name        text not null default '',
  pwd         text not null,                 -- scrypt hash ("scrypt$N$r$p$salt$hash"), never the password
  prefs       jsonb not null default '{}'::jsonb,
  seen_at     bigint not null default 0,     -- ms; alerts newer than this are "unread"
  created_at  timestamptz not null default now()
);

create table if not exists public.nl_sessions (
  key      text primary key,                 -- SHA-256 of the cookie token (the token itself is never stored)
  user_id  text not null references public.nl_users(id) on delete cascade,
  created  bigint not null,
  seen     bigint not null,
  exp      bigint not null                   -- ms; expired rows are swept hourly
);
create index if not exists nl_sessions_user_idx on public.nl_sessions (user_id);
create index if not exists nl_sessions_exp_idx  on public.nl_sessions (exp);

create table if not exists public.nl_saved (
  user_id   text not null references public.nl_users(id) on delete cascade,
  key       text not null,                   -- "type:id"
  type      text not null,
  title     text not null,
  url       text not null,
  sub       text not null default '',
  img       text not null default '',
  saved_at  timestamptz not null default now(),
  primary key (user_id, key)
);

-- Lock the tables to the server's secret key.
alter table public.nl_users    enable row level security;
alter table public.nl_sessions enable row level security;
alter table public.nl_saved    enable row level security;
revoke all on public.nl_users, public.nl_sessions, public.nl_saved from anon, authenticated;
grant  all on public.nl_users, public.nl_sessions, public.nl_saved to service_role;

-- Visit counts for the owner's /stats page: one row of anonymous totals per
-- Nepal day (page views, visitors, pages, sources, devices, languages, hours).
-- No IP addresses, cookies or user ids are stored.
create table if not exists public.nl_stats (
  day        text primary key,               -- YYYY-MM-DD, Nepal Time
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.nl_stats enable row level security;
revoke all on public.nl_stats from anon, authenticated;
grant  all on public.nl_stats to service_role;
