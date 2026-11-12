# Briefe-App – Inbetriebnahme

Zwei Teile:

| Ordner | Was | Läuft wo |
|---|---|---|
| `briefe-web/` | Die App (React). Dokumente, Fotos und Fälle bleiben auf dem Gerät. Die KI ist beim Start aus; der Nutzer schaltet sie selbst ein. | Als statische Website, z. B. `app.deine-domain.de` |
| `briefe-server/` | Der Server: KI-Zugang mit geheimem Schlüssel, Anmeldung, Zahlungen, Erinnerungen, Newsletter. Er speichert keine Inhalte von Dokumenten. | Auf einem EU-Server, z. B. `api.deine-domain.de` |

Der Server braucht nur **Node.js ab Version 22.13**. Fremdpakete gibt es keine, deshalb entfällt `npm install`. Die Datenbank (SQLite) ist in Node.js eingebaut.

---

## 1. Lokal ausprobieren (ohne Konten, ohne Kosten)

```bash
cd briefe-server
npm test                      # 76 automatische Prüfungen (u. a. offizielle Prüfwerte RFC 8291 und AWS)
cp .env.example .env          # Werte eintragen
npm start
```

Ohne Mailserver erscheinen E-Mails (z. B. Anmeldelinks) in der Konsole.

```bash
cd briefe-web
npm install
npm run dev
```

In `src/BriefeApp.jsx` oben `SERVER_URL` eintragen, z. B. `"http://localhost:3000"`.

---

## 2. Live gehen – Schritt für Schritt

