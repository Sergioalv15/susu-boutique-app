export function buildDayRouteFromIso(iso: string): `/day/${string}` {
  return `/day/${iso}`;
}

export function buildInvestmentPurchaseRouteFromIso(
  iso: string,
): `/investment/purchase?date=${string}` {
  return `/investment/purchase?date=${iso}`;
}
