const USD_TO_NGN = Number(process.env.NEXT_PUBLIC_USD_TO_NGN) || 1600;

export function formatPriceInNaira(priceUsd: string | number): string {
  const num = typeof priceUsd === "string" ? parseFloat(priceUsd) : priceUsd;
  const ngn = Math.round(num * USD_TO_NGN);
  return ngn.toLocaleString("en-NG");
}

export function formatPriceWithCurrency(priceUsd: string | number): string {
  return `₦${formatPriceInNaira(priceUsd)}`;
}
