# 매칭(주선) 현황 관리

작성일: 2026-07-02

## 목표

매물 간 주선(매칭) 현황을 관리한다. 프로필 상세 모달을 매칭 허브로 확장해, 현황 조회와 매칭 생성/종료를 한곳에서 처리한다.

- 매칭 = 여성 1 ↔ 남성 1 관계. 한 프로필은 동시에 여러 매칭에 속할 수 있다(1대다).
- 상태 2단계: 진행중(ongoing) / 종료(ended). 종료해도 이력은 보존.
- 메모 저장. 주선한 사람(세션 이름)과 생성/종료 시각 기록.
- 카드에 진행중 매칭 수 배지. 매칭 생성/종료는 히스토리에도 기록.

## 데이터 모델 (신규 마이그레이션)

### matches 테이블

```sql
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  female_id uuid not null references public.profiles(id) on delete cascade,
  male_id   uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'ongoing',
  memo text not null default '',
  created_by_name text not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint matches_status_check check (status in ('ongoing','ended')),
  constraint matches_created_by_name_not_blank check (btrim(created_by_name) <> '')
);

create index matches_female_id_idx on public.matches (female_id);
create index matches_male_id_idx on public.matches (male_id);
-- 같은 (여성,남성) 쌍이 동시에 ongoing 2건 생기지 않도록
create unique index matches_unique_ongoing
  on public.matches (female_id, male_id) where status = 'ongoing';
```

- 항상 여↔남이므로 female_id/male_id로 명시 → 성별 조합 강제 + 쿼리 단순.
- 종료해도 행 삭제 안 함(status='ended'). 프로필 삭제 시에만 CASCADE.
- RLS: 기존 패턴대로 authenticated + is_app_user() 정책 4종(select/insert/update/delete). grant 포함.

### history_events 타입 확장

`history_events_type_check`에 `match_created`, `match_ended` 추가(마이그레이션에서 CHECK 제약 교체). 타입 정의(`types/history.ts`)에도 추가.

## API 라우트 (기존 /api/profiles 패턴 따름, runtime nodejs)

- `GET /api/matches` — 전체 매칭. `?profileId=`로 특정 프로필 관련만 필터.
- `POST /api/matches` — 생성 `{femaleId, maleId}`. created_by_name = 세션 이름. 중복 ongoing은 unique index가 막음 → 409/에러 메시지.
- `PATCH /api/matches/[id]` — `{status?, memo?}`. status='ended'면 ended_at=now().
- `DELETE /api/matches/[id]` — 오등록 취소용 완전 삭제.

타입: `types/match.ts`에 `Match`. mapper에 `rowToMatch`.

## UI

### 상세 모달 매칭 허브 (ProfileDetailModal.tsx)

정보 패널 하단에 매칭 섹션:
- 매칭 현황: 연결된 상대 리스트(상대 요약 + 진행중/종료 + [종료]/[삭제]). 상대 클릭 시 해당 프로필 상세로 전환.
- [+ 매칭 추가] → 이성 매물 리스트 표시(이 프로필이 여성이면 남성 목록, 활성 매물 한정) → 항목 클릭 = 즉시 매칭 생성.
- 데이터는 부모(Dashboard)가 로드해 props로 전달, 생성/종료/삭제 콜백도 props.

### 카드 배지 (ProfileCard.tsx)

- 진행중 매칭이 있으면 카드에 배지(예: "💞 2"). 진행중 개수만 카운트.
- `ongoingMatchCount` prop 추가(기본 0). 0이면 배지 없음.

### Dashboard 연동

- 마운트 시 `/api/matches` 로드 → 프로필별 진행중 수 map 계산(순수 함수로 분리, 테스트).
- 생성/종료/삭제 후 매칭 state 갱신.
- 이성 매물 리스트 = profiles에서 반대 성별 + active 필터(순수 함수, 테스트).
- 매칭 생성/종료 시 recordHistory 호출(match_created/match_ended).

## 테스트 / 검증

- 순수 로직 단위 테스트: 프로필별 진행중 매칭 카운트, 이성 후보 필터.
- API/모달/배지: 로컬 브라우저 확인.
- pnpm test / 타입체크 / 린트 통과.

## DB 적용 주의 (스키마 드리프트)

- 마이그레이션 파일은 supabase/migrations/에 추가한다.
- 단, 로컬이 실제 prod DB에 직접 연결돼 있고 리포 마이그레이션이 실제 스키마보다 뒤처져 있으므로(`supabase db reset` 위험), 테이블 생성은 secret key로 해당 DDL만 직접 실행하거나 사용자 확인 후 진행한다. 구현 단계에서 재확인.

## 리스크

- DB 변경 있는 첫 기능 → 마이그레이션 적용을 신중히(위 주의).
- 중복 ongoing 방지는 DB unique index로 보장, API는 에러만 처리.
- 프로필 삭제 시 관련 매칭 CASCADE 삭제 — 이력도 사라지지만 프로필 자체가 없어지는 것이라 허용.
