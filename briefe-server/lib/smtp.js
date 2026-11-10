"use strict";
// Minimaler SMTP-Versand (TLS auf Port 465 oder STARTTLS auf 587), ohne Fremdpakete
const net = require("net"); const tls = require("tls"); const crypto = require("crypto");
const encWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`);
const encAddr = (name, addr) => (name ? `${encWord(name)} <${addr}>` : `<${addr}>`);
function lineReader(sock) {
  let buf = ""; const waiters = []; const lines = [];
  const onData = (d) => { buf += d.toString("utf8"); let i; while ((i = buf.indexOf("\r\n")) >= 0) { lines.push(buf.slice(0, i)); buf = buf.slice(i + 2); } pump(); };
  const pump = () => {
    while (waiters.length) {
      const end = lines.findIndex((l) => /^\d{3} /.test(l));
      if (end < 0) return;
      const resp = lines.splice(0, end + 1);
      waiters.shift()({ code: Number(resp[end].slice(0, 3)), text: resp.join("\n") });
    }
  };
  sock.on("data", onData);
  return { next: () => new Promise((res) => { waiters.push(res); pump(); }), detach: () => sock.removeListener("data", onData) };
}
async function sendMail(cfg, { to, subject, text }) {
  if (!cfg.SMTP_HOST) { console.log(`[mail-demo] an ${to}: ${subject}\n${text}\n[/mail-demo]`); return { demo: true }; }   // ohne Mailserver: Ausgabe in der Konsole (nur für Tests)
  const port = Number(cfg.SMTP_PORT || 587); const secure = cfg.SMTP_SECURE || (port === 465 ? "tls" : "starttls");
  let sock = secure === "tls" ? tls.connect({ host: cfg.SMTP_HOST, port, servername: cfg.SMTP_HOST }) : net.connect({ host: cfg.SMTP_HOST, port });
  sock.setTimeout(20000, () => sock.destroy(new Error("smtp timeout")));
  await new Promise((res, rej) => { sock.once(secure === "tls" ? "secureConnect" : "connect", res); sock.once("error", rej); });
  let rd = lineReader(sock);
  const cmd = async (line, ok) => { if (line !== null) sock.write(line + "\r\n"); const r = await rd.next(); if (!ok.includes(Math.floor(r.code / 100) * 100) && !ok.includes(r.code)) throw new Error(`smtp ${r.text}`); return r; };
  const host = cfg.SMTP_HELO || "briefe-app.local";
  await cmd(null, [220]);
  let ehlo = await cmd(`EHLO ${host}`, [250]);
  if (secure === "starttls") {
    if (!/STARTTLS/i.test(ehlo.text)) throw new Error("smtp: server does not offer STARTTLS");
    await cmd("STARTTLS", [220]);
    rd.detach();
    sock = tls.connect({ socket: sock, servername: cfg.SMTP_HOST });
    await new Promise((res, rej) => { sock.once("secureConnect", res); sock.once("error", rej); });
    rd = lineReader(sock);
    ehlo = await cmd(`EHLO ${host}`, [250]);
  }
  if (cfg.SMTP_USER) await cmd(`AUTH PLAIN ${Buffer.from(`\0${cfg.SMTP_USER}\0${cfg.SMTP_PASS}`).toString("base64")}`, [235]);
  await cmd(`MAIL FROM:<${cfg.MAIL_FROM}>`, [250]);
  await cmd(`RCPT TO:<${to}>`, [250, 251]);
  await cmd("DATA", [354]);
  const msgId = `<${crypto.randomUUID()}@${cfg.MAIL_FROM.split("@")[1] || "localhost"}>`;
  const body = Buffer.from(text, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");
  const msg = [
    `From: ${encAddr(cfg.MAIL_FROM_NAME || "Briefe-App", cfg.MAIL_FROM)}`, `To: <${to}>`, `Subject: ${encWord(subject)}`,
    `Date: ${new Date().toUTCString()}`, `Message-ID: ${msgId}`, "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", body,
  ].join("\r\n");
  sock.write(msg.replace(/^\./gm, "..") + "\r\n.\r\n");
  await cmd(null, [250]);
  await cmd("QUIT", [221]).catch(() => {});
  sock.end();
  return { messageId: msgId };
}
module.exports = { sendMail };
