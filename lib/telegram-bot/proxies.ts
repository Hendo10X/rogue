import { isUserSuspended, SUSPENDED_MESSAGE } from "@/lib/suspension";
import { getCatalog, MAX_PROXIES_PER_ORDER, proxiesOnSale } from "@/lib/proxies/settings";
import { IPV6_PROTOCOLS, PROXY_TYPES, type ProxyCatalog, type ProxyType } from "@/lib/proxies/provider";
import { parseProxySpec } from "@/lib/proxies/spec";
import { placeProxyOrder, quoteProxyNgn } from "@/lib/proxies/place-order";
import { asType, credentialLines, getProxyOrders, PROXY_TYPE_LABEL } from "@/lib/proxies/orders";
import { esc, send } from "./api";
import { claimPurchase, setPending, type Pending, type ProxyDraft } from "./accounts";
import { balanceOf, fits, MENU_BUTTON, MENU_ROW, naira, pager, pairs, sendBlocks, shortOf, type Ctx, type Out } from "./ui";

/**
 * Proxies: type → country → period → (mobile: operator, rotation · IPv6:
 * protocol) → quantity → price → buy. The choice so far is kept in the
 * account's pending state, so buttons stay short.
 */

const TYPE_NOTE: Record<ProxyType, string> = {
  ipv4: "fast datacenter IPs",
  isp: "residential-grade static IPs",
  ipv6: "cheap, for sites that support IPv6",
  mobile: "real mobile carrier IPs",
};
const PROXY_ROW = [{ text: "🌐 All proxy types", callback_data: "px" }];

async function notOnSale(out: Out) {
  if (await proxiesOnSale()) return false;
  await out("Proxies aren't available right now. Please check back soon.", MENU_BUTTON);
  return true;
}

export async function showProxyTypes(out: Out) {
  if (await notOnSale(out)) return;
  return out("🌐 <b>Proxies</b>\nWhich kind?", [
    ...PROXY_TYPES.map((t) => [{ text: `${PROXY_TYPE_LABEL[t]} · ${TYPE_NOTE[t]}`, callback_data: `pt:${t}` }]),
    MENU_ROW,
  ]);
}

async function draftOf(ctx: Ctx, pending: Pending): Promise<ProxyDraft | null> {
  if (pending?.kind === "proxy") return pending.spec;
  await showProxyTypes(ctx.out);
  return null;
}

async function save(ctx: Ctx, spec: ProxyDraft) {
  await setPending(ctx.account.telegramId, { kind: "proxy", spec });
}

/** Moves to whichever step is missing next. */
export async function nextProxyStep(ctx: Ctx, spec: ProxyDraft, page = 0): Promise<unknown> {
  if (await notOnSale(ctx.out)) return;
  let catalog: ProxyCatalog;
  try {
    catalog = await getCatalog(spec.type);
  } catch {
    return ctx.out("We couldn't load proxy options right now. Please try again.", [PROXY_ROW, MENU_ROW]);
  }
  const label = PROXY_TYPE_LABEL[spec.type];

  if (!spec.country) {
    const per = 12;
    const list = catalog.countries.filter((c) => fits(`pco:${c.id}`));
    return ctx.out(`🌐 <b>${label} proxies</b>\nPick a country:`, [
      ...pairs(list.slice(page * per, page * per + per).map((c) => ({ text: c.name.slice(0, 28), callback_data: `pco:${c.id}` }))),
      ...pager(page, list.length > (page + 1) * per, (p) => `pcp:${p}`),
      PROXY_ROW,
      MENU_ROW,
    ]);
  }
  const countryName = catalog.countries.find((c) => c.id === spec.country)?.name ?? spec.country;

  if (!spec.period) {
    return ctx.out(`🌐 <b>${label}</b> · ${esc(countryName)}\nFor how long?`, [
      ...pairs(catalog.periods.filter((p) => fits(`ppe:${p.id}`)).map((p) => ({ text: p.name, callback_data: `ppe:${p.id}` }))),
      PROXY_ROW,
      MENU_ROW,
    ]);
  }

  if (spec.type === "mobile") {
    const operators = catalog.operators?.[spec.country] ?? [];
    if (!spec.operator) {
      if (!operators.length) return ctx.out(`No mobile operators in ${esc(countryName)} right now.`, [PROXY_ROW, MENU_ROW]);
      return ctx.out(`📶 Which mobile operator in ${esc(countryName)}?`, [
        ...operators.filter((o) => fits(`pop:${o.id}`)).map((o) => [{ text: o.name, callback_data: `pop:${o.id}` }]),
        PROXY_ROW,
        MENU_ROW,
      ]);
    }
    if (spec.rotation === undefined) {
      const op = operators.find((o) => o.id === spec.operator);
      const rotations = op?.rotations ?? [{ id: 0, name: "By link" }];
      return ctx.out("🔄 How often should the IP change?", [
        ...pairs(rotations.map((r) => ({ text: r.name, callback_data: `pro:${r.id}` }))),
        PROXY_ROW,
        MENU_ROW,
      ]);
    }
  }

  if (spec.type === "ipv6" && !spec.protocol) {
    return ctx.out("Which protocol?", [IPV6_PROTOCOLS.map((p) => ({ text: p, callback_data: `ppr:${p}` })), PROXY_ROW, MENU_ROW]);
  }

  if (!spec.quantity) {
    const qtys = [1, 2, 5, 10, 20].filter((n) => n <= MAX_PROXIES_PER_ORDER);
    return ctx.out("How many proxies?", [qtys.map((n) => ({ text: String(n), callback_data: `pq:${n}` })), PROXY_ROW, MENU_ROW]);
  }

  return confirmProxy(ctx, spec, countryName, catalog);
}

