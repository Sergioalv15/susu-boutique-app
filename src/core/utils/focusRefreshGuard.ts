export function createFocusRefreshGuard(): () => boolean {
  let isFirstFocus = true;

  return () => {
    if (isFirstFocus) {
      isFirstFocus = false;
      return false;
    }

    return true;
  };
}