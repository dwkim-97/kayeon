# 외부 API 매물 등록 + 승인 워크플로우 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외부 스크립트가 API 키로 매물을 등록 대기에 제출하고, 관리자가 웹에서 승인하면 실제 매물로 전환되는 워크플로우.

**Architecture:** 신규 `pending_profiles` 테이블 + `pending/` Storage 경로. 외부 등록은 API 키 인증 + multipart. 승인/거절/조회는 세션 인증. 승인 시 admin client로 profiles/profile_photos에 전개.

**Tech Stack:** Next.js 16 App Router, Supabase(Postgres/Storage, admin client=secret key), zod, TypeScript, Vitest.

## Global Constraints

- Node arm64: 모든 명령 앞에 `export PATH="$HOME/.local/node-arm64/bin:$PATH"`.
- pnpm 사용, dev 서버 `PORT=3100`.
- API 라우트 `export const runtime = 'nodejs'`.
- 원격 push 금지 — 로컬 커밋만.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- 외부 등록/승인/거절은 **admin client(secret key)로 RLS 우회**. 조회는 세션 클라이언트.

---

## File Structure

- Create: `supabase/migrations/20260703000000_pending_profiles.sql`
- Modify: `src/lib/supabase/types.ts` — pending_profiles Row/Insert
- Create: `src/lib/profiles/external-input.ts` (+test) — zod 스키마, 외부 입력 검증/정규화
- Create: `src/lib/auth/api-key.ts` (+test) — API 키 검증
- Create: `src/lib/supabase/pending-mappers.ts` — pending row ↔ 도메인 변환
- Create: `src/types/pending.ts` — PendingProfile 타입
- Create: `src/app/api/external/profiles/route.ts` — POST(외부 등록, multipart)
- Create: `src/app/api/pending/route.ts` — GET(대기 목록)
- Create: `src/app/api/pending/[id]/approve/route.ts` — POST(승인)
- Create: `src/app/api/pending/[id]/route.ts` — DELETE(거절)
- Create: `src/app/pending/page.tsx` — 대기 목록 페이지
- Modify: `src/components/AppHeader.tsx` — '대기 매물' 메뉴 (NavPage에 'pending' 추가)

---

### Task 1: DB 마이그레이션 (pending_profiles)

**Files:**
- Create: `supabase/migrations/20260703000000_pending_profiles.sql`

**Interfaces:**
- Produces: `public.pending_profiles` 테이블.

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/20260703000000_pending_profiles.sql`:
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
  photo_paths text[] not null default '{}',
  submitted_by text not null default 'external-api',
  created_at timestamptz not null default now(),
  constraint pending_profiles_gender_check check (gender in ('female', 'male'))
);

create index pending_profiles_created_at_idx on public.pending_profiles (created_at desc);

alter table public.pending_profiles enable row level security;

create policy pending_select_app_users on public.pending_profiles
  for select to authenticated using ((select public.is_app_user()));
create policy pending_delete_app_users on public.pending_profiles
  for delete to authenticated using ((select public.is_app_user()));

grant select, delete on public.pending_profiles to authenticated;
```

- [ ] **Step 2: prod 적용 안내 확인**

secret key(REST)로는 DDL 불가. 사용자가 Supabase SQL Editor에서 실행해야 함. 적용 여부 점검:
```bash
export PATH="$HOME/.local/node-arm64/bin:$PATH"
node --env-file=.env.local -e '
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, s=process.env.SUPABASE_SECRET_KEY;
fetch(`${url}/rest/v1/pending_profiles?select=id&limit=1`,{headers:{apikey:s,Authorization:`Bearer ${s}`}}).then(r=>console.log("pending_profiles:", r.status===200?"있음":`없음(${r.status})`));
'
```
Expected: 미적용 시 "없음(404)". (구현·테스트는 테이블 없이도 진행 가능한 부분부터.)

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20260703000000_pending_profiles.sql
git commit -m "feat: add pending_profiles table migration

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 타입 + Database 타입 (pending)

**Files:**
- Create: `src/types/pending.ts`
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `PendingProfile` 타입; Database Tables에 pending_profiles Row/Insert.

- [ ] **Step 1: PendingProfile 타입 작성**

