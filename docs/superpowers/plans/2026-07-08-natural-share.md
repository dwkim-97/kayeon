# 자연스러운 공유(사진 묶음 + 텍스트) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드에서 매물 1명 선택 시, 사진을 Web Share API로 묶어 전송하고 정보 텍스트를 클립보드에 복사하는 "자연스러운 공유" 버튼을 추가한다(기존 카카오 공유와 별개).

**Architecture:** 순수 로직(텍스트 생성, 파일 공유 지원 판별)을 lib에 분리해 TDD하고, 얇은 버튼 컴포넌트가 이를 호출한다. Dashboard는 선택 1명일 때만 버튼을 렌더한다. 모바일은 `navigator.share({files})`, 데스크톱은 다운로드+클립보드로 폴백.

**Tech Stack:** Next.js 16 + React 19 + TypeScript, Web Share API(`navigator.share`/`canShare`), Clipboard API, Vitest.

## Global Constraints

- 로컬 명령은 항상 `export PATH="$HOME/.local/node-arm64/bin:$PATH"`를 앞에 붙인다.
- 패키지 매니저는 pnpm.
- 기존 카카오 공유(`ShareButton`) 로직·템플릿은 변경하지 않는다.
- 텍스트에 관리자 메모·관리자 전용 항목(떠보기/거절내성/응답속도)은 포함하지 않는다.
- 사진은 썸네일이 아닌 원본 URL(`profile.photos[].url`)을 쓴다.
- 기존 vitest(현재 127개)는 계속 통과해야 한다.

---

## File Structure

- **Create** `src/lib/profiles/share-text.ts` — `buildShareText(profile)` 순수함수.
- **Create** `src/lib/profiles/share-text.test.ts` — 텍스트 생성 테스트.
- **Create** `src/lib/profiles/native-share.ts` — 파일 공유 지원 판별 + URL→File + 공유/폴백 실행.
- **Create** `src/lib/profiles/native-share.test.ts` — 판별·변환 로직 테스트(navigator/fetch mock).
- **Create** `src/components/NaturalShareButton.tsx` — 버튼 컴포넌트.
- **Modify** `src/components/Dashboard.tsx` — 선택 1명일 때 버튼 렌더.

---

### Task 1: 공유 텍스트 생성

**Files:**
- Create: `src/lib/profiles/share-text.ts`
- Test: `src/lib/profiles/share-text.test.ts`

**Interfaces:**
- Consumes: `getProfileInformationRows` from `@/lib/profiles/information` (주요+추가 정보, 관리자 항목 자연 제외), `formatBirthYearLabel` from `@/lib/profiles/age`.
- Produces: `export function buildShareText(profile: Profile): string`
  - 첫 줄: `formatBirthYearLabel(profile.birthYear)` (예: `95년생`)
  - 이후 줄: `getProfileInformationRows(profile)`의 각 `[label, value]`를 `"label: value"`로, 개행(`\n`)으로 연결.
  - 관리자 메모/관리자 전용 항목은 포함하지 않음(information 헬퍼가 이미 제외).

- [ ] **Step 1: Write the failing test**

`src/lib/profiles/share-text.test.ts`:

```typescript
import {describe, expect, it} from 'vitest';

import {buildShareText} from './share-text';
import type {Profile} from '@/types/profile';

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: 'p',
    gender: 'female',
    status: 'active',
    isActivated: true,
    authorName: 'Aiden',
    starredByName: null,
    residence: '서울 강남구',
    birthYear: 1995,
    height: 168,
    job: '카카오 / 판교 / IT',
    religion: 'none',
    mbti: 'ENFJ',
    hobbies: '독서',
    smoking: 'not_selected',
    drinking: 'not_selected',
    idealType: '',
    matchmakerComment: '',
    extra: '',
    adminMemo: '비밀 메모',
    probe: 'possible',
    rejectionTolerance: 'high',
    responseSpeed: 'fast',
    photos: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildShareText', () => {
  it('starts with the birth-year label line', () => {
    const text = buildShareText(makeProfile({}));
    expect(text.split('\n')[0]).toBe('95년생');
  });

  it('includes primary + additional info as label: value lines', () => {
    const text = buildShareText(makeProfile({}));
    expect(text).toContain('키: 168cm');
    expect(text).toContain('사는 곳: 서울 강남구');
    expect(text).toContain('회사: 카카오 / 판교 / IT');
    expect(text).toContain('종교: 무교');
    expect(text).toContain('MBTI: ENFJ');
  });

  it('excludes admin memo and admin-only fields', () => {
    const text = buildShareText(makeProfile({}));
    expect(text).not.toContain('비밀 메모');
    expect(text).not.toContain('떠보기');
    expect(text).not.toContain('거절내성');
    expect(text).not.toContain('응답속도');
  });

  it('omits empty optional values', () => {
    const text = buildShareText(makeProfile({mbti: '', hobbies: '', religion: 'not_selected'}));
    expect(text).not.toContain('MBTI');
    expect(text).not.toContain('취미');
    expect(text).not.toContain('종교');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run src/lib/profiles/share-text.test.ts`
