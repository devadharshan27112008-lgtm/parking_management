# Smart Parking - Website

This is the standalone website half of your parking system. The ESP32 no
longer hosts any web pages itself — it just talks to this website's API.

## How the pieces fit together

- **ESP32** reads sensors, computes pricing, controls gates/LCDs — same as
  before. Every ~2 seconds it POSTs its status to `/api/report` and reads
  back current pricing plus "a payment was just approved for slot X".
- **This website** shows the public status/payment page, the owner admin
  page, and stores everything in a small Redis database (Upstash) since
  Vercel/Netlify functions don't keep anything in memory between requests.
- **Payment is fully simulated (~80% approval)** — no real gateway, no API
  keys, no checksums. `pages/api/pay.js` creates a fake order and then
  "confirms" it with a random pass/fail, updating Redis exactly the way a
  real gateway's webhook would. Swap it for a real gateway (Cashfree,
  Instamojo, Razorpay, etc.) later — everything else stays the same.

## 1. Create a free Redis database

1. Go to https://console.upstash.com/redis and create a free database.
2. Copy the **REST URL** and **REST TOKEN** it gives you.

## 2. Set environment variables

In your Vercel or Netlify project settings, add:

| Variable | Value |
|---|---|
| `KV_REST_API_URL` | the Upstash REST URL |
| `KV_REST_API_TOKEN` | the Upstash REST token |
| `DEVICE_API_KEY` | any long random string you make up — the ESP32 must send this exact string in its requests |
| `ADMIN_USER` | your admin username |
| `ADMIN_PASS` | your admin password |

No payment-gateway keys are needed right now — test mode only.

## 3. Deploy

**Vercel:** push this folder to a GitHub repo, then "Import Project" in
Vercel — it auto-detects Next.js, no config needed.

**Netlify:** same, but install the Next.js plugin (already referenced in
`netlify.toml`) — Netlify will prompt you to add it, or it installs
automatically from the toml file.

Either way you'll get a URL like `https://your-project.vercel.app`.

## 4. Point the ESP32 at it

In the `.ino` sketch, set:

```cpp
const char* SERVER_BASE_URL = "https://your-project.vercel.app";
const char* DEVICE_API_KEY  = "the same random string you put in env vars";
```

## API reference

- `POST /api/report` — device → website, needs header `x-api-key`. Saves
  the ESP32's live slot status and returns current pricing plus any
  payment confirmation the device still needs to apply.
- `GET  /api/status` — public, polled by `pages/index.js` every 2s.
- `POST /api/pay` — **simulated payment, test mode only.**
  - Step 1: `{ slot: 1|2 }` → creates a fake order, returns `{ orderId, amount }`
  - Step 2: `{ orderId, action: "confirm" }` → "runs" the payment
    (~80% success chance), returns `{ status: "success"|"failed" }`,
    queues a `{ id, amount }` confirmation for the device, and logs a
    history entry.
- `POST /api/admin/login` — `{ username, password }`, sets a session cookie.
- `GET  /api/admin/logout` — clears the session.
- `GET  /api/admin/me` — `{ loggedIn, username }`.
- `POST /api/admin/setprice` — `{ base, mintime, rate, unit }` (requires login).
- `GET  /api/admin/history` — last 50 payments (requires login).

## Pages

- `/` — public status page: shows both slots live, lets a driver pay
  (test mode) when a slot has money due.
- `/admin` — owner dashboard: login, edit pricing, view payment history.

## Data model in Redis

- `slot:1`, `slot:2` — latest status reported by the device.
- `pricing` — current base/rate/mintime/unit.
- `pending:slot:1`, `pending:slot:2` — `{ id, amount }` waiting for the
  device to pick up and apply; cleared once the device acks it.
- `order:<orderId>` — simulated payment order state.
- `history` — list of completed, paid sessions.
- `session:<token>` — admin login sessions (8hr expiry).

This project has been build-tested end-to-end (`npm run build` passes
cleanly) with all 9 API routes and both pages compiling successfully.
