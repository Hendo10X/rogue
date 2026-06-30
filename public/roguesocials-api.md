# Rogue Socials API — Reference for AI Agents

This document describes the Rogue Socials public API. It is written to be
consumed by an AI agent or developer building an integration (e.g. a reseller
bot). Follow it literally.

- **Base URL:** `https://roguesocials.com` (replace with the deployment's own
  domain if different). All API paths below are relative to this base.
- **Protocol:** HTTPS only. Requests and responses are JSON.
- **Currency:** All money values are in Nigerian Naira (NGN) unless stated.
- **Versioning:** All endpoints live under `/api/v1`.

---

## 1. Authentication

Every request requires an API key. A user generates one in the Rogue Socials
dashboard under **Settings → API Access**. Keys begin with `rogue_`.

Send the key on **every** request using either header:

```
Authorization: Bearer rogue_xxxxxxxxxxxxxxxxxxxxxxxx
```

or

```
X-API-Key: rogue_xxxxxxxxxxxxxxxxxxxxxxxx
```

A missing or invalid key returns HTTP `401`:

```json
{ "error": "Invalid or missing API key. Pass it as 'Authorization: Bearer <key>'." }
```

The key is tied to one user account and that user's wallet. Orders are paid
from that wallet's NGN balance.

---

## 2. Conventions

- **Success:** the payload is wrapped in a `data` field. List endpoints may add
  a `count`.
- **Error:** the body is `{ "error": "<message>" }` with a non-2xx HTTP status.
- **Money:** strings or numbers representing NGN (e.g. `"900.00"`).
- Always check the HTTP status code before trusting the body.

### Error status codes

| Status | Meaning |
| ------ | ------- |
| 400 | Bad request — missing/invalid fields, or insufficient wallet balance |
| 401 | Missing or invalid API key |
| 404 | Service or order not found |
| 502 | Supplier rejected the order (the wallet is automatically refunded) |
| 500 | Unexpected server error |

---

## 3. Endpoints

### 3.1 List services

```
GET /api/v1/services
```

Returns the catalogue of boosting services with **your reseller pricing**.

**Query parameters (optional):**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `category` | string | Filter to one category (exact match). |
| `q` | string | Case-insensitive search over service name and category. |

**Example:**

```bash
curl "https://roguesocials.com/api/v1/services?q=instagram" \
  -H "Authorization: Bearer rogue_xxx"
```

**Response `200`:**

```json
{
  "data": [
    {
      "service": 123,
      "name": "Instagram Followers — Premium",
      "type": "Default",
      "category": "Instagram",
      "min": "10",
      "max": "100000",
      "refill": true,
      "cancel": false,
      "currency": "NGN",
      "rate_per_1000": 900.00,
      "website_rate_per_1000": 1800.00,
      "markup_percent": 30
    }
  ],
  "count": 1
}
```

Field notes:
- `service` — the numeric service id; pass it as `service` when ordering.
- `min` / `max` — allowed quantity bounds (strings of integers).
- `rate_per_1000` — **what you pay** per 1,000 units (already includes the
  reseller markup over supplier cost).
- `website_rate_per_1000` — the public website price, for reference only.
- `markup_percent` — the reseller markup currently applied over supplier cost.

### 3.2 Place an order

```
POST /api/v1/orders
Content-Type: application/json
```

Charges your wallet and submits the order to the supplier.

**Body:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `service` | number | yes | Service id from `/services`. |
| `link` | string | yes | Target profile/post/video URL. |
| `quantity` | number | yes | Desired quantity. Clamped to the service `min`/`max`. |

**Example:**

```bash
curl -X POST "https://roguesocials.com/api/v1/orders" \
  -H "Authorization: Bearer rogue_xxx" \
  -H "Content-Type: application/json" \
  -d '{ "service": 123, "link": "https://instagram.com/yourhandle", "quantity": 1000 }'
```

**Response `200`:**