`src/types/pending.ts`:
```typescript
import type {Drinking, Gender, Religion, Smoking} from '@/types/profile';

export type PendingProfile = {
  id: string;
  gender: Gender;
  birthYear: number;
  height: number;
  residence: string;
  job: string;
  religion: Religion;
  mbti: string;
  hobbies: string;
  smoking: Smoking;
  drinking: Drinking;
  idealType: string;
  matchmakerComment: string;
  extra: string;
  photoUrls: string[];
  submittedBy: string;
  createdAt: string;
};
```

- [ ] **Step 2: Database 타입에 pending_profiles 추가**

`src/lib/supabase/types.ts`의 Tables에 추가:
```typescript
      pending_profiles: {
        Row: {
          id: string;
          gender: Gender;
          birth_year: number;
          height: number;
          residence: string;
          job: string;
          religion: Religion;
          mbti: string;
          hobbies: string;
          smoking: Smoking;
          drinking: Drinking;
          ideal_type: string;
          matchmaker_comment: string;
          extra: string;
          photo_paths: string[];
          submitted_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gender: Gender;
          birth_year: number;
          height: number;
          residence: string;
          job: string;
          religion?: Religion;
          mbti?: string;
          hobbies?: string;
          smoking?: Smoking;
          drinking?: Drinking;
          ideal_type?: string;
          matchmaker_comment?: string;
          extra?: string;
          photo_paths?: string[];
          submitted_by?: string;
          created_at?: string;
        };
        Update: {[key: string]: never};
        Relationships: [];
      };
```

- [ ] **Step 3: 타입체크**
Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm exec tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: Commit**
```bash
git add src/types/pending.ts src/lib/supabase/types.ts
git commit -m "feat: add PendingProfile types

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 외부 입력 검증 (zod)

**Files:**
- Create: `src/lib/profiles/external-input.ts`
- Test: `src/lib/profiles/external-input.test.ts`

**Interfaces:**
- Consumes: zod.
- Produces: `parseExternalProfile(input: unknown)` → `{success: true, value: ExternalProfileInput} | {success: false, error: string}`. `ExternalProfileInput`은 gender/birthYear/height/residence/job 필수, 나머지 기본값 채워진 객체.

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/profiles/external-input.test.ts`:
```typescript
import {describe, expect, it} from 'vitest';
import {parseExternalProfile} from './external-input';

describe('parseExternalProfile', () => {
  it('accepts a minimal valid payload and fills defaults', () => {
    const r = parseExternalProfile({gender: 'female', birthYear: 1996, height: 163, residence: '수지', job: '회사원'});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.value.religion).toBe('not_selected');
      expect(r.value.mbti).toBe('');
      expect(r.value.smoking).toBe('not_selected');
    }
  });

  it('rejects missing required field (job)', () => {
    const r = parseExternalProfile({gender: 'female', birthYear: 1996, height: 163, residence: '수지'});
    expect(r.success).toBe(false);
  });

  it('rejects invalid gender', () => {
    const r = parseExternalProfile({gender: 'x', birthYear: 1996, height: 163, residence: '수지', job: '회사원'});
    expect(r.success).toBe(false);
  });

  it('rejects out-of-range height and birthYear', () => {
    expect(parseExternalProfile({gender: 'male', birthYear: 1800, height: 170, residence: 'a', job: 'b'}).success).toBe(false);
    expect(parseExternalProfile({gender: 'male', birthYear: 1996, height: 40, residence: 'a', job: 'b'}).success).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**
Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm test src/lib/profiles/external-input.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/lib/profiles/external-input.ts`:
```typescript
import {z} from 'zod';

const schema = z.object({
  gender: z.enum(['female', 'male']),
  birthYear: z.number().int().min(1920).max(2020),
  height: z.number().int().min(120).max(230),
  residence: z.string().trim().min(1),
  job: z.string().trim().min(1),
  religion: z.enum(['christian', 'buddhist', 'catholic', 'not_selected']).default('not_selected'),
  mbti: z.string().trim().default(''),
  hobbies: z.string().trim().default(''),
  smoking: z.enum(['smoker', 'non_smoker', 'not_selected']).default('not_selected'),
  drinking: z.enum(['drinker', 'non_drinker', 'not_selected']).default('not_selected'),
  idealType: z.string().trim().default(''),
  matchmakerComment: z.string().trim().default(''),
  extra: z.string().trim().default(''),
});

export type ExternalProfileInput = z.infer<typeof schema>;

export type ParseResult =
  | {success: true; value: ExternalProfileInput}
  | {success: false; error: string};

export function parseExternalProfile(input: unknown): ParseResult {
  const result = schema.safeParse(input);
  if (!result.success) {
    return {success: false, error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')};
  }
  return {success: true, value: result.data};
}
```

