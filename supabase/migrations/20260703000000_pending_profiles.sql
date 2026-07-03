create table public.pending_profiles (
  id uuid primary key default gen_random_uuid(),
  gender text not null,
  birth_year integer not null,
  height integer not null,
  residence text not null,
  job text not null,
  religion text not null default 'not_selected',
  mbti text not null default '',
  hobbies text not null default '',
  smoking text not null default 'not_selected',
  drinking text not null default 'not_selected',
  ideal_type text not null default '',
  matchmaker_comment text not null default '',
  extra text not null default '',
  photo_paths text[] not null default '{}',
  submitted_by text not null default 'external-api',
  created_at timestamptz not null default now(),
  constraint pending_profiles_gender_check check (gender in ('female', 'male'))
);

create index pending_profiles_created_at_idx on public.pending_profiles (created_at desc);

alter table public.pending_profiles enable row level security;

create policy pending_select_app_users on public.pending_profiles
  for select to authenticated using ((select public.is_app_user()));
create policy pending_delete_app_users on public.pending_profiles
  for delete to authenticated using ((select public.is_app_user()));

grant select, delete on public.pending_profiles to authenticated;
