
let cachedRate: number | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function getUSDtoNGNRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && (now - lastFetch < CACHE_DURATION)) {
    return cachedRate;
  }

  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      next: { revalidate: 3600 } // Next.js fetch cache if applicable
    });
    if (!res.ok) throw new Error("Failed to fetch exchange rate");
    const data = await res.json();
    const rate = data.rates?.NGN;
    if (typeof rate !== "number") throw new Error("Invalid rate data");

    cachedRate = rate;
    lastFetch = now;
    return rate;
  } catch (error) {
    console.error("Error fetching USD to NGN rate:", error);
    // Fallback to a sensible default if API fails
    const fallback = (cachedRate ?? Number(process.env.NEXT_PUBLIC_USD_TO_NGN)) || 1600;
    cachedRate = fallback; // Ensure cachedRate is at least the fallback for sync usage
    return fallback;
  }
}

export function getCachedRate(): number {
  return cachedRate || Number(process.env.NEXT_PUBLIC_USD_TO_NGN) || 1600;
}