- [ ] **Step 4: 통과 확인**
Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm test src/lib/profiles/external-input.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**
```bash
git add src/lib/profiles/external-input.ts src/lib/profiles/external-input.test.ts
git commit -m "feat: zod validation for external profile submission

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: API 키 검증

**Files:**
- Create: `src/lib/auth/api-key.ts`
- Test: `src/lib/auth/api-key.test.ts`

**Interfaces:**
- Produces: `isValidApiKey(provided: string | null): boolean` — `process.env.EXTERNAL_API_KEY`와 상수시간 비교. env 미설정이거나 provided null이면 false.

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/auth/api-key.test.ts`:
```typescript
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {isValidApiKey} from './api-key';

describe('isValidApiKey', () => {
  const original = process.env.EXTERNAL_API_KEY;
  beforeEach(() => { process.env.EXTERNAL_API_KEY = 'secret-123'; });
  afterEach(() => { process.env.EXTERNAL_API_KEY = original; });

  it('returns true for matching key', () => {
    expect(isValidApiKey('secret-123')).toBe(true);
  });
  it('returns false for wrong key', () => {
    expect(isValidApiKey('nope')).toBe(false);
  });
  it('returns false for null', () => {
    expect(isValidApiKey(null)).toBe(false);
  });
  it('returns false when env is unset', () => {
    delete process.env.EXTERNAL_API_KEY;
    expect(isValidApiKey('secret-123')).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**
Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm test src/lib/auth/api-key.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`src/lib/auth/api-key.ts`:
```typescript
// 상수시간 비교로 타이밍 공격 방지.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isValidApiKey(provided: string | null): boolean {
  const expected = process.env.EXTERNAL_API_KEY;
  if (!expected || !provided) return false;
  return timingSafeEqual(provided, expected);
}
```

- [ ] **Step 4: 통과 확인**
Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm test src/lib/auth/api-key.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**
```bash
git add src/lib/auth/api-key.ts src/lib/auth/api-key.test.ts
git commit -m "feat: external API key verification

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: pending mapper

**Files:**
- Create: `src/lib/supabase/pending-mappers.ts`

**Interfaces:**
- Consumes: `PendingProfile`(Task 2), Database pending row, `getStoragePublicBase`.
- Produces: `rowToPendingProfile(row, publicBase): PendingProfile` — photo_paths를 public URL로 변환.

- [ ] **Step 1: 구현**

`src/lib/supabase/pending-mappers.ts`:
```typescript
import type {PendingProfile} from '@/types/pending';
import type {Database} from './types';

type PendingRow = Database['public']['Tables']['pending_profiles']['Row'];

export function rowToPendingProfile(row: PendingRow, publicUrlBase: string): PendingProfile {
  return {
    id: row.id,
    gender: row.gender,
    birthYear: row.birth_year,
    height: row.height,
    residence: row.residence,
    job: row.job,
    religion: row.religion,
    mbti: row.mbti,
    hobbies: row.hobbies,
    smoking: row.smoking,
    drinking: row.drinking,
    idealType: row.ideal_type,
    matchmakerComment: row.matchmaker_comment,
    extra: row.extra,
    photoUrls: row.photo_paths.map(p => `${publicUrlBase}/${p}`),
    submittedBy: row.submitted_by,
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 2: 타입체크**
Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm exec tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**
```bash
git add src/lib/supabase/pending-mappers.ts
git commit -m "feat: pending profile row mapper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 외부 등록 API (POST /api/external/profiles)

**Files:**
- Create: `src/app/api/external/profiles/route.ts`

**Interfaces:**
- Consumes: `isValidApiKey`, `parseExternalProfile`, `createSupabaseAdminClient`, `PROFILE_PHOTOS_BUCKET`.
- Produces: `POST /api/external/profiles` — headers `x-api-key`, multipart body `data`(JSON) + `photos`(File[]). 201 `{pendingId}` | 401 | 400 | 500.

