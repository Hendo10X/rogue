const DEFAULT_MARKUP_PERCENT = 15;

export function applyMarkup(
  supplierPrice: number,
  percent: number = DEFAULT_MARKUP_PERCENT
): number {
  return Math.round(supplierPrice * (1 + percent / 100) * 100) / 100;
}

export function applyMarkupToString(
  supplierPriceStr: string,
  percent: number = DEFAULT_MARKUP_PERCENT
): string {
  const n = parseFloat(supplierPriceStr);
  if (!Number.isFinite(n)) return "0";
  return applyMarkup(n, percent).toFixed(2);
}
