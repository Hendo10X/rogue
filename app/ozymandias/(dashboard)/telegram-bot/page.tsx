"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { ShopBotSettings } from "@/components/admin/shop-bot-settings";

type Texts = { welcome: string; join: string; help: string };
type Settings = {
  prices: { otpMarkup: number | null; proxyMarkup: number | null; websiteOtpMarkup: number; websiteProxyMarkup: number };
  texts: Texts;
  defaults: Texts;
  textLimit: number;
};
type Broadcast = {
  id: string;
  text: string;
  button?: { text: string; url: string } | null;
  status: "sending" | "done" | "cancelled";
  total: number;
  sent: number;
  failed: number;
  startedAt: string;
};

const TEXT_FIELDS: { key: keyof Texts; label: string; hint: string }[] = [
  { key: "welcome", label: "Menu message (members)", hint: "Above the menu. {name} and {balance} are filled in." },
  { key: "join", label: "Not-a-member message", hint: "Shown until someone connects their Rogue Socials account. {site} is your website." },
  { key: "help", label: "Help (/help)", hint: "How the bot works." },
];

/** Same formatting the bot uses: plain text, line breaks kept, **double stars** for bold. */
function Preview({ text, vars }: { text: string; vars?: Record<string, string> }) {
  let t = text;
  for (const [k, v] of Object.entries(vars ?? {})) t = t.split(`{${k}}`).join(v);
  const parts = t.split(/(\*\*[\s\S]+?\*\*)/g);
  return (
    <div className="rounded-xl bg-sky-500/10 px-3 py-2 text-sm whitespace-pre-wrap">
      {parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
    </div>
  );
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || "Something went wrong");
  return d as T;
}

export default function TelegramBotAdminPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Telegram bot" description="Bot status, bot-only prices, the messages it sends, and announcements to members." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ShopBotSettings />
        <Prices />
      </div>
      <Announcements />
      <Messages />
    </div>
  );
}

function Prices() {
  const [s, setS] = useState<Settings | null>(null);
  const [otp, setOtp] = useState("");
  const [proxy, setProxy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Settings>("/api/admin/telegram-bot/settings")
      .then((d) => {
        setS(d);
        setOtp(d.prices.otpMarkup === null ? "" : String(d.prices.otpMarkup));
        setProxy(d.prices.proxyMarkup === null ? "" : String(d.prices.proxyMarkup));
      })
      .catch(() => toast.error("Failed to load bot prices"));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const d = await api<Settings>("/api/admin/telegram-bot/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpMarkup: otp.trim(), proxyMarkup: proxy.trim() }),
      });
      setS(d);
      toast.success("Bot prices saved. They apply to the next number or proxy bought in the bot.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface flex flex-col gap-4 rounded-2xl p-5">
      <SectionLabel>Bot prices</SectionLabel>
      {!s ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Markup on what the supplier charges, for sales in the bot only. Lower than the website&apos;s to make the bot cheaper. Leave empty to use the website&apos;s markup.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span>OTP numbers markup (%)</span>
              <Input inputMode="decimal" value={otp} placeholder={`Same as website (${s.prices.websiteOtpMarkup}%)`} onChange={(e) => setOtp(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Proxies markup (%)</span>
              <Input inputMode="decimal" value={proxy} placeholder={`Same as website (${s.prices.websiteProxyMarkup}%)`} onChange={(e) => setProxy(e.target.value)} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: a number costing $0.50 at ₦1,500/$ sells for ₦1,130 at 50%, or ₦980 at 30%. What the bot shows is what it charges.
          </p>
          <Button onClick={() => void save()} disabled={saving} className="self-start">
            {saving ? "Saving…" : "Save prices"}
          </Button>
        </>
      )}
    </section>
  );
}

function Messages() {
  const [s, setS] = useState<Settings | null>(null);
  const [texts, setTexts] = useState<Texts | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Settings>("/api/admin/telegram-bot/settings")
      .then((d) => {
        setS(d);
        setTexts(d.texts);
      })
      .catch(() => toast.error("Failed to load bot messages"));
  }, []);

  async function save() {
    if (!texts) return;
    setSaving(true);
    try {
      const d = await api<Settings>("/api/admin/telegram-bot/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      setS(d);
      setTexts(d.texts);
      toast.success("Bot messages saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface flex flex-col gap-5 rounded-2xl p-5">
      <SectionLabel>Bot messages</SectionLabel>
      {!s || !texts ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Plain text. Line breaks are kept and **double stars** make text bold.</p>
          {TEXT_FIELDS.map((f) => (
            <div key={f.key} className="grid gap-3 lg:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="flex items-center justify-between gap-2">
                  {f.label}
                  {texts[f.key] !== s.defaults[f.key] && (
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setTexts({ ...texts, [f.key]: s.defaults[f.key] })}>
                      Reset to default
                    </button>
                  )}
                </span>
                <Textarea
                  rows={6}
                  maxLength={s.textLimit}
                  value={texts[f.key]}
                  onChange={(e) => setTexts({ ...texts, [f.key]: e.target.value })}
                />
                <span className="text-xs text-muted-foreground">{f.hint}</span>
              </label>
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Preview</span>
                <Preview text={texts[f.key]} vars={{ name: "Ada", balance: "₦12,500", site: "roguesocials.com" }} />
              </div>
            </div>
          ))}
          <Button onClick={() => void save()} disabled={saving} className="self-start">
            {saving ? "Saving…" : "Save messages"}
          </Button>
        </>
      )}
    </section>
  );
}

