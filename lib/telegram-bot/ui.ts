import { formatAmount } from "@/lib/currency";
import { getWalletBalance } from "@/lib/wallet";
import type { Button, Keyboard } from "./api";
import type { BotAccount } from "./accounts";

/** Where a reply goes: edit the pressed message, or send a new one. */
export type Out = (text: string, keyboard?: Keyboard) => Promise<unknown>;

/** Everything a screen needs. `chatId` is for extra messages (long deliveries). */
export type Ctx = { out: Out; chatId: number; account: BotAccount };

export const naira = (n: number | string) => `₦${formatAmount(n)}`;
export const MENU_ROW: Button[] = [{ text: "🏠 Menu", callback_data: "m" }];
export const MENU_BUTTON: Keyboard = [MENU_ROW];
export const PAGE = 8;

export async function balanceOf(account: BotAccount): Promise<number> {
  const w = await getWalletBalance(account.userId, "NGN").catch(() => null);
  return Number((w as { balance?: string } | null)?.balance ?? 0) || 0;
}

/** Buttons two per row. */
export function pairs(buttons: Button[]): Keyboard {
  const rows: Keyboard = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return rows;
}

/** "⬅️ Back" / "More ➡️" for a paged list; `cb(page)` builds the button data. */
export function pager(page: number, hasMore: boolean, cb: (p: number) => string): Keyboard {
  const nav = [
    ...(page > 0 ? [{ text: "⬅️ Back", callback_data: cb(page - 1) }] : []),
    ...(hasMore ? [{ text: "More ➡️", callback_data: cb(page + 1) }] : []),
  ];
  return nav.length ? [nav] : [];
}

/** Telegram button data is capped at 64 bytes. */
export const fits = (data: string) => new TextEncoder().encode(data).length <= 64;

/** The "not enough balance" screen, with a fund button. */
export function shortOf(ctx: Ctx, what: string, total: number, balance: number, back: string) {
  return ctx.out(
    `${what} costs <b>${naira(total)}</b>, but your balance is ${naira(balance)}.\n\nAdd <b>${naira(Math.ceil(total - balance))}</b> or more first.`,
    [[{ text: "💰 Fund wallet", callback_data: "fund" }], [{ text: "⬅️ Back", callback_data: back }], MENU_ROW],
  );
}

/** Sends long text (deliveries) as one or more <pre> blocks; Telegram caps messages at 4096 characters. */
export async function sendBlocks(send: (text: string) => Promise<unknown>, text: string, esc: (s: string) => string) {
  for (let i = 0; i < text.length; i += 3500) await send(`<pre>${esc(text.slice(i, i + 3500))}</pre>`);
}
