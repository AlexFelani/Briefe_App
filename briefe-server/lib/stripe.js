"use strict";
// Stripe über die REST-Schnittstelle (ohne SDK)
const crypto = require("crypto");
function form(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.join("&");
}
async function stripe(cfg, path, params, { method = "POST", idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${cfg.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const r = await fetch(`${cfg.STRIPE_BASE}/v1/${path}`, { method, headers, body: method === "GET" ? undefined : form(params || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j?.error?.message || "stripe " + r.status); e.status = r.status; throw e; }
  return j;
}
// Prüft die Signatur eines Webhooks (Header "Stripe-Signature": t=…,v1=…)
function verifyWebhook(rawBody, header, secret, toleranceSec = 300, now = Date.now()) {
  const parts = Object.fromEntries(String(header || "").split(",").map((p) => p.split("=")).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = String(header || "").split(",").filter((p) => p.trim().startsWith("v1=")).map((p) => p.trim().slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}
module.exports = { stripe, verifyWebhook, form };
