import {createHash, timingSafeEqual} from 'node:crypto';

import type {ManagedUser} from '@/types/user';

type StoredManagedUser = ManagedUser & {
  passwordHash: string;
};

export type CreateManagedUserInput = {
  name: string;
  loginId: string;
  password: string;
  recommenderName: string;
  phoneNumber: string;
};

export type UserMutationResult =
  | {
      success: true;
      user: ManagedUser;
    }
  | {
      success: false;
      message: string;
    };

declare global {
  var kayeonManagedUsers: StoredManagedUser[] | undefined;
}

const timestamp = '2026-06-30T06:00:00.000Z';

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function getInitialPassword() {
  return process.env.KAYEON_ADMIN_PASSWORD || process.env.KAYEON_ACCESS_PASSWORD || 'kayeon-dev';
}

function getStore() {
  if (!globalThis.kayeonManagedUsers) {
    globalThis.kayeonManagedUsers = [
      {
        id: 'user-aiden',
        name: 'Aiden',
        loginId: 'aiden',
        recommenderName: '초기 관리자',
        phoneNumber: '010-0000-0000',
        passwordHash: hashPassword(getInitialPassword()),
        createdAt: timestamp,
      },
    ];
  }

  return globalThis.kayeonManagedUsers;
}

function toManagedUser(user: StoredManagedUser): ManagedUser {
  return {
    id: user.id,
    name: user.name,
    loginId: user.loginId,
    recommenderName: user.recommenderName,
    phoneNumber: user.phoneNumber,
    createdAt: user.createdAt,
  };
}

export function listManagedUsers() {
  return getStore().map(toManagedUser);
}

export function createManagedUser(input: CreateManagedUserInput): UserMutationResult {
  const name = input.name.trim();
  const loginId = input.loginId.trim();
  const password = input.password.trim();
  const recommenderName = input.recommenderName.trim();
  const phoneNumber = input.phoneNumber.trim();

  if (!name || !loginId || !password || !recommenderName || !phoneNumber) {
    return {
      success: false,
      message: '필수 값을 모두 입력해 주세요.',
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      message: '비밀번호는 8자 이상으로 입력해 주세요.',
    };
  }

  const store = getStore();
  const hasSameLoginId = store.some(user => user.loginId.toLowerCase() === loginId.toLowerCase());

  if (hasSameLoginId) {
    return {
      success: false,
      message: '이미 사용 중인 아이디입니다.',
    };
  }

  const user: StoredManagedUser = {
    id: crypto.randomUUID(),
    name,
    loginId,
    recommenderName,
    phoneNumber,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  store.unshift(user);

  return {
    success: true,
    user: toManagedUser(user),
  };
}

export function removeManagedUser(userId: string): UserMutationResult {
  const store = getStore();

  if (store.length <= 1) {
    return {
      success: false,
      message: '마지막 관리자는 제거할 수 없습니다.',
    };
  }

  const userIndex = store.findIndex(user => user.id === userId);

  if (userIndex < 0) {
    return {
      success: false,
      message: '관리자를 찾을 수 없습니다.',
    };
  }

  const [removedUser] = store.splice(userIndex, 1);

  return {
    success: true,
    user: toManagedUser(removedUser),
  };
}

export function isValidManagedUserCredential(loginId: string, password: string) {
  const normalizedLoginId = loginId.trim().toLowerCase();
  const user = getStore().find(currentUser => currentUser.loginId.toLowerCase() === normalizedLoginId);

  if (!user) {
    return false;
  }

  const expected = Buffer.from(user.passwordHash);
  const actual = Buffer.from(hashPassword(password.trim()));

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
