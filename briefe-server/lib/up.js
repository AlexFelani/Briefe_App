"use strict";
// Anmeldung mit LUKSO Universal Profile: Nachricht nach EIP-4361 prüfen, Signatur über den
// Vertrag des Profils prüfen (EIP-1271, isValidSignature) – keine Fremdbibliothek nötig
const { keccak256 } = require("./keccak");
function parseSiwe(msg) {
  const m = String(msg).match(/^(\S+) wants you to sign in with your Ethereum account:\n(0x[0-9a-fA-F]{40})\n/);
  if (!m) return null;
  const field = (name) => (String(msg).match(new RegExp(`^${name}: (.+)$`, "m")) || [])[1] || null;
  return { domain: m[1], address: m[2], uri: field("URI"), version: field("Version"), chainId: Number(field("Chain ID")), nonce: field("Nonce"), issuedAt: field("Issued At") };
}
const hashPersonal = (message) => {
  const b = Buffer.from(message, "utf8");
  return keccak256(Buffer.concat([Buffer.from(`\x19Ethereum Signed Message:\n${b.length}`), b]));
};
function encodeIsValidSignature(hash, sigHex) {
  const sig = Buffer.from(sigHex.replace(/^0x/, ""), "hex");
  const word = (n) => n.toString(16).padStart(64, "0");
  const padded = Buffer.concat([sig, Buffer.alloc((32 - (sig.length % 32)) % 32)]);
  return "0x1626ba7e" + hash.toString("hex") + word(64) + word(sig.length) + padded.toString("hex");
}
async function verifyUp(cfg, { message, signature, address }, expect) {
  const p = parseSiwe(message);
  if (!p) return { ok: false, reason: "format" };
  if (p.address.toLowerCase() !== String(address).toLowerCase()) return { ok: false, reason: "address" };
  if (p.domain !== expect.domain) return { ok: false, reason: "domain" };
  if (p.nonce !== expect.nonce) return { ok: false, reason: "nonce" };
  const rpc = cfg.LUKSO_RPC[p.chainId];
  if (!rpc) return { ok: false, reason: "chain" };
  const issued = Date.parse(p.issuedAt || "");
  if (!issued || Math.abs(Date.now() - issued) > 10 * 60000) return { ok: false, reason: "time" };
  if (!/^0x[0-9a-fA-F]+$/.test(String(signature)) || signature.length > 2 + 2 * 1024) return { ok: false, reason: "signature" };
  const data = encodeIsValidSignature(hashPersonal(message), signature);
  const r = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: p.address, data }, "latest"] }) });
  const j = await r.json().catch(() => ({}));
  const ok = typeof j.result === "string" && j.result.toLowerCase().startsWith("0x1626ba7e");
  return ok ? { ok: true, address: p.address.toLowerCase(), chainId: p.chainId } : { ok: false, reason: "invalid" };
}
module.exports = { verifyUp, parseSiwe, hashPersonal, encodeIsValidSignature };
