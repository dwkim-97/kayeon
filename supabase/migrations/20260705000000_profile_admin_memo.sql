-- 매물에 주선자 전용 관리자 메모 컬럼 추가.
-- 상세보기에서만(다른 색으로) 노출되는 내부 메모. 기존 데이터는 빈 문자열로 채워진다.
alter table public.profiles
  add column if not exists admin_memo text not null default '';
