create table public.matches (
  id uuid primary key default gen_random_uuid(),
  female_id uuid not null references public.profiles (id) on delete cascade,
  male_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'ongoing',
  memo text not null default '',
  created_by_name text not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint matches_status_check check (status in ('ongoing', 'ended')),
  constraint matches_created_by_name_not_blank check (btrim(created_by_name) <> '')
);

create index matches_female_id_idx on public.matches (female_id);
create index matches_male_id_idx on public.matches (male_id);
create unique index matches_unique_ongoing on public.matches (female_id, male_id) where status = 'ongoing';

alter table public.matches enable row level security;

create policy matches_select_app_users on public.matches
  for select to authenticated using ((select public.is_app_user()));
create policy matches_insert_app_users on public.matches
  for insert to authenticated with check ((select public.is_app_user()));
create policy matches_update_app_users on public.matches
  for update to authenticated using ((select public.is_app_user())) with check ((select public.is_app_user()));
create policy matches_delete_app_users on public.matches
  for delete to authenticated using ((select public.is_app_user()));

grant select, insert, update, delete on public.matches to authenticated;

alter table public.history_events drop constraint history_events_type_check;
alter table public.history_events add constraint history_events_type_check check (
  type in (
    'profile_created', 'profile_updated', 'profile_deleted',
    'profile_blocked', 'profile_activated', 'admin_created', 'admin_removed',
    'match_created', 'match_ended'
  )
);
