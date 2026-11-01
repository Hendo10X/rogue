/**
 * Thin client for the Telegram Bot API, for the customer shop bot (not the
 * admin alert bot in lib/telegram.ts). Token: TELEGRAM_SHOP_BOT_TOKEN.
 */
const API = "https://api.telegram.org";

export type Button = { text: string; callback_data?: string; url?: string };
export type Keyboard = Button[][];

export function shopBotConfigured(): boolean {
  return !!process.env.TELEGRAM_SHOP_BOT_TOKEN?.trim();
}

export async function tg<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_SHOP_BOT_TOKEN?.trim();
  if (!token) return null;
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
    if (!data?.ok) {
      console.error(`[ShopBot] ${method} failed`, data?.description);
      return null;
    }
    return data.result ?? null;
  } catch (err) {
    console.error(`[ShopBot] ${method} error`, err);
    return null;
  }
}

export function send(chatId: string | number, text: string, keyboard?: Keyboard) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

/** Replaces the message a button was pressed on (keeps the chat tidy). */
export async function edit(chatId: string | number, messageId: number, text: string, keyboard?: Keyboard) {
  const ok = await tg("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: keyboard ?? [] },
  });
  // Old or identical messages can't be edited: send a fresh one instead.
  if (!ok) await send(chatId, text, keyboard);
}

export function answer(callbackId: string, text?: string) {
  return tg("answerCallbackQuery", { callback_query_id: callbackId, ...(text ? { text } : {}) });
}

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
