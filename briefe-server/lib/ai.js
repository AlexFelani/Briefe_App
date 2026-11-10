"use strict";
// KI-Aufrufe: Der Server baut die Anweisungen selbst. Die App schickt nur Daten.
// So kann niemand den Server als freien KI-Zugang missbrauchen.
// Die Anweisungstexte müssen mit buildAiRequest() in BriefeApp.jsx übereinstimmen.
const crypto = require("crypto");

const EXTRACT_PROMPT = `Du liest ein Schreiben (Behörden- oder Firmenpost, meist Deutsch). Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, ohne Markdown und ohne Erklärung, mit genau diesen Feldern:
{"subject": "kurzer Betreff", "sender": "Absender (Organisation)", "caseNumber": "Aktenzeichen, Geschäftszeichen oder Kundennummer, sonst null", "letterDate": "YYYY-MM-DD oder null", "deadline": "YYYY-MM-DD, nur wenn ein Fristdatum ausdrücklich genannt ist, sonst null", "deadlineNote": "Frist nur als Zeitspanne (z. B. 'innerhalb von 14 Tagen nach Zugang'), sonst null", "pages": Seitenanzahl als Zahl, "text": "vollständige Texterkennung des Schreibens im Original, Absätze mit Zeilenumbruch"}
Erfinde nichts. Was nicht im Dokument steht, ist null.`;

// Gegenprobe durch die KI: vergleicht Original und Übersetzung
const CHECK_PROMPT = (lang) => `Du prüfst die Übersetzung eines deutschen Behördenbriefs. Vergleiche das deutsche Original mit der Übersetzung. Prüfe: Fehlt etwas? Wurde etwas hinzugefügt? Ist ein Datum, eine Frist, ein Betrag, ein Aktenzeichen, ein Name oder die Bedeutung eines Satzes verändert? Antworte auf ${lang}. Wenn du keine Abweichung findest, antworte mit einem einzigen kurzen Satz, dass keine Abweichungen gefunden wurden. Sonst liste die Abweichungen kurz auf und zitiere dabei die Stelle aus dem deutschen Original. Erfinde nichts und bewerte den Inhalt des Briefs nicht.`;

const lim = (s, n) => String(s ?? "").slice(0, n);
const langName = (s) => lim(String(s ?? "").replace(/[^\p{L}\p{M} ()\-]/gu, ""), 40).trim() || "Englisch";
const IMG_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

class BadInput extends Error {}

// Baut die Anfrage je Aufgabe; Größen sind begrenzt
function buildAiRequest(kind, p = {}) {
  switch (kind) {
    case "extract": {
      const blocks = Array.isArray(p.blocks) ? p.blocks : [];
      if (blocks.length > 30) throw new BadInput("too many blocks");
      let total = 0;
      const clean = blocks.map((b) => {
        const src = b?.source || {};
        if (src.type !== "base64" || typeof src.data !== "string") throw new BadInput("bad block");
        total += src.data.length;
        if (b.type === "image" && IMG_TYPES.includes(src.media_type)) return { type: "image", source: { type: "base64", media_type: src.media_type, data: src.data } };
        if (b.type === "document" && src.media_type === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data: src.data } };
        throw new BadInput("bad block type");
      });
      if (total > 28 * 1024 * 1024) throw new BadInput("too large");
      const extra = lim(p.extraText, 60000);
      if (!clean.length && !extra) throw new BadInput("empty");
      return { content: [...clean, { type: "text", text: EXTRACT_PROMPT + (extra ? "\n\nTextinhalt der Datei(en):" + extra : "") }], max: 16000 };
    }
    case "translate":
      return { prompt: `Übersetze den folgenden deutschen Behördenbrief exakt und vollständig nach ${langName(p.lang)}. Übernimm Datumsangaben, Beträge, Aktenzeichen, Kontonummern, Namen und Adressen unverändert (gleiche Ziffern, gleiche Schreibweise, keine Umrechnung in andere Kalender oder Währungen). Gib NUR die Übersetzung zurück, keine Erklärungen, keine Einleitung:\n\n${lim(p.text, 60000)}`, max: 16000 };
    case "reply":
      return { prompt: `Du hilfst, einen formellen deutschen Antwortbrief an eine Behörde zu entwerfen. Nutze AUSSCHLIESSLICH die Fakten aus dem Originalbrief und der Nutzerangabe unten. Erfinde keine Gesetze, keine Fristen, keine Zusagen, die nicht belegt sind. Formuliere höflich und sachlich auf Deutsch.${p.history ? `\n\nBisheriger Verlauf dieses Falls (nur als Hintergrund, nichts daraus erfinden):\n${lim(p.history, 20000)}` : ""}\n\nOriginalbrief:\n${lim(p.original, 60000)}\n\nAngabe des Nutzers (was er antworten möchte, evtl. in eigener Sprache formuliert):\n${lim(p.note, 8000) || "(keine zusätzliche Angabe, bitte allgemein und vorsichtig formulieren, ggf. um Fristverlängerung bitten falls thematisch passend)"}\n\nGib NUR den fertigen Brieftext zurück, ohne Erklärung.`, max: 4000 };
    case "replyTranslate":
      return { prompt: `Übersetze den folgenden deutschen Antwortbrief exakt und vollständig nach ${langName(p.lang)}, damit der Nutzer ihn vor dem Absenden prüfen kann. Gib NUR die Übersetzung zurück, keine Erklärungen:\n\n${lim(p.text, 30000)}`, max: 8000 };
    case "ui": {
      const part = p.part && typeof p.part === "object" ? p.part : null;
      if (!part) throw new BadInput("no part");
      const keys = Object.keys(part);
      if (keys.length > 60 || keys.some((k) => !/^\w{1,40}$/.test(k))) throw new BadInput("bad keys");
      const json = JSON.stringify(Object.fromEntries(keys.map((k) => [k, lim(part[k], 1200)])));
      if (json.length > 20000) throw new BadInput("too large");
      return { prompt: `Übersetze die Werte (nicht die Schlüssel) dieses JSON-Objekts mit App-Oberflächentexten nach ${langName(p.lang)}. Platzhalter in geschweiften Klammern wie {n}, {d}, {total} unverändert übernehmen. Namen wie Briefe-App, Google Drive, OneDrive, Dropbox, iCloud, LUKSO, Universal Profile, PDF, E-Mail-Adressen und URLs nicht übersetzen. Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt mit exakt denselben Schlüsseln, ohne Markdown:\n\n${json}`, max: 8000 };
    }
    case "search":
      return { prompt: `Nenne bis zu 10 deutsche Suchbegriffe (Übersetzung und Synonyme; verwende bei Verben und Nomen den Wortstamm, damit Beugungen mitgefunden werden), mit denen man in deutschen Behördenbriefen nach "${lim(p.q, 120).replace(/"/g, "'")}" suchen würde. Antworte NUR mit einem JSON-Array aus Strings.`, max: 400 };
    case "caseName":
      return { prompt: `Übersetze NUR diesen kurzen Titel eines Behördenfalls nach ${langName(p.lang)}, gib nur die Übersetzung zurück ohne Anführungszeichen, ohne Erklärung: "${lim(p.name, 200).replace(/"/g, "'")}"`, max: 200 };
    case "check": {
      const original = lim(p.original, 60000), translation = lim(p.translation, 60000);
      if (!original.trim() || !translation.trim()) throw new BadInput("empty");
      return { prompt: CHECK_PROMPT(langName(p.lang)) + `\n\nDEUTSCHES ORIGINAL:\n${original}\n\nÜBERSETZUNG:\n${translation}`, max: 2000 };
    }
    default:
      throw new BadInput("unknown kind");
  }
}

