export interface InvestmentPurchaseNavigation {
  canGoBack(): boolean;
  back(): void;
  replaceCalendar(): void;
}

export function createInvestmentPurchaseCloseHandler(
  navigation: InvestmentPurchaseNavigation,
): () => void {
  let closed = false;

  return () => {
    if (closed) {
      return;
    }

    closed = true;

    if (navigation.canGoBack()) {
      navigation.back();
      return;
    }

    navigation.replaceCalendar();
  };
}
