import { useEffect } from 'react';

const router = {
  push(route: string) {
    window.dispatchEvent(new CustomEvent('investment-qa:route', { detail: route }));
  },
  setParams() {},
};

export function useRouter() {
  return router;
}

export function useFocusEffect(effect: () => void | (() => void)) {
  useEffect(effect, [effect]);
}
