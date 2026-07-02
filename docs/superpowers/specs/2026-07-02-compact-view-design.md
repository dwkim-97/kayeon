# 대시보드 뷰 전환: 상세보기 / 작게보기

작성일: 2026-07-02

## 목표

대시보드 매물 목록에 두 가지 보기 모드를 제공한다.

- **상세보기 (detailed)**: 현재 화면 그대로. 큰 사진(4:5) + 전체 정보표.
- **작게보기 (compact)**: 사진과 정보를 압축한 작은 카드 그리드. 한 화면에 더 많은 매물이 들어오게 한다.

기능(별/집착매물, 상태 토글, 수정·삭제, 선택 체크박스, 사진 슬라이더)은 두 모드가 동일하다. 차이는 **크기와 정보 밀도**뿐이다.

## 비목표 (YAGNI)

- 가로형 리스트/테이블 뷰, 사진 전용 뷰는 만들지 않는다 (작은 카드 그리드만).
- DB·API·타입 변경 없음. 순수 프론트엔드 작업이다.
- 서버 저장(사용자별 뷰 설정 영속화)은 하지 않는다. localStorage로 충분.

## 접근 방식

`ProfileCard`에 `variant: 'detailed' | 'compact'` prop을 추가한다. 별도 컴포넌트를 신설하지 않는다 — 두 뷰가 기능 로직(별/상태/삭제/선택/사진슬라이더)을 100% 공유하므로, 분리하면 중복만 늘어난다.

손대는 파일은 `Dashboard.tsx`, `ProfileCard.tsx` 둘뿐이다.

## 설계

### 1. 뷰 상태 & 전환 토글 (Dashboard.tsx)

- `viewMode: 'detailed' | 'compact'` state 추가.
- 초기값(기본값)은 `'compact'`(SSR/hydration 안전). 저장된 이력이 없으면 작게보기로 시작한다. mount 후 `useEffect`에서 `localStorage.getItem('kayeon_view_mode')`를 읽어 저장된 선호가 있으면 반영.
- 변경 시 `localStorage`에 저장 → 새로고침해도 유지.
- 전환 토글: 상단 툴바(성별 토글 줄)의 우측, "필터" 버튼 옆에 세그먼트 버튼 2개.
  - 상세보기 = `LayoutGrid` 아이콘, 작게보기 = `Grid3x3` 아이콘 (lucide-react).
  - 활성 버튼은 보라 배경(`--violet-600`), 비활성은 흰 배경.

### 2. 작게보기 카드 (ProfileCard.tsx)

`variant` prop으로 분기. 기존 호출부는 `variant="detailed"`(기본값)로 동작 유지.

`compact`일 때:
- 사진 영역 aspect `4/5` → `1/1`(정사각).
- 정보: 라벨 나눈 행 대신 **한 줄 요약** — `년생 / 키 / 사는 곳 / 회사`를 ` / `로 이어붙임(빈 값 제외). detailed는 기존 라벨 행 방식 유지.
- 별 버튼·상태 토글·수정/삭제 버튼·선택 체크박스: 모두 유지, compact에서 크기 축소(체크박스 h-8/w-8, 상태토글 h-6/w-11 등).
- 등록자 뱃지, 집착매물 뱃지, 사진 카운터: 유지(폰트·패딩 축소).
- 사진 슬라이더 화살표: compact에서 크기 축소, 배경 투명도 상향(`bg-white/85` → `bg-white/65`, 양쪽 뷰 공통).

### 3. 그리드 밀도 (Dashboard.tsx)

- 상세보기: 현행 `grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5`.
- 작게보기: `grid-cols-[repeat(auto-fill,minmax(min(50%,160px),1fr))] gap-3` — 모바일 2열, PC 5~6열.

## 테스트 / 검증

- `ProfileCard.test.tsx`: compact variant 렌더 케이스 추가 (정보 줄이 detailed보다 적게 노출되는지, 기능 버튼은 그대로인지).
- 로컬 dev 서버(`localhost:3100`)에서 실제 토글 동작 + localStorage 유지 확인.
- `pnpm test`, `pnpm lint` 통과.

## 리스크

- 낮음. 순수 UI 변경이며 DB/API/타입 불변. 기존 기능 로직은 그대로 재사용.
- hydration 주의: localStorage 읽기는 mount 후에만(첫 렌더는 기본값).
