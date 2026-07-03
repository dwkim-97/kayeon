# 외부 API 매물 등록 + 관리자 승인 워크플로우

작성일: 2026-07-03

## 목표

외부 스크립트가 API 키 인증으로 매물을 "등록 대기"에 제출하고, 관리자가 웹에서 승인해야 실제 매물(`profiles`)로 전환되는 구조.

```
외부(curl, multipart) --x-api-key--> POST /api/external/profiles
  → pending_profiles 테이블 저장 + 사진은 Storage의 pending/ 경로
        ↓
관리자 웹 /pending 페이지
  → 승인: profiles + profile_photos로 복사, 사진 정식 경로로 이동, pending 삭제, 히스토리 기록
  → 거절: pending 행 + pending 사진 삭제
```

## 데이터 모델 (신규 마이그레이션)

### pending_profiles 테이블
profiles와 동일한 프로필 필드 + 제출/사진 메타:
```sql
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
  photo_paths text[] not null default '{}',  -- pending/ Storage 경로 배열 (정렬 순서)
  submitted_by text not null default 'external-api',
  created_at timestamptz not null default now(),
  constraint pending_profiles_gender_check check (gender in ('female','male'))
);
create index pending_profiles_created_at_idx on public.pending_profiles (created_at desc);
alter table public.pending_profiles enable row level security;
-- 관리자(로그인 app_user)만 조회/삭제. insert는 서버(secret key)만 하므로 정책 불필요하나
-- select/delete 정책은 authenticated + is_app_user()로.
create policy pending_select_app_users on public.pending_profiles
  for select to authenticated using ((select public.is_app_user()));
create policy pending_delete_app_users on public.pending_profiles
  for delete to authenticated using ((select public.is_app_user()));
grant select, delete on public.pending_profiles to authenticated;
```
- 외부 API insert와 승인/거절은 **서버가 secret key(admin client)로 수행** → RLS 우회.
- 사진은 별도 테이블 없이 `photo_paths text[]`로 Storage 경로만 보관(승인 시 profile_photos로 전개).

### Storage
- 기존 `profile-photos` 버킷 재사용. 대기 사진은 `pending/{pendingId}/{n}.{ext}` 경로.
- 승인 시 `{profileId}/{photoId}.{ext}`로 copy(또는 move) 후 pending 경로 삭제.

## API 키 인증

- `lib/auth/api-key.ts`: `verifyApiKey(request)` — `x-api-key` 헤더와 `process.env.EXTERNAL_API_KEY` 상수시간 비교. 불일치 시 false.
- `EXTERNAL_API_KEY`는 Vercel 환경변수로 설정(사용자가 생성). 없으면 API가 503/500으로 거부.

## API 라우트

### POST /api/external/profiles (runtime nodejs)
- 인증: `verifyApiKey` 실패 시 401.
- multipart/form-data 파싱: `data`(JSON 문자열, 프로필 필드) + `photos`(File 여러 개).
- zod로 프로필 필드 검증(gender/birthYear/height/residence/job 필수, 나머지 기본값). 검증 실패 400.
- admin client로 각 사진을 `pending/{uuid}/{i}.{ext}`에 업로드.
- pending_profiles insert(photo_paths 포함). 실패 시 업로드한 사진 롤백 삭제.
- 201 {pendingId}.

### GET /api/pending (세션 인증)
- 로그인 관리자만(기존 서버 클라이언트 RLS). pending_profiles 목록 + 사진 public URL 변환 반환.

### POST /api/pending/[id]/approve (세션 인증)
- admin client로: pending 행 조회 → profiles insert(author_name = 승인한 관리자 이름) → 각 photo_path를 `{profileId}/{photoId}.{ext}`로 copy → profile_photos insert → pending 사진/행 삭제 → 히스토리 기록(profile_created).
- 실패 시 부분 반영 방지 위해 순서 주의(프로필 생성 성공 후 사진 이동).

### DELETE /api/pending/[id] (세션 인증, 거절)
- pending 사진(Storage) + 행 삭제.

## UI

### /pending 페이지 (신규)
- 헤더에 "대기 매물" 메뉴 추가(AppHeader NAV_LINKS).
- 대기 목록을 카드로 표시(사진 미리보기 + 프로필 정보), 각 카드에 [승인]/[거절] 버튼.
- 승인/거절 후 목록 갱신. 로딩·빈 상태 처리.

## DB 적용 (매칭과 동일 이슈)
- 마이그레이션 파일은 supabase/migrations/에 추가.
- secret key(REST)로는 CREATE TABLE 불가 → **사용자가 Supabase 대시보드 SQL Editor에서 실행**.

## 테스트/검증
- 순수 로직(zod 스키마 검증, 필드 매핑) 단위 테스트.
- API는 로컬에서 curl로 실제 호출 테스트(단, DB 테이블 생성 후). 사용자가 SQL 실행 전엔 테이블 없어 실패.
- 타입/린트/기존 테스트 통과.

## 비목표
- API 키 회전·다중 키·rate limit는 범위 밖(단일 EXTERNAL_API_KEY).
- 대기 매물 수정 기능 없음(승인/거절만). 수정은 승인 후 기존 편집으로.

## 리스크
- DB 테이블 미적용 시 전체 기능 미동작(매칭과 동일 상태) — 사용자 SQL 실행 의존.
- 승인 시 다단계(프로필 생성→사진 이동→pending 삭제) 부분 실패 가능 → 순서·롤백 주의.
- multipart 파일 크기: Vercel 서버리스 바디 제한(기본 4.5MB) 주의 — 큰 사진 다수면 제한 걸릴 수 있음. 문서에 명시.