Expected: FAIL — 모듈 미해결.

- [ ] **Step 3: Write minimal implementation**

`src/lib/profiles/share-text.ts`:

```typescript
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {getProfileInformationRows} from '@/lib/profiles/information';
import type {Profile} from '@/types/profile';

// 카카오톡 등에 붙여넣을 매물 정보 텍스트를 만든다.
// 주요+추가 정보만 포함하고(관리자 메모/관리자 전용 항목 제외),
// 사진과 함께 사람이 직접 친 것처럼 보이도록 줄 단위로 구성한다.
export function buildShareText(profile: Profile): string {
  const header = formatBirthYearLabel(profile.birthYear);
  const lines = getProfileInformationRows(profile).map(([label, value]) => `${label}: ${value}`);
  return [header, ...lines].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run src/lib/profiles/share-text.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profiles/share-text.ts src/lib/profiles/share-text.test.ts
git commit -m "feat: buildShareText — 매물 정보 공유 텍스트 생성"
```

---

### Task 2: 파일 공유 지원 판별 + URL→File 변환

**Files:**
- Create: `src/lib/profiles/native-share.ts`
- Test: `src/lib/profiles/native-share.test.ts`

**Interfaces:**
- Consumes: 브라우저 `navigator`, `fetch`, `File` (테스트에서 mock).
- Produces:
  - `export function canNativeShareFiles(probeFile?: File): boolean` — `navigator.canShare`가 있고 `navigator.canShare({files:[probeFile]})`가 true면 true. 서버/미지원이면 false.
  - `export async function urlToFile(url: string, fileName: string): Promise<File | null>` — `fetch(url)` → `blob()` → `new File([blob], fileName, {type: blob.type})`. 실패 시 null.
  - `export async function urlsToFiles(urls: string[]): Promise<File[]>` — 각 URL을 `urlToFile`로 변환(파일명 `photo-{i}.{ext}`), null 제외.

**참고:** `navigator.share` 실제 호출은 사용자 제스처·HTTPS 필요라 단위테스트 대상이 아니다. 여기서는 순수 판별/변환만 테스트하고, 실제 share 호출은 Task 3 버튼에서 얇게 감싼다.

- [ ] **Step 1: Write the failing test**

`src/lib/profiles/native-share.test.ts`:

```typescript
import {afterEach, describe, expect, it, vi} from 'vitest';

import {canNativeShareFiles, urlToFile, urlsToFiles} from './native-share';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('canNativeShareFiles', () => {
  it('returns true when navigator.canShare accepts files', () => {
    vi.stubGlobal('navigator', {canShare: () => true});
    expect(canNativeShareFiles()).toBe(true);
  });

  it('returns false when canShare rejects files', () => {
    vi.stubGlobal('navigator', {canShare: () => false});
    expect(canNativeShareFiles()).toBe(false);
  });

  it('returns false when canShare is absent', () => {
    vi.stubGlobal('navigator', {});
    expect(canNativeShareFiles()).toBe(false);
  });
});

describe('urlToFile', () => {
  it('fetches a URL and wraps it as a File', async () => {
    const blob = new Blob(['x'], {type: 'image/jpeg'});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    }));
    const file = await urlToFile('https://x/y.jpg', 'photo-0.jpg');
    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe('photo-0.jpg');
    expect(file?.type).toBe('image/jpeg');
  });

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await urlToFile('https://x/y.jpg', 'photo-0.jpg')).toBeNull();
  });
});

describe('urlsToFiles', () => {
  it('converts multiple URLs, skipping failures', async () => {
    const blob = new Blob(['x'], {type: 'image/png'});
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ok: true, blob: () => Promise.resolve(blob)})
      .mockRejectedValueOnce(new Error('fail')));
    const files = await urlsToFiles(['https://x/a.png', 'https://x/b.png']);
    expect(files).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run src/lib/profiles/native-share.test.ts`
Expected: FAIL — 모듈 미해결.

- [ ] **Step 3: Write minimal implementation**

`src/lib/profiles/native-share.ts`:

```typescript
// Web Share API로 사진 파일을 공유하기 위한 헬퍼.
// 실제 navigator.share 호출은 사용자 제스처/HTTPS가 필요하므로 버튼에서 수행하고,
// 여기서는 지원 판별과 URL→File 변환(테스트 가능한 순수 로직)만 담당한다.

// 이 브라우저가 '파일 공유'를 지원하는지. 서버/미지원 환경에서는 false.
export function canNativeShareFiles(probeFile?: File): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {canShare?: (data?: {files?: File[]}) => boolean};
  if (typeof nav.canShare !== 'function') return false;
  try {
    const files = probeFile ? [probeFile] : [new File([''], 'probe.txt', {type: 'text/plain'})];
    return nav.canShare({files});
  } catch {
    return false;
  }
}

// URL 하나를 File로. 실패하면 null.
export async function urlToFile(url: string, fileName: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!('ok' in res) || !res.ok) return null;
    const blob = await res.blob();
    return new File([blob], fileName, {type: blob.type || 'image/jpeg'});
  } catch {
    return null;
  }
}

// 여러 URL을 File 배열로(실패는 제외). 파일명은 확장자 추정해 photo-{i}.{ext}.
export async function urlsToFiles(urls: string[]): Promise<File[]> {
  const results = await Promise.all(
    urls.map((url, i) => {
      const extMatch = url.split('?')[0].match(/\.(jpg|jpeg|png|webp)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
      return urlToFile(url, `photo-${i + 1}.${ext}`);
    }),
  );
  return results.filter((f): f is File => f !== null);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run src/lib/profiles/native-share.test.ts`
Expected: PASS (6 tests).

주: `urlToFile` 성공 테스트의 mock 응답은 `{ok: true, blob}` 형태이며 구현의 `'ok' in res && res.ok` 검사를 통과한다.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profiles/native-share.ts src/lib/profiles/native-share.test.ts
git commit -m "feat: native-share 헬퍼 — 파일공유 지원 판별 + URL→File 변환"
```

---

### Task 3: NaturalShareButton 컴포넌트

**Files:**
- Create: `src/components/NaturalShareButton.tsx`

**Interfaces:**
- Consumes (Task 1,2): `buildShareText` from `@/lib/profiles/share-text`; `canNativeShareFiles`, `urlsToFiles` from `@/lib/profiles/native-share`. `CustomAlert`/`CustomAlertState`/`closedAlertState` from `@/components/CustomAlert`. `Profile` type.
- Produces: `export function NaturalShareButton({profile}: {profile: Profile}): JSX.Element`.

**동작:**
1. 클릭 시 진행중 표시.
2. `buildShareText(profile)`를 만들어 `navigator.clipboard.writeText`로 복사(실패해도 계속 진행).
3. `urlsToFiles(profile.photos.map(p => p.url))`로 File 배열 생성.
4. 파일이 있고 `canNativeShareFiles(files[0])`가 true면 `navigator.share({files})` 호출(try/catch — 사용자 취소 시 조용히 무시).
5. 아니면(데스크톱/미지원) 각 File을 `<a download>`로 다운로드.
6. 완료 시 안내 alert: "정보가 복사됐어요. 채팅방에 사진을 보낸 뒤 붙여넣기(길게 눌러 붙여넣기) 하세요." (모바일) / "정보가 복사되고 사진이 다운로드됐어요." (데스크톱)

- [ ] **Step 1: Write the component**

`src/components/NaturalShareButton.tsx`:

```typescript
'use client';

