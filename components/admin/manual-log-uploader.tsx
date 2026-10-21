"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, FileUploadIcon, Loading03Icon, Upload04Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Counts = { available: number; sold: number };

/**
 * Upload logs (one per line) to a manual listing. Buyers then receive them
 * instantly; the listing's stock follows the unsold count.
 */
export function ManualLogUploader({
  listingId,
  title,
  onStockChange,
}: {
  listingId: string;
  title: string;
  /** Called with the new unsold count so the parent can update its stock. */
  onStockChange?: (stock: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"upload" | "clear" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/admin/listings/${listingId}/logs`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load counts");
        setCounts(d);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load counts"));
  }, [open, listingId]);

  async function readFile(file: File) {
    if (file.size > 2_000_000) {
      toast.error("That file is over 2 MB. Split it into smaller uploads.");
      return;
    }
    const content = await file.text();
    setText((t) => (t.trim() ? `${t.trim()}\n${content}` : content));
  }

  async function upload() {
    setBusy("upload");
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Upload failed");
      setCounts((c) => ({ available: d.available, sold: c?.sold ?? 0 }));
      onStockChange?.(d.available);
      setText("");
      toast.success(
        `Added ${d.added.toLocaleString()} log${d.added === 1 ? "" : "s"}` +
          (d.skipped ? ` · skipped ${d.skipped} duplicate${d.skipped === 1 ? "" : "s"}` : "")
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function clearUnsold() {
    if (!window.confirm("Remove every unsold log from this listing? Sold logs are kept.")) return;
    setBusy("clear");
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/logs`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not clear logs");
      setCounts((c) => ({ available: 0, sold: c?.sold ?? 0 }));
      onStockChange?.(0);
      toast.success(`Removed ${d.removed} unsold log${d.removed === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear logs");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} />
        Upload logs
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="leading-snug">Upload logs · {title}</AlertDialogTitle>
            <AlertDialogDescription>
              One log per line, e.g. <code className="rounded bg-white/[0.06] px-1">username:password:email:emailpass</code>.
              Buyers get them instantly, and stock updates to match.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/[0.04] px-4 py-3">
              <p className="text-xs text-muted-foreground">In stock</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{counts ? counts.available.toLocaleString() : "…"}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-4 py-3">
              <p className="text-xs text-muted-foreground">Sold</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{counts ? counts.sold.toLocaleString() : "…"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor={`logs-${listingId}`} className="text-[0.8125rem] font-medium">
                Logs
              </label>
              <span className="text-xs text-muted-foreground tabular-nums">{lines.length.toLocaleString()} lines</span>
            </div>
            <Textarea
              id={`logs-${listingId}`}
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"user1:pass1:mail1@mail.com:mailpass1\nuser2:pass2:mail2@mail.com:mailpass2"}
              className="resize-y rounded-xl font-mono text-xs"
              spellCheck={false}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-3 text-[0.8125rem] text-muted-foreground transition-colors hover:border-[#ff8a3d]/60 hover:text-foreground"
            >
              <HugeiconsIcon icon={FileUploadIcon} strokeWidth={1.75} className="size-4" />
              Or choose a .txt file
            </button>
          </div>

          <AlertDialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy !== null || !counts?.available}
              onClick={() => void clearUnsold()}
            >
              <HugeiconsIcon icon={busy === "clear" ? Loading03Icon : Delete02Icon} className={busy === "clear" ? "animate-spin" : undefined} />
              Clear unsold
            </Button>
            <div className="flex gap-2">
              <AlertDialogCancel>Close</AlertDialogCancel>
              <Button type="button" disabled={busy !== null || lines.length === 0} onClick={() => void upload()}>
                {busy === "upload" && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
                Add {lines.length > 0 ? lines.length.toLocaleString() : ""} log{lines.length === 1 ? "" : "s"}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
