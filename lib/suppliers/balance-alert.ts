import { db } from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { getSetting, setSetting } from "@/lib/admin-auth";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { fetchSupplierBalance } from "./adapter";
import { getUSDtoNGNRate } from "@/lib/currency";

/**
 * Supplier low-balance alerting.
 *
 * Every purchase is fulfilled by spending the prepaid balance we hold with a
 * supplier. When that runs out the supplier rejects every order ("Insufficient
 * balance") while our storefront still shows everything in stock — customers
 * see failures, the admin sees nothing wrong. Two layers stop that:
 *
 *  1. Proactive: on each scheduled sync, read every active supplier's balance
 *     and alert when it drops below the configured threshold.
 *  2. Reactive: the moment a supplier rejects a purchase for insufficient
 *     balance, alert immediately — works even if the balance endpoint can't be
 *     read.
 *
 * Alerts go to the admin's Telegram, same as order notifications, and are
 * rate-limited per supplier so a low balance doesn't spam every 10 minutes.
 */

const DEFAULT_THRESHOLD = 30000;
const PROACTIVE_COOLDOWN_MS = 6 * 60 * 60 * 1000; // re-alert at most every 6h while low
const REACTIVE_COOLDOWN_MS = 60 * 60 * 1000; // at most hourly for repeated rejections

/** Balance (in the supplier's units) below which the admin is alerted. */
export async function getLowBalanceThreshold(): Promise<number> {
  const raw = await getSetting("supplier_low_balance_threshold");
  const n = raw != null ? parseFloat(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_THRESHOLD;
}

async function recentlyAlerted(key: string, cooldownMs: number): Promise<boolean> {
  const last = await getSetting(key);
  const t = last ? Date.parse(last) : NaN;
  return Number.isFinite(t) && Date.now() - t < cooldownMs;
}

function fmt(n: number): string {
  return n.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

/**
 * Which currency each supplier reports its balance in. The threshold is set in
 * Naira, so USD balances are converted before comparing — otherwise "$100"
 * (plenty) reads as 100 < 30,000 and alerts forever. Keyed by supplier slug;
 * anything not listed is treated as Naira.
 */
const SUPPLIER_BALANCE_CURRENCY: Record<string, "USD" | "NGN"> = {
  shopviaclone: "USD",
};

function balanceLabel(balance: number, currency: "USD" | "NGN", ngn: number): string {
  return currency === "USD" ? `$${fmt(balance)} (≈ ₦${fmt(ngn)})` : `₦${fmt(balance)}`;
}

export interface SupplierBalanceStatus {
  supplierId: string;
  name: string;
  balance: number | null;
  /** Currency the supplier reports in; the threshold is always in Naira. */
  currency: "USD" | "NGN";
  /** Balance converted to Naira for the threshold comparison. */
  balanceNgn: number | null;
  /** Only set when the balance couldn't be read: the response shape (keys, no values). */
  shape?: string;
  threshold: number;
  low: boolean;
  alerted: boolean;
}

/**
 * Read every active API supplier's balance and alert on any below threshold.
 * Never throws — a supplier that can't be read just reports balance: null.
 */
export async function checkSupplierBalances(): Promise<SupplierBalanceStatus[]> {
  const [threshold, rate] = await Promise.all([getLowBalanceThreshold(), getUSDtoNGNRate()]);
  const suppliers = await db.select().from(supplier);
  const out: SupplierBalanceStatus[] = [];

  for (const sup of suppliers) {
    const isApi =
      sup.status === "active" && !!sup.apiUrl && !!sup.apiKey && !sup.apiUrl.startsWith("manual");
    if (!isApi) continue;

    const { balance, shape } = await fetchSupplierBalance({ baseUrl: sup.apiUrl!, apiKey: sup.apiKey! });
    const currency = SUPPLIER_BALANCE_CURRENCY[sup.slug] ?? "NGN";
    const balanceNgn = balance == null ? null : currency === "USD" ? balance * rate : balance;
    const low = balanceNgn != null && balanceNgn < threshold;
    let alerted = false;

    if (low) {
      const key = `supplier_alert_low:${sup.id}`;
      if (!(await recentlyAlerted(key, PROACTIVE_COOLDOWN_MS))) {
        const r = await sendTelegramMessage(
          [
            `⚠️ <b>Supplier balance low — ${escapeHtml(sup.name)}</b>`,
            ``,
            `<b>Balance:</b> ${escapeHtml(balanceLabel(balance!, currency, balanceNgn!))}`,
            `<b>Alert threshold:</b> ₦${escapeHtml(fmt(threshold))}`,
            ``,
            `Orders will start failing with "Insufficient balance" once this runs out. Top up the ${escapeHtml(sup.name)} account.`,
          ].join("\n"),
        );
        alerted = !!r?.success;
        if (alerted) await setSetting(key, new Date().toISOString());
      }
    }

    out.push({
      supplierId: sup.id,
      name: sup.name,
      balance,
      currency,
      balanceNgn: balanceNgn == null ? null : Math.round(balanceNgn),
      ...(shape ? { shape } : {}),
      threshold,
      low,
      alerted,
    });
  }
  return out;
}

/**
 * Reactive alert: call when a supplier has just rejected a purchase for
 * insufficient balance. Best-effort and rate-limited; never throws.
 */
export async function alertSupplierInsufficientBalance(args: {
  supplierId: string;
  supplierName: string;
  detail: string;
}): Promise<void> {
  try {
    const key = `supplier_alert_reject:${args.supplierId}`;
    if (await recentlyAlerted(key, REACTIVE_COOLDOWN_MS)) return;
    const r = await sendTelegramMessage(
      [
        `🚨 <b>Orders failing — ${escapeHtml(args.supplierName)} balance is empty</b>`,
        ``,
        `The supplier just rejected a purchase:`,
        `<i>${escapeHtml(args.detail.slice(0, 200))}</i>`,
        ``,
        `Every order from this supplier will fail until the account is topped up. Customers are being auto-refunded meanwhile.`,
      ].join("\n"),
    );
    if (r?.success) await setSetting(key, new Date().toISOString());
  } catch {
    /* alerting must never break a purchase path */
  }
}

/** True when a supplier error message means "no money left with them". */
export function isInsufficientBalanceError(message: string): boolean {
  return /insufficient\s+balance|not\s+enough\s+balance|top\s*up/i.test(message);
}

