"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { convertFromNgn, formatMoney } from "@/lib/currency";

interface CurrencyContextValue {
  currency: string;
  rates: Record<string, number>;
  setCurrency: (code: string) => void;
  /** Convert an NGN amount into the active currency (number). */
  convert: (ngn: number) => number;
  /** Convert an NGN amount and format it with the active currency symbol. */
  format: (ngn: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const CURRENCY_COOKIE = "rogue_currency";

export function CurrencyProvider({
  initialCurrency,
  rates,
  children,
}: {
  initialCurrency: string;
  rates: Record<string, number>;
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState(initialCurrency);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    if (typeof document !== "undefined") {
      document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      rates,
      setCurrency,
      convert: (ngn: number) => convertFromNgn(ngn, currency, rates),
      format: (ngn: number) =>
        formatMoney(convertFromNgn(ngn, currency, rates), currency),
    }),
    [currency, rates, setCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Access the active display currency. Falls back to plain NGN formatting when
 * used outside a provider (e.g. the admin area), so it never throws.
 */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  return {
    currency: "NGN",
    rates: {},
    setCurrency: () => {},
    convert: (ngn: number) => ngn,
    format: (ngn: number) => `₦${Math.round(ngn).toLocaleString("en-NG")}`,
  };
}

/** Render an NGN-denominated amount in the active display currency. */
export function Price({ ngn }: { ngn: number | string }) {
  const { format } = useCurrency();
  const n = typeof ngn === "string" ? parseFloat(ngn) : ngn;
  return <>{format(Number.isFinite(n) ? n : 0)}</>;
}
