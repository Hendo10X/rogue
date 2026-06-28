"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/api-keys")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.keys)) setKeys(d.keys);
      })
      .catch(() => toast.error("Failed to load API keys"))
      .finally(() => setLoading(false));
  }, []);

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "API key" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setNewKey(data.key);
      setKeys((prev) => [
        {
          id: data.id,
          name: data.name,
          keyPrefix: data.keyPrefix,
          active: true,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? Apps using it will stop working.")) {
      return;
    }
    try {
      const res = await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("Key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  }

  return (
    <Card className="border shadow-none">
      <CardHeader>
        <CardTitle className="text-base">API Access</CardTitle>
        <CardDescription>
          Generate keys to use the Rogue API. Send your key as{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            Authorization: Bearer &lt;key&gt;
          </code>
          . Endpoints: <code className="text-xs">/api/v1/services</code>,{" "}
          <code className="text-xs">/api/v1/orders</code>,{" "}
          <code className="text-xs">/api/v1/balance</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
            <p className="text-sm font-medium">
              Copy your new key now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-muted px-2 py-1 text-xs">
                {newKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  toast.success("Copied");
                }}
              >
                Copy
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
              Done
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Key name</label>
            <Input
              placeholder="e.g. Reseller bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <Button
            onClick={createKey}
            disabled={creating}
            className="rounded-full"
          >
            {creating ? (
              <HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 animate-spin" />
            ) : null}
            Generate key
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{k.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {k.keyPrefix}…{" "}
                    {k.lastUsedAt
                      ? `· last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : "· never used"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => revokeKey(k.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