/* ---------- AWS-Signatur Version 4 (für Amazon Bedrock) ---------- */
const sha256hex = (d) => crypto.createHash("sha256").update(d).digest("hex");
const hmacB = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
const awsEnc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase());
function sigv4({ method, url, headers, body, region, service, accessKey, secretKey, sessionToken, amzDate }) {
  const u = new URL(url);
  const date = amzDate || new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const day = date.slice(0, 8);
  const h = { ...headers, host: u.host, "x-amz-date": date };
  if (sessionToken) h["x-amz-security-token"] = sessionToken;
  const names = Object.keys(h).map((k) => k.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, " ")]));
  const canonHeaders = names.map((n) => `${n}:${lower[n]}\n`).join("");
  const signed = names.join(";");
  const query = [...u.searchParams.entries()].map(([k, v]) => [awsEnc(k), awsEnc(v)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("&");
  const path = u.pathname.split("/").map((seg) => awsEnc(decodeURIComponent(seg))).join("/") || "/";
  const canon = [method, service === "s3" ? u.pathname : path.split("/").map((seg) => awsEnc(seg)).join("/"), query, canonHeaders, signed, sha256hex(body || "")].join("\n");
  const scope = `${day}/${region}/${service}/aws4_request`;
  const sts = ["AWS4-HMAC-SHA256", date, scope, sha256hex(canon)].join("\n");
  const kSig = hmacB(hmacB(hmacB(hmacB("AWS4" + secretKey, day), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", kSig).update(sts).digest("hex");
  return { ...h, Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signed}, Signature=${signature}` };
}

/* ---------- Modellaufruf ---------- */
async function callModel(cfg, req) {
  const messages = [{ role: "user", content: req.content || req.prompt }];
  let r;
  if (cfg.AI_PROVIDER === "bedrock") {
    const body = JSON.stringify({ anthropic_version: "bedrock-2023-05-31", max_tokens: req.max, messages });
    const url = `${cfg.BEDROCK_BASE || `https://bedrock-runtime.${cfg.BEDROCK_REGION}.amazonaws.com`}/model/${cfg.BEDROCK_MODEL}/invoke`;
    const headers = sigv4({ method: "POST", url, headers: { "content-type": "application/json", accept: "application/json" }, body, region: cfg.BEDROCK_REGION, service: "bedrock", accessKey: cfg.AWS_ACCESS_KEY_ID, secretKey: cfg.AWS_SECRET_ACCESS_KEY, sessionToken: cfg.AWS_SESSION_TOKEN });
    delete headers.host;
    r = await fetch(url, { method: "POST", headers, body });
  } else {
    r = await fetch(`${cfg.ANTHROPIC_BASE}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": cfg.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: cfg.ANTHROPIC_MODEL, max_tokens: req.max, messages }),
    });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error("ai upstream " + r.status); e.upstream = r.status; throw e; }
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  if (!text) throw new Error("ai empty");
  return { text, usage: data.usage || null };
}
module.exports = { buildAiRequest, callModel, sigv4, BadInput, EXTRACT_PROMPT };
