/**
 * Legacy 5sim.net support, only so numbers bought before the switch to
 * GrizzlySMS + SMSPool can still get their code, be cancelled and refunded.
 * Nothing new is bought from 5sim. Numbers wait at most 20 minutes, so this
 * file can go once FIVESIM_API_KEY is removed (any 5sim number left waiting
 * then is refunded by the normal timeout).
 */
import { codeFrom, OtpProviderError, type OtpCheck } from "./types";

const BASE = "https://5sim.net/v1";

export function fivesimConfigured(): boolean {
  return !!process.env.FIVESIM_API_KEY?.trim();
}

async function call<T>(path: string): Promise<T> {
  const key = process.env.FIVESIM_API_KEY?.trim();
  if (!key) throw new OtpProviderError("5sim isn't configured any more");
  const res = await fetch(`${BASE}/${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  }).catch((err) => {
    throw new OtpProviderError(`5sim unreachable (${err instanceof Error ? err.name : "network"})`);
  });
  const text = await res.text();
  try {
    if (res.ok) return JSON.parse(text) as T;
  } catch {
    // plain-text error
  }
  throw new OtpProviderError(text.trim().slice(0, 200) || `5sim error (HTTP ${res.status})`);
}

export async function fivesimCheck(numberId: string): Promise<OtpCheck> {
  const data = await call<{ status?: string; sms?: { text?: string; code?: string }[] }>(`user/check/${encodeURIComponent(numberId)}`);
  const last = Array.isArray(data?.sms) && data.sms.length ? data.sms[data.sms.length - 1] : null;
  const sms = last?.text?.trim() || null;
  const code = last?.code?.trim() || codeFrom(sms);
  const status = String(data?.status ?? "PENDING").toUpperCase();
  if (sms || code) return { status: "RECEIVED", code, sms };
  if (["CANCELED", "TIMEOUT", "BANNED"].includes(status)) return { status: "CANCELED", code: null, sms: null };
  return { status: "PENDING", code: null, sms: null };
}

export async function fivesimCancel(numberId: string): Promise<void> {
  await call<unknown>(`user/cancel/${encodeURIComponent(numberId)}`);
}

export async function fivesimFinish(numberId: string): Promise<void> {
  await call<unknown>(`user/finish/${encodeURIComponent(numberId)}`).catch(() => {});
}
