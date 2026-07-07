'use client';

import {useEffect, useState} from 'react';

// 오피스 모드 상태를 localStorage에 유지하는 훅.
// on/off와 토글 함수를 반환한다. SSR-safe: 첫 렌더는 항상 off로 시작하고
// 마운트 후 저장된 값을 반영한다(서버 HTML과 불일치로 인한 hydration 경고 방지).
export const OFFICE_MODE_STORAGE_KEY = 'kayeon_office_mode';

export function useOfficeMode(): {officeMode: boolean; toggleOfficeMode: () => void} {
  const [officeMode, setOfficeMode] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.localStorage.getItem(OFFICE_MODE_STORAGE_KEY) === '1') setOfficeMode(true);
  }, []);

  const toggleOfficeMode = () => {
    setOfficeMode(current => {
      const next = !current;
      window.localStorage.setItem(OFFICE_MODE_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return {officeMode, toggleOfficeMode};
}
