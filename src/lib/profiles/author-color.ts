// 주선자 이름을 결정론적으로 색에 매핑한다. 같은 이름은 항상 같은 색.
// 브랜드 핑크와 어울리는 부드러운 파스텔 팔레트 (배경 + 텍스트 대비 쌍).
export type AuthorColor = {bg: string; text: string};

const AUTHOR_COLORS: AuthorColor[] = [
  {bg: '#ffe0e5', text: '#9f1239'}, // rose
  {bg: '#ffedd5', text: '#9a3412'}, // orange
  {bg: '#fef3c7', text: '#92400e'}, // amber
  {bg: '#dcfce7', text: '#166534'}, // green
  {bg: '#cffafe', text: '#155e75'}, // cyan
  {bg: '#dbeafe', text: '#1e40af'}, // blue
  {bg: '#ede9fe', text: '#5b21b6'}, // violet
  {bg: '#fce7f3', text: '#9d174d'}, // pink
];

// 문자열을 안정적인 양수 해시로 변환.
// djb2로 누적한 뒤 finalizer(비트 확산)를 거친다 — 이 과정이 없으면 한글처럼
// charCode가 큰 입력에서 하위 비트가 안 섞여 mod N 결과가 한쪽으로 몰린다.
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  // xorshift 기반 finalizer로 하위 비트까지 골고루 섞는다.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function getAuthorColor(name: string): AuthorColor {
  const key = name.trim();
  if (key === '') return AUTHOR_COLORS[0];
  return AUTHOR_COLORS[hashString(key) % AUTHOR_COLORS.length];
}