async function confirmProxy(ctx: Ctx, draft: ProxyDraft, countryName: string, catalog: ProxyCatalog) {
  const spec = parseProxySpec(draft);
  if (!spec) return showProxyTypes(ctx.out);
  let total: number;
  try {
    total = await quoteProxyNgn(spec, "bot");
  } catch (err) {
    return ctx.out(`❌ ${esc(err instanceof Error ? err.message : "Couldn't get a price")}`, [PROXY_ROW, MENU_ROW]);
  }
  const period = catalog.periods.find((p) => p.id === spec.period)?.name ?? spec.period;
  const what = `${spec.quantity} × ${PROXY_TYPE_LABEL[spec.type]} proxy · ${esc(countryName)} · ${esc(period)}`;
  const bal = await balanceOf(ctx.account);
  if (bal + 0.01 < total) return shortOf(ctx, what, total, bal, "px");
  return ctx.out(`${what}\n💵 <b>${naira(total)}</b>\n\nBalance after: ${naira(bal - total)}`, [
    [{ text: `✅ Buy · ${naira(total)}`, callback_data: "pb", style: "success" }],
    PROXY_ROW,
    MENU_ROW,
  ]);
}

/** Handles every proxy button. */
export async function onProxyButton(ctx: Ctx, pending: Pending, cmd: string, a: string | undefined) {
  if (cmd === "px") return showProxyTypes(ctx.out);
  if (cmd === "pt") {
    if (!(PROXY_TYPES as readonly string[]).includes(a ?? "")) return showProxyTypes(ctx.out);
    const spec: ProxyDraft = { type: a as ProxyType };
    await save(ctx, spec);
    return nextProxyStep(ctx, spec);
  }
  const draft = await draftOf(ctx, pending);
  if (!draft) return;
  const spec: ProxyDraft = { ...draft };
  switch (cmd) {
    case "pcp":
      return nextProxyStep(ctx, spec, Number(a) || 0);
    case "pco":
      spec.country = a;
      break;
    case "ppe":
      spec.period = a;
      break;
    case "pop":
      spec.operator = a;
      break;
    case "pro":
      spec.rotation = Number(a) || 0;
      break;
    case "ppr":
      spec.protocol = a === "SOCKS5" ? "SOCKS5" : "HTTPS";
      break;
    case "pq":
      spec.quantity = Math.min(MAX_PROXIES_PER_ORDER, Math.max(1, Number(a) || 1));
      break;
    case "pb":
      return buyProxy(ctx, spec);
  }
  await save(ctx, spec);
  return nextProxyStep(ctx, spec);
}

async function buyProxy(ctx: Ctx, draft: ProxyDraft) {
  const { account, chatId, out } = ctx;
  const spec = parseProxySpec(draft);
  if (!spec) return showProxyTypes(out);
  if (await isUserSuspended(account.userId)) return out(SUSPENDED_MESSAGE, MENU_BUTTON);
  if (!(await claimPurchase(account.telegramId))) return;
  await out("⏳ Ordering your proxies…");
  const r = await placeProxyOrder(account.userId, spec, { channel: "bot" }).finally(() => setPending(account.telegramId, null));
  if (!r.ok) return send(chatId, `❌ ${esc(r.error)}`, [PROXY_ROW, MENU_ROW]);
  return send(chatId, "✅ <b>Proxies ordered.</b> They're usually ready within a minute or two.", [
    [{ text: "🔄 Check if ready", callback_data: `po:${r.data.id}`, style: "primary" }],
    MENU_ROW,
  ]);
}

/** A proxy order's status, with the proxies (ip:port:login:password) once issued. */
export async function showProxyOrder(ctx: Ctx, id: string) {
  const o = (await getProxyOrders(ctx.account.userId)).find((r) => r.id === id);
  if (!o) return ctx.out("Order not found.", MENU_BUTTON);
  const head = `🌐 ${o.quantity} × ${PROXY_TYPE_LABEL[asType(o.proxyType)]} · ${esc(o.country)} · ${esc(o.period)}`;
  if (o.status !== "active") {
    const note = o.status === "processing" ? "⏳ Still being set up. Check again in a minute." : esc(o.status);
    return ctx.out(`${head}\n${note}`, [[{ text: "🔄 Check again", callback_data: `po:${id}` }], MENU_ROW]);
  }
  const expires = o.expiresAt ? `\nValid until ${new Date(o.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "";
  await ctx.out(`${head}\n✅ Ready${expires}\n\nFormat: ip:port:login:password`);
  await sendBlocks((t) => send(ctx.chatId, t), credentialLines(o).join("\n"), esc);
  return send(ctx.chatId, "Also saved under 📦 My orders.", [MENU_ROW]);
}
