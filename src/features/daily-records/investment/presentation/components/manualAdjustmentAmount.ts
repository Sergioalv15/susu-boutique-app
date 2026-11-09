export function parseManualCapitalAddition(value: string): number | null {
  const amount = Number(value.trim().replace(',', '.'));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
