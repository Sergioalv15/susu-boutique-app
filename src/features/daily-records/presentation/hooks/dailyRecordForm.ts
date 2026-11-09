export function formatProfitPercentForForm(profitPercent: number): string {
  if (!Number.isFinite(profitPercent)) {
    return '';
  }

  return (profitPercent * 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