- [ ] **Step 1: 라우트 작성**

`src/app/api/external/profiles/route.ts`:
```typescript
import {NextResponse} from 'next/server';

import {isValidApiKey} from '@/lib/auth/api-key';
import {parseExternalProfile} from '@/lib/profiles/external-input';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isValidApiKey(request.headers.get('x-api-key'))) {
    return NextResponse.json({message: '유효하지 않은 API 키입니다.'}, {status: 401});
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({message: 'multipart/form-data 형식이어야 합니다.'}, {status: 400});
  }

  const dataRaw = form.get('data');
  if (typeof dataRaw !== 'string') {
    return NextResponse.json({message: 'data 필드(JSON 문자열)가 필요합니다.'}, {status: 400});
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(dataRaw);
  } catch {
    return NextResponse.json({message: 'data가 유효한 JSON이 아닙니다.'}, {status: 400});
  }

  const parsed = parseExternalProfile(parsedJson);
  if (!parsed.success) {
    return NextResponse.json({message: `검증 실패: ${parsed.error}`}, {status: 400});
  }

  const photos = form.getAll('photos').filter((f): f is File => f instanceof File);
  if (photos.length > 4) {
    return NextResponse.json({message: '사진은 최대 4장까지 가능합니다.'}, {status: 400});
  }

  const supabase = createSupabaseAdminClient();
  const pendingId = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  for (const [i, photo] of photos.entries()) {
    const ext = (photo.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const path = `pending/${pendingId}/${i}.${ext}`;
    const buffer = new Uint8Array(await photo.arrayBuffer());
    const {error} = await supabase.storage.from(PROFILE_PHOTOS_BUCKET).upload(path, buffer, {contentType: photo.type});
    if (error) {
      if (uploadedPaths.length > 0) await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove(uploadedPaths);
      return NextResponse.json({message: `사진 업로드 실패: ${error.message}`}, {status: 500});
    }
    uploadedPaths.push(path);
  }

  const v = parsed.value;
  const {data, error} = await supabase
    .from('pending_profiles')
    .insert({
      id: pendingId,
      gender: v.gender,
      birth_year: v.birthYear,
      height: v.height,
      residence: v.residence,
      job: v.job,
      religion: v.religion,
      mbti: v.mbti,
      hobbies: v.hobbies,
      smoking: v.smoking,
      drinking: v.drinking,
      ideal_type: v.idealType,
      matchmaker_comment: v.matchmakerComment,
      extra: v.extra,
      photo_paths: uploadedPaths,
    })
    .select('id')
    .single();

  if (error) {
    if (uploadedPaths.length > 0) await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove(uploadedPaths);
    return NextResponse.json({message: error.message}, {status: 500});
  }

  return NextResponse.json({pendingId: data.id}, {status: 201});
}
```

- [ ] **Step 2: 타입체크 + 컴파일**
Run:
```bash
export PATH="$HOME/.local/node-arm64/bin:$PATH"
pnpm exec tsc --noEmit
curl -s -m 15 -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3100/api/external/profiles
```
Expected: tsc 0에러. curl은 401(API 키 없음) — 라우트가 살아있다는 뜻.

- [ ] **Step 3: Commit**
```bash
git add src/app/api/external/profiles/route.ts
git commit -m "feat: external profile submission API (multipart, api-key auth)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: 대기 목록 조회 API (GET /api/pending)

**Files:**
- Create: `src/app/api/pending/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`, `getStoragePublicBase`, `rowToPendingProfile`.
- Produces: `GET /api/pending` → `{pending: PendingProfile[]}`.

- [ ] **Step 1: 라우트 작성**

`src/app/api/pending/route.ts`:
```typescript
import {NextResponse} from 'next/server';

import {rowToPendingProfile} from '@/lib/supabase/pending-mappers';
import {createSupabaseServerClient, getStoragePublicBase} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('pending_profiles')
    .select('*')
    .order('created_at', {ascending: false});

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }
  const base = getStoragePublicBase();
  return NextResponse.json({pending: data.map(row => rowToPendingProfile(row, base))});
}
```

- [ ] **Step 2: 타입체크 + 컴파일**
Run:
```bash
export PATH="$HOME/.local/node-arm64/bin:$PATH"
pnpm exec tsc --noEmit
curl -s -m 15 -o /dev/null -w "%{http_code}\n" http://localhost:3100/api/pending
```
Expected: tsc 0에러. curl 200(비로그인이면 RLS로 빈 배열).

- [ ] **Step 3: Commit**
```bash
git add src/app/api/pending/route.ts
git commit -m "feat: pending list API

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: 승인 API (POST /api/pending/[id]/approve)

