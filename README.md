# Momentum

A personal habit, fitness, nutrition, and supplements tracker that works on **iPhone and web** as a Progressive Web App (PWA). Data lives locally; optional cross-device sync via a private GitHub Gist.

## Features

- 🎯 **Habits** — grouped by category (Fitness / Nutrition / Sleep / Supplements / Custom), with per-day-of-week scheduling and time-of-day blocks.
- ✅ **Two habit types**
  - **Check** — yes/no (e.g. "Lights out by 10:30 PM")
  - **Count** — with a target and unit (e.g. "10 000 steps", "190 g protein", "3500 ml water", "30 min stair climber")
- 📅 **Today** — grouped by time block, tap circle or +/− stepper.
- 📊 **Weekly report** — adherence %, check-ins, best streak, per-day adherence, per-habit grid.
- 📈 **Progress** — weekly weight / waist / energy / strength / notes, with summary stats (starting weight, latest, total change, avg weekly change, waist change, avg energy) and a weight trend chart.
- ☁️ **Cross-device sync** — optional. Bring your own GitHub Personal Access Token. Data pushed to a private Gist. Merges are id-keyed with tombstones for deletes.
- 🌗 **Dark mode** — auto by default, or force light/dark.
- 💾 **Backup** — export / import JSON any time.
- 📱 **Installable** — Add to Home Screen on iPhone Safari for full-screen app experience.

## Run locally

```bash
python -m http.server 5173
```

Open `http://localhost:5173`. Service workers need `http://localhost` or HTTPS.

## Set up sync between devices

1. On GitHub, go to **Settings → Developer settings → Personal Access Tokens**. Create a token with **only** the `gist` scope. Copy it.
2. In Momentum → **Settings → ☁️ Sync across devices** — paste the token, tap **Push now**. This creates a new private Gist and fills in the Gist ID.
3. On your second device (iPhone Safari → Add to Home Screen), install the app, then open **Settings → Sync**. Paste the same token and Gist ID, tap **Pull**.
4. Turn on **Auto-sync** on each device so future changes propagate automatically.

Note: Data is stored as plain JSON in a **private** Gist. Only requests with your token can access it. Treat the token like a password.

## Deploy to GitHub Pages

1. Push this folder to a new GitHub repo.
2. Repo → **Settings → Pages → Deploy from a branch**, select `main` / `/ (root)`.
3. Live at `https://<user>.github.io/<repo>/` in a minute. Open in Safari on iPhone to install.

## Versioning (bump on every push)

The app version lives in `version.js` (single source of truth — the page shows it
in Settings → About, and the service worker builds its cache name from it). Bump it
on every deploy so the displayed version and the cache always change:

```bash
node bump.js        # increments the patch: 4.0.1 → 4.0.2
git add .
git commit -m "…"
git push
```

## Storage

All app data lives in `localStorage` under `ht_data` as plain JSON. Sync setup:
- `ht_sync_token` — your GitHub PAT
- `ht_sync_gist_id` — target Gist
- `ht_sync_enabled`, `ht_last_synced`, `ht_last_synced_hash`

## Layout

```
index.html         # markup (sidebar + pages)
styles.css         # theme, layout, dark mode
app.js             # sync + all app logic
sw.js              # offline service worker
manifest.json      # PWA manifest
icons/             # PWA icons
```
