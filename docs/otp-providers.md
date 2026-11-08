# OTP number providers: GrizzlySMS and SMSPool

Researched 2026-11-08. These two replace 5sim.net for Tools → OTP numbers.

## GrizzlySMS (grizzlysms.com)

- **API:** the SMS-Activate protocol on `GET https://api.grizzlysms.com/stubs/handler_api.php?api_key=…&action=…`. Answers are plain text (`ACCESS_NUMBER:id:phone`) or JSON. Spec: `https://api.grizzlysms.com/docs/client/swagger.json`.
- **Currency:** USD. The site lists prices like `$ 0.52`.
- **IDs:** SMS-Activate country IDs (numbers) and service codes (`wa`, `tg`, `fb`…). Lists come from `getCountries` (`eng` name) and `getServicesList`.
- **Price levels:** a country/app often has several price levels from different providers (e.g. US Facebook: 20 at $0.52, 65 at $0.325). `getPricesV2` gives `price → count`. We price from the cheapest level that has numbers and pass `maxPrice` to `getNumber`, the same lesson as 5sim operators.
- **Countries:** "USA" and "USA (virtual)" are separate countries. Virtual numbers are cheap but often refused by WhatsApp and banks, so we keep them separate and label them "(virtual)".
- **Status:** `getStatus` → `STATUS_WAIT_CODE`, `STATUS_WAIT_RETRY:code`, `STATUS_WAIT_RESEND`, `STATUS_OK:code`, `STATUS_CANCEL`. `setStatus` with `8` = cancel (refunds us), `6` = finish, `3` = ask for another code.
- **Errors:** `NO_NUMBERS` (sold out), `NO_BALANCE`, `BAD_KEY`, `SERVICE_UNAVAILABLE_REGION`.
- **Webhooks:** up to 3 URLs, set in the Grizzly profile, with no published schema. We don't use them; status is checked when a customer has a waiting number open, as with 5sim.

## SMSPool (smspool.net)

- **API:** native REST at `https://api.smspool.net/…` with `Authorization: Bearer <key>`, form-encoded POSTs, JSON answers. Reference: `https://api.smspool.net/docs` (OpenAPI at `/openapi.json`). It also has an SMS-Activate compatibility layer at `/stubs/handler_api`, but that hides pools and success rates, so we use the native API.
- **Currency:** USD (`"cost": "0.24"`, refunds "0.24 dollars").
- **IDs:** its own numeric IDs. Countries come from `/country/retrieve_all` (with ISO `short_name`), services from `/service/retrieve_all`.
- **Pool pricing (the unusual part):** one country/app is sold from several *pools* (Charlie, Foxtrot, Mike, Romeo, Sierra, Tango…), each with its own price, stock and success rate. `/request/pricing {country}` lists every service × pool price. `/request/price {country, service}` gives the cheapest price, the dearest price and a **success rate**. `/sms/stock {country, service}` gives stock. `/purchase/sms` takes `max_price` and `pricing_option` (0 = cheapest pool, 1 = highest success rate).
- **Success rate matters:** a cheap pool can mostly fail. Example (live, 2026-11-08): USA WhatsApp is listed in 3 pools at $1.56 / $1.97 / $2.41 with 6,587 numbers, but its success rate is only **54%**. So SMSPool isn't really *missing* USA WhatsApp today. It sells it, but roughly half the numbers never get the code. That's why SMSPool is only used for a country/app when its success rate is at least the admin's minimum (default 60%). Below that, Grizzly or nobody sells it.
- **Status:** `/sms/check {orderid}` → `status` 1 = waiting, 3 = code received (`sms`, `full_sms`), 6 = refunded. `/sms/cancel {orderid}` refunds. Numbers expire after 20 minutes (`expires_in: 1200`).
- **Rate limits:** 600/min per endpoint, but `/sms/check` and `/sms/stock` allow 200/min and `/sms/cancel` 150/min. Without a key: 20/min per IP. **150 failed orders in 5 minutes pauses ordering for 5 minutes, and a success rate under 10% pauses it for up to 6 hours.** So we check stock before buying and never retry a failed buy in a loop.

## How Rogue picks a provider

For each country + app the customer picks:

1. Ask every enabled provider for a live quote: Grizzly's cheapest level with stock; SMSPool's cheapest price, but only if stock > 0 and the success rate meets the minimum.
2. Use the cheapest quote. On a tie, use Grizzly (no success-rate risk).
3. Buy with a max price equal to that quote, so the provider can't pick a dearer pool or level than the customer paid for.

Countries are matched across providers by ISO code, and apps by name (`Whatsapp` / `WhatsApp`, `Instagram + Threads` / `Instagram`…). An app only one provider sells is still listed.
