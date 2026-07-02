# UI 다듬기: 담백한 미니멀 리스타일

작성일: 2026-07-03

## 목표

전반적으로 "투박한" 느낌을 걷어내고 에어비앤비/토스풍 담백한 미니멀로 다듬는다. 핑크 브랜드색(#ff385c)은 유지.

## 원칙 (전 컴포넌트 일관 적용)

### 1. 폰트: Pretendard
- Pretendard를 CDN(`@import` 또는 link)으로 로드.
- `globals.css`의 `font-family`를 `Pretendard Variable, Pretendard, -apple-system, ... sans-serif`로 교체.
- 기본 자간 `-0.01em` 정도로 살짝 타이트하게(선택).

### 2. 글자 굵기 하향
- `font-black`(900) → `font-bold`(700)
- `font-extrabold`(800) → `font-semibold`(600)
- 본문/라벨은 `font-medium`(500)~`font-semibold`. 제목만 `font-bold`.
- 대상: Dashboard 툴바/전체선택/카운트, ProfileCard(정보·뱃지·버튼), ProfileDetailModal, ProfileFormModal, history, admin, login, AppHeader.

### 3. 그림자·테두리 순화
- 카드 그림자 `shadow-[0_18px_45px_rgba(...)]` → `shadow-sm` (아주 옅게).
- 색 있는 보더(`border-[var(--violet-100)]`, `--violet-200` 등 정보 표/구분선) → 중립 `border-[var(--border)]`.
- 브랜드 강조가 필요한 곳(선택된 카드, 활성 토글)만 핑크 보더 유지.

### 4. 여백·간격 정돈
- 툴바 상하 패딩, 카드 내부 패딩, 리스트 gap을 일관 스케일로. 빽빽한 곳 여유 확보.

### 5. 아이콘 정돈
- lucide 아이콘 `strokeWidth={1.75}` 통일(기본 2 → 1.75로 얇고 정갈하게).
- 크기 스케일: 본문/작은 버튼 16, 일반 버튼 18, 모달 닫기 20.

### 6. 상단 메뉴바 축소
- 툴바 버튼 높이 `h-9`(36px) → `h-8`(32px), 패딩·폰트 축소.
- 성별 토글/뷰토글/필터/편집 버튼 컴팩트하게 통일.
- AppHeader의 로고/네비 버튼 크기도 과하면 축소.

## 비목표 (YAGNI)

- 레이아웃 구조(그리드, 좌우 분할 등)는 유지. 크기/색/무게만 조정.
- 새 컴포넌트/기능 추가 없음. 순수 스타일.
- 애니메이션 추가 없음(기존 사진 슬라이드 애니메이션 유지).

## 대상 파일

- `src/app/globals.css` — 폰트, 기본 타이포
- `src/components/AppHeader.tsx`
- `src/components/Dashboard.tsx` — 툴바, 리스트 헤더
- `src/components/ProfileCard.tsx`
- `src/components/ProfileDetailModal.tsx`
- `src/components/ProfileFormModal.tsx`
- `src/components/FilterBar.tsx`
- `src/app/history/page.tsx`
- `src/app/login/page.tsx`
- `src/app/admin/AdminPageClient.tsx`

## 검증

- 기존 테스트(45개)가 깨지지 않아야 함 — 테스트는 텍스트/aria-label 기반이라 스타일 변경에 영향 없어야 정상.
- 타입체크/린트 통과.
- 로그인 페이지 + (PC devtools 모바일 뷰로) 대시보드 스크린샷으로 전/후 비교.

## 리스크

- 넓은 범위의 className 변경 → 테스트가 스타일에 의존하지 않으므로 로직 리스크는 낮음.
- 폰트 CDN 로드 실패 시 폴백(system font)으로 degrade — 치명적이지 않음.
- 한 번에 많이 바뀌므로, 적용 후 스크린샷 확인하며 미세조정 필요.
