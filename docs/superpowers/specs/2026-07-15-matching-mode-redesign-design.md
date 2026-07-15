# 매칭 모드 재설계 + 순서 반영 버그 수정 설계

작성일: 2026-07-15 · 브랜치: `ed_dev`

## 배경

직전 세션에서 넣은 두 기능에 문제가 발견됨:
1. 편집모드 수동 순서 드래그 — 끌리긴 하는데 **위치가 안 바뀜**(버그).
2. 일반 대시보드에서 카드를 드래그해 이성 위에 놓는 "짝지기" — 드래그 중 **아무것도 안 보여 가시성 나쁨**, UX가 어색함.

→ 순서 버그는 고치고, 짝지기 드래그는 **매칭 탭 안의 "매칭 모드"로 재설계**한다.

## 이슈 1 — 수동 순서 반영 버그 수정

**원인**: 기존 매물의 `manualOrderWeight`가 전부 `0`(기본값). `computeDroppedWeight`는 이웃의 midpoint를 쓰는데, 이웃이 모두 0이면:
- 중간으로 드롭 → `(0+0)/2 = 0` → 값이 안 바뀌어 순서 그대로.
- 맨 위/아래만 `-1`/`+1`이라 그때만 움직이는 것처럼 보임.

즉 midpoint 방식은 "이웃 가중치가 서로 다르다"는 전제인데 초기 상태가 이를 깨뜨린다.

**수정**: 드롭 시 **재배열 후 전체 순번 재부여** 방식으로 교체.
- `@dnd-kit/sortable`의 `arrayMove`로 현재 표시 순서(`visibleProfiles`)에서 `fromIndex → toIndex`로 옮긴 새 배열을 만든다.
- 그 새 배열에 인덱스 기반 가중치 `0, 1, 2, …`를 순서대로 부여.
- **값이 실제로 바뀐 행만** `PATCH /api/profiles/[id]` (여러 개일 수 있음). 149개 규모에서 감당 가능. 낙관적 업데이트는 로컬 `profiles` state를 새 가중치로 갱신.
- 순수 함수 `reorderWeights(list, fromIndex, toIndex): {id, manualOrderWeight}[]` 로 분리해 TDD. 변경된 항목만 반환.
- 기존 `computeDroppedWeight`는 제거(또는 대체). 정렬 티어(`compareProfiles`의 `manualOrderWeight` 오름차순)는 그대로 두면 새 순번이 그대로 반영됨.
- **주의**: 정렬 우선순위는 여전히 집착 > 리워드 > 수동가중치. 리워드/집착이 걸린 카드는 수동 순서로 그 위로 못 올라감(설계상 의도, 유지). 순번 재부여는 "같은 티어 안에서의 순서"를 정확히 만든다.
- 마이그레이션(`reward`/`manual_order_weight`)은 사용자가 이미 DB에 실행 완료.

**에러 처리**: 여러 행 PATCH 중 하나라도 실패(또는 stripped-column 감지)하면 롤백 + 기존 "순서 저장 실패" 안내. (기존 단일-PATCH 감지 로직을 다중으로 확장.)

## 이슈 2 — 매칭 모드 재설계

### 제거
- **일반 대시보드(남/여 탭)의 짝지기 드래그 전면 제거**:
  - 상태 `draggingId`, `draggingProfile`, `oppositeGender`, `pairDropTargets` 제거.
  - `handleDragStart`(일반모드 분기), `handlePairDragEnd`, `handleGridDragEnd`의 비편집 분기 제거.
  - 일반 탭 그리드의 `draggingId && !isEditMode ? 드롭타깃뷰 : 일반그리드` 분기 제거 → 일반 탭은 그냥 그리드.
  - 일반 탭 카드는 **편집모드에서만 드래그(순서변경)**. 비편집 시 `sortable=false`.
  - DndContext는 일반 탭에선 편집모드 순서변경 용도로만 남김(또는 편집모드일 때만 감쌈).

