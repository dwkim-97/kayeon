-- 리워드(관리자 전용 자유 텍스트) + 수동 정렬 가중치. 기존 데이터는 기본값.
alter table public.profiles
  add column if not exists reward text not null default '',
  add column if not exists manual_order_weight double precision not null default 0;
