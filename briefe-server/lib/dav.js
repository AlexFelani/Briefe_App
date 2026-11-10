"use strict";
// WebDAV-Weiterleitung für Clouds, die keinen direkten Zugriff aus dem Browser erlauben
// (MagentaCLOUD, GMX, WEB.DE, HiDrive, Nextcloud). Zugangsdaten werden nur durchgereicht,
// nie gespeichert und nie protokolliert.
const http = require("http");
const https = require("https");
const dns = require("dns").promises;
const net = require("net");

// Feste Adressen der bekannten Anbieter. "nextcloud" = eigene Adresse des Nutzers.
const DAV_PRESETS = {
  magenta: "https://magentacloud.de/remote.php/webdav",
  gmx: "https://webdav.mc.gmx.net",
  webde: "https://webdav.smartdrive.web.de",
  hidrive: "https://webdav.hidrive.strato.com",
  hidriveionos: "https://webdav.hidrive.ionos.com",
};
const APP_FOLDER = "Briefe-App";

class DavError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }

// Interne Adressen sperren, damit der Server nicht als Sprungbrett ins eigene Netz dient
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith("::ffff:")) return isPrivateIp(x.slice(7));
  return x === "::" || x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || x.startsWith("ff");
}

// Grundadresse bestimmen und prüfen. opts.insecure nur für automatische Tests.
async function resolveBase(provider, baseInput, opts = {}) {
  let raw = DAV_PRESETS[provider];
  if (opts.presets && opts.presets[provider]) raw = opts.presets[provider];
  if (!raw) {
    if (provider !== "nextcloud") throw new DavError("provider", 400);
    raw = String(baseInput || "").trim();
  }
  let u;
  try { u = new URL(raw); } catch (e) { throw new DavError("url", 400); }
  if (u.username || u.password || u.hash) throw new DavError("url", 400);
  if (u.protocol !== "https:" && !(opts.insecure && u.protocol === "http:")) throw new DavError("url", 400);
  if (!opts.insecure && u.port && u.port !== "443") throw new DavError("url", 400);
  let address = u.hostname.replace(/^\[|\]$/g, "");
  if (!net.isIP(address)) {
    try { address = (await dns.lookup(u.hostname)).address; } catch (e) { throw new DavError("host", 400); }
  }
  if (!opts.insecure && isPrivateIp(address)) throw new DavError("host", 400);
  u.search = "";
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return { url: u, address };
}

// Pfad unterhalb der Grundadresse sicher zusammensetzen (kein "..", keine Steuerzeichen)
function joinPath(base, rel) {
  const parts = String(rel || "").split("/").filter(Boolean);
  for (const p of parts) if (p === "." || p === ".." || /[\u0000-\u001f\\]/.test(p)) throw new DavError("path", 400);
  return base.url.pathname + parts.map(encodeURIComponent).join("/");
}

function request(base, method, pathname, { user, pass, headers = {}, body, maxBytes = 40 * 1024 * 1024, timeout = 30000 }) {
  return new Promise((resolve, reject) => {
    const mod = base.url.protocol === "https:" ? https : http;
    const req = mod.request({
      method, host: base.url.hostname, port: base.url.port || (base.url.protocol === "https:" ? 443 : 80), path: pathname,
      servername: net.isIP(base.url.hostname) ? undefined : base.url.hostname,
      // Verbindung fest an die geprüfte Adresse binden (kein zweites Nachschlagen des Namens)
      lookup: (h, o, cb) => (o && o.all ? cb(null, [{ address: base.address, family: net.isIPv6(base.address) ? 6 : 4 }]) : cb(null, base.address, net.isIPv6(base.address) ? 6 : 4)),
      headers: { Authorization: "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64"), "User-Agent": "Briefe-App", ...headers, ...(body ? { "Content-Length": body.length } : {}) },
      timeout,
    }, (res) => {
      const chunks = []; let size = 0;
      res.on("data", (c) => { size += c.length; if (size > maxBytes) { req.destroy(); reject(new DavError("too-large", 413)); } else chunks.push(c); });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on("error", () => reject(new DavError("network", 502)));
    });
    req.on("timeout", () => { req.destroy(); reject(new DavError("timeout", 504)); });
    req.on("error", () => reject(new DavError("network", 502)));
    if (body) req.write(body);
    req.end();
  });
}
const check = (r, okCodes) => {
  if (okCodes.includes(r.status)) return r;
  if (r.status === 401 || r.status === 403) throw new DavError("login", 401);
  if (r.status === 404) throw new DavError("not-found", 404);
  if (r.status === 507) throw new DavError("full", 507);
  throw new DavError("dav", 502);
};