**Files:**
- Create: `src/app/api/pending/[id]/approve/route.ts`

**Interfaces:**
- Consumes: `createSupabaseServerClient`(세션 이름), `createSupabaseAdminClient`, `getSessionUserName`, `PROFILE_PHOTOS_BUCKET`.
- Produces: `POST /api/pending/[id]/approve` → `{profileId}` | 404 | 500. pending → profiles+photos 전개, 사진 정식 경로 복사, pending 삭제.

- [ ] **Step 1: 라우트 작성**

`src/app/api/pending/[id]/approve/route.ts`:
```typescript
import {NextResponse} from 'next/server';

import {getSessionUserName} from '@/lib/auth/session';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {createSupabaseServerClient, PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

export async function POST(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const session = await createSupabaseServerClient();
  const actorName = await getSessionUserName(session);
  if (!actorName) return NextResponse.json({message: '인증이 필요합니다.'}, {status: 401});

  const admin = createSupabaseAdminClient();

  // 1) pending 조회
  const {data: pending, error: fetchError} = await admin
    .from('pending_profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !pending) return NextResponse.json({message: '대기 매물을 찾을 수 없습니다.'}, {status: 404});

  // 2) 프로필 생성
  const profileId = crypto.randomUUID();
  const {error: profileError} = await admin.from('profiles').insert({
    id: profileId,
    gender: pending.gender,
    status: 'active',
    author_name: actorName,
    residence: pending.residence,
    birth_year: pending.birth_year,
    height: pending.height,
    job: pending.job,
    religion: pending.religion,
    mbti: pending.mbti,
    hobbies: pending.hobbies,
    smoking: pending.smoking,
    drinking: pending.drinking,
    ideal_type: pending.ideal_type,
    matchmaker_comment: pending.matchmaker_comment,
    extra: pending.extra,
  });
  if (profileError) return NextResponse.json({message: profileError.message}, {status: 500});

  // 3) 사진 정식 경로로 복사 + profile_photos insert
  const photoRows: {id: string; profile_id: string; storage_path: string; alt: string; sort_order: number}[] = [];
  for (const [i, srcPath] of pending.photo_paths.entries()) {
    const ext = srcPath.split('.').pop() ?? 'jpg';
    const photoId = crypto.randomUUID();
    const destPath = `${profileId}/${photoId}.${ext}`;
    const {error: copyError} = await admin.storage.from(PROFILE_PHOTOS_BUCKET).copy(srcPath, destPath);
    if (copyError) return NextResponse.json({message: `사진 복사 실패: ${copyError.message}`}, {status: 500});
    photoRows.push({id: photoId, profile_id: profileId, storage_path: destPath, alt: `프로필 사진 ${i + 1}`, sort_order: i});
  }
  if (photoRows.length > 0) {
    const {error: photoError} = await admin.from('profile_photos').insert(photoRows);
    if (photoError) return NextResponse.json({message: photoError.message}, {status: 500});
  }

  // 4) pending 사진 + 행 삭제
  if (pending.photo_paths.length > 0) {
    await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove(pending.photo_paths);
  }
  await admin.from('pending_profiles').delete().eq('id', id);

  return NextResponse.json({profileId});
}
```

- [ ] **Step 2: 타입체크**
Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm exec tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**
```bash
git add "src/app/api/pending/[id]/approve/route.ts"
git commit -m "feat: approve pending profile API

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: 거절 API (DELETE /api/pending/[id])

**Files:**
- Create: `src/app/api/pending/[id]/route.ts`

**Interfaces:**
- Consumes: `createSupabaseAdminClient`, `PROFILE_PHOTOS_BUCKET`.
- Produces: `DELETE /api/pending/[id]` → `{ok: true}`.

- [ ] **Step 1: 라우트 작성**

`src/app/api/pending/[id]/route.ts`:
```typescript
import {NextResponse} from 'next/server';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

