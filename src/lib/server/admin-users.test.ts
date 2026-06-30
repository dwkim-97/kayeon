import {describe, expect, it} from 'vitest';

import {prepareManagedUserCreateInput} from './admin-users';

describe('prepareManagedUserCreateInput', () => {
  it('keeps the user-facing id separate from the internal Supabase Auth email', () => {
    const result = prepareManagedUserCreateInput({
      loginId: ' AIDEN_97 ',
      password: 'strong-password',
      recommenderName: ' 초기 관리자 ',
      phoneNumber: ' 010-0000-0000 ',
    });

    expect(result).toEqual({
      success: true,
      value: {
        loginId: 'aiden_97',
        authEmail: 'aiden_97@kayeon.internal',
        password: 'strong-password',
        recommenderName: '초기 관리자',
        phoneNumber: '010-0000-0000',
      },
    });
  });

  it('returns a Korean validation message for invalid admin input', () => {
    expect(
      prepareManagedUserCreateInput({
        loginId: 'ai',
        password: 'strong-password',
        recommenderName: '초기 관리자',
        phoneNumber: '010-0000-0000',
      }),
    ).toEqual({
      success: false,
      message: '아이디는 3~32자의 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.',
    });
  });
});
