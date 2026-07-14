# 매칭·리워드·순서 기능 묶음 설계

작성일: 2026-07-14 · 브랜치: `ed_dev`

## 개요

카연 대시보드에 6개 기능을 추가한다. 서로 얽힌 정도에 따라 4개 묶음(A~D)으로 나눠 구현한다.

1. 매칭현황에서 상대 썸네일 클릭 → 상대 상세보기로 전환 (묶음 A)
2. 남/여 탭 옆 "매칭" 탭 — 진행중 매칭 쌍을 커플 카드로 (묶음 A)
3. 매물 "리워드" 항목(관리자 전용, 자유 텍스트) — 상세=글자 그대로, 카드=🎁 뱃지+요약, 작게보기=🎁 뱃지만 (묶음 B)
4. 리워드 보유 매물을 기본순에서 상위로 (묶음 B)
5. 매물을 이성 매물 위로 드래그 → 짝지기 view → 매칭/지원 선택 (묶음 D)
6. 편집모드에서 드래그로 순서 커스텀, 숫자 가중치를 DB에 저장해 공유 (묶음 C)

## 확정된 결정

- **리워드 데이터 형태**: 자유 텍스트 (관리자 전용).
- **기본순 정렬 우선순위**: 집착매물 → 리워드 보유 → 수동 가중치 → 활성 → 최신 등록순. **`sortField === 'default'`일 때만** 리워드·수동가중치 티어 적용. 나이/키/등록일 정렬을 고르면 이 티어는 무시(집착매물 최상단은 유지).
- **매칭 탭**: 진행중 매칭 쌍을 여자↔남자 커플 카드로 나란히.
- **지원 복사**: 두 프로필 텍스트+사진을 한 번에 합쳐서 공유(`navigator.share` 제스처당 1회 제약과도 일치).
- **드래그 모드 분리**: 편집모드 = 순서 재배치(기능 6), 일반모드 = 짝지기 view(기능 5).
- **DnD 라이브러리**: `@dnd-kit` (포인터+터치 센서, 모바일/PC 공통).
- **수동 가중치 범위**: 성별별 독립(여자 목록·남자 목록 각각의 순서).

## 아키텍처: 데이터 흐름

기존 흐름 그대로 유지한다:

```
DB row → rowToProfile → GET /api/profiles → Dashboard state (profiles)
       → filterProfiles(compareProfiles) → ProfileCard / ProfileDetailModal
```

새 필드(`reward`, `manualOrderWeight`)는 이 각 계층을 통과시킨다:
`types/profile.ts` → `lib/supabase/types.ts`(Row/Insert/Update) → `lib/supabase/mappers.ts`(insertRow / `profileFieldMap` / rowToProfile) → `lib/profiles/form.ts`(5곳) → `sample-data.ts` / `storage/profiles.ts`.

`matches`와 `profiles`는 이미 Dashboard state에 둘 다 로드되어 있으므로 매칭 탭·짝지기 view는 추가 fetch 없이 소비한다.

---

## 묶음 A — 매칭 (기능 1, 2)

### A-1. 매칭현황 썸네일 클릭 → 상대 상세보기

`ProfileDetailModal`의 `onOpenProfile(profileId)` 콜백이 **이미 배선**되어 있다(현재는 상대 요약 텍스트 버튼 `onClick={() => partner && onOpenProfile(partner.id)}`, `ProfileDetailModal.tsx:236-245`에만 연결). Dashboard가 `detailProfileId` state로 모달을 구동하고 `key={detailProfile.id}`로 리마운트하므로 상대 프로필로 자연스럽게 전환된다.

**변경**: `PartnerThumb`(썸네일, `ProfileDetailModal.tsx:316-327`)를 클릭 가능한 `<button>`으로 만들어 같은 `onOpenProfile(partner.id)`를 호출한다. 매칭현황 행(235행)과 후보(candidate) 목록(290행) 양쪽의 썸네일에 적용. 삭제된 매물(`partner === undefined`)이면 비활성(disabled). 접근성: `aria-label`로 "상세보기 열기" 제공.

### A-2. 매칭 탭

`Dashboard`는 현재 별도 탭 state 없이 `filters.gender`로 탭을 대신한다. `gender`는 `'male' | 'female'` union이고 `filterProfiles`가 이를 하드필터하므로, 세 번째 탭을 gender에 끼워넣지 않는다.

