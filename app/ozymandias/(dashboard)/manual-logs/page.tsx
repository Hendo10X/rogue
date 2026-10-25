"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { EmptyState, PageHeader, SectionLabel } from "@/components/page-header";
import { ManualLogUploader } from "@/components/admin/manual-log-uploader";

type ManualLog = {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  categoryName: string | null;
  price: string;
  stock: number;
  status: string;
};

type Draft = { title: string; description: string; platform: string; categoryName: string; price: string; stock: string };

const EMPTY_DRAFT: Draft = { title: "", description: "", platform: "", categoryName: "", price: "", stock: "1" };
const UNCATEGORISED = "Uncategorised";

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function removalMessage(r: { deleted?: number; archived?: number }) {
  const parts = [];
  if (r.deleted) parts.push(`${r.deleted} deleted`);
  if (r.archived) parts.push(`${r.archived} archived (kept for order history)`);
  return parts.join(", ") || "Nothing removed";
}

export default function ManualLogsPage() {
  const [logs, setLogs] = useState<ManualLog[]>([]);
  const [featured, setFeatured] = useState<string[]>([]);
  const [maxFeatured, setMaxFeatured] = useState(3);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(EMPTY_DRAFT);

  const load = useCallback(async () => {
    try {
      const [listings, feat] = await Promise.all([call("/api/admin/listings"), call("/api/admin/featured")]);
      setLogs(listings.manualListings ?? []);
      setFeatured(feat.ids ?? []);
      setMaxFeatured(feat.max ?? 3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load manual logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, ManualLog[]>();
    for (const log of logs) {
      const key = log.categoryName || UNCATEGORISED;
      map.set(key, [...(map.get(key) ?? []), log]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [logs]);

  async function create() {
    const price = parseFloat(draft.price);
    const stock = parseInt(draft.stock, 10);
    if (!draft.title.trim() || !draft.platform.trim()) return toast.error("Title and platform are required");
    if (!Number.isFinite(price) || price <= 0) return toast.error("Enter a valid price in Naira");
    if (!Number.isInteger(stock) || stock <= 0) return toast.error("Stock must be a positive whole number");
    setCreating(true);
    try {
      await call("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          platform: draft.platform.trim(),
          categoryName: draft.categoryName.trim() || undefined,
          description: draft.description.trim() || undefined,
          priceNgn: price,
          stock,
        }),
      });
      toast.success("Manual log created and published");
      setDraft(EMPTY_DRAFT);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create log");
    } finally {
      setCreating(false);
    }
  }

  async function save(log: ManualLog) {
    const price = parseFloat(edit.price);
    const stock = parseInt(edit.stock, 10);
    if (!edit.title.trim()) return toast.error("Name can't be empty");
    if (!Number.isFinite(price) || price <= 0) return toast.error("Enter a valid price");
    if (!Number.isInteger(stock) || stock < 0) return toast.error("Stock must be 0 or more");
    try {
      await call(`/api/admin/listings/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: edit.title.trim(),
          description: edit.description,
          platform: edit.platform.trim() || log.platform,
          categoryName: edit.categoryName.trim() || null,
          priceNgn: price,
          stock,
        }),
      });
      toast.success("Log updated");
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update log");
    }
  }

  async function setActive(log: ManualLog, active: boolean) {
    try {
      await call(`/api/admin/listings/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: active ? "active" : "inactive" }),
      });
      setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, status: active ? "active" : "inactive" } : l)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update log");
    }
  }

  async function deleteLog(log: ManualLog) {
    if (!window.confirm(`Delete "${log.title}" permanently? This can't be undone.`)) return;
    try {
      const r = await call(`/api/admin/listings/${log.id}?permanent=1`, { method: "DELETE" });
      toast.success(removalMessage(r));
      setLogs((prev) => prev.filter((l) => l.id !== log.id));
      setFeatured((prev) => prev.filter((id) => id !== log.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete log");
    }
  }

  async function deleteCategory(name: string) {
    if (!window.confirm(`Delete the category "${name}" and all its logs permanently?`)) return;
    try {
      const r = await call(`/api/admin/listings/category?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      toast.success(removalMessage(r));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete category");
    }
  }

  async function toggleFeatured(id: string) {
    const next = featured.includes(id) ? featured.filter((x) => x !== id) : [...featured, id];
    if (next.length > maxFeatured) return toast.error(`You can feature up to ${maxFeatured} logs. Unstar one first.`);
    try {
      const r = await call("/api/admin/featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next }),
      });
      setFeatured(r.ids ?? next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update featured logs");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Manual logs"
        description={`Logs you stock yourself. Star up to ${maxFeatured} to pin them to the top of the marketplace next to the best sellers.`}
      />

      <section className="surface flex flex-col gap-4 rounded-2xl p-5">
        <SectionLabel>New manual log</SectionLabel>
        <FieldSet>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input placeholder="Instagram aged 2015 - USA" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Platform</FieldLabel>
              <Input placeholder="instagram, facebook, tiktok…" value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Category (optional)</FieldLabel>
              <Input
                list="manual-categories"
                placeholder="Pick or type a new one"
                value={draft.categoryName}
                onChange={(e) => setDraft({ ...draft, categoryName: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Price (₦)</FieldLabel>
                <Input type="number" min={1} step={50} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Stock</FieldLabel>
                <Input type="number" min={1} step={1} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
              </Field>
            </div>
          </FieldGroup>
          <Field>
            <FieldLabel>Description (optional)</FieldLabel>
            <Textarea
              rows={2}
              className="resize-none"
              placeholder="Shown to buyers on the marketplace."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
        </FieldSet>
        <datalist id="manual-categories">
          {groups.map(([name]) => name !== UNCATEGORISED && <option key={name} value={name} />)}
        </datalist>
        <div className="flex justify-end">
          <Button onClick={create} disabled={creating}>
            {creating ? "Creating…" : "Create log"}
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="No manual logs yet" description="Create one above, then upload its logs for instant delivery." />
      ) : (
        groups.map(([category, items]) => {
          const allInactive = items.every((l) => l.status !== "active");
          return (
            <section key={category} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 pl-1">
                <SectionLabel>
                  {category} · {items.length}
                </SectionLabel>
                {category !== UNCATEGORISED && allInactive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteCategory(category)}
                  >
                    Delete category
                  </Button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((log) => {
                  const isEditing = editingId === log.id;
                  const isFeatured = featured.includes(log.id);
                  const active = log.status === "active";
                  return (
                    <div key={log.id} className={cn("surface flex flex-col gap-3 rounded-2xl p-4", !active && "opacity-70")}>
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Name" />
                          <Textarea
                            rows={2}
                            className="resize-none"
                            value={edit.description}
                            onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                            placeholder="Description"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input value={edit.platform} onChange={(e) => setEdit({ ...edit, platform: e.target.value })} placeholder="Platform" />
                            <Input
                              list="manual-categories"
                              value={edit.categoryName}
                              onChange={(e) => setEdit({ ...edit, categoryName: e.target.value })}
                              placeholder="Category"
                            />
                            <Input type="number" min={1} step={50} value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} placeholder="Price (₦)" />
                            <Input type="number" min={0} step={1} value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} placeholder="Stock" />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => save(log)}>
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{log.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{log.platform}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Badge variant={active ? "secondary" : "outline"}>{active ? "active" : "inactive"}</Badge>
                              <button
                                type="button"
                                aria-label={isFeatured ? "Unfeature" : "Feature on the marketplace"}
                                title={isFeatured ? "Featured — click to unpin" : "Feature on the marketplace"}
                                onClick={() => toggleFeatured(log.id)}
                                className={cn(
                                  "flex size-8 items-center justify-center rounded-full transition-colors",
                                  isFeatured ? "text-amber-400" : "text-muted-foreground hover:text-foreground",
                                )}
                              >
                                <HugeiconsIcon icon={StarIcon} strokeWidth={1.75} className={cn("size-4", isFeatured && "fill-current")} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold">₦{formatAmount(log.price)}</span>
                            <span className="text-xs text-muted-foreground">Stock: {log.stock}</span>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <ManualLogUploader
                              listingId={log.id}
                              title={log.title}
                              onStockChange={(stock) => setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, stock } : l)))}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingId(log.id);
                                setEdit({
                                  title: log.title,
                                  description: log.description ?? "",
                                  platform: log.platform,
                                  categoryName: log.categoryName ?? "",
                                  price: String(Math.round(parseFloat(log.price))),
                                  stock: String(log.stock),
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setActive(log, !active)}>
                              {active ? "Deactivate" : "Activate"}
                            </Button>
                            {!active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => deleteLog(log)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