### A. Server und Domain
1. EU-Server mieten (Rechenzentrum in Deutschland/EU). Mit dem Anbieter einen **Auftragsverarbeitungsvertrag (AVV)** abschließen.
2. Node.js ≥ 22.13 und [Caddy](https://caddyserver.com) installieren. Caddy holt die HTTPS-Zertifikate automatisch.
3. `briefe-server/` nach `/opt/briefe-server` kopieren und einen Benutzer `briefe` anlegen.
4. Dann:

   ```bash
   cp deploy/briefe-server.service /etc/systemd/system/
   systemctl enable --now briefe-server
   ```

5. `deploy/Caddyfile` anpassen (Domains) und nach `/etc/caddy/Caddyfile` kopieren.
6. Datensicherung: `deploy/backup.sh` als täglichen Cronjob einrichten (verschlüsselt).

### B. KI (empfohlen: Amazon Bedrock in der EU)
- **Bedrock:**
  - Ein AWS-Konto anlegen und in der Region `eu-central-1` (Frankfurt) den Modellzugang für Claude Sonnet 5.5 freischalten.
  - Einen IAM-Nutzer anlegen, der nur `bedrock:InvokeModel` darf. Dessen Schlüssel kommen in `.env`.
  - Das EU-Profil `eu.anthropic.claude-sonnet-5-5` leitet laut AWS nur auf EU-Regionen weiter. Das `global.`-Profil darfst du dafür nicht nehmen.
  - Bitte bei AWS bestätigen lassen, dass Verarbeitung und Speicherung in der EU bleiben. Die AWS-Seite sagt das nicht ausdrücklich.
- **Alternative Anthropic direkt:**
  - Die Verarbeitung erfolgt laut einer Übersicht vom September 2026 in den USA. Eine EU-Datenresidenz bietet die direkte API nicht an.
  - Den Datenschutz-Zusatz (DPA) bindet Anthropic in seinen Geschäftsbedingungen per Verweis ein.
  - In der Datenschutzerklärung muss dann die Drittlandübermittlung begründet werden.

### C. Zahlungen (Stripe)
1. Ein Stripe-Konto anlegen; dafür brauchst du dein Gewerbe bzw. deine Firma. Der Vertragspartner in der EU ist Stripe Payments Europe, Ltd.
2. Im Dashboard die Zahlungsarten freischalten (Karte, PayPal, SEPA …). Die App zeigt automatisch die freigeschalteten an.
3. Einen Webhook auf `https://api.deine-domain.de/pay/webhook` anlegen, mit diesen Ereignissen:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `customer.subscription.deleted`

   Das Signatur-Geheimnis kommt als `STRIPE_WEBHOOK_SECRET` in `.env`.
4. Zuerst mit Testschlüsseln (`sk_test_…`) alles durchspielen. Danach `PAYMENT_REQUIRED=true` setzen.

### D. E-Mail
Einen SMTP-Zugang bei einem EU-Anbieter anlegen und einen AVV abschließen. Für die eigene Domain SPF, DKIM und DMARC einrichten, sonst landen Anmeldelinks im Spam.

### E. Push-Erinnerungen
Mit `npm run vapid` die Schlüssel erzeugen und in `.env` eintragen. Die App übernimmt den öffentlichen Schlüssel automatisch.

### F. App veröffentlichen
1. In `briefe-web/src/BriefeApp.jsx` eintragen:
   - `SERVER_URL`
   - optional `CLOUD_CONFIG` (Google, Microsoft, Dropbox, pCloud)
   - `OPERATOR` (Impressum)
   - `LEGAL_DRAFT = false` erst nach der anwaltlichen Prüfung
2. `npm run build` ausführen und den Ordner `dist/` nach `/var/www/briefe-web` kopieren.
3. Auf dem iPhone kommen Push-Erinnerungen nur, wenn die App über „Teilen → Zum Home-Bildschirm“ installiert ist.

---

## 3. Vor dem Verkauf (nicht technisch, aber Pflicht)

- [ ] Gewerbe anmelden bzw. Firma gründen. Klären, ob die Kleinunternehmerregelung greift oder Umsatzsteuer anfällt.
- [ ] AVVs mit Hoster, KI-Anbieter (AWS bzw. Anthropic), E-Mail-Anbieter und Stripe ablegen.
- [ ] Rechtstexte ausfüllen und **anwaltlich prüfen** lassen: Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung, E-Mail-Vorlagen in `lib/mails.js`. Alle `[Platzhalter]` ersetzen.
- [ ] **Datenschutz-Folgenabschätzung** (Art. 35 DSGVO) prüfen lassen. Dokumente vom Jobcenter, von Ärzten oder Behörden enthalten oft besonders geschützte Daten.
- [ ] Verzeichnis der Verarbeitungstätigkeiten und technisch-organisatorische Maßnahmen dokumentieren.
- [ ] EU-KI-Verordnung: Die App kennzeichnet KI-Inhalte und verweist bei kritischen Dokumenten auf Beratung. Die Einstufung (Art. 50, Anhang III) solltest du rechtlich bestätigen lassen.
- [ ] Rechtsdienstleistungsgesetz klären lassen. Die App erstellt Entwürfe nach den Angaben des Nutzers und ersetzt keinen Anwalt; die Grenze sollte ein Anwalt bewerten.

---

## 4. Was der Server speichert (Datensparsamkeit)

- Zufällige Sitzungskennung je Gerät/Profil (nur als Prüfwert)
- E-Mail-Adresse bzw. UP-Adresse nach der Anmeldung
- Welche Dokumente freigeschaltet sind: nur eine zufällige Dokument-Kennung, **kein Inhalt**
- Bestellungen (nach Kontolöschung ohne Kontobezug, wegen Aufbewahrungspflichten)
- Nur wenn der Nutzer es einschaltet: Erinnerungszeitpunkte (Push) und das Kalender-Abo (standardmäßig nur „Frist“, ohne Betreff)
- Newsletter nur nach Bestätigung. Unbestätigte Anmeldungen werden nach 30 Tagen gelöscht.
- Anonyme Bewertungen ohne Text des Dokuments

Inhalte von Dokumenten gehen nur bei eingeschalteter KI zur Verarbeitung an den KI-Anbieter und werden auf dem Server nicht gespeichert. Der Server baut alle KI-Anweisungen selbst, deshalb kann ihn niemand als freien KI-Zugang missbrauchen. Tageslimits und Rate-Limits sind eingebaut.

---

## Quellen
- [Amazon Bedrock – Claude Sonnet 5.5, EU-Profil](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5-5.html)
- [Anthropic Commercial Terms (DPA per Verweis eingebunden)](https://www.anthropic.com/legal/commercial-terms)
- [Übersicht EU-Datenresidenz Claude, Sept. 2026 (Sonomos)](https://sonomos.ai/blog/claude-eu-data-residency-2026/)
- [LUKSO Mainnet-Parameter](https://docs.lukso.network/networks/mainnet/parameters/) · [Testnet](https://docs.lukso.network/networks/testnet/parameters/)
- [RFC 8291 – Web-Push-Verschlüsselung](https://datatracker.ietf.org/doc/html/rfc8291)

## Weitere Clouds

- **MagentaCLOUD, GMX, WEB.DE, HiDrive, Nextcloud (WebDAV):** Diese Anbieter erlauben keinen direkten Zugriff aus dem Browser. Die App schickt Zugangsdaten und Dateien deshalb über den Briefe-Server (`/dav/...`). Der Server speichert und protokolliert beides nicht. Ein- und ausschalten mit `DAV_ENABLED` in `.env`, größte Datei mit `DAV_MAX_MB`. Ohne Server zeigt die App „Noch nicht eingerichtet".
- **Box:** Box verlangt für die Anmeldung ein Geheimnis, das nicht in die App darf. In der Box-Entwicklerkonsole eine App mit OAuth 2.0 anlegen, als Redirect-Adresse und unter „CORS Domains" die Adresse der App eintragen, dann `BOX_CLIENT_ID` und `BOX_CLIENT_SECRET` in `.env` setzen.
- **pCloud:** App bei pCloud anlegen, Redirect-Adresse = Adresse der App, die Client-ID in `CLOUD_CONFIG.pcloud.clientId` (Datei `BriefeApp.jsx`) eintragen. Kein Server nötig.
- **iCloud:** Apple bietet Web-Apps keine Schnittstelle. Es bleibt beim Teilen-Menü und der Dateiauswahl des Geräts.
- In der App lassen sich alle weiteren Clouds mit dem Betreiberschalter „Weitere Clouds anbieten" ausblenden.
- Mit echten Konten bei diesen Anbietern wurde noch nicht getestet, nur gegen nachgebaute Gegenstellen.

## Ordner, Unterordner und Speicherort (Stand 12.11.2026)

- **Ordner statt Fall:** Die App spricht überall von „Ordner“. Ordner lassen sich über das Plus anlegen (Name, Farbe nach Wunsch), umbenennen, umfärben, verschieben, löschen und per Halten und Ziehen umsortieren.
- **Unterordner:** Ein Ordner kann Unterordner enthalten (eine Ebene). Anlegen im Ordner über „Neuer Unterordner“ oder über das Plus („Liegt in“). Ein Ordner mit eigenen Unterordnern kann nicht selbst in einen anderen Ordner gelegt werden. Beim Löschen eines Ordners werden seine Unterordner mit gelöscht; die Dokumente können vorher nach „Unsortiert“ gelegt werden.
- **Speicherort (Einstellungen → Speicherort):** Wo der Browser es erlaubt (Chrome und Edge am Computer, Chrome auf Android), wählt der Nutzer einen Ordner auf dem Gerät. Die App legt dort alle Dateien als normale Dateien ab, in denselben Ordnern und Unterordnern wie in der App, dazu die Datei `briefe-app-daten.json` mit allen Angaben. Nach geleertem Browser-Speicher lässt sich der Bestand aus diesem Ordner zurückholen. In Safari und Firefox gibt es diese Funktion nicht; dort bleibt der Browser-Speicher mit Sicherung.
- **Speicherfehler:** Kann eine Datei oder Änderung nicht dauerhaft gespeichert werden, zeigt die App eine deutliche Meldung.
- **Erinnerung an die Sicherung:** alle 30 Tage, solange eigene Dokumente vorhanden sind und kein Speicherordner verbunden ist.
- **Barrierefreiheit:** Sprache der Seite folgt der App-Sprache, Fenster und Knöpfe sind beschriftet, Ordner per Tastatur bedienbar, Kontraste im dunklen Design korrigiert. Unter „Rechtliches“ gibt es den Entwurf einer Erklärung zur Barrierefreiheit (Platzhalter vor dem Livegang füllen, Prüfung durch Fachstelle steht aus).
- **Betreiber-Schalter:** „Neue Ordner und Unterordner …“ (`folderTools`) und „Speicherordner auf dem Gerät anbieten“ (`deviceFolder`).
