# 매칭·리워드·순서 6기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카연 대시보드에 6개 기능(매칭현황 썸네일 이동, 매칭 탭, 리워드 필드, 리워드 상위정렬, 짝지기 view, 수동 순서)을 추가한다.

**Architecture:** 기존 데이터 흐름(DB row → `rowToProfile` → `GET /api/profiles` → Dashboard state → `filterProfiles` → `ProfileCard`/`ProfileDetailModal`)을 유지하며 새 필드(`reward`, `manualOrderWeight`)를 각 계층에 스레딩한다. 정렬은 `compareProfiles`에 티어를 추가하고, 드래그는 `@dnd-kit`로 편집모드(순서)/일반모드(짝지기)를 분리한다.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase(Postgres), vitest. 신규 의존성 `@dnd-kit/core` + `@dnd-kit/sortable`.

## Global Constraints

- 로컬 명령 앞에 항상 `export PATH="$HOME/.local/node-arm64/bin:$PATH"` (arm64 Node).
- 패키지 매니저 `pnpm`. dev 서버는 `PORT=3100 pnpm dev`.
- **로컬 `.env.local`은 실제 prod Supabase에 연결됨** — 드래그 순서 저장·매칭 생성 테스트가 실데이터를 바꾼다. DB 변경 테스트는 신중히.
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. push는 지시할 때만.
- 스키마 드리프트: 실제 DB가 정답(`birth_year`/`author_name`/`starred_by_name`). 새 컬럼은 `add column if not exists` 방식 + `RUN_IN_SQL_EDITOR.sql` 갱신.
- 관리자 전용 컬럼은 `ADMIN_ONLY_DB_COLUMNS` graceful-fallback 패턴을 따른다(미적용 DB에서도 안 깨짐).
- 테스트: 로직은 vitest, `pnpm test`로 전체 통과 + `pnpm build` 성공을 각 묶음 끝에 확인.
- **정렬 우선순위(기본순 `sortField==='default'`에서만): 집착매물 → 리워드 보유 → 수동 가중치(오름차순) → 활성 → 최신.** 다른 정렬 기준을 고르면 집착매물 최상단만 유지, 리워드·가중치 티어는 미적용.

---

## Task 순서

- **Task 1 (선행/직렬)**: 리워드 + `manualOrderWeight` DB·타입·mapper·마이그레이션 배선. 다른 모든 묶음의 토대.
- **Task 2 (선행/직렬)**: `compareProfiles` 정렬 티어(리워드 + 수동 가중치). Task 1에 의존.
- **Task 3 (병렬 가능)**: 리워드 폼 입력 + 표시 3종(카드 뱃지·상세 텍스트). Task 1 이후.
- **Task 4 (병렬 가능)**: 매칭 — 썸네일 클릭 이동 + 매칭 탭. Task 1 이후.
- **Task 5 (병렬 가능)**: `@dnd-kit` 도입 + 편집모드 수동 순서 드래그. Task 2 이후.
- **Task 6 (병렬 가능)**: 일반모드 짝지기 view(매칭/지원). Task 5(dnd 설치)·Task 1 이후.

각 Task는 독립적으로 테스트 가능한 단위다.

---

## Task 1: 리워드 + 수동가중치 DB·타입·mapper 배선

**Files:**
- Create: `supabase/migrations/20260714000000_profile_reward_and_order.sql`
- Modify: `supabase/RUN_IN_SQL_EDITOR.sql` (append ⑤)
- Modify: `src/types/profile.ts` (add `reward`, `manualOrderWeight` to `Profile`)
- Modify: `src/lib/supabase/types.ts` (Row/Insert/Update)
- Modify: `src/lib/supabase/mappers.ts` (`rowToProfile`, `profileToInsertRow`, `profileFieldMap`)
- Modify: `src/lib/supabase/admin-columns.ts` (add `'reward'`)
- Modify: `src/lib/profiles/sample-data.ts` (add fields to every record — TS will flag)
- Modify: `src/lib/storage/profiles.ts` (`normalizeStoredProfile`)
- Test: `src/lib/supabase/mappers.test.ts` (create)

**Interfaces:**
- Produces: `Profile.reward: string`, `Profile.manualOrderWeight: number`. `rowToProfile` reads `row.reward ?? ''` and `row.manual_order_weight ?? 0`. `profileFieldMap` gains `['reward','reward']`, `['manualOrderWeight','manual_order_weight']`. `ADMIN_ONLY_DB_COLUMNS` includes `'reward'` and `'manual_order_weight'` (both survive missing-column fallback).

- [ ] **Step 1: Migration SQL**

Create `supabase/migrations/20260714000000_profile_reward_and_order.sql`:

```sql
-- 리워드(관리자 전용 자유 텍스트) + 수동 정렬 가중치. 기존 데이터는 기본값.
alter table public.profiles
  add column if not exists reward text not null default '',
  add column if not exists manual_order_weight double precision not null default 0;
```

Append the same block to `supabase/RUN_IN_SQL_EDITOR.sql` under a new header:

```sql

-- ⑤ 매물 리워드 + 수동 정렬 가중치 --------------------------
-- reward: 관리자 전용 자유 텍스트(뱃지/상세 표시). manual_order_weight: 편집모드 드래그 순서.
alter table public.profiles
  add column if not exists reward text not null default '',
  add column if not exists manual_order_weight double precision not null default 0;
```

- [ ] **Step 2: Extend Profile type**

In `src/types/profile.ts`, add to the `Profile` type after `responseSpeed: ResponseSpeed;` (line 45):

```ts
  reward: string;
  // 수동 정렬 가중치(편집모드 드래그). 작을수록 위. 기본 0.
  manualOrderWeight: number;
```

- [ ] **Step 3: Extend supabase Database types**

In `src/lib/supabase/types.ts`, add to `profiles.Row` (after `response_speed?`, line 44):

```ts
          reward?: string;
          manual_order_weight?: number;
```

Add the same two lines (optional) to `Insert` (after line 69) and `Update` (after line 94).

- [ ] **Step 4: Extend admin-columns fallback list**

In `src/lib/supabase/admin-columns.ts`, change `ADMIN_ONLY_DB_COLUMNS`:

