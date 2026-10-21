"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, Loading03Icon, ShieldKeyIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Admin = { email: string; addedBy: string | null; createdAt: string };

/**
 * Who else can open Ozymandias. Owners are built in and always have access;
 * everyone listed here was added by an admin and can be removed again.
 */
export function AdminEmailsManager() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/admin/admins")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load admins");
        setAdmins(d.admins);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load admins");
        setAdmins([]);
      });
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    if (admins?.some((a) => a.email === value)) {
      toast.error("That email is already an admin.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not add admin.");
        return;
      }
      setAdmins((prev) => [...(prev ?? []), { email: value, addedBy: "you", createdAt: new Date().toISOString() }]);
      setEmail("");
      toast.success(`${value} can now open the admin panel.`);
    } finally {
      setAdding(false);
    }
  }

  async function remove(target: string) {
    const prev = admins;
    setAdmins((list) => (list ?? []).filter((a) => a.email !== target));
    const res = await fetch("/api/admin/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: target }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setAdmins(prev);
      toast.error(data.error ?? "Could not remove admin.");
      return;
    }
    toast.success(`${target} no longer has admin access.`);
  }

  return (
    <div className="surface flex flex-col gap-5 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(140deg,rgb(255_90_31/0.2),rgb(255_211_26/0.06))] text-[#ffb27a]">
          <HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={1.75} className="size-5" />
        </span>
        <div>
          <h2 className="text-[0.9375rem] font-semibold tracking-[-0.015em]">Admin access</h2>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            People on this list can open Ozymandias after signing in to Rogue with that email.
            Owners always have access and aren&apos;t shown here.
          </p>
        </div>
      </div>

      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="h-10 flex-1 rounded-full px-4"
          aria-label="Admin email"
        />
        <Button type="submit" disabled={adding || !email.trim()} className="h-10">
          <HugeiconsIcon icon={adding ? Loading03Icon : Add01Icon} strokeWidth={2} className={adding ? "animate-spin" : undefined} />
          Add admin
        </Button>
      </form>

      {error ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      ) : admins === null ? (
        <div className="flex justify-center py-4">
          <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : admins.length === 0 ? (
        <p className="rounded-xl bg-white/[0.03] px-4 py-6 text-center text-[0.8125rem] text-muted-foreground">
          No extra admins yet. Add someone&apos;s email above.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {admins.map((a) => (
              <motion.li
                key={a.email}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="group flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-rogue-gradient flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white uppercase">
                    {a.email.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.8125rem] font-medium">{a.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Added {a.addedBy ? `by ${a.addedBy} ` : ""}
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(a.email)}
                  aria-label={`Remove ${a.email}`}
                  className="flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
                  Remove
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
