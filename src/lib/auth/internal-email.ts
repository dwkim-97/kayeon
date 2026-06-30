const LOGIN_ID_PATTERN = /^[a-z0-9._-]{3,32}$/;
const INTERNAL_AUTH_EMAIL_DOMAIN = 'kayeon.internal';

export const invalidLoginIdMessage = '아이디는 3~32자의 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.';

export function normalizeLoginId(loginId: string) {
  const normalized = loginId.trim().toLowerCase();

  if (!LOGIN_ID_PATTERN.test(normalized)) {
    throw new Error(invalidLoginIdMessage);
  }

  return normalized;
}

export function buildInternalAuthEmail(loginId: string) {
  return `${normalizeLoginId(loginId)}@${INTERNAL_AUTH_EMAIL_DOMAIN}`;
}
