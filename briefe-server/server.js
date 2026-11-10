"use strict";
/* =====================================================================
   Briefe-App · Server
   KI-Zugang (Schlüssel bleibt hier) · Anmeldung (E-Mail-Link, LUKSO UP) · Zahlungen (Stripe)
   Erinnerungen (Web Push, Kalender-Abo) · Newsletter (Double-Opt-in) · Bewertungen
   Nur Node.js ≥ 22, keine Fremdpakete. Start: node --disable-warning=ExperimentalWarning server.js
   ===================================================================== */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { buildAiRequest, callModel, BadInput } = require("./lib/ai");
const { stripe, verifyWebhook } = require("./lib/stripe");
const { sendMail } = require("./lib/smtp");
const { verifyUp } = require("./lib/up");
const { sendPush } = require("./lib/webpush");
const mails = require("./lib/mails");
const { DavError, resolveBase, davList, davGet, davPut } = require("./lib/dav");

/* ---------- Konfiguration (Umgebungsvariablen oder Datei .env) ---------- */
function loadEnv(file) {
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch (e) {}
}
loadEnv(process.env.ENV_FILE || path.join(__dirname, ".env"));
const E = process.env;
const bool = (v, d) => (v === undefined || v === "" ? d : /^(1|true|yes|ja)$/i.test(v));
const cfg = {
  PORT: Number(E.PORT || 3000),
  APP_URL: (E.APP_URL || "http://localhost:5173").replace(/\/$/, ""),
  API_URL: (E.API_URL || `http://localhost:${E.PORT || 3000}`).replace(/\/$/, ""),
  DB_FILE: E.DB_FILE || path.join(__dirname, "data", "briefe.db"),
  // KI
  AI_PROVIDER: E.AI_PROVIDER || "bedrock",                       // "bedrock" (EU-Verarbeitung) oder "anthropic"
  ANTHROPIC_API_KEY: E.ANTHROPIC_API_KEY || "", ANTHROPIC_MODEL: E.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  ANTHROPIC_BASE: (E.ANTHROPIC_BASE || "https://api.anthropic.com").replace(/\/$/, ""),
  BEDROCK_REGION: E.BEDROCK_REGION || "eu-central-1", BEDROCK_MODEL: E.BEDROCK_MODEL || "eu.anthropic.claude-sonnet-5-5",
  BEDROCK_BASE: E.BEDROCK_BASE || "", AWS_ACCESS_KEY_ID: E.AWS_ACCESS_KEY_ID || "", AWS_SECRET_ACCESS_KEY: E.AWS_SECRET_ACCESS_KEY || "", AWS_SESSION_TOKEN: E.AWS_SESSION_TOKEN || "",
  // Preise und Gratis-Briefe (müssen zu AGB und App passen)
  PAYMENT_REQUIRED: bool(E.PAYMENT_REQUIRED, false), FREE_LETTERS: Number(E.FREE_LETTERS ?? 2), FREE_MAX_PAGES: Number(E.FREE_MAX_PAGES ?? 10),
  FREE_REQUIRES_LOGIN: bool(E.FREE_REQUIRES_LOGIN, true), BASE_PRICE_CENTS: Number(E.BASE_PRICE_CENTS ?? 200), EXTRA_PAGE_CENTS: Number(E.EXTRA_PAGE_CENTS ?? 10),
  BASE_PAGES: Number(E.BASE_PAGES ?? 10), MAX_PAGES: Number(E.MAX_PAGES ?? 300), WITHDRAWAL_DAYS: Number(E.WITHDRAWAL_DAYS ?? 14),
  SUB_ENABLED: bool(E.SUB_ENABLED, false), SUB_NAME: E.SUB_NAME || "Briefe-Abo", SUB_PRICE_CENTS: Number(E.SUB_PRICE_CENTS ?? 499),
  TERMS_VERSION: E.TERMS_VERSION || "Entwurf",
  // Stripe
  STRIPE_SECRET_KEY: E.STRIPE_SECRET_KEY || "", STRIPE_WEBHOOK_SECRET: E.STRIPE_WEBHOOK_SECRET || "", STRIPE_BASE: (E.STRIPE_BASE || "https://api.stripe.com").replace(/\/$/, ""),
  // E-Mail
  SMTP_HOST: E.SMTP_HOST || "", SMTP_PORT: E.SMTP_PORT || "587", SMTP_SECURE: E.SMTP_SECURE || "", SMTP_USER: E.SMTP_USER || "", SMTP_PASS: E.SMTP_PASS || "",
  MAIL_FROM: E.MAIL_FROM || "noreply@example.eu", MAIL_FROM_NAME: E.MAIL_FROM_NAME || "Briefe-App", OPERATOR_EMAIL: E.OPERATOR_EMAIL || "",
  // LUKSO
  LUKSO_RPC: { 42: E.LUKSO_RPC_MAINNET || "https://42.rpc.thirdweb.com", 4201: E.LUKSO_RPC_TESTNET || "https://rpc.testnet.lukso.network" },
  // Web Push
  VAPID_PUBLIC: E.VAPID_PUBLIC || "", VAPID_PRIVATE: E.VAPID_PRIVATE || "", VAPID_SUBJECT: E.VAPID_SUBJECT || "mailto:" + (E.OPERATOR_EMAIL || "kontakt@example.eu"),
  // Weitere Clouds: WebDAV-Weiterleitung (MagentaCLOUD, GMX, WEB.DE, HiDrive, Nextcloud) und Box-Anmeldung
  DAV_ENABLED: bool(E.DAV_ENABLED, true), DAV_MAX_MB: Number(E.DAV_MAX_MB ?? 25),
  DAV_TEST_INSECURE: bool(E.DAV_TEST_INSECURE, false), DAV_TEST_PRESETS: E.DAV_TEST_PRESETS ? JSON.parse(E.DAV_TEST_PRESETS) : null,   // nur für automatische Tests
  BOX_CLIENT_ID: E.BOX_CLIENT_ID || "", BOX_CLIENT_SECRET: E.BOX_CLIENT_SECRET || "", BOX_BASE: (E.BOX_BASE || "https://api.box.com").replace(/\/$/, ""),
  // Grenzen je Konto und Tag
  LIMITS: { extract: Number(E.LIMIT_EXTRACT ?? 40), ui: Number(E.LIMIT_UI ?? 80), search: Number(E.LIMIT_SEARCH ?? 300), caseName: Number(E.LIMIT_CASENAME ?? 300), perLetter: Number(E.LIMIT_PER_LETTER ?? 30) },
};
cfg.APP_ORIGIN = new URL(cfg.APP_URL).origin;
cfg.APP_HOST = new URL(cfg.APP_URL).host;
const aiReady = () => (cfg.AI_PROVIDER === "bedrock" ? !!(cfg.AWS_ACCESS_KEY_ID && cfg.AWS_SECRET_ACCESS_KEY) : !!cfg.ANTHROPIC_API_KEY);