const xmlDecode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, "&");
// Antwort auf PROPFIND lesen (Namensraum-Kürzel sind je Server verschieden)
function parseMultistatus(xml, basePath, selfPath) {
  const out = [];
  const norm = (p) => { try { return decodeURIComponent(p); } catch (e) { return p; } };
  const self = norm(selfPath).replace(/\/+$/, "");
  const root = norm(basePath).replace(/\/+$/, "");
  for (const m of xml.matchAll(/<(?:[\w-]+:)?response\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?response>/gi)) {
    const blk = m[1];
    const href = (blk.match(/<(?:[\w-]+:)?href\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?href>/i) || [])[1];
    if (!href) continue;
    let p = xmlDecode(href.trim());
    try { p = new URL(p, "https://x").pathname; } catch (e) { /* bleibt */ }
    p = norm(p).replace(/\/+$/, "");
    if (p === self || !p.startsWith(root)) continue;
    const folder = /<(?:[\w-]+:)?collection\b/i.test(blk);
    const size = Number((blk.match(/<(?:[\w-]+:)?getcontentlength\b[^>]*>(\d+)</i) || [])[1] || 0);
    const rel = p.slice(root.length).replace(/^\/+/, "");
    const name = rel.split("/").pop();
    if (name) out.push({ id: rel, name, folder, size });
  }
  return out.sort((a, b) => (a.folder === b.folder ? a.name.localeCompare(b.name) : a.folder ? -1 : 1));
}

const PROPFIND_BODY = Buffer.from('<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/></d:prop></d:propfind>');

async function davList(base, cred, rel) {
  const p = joinPath(base, rel) + (rel ? "/" : "");
  const r = check(await request(base, "PROPFIND", p, { ...cred, headers: { Depth: "1", "Content-Type": "application/xml; charset=utf-8" }, body: PROPFIND_BODY, maxBytes: 8 * 1024 * 1024 }), [207]);
  return parseMultistatus(r.body.toString("utf8"), base.url.pathname, p);
}
async function davGet(base, cred, rel, maxBytes) {
  if (!rel) throw new DavError("path", 400);
  const r = check(await request(base, "GET", joinPath(base, rel), { ...cred, maxBytes }), [200]);
  return { data: r.body, type: String(r.headers["content-type"] || "application/octet-stream").split(";")[0] };
}
async function davPut(base, cred, name, data, type) {
  const clean = String(name || "").replace(/[\/\\\u0000-\u001f]/g, "_").slice(0, 200);
  if (!clean || clean === "." || clean === "..") throw new DavError("path", 400);
  // Ordner "Briefe-App" anlegen; 405/301 = gibt es schon
  const mk = await request(base, "MKCOL", joinPath(base, APP_FOLDER) + "/", { ...cred });
  if (![201, 405, 301, 200, 204].includes(mk.status)) check(mk, [201]);
  check(await request(base, "PUT", joinPath(base, APP_FOLDER + "/" + clean), { ...cred, headers: { "Content-Type": type || "application/octet-stream" }, body: data, timeout: 120000 }), [200, 201, 204]);
  return { path: APP_FOLDER + "/" + clean };
}

module.exports = { DAV_PRESETS, DavError, resolveBase, isPrivateIp, joinPath, parseMultistatus, davList, davGet, davPut };
