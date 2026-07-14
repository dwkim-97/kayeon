import type {PostgrestError} from '@supabase/supabase-js';

// 관리자 전용 신규 컬럼들. 아직 DB에 적용되지 않은 환경에서는
// insert/update가 실패할 수 있으므로, 실패 시 이 컬럼들을 제거하고 재시도한다.
// (기존 admin_memo 패턴과 동일한 취지 — SQL 실행 전에도 등록/수정이 깨지지 않게)
export const ADMIN_ONLY_DB_COLUMNS = ['probe', 'rejection_tolerance', 'response_speed', 'reward', 'manual_order_weight'] as const;

// PostgREST/Postgres가 "그런 컬럼 없음"을 알리는 신호인지 판별.
//  - 42703: undefined_column (Postgres)
//  - PGRST204: schema cache에서 컬럼을 찾지 못함 (PostgREST)
export function isMissingColumnError(error: PostgrestError | null): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const haystack = `${error.message} ${error.details ?? ''}`.toLowerCase();
  return (
    ADMIN_ONLY_DB_COLUMNS.some(col => haystack.includes(col)) &&
    (haystack.includes('column') || haystack.includes('schema cache'))
  );
}

type AdminColumn = (typeof ADMIN_ONLY_DB_COLUMNS)[number];

// 주어진 row 객체에서 관리자 전용 컬럼 키를 제거한 새 객체를 반환한다.
// 관리자 컬럼은 Insert/Update 타입에서 optional이므로, 제거해도 원본 타입에 그대로 할당 가능.
export function stripAdminColumns<T extends Record<string, unknown>>(row: T): Omit<T, AdminColumn> {
  const copy = {...row} as Record<string, unknown>;
  for (const col of ADMIN_ONLY_DB_COLUMNS) {
    delete copy[col];
  }
  return copy as Omit<T, AdminColumn>;
}
