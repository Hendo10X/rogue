import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "API Documentation — Rogue Socials",
  description:
    "Integrate the Rogue Socials API: list services, place boosting orders, and check balances programmatically with your API key.",
};

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://roguesocials.com"
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-4 text-xs leading-relaxed sm:text-sm">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

function Pill({ method }: { method: string }) {
  const color =
    method === "GET"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${color}`}
    >
      {method}
    </span>
  );
}

function Endpoint({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill method={method} />
        <code className="font-mono text-sm font-medium break-all">{path}</code>
      </div>
      <div className="mt-3 space-y-3 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "pricing", label: "Pricing & billing" },
  { id: "services", label: "List services" },
  { id: "place-order", label: "Place an order" },
  { id: "order-status", label: "Order status" },
  { id: "balance", label: "Balance" },
  { id: "errors", label: "Errors" },
];

export default function ApiDocsPage() {
  const base = getBaseUrl();

  return (
    <div className="min-h-screen bg-background font-display">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Header */}
        <header className="mb-10 border-b pb-8">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Developers
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Rogue Socials API
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Resell our social-media boosting services from your own app, bot, or
            panel. Fetch live services, place orders, and track them
            programmatically — billed from your Rogue wallet at your reseller
            rate.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <a
              href="/signup"
              className="rounded-full bg-primary px-4 py-2 font-medium text-white hover:opacity-90"
            >
              Create an account
            </a>
            <a
              href="/settings"
              className="rounded-full border px-4 py-2 font-medium hover:bg-muted"
            >
              Get your API key
            </a>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[200px_1fr]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <nav className="sticky top-8 space-y-1 text-sm">
              {NAV.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0 space-y-12">
            {/* Overview */}
            <section id="overview" className="scroll-mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">Overview</h2>
              <p className="text-muted-foreground">
                The API is a small REST interface. All endpoints live under{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                  {base}/api/v1
                </code>
                , accept and return JSON, and require an API key. Successful
                responses are wrapped in a <code className="text-sm">data</code>{" "}
                field; errors return{" "}
                <code className="text-sm">{`{ "error": "..." }`}</code> with an
                appropriate HTTP status.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-sm font-medium">Base URL</p>
                  <code className="text-sm text-muted-foreground">
                    {base}/api/v1
                  </code>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-sm font-medium">Format</p>
                  <p className="text-sm text-muted-foreground">
                    JSON over HTTPS · prices in NGN
                  </p>
                </div>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication" className="scroll-mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">Authentication</h2>
              <p className="text-muted-foreground">
                Generate a key from{" "}
                <a href="/settings" className="text-primary hover:underline">
                  Settings → API Access
                </a>
                . The full secret is shown once — store it safely. Send it as a
                Bearer token on every request (or use the{" "}
                <code className="text-sm">X-API-Key</code> header):
              </p>
              <Code>{`Authorization: Bearer rogue_xxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
              <p className="text-sm text-muted-foreground">
                Keys are tied to your account and wallet. Revoke a key anytime
                from the same page — revoked keys stop working immediately.
              </p>
            </section>

            {/* Pricing */}
            <section id="pricing" className="scroll-mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">Pricing &amp; billing</h2>
              <p className="text-muted-foreground">
                There is no subscription or access fee. You pay per order,
                deducted from your Rogue wallet balance in NGN. Top up your
                wallet from the dashboard (card, bank transfer, or crypto).
              </p>
              <p className="text-muted-foreground">
                Each service has a rate per 1,000 units. Your reseller rate is
                the supplier cost plus a fixed markup % set by Rogue — so it is
                always profitable for both sides. Your effective charge is:
              </p>
              <Code>{`charge = rate_per_1000 × (quantity / 1000)

rate_per_1000         = your reseller rate (supplier cost + markup%)
website_rate_per_1000 = the public website price (for reference)`}</Code>
              <p className="text-sm text-muted-foreground">
                The rate and the active{" "}
                <code className="text-sm">markup_percent</code> are returned by
                the <code className="text-sm">/services</code> endpoint, so you
                can always add your own margin on top when reselling.
              </p>
            </section>

            {/* Services */}
            <section id="services" className="scroll-mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">List services</h2>
              <Endpoint method="GET" path="/api/v1/services">
                <p>
                  Returns all available services with your reseller pricing.
                  Optional query params:{" "}
                  <code className="text-sm">category</code>,{" "}
                  <code className="text-sm">q</code> (search).
                </p>
              </Endpoint>
              <Code>{`curl ${base}/api/v1/services \\
  -H "Authorization: Bearer rogue_xxx"`}</Code>
              <p className="text-sm font-medium">Response</p>
              <Code>{`{
  "data": [
    {
      "service": 123,
      "name": "Instagram Followers — Premium",
      "category": "Instagram",
      "type": "Default",
      "min": "10",
      "max": "100000",
      "refill": true,
      "cancel": false,
      "currency": "NGN",
      "rate_per_1000": 1300.00,
      "website_rate_per_1000": 1800.00,
      "markup_percent": 30
    }
  ],
  "count": 1
}`}</Code>
            </section>

            {/* Place order */}
            <section id="place-order" className="scroll-mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">Place an order</h2>
              <Endpoint method="POST" path="/api/v1/orders">
                <p>
                  Places an order and debits your wallet. Body fields:{" "}
                  <code className="text-sm">service</code> (number),{" "}
                  <code className="text-sm">link</code> (string),{" "}
                  <code className="text-sm">quantity</code> (number). If your
                  balance is too low you get a 400 and nothing is charged.
                </p>
              </Endpoint>
              <Code>{`curl -X POST ${base}/api/v1/orders \\
  -H "Authorization: Bearer rogue_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "service": 123,
    "link": "https://instagram.com/yourhandle",
    "quantity": 1000
  }'`}</Code>
              <p className="text-sm font-medium">Response</p>
              <Code>{`{
  "data": {
    "id": "b1f3...",
    "external_order_id": 884512,
    "charge": "1300.00",
    "currency": "NGN",
    "markup_percent": 30,
    "status": "processing"
  }
}`}</Code>
            </section>

            {/* Order status */}
            <section id="order-status" className="scroll-mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">Order status</h2>
              <Endpoint method="GET" path="/api/v1/orders/:id">
                <p>
                  Live status of a single order (refreshed from the supplier).
                </p>
              </Endpoint>
              <Endpoint method="GET" path="/api/v1/orders">
                <p>Lists your 100 most recent orders.</p>
              </Endpoint>
              <Code>{`curl ${base}/api/v1/orders/b1f3... \\
  -H "Authorization: Bearer rogue_xxx"`}</Code>
              <p className="text-sm font-medium">Response</p>
              <Code>{`{
  "data": {
    "id": "b1f3...",
    "service": 123,
    "service_name": "Instagram Followers — Premium",
    "link": "https://instagram.com/yourhandle",
    "quantity": 1000,
    "charge": "1300.00",
    "currency": "NGN",
    "status": "completed",
    "external_status": "Completed",
    "start_count": "5120",
    "remains": "0"
  }
}`}</Code>
            </section>

            {/* Balance */}
            <section id="balance" className="scroll-mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">Balance</h2>
              <Endpoint method="GET" path="/api/v1/balance">
                <p>Your current wallet balance.</p>
              </Endpoint>
              <Code>{`curl ${base}/api/v1/balance \\
  -H "Authorization: Bearer rogue_xxx"

{ "data": { "balance": "15400.00", "currency": "NGN" } }`}</Code>
            </section>

            {/* Errors */}
            <section id="errors" className="scroll-mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">Errors</h2>
              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      ["401", "Missing or invalid API key"],
                      ["400", "Bad request (missing fields, low balance)"],
                      ["404", "Service or order not found"],
                      ["502", "Supplier rejected the order (wallet refunded)"],
                      ["500", "Unexpected server error"],
                    ].map(([code, meaning]) => (
                      <tr key={code}>
                        <td className="px-4 py-2 font-mono">{code}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {meaning}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground">
                Need help? Reach us on{" "}
                <a
                  href="https://t.me/rogue4l"
                  className="text-primary hover:underline"
                >
                  Telegram
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