### 매칭 탭 재구성
- **매칭 모드 토글**(편집모드처럼): 매칭 탭 상단에 "매칭 모드" 버튼. `matchMode: boolean` state. 켜면 매칭 모드 뷰, 끄면 기존 커플 목록.
  - 매칭/지원을 확정해도 모드 **유지**(연속 작업). 토글 끌 때만 해제.
- **매칭 탭 툴바 제거**: 매칭 탭에서는 전체 선택/선택 초기화/공유 선택 카운트 등 성별 그리드용 툴바 숨김(커플 목록·매칭 모드 모두).

### 매칭 모드 뷰 (옵션 A: 좌/우 2열)
- 화면을 좌(여자)·우(남자) 2칼럼으로 고정. 각 칼럼은 해당 성별 **활성 매물**을 작게보기 수준 카드로 **세로 리스트**.
- 여자 카드를 오른쪽 남자 카드 위로(또는 남자→여자) **드래그**해서 매칭.
- 드롭 → 기존 `PairActionModal`(여자↔💞↔남자) 팝업, [💞 매칭] / [📋 지원] 유지.
  - 💞 매칭 → `handleCreateMatch(femaleId, maleId)` (기존, 409 중복방지 포함).
  - 📋 지원 → 기존 합본 공유(`buildPairShareText` + 사진 병합).
- **드래그 가시성**: `@dnd-kit`의 `DragOverlay`로 **들고 있는 카드의 반투명 고스트**를 커서/손가락에 붙여 표시. (편집모드 순서 드래그에도 동일 적용해 일관성 — 구현 시 함께.)
- 드롭 대상은 **반대 성별 카드만** 유효. 같은 성별에 놓으면 무시.

### 재사용
- `PairActionModal`, `buildPairShareText`, `handleCreateMatch`, `getOngoingPairs`(커플 목록), `MatchPairCard`(커플 목록)는 그대로 재사용.
- 매칭 모드 좌/우 뷰는 신규(작게보기 카드 재사용: `ProfileCard variant="compact"` 또는 경량 미니 카드).

## 컴포넌트/파일 영향

| 항목 | 파일 |
|---|---|
| 순번 재부여 순수함수 + 테스트 | `src/lib/profiles/manual-order.ts`(교체), `manual-order.test.ts` |
| 다중 PATCH reorder 핸들러 | `src/components/Dashboard.tsx` `handleReorder` |
| 일반모드 짝지기 드래그 제거 | `src/components/Dashboard.tsx` (상태·핸들러·렌더 분기) |
| 매칭 모드 토글 + 좌/우 뷰 + DragOverlay | `src/components/Dashboard.tsx`, 신규 `MatchMakingBoard.tsx`(좌/우 드래그 보드) |
| 매칭 탭 툴바 숨김 | `src/components/Dashboard.tsx` (툴바 렌더 조건) |
| 재사용 | `PairActionModal.tsx`, `share-text.ts`, `matches/summary.ts`, `MatchPairCard.tsx` (변경 없음) |

## 테스트 전략
- **단위(vitest)**: `reorderWeights`(맨 위/중간/맨 아래로 이동 시 변경 행·가중치 정확). 기존 `computeDroppedWeight` 테스트는 대체.
- **회귀**: 상세보기 모달 자동닫힘 테스트(직전 수정) 유지.
- **수동 확인**: 편집모드에서 카드 중간으로 드래그 → 그 자리로 이동 + 새로고침 후 유지. 일반 탭에선 비편집 시 드래그 안 됨. 매칭 탭 "매칭 모드" 켜기 → 좌/우 뷰 → 드래그 시 반투명 고스트 → 드롭 → PairActionModal → 매칭/지원. 매칭 탭 툴바 없음.

## 리스크
- 다중 PATCH: 드롭 한 번에 여러 행 저장(대개 이동 구간 사이 행들만 변함). 순번 재부여라 변경 행이 많아질 수 있으나 149개 규모면 수용. 실패 시 롤백.
- `DragOverlay` 도입 시 드래그 소스 카드가 언마운트돼도 오버레이가 고스트를 유지하므로 가시성 해결.
- 로컬=prod DB: 순서 저장·매칭 생성이 실데이터 변경. 테스트 시 주의.
