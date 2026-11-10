"use strict";
// Ende-zu-Ende-Test: echter Server als Prozess, alle fremden Dienste als lokale Test-Gegenstellen
const assert = require("assert");
const http = require("http");
const net = require("net");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const { hashPersonal, encodeIsValidSignature } = require("../lib/up");
const { generateVapidKeys } = require("../lib/webpush");

let passed = 0;
const ok = (name, cond) => { assert.ok(cond, name); passed++; console.log("PASS " + name); };

/* ---------- Test-Gegenstellen ---------- */
function mockHttp(handler) {
  return new Promise((res) => {
    const s = http.createServer((req, rsp) => {
      const chunks = []; req.on("data", (c) => chunks.push(c));
      req.on("end", () => handler(req, Buffer.concat(chunks), rsp));
    });
    s.listen(0, "127.0.0.1", () => res({ server: s, url: `http://127.0.0.1:${s.address().port}` }));
  });
}
const json = (rsp, status, obj) => { rsp.writeHead(status, { "Content-Type": "application/json" }); rsp.end(JSON.stringify(obj)); };
const calls = { anthropic: [], bedrock: [], stripe: [], rpc: [], push: [], mails: [] };

function fakeSmtp() {
  return new Promise((res) => {
    const s = net.createServer((sock) => {
      let buf = ""; let inData = false;
      sock.write("220 test ESMTP\r\n");
      sock.on("data", (d) => {
        buf += d.toString();
        while (true) {
          if (inData) {
            const i = buf.indexOf("\r\n.\r\n"); if (i < 0) return;
            const msg = buf.slice(0, i); buf = buf.slice(i + 5); inData = false;
            const [head, body] = msg.split("\r\n\r\n");
            const subj = (head.match(/^Subject: (.*)$/m) || [])[1] || "";
            const subject = subj.startsWith("=?UTF-8?B?") ? Buffer.from(subj.slice(10, -2), "base64").toString() : subj;
            calls.mails.push({ to: (head.match(/^To: <(.*)>$/m) || [])[1], subject, text: Buffer.from(body.replace(/\r\n/g, ""), "base64").toString() });
            sock.write("250 OK\r\n"); continue;
          }
          const i = buf.indexOf("\r\n"); if (i < 0) return;
          const line = buf.slice(0, i); buf = buf.slice(i + 2);
          if (/^EHLO/.test(line)) sock.write("250-test\r\n250 AUTH PLAIN\r\n");
          else if (/^AUTH/.test(line)) sock.write("235 ok\r\n");
          else if (/^DATA/.test(line)) { inData = true; sock.write("354 go\r\n"); }
          else if (/^QUIT/.test(line)) { sock.write("221 bye\r\n"); sock.end(); }
          else sock.write("250 OK\r\n");
        }
      });
    });
    s.listen(0, "127.0.0.1", () => res({ server: s, port: s.address().port }));
  });
}

// Push-Empfänger wie ein Browser: Nachricht nach RFC 8291 entschlüsseln
const ua = crypto.createECDH("prime256v1"); ua.generateKeys();
const uaAuth = crypto.randomBytes(16);
function decryptPush(body) {
  const salt = body.subarray(0, 16); const idlen = body[20]; const asPub = body.subarray(21, 21 + idlen); const ct = body.subarray(21 + idlen);
  const hm = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
  const secret = ua.computeSecret(asPub);
  const ikm = hm(hm(uaAuth, secret), Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPub, Buffer.from([1])]));
  const prk = hm(salt, ikm);
  const cek = hm(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).subarray(0, 16);
  const nonce = hm(prk, Buffer.from("Content-Encoding: nonce\0\x01")).subarray(0, 12);
  const d = crypto.createDecipheriv("aes-128-gcm", cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return JSON.parse(pt.subarray(0, pt.lastIndexOf(2)).toString());
}