function Announcements() {
  const [members, setMembers] = useState<number | null>(null);
  const [current, setCurrent] = useState<Broadcast | null>(null);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [text, setText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [testUser, setTestUser] = useState("");
  const [busy, setBusy] = useState(false);
  const stop = useRef(false);

  const load = useCallback(() => {
    api<{ members: number; current: Broadcast | null; history: Broadcast[] }>("/api/admin/telegram-bot/broadcast")
      .then((d) => {
        setMembers(d.members);
        setCurrent(d.current);
        setHistory(d.history);
      })
      .catch(() => toast.error("Failed to load announcements"));
  }, []);
  useEffect(load, [load]);
  useEffect(() => () => void (stop.current = true), []);

  const post = (body: Record<string, unknown>) =>
    api<{ current?: Broadcast; ok?: boolean }>("/api/admin/telegram-bot/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  /** Sends batch after batch until the announcement is done (or the page is left). */
  async function run(b: Broadcast) {
    setBusy(true);
    stop.current = false;
    let cur = b;
    try {
      while (cur.status === "sending" && !stop.current) {
        const d = await post({ action: "next", id: cur.id });
        cur = d.current!;
        setCurrent(cur);
      }
      if (cur.status === "done") toast.success(`Sent to ${cur.sent.toLocaleString()} member${cur.sent === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sending stopped. Press Continue to carry on.");
    } finally {
      setBusy(false);
      load();
    }
  }

  async function test() {
    setBusy(true);
    try {
      await post({ action: "test", text, buttonText, buttonUrl, username: testUser });
      toast.success(`Test sent to @${testUser.replace(/^@/, "")}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the test");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!window.confirm(`Send this announcement to all ${members?.toLocaleString() ?? ""} bot members now? This can't be undone.`)) return;
    try {
      const d = await post({ action: "start", text, buttonText, buttonUrl });
      setCurrent(d.current!);
      setText("");
      setButtonText("");
      setButtonUrl("");
      void run(d.current!);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start sending");
    }
  }

  async function cancel() {
    if (!current) return;
    stop.current = true;
    try {
      const d = await post({ action: "cancel", id: current.id });
      setCurrent(d.current ?? null);
      load();
    } catch {
      toast.error("Couldn't cancel");
    }
  }

  const sending = current?.status === "sending";
  const pct = current && current.total ? Math.min(100, Math.round(((current.sent + current.failed) / current.total) * 100)) : 0;

  return (
    <section className="surface flex flex-col gap-4 rounded-2xl p-5">
      <SectionLabel>Announcements</SectionLabel>
      <p className="text-sm text-muted-foreground">
        Message every bot member at once, e.g. price drops or new countries. {members !== null && <b>{members.toLocaleString()} members</b>} will get it.
        Send a test to yourself first.
      </p>

      {sending && current && (
        <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Sending… {pct}%</span>
            <span className="text-muted-foreground tabular-nums">
              {current.sent.toLocaleString()} sent · {current.failed.toLocaleString()} failed · {current.total.toLocaleString()} total
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-2">
            {!busy && (
              <Button size="sm" onClick={() => void run(current)}>
                Continue sending
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => void cancel()}>
              Stop
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Keep this page open while it sends.</p>
        </div>
      )}

      {!sending && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Textarea
              rows={7}
              maxLength={2000}
              value={text}
              placeholder={"🔥 **OTP numbers are now cheaper!**\nUS WhatsApp numbers from ₦980. Tap /otp to get one."}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={buttonText} maxLength={40} placeholder="Button label (optional)" onChange={(e) => setButtonText(e.target.value)} />
              <Input value={buttonUrl} placeholder="https://… (optional)" onChange={(e) => setButtonUrl(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input value={testUser} placeholder="@your_telegram" className="w-44" onChange={(e) => setTestUser(e.target.value)} />
              <Button variant="outline" disabled={busy || !text.trim() || !testUser.trim()} onClick={() => void test()}>
                Send test
              </Button>
              <Button disabled={busy || !text.trim() || !members} onClick={() => void start()}>
                Send to all members
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Preview</span>
            {text.trim() ? <Preview text={text} /> : <p className="text-xs text-muted-foreground">Start typing to see how it looks.</p>}
            {buttonText.trim() && <div className="rounded-lg bg-white/10 px-3 py-1.5 text-center text-xs">{buttonText}</div>}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Recent</span>
          {history.slice(0, 8).map((h) => (
            <div key={h.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-2.5 text-sm">
              <span className="line-clamp-2 whitespace-pre-wrap">{h.text}</span>
              <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {h.status === "cancelled" ? "Stopped · " : ""}
                {h.sent.toLocaleString()} sent{h.failed ? ` · ${h.failed} failed` : ""}
                <br />
                {formatDistanceToNow(new Date(h.startedAt), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