/* ---------- Datenbank ---------- */
fs.mkdirSync(path.dirname(cfg.DB_FILE), { recursive: true });
const db = new DatabaseSync(cfg.DB_FILE);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, created INTEGER, email TEXT UNIQUE, up TEXT UNIQUE, free_used INTEGER DEFAULT 0, merged_into TEXT);
CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, account TEXT, created INTEGER, last INTEGER);
CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, account TEXT, exp INTEGER);
CREATE TABLE IF NOT EXISTS email_tokens (hash TEXT PRIMARY KEY, account TEXT, email TEXT, mode TEXT, exp INTEGER, used INTEGER DEFAULT 0, created INTEGER);
CREATE TABLE IF NOT EXISTS unlocks (account TEXT, letter TEXT, kind TEXT, order_id TEXT, at INTEGER, used INTEGER DEFAULT 0, PRIMARY KEY (account, letter));
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, account TEXT, kind TEXT, letter TEXT, title TEXT, pages INTEGER, amount_cents INTEGER, status TEXT,
  stripe_session TEXT, payment_intent TEXT, subscription TEXT, created INTEGER, paid_at INTEGER, waiver_at INTEGER, terms_version TEXT,
  withdrawn_at INTEGER, refunded INTEGER DEFAULT 0, cancelled_at INTEGER, ends_at INTEGER, email TEXT);
