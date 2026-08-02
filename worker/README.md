# Momentum background push — Cloudflare Worker

This tiny Worker sends your Momentum reminders as **Web Push** notifications on a
schedule, so they arrive even when the app is closed. It's the only way iOS lets
a web app notify you in the background (Apple requires pushes to come from a
server — a static GitHub Pages site can't do it alone).

Deploy it once. It's free for personal use. Your habit data never leaves your
device — the Worker only stores a push subscription and a list of reminder times.

## What you need
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Node.js (for `npx`)
- Momentum installed to your iPhone Home Screen (iOS 16.4+), notifications allowed

## Steps

### 1. Install Wrangler and generate VAPID keys
```bash
npm install -g wrangler
npx web-push generate-vapid-keys
```
Copy the **Public Key** and **Private Key** (both base64url strings).

### 2. Log in and create the KV store
```bash
cd worker
wrangler login
wrangler kv namespace create SUBS
```
Paste the returned `id` into `wrangler.toml` (replace `PASTE_YOUR_KV_NAMESPACE_ID_HERE`).

### 3. Add your keys
In `wrangler.toml`:
- `VAPID_PUBLIC` = your public key
- `VAPID_SUBJECT` = `mailto:you@example.com`

Store the private key as a secret (never commit it):
```bash
wrangler secret put VAPID_PRIVATE
# paste the private key when prompted
```

### 4. Deploy
```bash
wrangler deploy
```
Wrangler prints your Worker URL, e.g. `https://momentum-push.your-name.workers.dev`.

### 5. Connect the app
In Momentum → **Settings → Background reminders (beta)**:
1. Open **Server settings**.
2. Paste the **Worker URL** and the **VAPID public key**.
3. Flip the **Background reminders** toggle on (allow notifications if asked).

You're done. The app uploads your reminder schedule (habit times, morning digest,
evening nudge, weekly summary, and fasting window) with your timezone, and the
Worker pushes each at the right local time. Whenever you change reminders, the app
re-syncs automatically.

Optional check: visit `https://<your-worker>/health` — it should return
`{ "ok": true, "publicKey": "..." }`.

## Notes
- The scheduler checks every minute and de-dupes so each reminder fires once/day.
- Times use your device timezone (sent on every sync).
- Background pushes are informational (the server can't see completion status);
  the app's on-open catch-up stays exact.
- New phone or reinstall → just toggle Background reminders on again.
- To stop, toggle it off (removes your subscription) or delete the Worker.


## (Optional) Google Health / Fitbit activity import

The same Worker can proxy the **Google Health API** so Momentum can pull your
Fitbit steps/workouts. The client *secret* lives here as a Worker secret and is
never exposed to the browser. The app does the Google consent redirect (with
PKCE) and sends the resulting code here to be exchanged.

### Setup
1. In [Google Cloud Console](https://console.cloud.google.com/): create a
   project, enable the **Google Health API**, configure the OAuth consent
   screen (External), add yourself as a **Test user**, and add the scope
   `.../auth/googlehealth.activity_and_fitness.readonly`.
2. Create an **OAuth client ID** → **Web application**. Add your Momentum URL
   (e.g. `https://<you>.github.io/momentum/`) as an **Authorized redirect URI**.
3. Store the credentials as Worker secrets, then redeploy:
   ```bash
   wrangler secret put GOOGLE_CLIENT_ID
   wrangler secret put GOOGLE_CLIENT_SECRET
   wrangler deploy
   ```
4. In Momentum → Settings, make sure the Worker URL is set (Background
   reminders), then open **⌚ Google Health / Fitbit** and tap **Connect**.

### Endpoints added
- `GET  /google/config` → `{ clientId }` (so the app builds the consent URL)
- `POST /google/token` → exchanges an auth `code` (+ PKCE verifier) for tokens
- `POST /google/refresh` → refreshes an expired access token
- `POST /google/health` → proxies a read-only GET to `health.googleapis.com`
  (path is validated to the `v4/users/...` surface only)

Tokens are stored per-device in the browser (like OneDrive), not on the Worker.
