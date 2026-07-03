# 외부 매물 등록 API

## 엔드포인트
`POST /api/external/profiles`  (multipart/form-data)

## 인증
헤더 `x-api-key: <EXTERNAL_API_KEY>` (Vercel 환경변수로 설정)

## 필드
- `data` (JSON 문자열, 필수): `gender`(female|male), `birthYear`, `height`, `residence`, `job` 필수.
  `religion`/`mbti`/`hobbies`/`smoking`/`drinking`/`idealType`/`matchmakerComment`/`extra` 선택.
- `photos` (파일, 0~4개): 로컬 이미지 파일.

## 예시 (로컬 사진 첨부)
```bash
curl -X POST https://kayeon.vercel.app/api/external/profiles \
  -H "x-api-key: $EXTERNAL_API_KEY" \
  -F 'data={"gender":"female","birthYear":1996,"height":163,"residence":"수지","job":"회사원"}' \
  -F "photos=@/path/to/photo1.jpg" \
  -F "photos=@/path/to/photo2.jpg"
```

## 동작
등록 대기(`pending_profiles`)에 저장됨. 관리자가 웹 `/pending` 페이지에서 **승인**해야 실제 매물(`profiles`)로 전환된다. 거절 시 대기 데이터와 사진이 삭제된다.

## 제한
- Vercel 서버리스 요청 바디 기본 4.5MB. 사진 여러 장이 크면 초과할 수 있음.
- 사진 최대 4장.

## 준비물 (배포 전)
1. Supabase SQL Editor에서 `supabase/migrations/20260703000000_pending_profiles.sql` 실행 (테이블 생성).
2. Vercel 환경변수에 `EXTERNAL_API_KEY` 설정.