CREATE TABLE IF NOT EXISTS usage (account TEXT, day TEXT, kind TEXT, n INTEGER, PRIMARY KEY (account, day, kind));
CREATE TABLE IF NOT EXISTS push (key TEXT PRIMARY KEY, subscription TEXT, schedule TEXT, updated INTEGER);
CREATE TABLE IF NOT EXISTS cals (token TEXT PRIMARY KEY, ics TEXT, at INTEGER);
CREATE TABLE IF NOT EXISTS newsletter (email TEXT PRIMARY KEY, status TEXT, token_hash TEXT, requested INTEGER, confirmed INTEGER, unsubscribed INTEGER, consent TEXT, ip_hash TEXT);
CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, kind TEXT, v INTEGER, comment TEXT, lang TEXT, ui TEXT, model TEXT);
CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, at INTEGER);
`);
const q = (sql) => db.prepare(sql);
const one = (sql, ...a) => q(sql).get(...a);
const all = (sql, ...a) => q(sql).all(...a);
const run = (sql, ...a) => q(sql).run(...a);

/* ---------- Hilfen ---------- */
const now = () => Date.now();
const rid = (n = 32) => crypto.randomBytes(n).toString("base64url");
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const day = () => new Date().toISOString().slice(0, 10);
const orderId = (p) => p + "-" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
const validEmail = (s) => typeof s === "string" && s.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s);
class HttpError extends Error { constructor(status, code, data) { super(code); this.status = status; this.data = data; } }
const fail = (status, code, data) => { throw new HttpError(status, code, data); };
const priceCents = (pages) => cfg.BASE_PRICE_CENTS + Math.max(0, pages - cfg.BASE_PAGES) * cfg.EXTRA_PAGE_CENTS;
const clampPages = (p) => Math.min(cfg.MAX_PAGES, Math.max(1, Math.floor(Number(p) || 1)));

function resolveAccount(id) {
  let a = one("SELECT * FROM accounts WHERE id = ?", id);
  for (let i = 0; a && a.merged_into && i < 5; i++) a = one("SELECT * FROM accounts WHERE id = ?", a.merged_into);
  return a || null;
}
function auth(req, required = true) {
  const m = String(req.headers.authorization || "").match(/^Bearer (\S{20,})$/);
  const s = m && one("SELECT * FROM sessions WHERE hash = ?", sha(m[1]));
  if (!s) { if (required) fail(401, "session"); return null; }
  const acc = resolveAccount(s.account);
  if (!acc) { if (required) fail(401, "session"); return null; }
  if (acc.id !== s.account) run("UPDATE sessions SET account = ? WHERE hash = ?", acc.id, s.hash);
  if (now() - (s.last || 0) > 3600e3) run("UPDATE sessions SET last = ? WHERE hash = ?", now(), s.hash);
  return { acc, sessionHash: s.hash };
}
function countUse(account, kind, limit) {
  const r = one("SELECT n FROM usage WHERE account = ? AND day = ? AND kind = ?", account, day(), kind);
  if (r && r.n >= limit) fail(429, "limit");
  run("INSERT INTO usage (account, day, kind, n) VALUES (?, ?, ?, 1) ON CONFLICT(account, day, kind) DO UPDATE SET n = n + 1", account, day(), kind);
}
const ipBuckets = new Map();
function rateLimit(ip, cost = 1, perMin = 240) {
  const b = ipBuckets.get(ip) || { t: now(), n: perMin };
  b.n = Math.min(perMin, b.n + ((now() - b.t) / 60000) * perMin); b.t = now();
  if (b.n < cost) fail(429, "rate");
  b.n -= cost; ipBuckets.set(ip, b);
}
setInterval(() => { const lim = now() - 600000; for (const [k, b] of ipBuckets) if (b.t < lim) ipBuckets.delete(k); }, 600000).unref();

function mergeAccounts(from, to) {
  if (!from || !to || from === to) return;
  for (const u of all("SELECT * FROM unlocks WHERE account = ?", from))
    run("INSERT OR IGNORE INTO unlocks (account, letter, kind, order_id, at, used) VALUES (?, ?, ?, ?, ?, ?)", to, u.letter, u.kind, u.order_id, u.at, u.used);
  run("DELETE FROM unlocks WHERE account = ?", from);
  run("UPDATE orders SET account = ? WHERE account = ?", to, from);
  run("UPDATE sessions SET account = ? WHERE account = ?", to, from);
  const f = one("SELECT free_used FROM accounts WHERE id = ?", from)?.free_used || 0;
  run("UPDATE accounts SET free_used = free_used + ? WHERE id = ?", f, to);
  run("UPDATE accounts SET merged_into = ?, free_used = 0 WHERE id = ?", to, from);
}
const activeSub = (account) => one("SELECT * FROM orders WHERE account = ? AND kind = 'sub' AND status IN ('paid','cancelled') AND (ends_at IS NULL OR ends_at > ?)", account, now());
const orderOut = (o) => ({
  id: o.id, kind: o.kind, letterId: o.letter, title: o.title, pages: o.pages, amount: o.amount_cents / 100, status: o.status,
  createdAt: new Date(o.created).toISOString(), paidAt: o.paid_at ? new Date(o.paid_at).toISOString() : null,
  withdrawnAt: o.withdrawn_at ? new Date(o.withdrawn_at).toISOString() : null, refunded: !!o.refunded,
  cancelledAt: o.cancelled_at ? new Date(o.cancelled_at).toISOString() : null, endsAt: o.ends_at ? new Date(o.ends_at).toISOString() : null,
});
async function mail(to, tpl) { try { return await sendMail(cfg, { to, ...tpl }); } catch (e) { console.error("mail", e.message); return null; } }

/* ---------- Brief freischalten: gratis, Abo oder nach Zahlung ---------- */
function unlockLetter(acc, letterId, pages) {
  const ex = one("SELECT * FROM unlocks WHERE account = ? AND letter = ?", acc.id, letterId);
  if (ex) return { kind: ex.kind };
  if (!cfg.PAYMENT_REQUIRED) { run("INSERT INTO unlocks (account, letter, kind, at) VALUES (?, ?, 'open', ?)", acc.id, letterId, now()); return { kind: "open" }; }
  if (activeSub(acc.id)) { run("INSERT INTO unlocks (account, letter, kind, at) VALUES (?, ?, 'sub', ?)", acc.id, letterId, now()); return { kind: "sub" }; }
  if (acc.free_used < cfg.FREE_LETTERS && pages <= cfg.FREE_MAX_PAGES) {
    if (cfg.FREE_REQUIRES_LOGIN && !acc.email && !acc.up) fail(403, "login", { freeLeft: cfg.FREE_LETTERS - acc.free_used });
    run("INSERT INTO unlocks (account, letter, kind, at) VALUES (?, ?, 'free', ?)", acc.id, letterId, now());
    run("UPDATE accounts SET free_used = free_used + 1 WHERE id = ?", acc.id);
    return { kind: "free" };
  }
  fail(402, "payment", { amount: priceCents(pages) / 100, pages });
}

/* ---------- Schnittstellen ---------- */
const routes = {};
const route = (method, p, fn, opts = {}) => { routes[`${method} ${p}`] = { fn, ...opts }; };

route("GET", "/health", () => ({ ok: true }));
route("GET", "/config", () => ({
  paymentRequired: cfg.PAYMENT_REQUIRED, freeLetters: cfg.FREE_LETTERS, freeRequiresLogin: cfg.FREE_REQUIRES_LOGIN,
  basePrice: cfg.BASE_PRICE_CENTS / 100, extraPagePrice: cfg.EXTRA_PAGE_CENTS / 100, basePages: cfg.BASE_PAGES,
  payments: !!cfg.STRIPE_SECRET_KEY, subscription: cfg.SUB_ENABLED, subPrice: cfg.SUB_PRICE_CENTS / 100,
  ai: aiReady(), aiProvider: cfg.AI_PROVIDER, vapidPublic: cfg.VAPID_PUBLIC || null, mail: !!cfg.SMTP_HOST,
  dav: cfg.DAV_ENABLED, davMaxMb: cfg.DAV_MAX_MB, boxClientId: cfg.BOX_CLIENT_ID && cfg.BOX_CLIENT_SECRET ? cfg.BOX_CLIENT_ID : null,
}));

// Anonyme Sitzung je Gerät/Profil; Anmeldung verknüpft sie später mit E-Mail oder UP
route("POST", "/session/anon", ({ ip }) => {
  rateLimit(ip, 20);
  const id = "a_" + rid(12); const token = rid();
  run("INSERT INTO accounts (id, created) VALUES (?, ?)", id, now());
  run("INSERT INTO sessions (hash, account, created, last) VALUES (?, ?, ?, ?)", sha(token), id, now(), now());
  return { token };
});
route("GET", "/me", ({ req }) => {
  const { acc } = auth(req);
  return {
    account: { email: acc.email, up: acc.up, freeLeft: Math.max(0, cfg.FREE_LETTERS - acc.free_used), loggedIn: !!(acc.email || acc.up) },
    orders: all("SELECT * FROM orders WHERE account = ? AND status != 'pending' ORDER BY created DESC", acc.id).map(orderOut),
  };
});
route("POST", "/auth/logout", ({ req }) => { const s = auth(req, false); if (s) run("DELETE FROM sessions WHERE hash = ?", s.sessionHash); return { ok: true }; });

/* E-Mail-Anmeldung per Link (kein Passwort) */
route("POST", "/auth/email/start", async ({ req, body, ip }) => {
  rateLimit(ip, 10);
  const { acc } = auth(req);
  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) fail(400, "email");
  const mode = body.mode === "link" ? "link" : "login";
  const recent = one("SELECT COUNT(*) AS n FROM email_tokens WHERE email = ? AND created > ?", email, now() - 3600e3).n;
  if (recent >= 5) fail(429, "limit");
  const token = rid();
  run("INSERT INTO email_tokens (hash, account, email, mode, exp, created) VALUES (?, ?, ?, ?, ?, ?)", sha(token), acc.id, email, mode, now() + 30 * 60000, now());
  await mail(email, mails.loginLink(`${cfg.APP_URL}/?login=${token}`));
  return { ok: true, sent: !!cfg.SMTP_HOST, ...(cfg.SMTP_HOST ? {} : { demoToken: token }) };
});
route("POST", "/auth/email/finish", ({ req, body }) => {
  const { acc } = auth(req);
  const t = one("SELECT * FROM email_tokens WHERE hash = ?", sha(body.token || ""));
  if (!t || t.used || t.exp < now()) fail(400, "token");
  run("UPDATE email_tokens SET used = 1 WHERE hash = ?", t.hash);
  const owner = one("SELECT * FROM accounts WHERE email = ? AND merged_into IS NULL", t.email);
  if (owner && owner.id !== acc.id) {
    if (t.mode === "link") fail(409, "email-used");
    // Anmeldung in bestehendes Konto: aktuelles (Geräte-)Konto wird übernommen, sofern es noch keine eigene Identität hat
    if (!acc.email && !acc.up) mergeAccounts(acc.id, owner.id);
    else run("UPDATE sessions SET account = ? WHERE account = ?", owner.id, acc.id);
    return { ok: true, email: t.email, up: owner.up };
  }
  run("UPDATE accounts SET email = ? WHERE id = ?", t.email, acc.id);
  return { ok: true, email: t.email, up: acc.up };
});

/* LUKSO Universal Profile */
route("GET", "/auth/nonce", ({ req, ip }) => {
  rateLimit(ip, 5);
  const { acc } = auth(req);
  const nonce = crypto.randomBytes(12).toString("hex");
  run("INSERT INTO nonces (nonce, account, exp) VALUES (?, ?, ?)", nonce, acc.id, now() + 10 * 60000);
  return { nonce };
});
route("POST", "/auth/verify", async ({ req, body, ip }) => {
  rateLimit(ip, 10);
  const { acc } = auth(req);
  const nonce = (String(body.message || "").match(/^Nonce: (.+)$/m) || [])[1];
  const n = nonce && one("SELECT * FROM nonces WHERE nonce = ? AND account = ?", nonce, acc.id);
  if (!n || n.exp < now()) fail(400, "nonce");
  run("DELETE FROM nonces WHERE nonce = ?", nonce);
  const v = await verifyUp(cfg, body, { domain: cfg.APP_HOST, nonce });
  if (!v.ok) fail(401, "verify", { reason: v.reason });
  const owner = one("SELECT * FROM accounts WHERE up = ? AND merged_into IS NULL", v.address);
  if (owner && owner.id !== acc.id) {
    if (body.link) fail(409, "up-used");
    if (!acc.email && !acc.up) mergeAccounts(acc.id, owner.id); else run("UPDATE sessions SET account = ? WHERE account = ?", owner.id, acc.id);
    return { ok: true, address: v.address, chainId: v.chainId, email: owner.email };
  }
  run("UPDATE accounts SET up = ? WHERE id = ?", v.address, acc.id);
  return { ok: true, address: v.address, chainId: v.chainId, email: acc.email };
});

/* Konto und Serverdaten löschen (DSGVO Art. 17); Bestellungen bleiben wegen Aufbewahrungspflichten, ohne Kontobezug */
route("POST", "/account/delete", ({ req }) => {
  const { acc } = auth(req);
  const ids = [acc.id, ...all("SELECT id FROM accounts WHERE merged_into = ?", acc.id).map((r) => r.id)];
  for (const id of ids) {
    run("DELETE FROM sessions WHERE account = ?", id); run("DELETE FROM nonces WHERE account = ?", id);
    run("DELETE FROM email_tokens WHERE account = ?", id); run("DELETE FROM unlocks WHERE account = ?", id);
    run("DELETE FROM usage WHERE account = ?", id);
    run("UPDATE orders SET account = 'deleted' WHERE account = ?", id);
    run("DELETE FROM accounts WHERE id = ?", id);
  }
  return { ok: true };
});

/* KI */
for (const kind of ["extract", "translate", "reply", "replyTranslate", "check", "ui", "search", "caseName"]) {
  route("POST", `/ai/${kind}`, async ({ req, body, ip }) => {
    rateLimit(ip, kind === "extract" ? 5 : 1);
    const { acc } = auth(req);
    if (!aiReady()) fail(503, "ai-not-configured");
    let request;
    try { request = buildAiRequest(kind, body); } catch (e) { if (e instanceof BadInput) fail(400, "input"); throw e; }
    if (["translate", "reply", "replyTranslate", "check"].includes(kind)) {
      const letter = String(body.letterId || "").slice(0, 80);
      if (!letter) fail(400, "letter");
      let u = one("SELECT * FROM unlocks WHERE account = ? AND letter = ?", acc.id, letter);
      if (!u) { unlockLetter(acc, letter, clampPages(body.pages)); u = one("SELECT * FROM unlocks WHERE account = ? AND letter = ?", acc.id, letter); }
      if (u.used >= cfg.LIMITS.perLetter) fail(429, "limit");
      run("UPDATE unlocks SET used = used + 1 WHERE account = ? AND letter = ?", acc.id, letter);
    } else countUse(acc.id, kind, cfg.LIMITS[kind]);
    try { const r = await callModel(cfg, request); return { text: r.text }; }
    catch (e) { console.error("ai", kind, e.message); fail(502, "ai"); }
  }, { maxBody: kind === "extract" ? 32 * 1024 * 1024 : 2 * 1024 * 1024 });
}
route("POST", "/letters/unlock", ({ req, body }) => {
  const { acc } = auth(req);
  const letter = String(body.letterId || "").slice(0, 80);
  if (!letter) fail(400, "letter");
  return unlockLetter(acc, letter, clampPages(body.pages));
});

/* Zahlungen */
route("POST", "/pay/checkout", async ({ req, body, ip }) => {
  rateLimit(ip, 5);
  const { acc } = auth(req);
  if (!cfg.STRIPE_SECRET_KEY) fail(503, "payments-not-configured");
  if (body.waiver !== true || body.terms !== true) fail(400, "consent");
  const isSub = body.kind === "sub";
  if (isSub && !cfg.SUB_ENABLED) fail(400, "sub-disabled");
  const pages = clampPages(body.pages);
  const letter = isSub ? null : String(body.letterId || "").slice(0, 80);
  if (!isSub && !letter) fail(400, "letter");
  if (!isSub && one("SELECT 1 FROM unlocks WHERE account = ? AND letter = ?", acc.id, letter)) fail(409, "already");
  const amount = isSub ? cfg.SUB_PRICE_CENTS : priceCents(pages);
  const title = isSub ? cfg.SUB_NAME : `KI-Übersetzung und Antwortentwurf: ${String(body.title || "Brief").slice(0, 80)} (${pages} Seite${pages === 1 ? "" : "n"})`;
  const id = orderId(isSub ? "A" : "B");
  run("INSERT INTO orders (id, account, kind, letter, title, pages, amount_cents, status, created, waiver_at, terms_version, email) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)",
    id, acc.id, isSub ? "sub" : "letter", letter, title, isSub ? null : pages, amount, now(), now(), cfg.TERMS_VERSION, acc.email);
  const params = {
    mode: isSub ? "subscription" : "payment",
    client_reference_id: id, metadata: { order_id: id },
    success_url: `${cfg.APP_URL}/?paid={CHECKOUT_SESSION_ID}`, cancel_url: `${cfg.APP_URL}/?paycancel=${id}`,
    customer_email: acc.email || undefined, locale: "auto",
    line_items: { 0: { quantity: 1, price_data: { currency: "eur", unit_amount: amount, product_data: { name: title }, ...(isSub ? { recurring: { interval: "month" } } : {}) } } },
    ...(isSub ? { subscription_data: { metadata: { order_id: id } } } : { payment_intent_data: { metadata: { order_id: id } }, invoice_creation: { enabled: true } }),
  };
  const s = await stripe(cfg, "checkout/sessions", params, { idempotencyKey: id });
  run("UPDATE orders SET stripe_session = ? WHERE id = ?", s.id, id);
  return { url: s.url, orderId: id };
});
route("GET", "/pay/status", ({ req, query }) => {
  const { acc } = auth(req);
  const o = one("SELECT * FROM orders WHERE stripe_session = ? AND account = ?", String(query.session || ""), acc.id);
  if (!o) fail(404, "order");
  return { order: orderOut(o) };
});
function markPaid(o, extra = {}) {
  if (o.status === "paid") return;
  run("UPDATE orders SET status = 'paid', paid_at = ?, payment_intent = COALESCE(?, payment_intent), subscription = COALESCE(?, subscription) WHERE id = ?",
    now(), extra.payment_intent || null, extra.subscription || null, o.id);
  if (o.kind === "letter") run("INSERT OR IGNORE INTO unlocks (account, letter, kind, order_id, at) VALUES (?, ?, 'paid', ?, ?)", o.account, o.letter, o.id, now());
  const to = o.email || one("SELECT email FROM accounts WHERE id = ?", o.account)?.email;
  if (to) mail(to, mails.orderConfirmation({ ...orderOut({ ...o, status: "paid", paid_at: now() }) }, cfg));
}
route("POST", "/pay/webhook", ({ req, raw }) => {
  if (!verifyWebhook(raw, req.headers["stripe-signature"], cfg.STRIPE_WEBHOOK_SECRET)) fail(400, "signature");
  const ev = JSON.parse(raw);
  if (one("SELECT 1 FROM webhook_events WHERE id = ?", ev.id)) return { ok: true, duplicate: true };
  run("INSERT INTO webhook_events (id, at) VALUES (?, ?)", ev.id, now());
  const obj = ev.data?.object || {};
  const oid = obj.metadata?.order_id || obj.client_reference_id;
  const o = oid && one("SELECT * FROM orders WHERE id = ?", oid);
  switch (ev.type) {
    case "checkout.session.completed":
      if (o && obj.payment_status === "paid") markPaid(o, { payment_intent: obj.payment_intent, subscription: obj.subscription });
      else if (o) run("UPDATE orders SET status = 'processing', payment_intent = ?, subscription = ? WHERE id = ?", obj.payment_intent || null, obj.subscription || null, o.id);
      break;
    case "checkout.session.async_payment_succeeded": if (o) markPaid(o, { payment_intent: obj.payment_intent, subscription: obj.subscription }); break;
    case "checkout.session.async_payment_failed": if (o) run("UPDATE orders SET status = 'failed' WHERE id = ?", o.id); break;
    case "checkout.session.expired": if (o && o.status === "pending") run("UPDATE orders SET status = 'expired' WHERE id = ?", o.id); break;
    case "customer.subscription.deleted": {
      const so = one("SELECT * FROM orders WHERE subscription = ?", obj.id);
      if (so) run("UPDATE orders SET status = 'ended', ends_at = ? WHERE id = ?", (obj.ended_at || obj.canceled_at || Math.floor(now() / 1000)) * 1000, so.id);
      break;
    }
    default: break;
  }
  return { ok: true };
}, { raw: true, noCors: true });

/* Widerruf (§ 355 BGB): Eingang wird immer bestätigt. Erstattung automatisch, solange die Leistung noch nicht genutzt wurde */
route("POST", "/pay/withdraw", async ({ req, body }) => {
  const { acc } = auth(req);
  const o = one("SELECT * FROM orders WHERE id = ? AND account = ?", String(body.orderId || ""), acc.id);
  if (!o || !["paid", "cancelled"].includes(o.status)) fail(404, "order");
  const at = now();
  if (at - o.created > cfg.WITHDRAWAL_DAYS * 864e5) fail(409, "period");
  let refunded = false; let reason = null;
  const u = o.kind === "letter" ? one("SELECT * FROM unlocks WHERE account = ? AND letter = ?", acc.id, o.letter) : null;
  const unused = o.kind === "letter" ? !u || u.used === 0 : false;
  if (unused && o.payment_intent && cfg.STRIPE_SECRET_KEY) {
    await stripe(cfg, "refunds", { payment_intent: o.payment_intent, metadata: { order_id: o.id } }, { idempotencyKey: "refund-" + o.id });
    run("DELETE FROM unlocks WHERE account = ? AND letter = ?", acc.id, o.letter);
    refunded = true;
  } else reason = o.kind === "letter" ? "performed" : "review";
  if (o.kind === "sub" && o.subscription && cfg.STRIPE_SECRET_KEY) await stripe(cfg, `subscriptions/${o.subscription}`, null, { method: "DELETE" }).catch(() => {});
  run("UPDATE orders SET status = 'withdrawn', withdrawn_at = ?, refunded = ? WHERE id = ?", at, refunded ? 1 : 0, o.id);
  const receiptId = "W-" + at.toString(36).toUpperCase();
  const to = acc.email || o.email;
  if (to) mail(to, mails.withdrawalReceipt({ order: orderOut(o), at, receiptId, refunded }, cfg));
  if (cfg.OPERATOR_EMAIL && !refunded) mail(cfg.OPERATOR_EMAIL, mails.operatorNotice(`Widerruf prüfen: ${o.id}`, `Bestellung ${o.id} (${o.title}) wurde widerrufen. Automatisch nicht erstattet (${reason}). Bitte prüfen.`));
  return { receiptId, at: new Date(at).toISOString(), refunded, reason };
});
/* Kündigung des Abos (§ 312k BGB) zum Ende der Laufzeit, Bestätigung per E-Mail */
route("POST", "/pay/cancel", async ({ req, body }) => {
  const { acc } = auth(req);
  const o = one("SELECT * FROM orders WHERE id = ? AND account = ? AND kind = 'sub'", String(body.orderId || ""), acc.id);
  if (!o || o.status !== "paid") fail(404, "order");
  let endsAt = now() + 30 * 864e5;
  if (o.subscription && cfg.STRIPE_SECRET_KEY) {
    const s = await stripe(cfg, `subscriptions/${o.subscription}`, { cancel_at_period_end: true });
    const end = s.items?.data?.[0]?.current_period_end || s.current_period_end || s.cancel_at;
    if (end) endsAt = end * 1000;
  }
  const at = now();
  run("UPDATE orders SET status = 'cancelled', cancelled_at = ?, ends_at = ? WHERE id = ?", at, endsAt, o.id);
  const receiptId = "K-" + at.toString(36).toUpperCase();
  const to = acc.email || o.email;
  if (to) mail(to, mails.cancelConfirmation({ order: orderOut(o), at, endsAt, receiptId }, cfg));
  return { receiptId, at: new Date(at).toISOString(), endsAt: new Date(endsAt).toISOString() };
});

/* Newsletter mit Double-Opt-in */
route("POST", "/newsletter/subscribe", async ({ body, ip }) => {
  rateLimit(ip, 20);
  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) fail(400, "email");
  const token = rid();
  run(`INSERT INTO newsletter (email, status, token_hash, requested, consent, ip_hash) VALUES (?, 'pending', ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET status = CASE WHEN status = 'confirmed' THEN 'confirmed' ELSE 'pending' END, token_hash = excluded.token_hash, requested = excluded.requested, consent = excluded.consent, ip_hash = excluded.ip_hash`,
    email, sha(token), now(), String(body.consentText || "").slice(0, 2000), sha(ip + (cfg.VAPID_PRIVATE || "salt")));
  await mail(email, mails.newsletterConfirm(`${cfg.API_URL}/newsletter/confirm?t=${token}`));
  return { ok: true };
});
const htmlPage = (title, text) => ({ __html: `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui;max-width:520px;margin:40px auto;padding:0 16px"><h2>${title}</h2><p>${text}</p></body>` });
route("GET", "/newsletter/confirm", ({ query }) => {
  const n = one("SELECT * FROM newsletter WHERE token_hash = ?", sha(query.t || ""));
  if (!n) return htmlPage("Link ungültig", "Dieser Bestätigungslink ist ungültig oder wurde schon verwendet.");
  const unsub = rid();
  run("UPDATE newsletter SET status = 'confirmed', confirmed = ?, token_hash = ? WHERE email = ?", now(), sha(unsub), n.email);
  mail(n.email, mails.newsletterWelcome(`${cfg.API_URL}/newsletter/unsubscribe?t=${unsub}`));
  return htmlPage("Anmeldung bestätigt", "Danke! Du erhältst ab jetzt unseren Newsletter. Abmelden ist jederzeit über den Link in jeder E-Mail möglich.");
}, { noCors: true });
route("GET", "/newsletter/unsubscribe", ({ query }) => {
  const n = one("SELECT * FROM newsletter WHERE token_hash = ?", sha(query.t || ""));
  if (n) run("UPDATE newsletter SET status = 'unsubscribed', unsubscribed = ? WHERE email = ?", now(), n.email);
  return htmlPage("Abgemeldet", "Du erhältst keinen Newsletter mehr.");
}, { noCors: true });

/* Bewertungen (anonym, ohne Brieftext) */
route("POST", "/feedback", ({ body, ip }) => {
  rateLimit(ip, 5);
  run("INSERT INTO feedback (at, kind, v, comment, lang, ui, model) VALUES (?, ?, ?, ?, ?, ?, ?)", now(),
    String(body.kind || "").slice(0, 20), Math.sign(Number(body.v) || 0), String(body.comment || "").slice(0, 1000), String(body.lang || "").slice(0, 10), String(body.uiLang || "").slice(0, 10), String(body.model || "").slice(0, 60));
  return { ok: true };
});

/* Erinnerungen: Web Push je Gerät und Profil */
route("POST", "/subscribe", ({ body, ip }) => {
  rateLimit(ip, 2);
  const { subscription, schedule, profile } = body;
  if (!subscription?.endpoint || !/^https:\/\//.test(subscription.endpoint) || !subscription.keys?.p256dh || !subscription.keys?.auth || !Array.isArray(schedule)) fail(400, "input");
  const sched = schedule.slice(0, 500).map((x) => ({ key: String(x.key).slice(0, 100), at: Number(x.at), title: String(x.title).slice(0, 120), body: String(x.body).slice(0, 200) })).filter((x) => x.at > 0);
  run("INSERT INTO push (key, subscription, schedule, updated) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET subscription = excluded.subscription, schedule = excluded.schedule, updated = excluded.updated",
    subscription.endpoint + "|" + String(profile || "main").slice(0, 40), JSON.stringify(subscription), JSON.stringify(sched), now());
  return { ok: true };
});
route("POST", "/unsubscribe", ({ body }) => {
  const ep = String(body.endpoint || "");
  if (body.profile) run("DELETE FROM push WHERE key = ?", ep + "|" + body.profile);
  else run("DELETE FROM push WHERE key LIKE ? ESCAPE '\\'", ep.replace(/[\\%_]/g, "\\$&") + "|%");
  return { ok: true };
});
/* Kalender-Abo: geheime Adresse, der Kalender des Geräts ruft selbst ab */
const okTok = (t) => typeof t === "string" && /^[A-Za-z0-9_-]{30,64}$/.test(t);
route("POST", "/cal/sync", ({ body, ip }) => {
  rateLimit(ip, 2);
  if (!okTok(body.token) || typeof body.ics !== "string" || !body.ics.startsWith("BEGIN:VCALENDAR") || body.ics.length > 150000) fail(400, "input");
  run("INSERT INTO cals (token, ics, at) VALUES (?, ?, ?) ON CONFLICT(token) DO UPDATE SET ics = excluded.ics, at = excluded.at", body.token, body.ics, now());
  return { ok: true };
});
route("POST", "/cal/delete", ({ body }) => { if (okTok(body.token)) run("DELETE FROM cals WHERE token = ?", body.token); return { ok: true }; });

/* ---------- Weitere Clouds ---------- */
// WebDAV: Diese Anbieter erlauben keinen direkten Zugriff aus dem Browser. Der Server reicht die Anfrage nur durch.
// Zugangsdaten und Dateien werden weder gespeichert noch protokolliert.
async function davCtx({ req, body, ip }, cost) {
  rateLimit(ip, cost);
  auth(req);
  if (!cfg.DAV_ENABLED) fail(503, "dav-off");
  const user = String(body.user || ""); const pass = String(body.pass || "");
  if (!user || !pass || user.length > 200 || pass.length > 400 || /[\r\n]/.test(user + pass)) fail(400, "login");
  try { return { base: await resolveBase(String(body.provider || ""), body.base, { insecure: cfg.DAV_TEST_INSECURE, presets: cfg.DAV_TEST_PRESETS }), cred: { user, pass } }; }
  catch (e) { if (e instanceof DavError) fail(e.status, "dav-" + e.code); throw e; }
}
const davRun = async (fn) => { try { return await fn(); } catch (e) { if (e instanceof DavError) fail(e.status, "dav-" + e.code); throw e; } };
route("POST", "/dav/list", async (x) => {
  const { base, cred } = await davCtx(x, 2);
  return davRun(async () => ({ items: await davList(base, cred, String(x.body.path || "")) }));
});
route("POST", "/dav/get", async (x) => {
  const { base, cred } = await davCtx(x, 5);
  return davRun(async () => { const r = await davGet(base, cred, String(x.body.path || ""), cfg.DAV_MAX_MB * 1024 * 1024); return { b64: r.data.toString("base64"), type: r.type }; });
});
route("POST", "/dav/put", async (x) => {
  const { base, cred } = await davCtx(x, 5);
  const data = Buffer.from(String(x.body.b64 || ""), "base64");
  if (!data.length || data.length > cfg.DAV_MAX_MB * 1024 * 1024) fail(413, "too-large");
  return davRun(() => davPut(base, cred, x.body.name, data, String(x.body.type || "").slice(0, 100)));
}, { maxBody: Math.ceil(cfg.DAV_MAX_MB * 1024 * 1024 * 1.4) + 4096 });

// Box: Der Tausch des Anmelde-Codes braucht das Geheimnis der Box-App, deshalb läuft nur dieser Schritt über den Server.
route("POST", "/cloud/box/token", async ({ req, body, ip }) => {
  rateLimit(ip, 10);
  auth(req);
  if (!cfg.BOX_CLIENT_ID || !cfg.BOX_CLIENT_SECRET) fail(503, "box-off");
  const code = String(body.code || ""); const ru = String(body.redirectUri || "");
  let origin = ""; try { origin = new URL(ru).origin; } catch (e) { /* ungültig */ }
  if (!code || code.length > 500 || origin !== cfg.APP_ORIGIN) fail(400, "input");
  let j = {};
  try {
    const r = await fetch(cfg.BOX_BASE + "/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: cfg.BOX_CLIENT_ID, client_secret: cfg.BOX_CLIENT_SECRET, redirect_uri: ru }),
    });
    j = await r.json();
  } catch (e) { fail(502, "box"); }
  if (!j.access_token) fail(502, "box");
  return { accessToken: j.access_token, expiresIn: j.expires_in || null };   // kein Refresh-Token an die App, nichts gespeichert
});

/* ---------- HTTP-Server ---------- */
function cors(res, noCors) {
  if (noCors) return;
  res.setHeader("Access-Control-Allow-Origin", cfg.APP_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "600");
}
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", (c) => { size += c.length; if (size > max) { reject(new HttpError(413, "too-large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  // Kalender-Datei (GET /cal/<token>.ics) – ohne CORS, weil Kalender-Apps direkt abrufen
  const calM = req.method === "GET" && u.pathname.match(/^\/cal\/([A-Za-z0-9_-]{30,64})\.ics$/);
  if (calM) {
    const c = one("SELECT ics FROM cals WHERE token = ?", calM[1]);
    if (!c) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(c.ics);
  }
  const r = routes[`${req.method === "OPTIONS" ? "POST" : req.method} ${u.pathname}`] || (req.method === "OPTIONS" && routes[`GET ${u.pathname}`]);
  if (req.method === "OPTIONS") { cors(res, r?.noCors); res.writeHead(r ? 204 : 404); return res.end(); }
  cors(res, r?.noCors);
  if (!r) { res.writeHead(404, { "Content-Type": "application/json" }); return res.end('{"error":"not-found"}'); }
  try {
    rateLimit(ip, 1);
    let raw = ""; let body = {};
    if (req.method === "POST") {
      raw = await readBody(req, r.maxBody || 1024 * 1024);
      if (!r.raw) { try { body = raw ? JSON.parse(raw) : {}; } catch (e) { fail(400, "json"); } }
    }
    const out = await r.fn({ req, res, body, raw, query: Object.fromEntries(u.searchParams), ip });
    if (out && out.__html) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(out.__html); }
    res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(out ?? {}));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(req.method, u.pathname, e);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e instanceof HttpError ? e.message : "server", ...(e.data || {}) }));
  }
});

