"use strict";
// E-Mail-Texte (immer Deutsch). Platzhalter in [eckigen Klammern] vor dem Livegang ausfüllen
// und – wie alle Rechtstexte – anwaltlich prüfen lassen.
const eur = (n) => Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const dt = (ms) => new Date(ms).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });
const SIGN = "\n\n--\nBriefe-App · [Name bzw. Firma] · [Anschrift] · [E-Mail]\nImpressum: [Link zum Impressum]";

const WIDERRUF = `Widerrufsbelehrung (Entwurf – vor Livegang anwaltlich prüfen)
Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ([Name], [Anschrift], [E-Mail]) mittels einer eindeutigen Erklärung (z. B. per E-Mail oder über den Widerrufsbutton in der App) über Ihren Entschluss informieren. Zur Wahrung der Frist reicht es aus, dass Sie die Mitteilung vor Ablauf der Frist absenden.
Folgen des Widerrufs: Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen unverzüglich und spätestens binnen vierzehn Tagen zurückzuzahlen. Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben.
Hinweis: Sie haben ausdrücklich zugestimmt, dass wir vor Ablauf der Widerrufsfrist mit der Leistung beginnen, und Ihre Kenntnis davon bestätigt, dass Sie Ihr Widerrufsrecht dadurch verlieren, sobald die Leistung (Übersetzung bzw. Antwortentwurf) für den Brief erbracht wurde.`;

module.exports = {
  loginLink: (url) => ({
    subject: "Dein Anmeldelink für die Briefe-App",
    text: `Hallo,\n\nmit diesem Link meldest du dich bei der Briefe-App an (gültig 30 Minuten, nur einmal nutzbar):\n\n${url}\n\nWenn du das nicht angefordert hast, ignoriere diese E-Mail einfach.${SIGN}`,
  }),
  orderConfirmation: (o, cfg) => ({
    subject: `Bestellbestätigung ${o.id}`,
    text: `Vielen Dank für Ihre Bestellung.\n\nBestellnummer: ${o.id}\nLeistung: ${o.title}\nPreis: ${eur(o.amount)} (inkl. aller Steuern)${o.kind === "sub" ? " pro Monat, Laufzeit 1 Monat, verlängert sich danach auf unbestimmte Zeit, jederzeit mit einer Frist von 1 Monat kündbar" : ", Einmalzahlung, keine Laufzeit"}\nBezahlt am: ${dt(Date.parse(o.paidAt || o.createdAt))}\n\nEs gelten unsere AGB in der Fassung „${cfg.TERMS_VERSION}“: [Link zu den AGB]\nDatenschutz: [Link zur Datenschutzerklärung]\n\n${WIDERRUF}\n\nMuster-Widerrufsformular: [Link]\n\nEine Rechnung erhalten Sie gesondert von unserem Zahlungsdienstleister.${SIGN}`,
  }),
  withdrawalReceipt: ({ order, at, receiptId, refunded }) => ({
    subject: `Eingangsbestätigung Ihres Widerrufs (${order.id})`,
    text: `Wir bestätigen den Eingang Ihres Widerrufs.\n\nVorgangsnummer: ${receiptId}\nEingegangen am: ${dt(at)}\nBestellung: ${order.id} – ${order.title}\n\n${refunded ? `Den Betrag von ${eur(order.amount)} erstatten wir auf das ursprüngliche Zahlungsmittel. Je nach Zahlungsart kann die Gutschrift einige Tage dauern.` : "Wir prüfen Ihren Widerruf und melden uns innerhalb von 14 Tagen bei Ihnen."}${SIGN}`,
  }),
  cancelConfirmation: ({ order, at, endsAt, receiptId }) => ({
    subject: `Bestätigung Ihrer Kündigung (${order.id})`,
    text: `Wir bestätigen den Eingang Ihrer Kündigung.\n\nVorgangsnummer: ${receiptId}\nEingegangen am: ${dt(at)}\nVertrag: ${order.id} – ${order.title}\nDer Vertrag endet am: ${dt(endsAt)}\n\nBis dahin können Sie den Dienst weiter nutzen. Es erfolgen keine weiteren Abbuchungen.${SIGN}`,
  }),
  newsletterConfirm: (url) => ({
    subject: "Bitte bestätige deine Newsletter-Anmeldung",
    text: `Hallo,\n\nbitte bestätige deine Anmeldung zum Newsletter der Briefe-App mit diesem Link:\n\n${url}\n\nOhne Bestätigung wirst du nicht eingetragen und deine Adresse wird nach 30 Tagen gelöscht.${SIGN}`,
  }),
  newsletterWelcome: (unsubUrl) => ({
    subject: "Newsletter-Anmeldung bestätigt",
    text: `Danke für deine Anmeldung zum Newsletter der Briefe-App.\n\nAbmelden kannst du dich jederzeit hier: ${unsubUrl}${SIGN}`,
  }),
  operatorNotice: (subject, text) => ({ subject: `[Briefe-App] ${subject}`, text }),
};
