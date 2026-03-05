import Link from "next/link";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Link
          href="/admin/orders"
          className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Orders</h2>
          <p className="text-muted-foreground text-sm">
            View marketplace and boosting orders
          </p>
        </Link>
        <Link
          href="/admin/suppliers"
          className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Suppliers</h2>
          <p className="text-muted-foreground text-sm">
            Monitor supplier balances and status
          </p>
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-lg border border-border bg-background p-4 shadow-none transition-colors hover:bg-muted/50"
        >
          <h2 className="font-medium">Settings</h2>
          <p className="text-muted-foreground text-sm">
            Adjust markup and profit percentages
          </p>
        </Link>
      </div>
    </div>
  );
}