export async function DELETE(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const admin = createSupabaseAdminClient();

  const {data: pending} = await admin.from('pending_profiles').select('photo_paths').eq('id', id).single();
  if (pending?.photo_paths?.length) {
    await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove(pending.photo_paths);
  }
  const {error} = await admin.from('pending_profiles').delete().eq('id', id);
  if (error) return NextResponse.json({message: error.message}, {status: 500});
  return NextResponse.json({ok: true});
}
```

- [ ] **Step 2: 타입체크**
Run: `export PATH="$HOME/.local/node-arm64/bin:$PATH" && pnpm exec tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**
```bash
git add "src/app/api/pending/[id]/route.ts"
git commit -m "feat: reject pending profile API

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: 헤더 메뉴 + 대기 목록 페이지

**Files:**
- Modify: `src/components/AppHeader.tsx`
- Create: `src/app/pending/page.tsx`

**Interfaces:**
- Consumes: `GET /api/pending`, approve/reject API, `PendingProfile`, `AppHeader`.
- Produces: `/pending` 페이지, 헤더에 '대기 매물' 링크.

- [ ] **Step 1: AppHeader에 pending 네비 추가**

`src/components/AppHeader.tsx`의 `NavPage` 타입에 `'pending'` 추가, `NAV_LINKS`에 각 페이지 링크 배열에 대기 매물 링크 추가하고 pending 키 항목 추가. import에 `ClipboardList` 추가.
- `type NavPage = 'dashboard' | 'admin' | 'history' | 'pending';`
- dashboard/admin/history 배열 각각에 `{href: '/pending', label: '대기 매물', icon: <ClipboardList size={14} strokeWidth={1.75} aria-hidden />}` 추가.
- `pending` 키 추가:
```typescript
  pending: [
    {href: '/', label: '대시보드', icon: <Users size={14} strokeWidth={1.75} aria-hidden />},
    {href: '/history', label: '히스토리', icon: <History size={14} strokeWidth={1.75} aria-hidden />},
    {href: '/admin', label: '관리자', icon: <ShieldCheck size={14} strokeWidth={1.75} aria-hidden />},
  ],
```
import 줄: `import {ClipboardList, History, LogOut, ShieldCheck, Users} from 'lucide-react';`

- [ ] **Step 2: 대기 목록 페이지 작성**

`src/app/pending/page.tsx`:
```tsx
'use client';

import {useEffect, useState} from 'react';

import {AppHeader} from '@/components/AppHeader';
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {genderLabels} from '@/lib/profiles/options';
import type {PendingProfile} from '@/types/pending';