**변경**:
- Dashboard에 `const [activeTab, setActiveTab] = useState<'female' | 'male' | 'matching'>('female')` 신설. 여성/남성 선택은 `activeTab`과 `filters.gender`를 함께 갱신(기존 `switchGender` 확장). "매칭"은 `activeTab`만 `'matching'`으로.
- 탭 UI(`Dashboard.tsx:491-505`): 여성/남성 오른쪽에 "💞 매칭" 버튼 추가.
- 렌더 분기(`Dashboard.tsx` 프로필 `<section>`): `activeTab === 'matching'`이면 프로필 그리드 대신 **커플 카드 목록**을 렌더. 이때 필터/정렬/뷰 토글 등 성별 목록 전용 툴바는 매칭 탭에선 숨기거나 비활성.
- `lib/matches/summary.ts`에 `getOngoingPairs(matches, profiles)` 추가 → `{match, female, male}[]` 반환. 진행중(`status === 'ongoing'`) 매칭만, 양쪽 프로필을 `profiles.find`로 resolve(삭제된 쪽은 `undefined` → placeholder). `created_at` 내림차순(최신 매칭 위).
- **커플 카드 컴포넌트**(신설, 예: `components/MatchPairCard.tsx`): 좌(여자 미니카드) — 💞 — 우(남자 미니카드). 각 미니 카드는 대표사진(`photos[0]`) + 년생/사는곳, 클릭 시 해당 상세보기(`setDetailProfileId`). 카드에 종료/삭제 버튼(기존 `handleEndMatch`/`handleDeleteMatch` 재사용). 삭제된 매물 쪽은 "(삭제된 매물)" placeholder.

---

## 묶음 B — 리워드 필드 (기능 3, 4)

### B-1. DB·타입·API 배선

- **마이그레이션**(신설, `20260714000000_profile_reward.sql`): `alter table public.profiles add column if not exists reward text not null default '';` `RUN_IN_SQL_EDITOR.sql`에 ⑤번으로 추가.
- **graceful fallback**: `lib/supabase/admin-columns.ts`의 `ADMIN_ONLY_DB_COLUMNS`에 `'reward'` 추가 → 마이그레이션 미실행이어도 POST/PATCH가 컬럼 없으면 빼고 재시도(기존 `probe` 등과 동일). 라우트 자체는 수정 불필요.
- **타입**: `Profile`에 `reward: string` 추가. `lib/supabase/types.ts`의 Row/Insert/Update에 `reward?` optional로(다른 admin 필드와 동일).
- **mappers**: `rowToProfile`에 `reward: row.reward ?? ''`, `profileToInsertRow`에 `reward`, `profileFieldMap`에 `['reward', 'reward']`.
- **비-DB 생성자**: `sample-data.ts`, `storage/profiles.ts`의 `normalizeStoredProfile`에 `reward` 추가(TS가 잡아줌).

### B-2. 폼 입력

`ProfileFormModal.tsx`의 관리자 amber fieldset("관리자 메모" 섹션, `548-585`)에 `TextField`로 "리워드" 입력 추가. "관리자 전용" 표기는 기존 fieldset 스타일 그대로. `form.ts` 5곳 스레딩: `ProfileFormValues`, `emptyProfileFormValues`, `profileToFormValues`, `normalizeProfileFormValues`(trim), `validateProfileFormValues`(검증 불필요, 자유 텍스트).

### B-3. 표시 3종

