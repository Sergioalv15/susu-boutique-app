import { Fragment, ReactNode, useEffect } from 'react';

const router = {
  push(route: string) {
    window.dispatchEvent(new CustomEvent('calendar-qa:route', { detail: route }));
  },
  setParams() {},
};

export function Link({ children }: { children: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}

export function useRouter() {
  return router;
}

export function useLocalSearchParams() {
  return {};
}

export function useFocusEffect(effect: () => void | (() => void)) {
  useEffect(effect, [effect]);
}
