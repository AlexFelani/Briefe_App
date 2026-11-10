# Briefe-App

Dokumente und Behördenpost ablegen, ordnen und Fristen im Blick behalten. Auf Wunsch mit KI: lesen, übersetzen, Antwort entwerfen.

| Ordner | Inhalt |
|---|---|
| `briefe-web/` | Die App (React). Dokumente, Fotos und Fälle bleiben auf dem Gerät. |
| `briefe-server/` | Der Server: KI-Zugang, Anmeldung, Zahlungen, Erinnerungen. Er speichert keine Inhalte von Dokumenten. |
| `ANLEITUNG.md` | Inbetriebnahme Schritt für Schritt. |

## Testseite

Bei jeder Änderung auf `main` baut GitHub die App und legt sie auf den Zweig `gh-pages`.
Adresse der Testseite: https://alexfelani.github.io/Briefe_App/

Die Testseite läuft ohne Server und damit ohne KI. Foto, Datei-Auswahl, eigene Benennung, Ablage, Fristen, Export und Sperre funktionieren.
Lesen, Übersetzen und Antwortentwurf brauchen den Server mit KI-Zugang (siehe `ANLEITUNG.md`).

## KI ist freiwillig

Die KI ist beim Start aus. Die App funktioniert vollständig ohne sie; dann verlässt kein Dokument das Gerät.
Der Nutzer schaltet die KI in den Einstellungen selbst ein (mit Hinweis und Zustimmung) und kann sie bei jedem Hochladen abwählen.
Der Betreiber kann die KI-Funktionen in den Betreiber-Schaltern ganz abschalten.

## Stand

Entwurf. Die Rechtstexte enthalten Platzhalter und sind nicht anwaltlich geprüft.
