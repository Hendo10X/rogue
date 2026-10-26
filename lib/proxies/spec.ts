import { IPV6_PROTOCOLS, isProxyType, type ProxySpec } from "./provider";
import { MAX_PROXIES_PER_ORDER } from "./settings";

/** A customer's proxy choice from a request body, or null if it's incomplete. */
export function parseProxySpec(body: unknown): ProxySpec | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const type = b.type ?? "ipv4";
  const quantity = Number(b.quantity);
  if (!isProxyType(type) || typeof b.country !== "string" || !b.country || typeof b.period !== "string" || !b.period) return null;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PROXIES_PER_ORDER) return null;
  const spec: ProxySpec = { type, country: b.country, period: b.period, quantity };
  if (type === "mobile") {
    if (typeof b.operator !== "string" || !b.operator) return null;
    const rotation = Number(b.rotation ?? 0);
    if (!Number.isInteger(rotation) || rotation < 0) return null;
    spec.operator = b.operator;
    spec.rotation = rotation;
  }
  if (type === "ipv6") {
    const p = String(b.protocol);
    spec.protocol = (IPV6_PROTOCOLS as readonly string[]).includes(p) ? (p as ProxySpec["protocol"]) : "HTTPS";
  }
  return spec;
}
