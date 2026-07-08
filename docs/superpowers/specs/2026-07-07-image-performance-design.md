# 대시보드 이미지 성능 개선 설계

날짜: 2026-07-07
범위: 표시 레이어만 (DB·업로드·API 미변경)

## 문제

매물이 늘수록 대시보드 체감 속도가 느려진다. 원인은 이미지 다운로드량이다.

### 실측 (prod DB, 2026-07-07)

- 매물 60명 · 사진 149장
- 사진 원본 총량 **323.76 MB** (평균 2.19MB, 중앙값 1.72MB, 최대 9.55MB, 1MB 초과 100장)
- 대시보드 첫 진입은 이론상 최대 300MB+ 다운로드 — 모든 카드가 모든 사진을 `loading="lazy"` 없이 즉시 로드하기 때문.

### 근본 원인 (코드)

1. **원본 크기 이미지를 카드에 그대로 사용** — `mappers.ts:29`가 Storage 공개 object URL을 그대로 반환. 카드는 상세보기 ~260px / 작게보기 ~160px로 표시하는데 1600px(또는 그 이상) 원본을 받음.
2. **카드마다 전체 사진을 즉시 렌더** — `ProfileCard.tsx:140`이 `profile.photos.map()`으로 사진 전부를 `<img>`로 깔고 opacity로만 전환. 안 보이는 사진까지 즉시 다운로드.
3. **lazy-load 없음** — 카드 `<img>`에 `loading="lazy"`가 없어 화면 밖 카드 이미지까지 첫 진입에 전부 로드.
4. **업로드 리사이즈가 PNG를 PNG로 유지** (`image-resize.ts:70`) — 원본이 1.3~9.5MB로 남음. (이번 범위에서 재처리하지 않음)

### 핵심 발견

Supabase 이미지 변환(render/image)이 이 프로젝트에서 **활성화되어 있음**. 실측:

- `render/image/public/.../{path}?width=520` + 브라우저 `Accept: image/webp` → **19.3 KB webp** (원본 1.34MB 대비 약 1/70)
- `?width=320` → **10.9 KB webp**

즉 DB·업로드·기존 사진에 손대지 않고 **표시 URL만 render 변환 URL로 바꾸면** 다운로드량이 수십 배 줄어든다.

## 설계

원본 URL 대신 **표시 크기에 맞는 render 썸네일 URL**을 쓰고, 화면 밖 이미지는 **lazy-load**한다. 상세 모달·라이트박스만 큰 변환본(또는 원본)을 사용한다.

### ① 썸네일 URL 헬퍼 (신규: `src/lib/profiles/photo-url.ts`)

공개 object URL을 render/image URL로 변환하는 순수 함수.

- 입력: 원본 public object URL (`.../storage/v1/object/public/profile-photos/{path}`), `width`, 선택 `quality`.
- 출력: `.../storage/v1/render/image/public/profile-photos/{path}?width={w}&quality={q}`.
- object URL 패턴(`/object/public/`)이 아니면 원본을 그대로 반환 (data URL·외부 URL·미상 형식 방어).
- `quality` 기본값은 상수로 관리(예: 60).

표시별 폭 상수(레티나 2배 고려):
- 상세보기 카드: `width=520`
- 작게보기 카드: `width=320`
- 상세 모달/라이트박스: `width=1200` (또는 원본)

### ② 활성 사진만 렌더 + lazy-load (`src/components/ProfileCard.tsx`)

- 현재 `profile.photos.map()`으로 전체 사진을 깔던 것을 **현재 인덱스 사진 1장만** 렌더하도록 변경. 사진 넘기기(`movePhoto`)는 인덱스 교체로 동일 동작 유지.
- `<img src>`를 헬퍼로 만든 variant별 썸네일 URL로 교체.
- `<img>`에 `loading="lazy"` + `decoding="async"` 추가 → 화면 밖 카드는 스크롤 시 로드.

### 상세 모달 / 라이트박스

- `ProfileDetailModal`·`PhotoSlider`·`PhotoLightbox`는 큰 이미지가 필요하므로 `width=1200` 변환본을 쓰거나 원본 유지. (카드만큼 급하지 않으나, 동일 헬퍼로 1200px를 적용하면 상세 진입도 가벼워짐 — 구현 시 각 컴포넌트 확인 후 적용)

## 범위 밖 (건드리지 않음)

- DB 스키마, 매퍼가 반환하는 원본 URL 자체 (헬퍼는 표시 시점에만 적용)
- 업로드 파이프라인 / 기존 사진 재인코딩
- `/api/profiles` 페이지네이션·무한스크롤
- 카드 리스트 가상화

## 검증

- 단위테스트: `photo-url.ts` — object URL 변환, 비대상 URL(data:/외부) 통과, quality/width 파라미터.
- `ProfileCard` — 활성 인덱스 사진만 렌더되는지, `loading="lazy"` 존재.
- `pnpm build` 성공 + 기존 vitest 전체 통과.
- 수동: 대시보드 네트워크 탭에서 첫 진입 이미지 총량이 수백 KB 수준인지, 사진 넘기기·상세 진입 정상 동작 확인.

## 예상 효과

첫 진입 이미지 다운로드 300MB+ → 첫 화면 카드 수 개 × ~20KB ≈ 수백 KB. 매물 증가 시에도 보이는 만큼만 로드되어 선형 증가가 사라짐.
