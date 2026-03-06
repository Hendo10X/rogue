import { getUSDtoNGNRate } from "./currency";

export async function formatPriceInNaira(priceUsd: string | number): Promise<string> {
  const num = typeof priceUsd === "string" ? parseFloat(priceUsd) : priceUsd;
  const rate = await getUSDtoNGNRate();
  const ngn = Math.round(num * rate);
  return ngn.toLocaleString("en-NG");
}

export async function formatPriceWithCurrency(
  price: string | number,
  currency: string = "USD"
): Promise<string> {
  if (currency === "NGN") {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return `₦${Math.round(num).toLocaleString("en-NG")}`;
  }
  return `₦${await formatPriceInNaira(price)}`;
}
