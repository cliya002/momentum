// Momentum — Web Push scheduler (Cloudflare Worker)
// -----------------------------------------------------------------------------
// Sends habit / fasting / weekly reminders as Web Push notifications on a
// schedule, so they arrive even when the Momentum PWA is closed. This is the
// only way iOS lets a web app notify you in the background (Apple requires the
// push to originate from a server).
//
// Endpoints (called by the app):
//   GET  /health        -> { ok, publicKey }
//   POST /subscribe      { subscription, tz, schedule:[{time,days,title,body}] }
//   POST /unsubscribe    { endpoint }
//   POST /test           { subscription }   (immediate test push)
//
// Cron (every minute): fires any schedule entry whose local time == now and
// hasn't been sent yet today.
//
// Config (wrangler.toml / secrets):
//   VAPID_PUBLIC   var    — base64url VAPID public key (65-byte point)
//   VAPID_PRIVATE  secret — base64url VAPID private key (32-byte d)
//   VAPID_SUBJECT  var    — "mailto:you@example.com"
//   KV binding: SUBS
// -----------------------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    try {
      if (url.pathname === "/health") {
        return json({ ok: true, publicKey: env.VAPID_PUBLIC });
      }
      if (url.pathname === "/subscribe" && request.method === "POST") {
        const body = await request.json();
        if (!body.subscription || !body.subscription.endpoint) return json({ error: "missing subscription" }, 400);
        // Key by a stable device id when provided so re-registering the same
        // device OVERWRITES its entry instead of creating a duplicate.
        const id = await keyFor(body);
        const prev = safeParse(await env.SUBS.get("sub:" + id));
        const rec = {
          deviceId: body.deviceId || null,
          subscription: body.subscription,
          tz: typeof body.tz === "string" ? body.tz : "UTC",
          schedule: Array.isArray(body.schedule) ? body.schedule.slice(0, 100) : [],
          sent: (prev && prev.sent) || {},
          updated: Date.now(),
        };
        await env.SUBS.put("sub:" + id, JSON.stringify(rec));
        return json({ ok: true, id, entries: rec.schedule.length });
      }
      if (url.pathname === "/unsubscribe" && request.method === "POST") {
        const body = await request.json();
        const id = await keyFor(body);
        if (id) await env.SUBS.delete("sub:" + id);
        return json({ ok: true });
      }
      if (url.pathname === "/reset" && (request.method === "POST" || request.method === "GET")) {
        let cursor, n = 0;
        do {
          const list = await env.SUBS.list({ prefix: "sub:", cursor });
          cursor = list.list_complete ? null : list.cursor;
          for (const k of list.keys) { await env.SUBS.delete(k.name); n++; }
        } while (cursor);
        return json({ ok: true, cleared: n });
      }
      if (url.pathname === "/debug") {
        const subs = []; let cursor;
        do {
          const list = await env.SUBS.list({ prefix: "sub:", cursor });
          cursor = list.list_complete ? null : list.cursor;
          for (const k of list.keys) {
            const rec = safeParse(await env.SUBS.get(k.name));
            subs.push({
              id: k.name,
              tz: rec && rec.tz,
              schedule: rec && rec.schedule ? rec.schedule.map((e) => ({ time: e.time, title: e.title, days: e.days })) : [],
            });
          }
        } while (cursor);
        return json({ count: subs.length, subs });
      }
      if (url.pathname === "/test" && request.method === "POST") {
        const body = await request.json();
        if (!body.subscription) return json({ error: "missing subscription" }, 400);
        const r = await sendPush(env, body.subscription, {
          title: "🔔 Background test",
          body: "Momentum background push is working.",
          tag: "ht-push-test",
        });
        return json({ ok: r !== false, result: r });
      }
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSchedule(env));
  },
};

