# 자연스러운 공유(사진 묶음 + 텍스트) 설계

날짜: 2026-07-08
범위: 대시보드에 신규 공유 버튼 추가 (기존 카카오 공유와 완전 별개)

## 배경 / 목적

기존 공유는 `Kakao.Share.sendCustom`으로 "카드형 공유 메시지"만 보낸다. 사용자는 "사람이 직접 앨범 첨부 + 텍스트 친 것처럼" 사진 묶음 + 정보를 보내고 싶어 한다.

카카오 SDK로는 대신 채팅방에 사진을 넣는 API가 없다(스팸 방지). 브라우저 표준 **Web Share API(`navigator.share({files}))`** 로만 실제 파일(사진) 전송이 가능하다.

### 확정된 제약 (대화로 합의)

- **1명씩만** 공유 (여러 명 묶기 없음)
- **자동 2회 전송·채팅방 자동 지정 불가** — 웹 표준 한계. 텍스트는 클립보드 복사로 대체(C안)
- **모바일 전용 기능** (데스크톱은 파일 공유 미지원 → 폴백)
- `navigator.share`는 **HTTPS + 사용자 제스처**에서만 동작 → 실제 검증은 배포본+폰 필요

## 동작

대시보드에서 매물을 **정확히 1명 선택**했을 때만, 기존 "카카오톡 공유" 버튼 옆에 **"자연스러운 공유"** 버튼을 노출한다. (2명 이상 선택 시 숨김 — 1명 제약과 일치)

버튼 클릭 시:

1. 그 매물의 **정보 텍스트를 클립보드에 복사** (관리자 메모·관리자 전용 항목 제외)
2. 사진 URL들을 `fetch → Blob → File`로 변환
3. **모바일(파일 공유 지원, `navigator.canShare({files})` true)**: `navigator.share({files})`로 사진 묶음 전송. 사용자가 공유시트에서 카톡·채팅방 선택 → 사진 전송 후 채팅방에 텍스트 붙여넣기(1회)
4. **데스크톱(미지원)**: 사진 파일들을 다운로드 + 텍스트는 이미 클립보드에 복사됨 → 수동 첨부

공유 전/후 안내 토스트: "정보가 복사됐어요 — 채팅방에 붙여넣으세요".

## 구성요소

### 1. 텍스트 생성 — `lib/profiles/share-text.ts` (신규, 순수함수)

`buildShareText(profile): string`
- 기존 `getProfileInformationRows(profile)`(주요+추가, 관리자 항목 자연 제외)를 재활용.
- `"라벨: 값"` 줄들을 개행으로 연결. 예:
  ```
  95년생
  나이: 95년생
  키: 168cm
  사는 곳: 서울 강남구
  회사: 카카오 / 판교 / IT
  종교: 무교
  MBTI: ENFJ
  ```
- 첫 줄은 년생(대표 라벨)로 시작해 눈에 띄게. 관리자 메모/떠보기·거절내성·응답속도는 포함하지 않음.

### 2. 공유 실행 — `lib/profiles/native-share.ts` (신규)

- `canNativeShareFiles(): boolean` — `typeof navigator !== 'undefined' && navigator.canShare?.({files: [dummy]})` 형태로 파일 공유 지원 판별.
- `urlsToFiles(urls: string[]): Promise<File[]>` — 각 URL을 `fetch → blob → new File([blob], name, {type})`. 실패한 파일은 건너뛴다.
- `shareProfileNatively({files, text, canShareFiles, fallbackDownload})` 형태로 분기 실행하되, DOM/navigator에 의존하는 부분은 얇게 두고 테스트 가능한 판별 로직을 분리.

### 3. 버튼 — `components/NaturalShareButton.tsx` (신규)

- props: `profile: Profile`.
- 클릭 → 텍스트 복사 + 위 공유/폴백 실행. 진행중 스피너, 완료/실패 토스트(CustomAlert 재활용 또는 간단 메시지).
- 사진이 없으면 텍스트만 복사/공유.

### 4. Dashboard 연결

- 기존 `ShareButton` 옆(좌하단 고정 영역)에 `selectedProfiles.length === 1`일 때만 `NaturalShareButton` 렌더.

## 사진 소스

원본 화질 전송을 위해 **썸네일이 아닌 원본 URL**(`profile.photos[].url`)을 사용한다.

## 범위 밖

- 기존 카카오 공유 로직·템플릿·batch 모달 (그대로 유지)
- 자동 2회 전송, 채팅방 자동 지정 (웹 불가)
- 여러 명 묶어 공유

## 검증

- 단위테스트: `buildShareText`(정보 포함/제외, 관리자 항목 제외, 빈 값 생략), `canNativeShareFiles`·URL→File 판별 로직(navigator/fetch mock).
- `pnpm build` + 기존 vitest 통과.
- **수동(배포 후 폰)**: iOS/Android 카톡에서 사진 묶음 전송 + 붙여넣기 확인. `navigator.share`는 로컬 http·PC dev에서 제한되므로 배포본에서 검증.

## 리스크 / 알아둘 점

- iOS 카톡이 `share({files, text})`의 text를 누락하는 사례가 있어 **text는 항상 클립보드 복사로 보장**(files만 공유).
- 사진 다수를 fetch하므로 약간의 지연 가능 — 진행중 표시로 완화.
- Supabase 공개 버킷이라 CORS/fetch 문제 없음(이미 렌더에 public URL 사용 중).
