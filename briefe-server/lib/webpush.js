"use strict";
// Web Push ohne Fremdpakete: Verschlüsselung nach RFC 8291 (aes128gcm) und VAPID nach RFC 8292
const crypto = require("crypto");
const b64u = (b) => Buffer.from(b).toString("base64url");
const unb64u = (s) => Buffer.from(String(s), "base64url");
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();

function encrypt(plaintext, uaPublicB64, authB64, opts = {}) {
  const uaPublic = unb64u(uaPublicB64); const auth = unb64u(authB64);
  if (uaPublic.length !== 65 || auth.length !== 16) throw new Error("bad subscription keys");
  const ecdh = crypto.createECDH("prime256v1");
  if (opts.asPrivate) ecdh.setPrivateKey(unb64u(opts.asPrivate)); else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const salt = opts.salt ? unb64u(opts.salt) : crypto.randomBytes(16);
  const secret = ecdh.computeSecret(uaPublic);
  const prkKey = hmac(auth, secret);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = hmac(prkKey, Buffer.concat([keyInfo, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from("Content-Encoding: aes128gcm\0"), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from("Content-Encoding: nonce\0"), Buffer.from([1])])).subarray(0, 12);
  const rs = 4096;
  const data = Buffer.concat([Buffer.from(plaintext), Buffer.from([2])]);       // 0x02 = letzter Datensatz
  if (data.length + 16 > rs) throw new Error("payload too large");
  const c = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const ct = Buffer.concat([c.update(data), c.final(), c.getAuthTag()]);
  const header = Buffer.alloc(21); salt.copy(header, 0); header.writeUInt32BE(rs, 16); header[20] = asPublic.length;
  return Buffer.concat([header, asPublic, ct]);
}

function vapidHeaders(endpoint, { publicKey, privateKey, subject }) {
  const pub = unb64u(publicKey);
  const jwk = { kty: "EC", crv: "P-256", d: b64u(unb64u(privateKey)), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) };
  const key = crypto.createPrivateKey({ key: jwk, format: "jwk" });
  const head = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const body = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }));
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key, dsaEncoding: "ieee-p1363" });
  return { Authorization: `vapid t=${head}.${body}.${b64u(sig)}, k=${publicKey}` };
}

function generateVapidKeys() {
  const ecdh = crypto.createECDH("prime256v1"); ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
}

// Sendet eine Benachrichtigung; liefert den HTTP-Status (404/410 = Gerät abgemeldet)
async function sendPush(subscription, payload, vapid, ttl = 86400) {
  const body = encrypt(JSON.stringify(payload), subscription.keys.p256dh, subscription.keys.auth);
  const r = await fetch(subscription.endpoint, {
    method: "POST",
    headers: { ...vapidHeaders(subscription.endpoint, vapid), TTL: String(ttl), Urgency: "high", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" },
    body,
  });
  return r.status;
}
module.exports = { encrypt, vapidHeaders, generateVapidKeys, sendPush };