import {Send} from 'lucide-react';
import {useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {canNativeShareFiles, urlsToFiles} from '@/lib/profiles/native-share';
import {buildShareText} from '@/lib/profiles/share-text';
import type {Profile} from '@/types/profile';

// "자연스러운 공유" — 사진을 Web Share로 묶어 보내고 정보 텍스트는 클립보드에 복사.
// 카카오 카드 공유와 별개로, 사람이 직접 앨범+텍스트를 보낸 것처럼 전송한다.
export function NaturalShareButton({profile}: {profile: Profile}) {
  const [isBusy, setIsBusy] = useState(false);
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);

  const handleClick = async () => {
    setIsBusy(true);
    try {
      const text = buildShareText(profile);
      // 텍스트는 항상 클립보드에 복사(iOS 카톡이 share text를 누락하는 경우 대비)
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // 클립보드 실패는 치명적이지 않음 — 공유는 계속 진행
      }

      const files = await urlsToFiles(profile.photos.map(p => p.url));

      if (files.length > 0 && canNativeShareFiles(files[0])) {
        try {
          await navigator.share({files});
        } catch {
          // 사용자가 공유 시트를 취소한 경우 등 — 조용히 무시
          setIsBusy(false);
          return;
        }
        setAlertState({
          kind: 'alert',
          title: '정보가 복사됐어요',
          message: '사진을 보낸 채팅방에 길게 눌러 붙여넣기 하면 정보가 함께 전달됩니다.',
        });
      } else {
        // 데스크톱/파일 공유 미지원 — 사진 다운로드 + 텍스트는 이미 복사됨
        for (const file of files) {
          const url = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
        setAlertState({
          kind: 'alert',
          title: '정보가 복사됐어요',
          message:
            files.length > 0
              ? '사진이 다운로드됐어요. 카카오톡에 사진을 첨부하고 붙여넣기 하세요.'
              : '정보가 클립보드에 복사됐어요. 채팅방에 붙여넣기 하세요.',
        });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <button
        className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-[var(--violet-200)] bg-white px-4 font-bold text-[var(--violet-700)] shadow-sm transition hover:bg-[var(--violet-50)] disabled:opacity-60"
        type="button"
        onClick={handleClick}
        disabled={isBusy}
      >
        {isBusy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--violet-300)] border-t-[var(--violet-600)]" />
        ) : (
          <Send size={17} aria-hidden />
        )}
        자연스러운 공유
      </button>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </>
  );
}
```

- [ ] **Step 2: Verify build (no dedicated test — DOM/navigator heavy)**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm build`
Expected: `✓ Compiled successfully` (타입 에러 없음).

- [ ] **Step 3: Commit**

```bash
git add src/components/NaturalShareButton.tsx
git commit -m "feat: NaturalShareButton — 사진 Web Share + 정보 클립보드 복사"
```

---

### Task 4: Dashboard 연결 (선택 1명일 때 노출)

**Files:**
- Modify: `src/components/Dashboard.tsx`

**Interfaces:**
- Consumes (Task 3): `NaturalShareButton` from `@/components/NaturalShareButton`. 기존 `selectedProfiles` (활성·선택된 매물 배열).
- Produces: 없음.

- [ ] **Step 1: Add import**

`Dashboard.tsx`의 `import {ShareButton} ...` 줄 아래에 추가:

```typescript
import {NaturalShareButton} from '@/components/NaturalShareButton';
```

- [ ] **Step 2: Render next to ShareButton when exactly one selected**

현재(대시보드 좌하단):

```tsx
      {/* 좌측 하단 고정: 카카오톡 공유 */}
      <div className="fixed bottom-4 left-4 z-30">
        <ShareButton profiles={selectedProfiles} />
      </div>
```

를 아래로 교체(가로로 나란히, 1명일 때만 자연스러운 공유 노출):

```tsx
      {/* 좌측 하단 고정: 공유 버튼들 */}
      <div className="fixed bottom-4 left-4 z-30 flex items-center gap-2">
        <ShareButton profiles={selectedProfiles} />
        {selectedProfiles.length === 1 ? (
          <NaturalShareButton profile={selectedProfiles[0]} />
        ) : null}
      </div>
```

- [ ] **Step 3: Build + full test**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm build`
Expected: `✓ Compiled successfully`.

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run`
Expected: 전체 PASS (기존 127 + Task1 4 + Task2 6 = 137개).

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: 대시보드 1명 선택 시 자연스러운 공유 버튼 노출"
```

---

## 수동 검증 (배포 후, 필수)

`navigator.share`는 HTTPS + 사용자 제스처에서만 동작하므로 로컬 dev(http)·PC에서는 확인 불가. 배포본에서:

1. 폰(iOS/Android)에서 배포본 접속 → 매물 1명 체크 → "자연스러운 공유" 탭.
2. 공유시트에서 카카오톡 → 채팅방 선택 → 사진 묶음 전송 확인.
3. 채팅방에서 붙여넣기(길게 눌러 붙여넣기) → 정보 텍스트가 붙는지 확인.
4. iOS에서 사진과 함께 text가 붙는지/누락되는지 확인(누락돼도 클립보드 복사로 대체됨).
5. PC 브라우저에서 탭 시 사진 다운로드 + 클립보드 복사 동작 확인.

## Self-Review 결과

- **Spec coverage:** 텍스트 생성(Task1), 파일 공유 판별·변환(Task2), 버튼·모바일/데스크톱 분기(Task3), 1명 노출 연결(Task4), 배포 후 수동검증(명시) — spec 전 항목 매핑됨.
- **Placeholder scan:** 없음. 모든 코드 블록 실제 내용.
- **Type consistency:** `buildShareText(profile)`, `canNativeShareFiles(probeFile?)`, `urlsToFiles(urls)`, `NaturalShareButton({profile})` 시그니처가 정의처와 사용처에서 일치.
