# 매칭 모드 재설계 + 순서 반영 버그 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 편집모드 수동 순서 드래그가 실제로 위치를 바꾸도록 고치고, 일반 대시보드의 짝지기 드래그를 제거한 뒤 매칭 탭의 "매칭 모드"(좌=여자/우=남자 드래그 보드 + 반투명 DragOverlay)로 재설계한다.

**Architecture:** 순서 저장은 midpoint → "재배열 후 순번 재부여(0..n) + 변경 행만 다중 PATCH"로 교체. 일반모드 짝지기 드래그 배선 제거. 매칭 탭에 `matchMode` 토글과 좌/우 드래그 보드 신규. 기존 `PairActionModal`/`buildPairShareText`/`handleCreateMatch`/`getOngoingPairs` 재사용.

**Tech Stack:** Next.js 16, React 19, TS, Tailwind v4, @dnd-kit(core/sortable/utilities), vitest.

## Global Constraints

- 로컬 명령 앞에 항상 `export PATH="$HOME/.local/node-arm64/bin:$PATH"` (arm64 Node). pnpm.
- `.env.local`이 실제 prod Supabase에 연결 — 순서 저장·매칭 생성이 실데이터 변경. `reward`/`manual_order_weight` 컬럼은 이미 prod에 적용됨(사용자 실행 완료).
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. push는 지시할 때만.
- 정렬 우선순위(기본순): 집착매물 → 리워드 → 수동가중치(오름차순) → 활성 → 최신. 이 순위는 **유지**한다. 순번 재부여는 "같은 티어 안 순서"만 정확히 만든다(리워드/집착 카드 위로는 못 올림 — 의도된 동작).
- 기존 테스트 회귀 금지. 각 태스크 끝에 `pnpm test` 전체 통과 + `pnpm build` 성공 확인. 상세보기 모달 자동닫힘 회귀 테스트(ProfileDetailModal.strictmode.test.tsx) 유지.

---

## Task 1: 순서 반영 버그 — reorderWeights + 다중 PATCH

**문제:** 기존 매물의 `manualOrderWeight`가 전부 0이라 `computeDroppedWeight`의 midpoint가 `(0+0)/2=0` → 중간 드롭 시 순서 안 바뀜. 재배열 후 순번 재부여로 교체.

**Files:**
- Modify/replace: `src/lib/profiles/manual-order.ts`
- Test: `src/lib/profiles/manual-order.test.ts` (교체)
- Modify: `src/components/Dashboard.tsx` (`handleReorder`)

**Interfaces:**
- Produces: `reorderWeights(list: Profile[], fromIndex: number, toIndex: number): {id: string; manualOrderWeight: number}[]` — `arrayMove` 후 0..n 재부여, **가중치가 실제로 바뀐 행만** 반환. `computeDroppedWeight`는 제거.

- [ ] **Step 1: 실패 테스트 작성 (교체)**

`src/lib/profiles/manual-order.test.ts` 전체를 아래로 교체:

```ts
import {describe, expect, it} from 'vitest';

import {reorderWeights} from './manual-order';
import type {Profile} from '@/types/profile';

// 초기 상태: 모두 weight 0 (실제 버그 재현 조건)
const p = (id: string, w = 0) => ({id, manualOrderWeight: w} as Profile);

describe('reorderWeights', () => {
  it('assigns 0..n by new order and returns only changed rows (move middle, all zero)', () => {
    const list = [p('a'), p('b'), p('c'), p('d')]; // 전부 0
    // c(2)를 index 1로: 새 순서 a,c,b,d → 가중치 a0 c1 b2 d3
    const changed = reorderWeights(list, 2, 1);
    // a는 0 그대로(변경 없음), c→1, b→2, d→3
    const byId = Object.fromEntries(changed.map(r => [r.id, r.manualOrderWeight]));
    expect(byId).toEqual({c: 1, b: 2, d: 3});
    expect(changed.find(r => r.id === 'a')).toBeUndefined();
  });

  it('moves to top', () => {
    const list = [p('a'), p('b'), p('c')];
    const changed = reorderWeights(list, 2, 0); // c 맨 위: c,a,b → c0 a1 b2
    const byId = Object.fromEntries(changed.map(r => [r.id, r.manualOrderWeight]));
    expect(byId).toEqual({c: 0, a: 1, b: 2});
  });

  it('moves to bottom', () => {
    const list = [p('a'), p('b'), p('c')];
    const changed = reorderWeights(list, 0, 2); // a 맨 아래: b,c,a → b0 c1 a2
    const byId = Object.fromEntries(changed.map(r => [r.id, r.manualOrderWeight]));
    expect(byId).toEqual({b: 0, c: 1, a: 2});
  });

  it('returns empty when position is unchanged', () => {
    const list = [p('a', 0), p('b', 1), p('c', 2)];
    expect(reorderWeights(list, 1, 1)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/manual-order.test.ts`