```json
{
  "data": {
    "id": "b1f3c2a0-...",
    "external_order_id": 884512,
    "charge": "900.00",
    "currency": "NGN",
    "markup_percent": 30,
    "status": "processing"
  }
}
```

- `id` — Rogue Socials order id; use it with `GET /api/v1/orders/:id`.
- `charge` — amount debited from your wallet (NGN).
- `external_order_id` — the supplier's order id.

**Failure behaviour:**
- Insufficient balance → `400`, nothing is charged.
- Supplier rejects the order → `502`, and your wallet is **refunded
  automatically**. Do not retry blindly; check the `error` message first.

### 3.3 Get one order (live status)

```
GET /api/v1/orders/{id}
```

Returns the current status of one of your orders. Status is refreshed from the
supplier on each call when possible.

**Example:**

```bash
curl "https://roguesocials.com/api/v1/orders/b1f3c2a0-..." \
  -H "Authorization: Bearer rogue_xxx"
```

**Response `200`:**

```json
{
  "data": {
    "id": "b1f3c2a0-...",
    "service": 123,
    "service_name": "Instagram Followers — Premium",
    "link": "https://instagram.com/yourhandle",
    "quantity": 1000,
    "charge": "900.00",
    "currency": "NGN",
    "status": "completed",
    "external_status": "Completed",
    "external_order_id": 884512,
    "start_count": "5120",
    "remains": "0",
    "created_at": "2026-06-30T12:00:00.000Z"
  }
}
```

`status` is one of: `processing`, `completed`, `partial`, `cancelled`.

### 3.4 List your orders

```
GET /api/v1/orders
```

Returns your 100 most recent orders (newest first).

**Response `200`:**

```json
{
  "data": [
    {
      "id": "b1f3c2a0-...",
      "service": 123,
      "service_name": "Instagram Followers — Premium",
      "link": "https://instagram.com/yourhandle",
      "quantity": 1000,
      "charge": "900.00",
      "currency": "NGN",
      "status": "processing",
      "external_status": "In progress",
      "external_order_id": 884512,
      "created_at": "2026-06-30T12:00:00.000Z"
    }
  ]
}
```

### 3.5 Wallet balance

```
GET /api/v1/balance
```

**Response `200`:**

```json
{ "data": { "balance": "15400.00", "currency": "NGN" } }
```

If the balance is too low to cover an order, top up the wallet from the Rogue
Socials dashboard (card, bank transfer, or crypto). There is no API endpoint to
add funds.

---

## 4. Recommended agent workflow

1. `GET /api/v1/balance` — confirm there is enough NGN to cover the order.
2. `GET /api/v1/services?q=<platform/keyword>` — find the `service` id and read
   `rate_per_1000`, `min`, and `max`.
3. Compute the expected charge: `rate_per_1000 * (quantity / 1000)`.
4. `POST /api/v1/orders` with `service`, `link`, `quantity`.
5. Poll `GET /api/v1/orders/{id}` periodically until `status` is `completed`,
   `partial`, or `cancelled`. A sensible poll interval is 30–60 seconds.

### Rules and guidance for agents
- Always send the API key header on every request.
- Never assume a fixed price — read `rate_per_1000` from `/services` first, as
  prices change with the admin's markup and the FX rate.
- `quantity` is clamped server-side to the service's `min`/`max`; the actual
  charged quantity is reflected in the order record.
- On `502`, the order failed and you were refunded — surface the `error` to the
  user rather than retrying automatically.
- Treat all amounts as NGN.

---

## 5. Quick reference

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/v1/services` | List services + reseller pricing |
| POST | `/api/v1/orders` | Place an order (debits wallet) |
| GET | `/api/v1/orders` | List your recent orders |
| GET | `/api/v1/orders/{id}` | Live status of one order |
| GET | `/api/v1/balance` | Wallet balance |

Auth header (all requests): `Authorization: Bearer rogue_<key>`