- **상세보기(글자 그대로)**: `lib/profiles/information.ts`의 `getAdminInformationRows`에 `if (profile.reward.trim()) rows.push(['리워드', profile.reward])` 추가 → 🔒 관리자 전용 박스(`ProfileDetailModal.tsx:185-204`)에 자동 노출. **주의**: 관리자 박스는 pill 형태라 긴 텍스트에 부적합할 수 있음 → 리워드는 pill 대신 별도 줄(전체폭)로 렌더하도록 관리자 박스 렌더를 소폭 조정하거나, `getAdminInformationRows`와 별개로 모달에 리워드 전용 줄을 추가. 구현 시 실제 렌더 확인.
- **대시보드 카드(상세보기 variant)**: `ProfileCard.tsx` 뱃지 클러스터(`166-201`)에 🎁 뱃지 + 리워드 텍스트(짧게, `truncate`). `profile.reward.trim()` 있을 때만. `isStarred` 뱃지 패턴 복사.
- **작게보기(compact variant)**: 같은 뱃지 클러스터에서 🎁 아이콘만(텍스트 숨김), 기존 `isCompact ? 소형 : 일반` 분기대로.
- 리워드는 관리자 전용 정보지만 뱃지는 대시보드에 항상 노출(오피스모드에서도 뱃지 자체는 보임 — 승인됨). 단, 공유 텍스트(`buildShareText`)에는 `getAdminInformationRows`가 포함되지 않으므로 리워드가 새어나가지 않음(확인됨).

### B-4. 정렬 (기능 4)

`filter.ts`의 `compareProfiles`에 티어 삽입. 판단은 `hasReward = profile.reward.trim().length > 0`.

```
compareProfiles 우선순위 (sortField === 'default'):
  1. 집착매물 (starredByName)         ← 기존
  2. 리워드 보유 (hasReward)          ← 신규
  3. 수동 가중치 (manualOrderWeight)   ← 묶음 C, 오름차순
  4. compareDefault (활성 → 최신)      ← 기존
sortField !== 'default':
  1. 집착매물만 유지, 이후 compareBySort (리워드·가중치 티어 미적용)
```

`filter.test.ts`에 "리워드 보유가 집착 다음, 일반보다 위" 케이스 추가. 기존 starred 테스트가 스펙 역할이므로 깨지지 않게 티어 순서 준수.

---

## 묶음 C — 수동 순서 (기능 6)

### C-1. 저장 방식

- **컬럼**(위 마이그레이션에 함께): `manual_order_weight double precision not null default 0`. 성별 무관 단일 컬럼(값 분포로 성별 목록이 자연 분리됨). `admin` 전용 아님 — 항상 존재해야 정렬에 쓰이므로 `ADMIN_ONLY_DB_COLUMNS`에는 넣지 않되, 마이그레이션 미실행 상황을 위해 `rowToProfile`에서 `?? 0` 방어. **단, 이 컬럼이 없으면 PATCH가 깨질 수 있으므로**, 순서 저장 기능은 마이그레이션 적용을 전제로 한다(리워드와 달리 "없어도 안 깨짐"을 보장하기 어려움). 안전을 위해 `manual_order_weight`도 fallback 목록에 포함하는 방안을 구현 시 검토(단, 그러면 순서 저장이 조용히 무시됨 → 사용자에게 마이그레이션 필요 안내).
- **분수 랭킹(midpoint)**: 카드를 두 이웃 사이로 드롭하면 `weight = (prevWeight + nextWeight) / 2`. 맨 위로 = `firstWeight - 1`, 맨 아래 = `lastWeight + 1`. **이동한 1개만 PATCH** → 149개 규모에서 전체 재작성 회피.
- 초기값 0 동률이 많으므로, 첫 드래그 시 대상 목록의 현재 표시 순서를 기준으로 weight를 산정. `compareProfiles`의 수동 가중치 티어는 **오름차순**(작을수록 위), 동률이면 다음 티어(활성/최신)로 자연 강등.

### C-2. 드래그 (편집모드)

- `@dnd-kit`의 `DndContext` + `SortableContext`로 **편집모드에서만** 카드 재정렬 활성. 현재 탭(여자/남자) 목록 안에서만 재배치(성별별 독립).
- 드롭 시: 새 weight 계산 → `PATCH /api/profiles/[id]` (기존 `UpdatableProfile` 경로) → 로컬 `profiles` state 갱신 → `filterProfiles` 재정렬로 위치 반영.
- 편집모드가 아니면 SortableContext 비활성(짝지기 드래그와 분리).

---

## 묶음 D — 짝지기 view (기능 5)

### D-1. 일반모드 드래그 → 짝지기

- 일반모드(편집모드 아님)에서 카드 드래그 시작 시, `@dnd-kit`의 `onDragStart`에서 **이성 목록을 드롭 타깃으로 노출**. 구현 방식(택1, 구현 시 UX 확인):
  - (기본안) 드래그 시작하면 현재 그리드를 이성 성별 목록으로 임시 전환하고, 드롭/취소 시 원 탭 복귀.
  - 화면이 좁은 모바일에선 전환 방식이 더 명확.