Expected: FAIL — `reorderWeights` 미정의.

- [ ] **Step 3: 구현 (manual-order.ts 교체)**

`src/lib/profiles/manual-order.ts` 전체를 아래로 교체:

```ts
import {arrayMove} from '@dnd-kit/sortable';

import type {Profile} from '@/types/profile';

// 편집모드 드래그 순서 저장. 표시 순서(list)에서 fromIndex→toIndex로 옮긴 뒤
// 전체에 0,1,2,… 순번 가중치를 재부여하고, 실제로 바뀐 행만 반환한다.
// (기존 매물이 전부 weight 0이라 midpoint 방식이 안 먹히던 문제를 해결)
export function reorderWeights(
  list: Profile[],
  fromIndex: number,
  toIndex: number,
): {id: string; manualOrderWeight: number}[] {
  const reordered = arrayMove(list, fromIndex, toIndex);
  const changed: {id: string; manualOrderWeight: number}[] = [];
  reordered.forEach((profile, index) => {
    if (profile.manualOrderWeight !== index) {
      changed.push({id: profile.id, manualOrderWeight: index});
    }
  });
  return changed;
}
```

- [ ] **Step 4: 통과 확인**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/manual-order.test.ts`
Expected: PASS.

- [ ] **Step 5: handleReorder 다중 PATCH로 교체**

`src/components/Dashboard.tsx`의 `handleReorder` 전체(대략 `const handleReorder = async (event: DragEndEvent) => {` 부터 그 함수 닫는 `};` 까지)를 아래로 교체. import에 `reorderWeights`가 있어야 함(기존 `computeDroppedWeight` import를 `reorderWeights`로 변경):

```ts
  // 편집모드 드래그 완료: 재배열 후 0..n 순번을 재부여하고, 바뀐 행만 PATCH.
  const handleReorder = async (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const fromIndex = visibleProfiles.findIndex(p => p.id === active.id);
    const toIndex = visibleProfiles.findIndex(p => p.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;

    const changes = reorderWeights(visibleProfiles, fromIndex, toIndex);
    if (changes.length === 0) return;

    // 롤백용 이전 가중치 보관
    const prevById = new Map(visibleProfiles.map(p => [p.id, p.manualOrderWeight]));
    const weightById = new Map(changes.map(c => [c.id, c.manualOrderWeight]));

    // 낙관적 업데이트
    setProfiles(current =>
      current.map(p => (weightById.has(p.id) ? {...p, manualOrderWeight: weightById.get(p.id)!} : p)),
    );

    const rollback = () =>
      setProfiles(current =>
        current.map(p => (prevById.has(p.id) ? {...p, manualOrderWeight: prevById.get(p.id)!} : p)),
      );
    const migrationAlert = () =>
      setAlertState({
        kind: 'alert',
        title: '순서 저장 실패',
        message: 'manual_order_weight 컬럼이 아직 DB에 없을 수 있습니다. RUN_IN_SQL_EDITOR.sql의 ⑤를 실행해 주세요.',
      });

    // 변경 행을 각각 PATCH. 하나라도 실패/stripped면 전체 롤백 + 안내.
    const results = await Promise.all(
      changes.map(async change => {
        try {
          const res = await fetch(`/api/profiles/${change.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({manualOrderWeight: change.manualOrderWeight}),
          });
          if (!res.ok) return false;
          const {profile: saved} = (await res.json()) as {profile: Profile};
          return saved.manualOrderWeight === change.manualOrderWeight;
        } catch {
          return false;
        }
      }),
    );
    if (results.some(ok => !ok)) {
      rollback();
      migrationAlert();
    }
  };
```

- [ ] **Step 6: 빌드 + 전체 테스트**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test && pnpm build`
Expected: 전체 통과 + 빌드 성공. (컴파일 에러 시 `computeDroppedWeight` 잔여 참조 제거.)

- [ ] **Step 7: 커밋**

```bash
git add -A && git commit -m "$(cat <<'EOF'
fix: 수동 순서 드래그를 순번 재부여 방식으로 교체(중간 이동 반영)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 일반 대시보드 짝지기 드래그 제거

일반 탭(남/여)에서 카드를 이성 위로 끌어 매칭하던 배선을 전부 걷어낸다. 일반 탭은 **편집모드 순서변경 드래그만** 남는다. (매칭은 Task 3의 매칭 모드로 이동.)

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Interfaces:**
- Consumes: Task 1의 `handleReorder`.
- Produces: 일반 탭 렌더가 `isEditMode`일 때만 DnD로 감싸지고, 비편집 시 순수 그리드. `draggingId`/`pairDropTargets`/`oppositeGender`/`draggingProfile`/`handlePairDragEnd`/`handleGridDragEnd` 제거. `handleDragStart`도 제거(편집모드 reorder는 onDragEnd만 필요).

- [ ] **Step 1: 짝지기 관련 상태·파생값 제거**

`src/components/Dashboard.tsx`에서 다음을 삭제:
- `const [draggingId, setDraggingId] = useState<string | null>(null);` (라인 ~184)
- `const draggingProfile = useMemo(...)` (라인 ~248)
- `const oppositeGender: Gender = ...` (라인 ~249)
- `const pairDropTargets = useMemo(...)` 블록 (라인 ~250-253)

`pairModal` 상태(`const [pairModal, setPairModal] = ...`)와 `PairActionModal` 렌더는 **남긴다**(Task 3에서 매칭 모드가 재사용).

- [ ] **Step 2: 핸들러 정리**

`handleDragStart`, `handlePairDragEnd`, `handleGridDragEnd` 세 함수를 삭제. (편집모드 순서변경은 `handleReorder`를 `onDragEnd`에 직접 연결하면 됨.)

- [ ] **Step 3: 일반 탭 렌더 분기 교체**

일반 탭 그리드 렌더(현재 `) : (` 다음의 `<DndContext ... onDragStart={handleDragStart} onDragEnd={handleGridDragEnd} ...>` 부터 그 `</DndContext>`까지, 라인 ~730-...)를 아래로 교체. 편집모드일 때만 DnD로 감싸고, 비편집이면 순수 그리드:

```tsx
          ) : isEditMode ? (
            <DndContext sensors={sensors} onDragEnd={event => void handleReorder(event)}>
              <SortableContext items={visibleProfiles.map(p => p.id)} strategy={rectSortingStrategy}>
                <div
                  className={
                    viewMode === 'compact'
                      ? 'grid grid-cols-[repeat(auto-fill,minmax(min(50%,160px),1fr))] gap-3'
                      : 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5'
                  }
                >
                  {visibleProfiles.map(profile => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      authorName={authorName}
                      variant={viewMode}
                      isEditMode={isEditMode}
                      sortable
                      isSelected={selectedIdsSet.has(profile.id)}
                      ongoingMatchCount={ongoingCounts.get(profile.id) ?? 0}
                      onSelectChange={handleSelectChange}
                      onEdit={selectedProfile => setModal({kind: 'edit', profile: selectedProfile})}
                      onDelete={requestDelete}
                      onStatusChange={handleStatusChange}
                      onToggleStar={handleToggleStar}
                      onOpenDetail={selectedProfile => setDetailProfileId(selectedProfile.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div
              className={
                viewMode === 'compact'
                  ? 'grid grid-cols-[repeat(auto-fill,minmax(min(50%,160px),1fr))] gap-3'
                  : 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5'
              }
            >
              {visibleProfiles.map(profile => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  authorName={authorName}
                  variant={viewMode}
                  isEditMode={isEditMode}
                  isSelected={selectedIdsSet.has(profile.id)}
                  ongoingMatchCount={ongoingCounts.get(profile.id) ?? 0}
                  onSelectChange={handleSelectChange}
                  onEdit={selectedProfile => setModal({kind: 'edit', profile: selectedProfile})}
                  onDelete={requestDelete}
                  onStatusChange={handleStatusChange}
                  onToggleStar={handleToggleStar}
                  onOpenDetail={selectedProfile => setDetailProfileId(selectedProfile.id)}
                />
              ))}
            </div>
          )}
```

**주의:** 비편집 그리드는 `sortable` prop을 넘기지 않는다(드래그 핸들 숨김 → 일반 탭에서 드래그 불가). 편집 그리드만 `sortable`.

- [ ] **Step 4: 미사용 import 정리**

`DragStartEvent` import가 더 이상 안 쓰이면 제거. `DndContext`, `SortableContext`, `rectSortingStrategy`, `DragEndEvent`, sensors는 Task 3에서도 쓰이므로 유지(Task 3에서 DragOverlay/PointerSensor 등 추가). `useSensor`/`PointerSensor`/`TouchSensor`도 유지.

- [ ] **Step 5: 빌드 + 전체 테스트**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test && pnpm build`
Expected: 통과 + 빌드 성공. 미사용 변수/ import로 인한 lint·타입 에러 없어야 함.

- [ ] **Step 6: 커밋**

```bash
git add -A && git commit -m "$(cat <<'EOF'
refactor: 일반 대시보드 짝지기 드래그 제거(편집모드 순서변경만 유지)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 매칭 모드 보드 + DragOverlay + 매칭 탭 툴바 숨김

매칭 탭에 "매칭 모드" 토글을 넣고, 켜면 좌=여자/우=남자 작게보기 리스트에서 드래그로 매칭한다. 드래그 중 반투명 고스트(DragOverlay)를 띄운다. 매칭 탭에서는 성별 그리드용 툴바(전체 선택 등)를 숨긴다.

**Files:**
- Create: `src/components/MatchMakingBoard.tsx`
- Modify: `src/components/Dashboard.tsx`

**Interfaces:**
- Consumes: `getMatchCandidates`(반대 성별 활성) 또는 `profiles` 필터, `PairActionModal`, `handleCreateMatch`, `photoThumbnailUrl`/`PARTNER_THUMB_WIDTH`.
- Produces: `MatchMakingBoard` — 좌/우 성별 리스트 + 내부 DndContext + DragOverlay. 드롭 시 `onPair(female, male)` 호출. Dashboard의 `matchMode` state(boolean)로 매칭 탭에서 토글.

- [ ] **Step 1: MatchMakingBoard 생성**

`src/components/MatchMakingBoard.tsx` 생성:

```tsx
'use client';

/* eslint-disable @next/next/no-img-element */

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {useState} from 'react';

import {formatBirthYearLabel} from '@/lib/profiles/age';
import {PARTNER_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
import type {Profile} from '@/types/profile';

// 매칭 모드용 작은 카드(작게보기 수준). 여성 리스트는 draggable, 남성 리스트는 droppable
// (그리고 그 반대로도 놓을 수 있게 양쪽 다 draggable+droppable로 둔다).
function MiniProfile({profile}: {profile: Profile}) {
  const photo = profile.photos[0];
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-[var(--violet-100)]">
        {photo ? (
          <img className="h-full w-full object-cover" src={photoThumbnailUrl(photo.url, PARTNER_THUMB_WIDTH)} alt={photo.alt} draggable={false} />
        ) : (
          <span className="text-[9px] text-slate-400">없음</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--violet-900)]">{formatBirthYearLabel(profile.birthYear)}</span>
        <span className="block truncate text-xs text-slate-500">{profile.residence} · {profile.job}</span>
      </span>
    </div>
  );
}

function DraggableDroppableCard({profile}: {profile: Profile}) {
  const drag = useDraggable({id: profile.id, data: {gender: profile.gender}});
  const drop = useDroppable({id: profile.id, data: {gender: profile.gender}});
  const setRefs = (node: HTMLElement | null) => {
    drag.setNodeRef(node);
    drop.setNodeRef(node);
  };
  return (
    <div
      ref={setRefs}
      {...drag.attributes}
      {...drag.listeners}
      style={{touchAction: 'none', opacity: drag.isDragging ? 0.4 : 1}}
      className={`cursor-grab rounded-[8px] border p-2 transition ${
        drop.isOver ? 'border-pink-400 bg-pink-50 ring-2 ring-pink-300' : 'border-[var(--border)] bg-white'
      }`}
    >
      <MiniProfile profile={profile} />
    </div>
  );
}

export function MatchMakingBoard({
  females,
  males,
  officeMode = false,
  onPair,
}: {
  females: Profile[];
  males: Profile[];
  officeMode?: boolean;
  onPair: (female: Profile, male: Profile) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
    useSensor(TouchSensor, {activationConstraint: {delay: 200, tolerance: 5}}),
  );

  const all = [...females, ...males];
  const activeProfile = all.find(p => p.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const dragged = all.find(p => p.id === String(active.id));
    const target = all.find(p => p.id === String(over.id));
    if (!dragged || !target || dragged.gender === target.gender) return;
    const female = dragged.gender === 'female' ? dragged : target;
    const male = dragged.gender === 'female' ? target : dragged;
    onPair(female, male);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      <p className="mb-3 rounded-[8px] bg-pink-50 px-3 py-2 text-center text-sm font-semibold text-pink-700">
        한쪽 매물을 반대편 매물 위로 끌어다 놓으면 매칭/지원을 선택할 수 있어요 💞
      </p>
      <div className={`grid grid-cols-2 gap-3 ${officeMode ? 'office-mode' : ''}`}>
        <div>
          <h3 className="mb-2 text-center text-sm font-bold text-[var(--violet-900)]">여성 {females.length}</h3>
          <div className="flex flex-col gap-2">
            {females.map(p => <DraggableDroppableCard key={p.id} profile={p} />)}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-center text-sm font-bold text-[var(--violet-900)]">남성 {males.length}</h3>
          <div className="flex flex-col gap-2">
            {males.map(p => <DraggableDroppableCard key={p.id} profile={p} />)}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeProfile ? (
          <div className="rounded-[8px] border border-pink-400 bg-white/95 p-2 opacity-90 shadow-lg">
            <MiniProfile profile={activeProfile} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

주의(`office-mode`): 보드 컨테이너는 `<article>`가 아니라 `<div>`이므로 `.office-mode article img` 셀렉터에 안 걸린다. 매칭 모드는 주선자가 능동적으로 쓰는 화면이라 오피스 마스킹 필수는 아니지만, 일관성을 위해 `officeMode`면 컨테이너에 `office-mode` 클래스를 주고 `MiniProfile`의 사진을 감싸는 요소를 `article`로 바꾸는 방법도 있다. 구현 시 간단히: `MiniProfile`의 최상위를 `<article>`로 바꾸면 `.office-mode article img`가 적용된다. (DragOverlay 고스트도 동일 컴포넌트라 함께 마스킹.)

- [ ] **Step 2: Dashboard에 matchMode 토글 + 보드 연결**

`src/components/Dashboard.tsx`:

(a) import 추가:
```tsx
import {MatchMakingBoard} from '@/components/MatchMakingBoard';
```

(b) state 추가(다른 useState 근처):
```tsx
  const [matchMode, setMatchMode] = useState(false);
```

(c) 매칭 탭이 아닐 때는 matchMode가 남지 않도록, 탭 전환 시 해제. 매칭 탭 버튼 onClick에 `setMatchMode(false)`를 함께:
```tsx
                onClick={() => setActiveTab('matching')}
```
→
```tsx
                onClick={() => { setActiveTab('matching'); setMatchMode(false); }}
```
그리고 여성/남성 탭 버튼 onClick에도 매칭 모드 해제를 추가(이미 `setActiveTab(gender); switchGender(gender);` 형태이면 `setMatchMode(false);`도 추가).

(d) 좌/우 후보 목록 파생값 추가(다른 useMemo 근처):
```tsx
  const matchFemales = useMemo(() => profiles.filter(p => p.gender === 'female' && p.isActivated), [profiles]);
  const matchMales = useMemo(() => profiles.filter(p => p.gender === 'male' && p.isActivated), [profiles]);
```

(e) 매칭 탭 렌더 분기 교체. 현재 `activeTab === 'matching' ? (ongoingPairs.length === 0 ? ... : <커플목록>)` 부분을, 매칭 모드 토글 + 조건 분기로 확장:
```tsx
          ) : activeTab === 'matching' ? (
            <div>
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  className={`inline-flex h-8 items-center gap-1 rounded-[8px] border px-3 text-xs font-semibold transition ${
                    matchMode
                      ? 'border-pink-500 bg-pink-500 text-white'
                      : 'border-[var(--border)] bg-white text-[var(--violet-900)] hover:bg-[var(--violet-50)]'
                  }`}
                  onClick={() => setMatchMode(v => !v)}
                >
                  {matchMode ? '매칭 모드 종료' : '+ 매칭 추가'}
                </button>
              </div>
              {matchMode ? (
                <MatchMakingBoard
                  females={matchFemales}
                  males={matchMales}
                  officeMode={officeMode}
                  onPair={(female, male) => setPairModal({female, male})}
                />
              ) : ongoingPairs.length === 0 ? (
                <div className="py-12 text-center text-sm font-semibold text-slate-400">진행중인 매칭이 없습니다.</div>
              ) : (
                <div className="mx-auto flex max-w-2xl flex-col gap-3">
                  {ongoingPairs.map(pair => (
                    <MatchPairCard
                      key={pair.match.id}
                      pair={pair}
                      onOpenProfile={pid => setDetailProfileId(pid)}
                      onEndMatch={handleEndMatch}
                      onDeleteMatch={handleDeleteMatch}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : isEditMode ? (
```

(`onPair`가 `setPairModal({female, male})`를 호출 → 기존 `PairActionModal`이 뜨고 [💞 매칭]/[📋 지원] 그대로 동작. 매칭 확정 후에도 `matchMode`는 유지되어 연속 작업 가능.)

- [ ] **Step 3: 매칭 탭 툴바 숨김**

매칭 탭에서는 전체 선택/선택 초기화 툴바를 감춘다. 상단 툴바 블록(전체 선택 label + 선택 초기화 button을 감싼 `<div className="flex items-center gap-3">`)을 `activeTab !== 'matching'`일 때만 렌더:

현재:
```tsx
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label ...>전체 선택 ...</label>
              <button ...>선택 초기화</button>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full ...">
              <Users .../> {isLoading ? ... : activeTab === 'matching' ? ... : ...}
            </div>
          </div>
```
교체: 전체선택/선택초기화 묶음을 `activeTab !== 'matching'` 조건으로 감싼다. 카운트 pill은 그대로 둔다(매칭 탭에선 "N쌍 매칭 중" 표시).
```tsx
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {activeTab !== 'matching' ? (
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    className="h-8 w-8 accent-[var(--violet-600)]"
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={activeVisibleProfiles.length === 0}
                    onChange={event => handleSelectAll(event.target.checked)}
                  />
                  전체 선택
                </label>
                <button
                  className="inline-flex h-8 items-center rounded-[6px] border border-[var(--violet-200)] bg-white px-3 text-xs font-bold text-[var(--violet-700)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={() => setSelectedIds([])}
                >
                  선택 초기화
                </button>
              </div>
            ) : (
              <div />
            )}
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--violet-50)] px-3 py-1.5 text-sm font-semibold text-[var(--violet-900)]">
              <Users size={16} strokeWidth={1.75} aria-hidden />
              {isLoading ? '로딩 중...' : activeTab === 'matching' ? `${ongoingPairs.length}쌍 매칭 중` : `${visibleProfiles.length}명 표시 · ${selectedProfiles.length}명 공유 선택`}
            </div>
          </div>
```
(`<div />` 빈 요소는 `justify-between` 정렬 유지용. 매칭 모드 토글 버튼은 Step 2의 매칭 탭 렌더 안에 이미 있음.)

- [ ] **Step 4: 빌드 + 전체 테스트**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test && pnpm build`
Expected: 통과 + 빌드 성공.

- [ ] **Step 5: 수동 확인 (dev)**

`PORT=3100 pnpm dev`, 로그인 후:
- 매칭 탭 → "+ 매칭 추가" → 좌(여자)/우(남자) 리스트. 카드 드래그 시 **반투명 고스트** 표시, 반대편 카드에 hover 시 핑크 하이라이트.
- 반대편에 드롭 → PairActionModal → 💞 매칭/📋 지원 동작. 매칭해도 매칭 모드 유지.
- 매칭 탭에 전체 선택 툴바 없음. 카운트는 "N쌍 매칭 중".
- 일반 탭에선 (비편집) 카드 드래그 불가, 편집모드에서 순서변경 드래그만.

- [ ] **Step 6: 커밋**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat: 매칭 탭 매칭 모드(좌우 드래그 보드 + 반투명 오버레이), 툴바 정리

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

- **Spec 커버리지**: 순서버그(Task 1), 일반 짝지기 제거(Task 2), 매칭 모드 토글·좌우 보드·DragOverlay·PairActionModal 재사용·툴바 숨김(Task 3) 전부 매핑.
- **Placeholder 스캔**: 없음. (Step별 전체 코드/정확한 교체 지점 명시.)
- **타입 일관성**: `reorderWeights` 시그니처가 Task 1 정의와 handleReorder 사용에서 일치. `MatchMakingBoard`의 `onPair(female, male)` → Dashboard `setPairModal({female, male})` → 기존 `PairActionModal` props(female, male, officeMode, onMatch, onClose)와 일치.
- **유연 지점**: Task 3 Step 1의 office-mode 마스킹은 `MiniProfile` 루트를 `<article>`로 두면 자동 적용 — 구현 시 실제 셀렉터 확인. DragOverlay 고스트 스타일은 취향껏 조정 가능(반투명 요건만 충족).
- **리스크**: 다중 PATCH는 이동 구간 사이 행 수만큼 발생. 149개 규모 수용. 매칭 모드 좌우 보드는 활성 매물만 노출.
