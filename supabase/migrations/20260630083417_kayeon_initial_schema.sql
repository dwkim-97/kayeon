create extension if not exists pgcrypto with schema extensions;

create table public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  login_id text not null,
  auth_email text not null,
  name text not null,
  recommender_name text not null,
  phone_number text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  constraint app_users_login_id_key unique (login_id),
  constraint app_users_auth_email_key unique (auth_email),
  constraint app_users_login_id_not_blank check (btrim(login_id) <> ''),
  constraint app_users_auth_email_not_blank check (btrim(auth_email) <> ''),
  constraint app_users_name_not_blank check (btrim(name) <> ''),
  constraint app_users_recommender_name_not_blank check (btrim(recommender_name) <> ''),
  constraint app_users_phone_number_not_blank check (btrim(phone_number) <> '')
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  gender text not null,
  status text not null default 'active',
  author_id uuid not null references public.app_users (id),
  residence text not null,
  age integer not null,
  height integer not null,
  job text not null,
  religion text not null default 'not_selected',
  mbti text not null default '',
  hobbies text not null default '',
  smoking text not null default 'not_selected',
  drinking text not null default 'not_selected',
  ideal_type text not null default '',
  matchmaker_comment text not null default '',
  extra text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_gender_check check (gender in ('female', 'male')),
  constraint profiles_status_check check (status in ('active', 'blocked')),
  constraint profiles_age_check check (age between 19 and 100),
  constraint profiles_height_check check (height between 120 and 230),
  constraint profiles_religion_check check (religion in ('christian', 'buddhist', 'catholic', 'none', 'not_selected')),
  constraint profiles_smoking_check check (smoking in ('smoker', 'non_smoker', 'not_selected')),
  constraint profiles_drinking_check check (drinking in ('drinker', 'non_drinker', 'not_selected')),
  constraint profiles_residence_not_blank check (btrim(residence) <> ''),
  constraint profiles_job_not_blank check (btrim(job) <> '')
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  alt text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint profile_photos_storage_path_key unique (storage_path),
  constraint profile_photos_profile_sort_order_key unique (profile_id, sort_order),
  constraint profile_photos_sort_order_check check (sort_order between 0 and 3),
  constraint profile_photos_storage_path_not_blank check (btrim(storage_path) <> ''),
  constraint profile_photos_alt_not_blank check (btrim(alt) <> '')
);

create table public.history_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  actor_id uuid not null references public.app_users (id),
  target_label text not null,
  description text not null,
  created_at timestamptz not null default now(),
  constraint history_events_type_check check (
    type in (
      'profile_created',
      'profile_updated',
      'profile_deleted',
      'profile_blocked',
      'profile_activated',
      'admin_created',
      'admin_removed'
    )
  ),
  constraint history_events_target_label_not_blank check (btrim(target_label) <> ''),
  constraint history_events_description_not_blank check (btrim(description) <> '')
);

create index app_users_removed_at_idx on public.app_users (removed_at);
create index profiles_author_id_idx on public.profiles (author_id);
create index profiles_gender_status_idx on public.profiles (gender, status);
create index profiles_age_idx on public.profiles (age);
create index profiles_height_idx on public.profiles (height);
create index profile_photos_profile_id_idx on public.profile_photos (profile_id);
create index history_events_actor_id_idx on public.history_events (actor_id);
create index history_events_created_at_idx on public.history_events (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.history_events enable row level security;

create policy app_users_select_self
on public.app_users
for select
to authenticated
using (id = (select auth.uid()) and removed_at is null);

create or replace function public.is_app_user()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.app_users
      where id = (select auth.uid())
        and removed_at is null
    );
$$;

grant execute on function public.is_app_user() to authenticated;

create policy profiles_select_app_users
on public.profiles
for select
to authenticated
using ((select public.is_app_user()));

create policy profiles_insert_app_users
on public.profiles
for insert
to authenticated
with check ((select public.is_app_user()));

create policy profiles_update_app_users
on public.profiles
for update
to authenticated
using ((select public.is_app_user()))
with check ((select public.is_app_user()));

create policy profiles_delete_app_users
on public.profiles
for delete
to authenticated
using ((select public.is_app_user()));

create policy profile_photos_select_app_users
on public.profile_photos
for select
to authenticated
using ((select public.is_app_user()));

create policy profile_photos_insert_app_users
on public.profile_photos
for insert
to authenticated
with check ((select public.is_app_user()));

create policy profile_photos_update_app_users
on public.profile_photos
for update
to authenticated
using ((select public.is_app_user()))
with check ((select public.is_app_user()));

create policy profile_photos_delete_app_users
on public.profile_photos
for delete
to authenticated
using ((select public.is_app_user()));

create policy history_events_select_app_users
on public.history_events
for select
to authenticated
using ((select public.is_app_user()));

create policy history_events_insert_app_users
on public.history_events
for insert
to authenticated
with check ((select public.is_app_user()));

grant usage on schema public to authenticated;
grant select on public.app_users to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_photos to authenticated;
grant select, insert on public.history_events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_profile_photos_select_app_users
on storage.objects
for select
to authenticated
using (bucket_id = 'profile-photos' and (select public.is_app_user()));

create policy storage_profile_photos_insert_app_users
on storage.objects
for insert
to authenticated
with check (bucket_id = 'profile-photos' and (select public.is_app_user()));

create policy storage_profile_photos_update_app_users
on storage.objects
for update
to authenticated
using (bucket_id = 'profile-photos' and (select public.is_app_user()))
with check (bucket_id = 'profile-photos' and (select public.is_app_user()));

create policy storage_profile_photos_delete_app_users
on storage.objects
for delete
to authenticated
using (bucket_id = 'profile-photos' and (select public.is_app_user()));
