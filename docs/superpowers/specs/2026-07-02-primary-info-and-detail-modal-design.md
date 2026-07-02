# 매물 정보 분류 · 상세 모달 · 정렬 개선

작성일: 2026-07-02

## 목표

데이터 일관성과 조회 UX 개선. 네 가지를 함께 처리한다.

1. **정보 분류**: 매물 등록 폼을 "주요 정보 / 추가 정보" 섹션으로 구분.
2. **카드 균일화**: 대시보드 카드는 주요 정보만 표시하고, 모든 카드가 동일한 크기를 갖는다.
3. **상세 모달**: 카드 클릭 시 사진 라이트박스 대신 상세 정보 모달을 띄운다 (좌: 사진 슬라이더, 우: 전체 정보).
4. **정렬**: 기본 정렬을 최신 등록순으로, 단 집착매물은 항상 앞에.

## 비목표 (YAGNI)

- DB/API 변경 없음. `created_at`이 이미 존재하고 등록 시간이 기록되므로 그대로 활용한다.
- profiles 테이블 스키마·필드는 그대로. "주요/추가"는 표시 구분일 뿐 데이터 구조를 바꾸지 않는다.
- 공개 상세페이지(`/profiles/[id]`, 카톡 공유용)는 건드리지 않는다. 모달은 대시보드 전용 신규 컴포넌트.

## 주요 정보 정의

주요 정보 = **나이(년생) / 키 / 사는 곳 / 회사**. 폼에서는 성별(필수)도 주요 섹션에 함께 둔다.
나머지(종교 / MBTI / 취미 / 흡연 / 음주 / 이상형 / 주선자 코멘트 / 기타)는 추가 정보.

## 설계

### 1. 정보 분류 상수 (lib/profiles/information.ts)

- `PRIMARY_INFO_LABELS = ['나이', '키', '사는 곳', '회사']` 상수 정의.
- `getPrimaryInformationRows(profile)`: 주요 4개 행 반환.
- `getAdditionalInformationRows(profile)`: 나머지 행 반환(값이 있는 것만, 기존 조건부 로직 유지).
- 기존 `getProfileInformationRows(profile)`: 주요+추가를 합친 결과로 유지 → 공개 상세페이지 등 기존 사용처 호환.

### 2. 폼 섹션 분리 (components/ProfileFormModal.tsx)

- 폼을 "주요 정보" / "추가 정보" 두 섹션으로 시각적 구분(제목 헤더 + 구분선/여백).
- 주요 정보 섹션: 성별, 년생, 키, 사는 곳, 회사.
- 추가 정보 섹션: 종교, MBTI, 취미, 흡연, 음주, 이상형, 주선자 코멘트, 기타.
- 필드·검증(validateProfileFormValues)·저장 흐름은 변경 없음. 순수 레이아웃 재배치.

### 3. 대시보드 카드 균일화 (components/ProfileCard.tsx, Dashboard.tsx)

- 카드는 주요 정보만 표시 — 년생 / 키 / 사는 곳 / 회사 (현재 compact의 슬래시 요약과 동일).
- 모든 카드 동일 크기: 사진 aspect 고정(정사각), 정보 영역 높이 고정. 긴 회사명은 말줄임(truncate) 또는 최대 2줄 제한으로 카드 높이 흔들림 방지.
- detailed/compact 뷰 토글은 유지. 균일 규칙을 두 뷰에 적용.

### 4. 상세 정보 모달 (신규 components/ProfileDetailModal.tsx)

- 카드 사진 클릭 시 기존 `PhotoLightbox` 대신 이 모달을 연다.
- 레이아웃:
  - 좌측(PC) / 상단(모바일): 사진 슬라이더 — 기존 `PhotoSlider` 재사용, 사진 넘김 기능 유지.
  - 우측(PC) / 하단(모바일): 전체 정보(주요+추가), `getProfileInformationRows` 재사용.
- 닫기: X 버튼, 배경 클릭, ESC.
- 모달은 조회 전용. 수정/삭제/별/상태토글은 기존 카드 컨트롤로 유지.
- body scroll lock: 기존 `useBodyScrollLock` 훅 재사용.

### 5. 정렬 (lib/profiles/filter.ts)

`filterProfiles`의 정렬을 다음 우선순위로 변경:
1. 내 집착매물 우선 — `starredByName === authorName`. 정렬에 authorName이 필요하므로 `filterProfiles(profiles, filters, authorName)`로 시그니처 확장.
2. 활성(active) > 차단(blocked) — 기존 규칙 유지.
3. 같은 그룹 내 `createdAt` 내림차순(최신 등록순).

- `Profile` 타입에 `createdAt`이 이미 있으므로 그대로 사용.
- 시그니처 변경에 맞춰 `filter.test.ts`와 Dashboard 호출부 갱신.

## 테스트 / 검증

- `information.test.ts`(신규 또는 확장): 주요/추가 분류가 정확한지.
- `filter.test.ts`: 집착 → 활성 → 최신순 정렬 검증(집착매물 앞, 최신 등록 우선).
- `ProfileCard.test.tsx`: 카드가 주요 정보만 표시.
- 모달·폼 섹션·카드 균일 크기: 로컬 dev 서버(localhost:3100) 브라우저 확인.
- `pnpm test`, 타입체크, 린트 통과.

## 리스크

- `filterProfiles` 시그니처 변경 → 호출부/테스트 동시 수정 필요(내부 한정, 안전).
- 카드 균일 높이: 정보 영역 고정 시 긴 텍스트 잘림 → truncate로 처리, 전체 내용은 모달에서 확인 가능하므로 UX 손실 없음.
- 나머지 DB/API 불변으로 리스크 낮음.
