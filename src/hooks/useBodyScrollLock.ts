import {useEffect} from 'react';

let activeLockCount = 0;
let originalOverflow = '';

export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    if (activeLockCount === 0) {
      originalOverflow = document.body.style.overflow;
    }
    activeLockCount += 1;
    document.body.style.overflow = 'hidden';

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [enabled]);
}
