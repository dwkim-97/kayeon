// 주선자 이름을 결정론적으로 색에 매핑한다. 같은 이름은 항상 같은 색.
// 색상환(hue)을 고르게 도는 12색 — 인접 항목끼리도 hue가 크게 벌어져 서로
// 헷갈리지 않는다. 각 항목은 옅은 배경 + 진한 텍스트 대비 쌍(가독성 확보).
export type AuthorColor = {bg: string; text: string};

export const AUTHOR_COLORS: AuthorColor[] = [
  {bg: '#ffe0e5', text: '#9f1239'}, // rose (0°)
  {bg: '#dcfce7', text: '#166534'}, // green (140°)
  {bg: '#dbeafe', text: '#1e40af'}, // blue (220°)
  {bg: '#ffedd5', text: '#9a3412'}, // orange (30°)
  {bg: '#e0e7ff', text: '#3730a3'}, // indigo (245°)
  {bg: '#ccfbf1', text: '#115e59'}, // teal (170°)
  {bg: '#fef9c3', text: '#854d0e'}, // yellow (55°)
  {bg: '#f3e8ff', text: '#6b21a8'}, // purple (275°)
  {bg: '#d1fae5', text: '#065f46'}, // emerald (155°)
  {bg: '#fce7f3', text: '#9d174d'}, // pink (330°)
  {bg: '#cffafe', text: '#155e75'}, // cyan (190°)
  {bg: '#ecfccb', text: '#3f6212'}, // lime (85°)
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

// 지정된 주선자는 고정 색을 쓴다. 그 외에는 이름 해시로 팔레트에서 고른다.
const FIXED_AUTHOR_COLORS: Record<string, AuthorColor> = {
  조이: {bg: '#fce7f3', text: '#9d174d'}, // 분홍(pink)
  에드: {bg: '#fef9c3', text: '#854d0e'}, // 노랑(yellow)
  에이든: {bg: '#f3e8ff', text: '#6b21a8'}, // 보라(purple)
};

export function getAuthorColor(name: string): AuthorColor {
  const key = name.trim();
  if (key === '') return AUTHOR_COLORS[0];
  const fixed = FIXED_AUTHOR_COLORS[key];
  if (fixed) return fixed;
  return AUTHOR_COLORS[hashString(key) % AUTHOR_COLORS.length];
}