/* ---------- Zeitgesteuert: Erinnerungen senden, Aufräumen ---------- */
async function pushTick() {
  if (!cfg.VAPID_PUBLIC || !cfg.VAPID_PRIVATE) return;
  const t = now();
  for (const row of all("SELECT * FROM push")) {
    const sched = JSON.parse(row.schedule || "[]");
    const due = sched.filter((x) => x.at <= t);
    if (!due.length) continue;
    run("UPDATE push SET schedule = ? WHERE key = ?", JSON.stringify(sched.filter((x) => x.at > t)), row.key);
    const sub = JSON.parse(row.subscription);
    for (const x of due) {
      if (t - x.at > 12 * 3600e3) continue;                            // zu alte Erinnerungen verwerfen
      try {
        const st = await sendPush(sub, x, { publicKey: cfg.VAPID_PUBLIC, privateKey: cfg.VAPID_PRIVATE, subject: cfg.VAPID_SUBJECT });
        if (st === 404 || st === 410) { run("DELETE FROM push WHERE key LIKE ? ESCAPE '\\'", sub.endpoint.replace(/[\\%_]/g, "\\$&") + "|%"); break; }
      } catch (e) { console.error("push", e.message); }
    }
  }
}
function cleanup() {
  const t = now();
  run("DELETE FROM nonces WHERE exp < ?", t);
  run("DELETE FROM email_tokens WHERE exp < ?", t - 864e5);
  run("DELETE FROM sessions WHERE last < ?", t - 400 * 864e5);
  run("DELETE FROM cals WHERE at < ?", t - 400 * 864e5);
  run("DELETE FROM usage WHERE day < ?", new Date(t - 30 * 864e5).toISOString().slice(0, 10));
  run("DELETE FROM webhook_events WHERE at < ?", t - 30 * 864e5);
  run("DELETE FROM orders WHERE status IN ('pending','expired') AND created < ?", t - 7 * 864e5);
  // Unbestätigte Newsletter-Anmeldungen nach 30 Tagen löschen
  run("DELETE FROM newsletter WHERE status = 'pending' AND requested < ?", t - 30 * 864e5);
}
if (require.main === module) {
  server.listen(cfg.PORT, () => console.log(`Briefe-Server läuft auf Port ${cfg.PORT} · KI: ${cfg.AI_PROVIDER}${aiReady() ? "" : " (nicht eingerichtet)"} · Zahlungen: ${cfg.STRIPE_SECRET_KEY ? "Stripe" : "aus"} · E-Mail: ${cfg.SMTP_HOST || "Demo (Konsole)"}`));
  setInterval(() => pushTick().catch((e) => console.error("tick", e)), 60000);
  setInterval(cleanup, 6 * 3600e3); cleanup();
}
module.exports = { server, cfg, db, pushTick, cleanup };
