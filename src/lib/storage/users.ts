import type {ManagedUser} from '@/types/user';

const STORAGE_KEY = 'kayeon_users_v1';
const timestamp = '2026-06-30T06:00:00.000Z';

const defaultUsers: ManagedUser[] = [
  {
    id: 'user-aiden',
    name: 'Aiden',
    loginId: 'aiden',
    recommenderName: '초기 관리자',
    phoneNumber: '010-0000-0000',
    createdAt: timestamp,
  },
];

export function loadUsers() {
  if (typeof window === 'undefined') {
    return defaultUsers;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return defaultUsers;
  }

  try {
    return JSON.parse(stored) as ManagedUser[];
  } catch {
    return defaultUsers;
  }
}

export function saveUsers(users: ManagedUser[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}
