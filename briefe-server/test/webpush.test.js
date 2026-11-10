// Prüfwerte aus RFC 8291, Anhang A und Abschnitt 5
const assert = require("assert"); const crypto = require("crypto");
const { encrypt, vapidHeaders, generateVapidKeys } = require("../lib/webpush");
const out = encrypt(Buffer.from("V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24", "base64url"),
  "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4", "BTBZMqHH6r4Tts7J_aSIgg",
  { asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw", salt: "DGv6ra1nlYgDCS1FRnbzlw" });
assert.strictEqual(out.subarray(86).toString("base64url"), "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ");
assert.strictEqual(out.toString("base64url"),
  "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml" + "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT" + "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN");
console.log("PASS Web-Push-Verschlüsselung = RFC 8291 Prüfwert");
// VAPID-Signatur mit dem öffentlichen Schlüssel prüfen
const k = generateVapidKeys();
const h = vapidHeaders("https://fcm.googleapis.com/fcm/send/abc", { ...k, subject: "mailto:test@example.eu" }).Authorization;
const jwt = h.match(/t=([^,]+)/)[1]; const [hd, bd, sg] = jwt.split(".");
const pub = Buffer.from(k.publicKey, "base64url");
const key = crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") }, format: "jwk" });
assert(crypto.verify("sha256", Buffer.from(hd + "." + bd), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(sg, "base64url")));
assert.strictEqual(JSON.parse(Buffer.from(bd, "base64url")).aud, "https://fcm.googleapis.com");
console.log("PASS VAPID-Signatur gültig");
