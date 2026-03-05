# Rogue — Social Media Account Marketplace & Growth Platform

> **Planning document** — Architecture, features, and roadmap for a full-stack social media account marketplace and growth platform.

---

## Vision

A secure, scalable platform where users can:

- **Buy verified social media accounts** — Purchased from trusted suppliers with automated handover
- **Purchase boosting services** — Followers, likes, views, engagement from external suppliers
- **Track orders in real time** — Live status, delivery estimates, and notifications
- **Manage balances & payments** — Crypto-native payments with clear accounting

The system bridges users, external supplier APIs, payments, and job queues to deliver fast, reliable, and auditable transactions end-to-end.

### One-Line System Summary

```
User → Frontend → API → Pricing Logic → Supplier API → Delivery → Email + Dashboard → Admin Control
```

*We're building this step by step. Some tools are already in place; others will be added as we progress.*

---

## Tools & Their Roles

| Tool | Role |
|------|------|
| **Next.js (App Router)** | Builds the frontend UI and backend APIs in one full-stack framework |
| **Tailwind CSS** | Styles the interface quickly with utility-based CSS |
| **shadcn/ui** | Provides clean, modern, reusable UI components (buttons, dialogs, tables, forms) |
| **Better Auth** | Handles user authentication (login, signup, sessions, security) |
| **Neon (PostgreSQL)** | Stores all core data: users, orders, wallets, pricing, logs, transactions |
| **Drizzle ORM** | Makes it easy and safe to interact with the database using TypeScript |
| **Redis** | Caches data and stores background job states for speed |
| **BullMQ** | Handles background tasks (processing purchases, calling supplier APIs, sending emails) |
| **Cron Jobs** | Runs scheduled tasks (price syncing, stock updates, cleaning logs, order checks) |
| **Cryptomus** | Handles crypto payments, wallet funding, and transaction verification |
| **Supplier APIs** | Provide social media accounts and boosting services |
| **Vercel** | Deploys and hosts the frontend and backend APIs |

---

## Core Capabilities

### 1. Account Marketplace

- Verified social media accounts (e.g. Instagram, TikTok, Twitter/X) listed for sale
- Supplier-origin metadata (followers, engagement, niche, age)
- Trust signals and verification badges
- Secure handover flow post-purchase

### 2. Boosting Services

- Services such as followers, likes, views, comments, story views
- Per-platform, per-service catalog
- Tiered packages and bulk pricing
- Automated fulfillment via supplier APIs

### 3. Order Processing

- Order creation, payment confirmation, and supplier dispatching
- Job queues for async processing and retries
- Status updates (pending → paid → processing → completed/failed)
- Webhooks and callbacks for supplier events

### 4. Payments

- Crypto payments (e.g. USDT, USDC, BTC)
- Balance/wallet management for users
- Automated pricing and margin logic
- Escrow / settlement flows for suppliers

### 5. User Experience

- Clean dashboard for listings, orders, balance, and history
- Real-time status and notifications
- Admin panel for catalog, suppliers, pricing, and support

---

## Technical Architecture

### External Integrations

| Component      | Purpose                              |
|----------------|--------------------------------------|
| **Supplier APIs** | Order fulfillment, status, webhooks |
| **Crypto gateways** | Payment acceptance, balances       |
| **Job queues** | Background processing (Bull/BullMQ, Redis) |
| **Caching**    | Redis for listings, pricing, status  |

### System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Dashboard, Admin, Public catalog)                     │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│  API Layer (Next.js API Routes / Server Actions)                 │
└─────────────────────────────────────────────────────────────────┘
                                │
┌──────────────┬──────────────┬──────────────┬────────────────────┐
│  Auth        │  Orders      │  Payments    │  Supplier Adapters  │
│  (Better Auth)│  (Queue)    │  (Crypto)    │  (API clients)     │
└──────────────┴──────────────┴──────────────┴────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│  Database (Postgres/Neon) + Cache (Redis)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Subsystems

