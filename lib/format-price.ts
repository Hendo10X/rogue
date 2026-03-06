import { getCachedRate } from "./currency";

export function formatNaira(priceUsd: string | number): string {
  const num = typeof priceUsd === "string" ? parseFloat(priceUsd) : priceUsd;
  const rate = getCachedRate();
  const ngn = Math.round(num * rate);
  return `₦${ngn.toLocaleString("en-NG")}`;
}

export function formatPriceWithCurrency(
  price: string | number,
  currency: string = "USD"
): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (currency === "NGN") {
    return `₦${Math.round(num).toLocaleString("en-NG")}`;
  }
  // If price is in USD/USDT, convert to Naira for unified display
  return formatNaira(num);
}
