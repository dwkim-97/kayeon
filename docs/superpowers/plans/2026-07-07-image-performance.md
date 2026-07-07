# 대시보드 이미지 성능 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드 첫 진입 이미지 다운로드량(현재 최대 300MB+)을 수백 KB 수준으로 줄여 체감 속도를 개선한다.

**Architecture:** DB·업로드·API는 건드리지 않고 표시 레이어만 바꾼다. (1) 신규 순수 함수 `photoThumbnailUrl`이 Supabase Storage 공개 object URL을 render/image 변환 URL(width/quality)로 바꾼다. (2) `ProfileCard`가 전체 사진을 깔던 것을 현재 사진 1장만 렌더하고 썸네일 URL + `loading="lazy"`를 쓴다. (3) 상세 슬라이더/라이트박스는 동일 헬퍼로 큰 변환본을 쓴다.

**Tech Stack:** Next.js 16 + React 19 + TypeScript, Vitest + @testing-library/react, Tailwind v4, Supabase Storage image transform.

## Global Constraints

- 로컬 명령은 항상 `export PATH="$HOME/.local/node-arm64/bin:$PATH"`를 앞에 붙인다 (시스템 Node가 x64라 vitest/next가 깨짐).
- 패키지 매니저는 pnpm.
- DB 스키마·업로드 파이프라인·`/api/profiles`·매퍼의 원본 URL 반환은 변경하지 않는다. 헬퍼는 표시 시점에만 적용.
- render 변환 대상은 Storage 공개 object URL(`/storage/v1/object/public/profile-photos/{path}`)뿐. data URL·비대상 URL은 그대로 통과시킨다 (업로드 미리보기가 data URL이므로 깨지면 안 됨).
- 기존 테스트(vitest 101개)는 계속 통과해야 한다.

---

## File Structure

- **Create** `src/lib/profiles/photo-url.ts` — `photoThumbnailUrl(url, width, quality?)` 순수 함수 + 폭 상수. 책임: 표시용 URL 변환 하나만.
- **Create** `src/lib/profiles/photo-url.test.ts` — 헬퍼 단위테스트.
- **Modify** `src/components/ProfileCard.tsx` — 활성 사진 1장만 렌더 + 썸네일 URL + lazy-load.
- **Modify** `src/components/ProfileCard.test.tsx` — 활성 사진만 렌더 + lazy 속성 테스트 추가.
- **Modify** `src/app/profiles/[id]/PhotoSlider.tsx` — 현재 사진(+이웃) 큰 변환본 사용.
- **Modify** `src/components/ProfileDetailModal.tsx` — `PartnerThumb` 썸네일에 헬퍼 적용.
- **Modify** `src/components/PhotoLightbox.tsx` — 메인 이미지는 큰 변환본, 하단 썸네일은 작은 변환본.

---

### Task 1: 썸네일 URL 헬퍼

**Files:**
- Create: `src/lib/profiles/photo-url.ts`
- Test: `src/lib/profiles/photo-url.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수).
- Produces:
  - `export const CARD_THUMB_WIDTH_DETAILED = 520`
  - `export const CARD_THUMB_WIDTH_COMPACT = 320`
  - `export const DETAIL_IMAGE_WIDTH = 1200`
  - `export const PARTNER_THUMB_WIDTH = 96`
  - `export const LIGHTBOX_THUMB_WIDTH = 160`
  - `export function photoThumbnailUrl(url: string, width: number, quality?: number): string`
    - 입력 `url`에 `/storage/v1/object/public/`가 포함되면 이를 `/storage/v1/render/image/public/`로 바꾸고 `?width={width}&quality={quality ?? DEFAULT_QUALITY}`를 붙여 반환.
    - 이미 `?`가 있는 URL은 대상이 아니므로(공개 object URL엔 쿼리 없음) 그대로 두되, 안전을 위해 대상 패턴이 아니면 원본 반환.
    - `data:`로 시작하거나 대상 패턴이 없으면 `url` 원본 그대로 반환.
    - `DEFAULT_QUALITY = 60` (모듈 내 상수, export 안 함).

- [ ] **Step 1: Write the failing test**

`src/lib/profiles/photo-url.test.ts`:

```typescript
import {describe, expect, it} from 'vitest';

import {
  CARD_THUMB_WIDTH_COMPACT,
  CARD_THUMB_WIDTH_DETAILED,
  photoThumbnailUrl,
} from './photo-url';

