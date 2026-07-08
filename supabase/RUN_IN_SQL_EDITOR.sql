-- ============================================================
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 RUN 하세요.
-- 기존 데이터를 건드리지 않고 새 테이블만 추가합니다 (안전).
-- ① matches (매칭/주선) ② pending_profiles (대기 매물/외부 API)
-- ============================================================


-- ① 매칭(주선) 테이블 --------------------------------------
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


-- ② 대기(pending) 매물 테이블 -------------------------------
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


-- ③ 매물 관리자 메모 컬럼 --------------------------------
-- 주선자 전용 내부 메모. 상세보기에서만(다른 색으로) 노출. 기존 데이터는 빈 값.
alter table public.profiles
  add column if not exists admin_memo text not null default '';


-- ④ 매물 관리자 전용 항목 컬럼 ----------------------------
-- 떠보기/거절내성/응답속도. 주선자만 보는 항목. 기존 데이터는 'not_selected'.
alter table public.profiles
  add column if not exists probe text not null default 'not_selected',
  add column if not exists rejection_tolerance text not null default 'not_selected',
  add column if not exists response_speed text not null default 'not_selected';

alter table public.profiles
  drop constraint if exists profiles_probe_check;
alter table public.profiles
  add constraint profiles_probe_check
  check (probe in ('possible', 'impossible', 'not_selected'));

alter table public.profiles
  drop constraint if exists profiles_rejection_tolerance_check;
alter table public.profiles
  add constraint profiles_rejection_tolerance_check
  check (rejection_tolerance in ('high', 'mid', 'low', 'not_selected'));

alter table public.profiles
  drop constraint if exists profiles_response_speed_check;
alter table public.profiles
  add constraint profiles_response_speed_check
  check (response_speed in ('fast', 'normal', 'slow', 'not_selected'));
