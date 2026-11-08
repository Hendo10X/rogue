import { NextResponse } from "next/server";

/**
 * What a shared order function returns, so the website routes and the
 * Telegram bot charge customers through exactly the same code.
 */
export type OrderResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; extra?: Record<string, unknown> };

export const fail = (status: number, error: string, extra?: Record<string, unknown>) =>
  ({ ok: false, status, error, extra }) as const;

/** The website's JSON answer for an order result (unchanged shape from before). */
export function toResponse<T>(r: OrderResult<T>): NextResponse {
  return r.ok ? NextResponse.json(r.data) : NextResponse.json({ error: r.error, ...r.extra }, { status: r.status });
}
