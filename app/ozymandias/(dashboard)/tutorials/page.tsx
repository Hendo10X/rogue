"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { videoEmbedUrl } from "@/lib/video-embed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { EmptyState, PageHeader, SectionLabel } from "@/components/page-header";

type Tutorial = {
  id: string;
  title: string;
  topic: string;
  body: string;
  videoUrl: string | null;
  published: boolean;
  sortOrder: number;
};

type Draft = Omit<Tutorial, "id" | "videoUrl"> & { id?: string; videoUrl: string };

const EMPTY: Draft = { title: "", topic: "General", body: "", videoUrl: "", published: true, sortOrder: 0 };

export default function AdminTutorialsPage() {
  const [items, setItems] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tutorials");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.tutorials ?? []);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Failed to load tutorials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (draft.title.trim().length < 2) return toast.error("Give the tutorial a title");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tutorials", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success(draft.id ? "Tutorial updated" : "Tutorial added");
      setDraft(EMPTY);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: Tutorial) {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    const res = await fetch(`/api/admin/tutorials?id=${t.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to delete");
    setItems((prev) => prev.filter((x) => x.id !== t.id));
    if (draft.id === t.id) setDraft(EMPTY);
  }

  const topics = Array.from(new Set(items.map((t) => t.topic)));
  const linkOk = !draft.videoUrl || videoEmbedUrl(draft.videoUrl);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Tutorials" description="Guides customers see on the Tutorials page. Add a video link to embed it." />

      <section className="surface flex flex-col gap-4 rounded-2xl p-5">
        <SectionLabel>{draft.id ? "Edit tutorial" : "New tutorial"}</SectionLabel>
        <FieldSet>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input placeholder="How to log in to a Facebook log" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Topic</FieldLabel>
              <Input list="tutorial-topics" value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} />
              <datalist id="tutorial-topics">
                {topics.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel>Video link (optional)</FieldLabel>
            <Input
              placeholder="YouTube, Vimeo, Loom, Streamable or Google Drive link"
              value={draft.videoUrl}
              onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
            />
            {!linkOk && (
              <p className="text-xs text-muted-foreground">This link can&apos;t be embedded, so customers will get a &quot;Watch the video&quot; link instead.</p>
            )}
          </Field>
          <Field>
            <FieldLabel>Instructions</FieldLabel>
            <Textarea
              rows={8}
              placeholder={"1. Open the browser in incognito\n2. Paste the cookies…"}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </Field>
          <FieldGroup className="flex flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Order
              <Input
                type="number"
                min={0}
                className="h-9 w-20"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
              />
            </label>
          </FieldGroup>
        </FieldSet>
        <div className="flex justify-end gap-2">
          {draft.id && (
            <Button variant="ghost" onClick={() => setDraft(EMPTY)}>
              Cancel
            </Button>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : draft.id ? "Save changes" : "Add tutorial"}
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No tutorials yet" description="Add your first guide above." />
      ) : (
        <div className="surface flex flex-col gap-0.5 rounded-2xl p-1.5">
          {items.map((t) => (
            <div key={t.id} className={cn("flex items-center justify-between gap-3 rounded-xl px-4 py-3", draft.id === t.id && "bg-white/[0.04]")}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.topic}
                  {t.videoUrl ? " · video" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!t.published && <Badge variant="outline">draft</Badge>}
                <Button variant="ghost" size="sm" onClick={() => setDraft({ ...t, videoUrl: t.videoUrl ?? "" })}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => remove(t)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