1. **Catalog service** — Listings, services, pricing, inventory
2. **Order service** — Lifecycle, queue jobs, status, events
3. **Payment service** — Invoices, balances, crypto, settlements
4. **Supplier service** — Adapters, mapping, webhooks, retries
5. **Admin service** — Moderation, pricing, supplier config, reporting

---

## Data Model (Conceptual)

| Entity        | Purpose                                           |
|---------------|---------------------------------------------------|
| **User**      | Buyers, balances, sessions (already in place)     |
| **Listing**   | Account listings or boosting services             |
| **Order**     | Purchases, status, supplier refs                  |
| **Balance**   | User wallets, crypto, transactions                |
| **Supplier**  | API config, credentials, capabilities             |
| **Pricing**   | Rules, margins, tiers, automation                  |
| **Transaction** | Deposits, withdrawals, order payments            |
| **Webhook log** | Supplier callbacks for debugging/audit           |

---

## Security & Compliance

- **Auth** — Better Auth with strong sessions, MFA-ready
- **Secrets** — Supplier keys and payment credentials in env/vault
- **Audit trail** — Orders, transactions, admin actions logged
- **Rate limits** — Protect API and payment endpoints
- **Platform policies** — Align with TOS of social platforms where applicable

---

## Scalability Considerations

| Area        | Approach                                         |
|-------------|--------------------------------------------------|
| **Caching** | Redis for hot data (listings, pricing, status)   |
| **Queues**  | Redis-backed job queue for order processing      |
| **DB**      | Indexes on orders, user, status, timestamps      |
| **APIs**    | Supplier adapters with timeouts and retries      |
| **Payments**| Non-blocking flows, idempotency for webhooks     |

---

## Planning Phases

### Phase 1 — Foundation

- [ ] Core data schema (listings, orders, suppliers, balances)
- [ ] Auth and role model (user, admin)
- [ ] Basic dashboard layout and navigation
- [ ] Admin: supplier CRUD, credentials storage

### Phase 2 — Catalog & Orders

- [ ] Listing types (accounts vs services)
- [ ] Pricing model and automation rules
- [ ] Order creation and basic status flow
- [ ] Job queue integration for order processing

### Phase 3 — Supplier Integration

- [ ] Supplier adapter interface
- [ ] First supplier API integration
- [ ] Webhook handling for status updates
- [ ] Error handling and retries

### Phase 4 — Payments

- [ ] Crypto gateway integration
- [ ] Balance management and deposits
- [ ] Order payment flow and escrow logic
- [ ] Supplier payout / settlement logic

### Phase 5 — Experience & Polish

- [ ] Real-time status updates (polling or websockets)
- [ ] Notifications (email, in-app)
- [ ] Search, filters, and discovery
- [ ] Analytics and reporting

---

## Stack Status

| Status | Tool |
|--------|------|
| ✓ In place | Next.js (App Router), Tailwind, shadcn/ui, Better Auth, Neon, Drizzle ORM |
| To add | Redis, BullMQ, Cron Jobs, Cryptomus, Supplier API clients |
| Deploy | Vercel |

---

## Getting Started (Development)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Admin Setup

1. Run `npm run db:push` to apply schema (admin, admin_session, admin_settings tables).

2. Seed the default admin (only works when no admin exists):
   ```bash
   curl -X POST http://localhost:3000/api/admin/seed
   ```
   Creates admin with username `admin` and password `admin123`. Stored in the database.
   For production, set `ADMIN_SEED_SECRET` in env and pass it: `curl -X POST -d '{"secret":"your-secret"}' -H "Content-Type: application/json" http://localhost:3000/api/admin/seed`

3. Login at [http://localhost:3000/admin/login](http://localhost:3000/admin/login). Change the password after first login.

---

## Next Steps

1. Lock in Phase 1 tasks and schema
2. Map supplier APIs and design the adapter interface
3. Integrate Cryptomus for crypto payments
4. Add Redis + BullMQ for caching and job queues
5. Set up Cron Jobs for price sync, stock updates, and maintenance