```ts
export const ADMIN_ONLY_DB_COLUMNS = ['probe', 'rejection_tolerance', 'response_speed', 'reward', 'manual_order_weight'] as const;
```

(Both new columns survive the strip-and-retry if the migration hasn't run. Note: with `manual_order_weight` stripped, order saves are silently ignored until the migration runs — acceptable per spec.)

- [ ] **Step 5: Write failing mapper test**

Create `src/lib/supabase/mappers.test.ts`:

```ts
import {describe, expect, it} from 'vitest';

import {profileToUpdateRow, rowToProfile} from './mappers';
import type {Database} from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const baseRow: ProfileRow = {
  id: 'p1', gender: 'female', status: 'active', author_name: 'Aiden',
  residence: '서울', birth_year: 1998, height: 164, job: 'IT',
  religion: 'not_selected', mbti: '', hobbies: '', smoking: 'not_selected',
  drinking: 'not_selected', ideal_type: '', matchmaker_comment: '', extra: '',
  admin_memo: '', starred_by_name: null,
  created_at: '2026-06-30T00:00:00.000Z', updated_at: '2026-06-30T00:00:00.000Z',
};

describe('rowToProfile reward/manualOrderWeight', () => {
  it('reads reward and manual_order_weight', () => {
    const profile = rowToProfile({...baseRow, reward: '소개비 50만원', manual_order_weight: 3.5}, [], 'https://x');
    expect(profile.reward).toBe('소개비 50만원');
    expect(profile.manualOrderWeight).toBe(3.5);
  });

  it('defaults when columns are absent (unmigrated DB)', () => {
    const profile = rowToProfile(baseRow, [], 'https://x');
    expect(profile.reward).toBe('');
    expect(profile.manualOrderWeight).toBe(0);
  });
});

describe('profileToUpdateRow reward/manualOrderWeight', () => {
  it('maps camelCase to snake_case columns', () => {
    const row = profileToUpdateRow({reward: 'X', manualOrderWeight: 2});
    expect(row.reward).toBe('X');
    expect(row.manual_order_weight).toBe(2);
  });
});
```

- [ ] **Step 6: Run test — expect FAIL**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/supabase/mappers.test.ts`
Expected: FAIL (`reward` is `undefined`, `manual_order_weight` not on Update type / TS error).

- [ ] **Step 7: Wire mappers**

In `src/lib/supabase/mappers.ts`:

In `rowToProfile`, add after `responseSpeed: row.response_speed ?? 'not_selected',` (line 58):

```ts
    reward: row.reward ?? '',
    manualOrderWeight: row.manual_order_weight ?? 0,
```

In `profileToInsertRow`, add after `response_speed: profile.responseSpeed,` (line 99):

```ts
    reward: profile.reward,
    manual_order_weight: profile.manualOrderWeight,
```

In `profileFieldMap`, add after `['responseSpeed', 'response_speed'],` (line 126):

```ts
  ['reward', 'reward'],
  ['manualOrderWeight', 'manual_order_weight'],
```

- [ ] **Step 8: Fix non-DB constructors (TS errors)**

In `src/lib/storage/profiles.ts` `normalizeStoredProfile`, add after `responseSpeed: enumField(...)` (line 82):

```ts
    reward: stringField(profile, 'reward', ''),
    manualOrderWeight: numberField(profile, 'manualOrderWeight', 0),
```

In `src/lib/profiles/sample-data.ts`, add `reward: '',` and `manualOrderWeight: 0,` after each record's `responseSpeed: ...,` line (TS compile will point out each; every record needs both).

- [ ] **Step 9: Run test — expect PASS + typecheck**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/supabase/mappers.test.ts && pnpm build`
Expected: mapper tests PASS, build succeeds (all `Profile` constructors updated).

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat: 매물 reward + manualOrderWeight 컬럼·타입·mapper 배선

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 정렬 티어 — 리워드 + 수동 가중치

**Files:**
- Modify: `src/lib/profiles/filter.ts` (`compareProfiles`)
- Test: `src/lib/profiles/filter.test.ts` (add cases)

**Interfaces:**
- Consumes: `Profile.reward: string`, `Profile.manualOrderWeight: number` (Task 1).
- Produces: `compareProfiles` ordering — 기본순에서 집착 → 리워드보유 → 가중치 오름차순 → compareDefault. `hasReward(p) = p.reward.trim().length > 0`.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/profiles/filter.test.ts` inside the existing `describe('filterProfiles', ...)` block (reuse `baseProfile`/`noFilter` fixtures already at top of file):

```ts
  it('floats reward profiles above non-reward, below starred (default sort)', () => {
    const profiles: Profile[] = [
      {...baseProfile, id: 'plain', reward: '', createdAt: '2026-07-01T00:00:00.000Z'},
      {...baseProfile, id: 'reward', reward: '소개비 50만원', createdAt: '2026-06-01T00:00:00.000Z'},
      {...baseProfile, id: 'starred', starredByName: 'Aiden', reward: '', createdAt: '2026-05-01T00:00:00.000Z'},
    ];
    const result = filterProfiles(profiles, {...noFilter, gender: 'female'});
    expect(result.map(p => p.id)).toEqual(['starred', 'reward', 'plain']);
  });

  it('orders by manualOrderWeight ascending under reward tier (default sort)', () => {
    const profiles: Profile[] = [
      {...baseProfile, id: 'w3', manualOrderWeight: 3},
      {...baseProfile, id: 'w1', manualOrderWeight: 1},
      {...baseProfile, id: 'w2', manualOrderWeight: 2},
    ];
    const result = filterProfiles(profiles, {...noFilter, gender: 'female'});
    expect(result.map(p => p.id)).toEqual(['w1', 'w2', 'w3']);
  });

  it('ignores reward/weight tiers under an explicit sort (keeps only starred pin)', () => {
    const profiles: Profile[] = [
      {...baseProfile, id: 'tall-reward', height: 180, reward: 'X', manualOrderWeight: 9},
      {...baseProfile, id: 'short-plain', height: 160, reward: ''},
    ];
    const result = filterProfiles(profiles, {...noFilter, gender: 'female', sortField: 'height', sortDirection: 'desc'});
    expect(result.map(p => p.id)).toEqual(['tall-reward', 'short-plain']);
  });
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/filter.test.ts`
Expected: FAIL — reward/weight ordering not yet implemented.

- [ ] **Step 3: Implement tiers in compareProfiles**

In `src/lib/profiles/filter.ts`, replace `compareProfiles` (lines 69-79) with:

```ts
// 정렬 우선순위: 집착매물 → 리워드 보유 → 수동 가중치 → (정렬 옵션 또는 기본 정렬).
// 리워드·가중치 티어는 기본순(default)에서만 적용. 명시적 정렬 시엔 집착매물 핀만 유지.
function compareProfiles(left: Profile, right: Profile, sortField: SortField, sortDirection: SortDirection) {
  const leftStarred = left.starredByName ? 1 : 0;
  const rightStarred = right.starredByName ? 1 : 0;
  if (rightStarred !== leftStarred) return rightStarred - leftStarred;

  if (sortField === 'default') {
    const leftReward = left.reward.trim() ? 1 : 0;
    const rightReward = right.reward.trim() ? 1 : 0;
    if (rightReward !== leftReward) return rightReward - leftReward;

    // 수동 가중치: 작을수록 위(오름차순). 동률(기본 0)이면 다음 티어로.
    if (left.manualOrderWeight !== right.manualOrderWeight) {
      return left.manualOrderWeight - right.manualOrderWeight;
    }

    return compareDefault(left, right);
  }

  const sorted = compareBySort(left, right, sortField, sortDirection);
  // 동점이면 등록 최신순으로 안정적 타이브레이크
  return sorted !== 0 ? sorted : right.createdAt.localeCompare(left.createdAt);
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/filter.test.ts`
Expected: PASS (new cases + all existing starred/age/height/createdAt cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profiles/filter.ts src/lib/profiles/filter.test.ts && git commit -m "$(cat <<'EOF'
feat: 기본순 정렬에 리워드·수동가중치 티어 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 리워드 폼 입력 + 표시 3종

**Files:**
- Modify: `src/lib/profiles/form.ts` (5 spots)
- Modify: `src/components/ProfileFormModal.tsx` (admin fieldset input)
- Modify: `src/lib/profiles/information.ts` (`getAdminInformationRows`)
- Modify: `src/components/ProfileDetailModal.tsx` (reward full-width row)
- Modify: `src/components/ProfileCard.tsx` (🎁 badge)
- Test: `src/lib/profiles/form.test.ts`, `src/lib/profiles/information.test.ts` (add cases)

**Interfaces:**
- Consumes: `Profile.reward` (Task 1).
- Produces: `ProfileFormValues.reward: string`; `getAdminInformationRows` includes `['리워드', reward]` when non-empty; card shows 🎁 badge when `profile.reward.trim()`.

- [ ] **Step 1: Failing form test**

Append to `src/lib/profiles/form.test.ts` (uses existing imports; if `profileToFormValues`/`normalizeProfileFormValues` not imported, add them):

```ts
  it('threads reward through form values and normalize', () => {
    const values = {...emptyProfileFormValues, reward: '  소개비 50만원  '};
    const normalized = normalizeProfileFormValues(values);
    expect(normalized.reward).toBe('소개비 50만원');
  });
```

(If `emptyProfileFormValues`/`normalizeProfileFormValues` aren't already imported at the top of the test file, add: `import {emptyProfileFormValues, normalizeProfileFormValues} from './form';`)

- [ ] **Step 2: Run — expect FAIL**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/form.test.ts`
Expected: FAIL — `reward` not on `ProfileFormValues`.

- [ ] **Step 3: Thread reward through form.ts (5 spots)**

In `src/lib/profiles/form.ts`:

`ProfileFormValues` — after `responseSpeed: ResponseSpeed;` (line 30):
```ts
  reward: string;
```
`emptyProfileFormValues` — after `responseSpeed: 'not_selected',` (line 87):
```ts
  reward: '',
```
`profileToFormValues` — after `responseSpeed: profile.responseSpeed,` (line 109):
```ts
    reward: profile.reward,
```
`normalizeProfileFormValues` — add a trim in the returned object (after `adminMemo: values.adminMemo.trim(),`, line 126):
```ts
    reward: values.reward.trim(),
```
(No change needed to `validateProfileFormValues` — reward is optional free text.)

- [ ] **Step 4: Run — expect PASS**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/form.test.ts`
Expected: PASS.

- [ ] **Step 5: Add reward input to form modal**

In `src/components/ProfileFormModal.tsx`, inside the admin amber `<fieldset>`, after the closing `</div>` of the admin RadioGroup grid (after line 584, before `</fieldset>` line 585), add:

```tsx
                <div className="mt-4">
                  <TextField
                    label="리워드"
                    required={false}
                    type="text"
                    placeholder="예: 소개비 50만원, 명품 선물"
                    value={values.reward}
                    onChange={value => updateField('reward', value)}
                  />
                </div>
```

Verify `TextField` and `updateField` are already in scope in this file (they are — used throughout the form).

- [ ] **Step 6: Failing information test**

Append to `src/lib/profiles/information.test.ts` (create a `baseProfile` fixture if the file lacks one — copy the shape from `filter.test.ts` including `reward: ''`, `manualOrderWeight: 0`):

```ts
  it('includes 리워드 row when reward is non-empty', () => {
    const rows = getAdminInformationRows({...baseProfile, reward: '소개비 50만원'});
    expect(rows).toContainEqual(['리워드', '소개비 50만원']);
  });

  it('omits 리워드 row when reward is blank', () => {
    const rows = getAdminInformationRows({...baseProfile, reward: '   '});
    expect(rows.some(([label]) => label === '리워드')).toBe(false);
  });
```

(Ensure `getAdminInformationRows` is imported in the test file.)

- [ ] **Step 7: Run — expect FAIL**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/information.test.ts`
Expected: FAIL.

- [ ] **Step 8: Add reward to getAdminInformationRows**

In `src/lib/profiles/information.ts`, in `getAdminInformationRows`, add before `return rows;` (line 82):

```ts
  if (profile.reward.trim()) rows.push(['리워드', profile.reward.trim()]);
```

- [ ] **Step 9: Run — expect PASS**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/information.test.ts`
Expected: PASS. (Reward now appears in the detail modal's 🔒 관리자 전용 box automatically.)

- [ ] **Step 10: Detail modal — full-width reward row**

The admin box renders rows as pills (bad for long reward text). In `src/components/ProfileDetailModal.tsx`, the admin box (lines 185-204) currently maps all `adminRows` as pills. Change it so a `리워드` row renders as a full-width line while the enum rows stay as pills. Replace the `<ul>` inner map (lines 191-201) with:

```tsx
                  <ul className="flex flex-wrap gap-2">
                    {adminRows
                      .filter(([label]) => label !== '리워드')
                      .map(([label, value]) => (
                        <li
                          key={label}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900"
                        >
                          <span className="text-amber-600">{label}</span>
                          <span>{value}</span>
                        </li>
                      ))}
                  </ul>
                  {adminRows
                    .filter(([label]) => label === '리워드')
                    .map(([, value]) => (
                      <p key="reward" className="mt-2 flex items-center gap-1.5 break-keep text-sm font-semibold text-amber-900">
                        <span aria-hidden>🎁</span>
                        <span>{value}</span>
                      </p>
                    ))}
```

- [ ] **Step 11: Card 🎁 badge (detailed + compact)**

In `src/components/ProfileCard.tsx`, add a `hasReward` const after `const isStarred = ...` (line 102):

```tsx
  const hasReward = !!profile.reward.trim();
```

In the badge cluster, inside the `<div>` at lines 167-190, add after the `isStarred` block (after line 181, before the author badge at 182):

```tsx
            {hasReward ? (
              <span
                className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-emerald-500 font-bold text-white shadow-sm ${
                  isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
                }`}
                title={profile.reward.trim()}
              >
                <span aria-hidden>🎁</span>
                {isCompact ? null : <span className="max-w-[8rem] truncate">{profile.reward.trim()}</span>}
              </span>
            ) : null}
```

(Compact = icon only; detailed = icon + truncated text.)

- [ ] **Step 12: Failing ProfileCard render test**

Append to `src/components/ProfileCard.test.tsx` a case (reuse the file's existing render helper / base profile; add `reward` to it if needed):

```tsx
  it('shows 🎁 reward badge when reward is set', () => {
    renderCard({...baseProfile, reward: '소개비 50만원'});
    expect(screen.getByTitle('소개비 50만원')).toBeInTheDocument();
  });
```

(Match the file's actual render helper name and base-profile variable; if it renders via `<ProfileCard .../>` directly, follow that pattern.)

- [ ] **Step 13: Run — expect PASS**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/components/ProfileCard.test.tsx`
Expected: PASS.

- [ ] **Step 14: Build + full test + commit**

```bash
export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test && pnpm build
git add -A && git commit -m "$(cat <<'EOF'
feat: 리워드 폼 입력 + 뱃지·상세 표시

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 매칭 — 썸네일 클릭 이동 + 매칭 탭

**Files:**
- Modify: `src/lib/matches/summary.ts` (add `getOngoingPairs`)
- Test: `src/lib/matches/summary.test.ts`
- Modify: `src/components/ProfileDetailModal.tsx` (clickable `PartnerThumb`)
- Create: `src/components/MatchPairCard.tsx`
- Modify: `src/components/Dashboard.tsx` (`activeTab` state, 매칭 tab, matching render)

**Interfaces:**
- Consumes: `Match` (`types/match.ts`), `Profile`, `getProfileMatches`.
- Produces: `getOngoingPairs(matches: Match[], profiles: Profile[]): {match: Match; female: Profile | undefined; male: Profile | undefined}[]` — ongoing only, newest first. `MatchPairCard` props `{pair, officeMode, onOpenProfile, onEndMatch, onDeleteMatch}`.

- [ ] **Step 1: Failing test for getOngoingPairs**

Append to `src/lib/matches/summary.test.ts` (reuse/define a minimal profile + match fixture; profiles need `id`/`gender`):

```ts
import {getOngoingPairs} from './summary';

// (import types/fixtures already present or define inline)
describe('getOngoingPairs', () => {
  const female = {id: 'f1', gender: 'female'} as Profile;
  const male = {id: 'm1', gender: 'male'} as Profile;
  const mk = (over: Partial<Match>): Match => ({
    id: 'x', femaleId: 'f1', maleId: 'm1', status: 'ongoing', memo: '',
    createdByName: 'A', createdAt: '2026-07-01T00:00:00.000Z', endedAt: null, ...over,
  });

  it('returns ongoing pairs resolved to profiles, newest first', () => {
    const matches = [
      mk({id: 'old', createdAt: '2026-06-01T00:00:00.000Z'}),
      mk({id: 'new', createdAt: '2026-07-10T00:00:00.000Z'}),
      mk({id: 'ended', status: 'ended'}),
    ];
    const pairs = getOngoingPairs(matches, [female, male]);
    expect(pairs.map(p => p.match.id)).toEqual(['new', 'old']);
    expect(pairs[0].female?.id).toBe('f1');
    expect(pairs[0].male?.id).toBe('m1');
  });

  it('keeps pair with a deleted side as undefined', () => {
    const pairs = getOngoingPairs([mk({})], [female]); // male missing
    expect(pairs[0].female?.id).toBe('f1');
    expect(pairs[0].male).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/matches/summary.test.ts`
Expected: FAIL — `getOngoingPairs` not defined.

- [ ] **Step 3: Implement getOngoingPairs**

In `src/lib/matches/summary.ts`, add:

```ts
// 진행중 매칭을 커플(여자/남자 프로필 resolve)로. 최신 매칭이 위. 삭제된 쪽은 undefined.
export function getOngoingPairs(matches: Match[], profiles: Profile[]) {
  const byId = new Map(profiles.map(p => [p.id, p]));
  return matches
    .filter(m => m.status === 'ongoing')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(match => ({
      match,
      female: byId.get(match.femaleId),
      male: byId.get(match.maleId),
    }));
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/matches/summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Make PartnerThumb clickable**

In `src/components/ProfileDetailModal.tsx`, change `PartnerThumb` (lines 316-327) to accept an `onOpen` callback and render a button when clickable:

```tsx
function PartnerThumb({partner, onOpen}: {partner: Profile | undefined; onOpen?: (id: string) => void}) {
  const photo = partner?.photos[0];
  const inner = photo ? (
    <img className="h-full w-full object-cover" src={photoThumbnailUrl(photo.url, PARTNER_THUMB_WIDTH)} alt={photo.alt} draggable={false} />
  ) : (
    <span className="text-[9px] font-semibold text-slate-400">없음</span>
  );
  const cls = 'grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-[var(--violet-100)]';
  if (partner && onOpen) {
    return (
      <button type="button" className={`${cls} transition hover:ring-2 hover:ring-[var(--violet-400)]`} onClick={() => onOpen(partner.id)} aria-label="상세보기 열기">
        {inner}
      </button>
    );
  }
  return <span className={cls}>{inner}</span>;
}
```

Update the two call sites: match row (line 235) → `<PartnerThumb partner={partner} onOpen={onOpenProfile} />`; candidate row (line 290) → keep as-is (candidate click already creates a match) `<PartnerThumb partner={c} />`.

- [ ] **Step 6: Create MatchPairCard**

Create `src/components/MatchPairCard.tsx`:

```tsx
'use client';

/* eslint-disable @next/next/no-img-element */

import {formatBirthYearLabel} from '@/lib/profiles/age';
import {PARTNER_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
import type {Match} from '@/types/match';
import type {Profile} from '@/types/profile';

type Pair = {match: Match; female: Profile | undefined; male: Profile | undefined};

function MiniCard({profile, onOpen}: {profile: Profile | undefined; onOpen: (id: string) => void}) {
  if (!profile) {
    return <div className="grid flex-1 place-items-center rounded-[8px] border border-dashed border-slate-200 p-3 text-xs text-slate-400">(삭제된 매물)</div>;
  }
  const photo = profile.photos[0];
  return (
    <button
      type="button"
      className="flex flex-1 items-center gap-2 rounded-[8px] border border-[var(--border)] p-2 text-left transition hover:bg-[var(--violet-50)]"
      onClick={() => onOpen(profile.id)}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-[var(--violet-100)]">
        {photo ? <img className="h-full w-full object-cover" src={photoThumbnailUrl(photo.url, PARTNER_THUMB_WIDTH)} alt={photo.alt} draggable={false} /> : <span className="text-[9px] text-slate-400">없음</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--violet-900)]">{formatBirthYearLabel(profile.birthYear)}</span>
        <span className="block truncate text-xs text-slate-500">{profile.residence} · {profile.job}</span>
      </span>
    </button>
  );
}

export function MatchPairCard({pair, onOpenProfile, onEndMatch, onDeleteMatch}: {
  pair: Pair;
  onOpenProfile: (id: string) => void;
  onEndMatch: (matchId: string) => void;
  onDeleteMatch: (matchId: string) => void;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <MiniCard profile={pair.female} onOpen={onOpenProfile} />
        <span className="shrink-0 text-lg" aria-hidden>💞</span>
        <MiniCard profile={pair.male} onOpen={onOpenProfile} />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="rounded-[6px] border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => onEndMatch(pair.match.id)}>종료</button>
        <button type="button" className="rounded-[6px] border border-red-100 px-2.5 py-1 text-xs font-semibold text-[var(--danger)] hover:bg-red-50" onClick={() => onDeleteMatch(pair.match.id)}>삭제</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Add activeTab state + 매칭 tab to Dashboard**

In `src/components/Dashboard.tsx`:

Add import near other component imports:
```tsx
import {MatchPairCard} from '@/components/MatchPairCard';
import {countOngoingByProfile, getOngoingPairs} from '@/lib/matches/summary';
```
(Replace the existing `countOngoingByProfile` import line to include `getOngoingPairs`.)

Add state after `const [filters, setFilters] = useState...` (line 171):
```tsx
  const [activeTab, setActiveTab] = useState<'female' | 'male' | 'matching'>('female');
```

Add derived pairs after `ongoingCounts` (line 218):
```tsx
  const ongoingPairs = useMemo(() => getOngoingPairs(matches, profiles), [matches, profiles]);
```

Change the gender tab buttons (lines 493-504) so selecting a gender also sets `activeTab`, and add a 매칭 tab. Replace the `<div className="inline-flex shrink-0 ...">...</div>` (lines 492-505) with:
```tsx
            <div className="inline-flex shrink-0 rounded-[8px] border border-[var(--border)] bg-white p-0.5">
              {(['female', 'male'] as Gender[]).map(gender => (
                <button
                  className={`h-6 whitespace-nowrap rounded-[6px] px-2.5 text-[11px] font-semibold ${
                    activeTab === gender ? 'bg-[var(--violet-600)] text-white' : 'text-[var(--violet-900)]'
                  }`}
                  key={gender}
                  type="button"
                  onClick={() => { setActiveTab(gender); switchGender(gender); }}
                >
                  {genderLabels[gender]}
                </button>
              ))}
              <button
                className={`h-6 whitespace-nowrap rounded-[6px] px-2.5 text-[11px] font-semibold ${
                  activeTab === 'matching' ? 'bg-pink-500 text-white' : 'text-[var(--violet-900)]'
                }`}
                type="button"
                onClick={() => setActiveTab('matching')}
              >
                💞 매칭
              </button>
            </div>
```

- [ ] **Step 8: Render matching view**

In `src/components/Dashboard.tsx`, wrap the profile grid section so `activeTab === 'matching'` shows pair cards instead. Replace the grid render block (the `isLoading ? ... : (<div className={viewMode...}>...)` at lines 622-650) with a branch:

```tsx
          {isLoading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-400">프로필을 불러오는 중...</div>
          ) : activeTab === 'matching' ? (
            ongoingPairs.length === 0 ? (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">진행중인 매칭이 없습니다.</div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
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
            )
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

The count pill (line 616-619) should reflect matching mode; change its text to:
```tsx
              {isLoading ? '로딩 중...' : activeTab === 'matching' ? `${ongoingPairs.length}쌍 매칭 중` : `${visibleProfiles.length}명 표시 · ${selectedProfiles.length}명 공유 선택`}
```

- [ ] **Step 9: Build + full test**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test && pnpm build`
Expected: PASS + build success.

- [ ] **Step 10: Manual verify (dev)**

Run `PORT=3100 pnpm dev`, open the detail modal → 매칭현황 썸네일 클릭 → 상대 상세 전환 확인. 매칭 탭 → 커플 카드·종료·삭제 확인.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat: 매칭현황 썸네일 클릭 이동 + 매칭 탭(커플 카드)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: @dnd-kit 도입 + 편집모드 수동 순서 드래그

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/lib/profiles/manual-order.ts` (weight 계산 순수 함수)
- Test: `src/lib/profiles/manual-order.test.ts`
- Modify: `src/components/Dashboard.tsx` (DndContext/SortableContext in edit mode, PATCH on drop)
- Modify: `src/components/ProfileCard.tsx` (sortable handle in edit mode)

**Interfaces:**
- Consumes: `Profile.manualOrderWeight` (Task 1), sort tier (Task 2).
- Produces: `computeDroppedWeight(list: Profile[], fromIndex: number, toIndex: number): number` — 새 weight(이웃 midpoint). Dashboard PATCHes only the moved profile via existing `/api/profiles/[id]` with `{manualOrderWeight}`.

- [ ] **Step 1: Install @dnd-kit**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
Expected: added to `dependencies`.

- [ ] **Step 2: Failing weight test**

Create `src/lib/profiles/manual-order.test.ts`:

```ts
import {describe, expect, it} from 'vitest';

import {computeDroppedWeight} from './manual-order';
import type {Profile} from '@/types/profile';

const p = (id: string, w: number) => ({id, manualOrderWeight: w} as Profile);

describe('computeDroppedWeight', () => {
  const list = [p('a', 1), p('b', 2), p('c', 3)];

  it('midpoint when dropped between two neighbors', () => {
    // move 'c'(idx2) to idx1 → between a(1) and b(2) → 1.5
    expect(computeDroppedWeight(list, 2, 1)).toBe(1.5);
  });

  it('below-first when dropped to top', () => {
    // move 'c' to idx0 → above a(1) → 0
    expect(computeDroppedWeight(list, 2, 0)).toBe(0);
  });

  it('above-last when dropped to bottom', () => {
    // move 'a'(idx0) to idx2 → below c(3) → 4
    expect(computeDroppedWeight(list, 0, 2)).toBe(4);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/manual-order.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement manual-order.ts**

Create `src/lib/profiles/manual-order.ts`:

```ts
import type {Profile} from '@/types/profile';

// 편집모드 드래그 순서 저장용 가중치 계산.
// 이동 대상 1개만 새 weight를 받는다(이웃의 midpoint). 작을수록 위.
// list: 현재 표시 순서(정렬 반영된 성별별 목록). fromIndex→toIndex로 옮긴다.
export function computeDroppedWeight(list: Profile[], fromIndex: number, toIndex: number): number {
  // 이동 대상을 뺀 나머지 배열에서 삽입 위치의 앞/뒤 이웃 weight를 본다.
  const without = list.filter((_, i) => i !== fromIndex);
  const prev = without[toIndex - 1];
  const next = without[toIndex];

  if (!prev) return (next ? next.manualOrderWeight : 0) - 1; // 맨 위
  if (!next) return prev.manualOrderWeight + 1; // 맨 아래
  return (prev.manualOrderWeight + next.manualOrderWeight) / 2; // 사이
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/manual-order.test.ts`
Expected: PASS. (Note: top-drop test expects 0 because next=a(1) → 1-1=0; matches spec "작을수록 위".)

- [ ] **Step 6: Wire SortableContext in Dashboard (edit mode only)**

In `src/components/Dashboard.tsx`:

Add imports:
```tsx
import {DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent} from '@dnd-kit/core';
import {SortableContext, rectSortingStrategy} from '@dnd-kit/sortable';
import {computeDroppedWeight} from '@/lib/profiles/manual-order';
```

Add a drop handler (near other handlers, after `handleDeleteMatch`):
```tsx
  const handleReorder = async (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const fromIndex = visibleProfiles.findIndex(p => p.id === active.id);
    const toIndex = visibleProfiles.findIndex(p => p.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    const weight = computeDroppedWeight(visibleProfiles, fromIndex, toIndex);
    const moved = visibleProfiles[fromIndex];
    setProfiles(current => current.map(p => (p.id === moved.id ? {...p, manualOrderWeight: weight} : p)));
    const res = await fetch(`/api/profiles/${moved.id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({manualOrderWeight: weight}),
    });
    if (!res.ok) {
      setAlertState({kind: 'alert', title: '순서 저장 실패', message: 'manual_order_weight 컬럼이 아직 DB에 없을 수 있습니다. RUN_IN_SQL_EDITOR.sql의 ⑤를 실행해 주세요.'});
    }
  };
```

Add sensors near top of component body (after state):
```tsx
  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
    useSensor(TouchSensor, {activationConstraint: {delay: 200, tolerance: 5}}),
  );
```

Wrap the non-matching grid (the last `<div className={viewMode...}>` branch from Task 4 Step 8) so that, when `isEditMode` is true, it's inside a `DndContext` + `SortableContext`:
```tsx
            isEditMode ? (
              <DndContext sensors={sensors} onDragEnd={handleReorder}>
                <SortableContext items={visibleProfiles.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className={viewMode === 'compact' ? 'grid grid-cols-[repeat(auto-fill,minmax(min(50%,160px),1fr))] gap-3' : 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5'}>
                    {visibleProfiles.map(profile => (<ProfileCard key={profile.id} profile={profile} authorName={authorName} variant={viewMode} isEditMode={isEditMode} sortable isSelected={selectedIdsSet.has(profile.id)} ongoingMatchCount={ongoingCounts.get(profile.id) ?? 0} onSelectChange={handleSelectChange} onEdit={selectedProfile => setModal({kind: 'edit', profile: selectedProfile})} onDelete={requestDelete} onStatusChange={handleStatusChange} onToggleStar={handleToggleStar} onOpenDetail={selectedProfile => setDetailProfileId(selectedProfile.id)} />))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              /* the plain grid from Task 4 Step 8 */
            )
```
(Structure: the non-matching branch becomes `isEditMode ? <Dnd...> : <plain grid>`. Keep both branches rendering the same `ProfileCard` list; only edit mode adds sortable.)

- [ ] **Step 7: Add sortable support to ProfileCard**

In `src/components/ProfileCard.tsx`, add `sortable?: boolean` to `ProfileCardProps`. When `sortable`, use `useSortable`:

```tsx
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
```

Inside the component, add (guarded so non-sortable cards don't call the hook conditionally — instead always call it; dnd-kit's `useSortable` is safe to call, and when not inside a SortableContext it's inert):

```tsx
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id: profile.id});
  const sortableStyle = sortable ? {transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, touchAction: 'none' as const} : undefined;
```

Apply to the root `<article>`: `ref={setNodeRef} style={sortableStyle}` and, when `sortable && isEditMode`, spread `{...attributes} {...listeners}` on a drag area. Simplest: make the whole card draggable in edit mode by spreading listeners on the `<article>` (photo nav buttons already `stopPropagation`). Add a visible grip only in edit mode:

```tsx
      {sortable && isEditMode ? (
        <div className="absolute right-1 top-1 z-30 cursor-grab rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-white" {...attributes} {...listeners} title="드래그해 순서 변경">⋮⋮</div>
      ) : null}
```

(Put the grip inside the root `<article>`; attach `{...listeners}` to the grip, not the whole card, so photo/detail clicks still work.)

- [ ] **Step 8: Build + test**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test && pnpm build`
Expected: PASS + build success.

- [ ] **Step 9: Manual verify**

`PORT=3100 pnpm dev` → 편집 모드 → 카드 그립 드래그로 순서 변경 → 새로고침 후 순서 유지(DB 저장) 확인. **주의: 실 prod DB 데이터의 weight가 바뀐다.**

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat: 편집모드 드래그로 매물 수동 순서(가중치 DB 저장)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 일반모드 짝지기 view (매칭/지원)

**Files:**
- Create: `src/lib/profiles/share-text.ts` → add `buildPairShareText`
- Test: `src/lib/profiles/share-text.test.ts`
- Create: `src/components/PairActionModal.tsx`
- Modify: `src/components/Dashboard.tsx` (일반모드 drag → 이성 목록 노출 → 드롭 시 PairActionModal)

**Interfaces:**
- Consumes: `buildShareText`, `urlsToFiles`, `canNativeShareFiles` (share helpers), `handleCreateMatch` (Dashboard).
- Produces: `buildPairShareText(a: Profile, b: Profile): string` — 두 `buildShareText`를 구분선으로 연결. `PairActionModal` props `{female, male, officeMode, onMatch, onClose}`.

- [ ] **Step 1: Failing buildPairShareText test**

Append to `src/lib/profiles/share-text.test.ts` (reuse the file's existing profile fixture; add `reward`/`manualOrderWeight` if constructing inline):

```ts
import {buildPairShareText} from './share-text';

describe('buildPairShareText', () => {
  it('joins two profiles with a divider and excludes admin/reward', () => {
    const a = {...sampleFemale, reward: '소개비 100만원'};
    const b = sampleMale;
    const text = buildPairShareText(a, b);
    expect(text).toContain('───');
    expect(text).not.toContain('소개비'); // reward excluded (admin-only)
    expect(text.split('───').length).toBe(2);
  });
});
```

(Use whatever base fixtures the file already defines; the assertion that matters: divider present, reward not leaked.)

- [ ] **Step 2: Run — expect FAIL**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/share-text.test.ts`
Expected: FAIL — `buildPairShareText` not exported.

- [ ] **Step 3: Implement buildPairShareText**

In `src/lib/profiles/share-text.ts`, add:

```ts
// 두 프로필을 한 번에 공유(지원)할 때의 합본 텍스트. 각 buildShareText를 구분선으로 연결.
export function buildPairShareText(a: Profile, b: Profile): string {
  return [buildShareText(a), buildShareText(b)].join('\n\n───────\n\n');
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test src/lib/profiles/share-text.test.ts`
Expected: PASS.

- [ ] **Step 5: Create PairActionModal**

Create `src/components/PairActionModal.tsx`. Renders two mini cards + 매칭/지원 buttons. 지원 = merged share (text to clipboard, photos via navigator.share or download), reusing helpers:

```tsx
'use client';

/* eslint-disable @next/next/no-img-element */

import {useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {canNativeShareFiles, urlsToFiles} from '@/lib/profiles/native-share';
import {PARTNER_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
import {buildPairShareText} from '@/lib/profiles/share-text';
import type {Profile} from '@/types/profile';

export function PairActionModal({female, male, officeMode = false, onMatch, onClose}: {
  female: Profile;
  male: Profile;
  officeMode?: boolean;
  onMatch: (femaleId: string, maleId: string) => void;
  onClose: () => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);

  const handleApply = async () => {
    setIsBusy(true);
    try {
      const text = buildPairShareText(female, male);
      try { await navigator.clipboard.writeText(text); } catch { /* non-fatal */ }
      const files = await urlsToFiles([...female.photos, ...male.photos].map(p => p.url));
      if (files.length > 0 && canNativeShareFiles(files[0])) {
        try { await navigator.share({files}); } catch { setIsBusy(false); return; }
        setAlertState({kind: 'alert', title: '정보가 복사됐어요', message: '사진을 보낸 채팅방에 길게 눌러 붙여넣기 하면 두 분 정보가 함께 전달됩니다.'});
      } else {
        for (const file of files) {
          const url = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = url; a.download = file.name; a.click();
          URL.revokeObjectURL(url);
        }
        setAlertState({kind: 'alert', title: '정보가 복사됐어요', message: files.length > 0 ? '사진이 다운로드됐어요. 카카오톡에 첨부하고 붙여넣기 하세요.' : '정보가 클립보드에 복사됐어요.'});
      }
    } finally {
      setIsBusy(false);
    }
  };

  const mini = (p: Profile) => (
    <div className="flex flex-1 items-center gap-2 rounded-[8px] border border-[var(--border)] p-2">
      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-[var(--violet-100)]">
        {p.photos[0] ? <img className="h-full w-full object-cover" src={photoThumbnailUrl(p.photos[0].url, PARTNER_THUMB_WIDTH)} alt={p.photos[0].alt} /> : <span className="text-[9px] text-slate-400">없음</span>}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[var(--violet-900)]">{formatBirthYearLabel(p.birthYear)}</span>
        <span className="block truncate text-xs text-slate-500">{p.residence} · {p.job}</span>
      </span>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-[65] grid place-items-center bg-black/70 p-4 ${officeMode ? 'office-mode' : ''}`} role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md rounded-[12px] bg-white p-5 shadow-sm" onClick={e => e.stopPropagation()}>
        <h2 className="mb-3 text-base font-bold text-[var(--violet-950)]">두 매물 연결</h2>
        <div className="flex items-center gap-2">
          {mini(female)}
          <span className="shrink-0 text-lg" aria-hidden>💞</span>
          {mini(male)}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-[8px] bg-pink-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-600" onClick={() => { onMatch(female.id, male.id); onClose(); }}>💞 매칭</button>
          <button type="button" className="flex-1 rounded-[8px] border border-[var(--violet-200)] px-4 py-2.5 text-sm font-bold text-[var(--violet-700)] hover:bg-[var(--violet-50)] disabled:opacity-60" onClick={handleApply} disabled={isBusy}>📋 지원(정보 복사)</button>
        </div>
        <button type="button" className="mt-3 w-full rounded-[8px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-500" onClick={onClose}>닫기</button>
      </div>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </div>
  );
}
```

- [ ] **Step 6: Wire drag-to-pair in Dashboard (non-edit mode)**

In `src/components/Dashboard.tsx`:

Add import: `import {PairActionModal} from '@/components/PairActionModal';`

Add state:
```tsx
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pairModal, setPairModal] = useState<{female: Profile; male: Profile} | null>(null);
```

The non-edit, non-matching grid should be wrapped in its own `DndContext` (separate from edit mode). On drag start, if not edit mode, set `draggingId` and switch the visible grid to the opposite gender (drop targets). On drag end over an opposite-gender card, open the pair modal.

Add handlers:
```tsx
  const draggingProfile = useMemo(() => profiles.find(p => p.id === draggingId) ?? null, [profiles, draggingId]);
  const oppositeGender: Gender = draggingProfile?.gender === 'female' ? 'male' : 'female';

  const handlePairDragEnd = (event: DragEndEvent) => {
    const dragged = draggingProfile;
    setDraggingId(null);
    if (!dragged || !event.over) return;
    const target = profiles.find(p => p.id === event.over!.id);
    if (!target || target.gender === dragged.gender) return;
    const female = dragged.gender === 'female' ? dragged : target;
    const male = dragged.gender === 'female' ? target : dragged;
    setPairModal({female, male});
  };
```

While `draggingId` is set (and not edit mode), render the opposite-gender activated profiles as the grid (drop targets) instead of `visibleProfiles`. Compute:
```tsx
  const pairDropTargets = useMemo(
    () => (draggingId ? profiles.filter(p => p.gender === oppositeGender && p.isActivated) : []),
    [draggingId, profiles, oppositeGender],
  );
```

Wrap the non-edit non-matching branch in `<DndContext sensors={sensors} onDragStart={e => !isEditMode && setDraggingId(String(e.active.id))} onDragEnd={handlePairDragEnd}>` with a `SortableContext` (or plain `useDraggable`/`useDroppable`). Cards use the same `sortable` handle path but the DndContext's `onDragEnd` is `handlePairDragEnd`. When `draggingId` is set, render `pairDropTargets` (with a banner "이성 매물 위에 놓아 연결"). 

Render the modal near other modals:
```tsx
      {pairModal ? (
        <PairActionModal
          female={pairModal.female}
          male={pairModal.male}
          officeMode={officeMode}
          onMatch={handleCreateMatch}
          onClose={() => setPairModal(null)}
        />
      ) : null}
```

**Implementation note (choose during build):** the cleanest wiring is a single `DndContext` around the non-matching grid whose `onDragStart`/`onDragEnd` branch on `isEditMode` (edit → `handleReorder`; non-edit → pair flow). This avoids two nested contexts. Verify drag start on mobile (TouchSensor 200ms delay) doesn't block scroll.

- [ ] **Step 7: Build + test**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH"; pnpm test && pnpm build`
Expected: PASS + build success.

- [ ] **Step 8: Manual verify (PC + mobile view)**

`PORT=3100 pnpm dev`, Cmd+Shift+M 모바일 뷰: 일반모드에서 여성 카드 롱프레스 드래그 → 남성 목록 노출 → 남성 카드에 드롭 → PairActionModal → 매칭/지원 각각 확인. PC는 마우스 드래그.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat: 드래그로 두 매물 짝지기 view(매칭/지원 합본 공유)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review 결과

- **Spec coverage**: 기능 1(Task 4 Step 5), 2(Task 4), 3(Task 3), 4(Task 2), 5(Task 6), 6(Task 5) 모두 태스크 매핑됨.
- **Type consistency**: `Profile.reward`/`manualOrderWeight`(Task 1) → 정렬(Task 2)·폼/표시(Task 3)·순서(Task 5)에서 동일 이름 사용. `getOngoingPairs`·`computeDroppedWeight`·`buildPairShareText` 시그니처 일관.
- **알려진 유연 지점(구현 중 확정)**: Task 6 Step 6의 DndContext 배선(단일 컨텍스트 분기 권장), Task 3 Step 12의 ProfileCard 테스트 헬퍼 이름은 실제 파일 관습에 맞춤. 이들은 placeholder가 아니라 기존 코드 관습에 맞추라는 지시.
- **리스크**: `manual_order_weight` 마이그레이션 미적용 시 순서 저장 실패 → Task 5 Step 6에서 alert로 안내. `@dnd-kit` 번들 증가는 수용.
