import React from "react";
import { createRoot } from "react-dom/client";
import BriefeApp from "./BriefeApp.jsx";

/* Speicher für die eigenständige Web-App: Die App nutzt window.storage (wie in der Claude-Umgebung).
   Hier wird es durch den Gerätespeicher ersetzt (IndexedDB, ersatzweise localStorage). Alles bleibt auf dem Gerät. */
function makeStorage() {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open("briefe-app-kv", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction("kv", mode); const req = fn(t.objectStore("kv"));
      t.oncomplete = () => res(req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  };
  const ls = {
    get: async (k) => { const v = localStorage.getItem("briefe:" + k); return v === null ? null : { key: k, value: v }; },
    set: async (k, v) => { localStorage.setItem("briefe:" + k, v); return { key: k, value: v }; },
    delete: async (k) => { localStorage.removeItem("briefe:" + k); return { key: k, deleted: true }; },
  };
  if (typeof indexedDB === "undefined") return ls;
  return {
    get: async (k) => { try { const v = await tx("readonly", (s) => s.get(k)); return v === undefined ? null : { key: k, value: v }; } catch (e) { return ls.get(k); } },
    set: async (k, v) => { try { await tx("readwrite", (s) => s.put(v, k)); } catch (e) { await ls.set(k, v); } return { key: k, value: v }; },
    delete: async (k) => { try { await tx("readwrite", (s) => s.delete(k)); } catch (e) {} await ls.delete(k); return { key: k, deleted: true }; },
  };
}
if (!window.storage) window.storage = makeStorage();
try { navigator.storage?.persist?.(); } catch (e) {}

// Service Worker: Offline-Betrieb und Fristen-Erinnerungen bei geschlossener App
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => { navigator.serviceWorker?.register("./sw.js").catch(() => {}); });
}

createRoot(document.getElementById("root")).render(<BriefeApp />);
