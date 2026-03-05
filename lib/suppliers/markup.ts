const MARKUP_PERCENT = 15; // 15% markup on supplier price

export function applyMarkup(supplierPrice: number): number {
  return Math.round(supplierPrice * (1 + MARKUP_PERCENT / 100) * 100) / 100;
}

export function applyMarkupToString(supplierPriceStr: string): string {
  const n = parseFloat(supplierPriceStr);
  if (!Number.isFinite(n)) return "0";
  return applyMarkup(n).toFixed(2);
}