const OBJECT_URL =
  'https://proj.supabase.co/storage/v1/object/public/profile-photos/abc/def.png';

describe('photoThumbnailUrl', () => {
  it('rewrites a public object URL to a render/image URL with width and quality', () => {
    const out = photoThumbnailUrl(OBJECT_URL, 520);
    expect(out).toBe(
      'https://proj.supabase.co/storage/v1/render/image/public/profile-photos/abc/def.png?width=520&quality=60',
    );
  });

  it('accepts a custom quality', () => {
    const out = photoThumbnailUrl(OBJECT_URL, 320, 50);
    expect(out).toContain('/render/image/public/');
    expect(out).toContain('width=320');
    expect(out).toContain('quality=50');
  });

  it('leaves data URLs untouched (upload previews must not break)', () => {
    const dataUrl = 'data:image/jpeg;base64,AAAA';
    expect(photoThumbnailUrl(dataUrl, 520)).toBe(dataUrl);
  });

  it('leaves non-matching URLs untouched', () => {
    const other = 'https://example.com/some/photo.jpg';
    expect(photoThumbnailUrl(other, 520)).toBe(other);
  });

  it('exposes distinct card widths', () => {
    expect(CARD_THUMB_WIDTH_DETAILED).toBeGreaterThan(CARD_THUMB_WIDTH_COMPACT);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run src/lib/profiles/photo-url.test.ts`
Expected: FAIL — "Failed to resolve import './photo-url'" 또는 함수 미정의.

- [ ] **Step 3: Write minimal implementation**

`src/lib/profiles/photo-url.ts`:

```typescript
// 매물 사진 표시용 URL 헬퍼.
// Supabase Storage 공개 object URL을 render/image 변환 URL로 바꿔
// 표시 크기에 맞는 작은 이미지(브라우저 Accept에 따라 webp)를 받게 한다.
// 원본은 건드리지 않고 표시 시점에만 적용한다.

// 표시별 목표 폭(px). 레티나 2배를 고려해 CSS 표시폭의 약 2배로 둔다.
export const CARD_THUMB_WIDTH_DETAILED = 520; // 상세보기 카드(~260px 표시)
export const CARD_THUMB_WIDTH_COMPACT = 320; // 작게보기 카드(~160px 표시)
export const DETAIL_IMAGE_WIDTH = 1200; // 상세 모달/공개 상세/라이트박스 메인
export const PARTNER_THUMB_WIDTH = 96; // 매칭 상대 40px 썸네일(2배+여유)
export const LIGHTBOX_THUMB_WIDTH = 160; // 라이트박스 하단 56px 썸네일

const OBJECT_MARKER = '/storage/v1/object/public/';
const RENDER_MARKER = '/storage/v1/render/image/public/';
const DEFAULT_QUALITY = 60;

// 공개 object URL이면 render 변환 URL로 바꾸고 width/quality를 붙인다.
// 대상이 아니면(예: data URL, 외부 URL) 원본을 그대로 반환한다.
export function photoThumbnailUrl(url: string, width: number, quality = DEFAULT_QUALITY): string {
  if (!url || !url.includes(OBJECT_MARKER)) return url;
  const rendered = url.replace(OBJECT_MARKER, RENDER_MARKER);
  return `${rendered}?width=${width}&quality=${quality}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run src/lib/profiles/photo-url.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profiles/photo-url.ts src/lib/profiles/photo-url.test.ts
git commit -m "feat: add photoThumbnailUrl render-image URL helper"
```

---

### Task 2: ProfileCard — 활성 사진만 렌더 + 썸네일 + lazy-load

**Files:**
- Modify: `src/components/ProfileCard.tsx`
- Test: `src/components/ProfileCard.test.tsx`

**Interfaces:**
- Consumes (Task 1): `photoThumbnailUrl`, `CARD_THUMB_WIDTH_DETAILED`, `CARD_THUMB_WIDTH_COMPACT` from `@/lib/profiles/photo-url`.
- Produces: 없음 (표시 동작 변경만).

**변경 요지:** 현재 `ProfileCard.tsx:138-149`는 `profile.photos.map(...)`으로 모든 사진을 `<img>`로 깔고 `opacity`로 전환한다. 이를 **현재 인덱스 사진 1장만** 렌더하도록 바꾼다. 사진 넘기기(`movePhoto`)는 `photoIndex`만 바꾸면 그대로 동작한다. `src`는 variant별 폭으로 `photoThumbnailUrl`을 적용하고 `loading="lazy"`·`decoding="async"`를 붙인다.

- [ ] **Step 1: Write the failing test** — `ProfileCard.test.tsx`에 아래 두 테스트를 `describe('ProfileCard', ...)` 블록 안(마지막 `it` 뒤)에 추가한다.

```typescript
  it('renders only the active photo, not every photo (avoids loading all images)', () => {
    const {container} = render(<ProfileCard {...defaultProps} variant="detailed" />);
    // 사진이 2장이어도 카드 이미지 영역에는 현재 사진 1장만 존재
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(1);
  });

  it('lazy-loads the card image via a render/image thumbnail URL', () => {
    const withStorageUrl: Profile = {
      ...profile,
      photos: [
        {
          id: 'photo-1',
          url: 'https://proj.supabase.co/storage/v1/object/public/profile-photos/a/b.png',
          alt: '프로필 사진 1',
          order: 0,
        },
      ],
    };
    const {container} = render(
      <ProfileCard {...defaultProps} profile={withStorageUrl} variant="detailed" />,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('src')).toContain('/render/image/public/');
    expect(img.getAttribute('src')).toContain('width=520');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run src/components/ProfileCard.test.tsx`
Expected: FAIL — 현재는 사진 2장이 모두 렌더되어 `imgs.length`가 2이고, `src`에 `/object/public/`가 그대로 있어 `loading` 속성이 없음.

- [ ] **Step 3: Write minimal implementation**

3a. `ProfileCard.tsx` 상단 import에 헬퍼를 추가한다. `import {getAuthorColor} ...` 줄 아래에 삽입:

```typescript
import {
  CARD_THUMB_WIDTH_COMPACT,
  CARD_THUMB_WIDTH_DETAILED,
  photoThumbnailUrl,
} from '@/lib/profiles/photo-url';
```

3b. `movePhoto` 정의 아래(컴포넌트 본문, `return` 전)에 현재 사진과 폭을 계산하는 줄을 추가한다:

```typescript
  const thumbWidth = isCompact ? CARD_THUMB_WIDTH_COMPACT : CARD_THUMB_WIDTH_DETAILED;
  const activePhoto = profile.photos[photoIndex];
```

3c. 사진 렌더 블록을 교체한다. 현재(`ProfileCard.tsx:138-149`):

```tsx
          {profile.photos.length > 0 ? (
            <>
              {profile.photos.map((p, i) => (
                <img
                  key={p.id}
                  className="absolute inset-0 h-full w-full select-none object-cover"
                  src={p.url}
                  alt={p.alt}
                  draggable={false}
                  style={{opacity: i === photoIndex ? 1 : 0}}
                />
              ))}
              <button
```

를 아래로 바꾼다 (활성 1장만 렌더, 썸네일 URL, lazy):

```tsx
          {activePhoto ? (
            <>
              <img
                key={activePhoto.id}
                className="absolute inset-0 h-full w-full select-none object-cover"
                src={photoThumbnailUrl(activePhoto.url, thumbWidth)}
                alt={activePhoto.alt}
                draggable={false}
                loading="lazy"
                decoding="async"
              />
              <button
```

주: 조건이 `profile.photos.length > 0` → `activePhoto`로 바뀌지만 의미 동일(사진 있으면 존재). 닫는 `</>`와 이후 화살표 버튼/오버레이 등 나머지 JSX는 그대로 둔다. `hasMultiplePhotos` 기반 좌우 버튼·카운터는 `profile.photos.length`를 계속 참조하므로 변경 불필요.

- [ ] **Step 4: Run test to verify it passes**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run src/components/ProfileCard.test.tsx`
Expected: PASS (기존 11개 + 신규 2개 = 13개). 특히 기존 `renders ... detailed` 테스트도 통과해야 함(오버레이 텍스트는 그대로).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfileCard.tsx src/components/ProfileCard.test.tsx
git commit -m "perf: card renders only active photo via lazy thumbnail URL"
```

---

### Task 3: 상세 슬라이더/라이트박스/매칭 썸네일에 변환본 적용

**Files:**
- Modify: `src/app/profiles/[id]/PhotoSlider.tsx`
- Modify: `src/components/PhotoLightbox.tsx`
- Modify: `src/components/ProfileDetailModal.tsx`

**Interfaces:**
- Consumes (Task 1): `photoThumbnailUrl`, `DETAIL_IMAGE_WIDTH`, `LIGHTBOX_THUMB_WIDTH`, `PARTNER_THUMB_WIDTH` from `@/lib/profiles/photo-url`.
- Produces: 없음.

이 세 컴포넌트는 사진 URL을 직접 `src`에 쓴다. 대형 원본 대신 변환본을 쓰게 한다. 렌더 구조(전체 사진 map, opacity 전환)는 상세/라이트박스에선 유지한다 — 카드와 달리 사진 수가 적고(한 매물 기준) 이미 상세 진입한 사용자이므로 위험 대비 이득이 작다. 여기선 **URL만 변환본으로** 바꾼다.

- [ ] **Step 1: PhotoSlider — 메인 이미지 변환본 적용**

`src/app/profiles/[id]/PhotoSlider.tsx`:

1a. import 추가 (`import type {ProfilePhoto} ...` 위에):

```typescript
import {DETAIL_IMAGE_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
```

1b. 사진 `<img>`의 `src`(현재 `src={photo.url}`, line 65)를 교체:

```tsx
          src={photoThumbnailUrl(photo.url, DETAIL_IMAGE_WIDTH)}
```

- [ ] **Step 2: PhotoLightbox — 메인 변환본 + 썸네일 변환본**

`src/components/PhotoLightbox.tsx`:

2a. import 추가 (`import type {ProfilePhoto} ...` 위에):

```typescript
import {DETAIL_IMAGE_WIDTH, LIGHTBOX_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
```

2b. 메인 이미지 `src`(현재 `src={photo.url}`, line 71)를 교체:

```tsx
          src={photoThumbnailUrl(photo.url, DETAIL_IMAGE_WIDTH)}
```

2c. 하단 데스크톱 썸네일 `<img>`의 `src`(현재 `src={p.url}`, line 125)를 교체:

```tsx
                <img className="h-full w-full object-cover" src={photoThumbnailUrl(p.url, LIGHTBOX_THUMB_WIDTH)} alt={p.alt} />
```

- [ ] **Step 3: ProfileDetailModal — 매칭 상대 썸네일 변환본**

`src/components/ProfileDetailModal.tsx`:

3a. import 추가 (`import {genderLabels} ...` 아래):

```typescript
import {PARTNER_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
```

3b. `PartnerThumb`의 `<img>` `src`(현재 `src={photo.url}`, line 235)를 교체:

```tsx
        <img className="h-full w-full object-cover" src={photoThumbnailUrl(photo.url, PARTNER_THUMB_WIDTH)} alt={photo.alt} draggable={false} />
```

- [ ] **Step 4: 전체 테스트 + 빌드 확인**

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm vitest run`
Expected: 전체 PASS (기존 101 + Task1의 5 + Task2의 2 = 108개).

Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm build`
Expected: 빌드 성공 (타입 에러 없음).

- [ ] **Step 5: Commit**

```bash
git add src/app/profiles/[id]/PhotoSlider.tsx src/components/PhotoLightbox.tsx src/components/ProfileDetailModal.tsx
git commit -m "perf: use render-image thumbnails in slider, lightbox, partner thumb"
```

---

## 수동 검증 (구현 완료 후)

1. `export PATH="$HOME/.local/node-arm64/bin:$PATH" && PORT=3100 pnpm dev`로 실행.
2. 대시보드 진입 → 브라우저 네트워크 탭 이미지 필터. 첫 진입 이미지 총량이 수백 KB 수준(개별 10~30KB webp)인지 확인. 이전엔 MB 단위 png였음.
3. 카드 좌우 화살표로 사진 넘기기 정상 동작.
4. 상세 모달 진입 → 사진 슬라이더·매칭 상대 썸네일 정상 표시.
5. 매물 추가 모달에서 사진 붙여넣기 미리보기(data URL)가 여전히 보이는지 확인(헬퍼가 data URL을 통과시키므로 정상이어야 함).

## Self-Review 결과

- **Spec coverage:** ① 헬퍼(Task 1), ② 활성 사진+lazy(Task 2), 상세/라이트박스(Task 3), 검증(각 Task Step 4·수동) — spec의 모든 항목이 태스크에 매핑됨.
- **Placeholder scan:** 없음. 모든 코드 블록은 실제 내용.
- **Type consistency:** `photoThumbnailUrl(url, width, quality?)` 시그니처와 상수명(`CARD_THUMB_WIDTH_*`, `DETAIL_IMAGE_WIDTH`, `PARTNER_THUMB_WIDTH`, `LIGHTBOX_THUMB_WIDTH`)이 Task 1 정의와 Task 2·3 사용처에서 일치.
