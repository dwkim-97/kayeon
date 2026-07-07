-- 매물에 주선자 전용 관리자 항목 컬럼 추가.
-- 상세보기/폼에서만 노출되는 내부 항목. 기존 데이터는 'not_selected'로 채워진다.
-- 코드는 컬럼 미적용 환경에서도 등록/수정이 깨지지 않도록 방어(재시도)하지만,
-- 저장이 실제로 반영되려면 이 마이그레이션을 실행해야 한다.

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