async function runSchedule(env) {
  let cursor;
  do {
    const list = await env.SUBS.list({ prefix: "sub:", cursor });
    cursor = list.list_complete ? null : list.cursor;
    for (const k of list.keys) {
      const rec = safeParse(await env.SUBS.get(k.name));
      if (!rec || !rec.subscription) continue;
      const { hhmm, weekday, dateStr } = localParts(rec.tz);
      rec.sent = rec.sent || {};
      let changed = false, gone = false;
      for (const entry of rec.schedule || []) {
        if (!entry || entry.time !== hhmm) continue;
        if (Array.isArray(entry.days) && entry.days.length && !entry.days.includes(weekday)) continue;
        const sk = entry.time + "|" + (entry.title || "");
        if (rec.sent[sk] === dateStr) continue; // already sent today
        const res = await sendPush(env, rec.subscription, {
          title: entry.title || "Momentum",
          body: entry.body || "",
          tag: entry.tag || ("ht-push-" + entry.time),
          ids: Array.isArray(entry.ids) ? entry.ids : [],
        });
        if (res === "gone") { gone = true; break; }
        rec.sent[sk] = dateStr;
        changed = true;
      }
      if (gone) { await env.SUBS.delete(k.name); continue; }
      if (changed) {
        for (const key of Object.keys(rec.sent)) if (rec.sent[key] !== dateStr) delete rec.sent[key];
        await env.SUBS.put(k.name, JSON.stringify(rec));
      }
    }
  } while (cursor);
}

// Local wall-clock parts for a timezone.
function localParts(tz) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "UTC", hour12: false,
    hour: "2-digit", minute: "2-digit", weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const p = {};
  for (const part of fmt.formatToParts(new Date())) p[part.type] = part.value;
  const hour = p.hour === "24" ? "00" : p.hour;
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hhmm: `${hour}:${p.minute}`, weekday: wd[p.weekday] ?? 0, dateStr: `${p.year}-${p.month}-${p.day}` };
}

// ---- Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) ------------------------
async function sendPush(env, subscription, payloadObj) {
  const endpoint = subscription.endpoint;
  const audience = new URL(endpoint).origin;
  const jwt = await makeVapidJwt(audience, env.VAPID_SUBJECT || "mailto:admin@example.com", env.VAPID_PUBLIC, env.VAPID_PRIVATE);
  const plaintext = new TextEncoder().encode(JSON.stringify(payloadObj));
  const body = await encryptPayload(plaintext, subscription.keys.p256dh, subscription.keys.auth);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Urgency": "normal",
      "Authorization": `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`,
    },
    body,
  });
  if (res.status === 404 || res.status === 410) return "gone";
  return res.ok;
}

async function makeVapidJwt(aud, sub, pub, priv) {
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })}`;
  const key = await importVapidPrivate(priv, pub);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url(new Uint8Array(sig))}`; // Web Crypto returns raw r||s = JOSE
}

async function importVapidPrivate(privB64, pubB64) {
  const d = unb64url(privB64);
  const pub = unb64url(pubB64); // 0x04 || X(32) || Y(32)
  const jwk = { kty: "EC", crv: "P-256", d: b64url(d), x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33, 65)), ext: true, key_ops: ["sign"] };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function encryptPayload(plaintext, p256dhB64, authB64) {
  const uaPublic = unb64url(p256dhB64);
  const authSecret = unb64url(authB64);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const asPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", asPair.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asPair.privateKey, 256));

  const ikm = await hkdf(authSecret, ecdh, concat(new TextEncoder().encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  const record = concat(plaintext, new Uint8Array([2])); // last-record delimiter
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, record));

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, ct);
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

function concat(...arrs) {
  let len = 0; for (const a of arrs) len += a.length;
  const out = new Uint8Array(len); let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
function b64url(bytes) {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hashEndpoint(ep) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ep));
  return b64url(new Uint8Array(d)).slice(0, 32);
}
// Stable storage key: prefer the app-provided device id, else hash the endpoint.
async function keyFor(body) {
  if (body && typeof body.deviceId === "string" && body.deviceId) return "dev_" + body.deviceId.slice(0, 40);
  const ep = body && (body.endpoint || (body.subscription && body.subscription.endpoint));
  return ep ? await hashEndpoint(ep) : null;
}
function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });
}