export default function PendingPage() {
  const [items, setItems] = useState<PendingProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = () => {
    fetch('/api/pending')
      .then(r => r.json())
      .then(({pending}) => setItems(pending ?? []))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  };
  useEffect(load, []);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/pending/${id}/approve`, {method: 'POST'});
      if (res.ok) setItems(cur => cur.filter(p => p.id !== id));
    } finally {
      setBusyId('');
    }
  };
  const reject = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/pending/${id}`, {method: 'DELETE'});
      if (res.ok) setItems(cur => cur.filter(p => p.id !== id));
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <AppHeader page="pending" />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-5">
          <h1 className="text-3xl font-bold text-[var(--violet-950)]">대기 매물</h1>
          <p className="mt-1 text-sm text-slate-500">외부에서 제출된 매물을 승인하거나 거절합니다.</p>
        </header>

        {isLoading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="rounded-[8px] border border-[var(--border)] bg-white p-8 text-center text-sm font-semibold text-slate-500">
            대기 중인 매물이 없습니다.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {items.map(p => (
              <li key={p.id} className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-white shadow-sm">
                <div className="flex gap-1 overflow-x-auto bg-[var(--violet-50)] p-2">
                  {p.photoUrls.length > 0 ? (
                    p.photoUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt={`대기 사진 ${i + 1}`} className="h-28 w-24 shrink-0 rounded-[6px] object-cover" />
                    ))
                  ) : (
                    <div className="grid h-28 w-full place-items-center text-xs text-slate-400">사진 없음</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-bold text-[var(--violet-950)]">
                    {genderLabels[p.gender]} · {formatBirthYearLabel(p.birthYear)} · {p.height}cm
                  </p>
                  <p className="mt-1 break-keep text-sm text-slate-600">{p.residence} · {p.job}</p>
                  {p.extra ? <p className="mt-1 break-keep text-xs text-slate-400">{p.extra}</p> : null}
                  <p className="mt-2 text-[11px] text-slate-400">제출: {p.submittedBy}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="h-9 flex-1 rounded-[8px] bg-[var(--violet-600)] text-sm font-semibold text-white transition hover:bg-[var(--violet-700)] disabled:opacity-50"
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => approve(p.id)}
                    >
                      승인
                    </button>
                    <button
                      className="h-9 flex-1 rounded-[8px] border border-red-200 text-sm font-semibold text-[var(--danger)] transition hover:bg-red-50 disabled:opacity-50"
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => reject(p.id)}
                    >
                      거절
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: 미들웨어 공개경로 확인**

`/pending`은 로그인 필요 페이지이므로 `isPublicPath`에 추가하지 않는다(기본 보호됨). `src/lib/auth/routes.ts` 수정 불필요 — 확인만.

- [ ] **Step 4: 검증**
Run:
```bash
export PATH="$HOME/.local/node-arm64/bin:$PATH"
pnpm exec tsc --noEmit && pnpm test && pnpm lint
curl -s -m 15 -o /dev/null -w "%{http_code}\n" http://localhost:3100/pending
```
Expected: tsc 0, 테스트 all pass, 린트 내 파일 error 0. curl은 로그인 리다이렉트(미들웨어) 또는 200.

- [ ] **Step 5: Commit**
```bash
git add src/components/AppHeader.tsx src/app/pending/page.tsx
git commit -m "feat: pending profiles admin page + nav

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: 문서화 (curl 사용법)

**Files:**
- Modify: `README.md` (또는 Create: `docs/external-api.md`)

- [ ] **Step 1: 사용법 문서 작성**

`docs/external-api.md`:
```markdown
# 외부 매물 등록 API

## 엔드포인트
POST /api/external/profiles  (multipart/form-data)

## 인증
헤더 `x-api-key: <EXTERNAL_API_KEY>` (Vercel 환경변수로 설정)

## 필드
- `data` (JSON 문자열, 필수): gender(female|male), birthYear, height, residence, job 필수. religion/mbti/hobbies/smoking/drinking/idealType/matchmakerComment/extra 선택.
- `photos` (파일, 0~4개): 로컬 이미지 파일.

## 예시
​```bash
curl -X POST https://kayeon.vercel.app/api/external/profiles \
  -H "x-api-key: $EXTERNAL_API_KEY" \
  -F 'data={"gender":"female","birthYear":1996,"height":163,"residence":"수지","job":"회사원"}' \
  -F "photos=@/path/to/photo1.jpg" \
  -F "photos=@/path/to/photo2.jpg"
​```

## 동작
등록 대기(pending_profiles)에 저장됨. 관리자가 웹 /pending 페이지에서 승인해야 실제 매물로 전환.

## 제한
- Vercel 서버리스 요청 바디 기본 4.5MB. 사진 여러 장이 크면 초과할 수 있음.
- 사진 최대 4장.
```

- [ ] **Step 2: Commit**
```bash
git add docs/external-api.md
git commit -m "docs: external submission API usage

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review 결과

- **스펙 커버리지**: pending 테이블(T1) / 타입(T2) / zod검증(T3) / API키(T4) / mapper(T5) / 외부등록 multipart(T6) / 대기조회(T7) / 승인 전개+사진이동(T8) / 거절(T9) / UI+헤더(T10) / 문서(T11) — 전부 태스크 있음.
- **타입 일관성**: `PendingProfile` 필드(birthYear/photoUrls/submittedBy 등) T2 정의 → T5 mapper → T10 UI 사용 일치. `parseExternalProfile` 반환 `{success, value|error}` T3 정의 → T6 사용 일치.
- **플레이스홀더**: 없음(모든 코드 실체 포함).
- **주의**: T1 DB 적용은 사용자 Supabase SQL 실행 필요. 테이블 없으면 T6~T10 런타임 동작은 안 되지만 tsc/빌드/순수테스트(T3,T4)는 통과. curl 실검증은 SQL 실행 후.
- **zod 의존성**: package.json에 zod 4 이미 있음(확인됨) — 추가 설치 불필요.
