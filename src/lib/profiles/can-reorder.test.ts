import {describe, expect, it} from 'vitest';
import {canReorderProfiles} from './can-reorder';
import type {ProfileFilters} from '@/types/profile';

const base: ProfileFilters = {
  gender: 'female',
  birthYearValue: '',
  birthYearComparison: 'gte',
  heightValue: '',
  heightComparison: 'gte',
  activeOnly: false,
  religion: '',
  smoking: '',
  query: '',
  sortField: 'default',
  sortDirection: 'desc',
};

describe('canReorderProfiles', () => {
  it('기본 필터 상태에서는 true', () => {
    expect(canReorderProfiles(base)).toBe(true);
  });

  it('sortField가 age이면 false', () => {
    expect(canReorderProfiles({...base, sortField: 'age'})).toBe(false);
  });

  it('sortField가 height이면 false', () => {
    expect(canReorderProfiles({...base, sortField: 'height'})).toBe(false);
  });

  it('sortField가 createdAt이면 false', () => {
    expect(canReorderProfiles({...base, sortField: 'createdAt'})).toBe(false);
  });

  it('query가 비어있지 않으면 false', () => {
    expect(canReorderProfiles({...base, query: '이름'})).toBe(false);
  });

  it('query가 공백만 있으면 true (trim 처리)', () => {
    expect(canReorderProfiles({...base, query: '   '})).toBe(true);
  });

  it('birthYearValue가 설정되면 false', () => {
    expect(canReorderProfiles({...base, birthYearValue: '1990'})).toBe(false);
  });

  it('heightValue가 설정되면 false', () => {
    expect(canReorderProfiles({...base, heightValue: '165'})).toBe(false);
  });

  it('religion이 설정되면 false', () => {
    expect(canReorderProfiles({...base, religion: 'christian'})).toBe(false);
  });

  it('smoking이 설정되면 false', () => {
    expect(canReorderProfiles({...base, smoking: 'non_smoker'})).toBe(false);
  });

  it('activeOnly가 true이면 false', () => {
    expect(canReorderProfiles({...base, activeOnly: true})).toBe(false);
  });
});