async function main() {
  const anthropic = await mockHttp((req, body, rsp) => {
    const b = JSON.parse(body); calls.anthropic.push({ headers: req.headers, body: b });
    const prompt = typeof b.messages[0].content === "string" ? b.messages[0].content : b.messages[0].content.map((x) => x.text || x.type).join(" ");
    json(rsp, 200, { content: [{ type: "text", text: prompt.startsWith("Übersetze die Werte") ? '{"a":"Hello"}' : "ANTWORT" }], usage: { input_tokens: 10, output_tokens: 5 } });
  });
  const bedrock = await mockHttp((req, body, rsp) => { calls.bedrock.push({ url: req.url, headers: req.headers, body: JSON.parse(body) }); json(rsp, 200, { content: [{ type: "text", text: "BEDROCK" }] }); });
  const stripeMock = await mockHttp((req, body, rsp) => {
    const params = new URLSearchParams(body.toString()); calls.stripe.push({ method: req.method, url: req.url, params, headers: req.headers });
    if (req.url === "/v1/checkout/sessions") return json(rsp, 200, { id: "cs_" + calls.stripe.length, url: "https://checkout.stripe.test/s" });
    if (req.url === "/v1/refunds") return json(rsp, 200, { id: "re_1", status: "succeeded" });
    if (req.url.startsWith("/v1/subscriptions/")) return json(rsp, 200, { id: "sub_1", items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 20 * 86400 }] } });
    json(rsp, 404, { error: { message: "unknown" } });
  });
  let rpcExpect = null;
  const rpc = await mockHttp((req, body, rsp) => {
    const b = JSON.parse(body); calls.rpc.push(b);
    const valid = rpcExpect && b.params[0].data === rpcExpect;
    json(rsp, 200, { jsonrpc: "2.0", id: b.id, result: valid ? "0x1626ba7e" + "0".repeat(56) : "0xffffffff" + "0".repeat(56) });
  });
  const pushSvc = await mockHttp((req, body, rsp) => { calls.push.push({ headers: req.headers, body }); rsp.writeHead(201); rsp.end(); });
  const smtp = await fakeSmtp();
  const vapid = generateVapidKeys();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "briefe-"));
  const WH = "whsec_test";

  const start = (extra) => new Promise((res, rej) => {
    const port = 3900 + Math.floor(Math.random() * 500);
    const env = {
      ...process.env, ENV_FILE: "/nonexistent", PORT: String(port), DB_FILE: path.join(tmp, `db-${port}.db`),
      APP_URL: "https://app.example.eu", API_URL: `http://127.0.0.1:${port}`,
      AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test-123", ANTHROPIC_BASE: anthropic.url,
      PAYMENT_REQUIRED: "true", FREE_REQUIRES_LOGIN: "true", SUB_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: WH, STRIPE_BASE: stripeMock.url,
      SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtp.port), SMTP_SECURE: "none", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "noreply@example.eu",
      LUKSO_RPC_MAINNET: rpc.url, VAPID_PUBLIC: vapid.publicKey, VAPID_PRIVATE: vapid.privateKey, ...extra,
    };
    const p = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", path.join(__dirname, "..", "server.js")], { env, stdio: ["ignore", "pipe", "pipe"] });
    let errOut = "";
    p.stderr.on("data", (d) => (errOut += d));
    p.stdout.on("data", (d) => { if (String(d).includes("läuft")) res({ p, base: `http://127.0.0.1:${port}`, err: () => errOut }); });
    p.on("exit", (c) => rej(new Error("server exit " + c + " " + errOut)));
  });

  const S = await start({});
  const api = async (pth, { token, body, method, raw, headers } = {}) => {
    const r = await fetch(S.base + pth, { method: method || (body !== undefined || raw !== undefined ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...(headers || {}) },
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined });
    const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { j = { html: text }; }
    return { status: r.status, j, headers: r.headers };
  };
  const waitMail = async (n) => { for (let i = 0; i < 50 && calls.mails.length < n; i++) await new Promise((r) => setTimeout(r, 50)); return calls.mails[n - 1]; };

  try {
    /* Grundlagen */
    let r = await api("/config");
    ok("Konfiguration abrufbar, keine Geheimnisse enthalten", r.j.paymentRequired === true && r.j.ai === true && !JSON.stringify(r.j).includes("sk_test"));
    r = await api("/session/anon", { body: {} }); const tokA = r.j.token;
    ok("Anonyme Sitzung", typeof tokA === "string" && tokA.length > 30);
    ok("Ohne Sitzung kein Zugriff", (await api("/me")).status === 401);
    ok("CORS nur für die App-Domain", (await api("/config")).headers.get("access-control-allow-origin") === "https://app.example.eu");

    /* KI-Proxy */
    r = await api("/ai/ui", { token: tokA, body: { part: { a: "Hallo" }, lang: "English" } });
    const last = calls.anthropic.at(-1);
    ok("KI über Server: Schlüssel nur serverseitig", r.status === 200 && last.headers["x-api-key"] === "sk-test-123" && last.body.model === "claude-sonnet-5-5");
    ok("Server baut die Anweisung selbst", last.body.messages[0].content.startsWith("Übersetze die Werte"));
    r = await api("/ai/free", { token: tokA, body: { prompt: "Schreib mir ein Gedicht" } });
    ok("Freie Anweisungen nicht möglich", r.status === 404);
    r = await api("/ai/ui", { token: tokA, body: { part: { "bad key!": "x" }, lang: "English" } });
    ok("Ungültige Eingaben abgelehnt", r.status === 400);
    r = await api("/ai/translate", { token: tokA, body: { letterId: "l1", text: "Brief", lang: "English" } });
    ok("Gratis-Brief erst nach Anmeldung (Schalter aktiv)", r.status === 403 && r.j.error === "login");

    /* E-Mail-Anmeldung */
    r = await api("/auth/email/start", { token: tokA, body: { email: "Nutzer@Example.eu", mode: "login" } });
    const m1 = await waitMail(1);
    const loginTok = m1 && (m1.text.match(/\?login=([A-Za-z0-9_-]+)/) || [])[1];
    ok("Anmeldelink per E-Mail verschickt", r.status === 200 && m1.to === "nutzer@example.eu" && !!loginTok && m1.subject.includes("Anmeldelink"));
    r = await api("/auth/email/finish", { token: tokA, body: { token: loginTok } });
    ok("Anmeldung mit Link", r.status === 200 && r.j.email === "nutzer@example.eu");
    ok("Link nur einmal nutzbar", (await api("/auth/email/finish", { token: tokA, body: { token: loginTok } })).status === 400);

    /* Gratis-Briefe und Preis */
    r = await api("/ai/translate", { token: tokA, body: { letterId: "l1", text: "Brief", lang: "English" } });
    ok("1. Gratis-Brief übersetzt", r.status === 200 && r.j.text === "ANTWORT");
    r = await api("/ai/check", { token: tokA, body: { letterId: "l1", original: "Frist: 28.11.2026", translation: "Deadline: 28.11.2026", lang: "English" } });
    ok("Gegenprobe der Übersetzung durch die KI", r.status === 200 && r.j.text === "ANTWORT");
    ok("Gegenprobe ohne Texte abgelehnt", (await api("/ai/check", { token: tokA, body: { letterId: "l1", original: "", translation: "", lang: "English" } })).status === 400);
    ok("2. Gratis-Brief freigeschaltet", (await api("/letters/unlock", { token: tokA, body: { letterId: "l2", pages: 3 } })).j.kind === "free");
    r = await api("/letters/unlock", { token: tokA, body: { letterId: "l3", pages: 1 } });
    ok("3. Brief kostet 2 €", r.status === 402 && r.j.amount === 2);
    r = await api("/letters/unlock", { token: tokA, body: { letterId: "l4", pages: 15 } });
    ok("15 Seiten kosten 2,50 €", r.status === 402 && r.j.amount === 2.5);
    ok("Ohne Freischaltung keine Übersetzung", (await api("/ai/reply", { token: tokA, body: { letterId: "l3", original: "x" } })).status === 402);

    /* Zahlung */
    r = await api("/pay/checkout", { token: tokA, body: { kind: "letter", letterId: "l3", pages: 1, title: "Mahnung", waiver: false, terms: true } });
    ok("Kauf nur mit Zustimmungen", r.status === 400);
    r = await api("/pay/checkout", { token: tokA, body: { kind: "letter", letterId: "l3", pages: 1, title: "Mahnung", waiver: true, terms: true } });
    const cs = calls.stripe.at(-1).params;
    ok("Stripe-Kasse mit Server-Preis", r.status === 200 && r.j.url.startsWith("https://checkout.stripe.test") && cs.get("line_items[0][price_data][unit_amount]") === "200" && cs.get("mode") === "payment" && cs.get("customer_email") === "nutzer@example.eu");
    const order1 = r.j.orderId; const sess1 = "cs_" + calls.stripe.length;
    const sign = (payload, secret = WH, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
    const ev = (id, type, obj) => JSON.stringify({ id, type, data: { object: obj } });
    let payload = ev("evt_1", "checkout.session.completed", { id: sess1, payment_status: "paid", payment_intent: "pi_1", metadata: { order_id: order1 } });
    ok("Webhook mit falscher Signatur abgelehnt", (await api("/pay/webhook", { raw: payload, headers: { "Stripe-Signature": sign(payload, "falsch") } })).status === 400);
    ok("Webhook mit alter Signatur abgelehnt", (await api("/pay/webhook", { raw: payload, headers: { "Stripe-Signature": sign(payload, WH, Math.floor(Date.now() / 1000) - 3600) } })).status === 400);
    r = await api("/pay/webhook", { raw: payload, headers: { "Stripe-Signature": sign(payload) } });
    ok("Zahlung per Webhook bestätigt", r.status === 200);
    ok("Doppelter Webhook wird ignoriert", (await api("/pay/webhook", { raw: payload, headers: { "Stripe-Signature": sign(payload) } })).j.duplicate === true);
    r = await api(`/pay/status?session=${sess1}`, { token: tokA });
    ok("App sieht bezahlte Bestellung", r.j.order.status === "paid" && r.j.order.amount === 2);
    await waitMail(2); await new Promise((x) => setTimeout(x, 200));
    const m2 = calls.mails.find((m) => m.subject.includes("Bestellbestätigung") && m.subject.includes(order1));
    ok("Bestellbestätigung mit Widerrufsbelehrung per E-Mail", !!m2 && m2.text.includes("Widerrufsbelehrung") && m2.text.replace(/\u00a0/g, " ").includes("2,00 €"));
    ok("Gekaufter Brief nutzbar", (await api("/ai/reply", { token: tokA, body: { letterId: "l3", original: "Brief" } })).status === 200);

    /* Widerruf */
    r = await api("/pay/withdraw", { token: tokA, body: { orderId: order1 } });
    ok("Widerruf nach Nutzung: Eingang bestätigt, keine automatische Erstattung", r.status === 200 && r.j.refunded === false && r.j.reason === "performed");
    await api("/pay/checkout", { token: tokA, body: { kind: "letter", letterId: "l5", pages: 1, title: "Brief 5", waiver: true, terms: true } });
    const order2 = calls.stripe.at(-1).params.get("metadata[order_id]");
    payload = ev("evt_2", "checkout.session.completed", { id: "cs_x", payment_status: "paid", payment_intent: "pi_2", metadata: { order_id: order2 } });
    await api("/pay/webhook", { raw: payload, headers: { "Stripe-Signature": sign(payload) } });
    r = await api("/pay/withdraw", { token: tokA, body: { orderId: order2 } });
    ok("Widerruf vor Nutzung: automatisch erstattet", r.j.refunded === true && calls.stripe.at(-1).url === "/v1/refunds" && calls.stripe.at(-1).params.get("payment_intent") === "pi_2");
    ok("Nach Erstattung Brief wieder gesperrt", (await api("/ai/reply", { token: tokA, body: { letterId: "l5", original: "x" } })).status === 402);
    await new Promise((x) => setTimeout(x, 300));
    const wm = calls.mails.find((m) => m.subject.includes("Widerruf") && m.text.includes(order2));
    ok("Eingangsbestätigung Widerruf per E-Mail", !!wm);

    /* Abo und Kündigung */
    r = await api("/pay/checkout", { token: tokA, body: { kind: "sub", waiver: true, terms: true } });
    const subOrder = r.j.orderId;
    ok("Abo-Kasse monatlich", calls.stripe.at(-1).params.get("mode") === "subscription" && calls.stripe.at(-1).params.get("line_items[0][price_data][recurring][interval]") === "month");
    payload = ev("evt_3", "checkout.session.completed", { id: "cs_sub", payment_status: "paid", subscription: "sub_1", metadata: { order_id: subOrder } });
    await api("/pay/webhook", { raw: payload, headers: { "Stripe-Signature": sign(payload) } });
    ok("Mit Abo jeder Brief frei", (await api("/letters/unlock", { token: tokA, body: { letterId: "l9", pages: 40 } })).j.kind === "sub");
    r = await api("/pay/cancel", { token: tokA, body: { orderId: subOrder } });
    ok("Kündigung zum Laufzeitende mit Bestätigung", r.status === 200 && Date.parse(r.j.endsAt) > Date.now() + 19 * 864e5 && calls.stripe.at(-1).params.get("cancel_at_period_end") === "true");

    /* LUKSO Universal Profile */
    const addr = "0x" + "ab".repeat(20);
    r = await api("/auth/nonce", { token: tokA });
    const msg = (domain, nonce) => `${domain} wants you to sign in with your Ethereum account:\n${addr}\n\nAnmeldung bei der Briefe-App\n\nURI: https://${domain}\nVersion: 1\nChain ID: 42\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
    const sig = "0x" + "11".repeat(65);
    const goodMsg = msg("app.example.eu", r.j.nonce);
    rpcExpect = encodeIsValidSignature(hashPersonal(goodMsg), sig);
    r = await api("/auth/verify", { token: tokA, body: { message: goodMsg, signature: sig, address: addr } });
    ok("UP-Anmeldung über Vertragsprüfung (EIP-1271)", r.status === 200 && r.j.address === addr && calls.rpc.at(-1).params[0].to === addr);
    ok("Nonce nur einmal gültig", (await api("/auth/verify", { token: tokA, body: { message: goodMsg, signature: sig, address: addr } })).status === 400);
    r = await api("/auth/nonce", { token: tokA });
    const evil = msg("boese.example", r.j.nonce); rpcExpect = encodeIsValidSignature(hashPersonal(evil), sig);
    ok("Fremde Domain abgelehnt", (await api("/auth/verify", { token: tokA, body: { message: evil, signature: sig, address: addr } })).status === 401);
    r = await api("/auth/nonce", { token: tokA }); rpcExpect = "x";
    ok("Ungültige Signatur abgelehnt", (await api("/auth/verify", { token: tokA, body: { message: msg("app.example.eu", r.j.nonce), signature: sig, address: addr } })).status === 401);

    /* Zweites Gerät: gleiche E-Mail → gleiches Konto */
    const tokB = (await api("/session/anon", { body: {} })).j.token;
    await api("/auth/email/start", { token: tokB, body: { email: "nutzer@example.eu", mode: "login" } });
    const mB = calls.mails.filter((m) => m.subject.includes("Anmeldelink")).at(-1);
    await api("/auth/email/finish", { token: tokB, body: { token: mB.text.match(/\?login=([A-Za-z0-9_-]+)/)[1] } });
    r = await api("/me", { token: tokB });
    ok("Zweites Gerät sieht dieselben Käufe", r.j.account.email === "nutzer@example.eu" && r.j.account.up === addr && r.j.orders.length >= 3);

    /* Erinnerungen */
    const sub = { endpoint: pushSvc.url.replace("http:", "https:") + "/push/abc", keys: { p256dh: ua.getPublicKey().toString("base64url"), auth: uaAuth.toString("base64url") } };
    ok("Push-Adresse muss https sein", (await api("/subscribe", { body: { subscription: { ...sub, endpoint: "http://x/y" }, schedule: [] } })).status === 400);
    r = await api("/subscribe", { body: { subscription: sub, profile: "main", schedule: [{ key: "l1:3", at: Date.now() + 120000, title: "Frist in 3 Tagen", body: "Frist" }] } });
    ok("Erinnerungsplan gespeichert", r.status === 200);
    r = await api("/cal/sync", { body: { token: "T".repeat(40), ics: "BEGIN:VCALENDAR\r\nEND:VCALENDAR" } });
    const calGet = await fetch(S.base + "/cal/" + "T".repeat(40) + ".ics");
    ok("Kalender-Abo abrufbar", calGet.status === 200 && (await calGet.text()).startsWith("BEGIN:VCALENDAR") && calGet.headers.get("content-type").startsWith("text/calendar"));
    ok("Unbekanntes Kalender-Abo: 404", (await fetch(S.base + "/cal/" + "X".repeat(40) + ".ics")).status === 404);

    /* Newsletter Double-Opt-in */
    await api("/newsletter/subscribe", { body: { email: "news@example.eu", consentText: "Ich möchte den Newsletter." } });
    for (let i = 0; i < 40 && !calls.mails.find((m) => m.to === "news@example.eu"); i++) await new Promise((x) => setTimeout(x, 50));
    const nm = calls.mails.find((m) => m.to === "news@example.eu");
    const confirmUrl = nm.text.match(/(http\S+newsletter\/confirm\?t=\S+)/)[1];
    const cr = await fetch(confirmUrl); const crText = await cr.text();
    ok("Newsletter erst nach Bestätigung", crText.includes("Anmeldung bestätigt"));
    for (let i = 0; i < 40 && calls.mails.filter((m) => m.to === "news@example.eu").length < 2; i++) await new Promise((x) => setTimeout(x, 50));
    const welcome = calls.mails.filter((m) => m.to === "news@example.eu").at(-1);
    const unsub = await (await fetch(welcome.text.match(/(http\S+unsubscribe\?t=\S+)/)[1])).text();
    ok("Abmeldelink funktioniert", unsub.includes("Abgemeldet"));

    /* Bewertungen ohne Brieftext */
    ok("Bewertung gespeichert", (await api("/feedback", { body: { kind: "translation", v: -1, comment: "zu förmlich", lang: "fa" } })).status === 200);

    /* Konto löschen */
    r = await api("/account/delete", { token: tokB, body: {} });
    ok("Konto gelöscht, Sitzungen ungültig", r.status === 200 && (await api("/me", { token: tokA })).status === 401 && (await api("/me", { token: tokB })).status === 401);
  } finally { S.p.kill(); }

  /* Push-Versand: eigener Lauf mit fälliger Erinnerung (im Test direkt ausgelöst) */
  {
    process.env.DB_FILE = path.join(tmp, "push.db"); process.env.ENV_FILE = "/nonexistent";
    process.env.VAPID_PUBLIC = vapid.publicKey; process.env.VAPID_PRIVATE = vapid.privateKey; process.env.APP_URL = "https://app.example.eu";
    const mod = require("../server.js");
    const sub = { endpoint: pushSvc.url + "/push/xyz", keys: { p256dh: ua.getPublicKey().toString("base64url"), auth: uaAuth.toString("base64url") } };
    mod.db.prepare("INSERT INTO push (key, subscription, schedule, updated) VALUES (?, ?, ?, ?)").run(sub.endpoint + "|main", JSON.stringify(sub),
      JSON.stringify([{ key: "l1:1", at: Date.now() - 1000, title: "Frist morgen", body: "Mahnung" }, { key: "l1:0", at: Date.now() + 864e5, title: "später", body: "" }]), Date.now());
    await mod.pushTick();
    const pc = calls.push.at(-1);
    ok("Fällige Erinnerung gesendet (verschlüsselt, VAPID)", !!pc && pc.headers["content-encoding"] === "aes128gcm" && /^vapid t=.+, k=/.test(pc.headers.authorization));
    const dec = decryptPush(pc.body);
    ok("Handy kann Erinnerung entschlüsseln", dec.title === "Frist morgen" && dec.body === "Mahnung");
    ok("Spätere Erinnerung bleibt geplant", JSON.parse(mod.db.prepare("SELECT schedule FROM push").get().schedule).length === 1);
  }

  /* Amazon Bedrock (EU) statt direkter API */
  {
    const B = await start({ AI_PROVIDER: "bedrock", BEDROCK_BASE: bedrock.url, AWS_ACCESS_KEY_ID: "AKIDTEST", AWS_SECRET_ACCESS_KEY: "secret", BEDROCK_REGION: "eu-central-1", BEDROCK_MODEL: "eu.anthropic.claude-sonnet-5-5", PAYMENT_REQUIRED: "false" });
    try {
      const tok = (await (await fetch(B.base + "/session/anon", { method: "POST" })).json()).token;
      const r = await (await fetch(B.base + "/ai/translate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify({ letterId: "x", text: "Brief", lang: "فارسی" }) })).json();
      const c = calls.bedrock.at(-1);
      ok("Bedrock: EU-Modellprofil, signiert, Anthropic-Format", r.text === "BEDROCK" && c.url === "/model/eu.anthropic.claude-sonnet-5-5/invoke" && /^AWS4-HMAC-SHA256 Credential=AKIDTEST\/\d{8}\/eu-central-1\/bedrock\/aws4_request/.test(c.headers.authorization) && c.body.anthropic_version === "bedrock-2023-05-31");
      ok("Sprache auch in nicht-lateinischer Schrift korrekt übergeben", c.body.messages[0].content.includes("nach فارسی"));
    } finally { B.p.kill(); }
  }

  /* Weitere Clouds: WebDAV-Weiterleitung und Box-Anmeldung */
  {
    const dav = require("../lib/dav");
    ok("WebDAV: interne Adressen gesperrt", dav.isPrivateIp("127.0.0.1") && dav.isPrivateIp("10.1.2.3") && dav.isPrivateIp("192.168.1.5") && dav.isPrivateIp("169.254.169.254") && dav.isPrivateIp("::1") && dav.isPrivateIp("fd00::1") && !dav.isPrivateIp("8.8.8.8"));
    const rej = async (prov, base) => { try { await dav.resolveBase(prov, base); return ""; } catch (e) { return e.code; } };
    ok("WebDAV: nur https, keine internen Ziele, keine Zugangsdaten in der Adresse", (await rej("nextcloud", "http://example.com/dav")) === "url" && (await rej("nextcloud", "https://127.0.0.1/dav")) === "host" && (await rej("nextcloud", "https://u:p@example.com/")) === "url" && (await rej("nextcloud", "https://example.com:8080/")) === "url" && (await rej("unbekannt", "")) === "provider");
    ok("WebDAV: feste Adressen der Anbieter", dav.DAV_PRESETS.gmx === "https://webdav.mc.gmx.net" && dav.DAV_PRESETS.webde === "https://webdav.smartdrive.web.de" && dav.DAV_PRESETS.magenta === "https://magentacloud.de/remote.php/webdav" && dav.DAV_PRESETS.hidrive === "https://webdav.hidrive.strato.com" && dav.DAV_PRESETS.hidriveionos === "https://webdav.hidrive.ionos.com");
    let pathErr = ""; try { dav.joinPath({ url: new URL("https://x/dav/") }, "a/../b"); } catch (e) { pathErr = e.code; }
    ok("WebDAV: kein Ausbruch aus dem Ordner (..)", pathErr === "path" && dav.joinPath({ url: new URL("https://x/dav/") }, "Ordner A/ä.pdf") === "/dav/Ordner%20A/%C3%A4.pdf");

    // Test-Gegenstelle: kleiner WebDAV-Server
    const store = { "/dav/Alt/": null, "/dav/Alt/brief.pdf": Buffer.from("PDFDATA"), "/dav/notiz ä.txt": Buffer.from("hallo") };
    const seen = [];
    const davMock = await mockHttp((req, body, rsp) => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization });
      if (req.headers.authorization !== "Basic " + Buffer.from("anna@gmx.de:app-pass").toString("base64")) { rsp.writeHead(401); return rsp.end(); }
      const pth = decodeURIComponent(req.url);
      if (req.method === "PROPFIND") {
        const dir = pth.endsWith("/") ? pth : pth + "/";
        const kids = Object.keys(store).filter((k) => k.startsWith(dir) && k !== dir && !k.slice(dir.length).replace(/\/$/, "").includes("/"));
        const item = (k) => `<D:response><D:href>${k.split("/").map(encodeURIComponent).join("/")}</D:href><D:propstat><D:prop><D:resourcetype>${k.endsWith("/") ? "<D:collection/>" : ""}</D:resourcetype>${k.endsWith("/") ? "" : `<D:getcontentlength>${store[k].length}</D:getcontentlength>`}</D:prop></D:propstat></D:response>`;
        rsp.writeHead(207, { "Content-Type": "application/xml" });
        return rsp.end(`<?xml version="1.0"?><D:multistatus xmlns:D="DAV:">${item(dir)}${kids.map(item).join("")}</D:multistatus>`);
      }
      if (req.method === "MKCOL") { if (store[pth] !== undefined) { rsp.writeHead(405); return rsp.end(); } store[pth] = null; rsp.writeHead(201); return rsp.end(); }
      if (req.method === "PUT") { store[pth] = body; rsp.writeHead(201); return rsp.end(); }
      if (req.method === "GET") { if (!store[pth]) { rsp.writeHead(404); return rsp.end(); } rsp.writeHead(200, { "Content-Type": "application/pdf" }); return rsp.end(store[pth]); }
      rsp.writeHead(405); rsp.end();
    });
    const boxMock = await mockHttp((req, body, rsp) => {
      const f = new URLSearchParams(body.toString());
      calls.box = { url: req.url, form: Object.fromEntries(f) };
      if (f.get("code") === "good" && f.get("client_secret") === "box-secret") return json(rsp, 200, { access_token: "BOXTOKEN", refresh_token: "REFRESH", expires_in: 3600 });
      json(rsp, 400, { error: "invalid_grant" });
    });
    const C = await start({ DAV_TEST_INSECURE: "true", DAV_TEST_PRESETS: JSON.stringify({ gmx: davMock.url + "/dav" }), DAV_MAX_MB: "1", BOX_CLIENT_ID: "box-id", BOX_CLIENT_SECRET: "box-secret", BOX_BASE: boxMock.url });
    try {
      const call = async (pth, body, token) => { const r = await fetch(C.base + pth, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
      const tok = (await (await fetch(C.base + "/session/anon", { method: "POST" })).json()).token;
      const cfgOut = await (await fetch(C.base + "/config")).json();
      ok("Einstellungen melden WebDAV und Box (ohne Geheimnis)", cfgOut.dav === true && cfgOut.boxClientId === "box-id" && !JSON.stringify(cfgOut).includes("box-secret"));
      const cred = { provider: "gmx", user: "anna@gmx.de", pass: "app-pass" };
      ok("WebDAV: ohne Sitzung kein Zugriff", (await call("/dav/list", cred)).status === 401);
      const l = await call("/dav/list", { ...cred, path: "" }, tok);
      ok("WebDAV: Ordner auflisten (Ordner zuerst, Umlaute, Größe)", l.status === 200 && l.data.items.length === 2 && l.data.items[0].folder && l.data.items[0].name === "Alt" && l.data.items[1].name === "notiz ä.txt" && l.data.items[1].size === 5);
      const l2 = await call("/dav/list", { ...cred, path: "Alt" }, tok);
      ok("WebDAV: Unterordner auflisten", l2.status === 200 && l2.data.items.length === 1 && l2.data.items[0].id === "Alt/brief.pdf");
      const g = await call("/dav/get", { ...cred, path: "Alt/brief.pdf" }, tok);
      ok("WebDAV: Datei holen", g.status === 200 && Buffer.from(g.data.b64, "base64").toString() === "PDFDATA" && g.data.type === "application/pdf");
      const pu = await call("/dav/put", { ...cred, name: "Krank/meldung ä.pdf.enc", b64: Buffer.from("GEHEIM").toString("base64"), type: "application/octet-stream" }, tok);
      ok("WebDAV: Datei sichern in Ordner Briefe-App (Name bereinigt)", pu.status === 200 && pu.data.path === "Briefe-App/Krank_meldung ä.pdf.enc" && store["/dav/Briefe-App/Krank_meldung ä.pdf.enc"].toString() === "GEHEIM" && store["/dav/Briefe-App/"] === null);
      const pu2 = await call("/dav/put", { ...cred, name: "zwei.txt", b64: Buffer.from("2").toString("base64") }, tok);
      ok("WebDAV: vorhandener Ordner ist kein Fehler", pu2.status === 200);
      ok("WebDAV: falsches Passwort wird gemeldet", (await call("/dav/list", { ...cred, pass: "falsch" }, tok)).data.error === "dav-login");
      ok("WebDAV: Pfad mit .. abgelehnt", (await call("/dav/get", { ...cred, path: "../etc/passwd" }, tok)).data.error === "dav-path");
      ok("WebDAV: zu große Datei abgelehnt", (await call("/dav/put", { ...cred, name: "gross.bin", b64: Buffer.alloc(1100000, 1).toString("base64") }, tok)).status === 413);
      ok("WebDAV: fehlende Datei gemeldet", (await call("/dav/get", { ...cred, path: "gibtsnicht.pdf" }, tok)).data.error === "dav-not-found");
      ok("WebDAV: Zugangsdaten nicht in der Datenbank", !fs.readFileSync(path.join(tmp, fs.readdirSync(tmp).filter((f) => f.endsWith(".db")).at(-1))).includes("app-pass") && !C.err().includes("app-pass"));
      const b1 = await call("/cloud/box/token", { code: "good", redirectUri: "https://app.example.eu/" }, tok);
      ok("Box: Code-Tausch über den Server, kein Refresh-Token an die App", b1.status === 200 && b1.data.accessToken === "BOXTOKEN" && !JSON.stringify(b1.data).includes("REFRESH") && calls.box.form.client_id === "box-id");
      ok("Box: fremde Rücksprung-Adresse abgelehnt", (await call("/cloud/box/token", { code: "good", redirectUri: "https://boese.example/" }, tok)).status === 400);
      ok("Box: falscher Code gemeldet", (await call("/cloud/box/token", { code: "bad", redirectUri: "https://app.example.eu/" }, tok)).data.error === "box");
    } finally { C.p.kill(); davMock.server.close(); boxMock.server.close(); }
    const D = await start({ DAV_ENABLED: "false" });
    try {
      const tok = (await (await fetch(D.base + "/session/anon", { method: "POST" })).json()).token;
      const r = await fetch(D.base + "/dav/list", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify({ provider: "gmx", user: "a", pass: "b" }) });
      const c2 = await (await fetch(D.base + "/config")).json();
      ok("Betreiberschalter: WebDAV aus, Box ohne Schlüssel aus", r.status === 503 && c2.dav === false && c2.boxClientId === null);
    } finally { D.p.kill(); }
  }

  for (const s of [anthropic, bedrock, stripeMock, rpc, pushSvc, smtp]) s.server.close();
  console.log(`\n${passed} Prüfungen bestanden.`);
  process.exit(0);
}
main().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