- 이성 카드 위에 드롭하면 **짝지기 view 모달**(신설, 예: `components/PairActionModal.tsx`) 오픈: 두 프로필 미니 카드 좌우 + 하단 액션 버튼 [💞 매칭] / [📋 지원].

### D-2. 액션

- **매칭**: 기존 `handleCreateMatch(femaleId, maleId)` 호출(female/male 순서 정렬은 `ProfileDetailModal`의 `handleCreate` 로직 참고) → 매칭 상태 전환 + history 기록(기존 경로) → 모달 닫기. 중복은 기존 409 방지로 커버.
- **지원**: 두 프로필을 한 번에 합쳐서 공유.
  - `lib/profiles/share-text.ts`에 `buildPairShareText(a, b)` 추가 — 각 `buildShareText` 결과를 구분선(예: `\n\n───────\n\n`)으로 연결. 관리자 필드·리워드는 여전히 제외(기존 `buildShareText`가 `getProfileInformationRows`만 사용).
  - 사진: 두 프로필의 `photos` URL을 합쳐 `urlsToFiles`로 하나의 `files[]` 생성 → `canNativeShareFiles`면 `navigator.share({files})`(모바일), 아니면 각각 다운로드(PC). 텍스트는 클립보드에 합본 복사.
  - `NaturalShareButton`은 단일 profile 전용이므로, 짝지기용 공유는 모달 내 별도 핸들러로 구현(공유 헬퍼는 재사용).

### D-3. 모바일/PC

- `@dnd-kit` `PointerSensor` + `TouchSensor`. 터치는 activation constraint(예: `delay: 200ms, tolerance: 5px`)로 롱프레스 시작 → 세로 스크롤과 드래그 구분. PC는 pointer로 즉시 드래그.

---

## 구현 순서와 병렬화

DB 스레딩(B-1)과 정렬(B-4/C-1)이 공유 지점이라 **먼저 직렬**로 처리한 뒤 나머지를 병렬화한다.

1. **선행(직렬)**: B-1(리워드+`manual_order_weight` 컬럼·타입·mapper·마이그레이션) → filter.ts 정렬 티어(B-4+C-1 sort). 이 두 개가 다른 묶음의 토대.
2. **병렬 가능**: 묶음 A(매칭), 묶음 B 나머지(폼·표시), 묶음 C 드래그, 묶음 D 짝지기. `@dnd-kit` 도입은 C·D 공통이므로 한쪽에서 설치.

각 묶음은 TDD로 진행하며(로직은 vitest, 특히 `filter.test.ts`·`summary` 헬퍼·`buildPairShareText`), 마지막에 `pnpm build` + 전체 테스트 통과 + 실제 앱 구동 확인.

## 테스트 전략

- **단위(vitest)**: `compareProfiles`(리워드·가중치 티어), `getOngoingPairs`, `buildPairShareText`, 분수 랭킹 weight 계산 함수(순수 함수로 분리).
- **수동 확인**: 매칭 탭 렌더, 썸네일 클릭 전환, 리워드 뱃지 3종, 편집모드 드래그 순서 저장(새로고침 후 유지), 일반모드 짝지기 드래그(모바일 뷰 포함), 지원 합본 공유.

## 리스크·주의

- **`@dnd-kit` 의존성 추가**: 번들 증가. 편집모드/드래그에서만 필요하므로 동적 import 검토.
- **`manual_order_weight` 마이그레이션 전제**: 리워드와 달리 "없어도 안 깨짐"을 완전히 보장하기 어려움. 미적용 시 순서 저장이 조용히 실패하지 않도록 처리(안내 or fallback) — 구현 시 확정.
- **정렬 티어 회귀**: 기존 `filter.test.ts`가 스펙. 티어 삽입 시 집착매물 최상단·기존 정렬 동작을 깨지 않도록 테스트 먼저.
- **로컬=prod DB**: `.env.local`이 실제 prod에 연결됨. 드래그 순서 저장 테스트가 실데이터 weight를 바꾼다 — 주의.
