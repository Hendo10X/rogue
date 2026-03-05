# Order Worker

Background worker for processing marketplace orders (supplier purchases).

## Setup

1. **Redis**: BullMQ requires a Redis connection. Get `UPSTASH_REDIS_URL` from Upstash Console → Redis → Connect → Node. Add to `.env`:

   ```
   UPSTASH_REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
   ```

2. **Run the worker** (in a separate terminal):

   ```bash
   npm run worker
   ```

   Or with tsx directly:

   ```bash
   npx tsx workers/order-worker.ts
   ```

## Flow

1. User places order → API debits wallet, creates order (pending), enqueues job
2. Worker picks up job → purchases from supplier → creates delivery record
3. On success: order → completed, credentials stored in account_delivery
4. On failure: order → failed, wallet refunded automatically

## Deployment

Run the worker as a separate process (VPS, Railway, Render, etc.). It is not deployed with Next.js on Vercel.
