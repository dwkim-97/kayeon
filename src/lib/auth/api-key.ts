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
