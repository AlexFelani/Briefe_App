import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Upload, Search, Menu, ChevronDown, ChevronRight, Grid, List,
  Sun, Moon, Type, X, Plus, FileText, Calendar, Hash, User,
  Bell, Download, Copy, Share2, Mail, Check, AlertTriangle,
  Clock, Folder, FolderCheck, Settings, LogOut, Sparkles, Send,
  Maximize2, Minimize2, Home, Languages, Receipt, Scale, Ban, CreditCard,
  Camera, Cloud, Paperclip, ArrowUp, ArrowDown, SlidersHorizontal, Trash2, Pencil,
  Lock, Users, Fingerprint, ThumbsUp, ThumbsDown, History, BookOpen
} from "lucide-react";

/* ---------- Farb-/Design-Tokens ---------- */
const palette = {
  light: {
    bg: "#F7F5F1",
    surface: "#FFFFFF",
    surfaceAlt: "#EFEBE3",
    border: "#E2DDD1",
    text: "#241F1A",
    textMuted: "#726B5E",
    accent: "#1E5B4F",      // tiefes Waldgrün – "amtliches" Vertrauen, aber warm
    accentSoft: "#DCEAE5",
    warn: "#B5502A",
    warnSoft: "#F6E3D8",
  },
  dark: {
    bg: "#15181A",
    surface: "#1F2325",
    surfaceAlt: "#262B2D",
    border: "#33393B",
    text: "#EFEDE8",
    textMuted: "#9C9border",
    accent: "#4FA893",
    accentSoft: "#243330",
    warn: "#E0865C",
    warnSoft: "#332420",
  },
};

const RTL_LANGS = ["ar", "fa", "ur", "ps", "he", "ckb"];

/* ---------- Shop / Recht: Konstanten (alles hier zentral änderbar) ---------- */
const FREE_LETTERS = 2;          // kostenlose Briefe
// Kritische Briefe (Klage, Strafanzeige, Vollstreckung, kurze Frist …): Die App zeigt einen Hinweis auf Beratung, sperrt aber nichts.
const BASE_PRICE = 2.0;          // € pro Brief bis 10 Seiten
const EXTRA_PAGE_PRICE = 0.1;    // € je weitere Seite
const WITHDRAWAL_DAYS = 14;      // Widerrufsfrist in Tagen
const LEGAL_DRAFT = true;        // true = Rechtstexte zeigen den Hinweis "Entwurf / Platzhalter"
const SUB_PLAN = {               // Platzhalter-Tarif, nur sichtbar wenn Schalter "Abo-Modell" aktiv
  name: "Briefe-Abo (Platzhalter-Tarif)",
  price: 4.99,
  termText: "1 Monat",
  renewalText: "Nach Ablauf der ersten Laufzeit verlängert sich der Vertrag auf unbestimmte Zeit. Er ist danach jederzeit mit einer Frist von 1 Monat kündbar.",
};
const OPERATOR = {               // Betreiberangaben für Impressum/Datenschutz – vor Livegang ausfüllen
  name: "[Name bzw. Firma eintragen]",
  street: "[Straße und Hausnummer]",
  city: "[PLZ und Ort]",
  email: "[E-Mail-Adresse]",
  phone: "[Telefonnummer oder zweiter schneller Kontaktweg]",
};
const DEFAULT_SHOP = {
  flags: { paymentRequired: false, subscription: false, tracking: false, newsletter: false, usSales: false },
  orders: [],
  unlocked: {},     // letterId -> "free" | "paid"
  consent: null,    // { status: "accepted" | "declined", at }
  newsletter: [],   // { id, email, status, requestedAt, confirmedAt, unsubscribedAt, consentText }
};
const round2 = (n) => Math.round(n * 100) / 100;
const priceForLetter = (pages = 1) => round2(BASE_PRICE + Math.max(0, pages - 10) * EXTRA_PAGE_PRICE);
const fmtEUR = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const fmtDateTime = (iso) => new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
const fmtDate = (d) => new Date(d).toLocaleDateString("de-DE", { dateStyle: "medium" });
const addDays = (iso, d) => new Date(new Date(iso).getTime() + d * 86400000);

const LANGS = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "uk", label: "Українська" },
  { code: "ru", label: "Русский" },
  { code: "fa", label: "فارسی" },
  { code: "ku", label: "Kurdî (Kurmancî)" },
  { code: "ckb", label: "کوردی (Soranî)" },
  { code: "zza", label: "Zazaki" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "pl", label: "Polski" },
  { code: "ro", label: "Română" },
  { code: "bg", label: "Български" },
  { code: "el", label: "Ελληνικά" },
  { code: "nl", label: "Nederlands" },
  { code: "sv", label: "Svenska" },
  { code: "hi", label: "हिन्दी" },
  { code: "ur", label: "اردو" },
  { code: "bn", label: "বাংলা" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "ps", label: "پښتو" },
  { code: "so", label: "Soomaali" },
  { code: "ti", label: "ትግርኛ" },
  { code: "am", label: "አማርኛ" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ภาษาไทย" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "sr", label: "Српски" },
  { code: "hr", label: "Hrvatski" },
  { code: "bs", label: "Bosanski" },
  { code: "sq", label: "Shqip" },
  { code: "hu", label: "Magyar" },
  { code: "cs", label: "Čeština" },
  { code: "sk", label: "Slovenčina" },
  { code: "he", label: "עברית" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ha", label: "Hausa" },
  { code: "sw", label: "Kiswahili" },
  { code: "ne", label: "नेपाली" },
  { code: "ta", label: "தமிழ்" },
];

const UI_STRINGS = {
  de: {
    appName: "Briefe", newCase: "Neuer Fall", search: "Suchen…", myCases: "Meine Fälle",
    settings: "Einstellungen", allCases: "Alle Fälle", open: "Offen", done: "Erledigt",
    upload: "Brief hochladen", translate: "Übersetzen", reply: "Antwort erstellen",
    deadline: "Frist", noDeadline: "Keine Frist erkannt", original: "Original",
    translation: "Übersetzung", generateReply: "KI-Antwort generieren", confirm: "Geprüft & bestätigen",
    edit: "Bearbeiten", copy: "Text kopieren", share: "Teilen", exportPdf: "Als PDF exportieren",
    tileView: "Kacheln", listView: "Liste", darkMode: "Dunkelmodus", fontSize: "Schriftgröße",
    disclaimer: "Diese App ersetzt keinen Anwalt.",
    sortSection: "Sortierung", accountSection: "Konto", backup: "Backup", logout: "Abmelden",
    shopMenu: "Käufe & Widerruf", cancelMenu: "Verträge hier kündigen", legalMenu: "Rechtliches",
    appLanguage: "App-Sprache", tileSize: "Kachelgröße", tileSizeAuto: "Passt sich automatisch an",
    sortDate: "Datum", sortName: "Alphabetisch", sortCase: "Aktenzeichen", sortDeadline: "Frist-Dringlichkeit",
    replyPlaceholder: "Was möchtest du antworten? (in deiner Sprache möglich)",
    checkReplyIn: "Antwort prüfen in:", writeExpand: "Groß schreiben", replyWriteTitle: "Antwort schreiben",
    doneWriting: "Fertig", sendEmail: "E-Mail senden", noAttachmentsYet: "— noch nicht übersetzt —",
    unsavedTitle: "Ungesicherter Text", unsavedBody: "Du hast einen Antwort-Entwurf geschrieben, der noch nicht generiert wurde. Was möchtest du tun?",
    keepWriting: "Weiter schreiben", stayHere: "Hier bleiben, Entwurf behalten", discardHome: "Verwerfen & zur Übersicht",
    sendWarning: "Wichtig: Die App versendet nichts automatisch. Prüfe den Text und bestätige aktiv.",
    replyLiability: "Die App ersetzt keine Rechtsberatung und übernimmt keine Haftung für den Inhalt. Du prüfst den Entwurf selbst und entscheidest, ob du ihn absendest.",
    checkTitle: "Gegenprobe der Übersetzung", checkNone: "Im Original wurden keine Datumsangaben, Beträge oder Aktenzeichen erkannt.",
    checkOk: "Alle {n} Angaben aus dem Original (Datum, Betrag, Aktenzeichen, Kontonummer) stehen mit denselben Ziffern in der Übersetzung.",
    checkMissing: "Diese Angaben aus dem Original wurden in der Übersetzung nicht gefunden:", checkCompare: "Bitte vergleiche diese Stellen mit dem deutschen Original. Es gilt das Original.",
    checkAi: "Übersetzung von der KI prüfen lassen", checkAiLabel: "Prüfung durch KI – kann selbst Fehler enthalten. Verbindlich ist nur das deutsche Original.",
    letterWord: "Brief", noCases: "Keine Fälle gefunden. Lade einen Brief hoch, um zu starten.", searchHint: "(auch in deiner Sprache, z. B. „recovery“)", menu: "Menü",
    layoutLabel: "Design", layoutClassic: "Desktop", layoutNew: "Klassisch",
    tabHome: "Home", tabSearch: "Suche", tabAdd: "Hinzufügen", tabDeadlines: "Fristen", tabProfile: "Profil",
    home: "Übersicht", langSearch: "Sprache suchen…", noLangFound: "Keine Sprache gefunden", copied: "Kopiert!",
    intakeTitle: "Briefe hinzufügen", takePhoto: "Foto aufnehmen", addPage: "Weitere Seite fotografieren",
    chooseFiles: "Dateien auswählen (Foto, PDF, Word …)", fromCloud: "Aus Cloud holen",
    noFilesYet: "Noch keine Dateien ausgewählt.", pagesOfOne: "Diese Dateien sind Seiten eines einzigen Briefes",
    intakeLocalNote: "Die Originale bleiben auf deinem Gerät. Zum Auslesen wird der Inhalt an den KI-Dienst gesendet.",
    intakeReading: "Wird gelesen … ({n} von {total})", startIntake: "Lesen und automatisch ablegen",
    assignTitle: "Zu welchem Fall gehört dieser Brief?", assignWhySender: "Gleicher Absender wie in diesen Fällen, aber das Aktenzeichen passt nicht sicher.",
    assignNew: "Neuer Fall", assignOther: "Anderer Fall", assignDo: "Hier ablegen",
    filesTitle: "Originale (auf deinem Gerät)", view: "Ansehen", download: "Herunterladen", shareFile: "Teilen",
    toCloud: "In Cloud sichern", openNewTab: "In neuem Tab öffnen",
    cloudsMenu: "Dateien & Clouds", cloudTabImport: "Holen aus …", cloudTabExport: "Sichern in …", cloudTabConn: "Verbindungen",
    systemPicker: "Dateien vom Gerät oder aus Cloud-Apps wählen", systemPickerHint: "Die Auswahl deines Geräts zeigt alle Clouds, die dort eingerichtet sind (iCloud, Google Drive, OneDrive, Dropbox …).",
    takeSelected: "Auswählen und hinzufügen", encryptLabel: "Vor dem Speichern verschlüsseln (empfohlen)", passLabel: "Passwort für die Verschlüsselung",
    systemShare: "Teilen-Menü / In Dateien sichern", systemShareHint: "Funktioniert mit jeder Cloud-App auf deinem Gerät, auch mit iCloud.",
    notConnected: "Nicht verbunden", notConfigured: "Noch nicht eingerichtet (Betreiber)", connected: "Verbunden",
    connIntro: "Alles ist freiwillig und standardmäßig aus. Deine Dateien liegen immer auf deinem Gerät. Eine Cloud wird nur genutzt, wenn du sie hier verbindest.",
    connect: "Verbinden", disconnect: "Trennen", cancel: "Abbrechen",
    consentLabel: "Ich willige ausdrücklich ein. Ich kann die Einwilligung jederzeit widerrufen, indem ich die Verbindung trenne.",
    passHint: "Ohne dieses Passwort sind verschlüsselte Dateien nicht lesbar. Es wird nirgends gespeichert und gilt nur, solange die App geöffnet ist.",
    autoUpload: "Neue Dateien automatisch sichern in:", off: "Aus",
    signIn: "Anmelden", accountTitle: "Konto", upLogin: "Mit Universal Profile anmelden", emailLogin: "Mit E-Mail anmelden",
    upConsent: "Ich willige ein, dass die Adresse meines Universal Profile für die Anmeldung gespeichert wird.",
    upNoProvider: "Keine UP-Browser-Erweiterung gefunden. Installiere die Universal Profile Extension und lade die Seite neu.",
    upMobileHint: "Die Anmeldung mit der UP-Mobile-App per QR-Code oder Deep Link folgt, sobald der Server dafür eingerichtet ist.",
    mailConsent: "Ich willige ein, dass meine E-Mail-Adresse für Konto und Fristerinnerungen gespeichert wird.",
    linkEmail: "E-Mail verknüpfen", linkEmailWhy: "Mit einer verknüpften E-Mail bekommst du Erinnerungen an Fristen und kannst dein Konto wiederherstellen.",
    mailPending: "Bestätigung ausstehend: Du bekommst eine E-Mail mit einem Link.", demoConfirm: "Bestätigungslink öffnen (Demo)",
    mailConfirmedNote: "Deine E-Mail-Adresse ist bestätigt.", unlinkEmail: "E-Mail-Verknüpfung entfernen",
    linkUp: "Universal Profile verknüpfen", demoAuthNote: "Demo: Ohne Server werden E-Mails nicht versendet und Signaturen nicht serverseitig geprüft.",
    noticeDone: "{n} Brief(e) abgelegt.", noticeFailed: "{n} konnte(n) nicht gelesen werden – bitte prüfen.",
    noticeMissing: "Datei nicht gefunden.", noticeAutoOff: "Automatisches Sichern übersprungen: Cloud nicht verbunden.",
    noticeAutoPass: "Automatisches Sichern übersprungen: Passwort für die Verschlüsselung fehlt.",
    noticeSaved: "{n} Datei(en) gesichert in {name}.", noticeUploadFail: "Sichern in die Cloud ist fehlgeschlagen.",
    fSubject: "Betreff", fSender: "Absender", fCaseNumber: "Aktenzeichen", fDate: "Briefdatum", fReceived: "Zugangsdatum",
    fDeadline: "Frist", fPages: "Seiten", fNote: "Notiz", fUploaded: "Hochgeladen",
    lettersWord: "Briefe", sortBy: "Sortieren nach", ascending: "Aufsteigend", descending: "Absteigend",
    customizeTiles: "Kachel anpassen", customizeHint: "Wähle, was auf der Brief-Kachel steht, und verschiebe die Reihenfolge. Das gilt für alle Briefe.",
    resetDefault: "Voreinstellung", previewWord: "Vorschau", noHits: "Keine Treffer in diesem Fall.", caseEmpty: "In diesem Fall sind noch keine Briefe.",
    editLetter: "Brief bearbeiten", deadlineNoteLabel: "Frist als Text (wenn kein Datum bekannt)", moveToCase: "Fall", save: "Speichern",
    deleteLetter: "Brief löschen", deleteConfirm: "Wirklich löschen? Die Originaldateien werden ebenfalls gelöscht.",
    addAttachment: "Anhang hinzufügen", addEnvelope: "Umschlag fotografieren", envelope: "Umschlag",
    escTitle: "Wichtiger Brief – Beratung empfohlen", escIntro: "Bei diesem Brief kann viel davon abhängen. Du kannst trotzdem eine Antwort erstellen. Wir empfehlen dir zusätzlich eine Beratung. Gründe:",
    escCourt: "Gericht oder Klage", escCriminal: "Strafverfahren, Bußgeld oder Vorladung", escEnforcement: "Mahnbescheid, Vollstreckung oder Pfändung", escHousing: "Kündigung oder Räumung der Wohnung",
    escBenefits: "Kürzung, Einstellung oder Rückforderung von Leistungen", escResidence: "Aufenthalt (z. B. Ausweisung oder Abschiebung)", escDeadline: "Die Frist endet in weniger als 7 Tagen oder ist abgelaufen",
    escHelpTitle: "Hier bekommst du Hilfe:", escHelp1: "Beratungshilfe: Mit wenig Geld bekommst du beim Amtsgericht (Rechtsantragstelle) einen Beratungshilfeschein für einen Anwalt.",
    escHelp2: "Rechtsanwältin oder Rechtsanwalt (Fachanwalt für das Thema)", escHelp3: "Sozialberatung (z. B. Caritas, Diakonie, AWO) bei Jobcenter, Sozialamt oder Schulden",
    escHelp4: "Mieterverein bei Problemen mit der Wohnung, Verbraucherzentrale bei Inkasso und Verträgen", escHelp5: "Migrationsberatung oder Flüchtlingsberatung bei Fragen zum Aufenthalt",
    escDeadlineHint: "Wichtig: Lass die Frist nicht verstreichen. Nimm diesen Brief zur Beratung mit (z. B. als Fall-PDF).",
    aiLabelTranslation: "Mit KI übersetzt – kann Fehler enthalten. Verbindlich ist nur das deutsche Original.", aiLabelReply: "Mit KI erstellter Entwurf – bitte vor dem Absenden selbst prüfen.",
    freeNeedsLogin: "Für die kostenlosen Briefe bitte kurz anmelden (E-Mail-Link oder Universal Profile).", serverFail: "Der Server ist gerade nicht erreichbar. Bitte später erneut versuchen.",
    loginDone: "Du bist angemeldet.", loginLinkBad: "Der Anmeldelink ist ungültig oder abgelaufen. Bitte fordere einen neuen an.", mailSent: "Wir haben dir einen Link geschickt. Bitte öffne ihn auf diesem Gerät.",
    payDone: "Zahlung erhalten – der Brief ist freigeschaltet.", payPending: "Die Zahlung wird noch bearbeitet. Der Brief wird freigeschaltet, sobald sie bestätigt ist.",
    payCancelled: "Zahlung abgebrochen. Es wurde nichts abgebucht.", payFail: "Die Zahlung konnte nicht gestartet werden. Bitte später erneut versuchen.",
    logTitle: "Verlauf der Antwort", logGenerated: "KI-Entwurf erstellt", logEdited: "bearbeitet", logConfirmed: "geprüft und bestätigt", logPdf: "als PDF ausgegeben",
    logMail: "E-Mail-Programm geöffnet", logShare: "geteilt", logTranslated: "zur Kontrolle übersetzt", logShow: "Text ansehen", logHide: "ausblenden",
    logInfo: "Der Verlauf wird nur auf diesem Gerät gespeichert und ist im Export enthalten.",
    fbAsk: "Wie gut war das?", fbGood: "Gut", fbBad: "Nicht gut", fbThanks: "Danke!", fbComment: "Was war falsch? (optional)", fbSave: "Speichern",
    fbShareLabel: "Bewertungen anonym an den Anbieter senden (ohne Brieftext), damit Übersetzungen besser werden",
    obLangTitle: "Willkommen! Welche Sprache sprichst du?", obLangText: "Die App zeigt alles in deiner Sprache. Deine Briefe bleiben auf Deutsch und werden für dich übersetzt.",
    obAddTitle: "Briefe hinzufügen", obAddText: "Fotografiere einen Brief oder lade ein Foto oder eine PDF hoch – auch aus deiner Cloud. Die App liest den Brief und legt ihn automatisch in den passenden Fall. Wenn sie unsicher ist, fragt sie dich.",
    obReadTitle: "Verstehen und antworten", obReadText: "Lass dir jeden Brief übersetzen. Auf Wunsch schreibt die App einen Antwort-Entwurf auf Deutsch. Prüfe ihn immer selbst – erst nach deiner Bestätigung kannst du ihn als PDF, per E-Mail oder zum Teilen verwenden. Die App sendet nie etwas von allein.",
    obDeadTitle: "Fristen nicht verpassen", obDeadText: "Die App erkennt Fristen und trägt sie mit Erinnerung in deinen Kalender ein. Das kannst du jederzeit unter „Fristen & Erinnerungen“ ändern.",
    obPrivTitle: "Deine Daten", obPrivText: "Briefe und Dateien werden auf deinem Gerät gespeichert. Zum Lesen, Übersetzen und Antworten wird der Brieftext an einen KI-Dienst übertragen. Die KI kann Fehler machen und ersetzt keine Rechtsberatung. Du kannst die App mit einer PIN sperren und alle Daten jederzeit exportieren oder löschen.",
    obNext: "Weiter", obBack: "Zurück", obStart: "Los geht's", obSkip: "Überspringen", obTranslating: "Die App wird in deine Sprache übersetzt …", obAgain: "Einführung ansehen",
    casePdf: "Fall als PDF", casePdfInfo: "Eine PDF mit Inhaltsverzeichnis und allen Briefen dieses Falls – Angaben, Originaltext, Übersetzung, Antwort und Verlauf –, z. B. für Anwalt, Beratungsstelle oder Amt.",
    casePdfPhotos: "Fotos der Original-Briefe einfügen", casePdfBuild: "PDF erstellen", casePdfBusy: "Erstelle PDF …", casePdfToc: "Inhalt",
    casePdfImgFail: "Foto „{n}“ konnte nicht eingefügt werden (Format wird hier nicht unterstützt). Es ist im Fall als eigene Datei gespeichert.",
    casePdfSeparate: "Anlage „{n}“ ist als eigene Datei gespeichert (nicht in dieser PDF).", casePdfMissing: "Datei „{n}“ ist auf diesem Gerät nicht mehr vorhanden.",
    profilesTitle: "Profile (mehrere Nutzer)", profileWho: "Wer nutzt die App?", profileAdd: "Hinzufügen", profileName: "Name des neuen Profils",
    profileDefaultName: "Ich", profileSwitch: "Profil wechseln", profileActive: "aktiv", profileRename: "Umbenennen", profileDelete: "Profil löschen",
    profileDeleteConfirm: "Profil „{n}“ mit allen Briefen, Dateien und Einstellungen endgültig löschen?",
    profilesInfo: "Jedes Profil hat eigene Fälle, Briefe, Dateien, Einstellungen und eine eigene Sperre. Andere Profile sehen diese Daten nicht. Käufe und Guthaben gelten für das ganze Gerät.",
    lockTitle: "App-Sperre (PIN / Biometrie)", lockInfo: "Schützt dieses Profil mit einer PIN (4–8 Ziffern) und auf Wunsch mit Fingerabdruck oder Gesichtserkennung. Gespeichert wird nur ein Prüfwert, nicht die PIN.",
    lockHonest: "Die Sperre schützt den Zugang über die App. Nutze zusätzlich die Bildschirmsperre deines Handys.",
    lockSet: "PIN festlegen", lockChange: "Änderungen speichern", lockRemove: "Sperre entfernen", pinCurrent: "Aktuelle PIN", pinNew: "Neue PIN", pinRepeat: "Neue PIN wiederholen",
    pinMismatch: "Die PINs stimmen nicht überein.", pinShort: "Die PIN muss 4 bis 8 Ziffern haben.", lockAfter: "Automatisch sperren:", lockAfterNow: "sofort beim Verlassen", lockAfterMin: "nach {n} Min. im Hintergrund",
    bioLabel: "Mit Fingerabdruck / Gesicht entsperren", bioFail: "Fingerabdruck/Gesicht ist auf diesem Gerät nicht verfügbar. Die PIN funktioniert weiterhin.",
    lockNoCrypto: "Die Sperre braucht eine sichere Verbindung (https).", lockSaved: "Sperre gespeichert.", lockRemoved: "Sperre entfernt.", lockNow: "Jetzt sperren",
    unlockTitle: "Entsperren", pinEnter: "PIN", unlockBtn: "Entsperren", pinWrong: "Falsche PIN.", pinWait: "Zu viele Versuche. Bitte {n} Sekunden warten.", bioBtn: "Mit Fingerabdruck / Gesicht",
    pinForgot: "PIN vergessen?", pinForgotInfo: "Die PIN kann aus Sicherheitsgründen nicht wiederhergestellt werden. Du kannst dieses Profil mit allen Daten löschen und neu beginnen. Ein vorhandenes Backup kannst du danach wieder einspielen.",
    wipeTitle: "Alle Daten löschen", wipeInfo: "Löscht Fälle, Briefe, Dateien, Einstellungen und Erinnerungen von diesem Gerät, außerdem Kalender-Abo und Push-Erinnerungen auf dem Server. Kopien in deinen Clouds, Kalendern oder Backups bleiben dort und müssen dort gelöscht werden.",
    wipeExportFirst: "Vorher alles exportieren", wipeScopeProfile: "Nur dieses Profil", wipeScopeAll: "Alle Profile und alle Daten auf diesem Gerät",
    wipeType: "Zur Bestätigung „{w}“ eingeben:", wipeWord: "LÖSCHEN", wipeBtn: "Endgültig löschen", wipeDone: "Die Daten wurden gelöscht.",
    backupAllProfiles: "Alle Profile in das Backup aufnehmen",
    exportTitle: "Export (alle Briefe & Dateien)", exportAllCases: "Alle Fälle", exportFormatLabel: "Briefe speichern als",
    fmtPdf: "PDF (empfohlen)", fmtTxt: "Textdatei", fmtBoth: "PDF und Textdatei",
    exportOriginals: "Original-Dateien mitexportieren (Fotos, PDFs, Anlagen, Umschlag)",
    exportPdfNote: "Je Brief: Angaben, Originaltext, Übersetzung und Antwort. Die PDF zeigt jede Schrift korrekt, auch Arabisch oder Persisch. Wer den Text durchsuchen oder kopieren will, wählt zusätzlich die Textdatei. Dazu kommt eine Übersicht aller Briefe für Excel (CSV).",
    exportSize: "Geschätzte Größe: {s}", exportSizeWarn: "Geschätzte Größe: {s}. Das kann auf älteren Geräten dauern – bei Problemen Fälle einzeln exportieren.",
    exportBuild: "Export erstellen", exportBusy: "Erstelle Export … {n} von {total} Briefen", exportReady: "Export fertig",
    exportDownload: "Herunterladen", exportShare: "Teilen", exportCloud: "In Cloud speichern", exportAgain: "Neu erstellen",
    exportFail: "Export fehlgeschlagen. Bitte erneut versuchen oder weniger Fälle wählen.", exportTooBig: "Der Export ist zu groß. Bitte weniger Fälle auf einmal exportieren.",
    exportNoCases: "Keine Fälle vorhanden.", exportCase: "Fall exportieren", caseWord: "Fall", filesWord: "Dateien",
    secOriginal: "Originaltext (Deutsch)", secTranslation: "Übersetzung", secReply: "Antwort", secReplyTr: "Übersetzung der Antwort",
    draftNotConfirmed: "Entwurf – noch nicht geprüft und bestätigt", exportedOn: "Exportiert am {d} mit der Briefe-App",
    exLetterFile: "Brief", exOriginal: "Original", exEnvelope: "Umschlag", exAttachment: "Anlage", exOverview: "Übersicht", exNotes: "Hinweise", exFolder: "Ordner",
    exMissing: "Diese Dateien waren auf dem Gerät nicht mehr vorhanden und fehlen im Export:",
    aiFail: "Die KI hat nicht geantwortet. Bitte erneut versuchen.",
    confirmedOn: "Bestätigt am {d}", confirmFirst: "Erst bestätigen, dann exportieren oder senden.",
    mailLong: "Der Text ist lang und liegt in der Zwischenablage. Füge ihn in die E-Mail ein.", popupBlocked: "Bitte Pop-ups erlauben, damit sich das PDF öffnen kann.",
    backupTitle: "Backup", backupSave: "Backup als Datei speichern", backupCloud: "Backup in Cloud sichern", backupRestore: "Backup einspielen",
    backupInfo: "Enthält alle Fälle, Briefe und Originaldateien (ohne Beispieldaten, Konto und Käufe). Beim Einspielen wird alles zu deinen vorhandenen Daten hinzugefügt, nichts wird überschrieben.",
    backupDone: "Backup gespeichert.", backupRestored: "{c} Fall/Fälle und {l} Brief(e) hinzugefügt.", backupBad: "Das ist keine gültige Backup-Datei.",
    needPass: "Bitte zuerst ein Passwort eingeben oder die Verschlüsselung ausschalten.", wrongPass: "Entschlüsseln fehlgeschlagen (falsches Passwort?).",
    demoShow: "Beispieldaten anzeigen", demoRemove: "Beispieldaten entfernen",
    remindersTitle: "Fristen & Erinnerungen", remindersNone: "Keine Fristen erkannt.", remindersOn: "Benachrichtigungen aktivieren", remindersOff: "Benachrichtigungen ausschalten",
    remindersDenied: "Benachrichtigungen wurden nicht erlaubt.", remindersNoSupport: "Dein Browser unterstützt keine Benachrichtigungen. Nutze den Kalender-Export.",
    remindersHint: "Benachrichtigungen erscheinen nur, solange die App geöffnet ist. Für zuverlässige Erinnerungen trage die Fristen in deinen Kalender ein.",
    calSubLabel: "Kalender-Abo: Fristen bleiben ohne Rückfrage automatisch im Gerätekalender aktuell", calSubInfo: "Dein Kalender ruft die Fristen regelmäßig von unserem Server ab. Dafür werden Fristdaten (und nur auf Wunsch der Betreff) unter einer geheimen Adresse auf dem Server gespeichert. Beim Ausschalten werden sie gelöscht.",
    calSubOpen: "Kalender abonnieren", calSubCopy: "Link kopieren", calSubCopied: "Link kopiert.", calSubFail: "Kalender-Abo konnte nicht eingerichtet werden.", calSubOk: "Kalender-Abo aktiv.",
    autoCalLabel: "Fristen automatisch in den Gerätekalender eintragen (mit Erinnerungen)", autoCalNotice: "Frist-Datei erstellt – bitte im Kalender bestätigen („Hinzufügen“), dann erinnert dich dein Gerät.", autoCalInfo: "Dein Gerät fragt einmal nach, ob der Termin hinzugefügt werden soll. Ohne Bestätigung wird nichts eingetragen.",
    pushOn: "Hintergrund-Erinnerungen aktiv: Du wirst auch bei geschlossener App erinnert.", pushSending: "Erinnerungen werden an den Push-Server übertragen …", pushFail: "Hintergrund-Erinnerungen konnten nicht eingerichtet werden. Bitte nutze vorerst den Kalender-Export.",
    pushIos: "iPhone/iPad: Zuerst die App über „Teilen → Zum Home-Bildschirm“ installieren, sonst sind Hintergrund-Erinnerungen nicht möglich.",
    pushConsent: "Für Erinnerungen bei geschlossener App werden nur Erinnerungszeitpunkte und dein Gerätekennzeichen an den Push-Server übertragen (EU-Hosting). Beim Ausschalten werden sie gelöscht.",
    pushSubjectLabel: "Betreff des Briefes in der Erinnerung anzeigen (wird dann mit übertragen)",
    remindDays: "Erinnern vor Ablauf (Tage)", remindTime: "Uhrzeit", toCalendar: "In Kalender eintragen", allToCalendar: "Alle Fristen in Kalender",
    overdue: "überfällig", todayWord: "heute", daysLeft: "noch {n} Tage", deadlinesStrip: "{n} Frist(en) in den nächsten 7 Tagen oder überfällig", showDeadlines: "Fristen ansehen",
    remindTitle: "Frist in {d} Tag(en)", remindToday: "Frist heute",
  },
  en: {
    appName: "Letters", newCase: "New case", search: "Search…", myCases: "My cases",
    settings: "Settings", allCases: "All cases", open: "Open", done: "Done",
    upload: "Upload letter", translate: "Translate", reply: "Draft reply",
    deadline: "Deadline", noDeadline: "No deadline detected", original: "Original",
    translation: "Translation", generateReply: "Generate AI reply", confirm: "Reviewed & confirm",
    edit: "Edit", copy: "Copy text", share: "Share", exportPdf: "Export as PDF",
    tileView: "Tiles", listView: "List", darkMode: "Dark mode", fontSize: "Font size",
    disclaimer: "This app does not replace a lawyer.",
    sortSection: "Sorting", accountSection: "Account", backup: "Backup", logout: "Log out",
    shopMenu: "Purchases & withdrawal", cancelMenu: "Cancel contracts here", legalMenu: "Legal",
    appLanguage: "App language", tileSize: "Tile size", tileSizeAuto: "Adjusts automatically",
    sortDate: "Date", sortName: "Alphabetical", sortCase: "Case number", sortDeadline: "Deadline urgency",
    replyPlaceholder: "What would you like to reply? (your own language is fine)",
    checkReplyIn: "Review reply in:", writeExpand: "Write larger", replyWriteTitle: "Write reply",
    doneWriting: "Done", sendEmail: "Send email", noAttachmentsYet: "— not translated yet —",
    unsavedTitle: "Unsaved text", unsavedBody: "You wrote a reply draft that hasn't been generated yet. What would you like to do?",
    keepWriting: "Keep writing", stayHere: "Stay here, keep draft", discardHome: "Discard & go to overview",
    sendWarning: "Important: the app never sends anything automatically. Review the text and confirm actively.",
    replyLiability: "The app does not replace legal advice and accepts no liability for the content. You check the draft yourself and decide whether to send it.",
    checkTitle: "Translation cross-check", checkNone: "No dates, amounts or reference numbers were found in the original.",
    checkOk: "All {n} details from the original (date, amount, reference number, account number) appear with the same digits in the translation.",
    checkMissing: "These details from the original were not found in the translation:", checkCompare: "Please compare these places with the German original. The original applies.",
    checkAi: "Have the AI check the translation", checkAiLabel: "Check by AI – may itself contain errors. Only the German original is binding.",
    letterWord: "letter", noCases: "No cases found. Upload a letter to get started.", searchHint: "(also in your language, e.g. “recovery”)", menu: "Menu",
    layoutLabel: "Layout", layoutClassic: "Desktop", layoutNew: "Classic",
    tabHome: "Home", tabSearch: "Search", tabAdd: "Add", tabDeadlines: "Deadlines", tabProfile: "Profile",
    home: "Overview", langSearch: "Search language…", noLangFound: "No language found", copied: "Copied!",
    intakeTitle: "Add letters", takePhoto: "Take photo", addPage: "Photograph another page",
    chooseFiles: "Choose files (photo, PDF, Word …)", fromCloud: "Get from cloud",
    noFilesYet: "No files selected yet.", pagesOfOne: "These files are pages of a single letter",
    intakeLocalNote: "The originals stay on your device. For reading, the content is sent to the AI service.",
    intakeReading: "Reading … ({n} of {total})", startIntake: "Read and file automatically",
    assignTitle: "Which case does this letter belong to?", assignWhySender: "Same sender as in these cases, but the file number does not match for sure.",
    assignNew: "New case", assignOther: "Other case", assignDo: "File here",
    filesTitle: "Originals (on your device)", view: "View", download: "Download", shareFile: "Share",
    toCloud: "Save to cloud", openNewTab: "Open in new tab",
    cloudsMenu: "Files & clouds", cloudTabImport: "Get from …", cloudTabExport: "Save to …", cloudTabConn: "Connections",
    systemPicker: "Choose files from your device or cloud apps", systemPickerHint: "Your device's picker shows every cloud set up there (iCloud, Google Drive, OneDrive, Dropbox …).",
    takeSelected: "Select and add", encryptLabel: "Encrypt before saving (recommended)", passLabel: "Password for encryption",
    systemShare: "Share menu / Save to Files", systemShareHint: "Works with any cloud app on your device, including iCloud.",
    notConnected: "Not connected", notConfigured: "Not set up yet (operator)", connected: "Connected",
    connIntro: "Everything is optional and off by default. Your files always stay on your device. A cloud is only used if you connect it here.",
    connect: "Connect", disconnect: "Disconnect", cancel: "Cancel",
    consentLabel: "I explicitly consent. I can withdraw my consent at any time by disconnecting.",
    passHint: "Without this password, encrypted files cannot be read. It is not stored anywhere and only applies while the app is open.",
    autoUpload: "Automatically save new files to:", off: "Off",
    signIn: "Sign in", accountTitle: "Account", upLogin: "Sign in with Universal Profile", emailLogin: "Sign in with email",
    upConsent: "I consent to my Universal Profile address being stored for sign-in.",
    upNoProvider: "No UP browser extension found. Install the Universal Profile extension and reload the page.",
    upMobileHint: "Sign-in with the UP mobile app via QR code or deep link will follow once the server is set up.",
    mailConsent: "I consent to my email address being stored for my account and deadline reminders.",
    linkEmail: "Link email", linkEmailWhy: "With a linked email you get deadline reminders and can recover your account.",
    mailPending: "Confirmation pending: you will get an email with a link.", demoConfirm: "Open confirmation link (demo)",
    mailConfirmedNote: "Your email address is confirmed.", unlinkEmail: "Remove email link",
    linkUp: "Link Universal Profile", demoAuthNote: "Demo: without a server, emails are not sent and signatures are not verified server-side.",
    noticeDone: "{n} letter(s) filed.", noticeFailed: "{n} could not be read – please check.",
    noticeMissing: "File not found.", noticeAutoOff: "Automatic saving skipped: cloud not connected.",
    noticeAutoPass: "Automatic saving skipped: encryption password missing.",
    noticeSaved: "{n} file(s) saved to {name}.", noticeUploadFail: "Saving to the cloud failed.",
    fSubject: "Subject", fSender: "Sender", fCaseNumber: "File number", fDate: "Letter date", fReceived: "Date received",
    fDeadline: "Deadline", fPages: "Pages", fNote: "Note", fUploaded: "Uploaded",
    lettersWord: "letters", sortBy: "Sort by", ascending: "Ascending", descending: "Descending",
    customizeTiles: "Customize tiles", customizeHint: "Choose what appears on the letter tile and change the order. This applies to all letters.",
    resetDefault: "Default", previewWord: "Preview", noHits: "No matches in this case.", caseEmpty: "There are no letters in this case yet.",
    editLetter: "Edit letter", deadlineNoteLabel: "Deadline as text (if no date is known)", moveToCase: "Case", save: "Save",
    deleteLetter: "Delete letter", deleteConfirm: "Really delete? The original files will be deleted too.",
    addAttachment: "Add attachment", addEnvelope: "Photograph envelope", envelope: "Envelope",
    escTitle: "Important letter – advice recommended", escIntro: "A lot may depend on this letter. You can still create a reply. We recommend that you also get advice. Reasons:",
    escCourt: "Court or lawsuit", escCriminal: "Criminal proceedings, fine or summons", escEnforcement: "Payment order, enforcement or seizure", escHousing: "Termination or eviction from your home",
    escBenefits: "Reduction, stop or repayment of benefits", escResidence: "Residence (e.g. expulsion or deportation)", escDeadline: "The deadline ends in less than 7 days or has passed",
    escHelpTitle: "Where to get help:", escHelp1: "Legal aid: with a low income, the local court (Amtsgericht, Rechtsantragstelle) can give you a certificate (Beratungshilfeschein) for a lawyer.",
    escHelp2: "A lawyer specialised in the topic", escHelp3: "Social counselling (e.g. Caritas, Diakonie, AWO) for Jobcenter, social welfare office or debts",
    escHelp4: "Tenants' association for housing problems, consumer advice centre for debt collection and contracts", escHelp5: "Migration or refugee counselling for residence questions",
    escDeadlineHint: "Important: do not let the deadline pass. Take this letter with you to the counselling (e.g. as case PDF).",
    aiLabelTranslation: "Translated with AI – may contain errors. Only the German original is binding.", aiLabelReply: "Draft created with AI – please check it yourself before sending.",
    freeNeedsLogin: "To use the free letters, please sign in (email link or Universal Profile).", serverFail: "The server cannot be reached right now. Please try again later.",
    loginDone: "You are signed in.", loginLinkBad: "The sign-in link is invalid or expired. Please request a new one.", mailSent: "We sent you a link. Please open it on this device.",
    payDone: "Payment received – the letter is unlocked.", payPending: "The payment is still being processed. The letter will be unlocked once it is confirmed.",
    payCancelled: "Payment cancelled. Nothing was charged.", payFail: "The payment could not be started. Please try again later.",
    logTitle: "Reply history", logGenerated: "AI draft created", logEdited: "edited", logConfirmed: "reviewed and confirmed", logPdf: "output as PDF",
    logMail: "email app opened", logShare: "shared", logTranslated: "translated for checking", logShow: "show text", logHide: "hide",
    logInfo: "The history is stored only on this device and is included in the export.",
    fbAsk: "How good was this?", fbGood: "Good", fbBad: "Not good", fbThanks: "Thanks!", fbComment: "What was wrong? (optional)", fbSave: "Save",
    fbShareLabel: "Send ratings anonymously to the provider (without letter text) to improve translations",
    obLangTitle: "Welcome! Which language do you speak?", obLangText: "The app shows everything in your language. Your letters stay in German and are translated for you.",
    obAddTitle: "Add letters", obAddText: "Take a photo of a letter or upload a photo or PDF – also from your cloud. The app reads the letter and files it into the right case automatically. If it is unsure, it asks you.",
    obReadTitle: "Understand and reply", obReadText: "Have every letter translated. If you wish, the app writes a reply draft in German. Always check it yourself – only after your confirmation can you use it as PDF, by email or to share. The app never sends anything on its own.",
    obDeadTitle: "Never miss a deadline", obDeadText: "The app detects deadlines and adds them with a reminder to your calendar. You can change this anytime under “Deadlines & reminders”.",
    obPrivTitle: "Your data", obPrivText: "Letters and files are stored on your device. To read, translate and reply, the letter text is sent to an AI service. The AI can make mistakes and does not replace legal advice. You can lock the app with a PIN and export or delete all data at any time.",
    obNext: "Next", obBack: "Back", obStart: "Let's go", obSkip: "Skip", obTranslating: "The app is being translated into your language …", obAgain: "Show introduction",
    casePdf: "Case as PDF", casePdfInfo: "One PDF with a table of contents and all letters of this case – details, original text, translation, reply and history – e.g. for a lawyer, advice centre or authority.",
    casePdfPhotos: "Include photos of the original letters", casePdfBuild: "Create PDF", casePdfBusy: "Creating PDF …", casePdfToc: "Contents",
    casePdfImgFail: "Photo “{n}” could not be included (format not supported here). It is saved in the case as a separate file.",
    casePdfSeparate: "Attachment “{n}” is saved as a separate file (not in this PDF).", casePdfMissing: "File “{n}” is no longer on this device.",
    profilesTitle: "Profiles (several users)", profileWho: "Who is using the app?", profileAdd: "Add", profileName: "Name of the new profile",
    profileDefaultName: "Me", profileSwitch: "Switch profile", profileActive: "active", profileRename: "Rename", profileDelete: "Delete profile",
    profileDeleteConfirm: "Permanently delete profile “{n}” with all letters, files and settings?",
    profilesInfo: "Each profile has its own cases, letters, files, settings and lock. Other profiles cannot see this data. Purchases and credit apply to the whole device.",
    lockTitle: "App lock (PIN / biometrics)", lockInfo: "Protects this profile with a PIN (4–8 digits) and optionally with fingerprint or face recognition. Only a check value is stored, not the PIN.",
    lockHonest: "The lock protects access through the app. Also use your phone's screen lock.",
    lockSet: "Set PIN", lockChange: "Save changes", lockRemove: "Remove lock", pinCurrent: "Current PIN", pinNew: "New PIN", pinRepeat: "Repeat new PIN",
    pinMismatch: "The PINs do not match.", pinShort: "The PIN must have 4 to 8 digits.", lockAfter: "Lock automatically:", lockAfterNow: "immediately when leaving", lockAfterMin: "after {n} min in background",
    bioLabel: "Unlock with fingerprint / face", bioFail: "Fingerprint/face is not available on this device. The PIN still works.",
    lockNoCrypto: "The lock requires a secure connection (https).", lockSaved: "Lock saved.", lockRemoved: "Lock removed.", lockNow: "Lock now",
    unlockTitle: "Unlock", pinEnter: "PIN", unlockBtn: "Unlock", pinWrong: "Wrong PIN.", pinWait: "Too many attempts. Please wait {n} seconds.", bioBtn: "With fingerprint / face",
    pinForgot: "Forgot PIN?", pinForgotInfo: "For security reasons the PIN cannot be recovered. You can delete this profile with all its data and start again. You can then restore an existing backup.",
    wipeTitle: "Delete all data", wipeInfo: "Deletes cases, letters, files, settings and reminders from this device, as well as the calendar subscription and push reminders on the server. Copies in your clouds, calendars or backups remain there and must be deleted there.",
    wipeExportFirst: "Export everything first", wipeScopeProfile: "Only this profile", wipeScopeAll: "All profiles and all data on this device",
    wipeType: "Type “{w}” to confirm:", wipeWord: "DELETE", wipeBtn: "Delete permanently", wipeDone: "The data has been deleted.",
    backupAllProfiles: "Include all profiles in the backup",
    exportTitle: "Export (all letters & files)", exportAllCases: "All cases", exportFormatLabel: "Save letters as",
    fmtPdf: "PDF (recommended)", fmtTxt: "Text file", fmtBoth: "PDF and text file",
    exportOriginals: "Include original files (photos, PDFs, attachments, envelope)",
    exportPdfNote: "Per letter: details, original text, translation and reply. The PDF shows every script correctly, including Arabic or Persian. To search or copy the text, also choose the text file. An overview of all letters for Excel (CSV) is included.",
    exportSize: "Estimated size: {s}", exportSizeWarn: "Estimated size: {s}. This may take a while on older devices – if there are problems, export cases one by one.",
    exportBuild: "Create export", exportBusy: "Creating export … {n} of {total} letters", exportReady: "Export ready",
    exportDownload: "Download", exportShare: "Share", exportCloud: "Save to cloud", exportAgain: "Create again",
    exportFail: "Export failed. Please try again or select fewer cases.", exportTooBig: "The export is too large. Please export fewer cases at once.",
    exportNoCases: "No cases yet.", exportCase: "Export case", caseWord: "Case", filesWord: "Files",
    secOriginal: "Original text (German)", secTranslation: "Translation", secReply: "Reply", secReplyTr: "Translation of the reply",
    draftNotConfirmed: "Draft – not yet reviewed and confirmed", exportedOn: "Exported on {d} with Briefe-App",
    exLetterFile: "Letter", exOriginal: "Original", exEnvelope: "Envelope", exAttachment: "Attachment", exOverview: "Overview", exNotes: "Notes", exFolder: "Folder",
    exMissing: "These files were no longer on the device and are missing from the export:",
    aiFail: "The AI did not respond. Please try again.",
    confirmedOn: "Confirmed on {d}", confirmFirst: "Confirm first, then export or send.",
    mailLong: "The text is long and is in your clipboard. Paste it into the email.", popupBlocked: "Please allow pop-ups so the PDF can open.",
    backupTitle: "Backup", backupSave: "Save backup as file", backupCloud: "Save backup to cloud", backupRestore: "Restore backup",
    backupInfo: "Contains all cases, letters and original files (without sample data, account and purchases). Restoring adds everything to your existing data; nothing is overwritten.",
    backupDone: "Backup saved.", backupRestored: "{c} case(s) and {l} letter(s) added.", backupBad: "This is not a valid backup file.",
    needPass: "Please enter a password first or turn encryption off.", wrongPass: "Decryption failed (wrong password?).",
    demoShow: "Show sample data", demoRemove: "Remove sample data",
    remindersTitle: "Deadlines & reminders", remindersNone: "No deadlines detected.", remindersOn: "Enable notifications", remindersOff: "Turn notifications off",
    remindersDenied: "Notifications were not allowed.", remindersNoSupport: "Your browser does not support notifications. Use the calendar export.",
    remindersHint: "Notifications only appear while the app is open. For reliable reminders, add the deadlines to your calendar.",
    calSubLabel: "Calendar subscription: deadlines stay up to date in your device calendar without prompts", calSubInfo: "Your calendar fetches the deadlines regularly from our server. For this, deadline data (and the subject only if you wish) is stored at a secret address on the server. It is deleted when you turn this off.",
    calSubOpen: "Subscribe in calendar", calSubCopy: "Copy link", calSubCopied: "Link copied.", calSubFail: "Calendar subscription could not be set up.", calSubOk: "Calendar subscription active.",
    autoCalLabel: "Automatically add deadlines to the device calendar (with reminders)", autoCalNotice: "Deadline file created – please confirm in your calendar (“Add”), then your device will remind you.", autoCalInfo: "Your device asks once whether to add the event. Nothing is added without your confirmation.",
    pushOn: "Background reminders active: you will be reminded even when the app is closed.", pushSending: "Sending reminders to the push server …", pushFail: "Background reminders could not be set up. Please use the calendar export for now.",
    pushIos: "iPhone/iPad: first install the app via “Share → Add to Home Screen”, otherwise background reminders are not possible.",
    pushConsent: "For reminders while the app is closed, only reminder times and your device identifier are sent to the push server (EU hosting). They are deleted when you turn this off.",
    pushSubjectLabel: "Show the letter subject in the reminder (it is then transmitted too)",
    remindDays: "Remind before deadline (days)", remindTime: "Time", toCalendar: "Add to calendar", allToCalendar: "All deadlines to calendar",
    overdue: "overdue", todayWord: "today", daysLeft: "{n} days left", deadlinesStrip: "{n} deadline(s) within 7 days or overdue", showDeadlines: "View deadlines",
    remindTitle: "Deadline in {d} day(s)", remindToday: "Deadline today",
  },
};

/* ---------- Demo-Ausgangsdaten ---------- */
// Beispieldaten mit Daten relativ zu heute, damit die Beispielfrist nie abgelaufen ist
// Datum in Ortszeit (nicht UTC), sonst stimmt "heute" zwischen 0 und 1/2 Uhr in Deutschland nicht
// Erste Einschätzung beim Start (vor dem Laden der Einstellungen): Handy/Tablet = Menü als Fenster
const initialOverlay = () => { try { return window.innerWidth < 720 || window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } };
const nLetters = (n, t) => `${n} ${n === 1 ? t.letterWord : t.lettersWord}`;
const localIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DEMO_D = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return localIso(d); };
const DEMO_DE = (days) => DEMO_D(days).split("-").reverse().join(".");
const seedCases = [
  {
    id: "c1", demo: true, name: "Jobcenter StädteRegion Aachen", status: "open", color: "#1E5B4F",
    letters: [
      {
        id: "l1", subject: "Aufforderung zur Vorlage von Unterlagen",
        sender: "Jobcenter StädteRegion Aachen", caseNumber: "BG 5123.0047",
        date: DEMO_D(-7), receivedDate: DEMO_D(-5), uploadedAt: DEMO_D(-5) + "T09:12:00",
        deadline: DEMO_D(21),
        original: "Sehr geehrter Herr Yilmaz,\n\nwir bitten Sie, bis zum " + DEMO_DE(21) + " die aktuellen Kontoauszüge der letzten drei Monate sowie den Mietvertrag in Kopie vorzulegen. Sollten die Unterlagen nicht fristgerecht eingehen, kann dies zu einer Leistungskürzung führen.\n\nMit freundlichen Grüßen\nJobcenter StädteRegion Aachen",
        translation: "",
        reply: "",
      },
    ],
  },
  {
    id: "c2", demo: true, name: "Vermieter – Nebenkostenabrechnung", status: "open", color: "#B5502A",
    letters: [],
  },
  {
    id: "c3", demo: true, name: "Krankenkasse – Bonusprogramm", status: "done", color: "#726B5E",
    letters: [],
  },
];

/* ---------- Claude API Helper ---------- */
const AI_MODEL = "claude-sonnet-5-5";      // zentral, damit ein Modellwechsel nur hier nötig ist
async function askClaude(prompt, maxTokens = 4000) {
  if (typeof window !== "undefined" && window.__briefeAI) return window.__briefeAI({ prompt, maxTokens });   // Vorschau-Umgebung stellt eigene KI bereit
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.type === "error") throw new Error("ai " + res.status);
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
  if (!text) throw new Error("ai empty");
  return text;
}

/* ---------- Icon-Button ---------- */
function IconBtn({ icon: Icon, onClick, active, c, label, size = 18 }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: 10, border: `1px solid ${c.border}`,
        background: active ? c.accentSoft : c.surface, color: active ? c.accent : c.textMuted,
        cursor: "pointer", transition: "all .15s",
      }}
    >
      <Icon size={size} />
    </button>
  );
}

/* ================= Hauptkomponente ================= */
function BriefeCore({ profileApi }) {
  const [dark, setDark] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [uiLang, setUiLangRaw] = useState("de");
  const [dynamicUiStrings, setDynamicUiStrings] = useState({});
  const [uiTranslating, setUiTranslating] = useState(false);
  const t = UI_STRINGS[uiLang] || dynamicUiStrings[uiLang] || UI_STRINGS.de;

  // Für Sprachen, die nicht fest hinterlegt sind, wird die komplette Oberfläche
  // per KI übersetzt und danach gecacht, damit die App wirklich in jeder Sprache läuft.
  // Bis zu 3 Versuche, bevor endgültig auf Deutsch zurückgefallen wird.
  useEffect(() => {
    if (UI_STRINGS[uiLang] || dynamicUiStrings[uiLang]) return;
    let cancelled = false;
    setUiTranslating(true);
    (async () => {
      const langLabel = LANGS.find((l) => l.code === uiLang)?.label || uiLang;
      const { disclaimer, ...translatable } = UI_STRINGS.de;
      const cacheKey = "briefe-app-ui-" + uiLang;
      // Zwischenspeicher: schon übersetzte Texte behalten, nur neue oder geänderte deutsche Texte nachübersetzen
      let cache = { src: {}, strings: {} };
      try { const r = await window.storage.get(cacheKey); if (r?.value) cache = JSON.parse(r.value); } catch (e) {}
      const strings = { ...(cache.strings || {}) };
      const show = () => { if (!cancelled) setDynamicUiStrings((prev) => ({ ...prev, [uiLang]: { ...UI_STRINGS.de, ...strings, disclaimer } })); };
      const todo = Object.keys(translatable).filter((k) => !strings[k] || (cache.src || {})[k] !== translatable[k]);
      if (Object.keys(strings).length) show();
      // In Paketen à 40 Texten: eine einzige Anfrage wäre zu lang und bräche ab
      for (let i = 0; i < todo.length && !cancelled; i += 40) {
        const part = Object.fromEntries(todo.slice(i, i + 40).map((k) => [k, translatable[k]]));
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const got = parseJsonLoose(await aiTask("ui", { part, lang: langLabel }));
            if (got && typeof got === "object") {
              for (const k of Object.keys(part)) if (typeof got[k] === "string" && got[k].trim()) { strings[k] = got[k]; cache.src = { ...(cache.src || {}), [k]: translatable[k] }; }
              break;
            }
          } catch (e) {}
        }
        show();
      }
      if (!cancelled) {
        show(); setUiTranslating(false);
        try { await window.storage.set(cacheKey, JSON.stringify({ src: cache.src, strings })); } catch (e) {}
      }
    })();
    return () => { cancelled = true; };
  }, [uiLang]);

  // App-Sprache und "Übersetzen nach" zusammen halten, damit es nicht widersprüchlich wirkt.
  // Der Nutzer kann die Übersetzungssprache im Brief trotzdem separat wieder ändern.
  const setUiLang = (code, keep) => {
    setUiLangRaw(code);
    if (!keep) { try { window.storage?.set(PK("briefe-app-lang"), code); } catch (e) {} }
    if (code !== "de") {
      setTargetLang(code);
      setReplyLang(code);
    }
  };
  // Sprache beim Start: zuletzt gewählte, sonst die Sprache des Geräts (z. B. fa-IR → Persisch), sonst Deutsch
  useEffect(() => {
    (async () => {
      let saved = null;
      try { saved = (await window.storage?.get(PK("briefe-app-lang")))?.value || null; } catch (e) {}
      if (saved && LANGS.some((l) => l.code === saved)) return setUiLang(saved, true);
      const dev = (navigator.languages || [navigator.language || ""]).map((x) => String(x).toLowerCase());
      for (const d of dev) {
        const hit = LANGS.find((l) => l.code === d) || LANGS.find((l) => l.code === d.split("-")[0]);
        if (hit) { if (hit.code !== "de") setUiLang(hit.code, true); return; }
      }
    })();
  }, []);
  const c = dark ? palette.dark : palette.light;

  const [cases, setCases] = useState(seedCases);
  const [caseNameTranslations, setCaseNameTranslations] = useState({});

  // Ordnernamen zweisprachig: übersetzt die Fallnamen in die gewählte App-Sprache
  useEffect(() => {
    if (uiLang === "de") return;
    let cancelled = false;
    (async () => {
      for (const cs of cases) {
        const key = cs.id + ":" + uiLang;
        if (caseNameTranslations[key]) continue;
        const langLabel = LANGS.find((l) => l.code === uiLang)?.label || uiLang;
        let result = null;
        // Ein Versuch + ein Wiederholungsversuch, bevor auf den Originaltext zurückgefallen wird
        for (let attempt = 0; attempt < 2 && !result; attempt++) {
          try {
            const r = await aiTask("caseName", { name: cs.name, lang: langLabel });
            if (r && r.trim()) result = r.trim();
          } catch (e) {}
        }
        if (!cancelled) {
          setCaseNameTranslations((prev) => ({ ...prev, [key]: result || cs.name }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [uiLang, cases]);
  const [view, setView] = useState("tiles"); // tiles | list
  const [menuOpen, setMenuOpen] = useState({ cases: true, tools: false, account: false });
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [query, setQuery] = useState("");
  const [openTabs, setOpenTabs] = useState([]); // letter ids
  const [activeTab, setActiveTab] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => !initialOverlay());   // Handy/Tablet: Menü startet geschlossen
  const [sbFor, setSbFor] = useState(() => initialOverlay());                // für welche Menü-Art der Zustand oben gilt
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [replyLang, setReplyLang] = useState("en");
  const [userNote, setUserNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);

  // ---------- Shop / Recht: Zustand (Betreiber-Schalter, Bestellungen, Einwilligungen) ----------
  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [shopLoaded, setShopLoaded] = useState(false);
  const [modal, setModal] = useState(null);       // checkout | orders | withdraw | cancel
  const [legalTab, setLegalTab] = useState(null); // impressum | datenschutz | agb | widerruf
  const [serverCfg, setServerCfg] = useState(SERVER_CFG);
  // Bei eingerichtetem Server entscheidet der Server über Bezahlpflicht und Abo (Betreiber-Schalter dort)
  const flags = SERVER_URL && serverCfg ? { ...shop.flags, paymentRequired: serverCfg.paymentRequired, subscription: serverCfg.subscription } : shop.flags;
  useEffect(() => {
    if (!SERVER_URL) return;
    fetch(SERVER_URL + "/config").then((r) => r.json()).then((j) => { SERVER_CFG = j; if (j.vapidPublic) PUSH_VAPID_KEY = j.vapidPublic; setServerCfg(j); }).catch(() => {});
  }, []);
  const applyServerOrders = (list) => setShop((s) => {
    const map = { active: "active", paid: "active", processing: "processing", cancelled: "cancelled", withdrawn: "withdrawn", ended: "ended", failed: "failed" };
    const orders = [...s.orders]; const unlocked = { ...s.unlocked };
    for (const o of list) {
      const local = { id: o.id, kind: o.kind, title: o.title, pages: o.pages, amount: o.amount, method: "stripe", createdAt: o.createdAt, waiverAccepted: true,
        status: map[o.status] || o.status, server: true, letterId: o.letterId, withdrawnAt: o.withdrawnAt, cancelledAt: o.cancelledAt, endsAt: o.endsAt, refunded: o.refunded };
      const i = orders.findIndex((x) => x.id === o.id);
      if (i >= 0) orders[i] = { ...orders[i], ...local }; else orders.unshift(local);
      if (o.kind === "letter" && o.letterId && o.status === "paid") unlocked[o.letterId] = "paid";
      if (o.kind === "letter" && o.letterId && o.status === "withdrawn" && o.refunded) delete unlocked[o.letterId];
    }
    return { ...s, orders, unlocked };
  });
  const syncOrders = async () => { if (!SERVER_URL) return null; try { const r = await srv("/me"); applyServerOrders(r.orders || []); return r.account; } catch (e) { return null; } };
  useEffect(() => {
    if (!SERVER_URL) return;
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get("login") && !sp.get("paid") && !sp.get("paycancel")) return;
    const clean = () => { try { window.history.replaceState(null, "", window.location.pathname); } catch (e) {} };
    (async () => {
      const at = new Date().toISOString();
      if (sp.get("login")) {
        try {
          const r = await srv("/auth/email/finish", { token: sp.get("login") });
          setAccount((a) => ({ ...(a || { method: "email", loginAt: at }), email: { address: r.email, status: "confirmed", requestedAt: at, confirmedAt: at }, ...(r.up ? { upAddress: r.up, upVerified: true } : {}) }));
          await syncOrders(); setNotice(t.loginDone);
        } catch (e) { setNotice(t.loginLinkBad); }
      }
      if (sp.get("paid")) {
        try { const r = await srv("/pay/status?session=" + encodeURIComponent(sp.get("paid"))); applyServerOrders([r.order]); setNotice(r.order.status === "paid" ? t.payDone : t.payPending); }
        catch (e) { setNotice(t.payPending); }
      }
      if (sp.get("paycancel")) setNotice(t.payCancelled);
      clean();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage?.get("briefe-app-shop");
        if (res?.value) {
          const p = JSON.parse(res.value);
          setShop({ ...DEFAULT_SHOP, ...p, flags: { ...DEFAULT_SHOP.flags, ...(p.flags || {}) } });
        }
      } catch (e) {}
      setShopLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!shopLoaded) return;
    (async () => {
      try { await window.storage?.set("briefe-app-shop", JSON.stringify(shop)); } catch (e) {}
    })();
  }, [shop, shopLoaded]);

  const setFlag = (k, v) => setShop((s) => ({ ...s, flags: { ...s.flags, [k]: v } }));
  const patchOrder = (id, patch) => setShop((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  const openModal = (m) => { setModal(m); if (ovl) setSidebarOpen(false); };

  // ---------- Dateien · Zuordnung · Clouds · Konto ----------
  const [cloud, setCloud] = useState(DEFAULT_CLOUD);        // Einwilligungen & Optionen (ohne Zugangsdaten)
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [tokens, setTokens] = useState({});                  // Cloud-Zugriffe gelten nur für diese Sitzung
  const [cloudPass, setCloudPass] = useState("");            // Passwort nur im Arbeitsspeicher
  const [cloudModal, setCloudModal] = useState(null);        // { tab, files }
  const [account, setAccount] = useState(DEFAULT_ACCOUNT);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [intake, setIntake] = useState(null);                // { files, asPages }
  const [progress, setProgress] = useState(null);            // { done, total }
  const [assignQueue, setAssignQueue] = useState([]);        // unsichere Zuordnungen, die der Nutzer entscheidet
  const [notice, setNotice] = useState("");
  const camInputRef = useRef(null);
  const pickInputRef = useRef(null);

  // ---------- Fall-Ansicht · Kachel-Einstellungen · Fristen · Backup · Suche ----------
  const [prefs, setPrefsRaw] = useState(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [openCaseId, setOpenCaseId] = useState(null);       // null = Übersicht, sonst Fall-Ansicht
  const [tileModal, setTileModal] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [expansions, setExpansions] = useState({});          // Suchbegriff -> deutsche Suchbegriffe (Übersetzung/Synonyme)
  const [expanding, setExpanding] = useState(false);
  const casesRef = useRef(cases); casesRef.current = cases;
  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  const setPrefs = (patch) => setPrefsRaw((p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) }));

  useEffect(() => {
    (async () => {
      try { const r = await window.storage?.get(PK("briefe-app-prefs")); if (r?.value) setPrefsRaw(mergePrefs(JSON.parse(r.value))); } catch (e) {}
      setPrefsLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!prefsLoaded) return;
    (async () => { try { await window.storage?.set(PK("briefe-app-prefs"), JSON.stringify(prefs)); } catch (e) {} })();
  }, [prefs, prefsLoaded]);

  const visibleCases = useMemo(() => (prefs.showDemo ? cases : cases.filter((cs) => !cs.demo)), [cases, prefs.showDemo]);
  const hasDemo = cases.some((cs) => cs.demo);

  // Sprachübergreifende Suche: die KI nennt deutsche Suchbegriffe (Übersetzung und Synonyme) zum eingegebenen Wort
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3 || expansions[q]) return;
    const id = setTimeout(async () => {
      setExpanding(true);
      let terms = [];
      try {
        const raw = await aiTask("search", { q: query.trim() });
        const m = raw.match(/\[[\s\S]*\]/);
        terms = (m ? JSON.parse(m[0]) : []).map((x) => String(x).toLowerCase().trim()).filter((x) => x.length >= 3);
      } catch (e) {}
      setExpansions((p) => ({ ...p, [q]: terms }));
      setExpanding(false);
    }, 700);
    return () => clearTimeout(id);
  }, [query]);
  const searchTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? [q, ...(expansions[q] || [])] : [];
  }, [query, expansions]);

  // Fristen-Benachrichtigungen (nur solange die App geöffnet ist; zuverlässig ist der Kalender-Export)
  useEffect(() => {
    if (!prefs.remind.enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const tick = () => {
      const p = prefsRef.current; const now = new Date();
      const [hh, mm] = String(p.remind.time || "09:00").split(":").map(Number);
      const fired = { ...p.remind.fired }; let changed = false;
      for (const cs of casesRef.current) {
        if (cs.status === "done" || (cs.demo && !p.showDemo)) continue;
        for (const l of cs.letters) {
          if (!l.deadline) continue;
          const end = new Date(l.deadline + "T23:59:59");
          for (const d of p.remind.days) {
            const at = new Date(l.deadline + "T00:00:00"); at.setDate(at.getDate() - d); at.setHours(hh, mm || 0, 0, 0);
            const key = `${l.id}:${d}`;
            if (now >= at && now <= end && !fired[key]) {
              try { new Notification(d === 0 ? t.remindToday : t.remindTitle.replace("{d}", d), { body: `${l.subject}${l.caseNumber && l.caseNumber !== "—" ? " · " + l.caseNumber : ""}` }); } catch (e) {}
              fired[key] = true; changed = true;
            }
          }
        }
      }
      if (changed) setPrefsRaw((pp) => ({ ...pp, remind: { ...pp.remind, fired } }));
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [prefs.remind.enabled, uiLang]);


  useEffect(() => {
    (async () => {
      try { const r = await window.storage?.get(PK("briefe-app-cloud")); if (r?.value) setCloud({ ...DEFAULT_CLOUD, ...JSON.parse(r.value) }); } catch (e) {}
      setCloudLoaded(true);
      try { const r = await window.storage?.get(PK("briefe-app-account")); if (r?.value) setAccount(JSON.parse(r.value)); } catch (e) {}
      setAccountLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!cloudLoaded) return;
    (async () => { try { await window.storage?.set(PK("briefe-app-cloud"), JSON.stringify(cloud)); } catch (e) {} })();
  }, [cloud, cloudLoaded]);
  useEffect(() => {
    if (!accountLoaded) return;
    (async () => { try { await window.storage?.set(PK("briefe-app-account"), JSON.stringify(account)); } catch (e) {} })();
  }, [account, accountLoaded]);

  const goHome = () => {
    if (userNote.trim().length > 0) {
      setShowHomeConfirm(true);
    } else {
      setActiveTab(null);
      setOpenCaseId(null);
    }
  };
  const sidebarTouch = useRef({ startX: 0, deltaX: 0 });
  const mainRef = useRef(null);
  const searchRef = useRef(null);
  const backRef = useRef(() => {});               // ein Schritt zurück (wird bei jedem Render aktualisiert)
  const navRef = useRef({ depth: 0, popPending: false, ignorePop: 0, histOk: true, lastBack: 0, edge: null });

  // Bildschirmbreite beobachten (mobile vs. desktop)
  const [winWidth, setWinWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = winWidth < 720;
  // Design: "classic" (Seitenleiste, heißt in der App "Desktop") oder "new" (untere Leiste, heißt "Klassisch").
  // Ohne eigene Wahl: Geräte mit Touch-Bedienung (Handy, Tablet) = untere Leiste, Geräte mit Maus = Seitenleiste.
  const [isTouch] = useState(() => { try { return window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } });   // Handy/Tablet
  const navNew = prefs.layout ? prefs.layout === "new" : (isMobile || isTouch);
  const ovl = isMobile || navNew;   // Menü als einblendbares Fenster statt fester Seitenleiste
  const isRTL = ["ar", "fa", "ur", "ps", "he", "ckb"].includes(uiLang);

  // Auf mobilen Geräten startet die Seitenleiste eingeklappt
  useEffect(() => {
    if (sbFor !== ovl) { setSidebarOpen(!ovl); setSbFor(ovl); }
  }, [ovl]);

  // Zurück: Zurück-Taste/-Geste des Geräts und Wischen vom Rand gehen einen Schritt zurück
  // (Brief → Fall → Übersicht, Menü schließen). Alles in try/catch: in Vorschau-Rahmen ist der Verlauf evtl. gesperrt.
  const isRtlRef = useRef(false); isRtlRef.current = isRTL;
  useEffect(() => {
    const N = navRef.current;
    const onPop = () => {
      if (N.ignorePop > 0) { N.ignorePop--; return; }
      if (N.depth > 0) { N.popPending = true; backRef.current(); }
    };
    const onStart = (e) => {
      const tt = e.touches && e.touches[0]; if (!tt) return;
      const w = window.innerWidth; const edge = 24;
      const fromEdge = isRtlRef.current ? tt.clientX >= w - edge : tt.clientX <= edge;
      N.edge = fromEdge ? { x: tt.clientX, y: tt.clientY } : null;
    };
    const onEnd = (e) => {
      const s = N.edge; N.edge = null; if (!s || N.depth === 0) return;
      const tt = e.changedTouches && e.changedTouches[0]; if (!tt) return;
      const dx = (tt.clientX - s.x) * (isRtlRef.current ? -1 : 1); const dy = Math.abs(tt.clientY - s.y);
      if (dx < 70 || dy > 60) return;
      const now = Date.now(); if (now - N.lastBack < 500) return; N.lastBack = now;
      if (N.histOk) { try { window.history.back(); return; } catch (err) { N.histOk = false; } }
      backRef.current();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, []);

  // Persistenz laden
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage?.get(PK("briefe-app-cases"));
        if (res?.value) setCases(normalizeCases(JSON.parse(res.value)));
      } catch (e) {}
    })();
  }, []);

  const persist = async (next) => {
    setCases(next);
    try {
      await window.storage?.set(PK("briefe-app-cases"), JSON.stringify(next));
    } catch (e) {}
  };

  const allLetters = useMemo(
    () => cases.flatMap((cs) => cs.letters.map((l) => ({ ...l, caseId: cs.id, caseName: cs.name, caseColor: cs.color, caseStatus: cs.status }))),
    [cases]
  );

  // Hintergrund-Erinnerungen über Web Push (Server schickt zum Zeitpunkt, auch bei geschlossener App)
  const [pushState, setPushState] = useState("idle");
  const pushItems = allLetters.filter((l) => l.deadline && l.caseStatus !== "done" && (prefs.showDemo || !cases.find((cs) => cs.id === l.caseId)?.demo));
  const pushKey = JSON.stringify([prefs.remind.enabled, prefs.remind.days, prefs.remind.time, prefs.remind.sendSubject, uiLang, pushItems.map((l) => [l.id, l.deadline, prefs.remind.sendSubject ? l.subject : ""])]);
  useEffect(() => {
    if (!PUSH_ENDPOINT || !pushSupported()) return;
    const id = setTimeout(async () => {
      try {
        if (prefs.remind.enabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
          setPushState("sending");
          await pushSync(buildPushSchedule(pushItems, prefs.remind, t));
          setPushState("on");
        } else if (!prefs.remind.enabled) { await pushOff(); setPushState("idle"); }
      } catch (e) { console.error("push", e); setPushState("fail"); }
    }, 1500);
    return () => clearTimeout(id);
  }, [pushKey]);

  // Kalender-Abo: aktuelle Fristen als .ics beim Server hinterlegen; der Gerätekalender ruft sie selbst ab
  const [calState, setCalState] = useState("idle");
  const calKey = JSON.stringify([prefs.remind.calSub, prefs.remind.calToken, prefs.remind.days, prefs.remind.time, prefs.remind.sendSubject, pushItems.map((l) => [l.id, l.deadline, prefs.remind.sendSubject ? l.subject : ""])]);
  useEffect(() => {
    if (!PUSH_ENDPOINT) return;
    const r = prefs.remind;
    if (r.calSub && !r.calToken) { setPrefs({ remind: { ...r, calToken: makeCalToken() } }); return; }
    if (!r.calSub && !r.calToken) return;
    const id = setTimeout(async () => {
      try {
        if (r.calSub) {
          setCalState("sending");
          await calSync(r.calToken, await buildIcs(calItems(pushItems, r, t), r).text());
          setCalState("on");
        } else {
          await calDelete(r.calToken);
          setPrefs({ remind: { ...r, calToken: "" } }); setCalState("idle");
        }
      } catch (e) { console.error("cal", e); setCalState("fail"); }
    }, 1500);
    return () => clearTimeout(id);
  }, [calKey]);

  const activeLetter = allLetters.find((l) => l.id === activeTab);
  const activeCase = cases.find((cs) => cs.id === activeLetter?.caseId);

  // ---------- Shop / Recht: Logik ----------
  const nowMs = Date.now();
  const withdrawable = shop.orders.filter((o) => o.status === "active" && addDays(o.createdAt, WITHDRAWAL_DAYS).getTime() > nowMs);
  const withdrawDaysLeft = withdrawable.length
    ? Math.max(1, Math.ceil((Math.min(...withdrawable.map((o) => addDays(o.createdAt, WITHDRAWAL_DAYS).getTime())) - nowMs) / 86400000))
    : 0;
  const hasActiveSub = shop.orders.some((o) => o.kind === "sub" && o.status === "active");

  // Zugangssperre: erste 2 Briefe frei, danach Kauf (nur wenn Schalter "Bezahlpflicht" aktiv ist)
  const gate = async (fn) => {
    if (!activeLetter) return;
    if (SERVER_URL) {
      if (!flags.paymentRequired || shop.unlocked[activeLetter.id]) return fn();
      try {
        const r = await srv("/letters/unlock", { letterId: activeLetter.id, pages: activeLetter.pages || 1 });
        setShop((s) => ({ ...s, unlocked: { ...s.unlocked, [activeLetter.id]: r.kind } }));
        return fn();
      } catch (e) {
        if (e.status === 402) return setModal({ type: "checkout", item: { kind: "letter", letterId: activeLetter.id, title: activeLetter.subject, pages: activeLetter.pages || 1 }, then: fn });
        if (e.status === 403) { setNotice(t.freeNeedsLogin); setAuthOpen(true); return; }
        return setNotice(t.serverFail);
      }
    }
    if (!flags.paymentRequired || hasActiveSub || shop.unlocked[activeLetter.id]) return fn();
    const freeUsed = Object.values(shop.unlocked).filter((v) => v === "free").length;
    if (freeUsed < FREE_LETTERS) {
      setShop((s) => ({ ...s, unlocked: { ...s.unlocked, [activeLetter.id]: "free" } }));
      return fn();
    }
    setModal({ type: "checkout", item: { kind: "letter", letterId: activeLetter.id, title: activeLetter.subject, pages: activeLetter.pages || 1 }, then: fn });
  };

  const confirmPurchase = async (item, method) => {
    // Echte Zahlung: Weiterleitung zur Stripe-Kasse; nach der Rückkehr schaltet der Server den Brief frei
    if (SERVER_URL && serverCfg?.payments) {
      try {
        const r = await srv("/pay/checkout", { kind: item.kind === "sub" ? "sub" : "letter", letterId: item.letterId, pages: item.pages || 1, title: item.title, waiver: true, terms: true });
        window.location.href = r.url;
      } catch (e) { setNotice(t.payFail); }
      return null;
    }
    const isSub = item.kind === "sub";
    const order = {
      id: "B-" + Date.now().toString(36).toUpperCase(),
      kind: item.kind,
      title: isSub ? SUB_PLAN.name : item.title,
      pages: isSub ? null : item.pages || 1,
      amount: isSub ? SUB_PLAN.price : priceForLetter(item.pages || 1),
      method,
      createdAt: new Date().toISOString(),
      waiverAccepted: true,
      status: "active",
    };
    setShop((s) => ({
      ...s,
      orders: [order, ...s.orders],
      unlocked: isSub ? s.unlocked : { ...s.unlocked, [item.letterId]: "paid" },
    }));
    return order;
  };

  const confirmWithdraw = async (orderId) => {
    const so = shop.orders.find((o) => o.id === orderId);
    if (SERVER_URL && so?.server) {
      try {
        const r = await srv("/pay/withdraw", { orderId });
        patchOrder(orderId, { status: "withdrawn", withdrawnAt: r.at, receiptId: r.receiptId, refunded: r.refunded });
        if (r.refunded && so.letterId) setShop((s) => { const u = { ...s.unlocked }; delete u[so.letterId]; return { ...s, unlocked: u }; });
        return { receiptId: r.receiptId, at: r.at, refunded: r.refunded };
      } catch (e) { setNotice(t.serverFail); return null; }
    }
    const receipt = { receiptId: "W-" + Date.now().toString(36).toUpperCase(), at: new Date().toISOString() };
    patchOrder(orderId, { status: "withdrawn", withdrawnAt: receipt.at, receiptId: receipt.receiptId });
    return receipt;
  };

  const confirmCancel = async (orderId) => {
    const so = shop.orders.find((o) => o.id === orderId);
    if (SERVER_URL && so?.server) {
      try { const r = await srv("/pay/cancel", { orderId }); patchOrder(orderId, { status: "cancelled", cancelledAt: r.at, endsAt: r.endsAt, receiptId: r.receiptId }); return r; }
      catch (e) { setNotice(t.serverFail); return null; }
    }
    const at = new Date();
    const endsAt = new Date(at); endsAt.setMonth(endsAt.getMonth() + 1);
    const res = { at: at.toISOString(), endsAt: endsAt.toISOString(), receiptId: "K-" + Date.now().toString(36).toUpperCase() };
    patchOrder(orderId, { status: "cancelled", cancelledAt: res.at, endsAt: res.endsAt, receiptId: res.receiptId });
    return res;
  };

  const newsletterRequest = (email, consentText) => {
    if (SERVER_URL) srv("/newsletter/subscribe", { email, consentText }).catch(() => setNotice(t.serverFail));
    return setShop((s) => ({ ...s, newsletter: [{ id: "N" + Date.now(), email, status: "pending", requestedAt: new Date().toISOString(), consentText }, ...s.newsletter] }));
  };
  const newsletterPatch = (id, patch) =>
    setShop((s) => ({ ...s, newsletter: s.newsletter.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));

  const filteredCases = useMemo(() => {
    let list = visibleCases;
    if (statusFilter !== "all") list = list.filter((cs) => cs.status === statusFilter);
    if (searchTerms.length) {
      list = list.filter((cs) =>
        searchTerms.some((tm) => cs.name.toLowerCase().includes(tm)) || cs.letters.some((l) => letterMatches(l, searchTerms))
      );
    }
    const sorted = [...list];
    // Fälle werden nach allen ihren Briefen sortiert (nicht nur nach dem ersten); leere Werte stehen unten
    const byText = (get, dir = 1) => (a, b) => {
      const x = get(a), y = get(b);
      if (!x && !y) return 0; if (!x) return 1; if (!y) return -1;
      return String(x).localeCompare(String(y), "de", { numeric: true }) * dir;
    };
    if (sortBy === "name") sorted.sort(byText((cs) => cs.name.toLowerCase()));
    if (sortBy === "date") sorted.sort(byText(caseDate, -1));
    if (sortBy === "case") sorted.sort(byText((cs) => caseNo(cs).toLowerCase()));
    if (sortBy === "deadline") sorted.sort(byText(caseDeadline));
    return sorted;
  }, [visibleCases, statusFilter, searchTerms, sortBy]);

  const openLetter = (letterId) => {
    if (!openTabs.includes(letterId)) setOpenTabs([...openTabs, letterId]);
    setActiveTab(letterId);
  };

  const closeTab = (letterId) => {
    const next = openTabs.filter((id) => id !== letterId);
    setOpenTabs(next);
    if (activeTab === letterId) setActiveTab(next[next.length - 1] || null);
  };

  const updateLetter = (caseId, letterId, patch) => {
    const next = cases.map((cs) =>
      cs.id !== caseId ? cs : { ...cs, letters: cs.letters.map((l) => (l.id !== letterId ? l : { ...l, ...patch })) }
    );
    persist(next);
  };

  const toggleCaseStatus = (caseId) => {
    const next = cases.map((cs) => cs.id !== caseId ? cs : { ...cs, status: cs.status === "open" ? "done" : "open" });
    persist(next);
  };

  /* ---------- Hinzufügen: Kamera / Dateien / Clouds → auslesen → zuordnen ---------- */
  const addToIntake = (list) => {
    const picked = Array.from(list); // Kopie sofort, denn e.target.value = "" leert die FileList
    setIntake((s) => ({ asPages: false, ...(s || {}), files: [...((s && s.files) || []), ...picked] }));
  };
  const onInputChange = (e) => { addToIntake(e.target.files || []); e.target.value = ""; };

  const autoUpload = async (items) => {
    const p = cloud.auto;
    if (!p || !items.length) return;
    if (!tokens[p]) return setNotice(t.noticeAutoOff);
    if (cloud.encrypt && !cloudPass) return setNotice(t.noticeAutoPass);
    try {
      for (const { name, blob } of items) {
        const out = cloud.encrypt ? await encryptBlob(blob, cloudPass) : blob;
        await cloudUpload(p, tokens[p], cloud.encrypt ? name + ".enc" : name, out);
      }
      setNotice(t.noticeSaved.replace("{n}", items.length).replace("{name}", CLOUD_META[p].label));
    } catch (e) { setNotice(t.noticeUploadFail); }
  };

  const startIntake = async () => {
    if (!intake?.files?.length || progress) return;
    const groups = intake.asPages ? [intake.files] : intake.files.map((f) => [f]);
    const queue = []; const stored = []; const filed = []; const created = [];
    let working = cases; let failed = 0;
    setProgress({ done: 0, total: groups.length });
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      let info = null;
      try { info = await extractLetter(group); } catch (e) {}
      if (!info) failed++;
      const fileMeta = [];
      for (const f of group) {
        const id = "f" + Date.now() + Math.random().toString(36).slice(2, 7);
        await fileSave(id, f);
        fileMeta.push({ id, name: f.name, type: f.type || guessType(f.name), size: f.size });
        stored.push({ name: f.name, blob: f });
      }
      const letter = buildLetter(group, info, fileMeta);
      created.push(letter);
      // Zuordnung: Aktenzeichen gleich = sicher; nur Absender gleich oder nichts gelesen = Nutzer fragen; sonst neuer Fall
      const pool = working.filter((cs) => !cs.demo);   // echte Briefe nie in Beispielfälle einsortieren
      const m = !info ? (pool.length ? { type: "ask", candidates: [] } : { type: "new" }) : matchCase(pool, info);
      if (m.type === "sure") {
        working = working.map((cs) => (cs.id === m.caseId ? { ...cs, letters: [letter, ...cs.letters] } : cs));
        filed.push(letter.id);
      } else if (m.type === "ask") {
        queue.push({ letter, candidates: m.candidates });
      } else {
        working = [...working, newCaseFor(letter, working.length)];
        filed.push(letter.id);
      }
      persist(working);
      setProgress({ done: gi + 1, total: groups.length });
    }
    setProgress(null); setIntake(null);
    if (queue.length) setAssignQueue(queue);
    const msg = [t.noticeDone.replace("{n}", filed.length + queue.length)];
    if (failed) msg.push(t.noticeFailed.replace("{n}", failed));
    if (autoCalendar(created.filter((l) => filed.includes(l.id)), true)) msg.push(t.autoCalNotice);
    setNotice(msg.join(" "));
    if (groups.length === 1 && filed.length === 1) openLetter(filed[0]);
    autoUpload(stored);
  };

  const resolveAssign = (choice) => {
    const [item, ...rest] = assignQueue;
    let working = cases;
    if (choice === "new") working = [...working, newCaseFor(item.letter, working.length)];
    else working = working.map((cs) => (cs.id === choice ? { ...cs, letters: [item.letter, ...cs.letters] } : cs));
    persist(working);
    autoCalendar([item.letter]);
    setAssignQueue(rest);
    if (!rest.length) openLetter(item.letter.id);
  };

  const downloadBlob = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  // Frist automatisch in den Gerätekalender: Browser dürfen nicht still schreiben, daher öffnet die .ics-Datei den Kalender-Dialog des Geräts
  const autoCalendar = (list, quiet) => {
    const r = prefsRef.current.remind;
    if (r.autoCalendar === false) return;
    const items = list.filter((l) => l.deadline && l.deadline >= todayIso());
    if (!items.length) return;
    downloadBlob(buildIcs(items, r), items.length === 1 ? "frist.ics" : "fristen.ics");
    if (!quiet) setNotice(t.autoCalNotice);
    return true;
  };
  const fileActions = {
    get: (f) => fileGet(f.id),
    notify: setNotice,
    download: async (f) => { const b = await fileGet(f.id); if (!b) return setNotice(t.noticeMissing); downloadBlob(b, f.name); },
    share: async (f) => {
      const b = await fileGet(f.id); if (!b) return setNotice(t.noticeMissing);
      const file = new File([b], f.name, { type: f.type });
      try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }); else downloadBlob(b, f.name); } catch (e) {}
    },
    cloud: (f) => setCloudModal({ tab: "export", files: [f] }),
    add: (letter, list, kind) => addLetterFiles(letter, list, kind),
  };

  /* ---------- Brief bearbeiten · verschieben · löschen · Dateien anhängen ---------- */
  const saveLetterEdit = (letter, patch, toCaseId) => {
    let next = cases.map((cs) => (cs.id !== letter.caseId ? cs : { ...cs, letters: cs.letters.map((l) => (l.id === letter.id ? { ...l, ...patch } : l)) }));
    if (toCaseId && toCaseId !== letter.caseId) {
      const moved = next.find((cs) => cs.id === letter.caseId)?.letters.find((l) => l.id === letter.id);
      if (moved) {
        next = next.map((cs) => (cs.id === letter.caseId ? { ...cs, letters: cs.letters.filter((l) => l.id !== letter.id) }
          : cs.id === toCaseId ? { ...cs, letters: [moved, ...cs.letters] } : cs));
      }
    }
    persist(next);
    setEditOpen(false);
    if (patch.deadline && patch.deadline !== letter.deadline) autoCalendar([{ ...letter, ...patch }]);
  };
  const deleteLetter = async (letter) => {
    for (const f of letter.files || []) await fileDelete(f.id);
    persist(casesRef.current.map((cs) => (cs.id !== letter.caseId ? cs : { ...cs, letters: cs.letters.filter((l) => l.id !== letter.id) })));
    setEditOpen(false);
    closeTab(letter.id);
  };
  const addLetterFiles = async (letter, list, kind) => {
    const meta = [];
    for (const f of Array.from(list)) {
      const id = "f" + Date.now() + Math.random().toString(36).slice(2, 7);
      await fileSave(id, f);
      meta.push({ id, name: f.name, type: f.type || guessType(f.name), size: f.size, kind: kind || "attachment" });
    }
    if (!meta.length) return;
    persist(casesRef.current.map((cs) => (cs.id !== letter.caseId ? cs : { ...cs, letters: cs.letters.map((l) => (l.id === letter.id ? { ...l, files: [...(l.files || []), ...meta] } : l)) })));
  };

  /* ---------- Antwort: bearbeiten, bestätigen (nur der Nutzer), PDF, E-Mail, Teilen ---------- */
  // Verlauf jeder Antwort: was die KI erzeugt hat, was geändert, bestätigt und wie es verwendet wurde
  const withLog = (l, entry) => [...(l.replyLog || []), { at: new Date().toISOString(), ...entry }].slice(-200);
  const logOnly = (entry) => updateLetter(activeLetter.caseId, activeLetter.id, { replyLog: withLog(activeLetter, entry) });
  const replyEdit = (text) => {
    const last = (activeLetter.replyLog || []).slice(-1)[0];
    const recent = last && last.a === "edited" && Date.now() - Date.parse(last.at) < 10 * 60000;   // Tippen zählt als eine Bearbeitung
    updateLetter(activeLetter.caseId, activeLetter.id, { reply: text, replyConfirmedAt: null, replyEdited: true, ...(recent ? {} : { replyLog: withLog(activeLetter, { a: "edited" }) }) });
  };
  const confirmReply = () => updateLetter(activeLetter.caseId, activeLetter.id, { replyConfirmedAt: new Date().toISOString(), replyLog: withLog(activeLetter, { a: "confirmed", text: activeLetter.reply }) });
  const replyPdf = () => {
    logOnly({ a: "pdf" });
    const ok = printDocument(`${activeLetter.subject} – Antwort`, `<pre>${escHtml(activeLetter.reply)}</pre>`);
    if (!ok) setNotice(t.popupBlocked);
  };
  const replyMail = () => {
    logOnly({ a: "mail" });
    const subject = "Re: " + activeLetter.subject + (activeLetter.caseNumber && activeLetter.caseNumber !== "—" ? " (" + activeLetter.caseNumber + ")" : "");
    const body = activeLetter.reply;
    if (encodeURIComponent(body).length > 1800) {
      navigator.clipboard?.writeText(body);
      setNotice(t.mailLong);
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}`;
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };
  const replyShare = async () => {
    logOnly({ a: "share" });
    try {
      if (navigator.share) await navigator.share({ title: activeLetter.subject, text: activeLetter.reply });
      else { navigator.clipboard?.writeText(activeLetter.reply); setNotice(t.copied); }
    } catch (e) {}
  };

  /* ---------- Bewertung von Übersetzung und Antwort ---------- */
  const rateLetter = (kind, fb) => {
    const l = activeLetter; if (!l) return;
    updateLetter(l.caseId, l.id, { feedback: { ...(l.feedback || {}), [kind]: { ...fb, at: new Date().toISOString() } } });
    // Nur mit Einwilligung und ohne Brieftext: Bewertung, Kommentar, Sprache, Modell
    if (FEEDBACK_ENDPOINT && prefs.fbShare) {
      fetch(FEEDBACK_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, v: fb.v, comment: fb.c || "", lang: kind === "translation" ? l.translationLang : "de", uiLang, model: AI_MODEL }) }).catch(() => {});
    }
  };

  /* ---------- Einführung beim ersten Start (je Profil) ---------- */
  const [obShow, setObShow] = useState(false);
  useEffect(() => {
    (async () => {
      if (await sGet(PK("briefe-app-onboarded"))) return;
      if (await sGet(PK("briefe-app-cases"))) { sSet(PK("briefe-app-onboarded"), "1"); return; }   // bestehende Nutzer nicht stören
      setObShow(true);
    })();
  }, []);
  const finishOnboarding = () => { setObShow(false); sSet(PK("briefe-app-onboarded"), "1"); };

  /* ---------- Ganzer Fall als PDF ---------- */
  const [casePdfFor, setCasePdfFor] = useState(null);
  const [casePdfBusy, setCasePdfBusy] = useState(false);
  const runCasePdf = async () => {
    const cs = visibleCases.find((x) => x.id === casePdfFor); if (!cs || casePdfBusy) return;
    setCasePdfBusy(true);
    try {
      const blob = await buildCasePdf(cs, { photos: prefs.casePdfPhotos, t, lang: uiLang });
      setExportReady({ blob, name: `Fall-${safeName(cs.name)}-${todayIso()}.pdf` });
      setCasePdfFor(null); setExportOpen({ caseIds: [cs.id] });
    } catch (e) { console.error("casepdf", e); setNotice(t.exportFail); }
    setCasePdfBusy(false);
  };

  /* ---------- Backup ---------- */
  const backupName = () => `briefe-backup-${localIso()}.json`;
  const backupToFile = async () => {
    if (cloud.encrypt && !cloudPass) return setNotice(t.needPass);
    setBackupBusy(true);
    try {
      let blob = backupAll && profileApi.profiles.length > 1 ? await buildBackupAll(profileApi, cases, prefs) : await buildBackup(cases, prefs); let name = backupName();
      if (cloud.encrypt) { blob = await encryptBlob(blob, cloudPass); name += ".enc"; }
      downloadBlob(blob, name);
      setNotice(t.backupDone);
    } catch (e) { console.error("backup", e); setNotice(t.backupBad); }
    setBackupBusy(false);
  };
  /* ---------- Export (lesbar, ohne App nutzbar) ---------- */
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [backupAll, setBackupAll] = useState(false);
  const [exportOpen, setExportOpen] = useState(null);         // { caseIds } oder null
  const [exportProgress, setExportProgress] = useState(null);
  const [exportReady, setExportReady] = useState(null);       // { blob, name }
  const openExport = (caseIds) => { setExportReady(null); setExportOpen({ caseIds: caseIds || null }); };
  const runExport = async (caseIds) => {
    if (exportProgress) return;
    const sel = visibleCases.filter((cs) => caseIds.includes(cs.id));
    const total = sel.reduce((n, cs) => n + cs.letters.length, 0);
    setExportProgress({ done: 0, total });
    try {
      const blob = await buildExportZip(sel, { format: prefs.exportFormat, originals: prefs.exportOriginals, t, lang: uiLang, onProgress: (d) => setExportProgress({ done: d, total }) });
      const name = sel.length === 1 ? `Export-${safeName(sel[0].name)}-${todayIso()}.zip` : `Briefe-Export-${todayIso()}.zip`;
      setExportReady({ blob, name });
    } catch (e) { console.error("export", e); setNotice(e.message === "toolarge" ? t.exportTooBig : t.exportFail); }
    setExportProgress(null);
  };
  // Herunterladen/Teilen erst nach Tippen auf den Knopf: Teilen klappt nur direkt nach einer Nutzeraktion
  const exportDownload = () => exportReady && downloadBlob(exportReady.blob, exportReady.name);
  const exportShare = async () => {
    if (!exportReady) return;
    const file = new File([exportReady.blob], exportReady.name, { type: exportReady.blob.type || "application/zip" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch (e) {} }
    else exportDownload();
  };
  const exportCloud = () => {
    if (!exportReady) return;
    const id = "ex" + Date.now(); memFiles.set(id, exportReady.blob);
    setExportOpen(null);
    setCloudModal({ tab: "export", files: [{ id, name: exportReady.name, type: exportReady.blob.type || "application/zip", size: exportReady.blob.size }] });
  };
  const backupToCloud = async () => {
    setBackupBusy(true);
    try {
      const blob = backupAll && profileApi.profiles.length > 1 ? await buildBackupAll(profileApi, cases, prefs) : await buildBackup(cases, prefs); const id = "bk" + Date.now();
      memFiles.set(id, blob);   // nur im Arbeitsspeicher; das Cloud-Fenster verschlüsselt bei Bedarf
      setBackupOpen(false);
      setCloudModal({ tab: "export", files: [{ id, name: backupName(), type: "application/json", size: blob.size }] });
    } catch (e) { setNotice(t.backupBad); }
    setBackupBusy(false);
  };
  const backupRestore = async (file) => {
    setBackupBusy(true);
    try {
      const bk = await readBackup(file, cloudPass);
      for (const [id, f] of Object.entries(bk.files || {})) { if (!(await fileGet(id))) await fileSave(id, base64ToBlob(f.data, f.type)); }
      let res;
      if (Array.isArray(bk.profiles)) {
        // Backup mit mehreren Profilen: jedes Profil in sein eigenes Profil zurückspielen (fehlende werden angelegt)
        res = { addedCases: 0, addedLetters: 0 };
        for (const bp of bk.profiles) {
          if (bp.id === profileApi.activeId) { const r = mergeBackup(casesRef.current, bp); persist(r.cases); res.addedCases += r.addedCases; res.addedLetters += r.addedLetters; continue; }
          profileApi.ensure(bp.id, bp.name || "");
          const r = mergeBackup(await profileApi.readCases(bp.id), bp);
          await profileApi.writeCases(bp.id, r.cases); res.addedCases += r.addedCases; res.addedLetters += r.addedLetters;
        }
      } else { res = mergeBackup(casesRef.current, bk); persist(res.cases); }
      setNotice(t.backupRestored.replace("{c}", res.addedCases).replace("{l}", res.addedLetters));
    } catch (e) { setNotice(e.message === "nopass" ? t.needPass : e.message === "format" || e instanceof SyntaxError ? t.backupBad : t.wrongPass); }
    setBackupBusy(false);
  };

  const doTranslate = async () => {
    if (!activeLetter) return;
    setBusy(true);
    try {
      const langLabel = LANGS.find((l) => l.code === targetLang)?.label || targetLang;
      const result = await aiTask("translate", { letterId: activeLetter.id, pages: activeLetter.pages || 1, text: activeLetter.original, lang: langLabel });
      updateLetter(activeLetter.caseId, activeLetter.id, { translation: result, translationLang: targetLang, translationCheck: null });
    } catch (e) { setNotice(t.aiFail); }
    setBusy(false);
  };

  const doReply = async () => {
    if (!activeLetter) return;
    setBusy(true);
    try {
      const result = await aiTask("reply", { letterId: activeLetter.id, pages: activeLetter.pages || 1, original: activeLetter.original, note: userNote, history: caseHistory(activeCase, activeLetter.id) });
      updateLetter(activeLetter.caseId, activeLetter.id, { reply: result, replyConfirmedAt: null, replyLog: withLog(activeLetter, { a: "generated", text: result }) });
    } catch (e) { setNotice(t.aiFail); }
    setBusy(false);
  };

  // Gegenprobe durch die KI (auf Wunsch): vergleicht Original und Übersetzung
  const doCheckTranslation = async () => {
    if (!activeLetter || !activeLetter.translation) return;
    setBusy(true);
    try {
      const code = activeLetter.translationLang || targetLang;
      const langLabel = LANGS.find((l) => l.code === code)?.label || code;
      const result = await aiTask("check", { letterId: activeLetter.id, pages: activeLetter.pages || 1, original: activeLetter.original, translation: activeLetter.translation, lang: langLabel });
      updateLetter(activeLetter.caseId, activeLetter.id, { translationCheck: { text: result, lang: code, at: new Date().toISOString() } });
    } catch (e) { setNotice(t.aiFail); }
    setBusy(false);
  };

  const doTranslateReply = async () => {
    if (!activeLetter || !activeLetter.reply) return;
    setBusy(true);
    try {
      const langLabel = LANGS.find((l) => l.code === replyLang)?.label || replyLang;
      const result = await aiTask("replyTranslate", { letterId: activeLetter.id, pages: activeLetter.pages || 1, text: activeLetter.reply, lang: langLabel });
      updateLetter(activeLetter.caseId, activeLetter.id, { replyTranslation: result, replyTranslationLang: replyLang, replyLog: withLog(activeLetter, { a: "translated", lang: replyLang }) });
    } catch (e) { setNotice(t.aiFail); }
    setBusy(false);
  };

  const copyText = (txt) => {
    navigator.clipboard?.writeText(txt);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    const n = new Date();   // Kalendertage in Ortszeit zählen (nicht UTC), sonst stimmt "heute" nachts nicht
    return Math.round((new Date(y, m - 1, d) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
  };

  // Fall-Ansicht: Briefe des geöffneten Falls (bei aktiver Suche nur Treffer), sortiert nach Nutzerwahl
  const openCase = !activeLetter ? visibleCases.find((cs) => cs.id === openCaseId) : null;
  const caseNameHit = openCase && searchTerms.some((tm) => openCase.name.toLowerCase().includes(tm));
  const caseLetters = openCase
    ? sortLetters(searchTerms.length && !caseNameHit ? openCase.letters.filter((l) => letterMatches(l, searchTerms)) : openCase.letters, prefs.letterSort.key, prefs.letterSort.dir)
    : [];

  // Fristen: alle Briefe mit Frist aus offenen Fällen, nach Datum; "bald" = überfällig oder in 7 Tagen
  const deadlineItems = allLetters
    .filter((l) => l.deadline && l.caseStatus !== "done" && (prefs.showDemo || !cases.find((cs) => cs.id === l.caseId)?.demo))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const soonCount = deadlineItems.filter((l) => daysUntil(l.deadline) <= 7).length;

  // Navigationstiefe: 0 Übersicht · 1 Fall · 2 Brief (+1 bei geöffnetem Menü auf dem Handy)
  const menuOver = ovl && sidebarOpen && sbFor === ovl;
  // Geöffnete Fenster/Dialoge (oberstes zuerst): Zurück schließt zuerst das Fenster
  const overlays = [
    [showHomeConfirm, () => setShowHomeConfirm(false)], [legalTab, () => setLegalTab(null)], [modal, () => setModal(null)],
    [casePdfFor, () => setCasePdfFor(null)], [exportOpen, () => setExportOpen(null)], [wipeOpen, () => setWipeOpen(false)],
    [lockOpen, () => setLockOpen(false)], [profilesOpen, () => setProfilesOpen(false)], [backupOpen, () => setBackupOpen(false)],
    [remindersOpen, () => setRemindersOpen(false)], [cloudModal, () => setCloudModal(null)], [authOpen, () => setAuthOpen(false)],
    [editOpen, () => setEditOpen(false)], [tileModal, () => setTileModal(false)], [intake && !progress, () => setIntake(null)],
    [showSettings, () => setShowSettings(false)],
  ].filter(([open]) => !!open);
  const navDepth = (activeLetter ? 2 : openCase ? 1 : 0) + (menuOver ? 1 : 0) + overlays.length;
  backRef.current = () => {
    if (overlays.length) overlays[0][1]();
    else if (menuOver) setSidebarOpen(false);
    else if (activeLetter) { setOpenCaseId(activeLetter.caseId); setActiveTab(null); }
    else if (openCase) setOpenCaseId(null);
  };
  useEffect(() => {
    const N = navRef.current; const prev = N.depth; N.depth = navDepth;
    try {
      if (navDepth > prev) { for (let i = prev; i < navDepth; i++) window.history.pushState({ briefe: i + 1 }, ""); }
      else if (navDepth < prev) {
        if (N.popPending) N.popPending = false;      // Verlauf wurde schon vom Gerät zurückgesetzt
        else { N.ignorePop += prev - navDepth; window.history.go(-(prev - navDepth)); }
      }
    } catch (e) { N.histOk = false; N.popPending = false; N.ignorePop = 0; }
  }, [navDepth]);

  /* ---------- Styles ---------- */
  const shellStyle = {
    display: "flex", height: isMobile ? "100dvh" : "100vh", background: c.bg, color: c.text,
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14 * fontScale,
    transition: "background .2s,color .2s", direction: isRTL ? "rtl" : "ltr",
  };

  return (
    <div style={shellStyle} dir={isRTL ? "rtl" : "ltr"}>
      <input type="file" ref={camInputRef} onChange={onInputChange} style={{ display: "none" }} accept="image/*" capture="environment" />
      <input type="file" ref={pickInputRef} onChange={onInputChange} style={{ display: "none" }} multiple />

      {/* ---------- Sidebar (Akkordeon, ein-/ausklappbar, erscheint auf der Leserichtungs-Startseite) ---------- */}
      {/* Auf Mobile: als Overlay mit abdunkelndem Hintergrund, schließt bei Klick daneben */}
      {sidebarOpen && ovl && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 40 }}
        />
      )}
      {sidebarOpen && (
        <aside
          onTouchStart={(e) => { sidebarTouch.current.startX = e.touches[0].clientX; }}
          onTouchMove={(e) => { sidebarTouch.current.deltaX = e.touches[0].clientX - sidebarTouch.current.startX; }}
          onTouchEnd={() => {
            const closeSwipe = isRTL ? sidebarTouch.current.deltaX > 60 : sidebarTouch.current.deltaX < -60;
            if (ovl && closeSwipe) setSidebarOpen(false);
            sidebarTouch.current = { startX: 0, deltaX: 0 };
          }}
          style={{
          width: ovl ? "82vw" : 250,
          maxWidth: ovl ? 300 : 250,
          borderRight: isRTL ? "none" : `1px solid ${c.border}`,
          borderLeft: isRTL ? `1px solid ${c.border}` : "none",
          background: c.surface,
          display: "flex", flexDirection: "column", flexShrink: 0,
          position: ovl ? "fixed" : "relative",
          top: 0, bottom: 0, left: ovl ? (isRTL ? "auto" : 0) : "auto", right: ovl ? (isRTL ? 0 : "auto") : "auto",
          zIndex: 41,
          boxShadow: ovl ? (isRTL ? "-4px 0 24px rgba(0,0,0,.25)" : "4px 0 24px rgba(0,0,0,.25)") : "none",
          transition: "transform .2s ease",
        }}>
          <div style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${c.border}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: c.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 * fontScale, letterSpacing: -0.3, flex: 1 }}>{t.appName}</span>
            {ovl && <X size={20} onClick={() => setSidebarOpen(false)} style={{ cursor: "pointer", color: c.textMuted }} />}
          </div>

          <div style={{ padding: 12, flex: 1, overflowY: "auto" }}>
            {/* Hauptpunkt: Fälle */}
            <MenuSection
              c={c} label={t.myCases} icon={Folder}
              open={menuOpen.cases}
              onToggle={() => setMenuOpen((m) => ({ ...m, cases: !m.cases }))}
            >
              <MenuItem c={c} active={statusFilter === "all"} label={t.allCases} onClick={() => { setStatusFilter("all"); setActiveTab(null); setOpenCaseId(null); }} count={visibleCases.length} />
              <MenuItem c={c} active={statusFilter === "open"} label={t.open} onClick={() => { setStatusFilter("open"); setActiveTab(null); setOpenCaseId(null); }} count={visibleCases.filter(x=>x.status==="open").length} />
              <MenuItem c={c} active={statusFilter === "done"} label={t.done} onClick={() => { setStatusFilter("done"); setActiveTab(null); setOpenCaseId(null); }} count={visibleCases.filter(x=>x.status==="done").length} />
            </MenuSection>

            {/* Hauptpunkt: Sortierung */}
            <MenuSection
              c={c} label={t.sortSection} icon={Hash}
              open={menuOpen.tools}
              onToggle={() => setMenuOpen((m) => ({ ...m, tools: !m.tools }))}
            >
              {[["date",t.sortDate],["name",t.sortName],["case",t.sortCase],["deadline",t.sortDeadline]].map(([k,l]) => (
                <MenuItem key={k} c={c} active={sortBy===k} label={l} onClick={() => setSortBy(k)} />
              ))}
            </MenuSection>

            {/* Hauptpunkt: Konto */}
            <MenuSection
              c={c} label={t.accountSection} icon={User}
              open={menuOpen.account}
              onToggle={() => setMenuOpen((m) => ({ ...m, account: !m.account }))}
            >
              <MenuItem c={c} label={`${profileLabel(profileApi.active, t)} · ${t.profileSwitch}`} icon={Users} onClick={() => { setProfilesOpen(true); if (ovl) setSidebarOpen(false); }} />
              {profileApi.active.lock && <MenuItem c={c} label={t.lockNow} icon={Lock} onClick={() => profileApi.lockNow()} />}
              <MenuItem c={c} label={t.settings} icon={Settings} onClick={() => setShowSettings(true)} />
              <MenuItem c={c} label={t.exportTitle} icon={FileText} onClick={() => { openExport(null); if (ovl) setSidebarOpen(false); }} />
              <MenuItem c={c} label={t.backup} icon={Download} onClick={() => { setBackupOpen(true); if (ovl) setSidebarOpen(false); }} />
              <MenuItem c={c} label={t.remindersTitle} icon={Bell} onClick={() => { setRemindersOpen(true); if (ovl) setSidebarOpen(false); }} />
              <MenuItem c={c} label={t.shopMenu} icon={Receipt} onClick={() => openModal({ type: "orders" })} />
              {flags.subscription && <MenuItem c={c} label={t.cancelMenu} icon={Ban} onClick={() => openModal({ type: "cancel" })} />}
              <MenuItem c={c} label={t.legalMenu} icon={Scale} onClick={() => { setLegalTab("impressum"); if (ovl) setSidebarOpen(false); }} />
              <MenuItem c={c} label={t.cloudsMenu} icon={Cloud} onClick={() => { setCloudModal({ tab: "conn", files: [] }); if (ovl) setSidebarOpen(false); }} />
              <MenuItem c={c} label={account ? t.accountTitle : t.signIn} icon={User} onClick={() => { setAuthOpen(true); if (ovl) setSidebarOpen(false); }} />
              {account && <MenuItem c={c} label={t.logout} icon={LogOut} onClick={async () => {
                if (SERVER_URL) { try { await srv("/auth/logout", {}); } catch (e) {} SESSION = null; await sDel(PK("briefe-app-session")); }
                setAccount(null);
              }} />}
            </MenuSection>
          </div>

          <div style={{ padding: 12, borderTop: `1px solid ${c.border}`, fontSize: 11 * fontScale, color: c.textMuted, lineHeight: 1.4 }}>
            {t.disclaimer}
            {/* Pflichtseiten: von jeder Ansicht in höchstens 2 Klicks erreichbar (Menü öffnen + Link) */}
            <div dir="ltr" style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 8 }}>
              {[["impressum", "Impressum"], ["datenschutz", "Datenschutz"], ["agb", "AGB"], ["widerruf", "Widerruf"]].map(([k, l]) => (
                <span key={k} onClick={() => { setLegalTab(k); if (ovl) setSidebarOpen(false); }} style={{ cursor: "pointer", textDecoration: "underline" }}>{l}</span>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* ---------- Hauptbereich ---------- */}
      <main ref={mainRef} style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          display: "flex", alignItems: "center", gap: isMobile ? 6 : 10,
          padding: isMobile ? "10px 12px" : "12px 20px", borderBottom: `1px solid ${c.border}`,
          flexWrap: "wrap", rowGap: 8,
        }}>
          {!navNew && <IconBtn c={c} icon={Menu} onClick={() => setSidebarOpen((s) => !s)} label={t.menu} />}
          {!navNew && <IconBtn c={c} icon={Home} onClick={goHome} label={t.home} />}
          <div style={{ position: "relative", flex: isMobile ? "1 1 0" : 1, minWidth: isMobile ? 70 : 0, maxWidth: isMobile ? "100%" : 420 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: c.textMuted }} />
            <input
              ref={searchRef}
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={isMobile ? t.search : t.search + "  " + t.searchHint}
              style={{
                width: "100%", padding: "9px 12px 9px 36px", borderRadius: 10,
                border: `1px solid ${c.border}`, background: c.bg, color: c.text, outline: "none",
                fontSize: 13 * fontScale, boxSizing: "border-box",
              }}
            />
          </div>
          {!isMobile && <div style={{ flex: 1 }} />}
          <IconBtn c={c} icon={Grid} active={view === "tiles"} onClick={() => setView("tiles")} label={t.tileView} />
          <IconBtn c={c} icon={List} active={view === "list"} onClick={() => setView("list")} label={t.listView} />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {!isMobile && <Languages size={16} color={c.textMuted} style={uiTranslating ? { animation: "spin 1s linear infinite" } : undefined} />}
            <LanguagePicker c={c} fontScale={fontScale} value={uiLang} onChange={setUiLang} options={LANGS} compact />
            {uiTranslating && <span style={{ fontSize: 10.5 * fontScale, color: c.textMuted }}>…</span>}
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          {!navNew && (
            <button
              onClick={() => setIntake((s) => s || { files: [], asPages: false })}
              title={t.upload}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", borderRadius: 10,
                background: c.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600,
                fontSize: 13 * fontScale,
              }}
            >
              <Upload size={15} /> {t.upload}
            </button>
          )}
          {/* Einstellungen: oben rechts */}
          <IconBtn c={c} icon={Settings} onClick={() => setShowSettings(true)} label={t.settings} />
        </div>

        {/* Widerrufsleiste: dauerhaft sichtbar, solange eine Widerrufsfrist läuft (§ 356a BGB) */}
        {withdrawable.length > 0 && (
          <div dir="ltr" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap",
            padding: "6px 14px", background: c.warnSoft, borderBottom: `1px solid ${c.border}`,
            fontSize: 12 * fontScale, color: c.warn,
          }}>
            <span>Widerrufsfrist läuft noch {withdrawDaysLeft} {withdrawDaysLeft === 1 ? "Tag" : "Tage"}</span>
            <button
              onClick={() => setModal(withdrawable.length === 1 ? { type: "withdraw", orderId: withdrawable[0].id } : { type: "orders" })}
              style={{ ...btnSmall(c), color: c.warn, borderColor: c.warn, fontWeight: 700 }}
            >
              Vertrag widerrufen
            </button>
          </div>
        )}

        {/* Fristen-Leiste: zeigt dauerhaft, was bald abläuft oder überfällig ist */}
        {soonCount > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap",
            padding: "6px 14px", background: c.warnSoft, borderBottom: `1px solid ${c.border}`, fontSize: 12 * fontScale, color: c.warn,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> {t.deadlinesStrip.replace("{n}", soonCount)}</span>
            <button onClick={() => setRemindersOpen(true)} style={{ ...btnSmall(c), color: c.warn, borderColor: c.warn, fontWeight: 700 }}>{t.showDeadlines}</button>
          </div>
        )}

        {/* Tabs für offene Briefe */}
        {openTabs.length > 0 && (
          <div style={{ display: "flex", gap: 4, padding: "8px 16px 0", borderBottom: `1px solid ${c.border}`, overflowX: "auto" }}>
            {openTabs.map((id) => {
              const l = allLetters.find((x) => x.id === id);
              if (!l) return null;
              const active = activeTab === id;
              return (
                <div
                  key={id} onClick={() => setActiveTab(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    borderRadius: "10px 10px 0 0", cursor: "pointer",
                    background: active ? c.bg : "transparent",
                    border: active ? `1px solid ${c.border}` : "1px solid transparent",
                    borderBottom: active ? `1px solid ${c.bg}` : "none",
                    marginBottom: -1, fontSize: 12.5 * fontScale, maxWidth: 200,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subject}</span>
                  <X size={13} onClick={(e) => { e.stopPropagation(); closeTab(id); }} />
                </div>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {activeLetter ? (
            <LetterDetail
              c={c} t={t} fontScale={fontScale} letter={activeLetter} caseObj={activeCase}
              targetLang={targetLang} setTargetLang={setTargetLang}
              busy={busy} onTranslate={() => gate(doTranslate)} onReply={() => gate(doReply)}
              userNote={userNote} setUserNote={setUserNote}
              copyText={copyText} saved={saved}
              daysUntil={daysUntil}
              isMobile={isMobile}
              replyLang={replyLang} setReplyLang={setReplyLang} onTranslateReply={doTranslateReply} onCheckTranslation={() => gate(doCheckTranslation)}
              isRTL={isRTL} fileActions={fileActions}
              onBackToCase={() => { setOpenCaseId(activeLetter.caseId); setActiveTab(null); }}
              onEdit={() => setEditOpen(true)}
              onReplyEdit={replyEdit} onConfirmReply={confirmReply}
              onPdf={replyPdf} onMail={replyMail} onShareReply={replyShare} onRate={rateLetter}
              uiLang={uiLang}
            />
          ) : openCase ? (
            <CaseView
              c={c} t={t} fontScale={fontScale} cs={openCase} translatedName={caseNameTranslations[openCase.id + ":" + uiLang]}
              letters={caseLetters} view={view} sort={prefs.letterSort} setSort={(s) => setPrefs({ letterSort: s })}
              fields={prefs.tileFields}
              onBack={() => setOpenCaseId(null)} onOpenLetter={openLetter}
              onCustomize={() => setTileModal(true)} onToggleStatus={() => toggleCaseStatus(openCase.id)}
              onAdd={() => setIntake((s) => s || { files: [], asPages: false })} onExport={() => openExport([openCase.id])} onCasePdf={() => setCasePdfFor(openCase.id)}
              daysUntil={daysUntil} uiLang={uiLang} isMobile={isMobile} isRTL={isRTL} searching={searchTerms.length > 0}
            />
          ) : (
            <>
              {view === "tiles" ? (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(140px,1fr))" : "repeat(auto-fill, minmax(220px,1fr))", gap: isMobile ? 10 : 16 }}>
                  {filteredCases.map((cs) => (
                    <CaseTile key={cs.id} c={c} t={t} fontScale={fontScale} cs={cs} onOpen={() => setOpenCaseId(cs.id)} onToggleStatus={() => toggleCaseStatus(cs.id)} daysUntil={daysUntil} translatedName={caseNameTranslations[cs.id + ":" + uiLang]} uiLang={uiLang} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredCases.map((cs) => (
                    <CaseRow key={cs.id} c={c} t={t} fontScale={fontScale} cs={cs} onOpen={() => setOpenCaseId(cs.id)} onToggleStatus={() => toggleCaseStatus(cs.id)} daysUntil={daysUntil} translatedName={caseNameTranslations[cs.id + ":" + uiLang]} uiLang={uiLang} />
                  ))}
                </div>
              )}
              {filteredCases.length === 0 && (
                <div style={{ textAlign: "center", padding: 60, color: c.textMuted }}>
                  {t.noCases}
                </div>
              )}
            </>
          )}
        </div>

        {/* Untere Leiste (Handy): höchstens 5 Tabs · Home links · Hinzufügen in der Mitte · Profil rechts */}
        {navNew && (
          <nav aria-label="Navigation" style={{
            display: "flex", alignItems: "stretch", flexShrink: 0, background: c.surface, borderTop: `1px solid ${c.border}`,
            paddingBottom: "env(safe-area-inset-bottom)", justifyContent: "center",
          }}>
            <div style={{ display: "flex", alignItems: "stretch", width: "100%", maxWidth: 560 }}>
            {(() => {
              const homeActive = !activeLetter && !openCase && !menuOver;
              const items = [
                { k: "home", icon: Home, label: t.tabHome, active: homeActive, onClick: () => { setSidebarOpen(false); goHome(); } },
                { k: "search", icon: Search, label: t.tabSearch, onClick: () => { setSidebarOpen(false); if (activeLetter || openCase) { setActiveTab(null); setOpenCaseId(null); } setTimeout(() => searchRef.current && searchRef.current.focus(), 50); } },
                { k: "add", icon: Plus, label: t.tabAdd, center: true, onClick: () => setIntake((s) => s || { files: [], asPages: false }) },
                { k: "deadlines", icon: Bell, label: t.tabDeadlines, badge: soonCount, onClick: () => setRemindersOpen(true) },
                { k: "profile", icon: User, label: t.tabProfile, active: menuOver, onClick: () => { setMenuOpen((m) => ({ ...m, account: true })); setSidebarOpen((s) => !s); } },
              ];
              return items.map((it) => {
                const Ico = it.icon;
                return (
                  <button key={it.k} onClick={it.onClick} aria-label={it.label} style={{
                    flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                    padding: "8px 2px 7px", background: "transparent", border: "none", cursor: "pointer",
                    color: it.active ? c.accent : c.textMuted, fontSize: 10.5 * fontScale, fontWeight: it.active ? 700 : 500, position: "relative",
                  }}>
                    {it.center ? (
                      <span style={{ width: 44, height: 26, borderRadius: 10, background: c.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico size={20} /></span>
                    ) : (
                      <span style={{ position: "relative", display: "flex" }}>
                        <Ico size={20} />
                        {it.badge > 0 && <span style={{ position: "absolute", top: -4, right: -8, minWidth: 15, height: 15, padding: "0 3px", boxSizing: "border-box", borderRadius: 8, background: c.warn, color: "#fff", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{it.badge}</span>}
                      </span>
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{it.label}</span>
                  </button>
                );
              });
            })()}
            </div>
          </nav>
        )}
      </main>

      {/* ---------- Settings-Panel ---------- */}
      {/* ---------- Bestätigung: ungesicherter Entwurf ---------- */}
      {showHomeConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 20 }}>
          <div style={{ background: c.surface, borderRadius: 14, padding: 20, maxWidth: 340, width: "100%", border: `1px solid ${c.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 15 * fontScale, marginBottom: 8, color: c.text }}>{t.unsavedTitle}</div>
            <div style={{ fontSize: 13 * fontScale, color: c.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
              {t.unsavedBody}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => setShowHomeConfirm(false)} style={{ ...btnSmall(c), justifyContent: "center", background: c.accent, color: "#fff", borderColor: c.accent }}>
                {t.keepWriting}
              </button>
              <button onClick={() => { setShowHomeConfirm(false); }} style={{ ...btnSmall(c), justifyContent: "center" }}>
                {t.stayHere}
              </button>
              <button onClick={() => { setUserNote(""); setShowHomeConfirm(false); setActiveTab(null); setOpenCaseId(null); }} style={{ ...btnSmall(c), justifyContent: "center", color: c.warn }}>
                {t.discardHome}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", justifyContent: "flex-end", zIndex: 50 }} onClick={() => setShowSettings(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 320, maxWidth: "100%", background: c.surface, height: "100%", padding: 20, borderLeft: `1px solid ${c.border}`, overflowY: "auto", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 * fontScale }}>{t.settings}</h3>
              <X size={18} style={{ cursor: "pointer" }} onClick={() => setShowSettings(false)} />
            </div>

            <SettingRow c={c} label={t.darkMode} fontScale={fontScale}>
              <ToggleSwitch c={c} on={dark} onClick={() => setDark((d) => !d)} />
            </SettingRow>

            <SettingRow c={c} label={t.fontSize} fontScale={fontScale}>
              <div style={{ display: "flex", gap: 6 }}>
                {[0.9, 1, 1.15, 1.3].map((s) => (
                  <button key={s} onClick={() => setFontScale(s)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: `1px solid ${c.border}`,
                      background: fontScale === s ? c.accent : c.bg, color: fontScale === s ? "#fff" : c.text,
                      cursor: "pointer", fontSize: 12,
                    }}>A</button>
                ))}
              </div>
            </SettingRow>

            <SettingRow c={c} label={t.layoutLabel} fontScale={fontScale}>
              <div style={{ display: "flex", gap: 6 }}>
                {[["new", t.layoutNew], ["classic", t.layoutClassic]].map(([k, l]) => (
                  <button key={k} onClick={() => setPrefs({ layout: k })}
                    style={{ ...btnSmall(c), background: (navNew ? "new" : "classic") === k ? c.accent : c.bg, color: (navNew ? "new" : "classic") === k ? "#fff" : c.text, borderColor: (navNew ? "new" : "classic") === k ? c.accent : c.border }}>{l}</button>
                ))}
              </div>
            </SettingRow>

            <SettingRow c={c} label={t.appLanguage} fontScale={fontScale}>
              <LanguagePicker c={c} fontScale={fontScale} value={uiLang} onChange={setUiLang} options={LANGS} compact />
            </SettingRow>

            <SettingRow c={c} label={t.tileSize} fontScale={fontScale}>
              <span style={{ fontSize: 12 * fontScale, color: c.textMuted }}>{t.tileSizeAuto}</span>
            </SettingRow>

            <SettingRow c={c} label={t.customizeTiles} fontScale={fontScale}>
              <button onClick={() => { setShowSettings(false); setTileModal(true); }} style={btnSmall(c)}><SlidersHorizontal size={13} /></button>
            </SettingRow>
            <SettingRow c={c} label={t.remindersTitle} fontScale={fontScale}>
              <button onClick={() => { setShowSettings(false); setRemindersOpen(true); }} style={btnSmall(c)}><Bell size={13} /></button>
            </SettingRow>
            <SettingRow c={c} label={t.profilesTitle} fontScale={fontScale}>
              <button onClick={() => { setShowSettings(false); setProfilesOpen(true); }} style={btnSmall(c)}><Users size={13} /></button>
            </SettingRow>
            <SettingRow c={c} label={t.lockTitle} fontScale={fontScale}>
              <button onClick={() => { setShowSettings(false); setLockOpen(true); }} style={btnSmall(c)}><Lock size={13} /> {profileApi.active.lock ? "✓" : ""}</button>
            </SettingRow>
            <SettingRow c={c} label={t.demoShow} fontScale={fontScale}>
              <ToggleSwitch c={c} on={prefs.showDemo} onClick={() => setPrefs({ showDemo: !prefs.showDemo })} />
            </SettingRow>
            {hasDemo && (
              <SettingRow c={c} label={t.demoRemove} fontScale={fontScale}>
                <button onClick={() => { persist(cases.filter((cs) => !cs.demo)); setOpenCaseId(null); setActiveTab(null); setOpenTabs([]); }} style={{ ...btnSmall(c), color: c.warn }}><Trash2 size={13} /></button>
              </SettingRow>
            )}

            <SettingRow c={c} label={t.obAgain} fontScale={fontScale}>
              <button onClick={() => { setShowSettings(false); setObShow(true); }} style={btnSmall(c)}><BookOpen size={13} /></button>
            </SettingRow>
            {FEEDBACK_ENDPOINT && (
              <div style={{ padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
                <CheckRow checked={prefs.fbShare} onChange={(v) => setPrefs({ fbShare: v })}>{t.fbShareLabel}</CheckRow>
              </div>
            )}
            <SettingRow c={c} label={t.wipeTitle} fontScale={fontScale}>
              <button onClick={() => { setShowSettings(false); setWipeOpen(true); }} style={{ ...btnSmall(c), color: c.warn }}><Trash2 size={13} /></button>
            </SettingRow>

            {/* Tracking-Einwilligung nachträglich änderbar (nur wenn Tracking aktiv ist) */}
            {flags.tracking && (
              <SettingRow c={c} label="Tracking-Einwilligung" fontScale={fontScale}>
                <button
                  onClick={() => setShop((s) => ({ ...s, consent: null }))}
                  style={btnSmall(c)}
                >
                  {shop.consent ? (shop.consent.status === "accepted" ? "erteilt" : "abgelehnt") : "offen"} · ändern
                </button>
              </SettingRow>
            )}

            {/* Newsletter (nur wenn Schalter aktiv): Double-Opt-In, nicht vorangehakt */}
            {flags.newsletter && (
              <NewsletterBlock
                c={c} fontScale={fontScale} list={shop.newsletter}
                onRequest={newsletterRequest}
                onConfirm={(id) => newsletterPatch(id, { status: "confirmed", confirmedAt: new Date().toISOString() })}
                onUnsubscribe={(id) => newsletterPatch(id, { status: "unsubscribed", unsubscribedAt: new Date().toISOString() })}
                openLegal={setLegalTab}
              />
            )}

            {/* Betreiber-Schalter: hier aktivierst du später, was du brauchst */}
            <div dir="ltr" style={{ marginTop: 22, paddingTop: 14, borderTop: `2px solid ${c.border}`, textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 13 * fontScale, marginBottom: 2 }}>Betreiber-Schalter</div>
              <div style={{ fontSize: 11.5 * fontScale, color: c.textMuted, marginBottom: 6 }}>Nur für dich als Entwickler. Bausteine sind fertig eingebaut und werden hier aktiviert.</div>
              {[
                ["paymentRequired", "Bezahlpflicht ab Brief 3"],
                ["subscription", "Abo-Modell (inkl. Kündigungsbutton)"],
                ["tracking", "Tracking / Consent-Banner"],
                ["newsletter", "Newsletter (Double-Opt-In)"],
                ["usSales", "Verkauf in die USA"],
              ].map(([k, label]) => (
                <SettingRow key={k} c={c} label={label} fontScale={fontScale}>
                  <ToggleSwitch c={c} on={!!flags[k]} onClick={() => setFlag(k, !flags[k])} />
                </SettingRow>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Shop / Recht: Dialoge ---------- */}
      {modal?.type === "checkout" && (
        <CheckoutModal
          c={c} fontScale={fontScale} flags={flags} item={modal.item}
          onClose={() => setModal(null)}
          onConfirm={confirmPurchase}
          onDone={() => { const then = modal.then; setModal(null); if (then) then(); }}
          openLegal={setLegalTab}
        />
      )}
      {modal?.type === "orders" && (
        <OrdersModal
          c={c} fontScale={fontScale} shop={shop} flags={flags}
          onClose={() => setModal(null)}
          onWithdraw={(id) => setModal({ type: "withdraw", orderId: id })}
          onSubscribe={() => setModal({ type: "checkout", item: { kind: "sub" }, then: null })}
          onCancel={() => setModal({ type: "cancel" })}
        />
      )}
      {modal?.type === "withdraw" && shop.orders.find((o) => o.id === modal.orderId) && (
        <WithdrawModal
          c={c} fontScale={fontScale} order={shop.orders.find((o) => o.id === modal.orderId)}
          onClose={() => setModal(null)} onConfirm={confirmWithdraw}
        />
      )}
      {modal?.type === "cancel" && (
        <CancelModal
          c={c} fontScale={fontScale}
          subs={shop.orders.filter((o) => o.kind === "sub" && o.status === "active")}
          onClose={() => setModal(null)} onConfirm={confirmCancel}
        />
      )}
      {tileModal && (
        <TileFieldsModal
          c={c} t={t} fontScale={fontScale} rtl={isRTL}
          fields={prefs.tileFields} setFields={(f) => setPrefs({ tileFields: f })}
          sampleLetter={openCase?.letters[0] || allLetters[0] || { id: "x", subject: "Aufforderung zur Vorlage von Unterlagen", sender: "Jobcenter", caseNumber: "BG 5123.0047", date: "2026-07-10", receivedDate: "2026-07-14", deadline: todayIso(), pages: 2, note: "", uploadedAt: new Date().toISOString() }}
          caseColor={openCase?.color || allLetters[0]?.caseColor || "#1E5B4F"} uiLang={uiLang} daysUntil={daysUntil}
          onClose={() => setTileModal(false)}
        />
      )}
      {editOpen && activeLetter && (
        <LetterEditModal c={c} t={t} fontScale={fontScale} rtl={isRTL} letter={activeLetter} cases={visibleCases.filter((cs) => !cs.demo || cs.id === activeLetter.caseId)} onSave={saveLetterEdit} onDelete={deleteLetter} onClose={() => setEditOpen(false)} />
      )}
      {remindersOpen && (
        <RemindersModal
          c={c} t={t} fontScale={fontScale} rtl={isRTL} items={deadlineItems}
          remind={prefs.remind} setRemind={(r) => setPrefs({ remind: r })}
          onOpenLetter={(id) => { setRemindersOpen(false); openLetter(id); }}
          uiLang={uiLang} daysUntil={daysUntil} onClose={() => setRemindersOpen(false)} notify={setNotice} pushState={pushState} calState={calState}
        />
      )}
      {casePdfFor && (
        <CasePdfModal c={c} t={t} fontScale={fontScale} rtl={isRTL} cs={visibleCases.find((x) => x.id === casePdfFor)}
          photos={prefs.casePdfPhotos} setPhotos={(v) => setPrefs({ casePdfPhotos: v })} busy={casePdfBusy} onBuild={runCasePdf} onClose={() => !casePdfBusy && setCasePdfFor(null)} />
      )}
      {obShow && <Onboarding c={c} t={t} fontScale={fontScale} rtl={isRTL} uiLang={uiLang} setUiLang={setUiLang} translating={uiTranslating} onDone={finishOnboarding} />}
      {profilesOpen && <ProfilesModal c={c} t={t} fontScale={fontScale} rtl={isRTL} api={profileApi} onClose={() => setProfilesOpen(false)} />}
      {lockOpen && (
        <LockSettingsModal c={c} t={t} fontScale={fontScale} rtl={isRTL} profile={profileApi.active}
          onSave={(lock) => profileApi.setLock(profileApi.activeId, lock)} notify={setNotice} onClose={() => setLockOpen(false)} />
      )}
      {wipeOpen && (
        <WipeModal c={c} t={t} fontScale={fontScale} rtl={isRTL} multi={profileApi.profiles.length > 1}
          onExport={() => { setWipeOpen(false); openExport(null); }}
          onWipeProfile={async () => { await profileApi.remove(profileApi.activeId); }}
          onWipeAll={async () => { await profileApi.wipeAll(); }}
          onClose={() => setWipeOpen(false)} />
      )}
      {exportOpen && (
        <ExportModal
          c={c} t={t} fontScale={fontScale} rtl={isRTL} cases={visibleCases} initialIds={exportOpen.caseIds}
          format={prefs.exportFormat} setFormat={(v) => setPrefs({ exportFormat: v })}
          originals={prefs.exportOriginals} setOriginals={(v) => setPrefs({ exportOriginals: v })}
          progress={exportProgress} ready={exportReady} onBuild={runExport}
          onDownload={exportDownload} onShare={exportShare} onCloud={exportCloud}
          onReset={() => setExportReady(null)} onClose={() => { setExportOpen(null); setExportReady(null); }}
        />
      )}
      {backupOpen && (
        <BackupModal
          c={c} t={t} fontScale={fontScale} rtl={isRTL} cloud={cloud} setCloud={setCloud} pass={cloudPass} setPass={setCloudPass}
          busy={backupBusy} onSave={backupToFile} onCloud={backupToCloud} onRestore={backupRestore} onClose={() => setBackupOpen(false)}
          multi={profileApi.profiles.length > 1} allProfiles={backupAll} setAllProfiles={setBackupAll}
        />
      )}
      {intake && (
        <IntakeModal
          c={c} t={t} fontScale={fontScale} rtl={isRTL}
          files={intake.files} asPages={intake.asPages}
          setAsPages={(v) => setIntake((s) => ({ ...s, asPages: v }))}
          onCamera={() => camInputRef.current?.click()}
          onPick={() => pickInputRef.current?.click()} onFiles={addToIntake}
          onCloud={() => setCloudModal({ tab: "import", files: [] })}
          onRemove={(i) => setIntake((s) => ({ ...s, files: s.files.filter((_, k) => k !== i) }))}
          onStart={startIntake} onClose={() => setIntake(null)} progress={progress}
        />
      )}
      {cloudModal && (
        <CloudModal
          key={(cloudModal.files || []).map((f) => f.id).join(",")}
          c={c} t={t} fontScale={fontScale} rtl={isRTL}
          tab={cloudModal.tab} setTab={(tab) => setCloudModal((m) => ({ ...m, tab }))}
          cloud={cloud} setCloud={setCloud} tokens={tokens} setTokens={setTokens}
          pass={cloudPass} setPass={setCloudPass}
          exportFiles={cloudModal.files || []} getBlob={(f) => fileGet(f.id)}
          onImported={(files) => { addToIntake(files); setCloudModal(null); }}
          onClose={() => setCloudModal(null)} notify={setNotice}
        />
      )}
      {assignQueue.length > 0 && (
        <AssignModal
          key={assignQueue[0].letter.id}
          c={c} t={t} fontScale={fontScale} rtl={isRTL}
          item={assignQueue[0]} cases={visibleCases.filter((cs) => !cs.demo)} left={assignQueue.length - 1} onChoose={resolveAssign}
        />
      )}
      {authOpen && (
        <AuthModal c={c} t={t} fontScale={fontScale} rtl={isRTL} account={account} setAccount={setAccount} onClose={() => setAuthOpen(false)} openLegal={setLegalTab} />
      )}
      {legalTab && (
        <LegalModal c={c} fontScale={fontScale} flags={flags} tab={legalTab} setTab={setLegalTab} onClose={() => setLegalTab(null)} />
      )}
      <NoticeToast c={c} fontScale={fontScale} text={notice} onClose={() => setNotice("")} />
      {flags.tracking && shop.consent === null && (
        <ConsentBanner
          c={c} fontScale={fontScale} openLegal={setLegalTab}
          onChoose={(status) => setShop((s) => ({ ...s, consent: { status, at: new Date().toISOString() } }))}
        />
      )}
    </div>
  );
}

/* ---------- Menü-Bausteine ---------- */
function MenuSection({ c, label, icon: Icon, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8,
          cursor: "pointer", fontWeight: 600, fontSize: 13, color: c.text,
        }}
      >
        <Icon size={15} color={c.accent} />
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        {open ? <ChevronDown size={14} color={c.textMuted} /> : <ChevronRight size={14} color={c.textMuted} />}
      </div>
      {open && <div style={{ paddingLeft: 22, display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>}
    </div>
  );
}

function MenuItem({ c, label, onClick, active, count, icon: Icon }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7,
        cursor: "pointer", fontSize: 12.5, color: active ? c.accent : c.textMuted,
        background: active ? c.accentSoft : "transparent", textAlign: "left",
      }}
    >
      {Icon && <Icon size={13} />}
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>}
    </div>
  );
}

function ToggleSwitch({ c, on, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 40, height: 22, borderRadius: 999, background: on ? c.accent : c.border,
      cursor: "pointer", position: "relative", transition: "background .15s",
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute",
        top: 3, left: on ? 21 : 3, transition: "left .15s",
      }} />
    </div>
  );
}

function SettingRow({ c, label, children, fontScale }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${c.border}`, fontSize: 13 * fontScale }}>
      <span>{label}</span>
      {children}
    </div>
  );
}

/* ---------- Kachel-Ansicht ---------- */
function CaseTile({ c, t, fontScale, cs, onOpen, onToggleStatus, daysUntil, translatedName, uiLang }) {
  const dl = caseDeadline(cs);
  const d = dl ? daysUntil(dl) : null;
  const urgent = d !== null && d <= 7 && d >= 0;
  return (
    <div style={{
      border: `1px solid ${c.border}`, borderRadius: 16, background: c.surface, overflow: "hidden",
      display: "flex", flexDirection: "column", cursor: "pointer",
      opacity: cs.status === "done" ? 0.6 : 1,
    }} onClick={onOpen}>
      <div style={{ height: 70, background: cs.color, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <Folder size={26} color="#fff" style={{ opacity: 0.9 }} />
        {urgent && (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 10.5, color: c.warn, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={11} /> {d}T
          </div>
        )}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13 * fontScale, marginBottom: 2, lineHeight: 1.3 }}>{cs.name}</div>
        {uiLang !== "de" && (
          <div style={{ fontSize: 11 * fontScale, color: c.accent, marginBottom: 4, lineHeight: 1.3 }}>{translatedName || "…"}</div>
        )}
        <div style={{ fontSize: 11.5 * fontScale, color: c.textMuted }}>{nLetters(cs.letters.length, t)}</div>
      </div>
      <div style={{ padding: "0 12px 12px", display: "flex", justifyContent: "flex-end" }}>
        <div onClick={(e) => { e.stopPropagation(); onToggleStatus(); }} style={{ cursor: "pointer", color: c.textMuted }}>
          {cs.status === "done" ? <FolderCheck size={15} /> : <Check size={15} style={{ opacity: 0.35 }} />}
        </div>
      </div>
    </div>
  );
}

function CaseRow({ c, t, fontScale, cs, onOpen, onToggleStatus, daysUntil, translatedName, uiLang }) {
  const dl = caseDeadline(cs);
  const d = dl ? daysUntil(dl) : null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
      border: `1px solid ${c.border}`, background: c.surface, cursor: "pointer",
      opacity: cs.status === "done" ? 0.6 : 1,
    }} onClick={onOpen}>
      <div style={{ width: 8, height: 34, borderRadius: 4, background: cs.color }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 * fontScale }}>
          {cs.name}{uiLang !== "de" && <span style={{ color: c.accent, fontWeight: 500 }}> · {translatedName || "…"}</span>}
        </div>
        <div style={{ fontSize: 11.5 * fontScale, color: c.textMuted }}>{caseNo(cs) || "—"} · {nLetters(cs.letters.length, t)}</div>
      </div>
      {d !== null && d >= 0 && (
        <div style={{ fontSize: 11.5 * fontScale, color: d <= 7 ? c.warn : c.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={13} /> {d} Tage
        </div>
      )}
      <div onClick={(e) => { e.stopPropagation(); onToggleStatus(); }} style={{ cursor: "pointer", color: c.textMuted }}>
        {cs.status === "done" ? <FolderCheck size={16} /> : <Check size={16} style={{ opacity: 0.35 }} />}
      </div>
    </div>
  );
}

/* ---------- Brief-Detailansicht ---------- */
function LetterDetail({ c, t, fontScale, letter, caseObj, onCheckTranslation, targetLang, setTargetLang, busy, onTranslate, onReply, userNote, setUserNote, copyText, saved, daysUntil, isMobile, replyLang, setReplyLang, onTranslateReply, isRTL, fileActions, onBackToCase, onEdit, onReplyEdit, onConfirmReply, onPdf, onMail, onShareReply, uiLang, onRate }) {
  const critical = criticalReasons(letter, daysUntil);
  const d = letter.deadline ? daysUntil(letter.deadline) : null;
  const confirmed = !!letter.replyConfirmedAt;
  const lockStyle = { ...btnSmall(c), opacity: confirmed ? 1 : 0.45, cursor: confirmed ? "pointer" : "not-allowed" };
  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* Kopfzeile */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div onClick={onBackToCase} style={{ fontSize: 11.5 * fontScale, color: c.accent, marginBottom: 4, cursor: "pointer", textDecoration: "underline" }}>{caseObj?.name}</div>
          <h2 style={{ margin: 0, fontSize: 19 * fontScale }}>{letter.subject}</h2>
          <button onClick={onEdit} style={{ ...btnSmall(c), marginTop: 8 }}><Pencil size={13} /> {t.edit}</button>
        </div>
        {letter.deadline && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
            background: d !== null && d <= 7 ? c.warnSoft : c.accentSoft, color: d !== null && d <= 7 ? c.warn : c.accent,
            fontSize: 12.5 * fontScale, fontWeight: 600,
          }}>
            {d !== null && d <= 7 ? <AlertTriangle size={15} /> : <Bell size={15} />}
            {t.deadline}: {letter.deadline} {d !== null && `(${d} Tage)`}
          </div>
        )}
      </div>

      {/* Metadaten */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20, fontSize: 12 * fontScale, color: c.textMuted }}>
        <Meta icon={User} label={letter.sender} />
        <Meta icon={Hash} label={letter.caseNumber} />
        <Meta icon={Calendar} label={"Brief: " + letter.date} />
        <Meta icon={Calendar} label={"Zugang: " + letter.receivedDate} />
        {letter.deadlineNote && !letter.deadline && <Meta icon={Clock} label={letter.deadlineNote} />}
        {letter.note && <Meta icon={FileText} label={letter.note} />}
      </div>

      {/* Originaldateien (liegen auf dem Gerät), Anhänge, Umschlagfoto */}
      <div style={{ marginBottom: 20 }}>
        <FilesPanel c={c} t={t} fontScale={fontScale} letter={letter} files={letter.files || []} actions={fileActions} />
      </div>

      {/* Original + Übersetzung: auf Mobile untereinander, sonst nebeneinander */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Panel c={c} title={t.original} fontScale={fontScale}>
        <pre style={preStyle(c, fontScale)} dir="ltr">{letter.original}</pre>
        </Panel>
        <Panel c={c} title={t.translation} fontScale={fontScale} actions={
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <LanguagePicker c={c} fontScale={fontScale} value={targetLang} onChange={setTargetLang} options={LANGS.filter(l=>l.code!=="de")} compact />
            <button onClick={onTranslate} disabled={busy} style={btnSmall(c)}>
              <Sparkles size={13} /> {t.translate}
            </button>
          </div>
        }>
          <pre style={preStyle(c, fontScale)} dir={RTL_LANGS.includes(letter.translationLang || targetLang) ? "rtl" : "ltr"}>{letter.translation || t.noAttachmentsYet}</pre>
          {letter.translation && <AiLabel c={c} t={t} fontScale={fontScale} text={t.aiLabelTranslation} />}
          {letter.translation && <TranslationCheck c={c} t={t} fontScale={fontScale} letter={letter} busy={busy} onAiCheck={onCheckTranslation} />}
          {letter.translation && <FeedbackBar key={letter.id + "tr"} c={c} t={t} fontScale={fontScale} value={letter.feedback?.translation} onRate={(fb) => onRate("translation", fb)} />}
        </Panel>
      </div>

      {/* Antwort-Generator */}
      <Panel c={c} title={t.reply} fontScale={fontScale}>
        <AutoTextarea
          c={c} fontScale={fontScale} value={userNote} onChange={setUserNote}
          placeholder={t.replyPlaceholder}
          minHeight={110}
          expandLabel={t.writeExpand} writeTitle={t.replyWriteTitle} doneLabel={t.doneWriting}
          dir={isRTL ? "rtl" : "ltr"}
        />
        {critical.length > 0 && <EscalationBox c={c} t={t} fontScale={fontScale} reasons={critical} />}
        <div style={{ marginTop: 10, marginBottom: 12 }}>
          <button onClick={onReply} disabled={busy} style={btnSmall(c)}>
            <Sparkles size={13} /> {busy ? "…" : t.generateReply}
          </button>
          <div style={{ fontSize: 11.5 * fontScale, color: c.textMuted, marginTop: 6, lineHeight: 1.45 }}>{t.replyLiability}</div>
        </div>
        {(letter.reply || letter.replyEdited) && (
          <>
            <AutoTextarea
              c={c} fontScale={fontScale} value={letter.reply} onChange={onReplyEdit}
              minHeight={140} expandLabel={t.writeExpand} writeTitle={t.replyWriteTitle} doneLabel={t.doneWriting} dir="ltr"
            />
            {letter.reply && <AiLabel c={c} t={t} fontScale={fontScale} text={t.aiLabelReply} />}
            {letter.reply && <FeedbackBar key={letter.id + "re"} c={c} t={t} fontScale={fontScale} value={letter.feedback?.reply} onRate={(fb) => onRate("reply", fb)} />}

            {/* Antwort in eigene Sprache übersetzen, um sie vor dem Absenden zu prüfen */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
              <span style={{ fontSize: 11.5 * fontScale, color: c.textMuted }}>{t.checkReplyIn}</span>
              <LanguagePicker c={c} fontScale={fontScale} value={replyLang} onChange={setReplyLang} options={LANGS.filter(l=>l.code!=="de")} compact langSearchLabel={t.langSearch} noLangFoundLabel={t.noLangFound} />
              <button onClick={onTranslateReply} disabled={busy} style={btnSmall(c)}>
                <Sparkles size={13} /> {t.translate}
              </button>
            </div>
            {letter.replyTranslation && (
              <pre style={{ ...preStyle(c, fontScale), marginTop: 10, padding: 10, background: c.accentSoft, borderRadius: 8 }} dir={RTL_LANGS.includes(letter.replyTranslationLang || replyLang) ? "rtl" : "ltr"}>{letter.replyTranslation}</pre>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button style={btnSmall(c)} onClick={() => copyText(letter.reply)}><Copy size={13} /> {saved ? t.copied : t.copy}</button>
              <button style={lockStyle} disabled={!confirmed} title={confirmed ? "" : t.confirmFirst} onClick={onPdf}><Download size={13} /> {t.exportPdf}</button>
              <button style={lockStyle} disabled={!confirmed} title={confirmed ? "" : t.confirmFirst} onClick={onMail}><Mail size={13} /> {t.sendEmail}</button>
              <button style={lockStyle} disabled={!confirmed} title={confirmed ? "" : t.confirmFirst} onClick={onShareReply}><Share2 size={13} /> {t.share}</button>
              {confirmed ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: c.accent, fontWeight: 600, fontSize: 12.5 * fontScale }}>
                  <Check size={14} /> {t.confirmedOn.replace("{d}", fmtD(letter.replyConfirmedAt.slice(0, 10), uiLang))}
                </span>
              ) : (
                <button onClick={onConfirmReply} style={{ ...btnSmall(c), background: c.accent, color: "#fff", borderColor: c.accent }}>
                  <Check size={13} /> {t.confirm}
                </button>
              )}
            </div>
            {!confirmed && <div style={{ fontSize: 11 * fontScale, color: c.textMuted, marginTop: 8 }}>{t.confirmFirst}</div>}
            <div style={{ fontSize: 11 * fontScale, color: c.textMuted, marginTop: 10 }}>
              {t.sendWarning}
            </div>
            <ReplyLog key={letter.id} c={c} t={t} fontScale={fontScale} log={letter.replyLog} uiLang={uiLang} />
          </>
        )}
      </Panel>
    </div>
  );
}

function Meta({ icon: Icon, label }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon size={13} /> {label}</div>;
}

function Panel({ c, title, children, actions, fontScale }) {
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, background: c.surface, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5 * fontScale, textTransform: "uppercase", letterSpacing: 0.4, color: c.textMuted }}>{title}</div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function preStyle(c, fontScale) {
  return {
    whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit", fontSize: 13 * fontScale,
    lineHeight: 1.55, color: c.text, maxHeight: 320, overflowY: "auto",
  };
}
function selectStyle(c) {
  return { padding: "6px 8px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 12 };
}

/* ---------- Durchsuchbare Sprachauswahl ---------- */
function LanguagePicker({ c, fontScale, value, onChange, options, compact, langSearchLabel = "Sprache suchen…", noLangFoundLabel = "Keine Sprache gefunden" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = options.find((l) => l.code === value);
  const filtered = options.filter((l) => l.label.toLowerCase().includes(q.toLowerCase()) || l.code.includes(q.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          ...selectStyle(c), display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          minWidth: compact ? 90 : 130, justifyContent: "space-between", fontSize: 12 * fontScale,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current?.label || value}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "110%", left: 0, zIndex: 60, width: 220,
          background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,.18)", overflow: "hidden",
        }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${c.border}` }}>
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={langSearchLabel}
              style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 12.5 * fontScale, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.map((l) => (
              <div
                key={l.code}
                onClick={() => { onChange(l.code); setOpen(false); setQ(""); }}
                style={{
                  padding: "8px 12px", cursor: "pointer", fontSize: 13 * fontScale,
                  background: l.code === value ? c.accentSoft : "transparent",
                  color: l.code === value ? c.accent : c.text,
                }}
              >
                {l.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: 12 * fontScale, color: c.textMuted }}>{noLangFoundLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Textfeld: wächst mit dem Inhalt, frei ziehbar, und per Klick auf Vollbild vergrößerbar ---------- */
function AutoTextarea({ c, fontScale, value, onChange, placeholder, minHeight = 120, expandLabel = "Groß schreiben", writeTitle = "Antwort schreiben", doneLabel = "Fertig", dir = "ltr" }) {
  const ref = useRef(null);
  const [manualHeight, setManualHeight] = useState(null); // wenn der User selbst per Ziehen vergrößert hat
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (ref.current && manualHeight === null) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.max(minHeight, ref.current.scrollHeight) + "px";
    }
  }, [value, minHeight, manualHeight]);

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onMouseUp={(e) => setManualHeight(e.target.style.height)}
        onTouchEnd={(e) => setManualHeight(e.target.style.height)}
        placeholder={placeholder}
        dir={dir}
        style={{
          width: "100%", minHeight, height: manualHeight || undefined,
          padding: dir === "rtl" ? "10px 10px 10px 40px" : "10px 40px 10px 10px",
          borderRadius: 8, border: `1px solid ${c.border}`,
          background: c.bg, color: c.text, fontSize: 13 * fontScale, resize: "vertical",
          fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5,
        }}
      />
      <button
        type="button"
        onClick={() => setFullscreen(true)}
        title={expandLabel}
        style={{
          position: "absolute", top: 8, left: dir === "rtl" ? 8 : "auto", right: dir === "rtl" ? "auto" : 8,
          width: 26, height: 26, borderRadius: 6,
          border: `1px solid ${c.border}`, background: c.surface, color: c.textMuted,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <Maximize2 size={13} />
      </button>

      {fullscreen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100,
          display: "flex", alignItems: "stretch", justifyContent: "stretch", padding: 16,
        }}>
          <div style={{
            background: c.surface, borderRadius: 14, width: "100%", height: "100%",
            display: "flex", flexDirection: "column", padding: 16, boxSizing: "border-box",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 * fontScale, color: c.text }}>{writeTitle}</span>
              <button
                type="button" onClick={() => setFullscreen(false)}
                style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${c.border}`, background: c.bg, color: c.text, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12.5 * fontScale }}
              >
                <Minimize2 size={13} /> {doneLabel}
              </button>
            </div>
            <textarea
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              dir={dir}
              style={{
                flex: 1, width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${c.border}`,
                background: c.bg, color: c.text, fontSize: 15 * fontScale, resize: "none",
                fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6, outline: "none",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
function btnSmall(c) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8,
    border: `1px solid ${c.border}`, background: c.surface, color: c.text, cursor: "pointer", fontSize: 12,
  };
}

/* =====================================================================
   SHOP / RECHT – Kauf, Widerruf, Kündigung, Rechtstexte, Consent, Newsletter
   Vertragsrelevante Texte bleiben bewusst immer auf Deutsch (Vertragssprache).
   ===================================================================== */

function ShopModal({ c, fontScale, title, onClose, children, maxWidth = 480, z = 95 }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: z, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
    >
      <div
        dir="ltr"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: c.surface, color: c.text, borderRadius: 14, border: `1px solid ${c.border}`,
          width: "100%", maxWidth, maxHeight: "92vh", overflowY: "auto", padding: 18,
          boxSizing: "border-box", fontSize: 13 * fontScale, textAlign: "left", lineHeight: 1.5,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 * fontScale }}>{title}</h3>
          <X size={18} style={{ cursor: "pointer", flexShrink: 0 }} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

function CheckRow({ checked, onChange, children }) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 10 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }} />
      <span>{children}</span>
    </label>
  );
}

function LinkBtn({ c, onClick, children }) {
  return (
    <span
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      style={{ color: c.accent, textDecoration: "underline", cursor: "pointer" }}
    >
      {children}
    </span>
  );
}

function btnPrimary(c, disabled) {
  return {
    ...btnSmall(c), width: "100%", justifyContent: "center", padding: "12px 14px", fontWeight: 700, fontSize: 13.5,
    background: disabled ? c.border : c.accent, color: disabled ? c.textMuted : "#fff",
    borderColor: disabled ? c.border : c.accent, cursor: disabled ? "not-allowed" : "pointer",
  };
}

function InfoBox({ c, children, tone }) {
  return (
    <div style={{
      background: tone === "warn" ? c.warnSoft : c.surfaceAlt, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: 10, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

const PAY_METHODS = [["paypal", "PayPal"], ["visa", "Visa"], ["mastercard", "Mastercard"], ["debit", "Debitkarte / Girocard"]];
const payLabel = (k) => (PAY_METHODS.find((m) => m[0] === k) || [])[1] || k;

/* ---------- Kauf (§ 312j BGB: Preis, Laufzeit, Verlängerung direkt über dem Kaufbutton) ---------- */
function CheckoutModal({ c, fontScale, flags, item, onClose, onConfirm, onDone, openLegal }) {
  const [method, setMethod] = useState("");
  const [waiver, setWaiver] = useState(false);
  const [terms, setTerms] = useState(false);
  const [order, setOrder] = useState(null);
  const isSub = item.kind === "sub";
  const pages = item.pages || 1;
  const extraPages = Math.max(0, pages - 10);
  const amount = isSub ? SUB_PLAN.price : priceForLetter(pages);
  const live = !!(SERVER_URL && SERVER_CFG?.payments);   // echte Zahlung über Stripe: Zahlungsart wählt man dort
  const ready = (live || !!method) && waiver && terms;
  const priceLine = isSub
    ? `Preis: ${fmtEUR(amount)} pro Monat (inkl. aller Steuern) · Erste Laufzeit: ${SUB_PLAN.termText} · ${SUB_PLAN.renewalText}`
    : `Preis: ${fmtEUR(amount)} (inkl. aller Steuern) · Einmalzahlung · Keine Laufzeit, keine automatische Verlängerung`;

  if (order) {
    return (
      <ShopModal c={c} fontScale={fontScale} title="Bestellung bestätigt" onClose={onDone}>
        <InfoBox c={c}>
          <div><b>Bestellnummer:</b> {order.id}</div>
          <div><b>Leistung:</b> {order.title}</div>
          <div><b>Betrag:</b> {fmtEUR(order.amount)}</div>
          <div><b>Zahlungsart:</b> {payLabel(order.method)}</div>
          <div><b>Zeitpunkt:</b> {fmtDateTime(order.createdAt)}</div>
        </InfoBox>
        <div style={{ color: c.textMuted, marginBottom: 12 }}>
          Demo-Modus: Es wurde nichts abgebucht. In der Live-Version erhalten Sie diese Bestätigung zusätzlich per E-Mail.
        </div>
        <button onClick={onDone} style={btnPrimary(c, false)}>Weiter</button>
      </ShopModal>
    );
  }

  return (
    <ShopModal c={c} fontScale={fontScale} title="Bestellübersicht" onClose={onClose}>
      <InfoBox c={c}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{isSub ? SUB_PLAN.name : "KI-Übersetzung und Antwortentwurf für 1 Brief"}</div>
        {!isSub && <div style={{ color: c.textMuted, marginBottom: 6 }}>{item.title} · {pages} Seite(n)</div>}
        {!isSub && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Grundpreis (bis 10 Seiten)</span><span>{fmtEUR(BASE_PRICE)}</span>
          </div>
        )}
        {!isSub && extraPages > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{extraPages} Zusatzseite(n) à {fmtEUR(EXTRA_PAGE_PRICE)}</span><span>{fmtEUR(round2(extraPages * EXTRA_PAGE_PRICE))}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${c.border}` }}>
          <span>Gesamtpreis (inkl. aller Steuern)</span><span>{fmtEUR(amount)}{isSub ? " / Monat" : ""}</span>
        </div>
      </InfoBox>

      {!live && <div style={{ fontWeight: 700, marginBottom: 6 }}>Zahlungsart</div>}
      {!live && PAY_METHODS.map(([k, label]) => (
        <label
          key={k}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 6, cursor: "pointer",
            border: `1px solid ${method === k ? c.accent : c.border}`, background: method === k ? c.accentSoft : "transparent",
          }}
        >
          <input type="radio" name="pay" checked={method === k} onChange={() => setMethod(k)} />
          <CreditCard size={15} /> {label}
        </label>
      ))}

      <div style={{ height: 8 }} />
      <CheckRow checked={waiver} onChange={setWaiver}>
        Ich stimme ausdrücklich zu, dass mit der Ausführung des Vertrags sofort begonnen wird. Mir ist bekannt, dass ich dadurch mein Widerrufsrecht verliere.
      </CheckRow>
      <CheckRow checked={terms} onChange={setTerms}>
        Ich habe die <LinkBtn c={c} onClick={() => openLegal("agb")}>AGB</LinkBtn>, die{" "}
        <LinkBtn c={c} onClick={() => openLegal("widerruf")}>Widerrufsbelehrung</LinkBtn> und die{" "}
        <LinkBtn c={c} onClick={() => openLegal("datenschutz")}>Datenschutzerklärung</LinkBtn> gelesen und akzeptiere die AGB.
      </CheckRow>

      {/* Preis, Laufzeit und Verlängerung stehen direkt über dem Kaufbutton */}
      <InfoBox c={c} tone="warn">{priceLine}</InfoBox>
      {live && <div style={{ color: c.textMuted, marginBottom: 8 }}>Die Zahlungsart (z. B. Karte, PayPal, SEPA – je nach Freischaltung) wählen Sie auf der folgenden sicheren Zahlungsseite unseres Zahlungsdienstleisters Stripe.</div>}
      <button disabled={!ready} onClick={async () => { const o = await onConfirm(item, method); if (o) setOrder(o); }} style={btnPrimary(c, !ready)}>
        {isSub ? "Jetzt kostenpflichtig abonnieren" : "zahlungspflichtig bestellen"}
      </button>
      {flags.usSales && (
        <div style={{ fontSize: 11.5 * fontScale, marginTop: 8 }}>
          Verlängerungsbedingungen: {isSub ? SUB_PLAN.renewalText : "Keine automatische Verlängerung."}
        </div>
      )}
      {!live && <div style={{ color: c.textMuted, fontSize: 11.5 * fontScale, marginTop: 8 }}>Demo-Modus: Es wird nichts abgebucht.</div>}
    </ShopModal>
  );
}

/* ---------- Käufe & Widerruf ---------- */
function OrdersModal({ c, fontScale, shop, flags, onClose, onWithdraw, onSubscribe, onCancel }) {
  const now = Date.now();
  const freeUsed = Object.values(shop.unlocked).filter((v) => v === "free").length;
  const hasActiveSub = shop.orders.some((o) => o.kind === "sub" && o.status === "active");
  const statusLabel = { active: "Aktiv", withdrawn: "Widerrufen", cancelled: "Gekündigt", processing: "Zahlung in Bearbeitung", failed: "Zahlung fehlgeschlagen", ended: "Beendet" };
  return (
    <ShopModal c={c} fontScale={fontScale} title="Käufe & Widerruf" onClose={onClose}>
      <InfoBox c={c}>Freie Briefe: {Math.min(freeUsed, FREE_LETTERS)} von {FREE_LETTERS} genutzt</InfoBox>

      {flags.subscription && !hasActiveSub && (
        <InfoBox c={c}>
          <div style={{ fontWeight: 700 }}>{SUB_PLAN.name}</div>
          <div style={{ marginBottom: 8 }}>{fmtEUR(SUB_PLAN.price)} pro Monat · {SUB_PLAN.renewalText}</div>
          <button onClick={onSubscribe} style={btnPrimary(c, false)}>Abo abschließen</button>
        </InfoBox>
      )}

      {shop.orders.length === 0 ? (
        <div style={{ color: c.textMuted }}>Noch keine Käufe.</div>
      ) : (
        shop.orders.map((o) => {
          const until = addDays(o.createdAt, WITHDRAWAL_DAYS);
          const canWithdraw = o.status === "active" && until.getTime() > now;
          return (
            <div key={o.id} style={{ border: `1px solid ${c.border}`, borderRadius: 10, padding: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b>{o.title}</b>
                <span style={{ color: c.textMuted, flexShrink: 0 }}>{statusLabel[o.status]}</span>
              </div>
              <div style={{ color: c.textMuted, fontSize: 12 * fontScale }}>
                {o.id} · {fmtDateTime(o.createdAt)} · {fmtEUR(o.amount)}{o.kind === "sub" ? " / Monat" : ""} · {payLabel(o.method)}
              </div>
              {canWithdraw && <div style={{ fontSize: 12 * fontScale, marginTop: 4 }}>Widerrufsfrist bis {fmtDate(until)}</div>}
              {o.status === "withdrawn" && (
                <div style={{ fontSize: 12 * fontScale, marginTop: 4 }}>Widerruf eingegangen am {fmtDateTime(o.withdrawnAt)} · Bestätigung {o.receiptId}</div>
              )}
              {o.status === "cancelled" && (
                <div style={{ fontSize: 12 * fontScale, marginTop: 4 }}>
                  Kündigung eingegangen am {fmtDateTime(o.cancelledAt)} · Vertragsende {fmtDate(o.endsAt)} · Bestätigung {o.receiptId}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {canWithdraw && (
                  <button onClick={() => onWithdraw(o.id)} style={{ ...btnSmall(c), color: c.warn, borderColor: c.warn, fontWeight: 700 }}>
                    Vertrag widerrufen
                  </button>
                )}
                {o.kind === "sub" && o.status === "active" && (
                  <button onClick={onCancel} style={btnSmall(c)}>Verträge hier kündigen</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </ShopModal>
  );
}

/* ---------- Widerruf (§ 356a BGB): Schritt 1 Button, Schritt 2 Bestätigungsfunktion, danach Eingangsbestätigung ---------- */
function WithdrawModal({ c, fontScale, order, onClose, onConfirm }) {
  const [step, setStep] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const summary = (
    <InfoBox c={c}>
      <div><b>Vertrag:</b> {order.title}</div>
      <div><b>Bestellnummer:</b> {order.id}</div>
      <div><b>Abgeschlossen am:</b> {fmtDateTime(order.createdAt)}</div>
      <div><b>Betrag:</b> {fmtEUR(order.amount)}</div>
    </InfoBox>
  );

  if (step === 3 && receipt) {
    return (
      <ShopModal c={c} fontScale={fontScale} title="Eingangsbestätigung" onClose={onClose}>
        <InfoBox c={c} tone="warn">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Ihr Widerruf ist bei uns eingegangen.</div>
          <div><b>Eingegangen am:</b> {fmtDateTime(receipt.at)}</div>
          <div><b>Bestätigungsnummer:</b> {receipt.receiptId}</div>
        </InfoBox>
        {summary}
        <div style={{ color: c.textMuted, marginBottom: 12 }}>
          In der Live-Version wird diese Bestätigung zusätzlich auf einem dauerhaften Datenträger (E-Mail) an Sie gesendet.
        </div>
        <button onClick={onClose} style={btnPrimary(c, false)}>Schließen</button>
      </ShopModal>
    );
  }

  return (
    <ShopModal c={c} fontScale={fontScale} title="Vertrag widerrufen" onClose={onClose}>
      {summary}
      {step === 1 ? (
        <>
          <div style={{ marginBottom: 12 }}>Sie können Ihr Widerrufsrecht hier online ausüben. Im nächsten Schritt bestätigen Sie Ihren Widerruf.</div>
          <button onClick={() => setStep(2)} style={btnPrimary(c, false)}>Weiter zur Bestätigung</button>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Bitte bestätigen Sie Ihren Widerruf.</div>
          <div style={{ color: c.textMuted, marginBottom: 12 }}>Mit „Jetzt widerrufen“ erklären Sie den Widerruf des oben genannten Vertrags.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(1)} style={{ ...btnSmall(c), padding: "12px 14px" }}>Zurück</button>
            <button
              onClick={async () => { const r = await onConfirm(order.id); if (r) { setReceipt(r); setStep(3); } }}
              style={{ ...btnPrimary(c, false), flex: 1, width: "auto", background: c.warn, borderColor: c.warn }}
            >
              Jetzt widerrufen
            </button>
          </div>
        </>
      )}
    </ShopModal>
  );
}

/* ---------- Kündigung (§ 312k BGB): Button, Bestätigungsseite, Bestätigung ---------- */
function CancelModal({ c, fontScale, subs, onClose, onConfirm }) {
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState(subs.length === 1 ? subs[0].id : null);
  const [done, setDone] = useState(null);
  const sub = subs.find((s) => s.id === picked);
  const prospective = new Date(); prospective.setMonth(prospective.getMonth() + 1);

  if (done) {
    return (
      <ShopModal c={c} fontScale={fontScale} title="Kündigung bestätigt" onClose={onClose}>
        <InfoBox c={c} tone="warn">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Ihre Kündigung ist bei uns eingegangen.</div>
          <div><b>Vertrag:</b> {done.sub.title} ({done.sub.id})</div>
          <div><b>Eingegangen am:</b> {fmtDateTime(done.at)}</div>
          <div><b>Vertragsende:</b> {fmtDate(done.endsAt)}</div>
          <div><b>Bestätigungsnummer:</b> {done.receiptId}</div>
        </InfoBox>
        <div style={{ color: c.textMuted, marginBottom: 12 }}>
          In der Live-Version erhalten Sie diese Bestätigung automatisch zusätzlich per E-Mail.
        </div>
        <button onClick={onClose} style={btnPrimary(c, false)}>Schließen</button>
      </ShopModal>
    );
  }

  if (subs.length === 0) {
    return (
      <ShopModal c={c} fontScale={fontScale} title="Verträge hier kündigen" onClose={onClose}>
        <div style={{ marginBottom: 12 }}>Es bestehen keine laufenden Verträge, die gekündigt werden können.</div>
        <button onClick={onClose} style={btnPrimary(c, false)}>Schließen</button>
      </ShopModal>
    );
  }

  return (
    <ShopModal c={c} fontScale={fontScale} title="Verträge hier kündigen" onClose={onClose}>
      {step === 1 ? (
        <>
          <div style={{ marginBottom: 8 }}>Welchen Vertrag möchten Sie kündigen?</div>
          {subs.map((s) => (
            <label
              key={s.id}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 6, cursor: "pointer",
                border: `1px solid ${picked === s.id ? c.accent : c.border}`, background: picked === s.id ? c.accentSoft : "transparent",
              }}
            >
              <input type="radio" name="sub" checked={picked === s.id} onChange={() => setPicked(s.id)} />
              <span>{s.title} · {s.id} · seit {fmtDate(s.createdAt)}</span>
            </label>
          ))}
          <div style={{ height: 8 }} />
          <button disabled={!picked} onClick={() => setStep(2)} style={btnPrimary(c, !picked)}>Weiter</button>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Bitte prüfen und bestätigen Sie Ihre Kündigung.</div>
          <InfoBox c={c}>
            <div><b>Vertrag:</b> {sub?.title}</div>
            <div><b>Bestellnummer:</b> {sub?.id}</div>
            <div><b>Art der Kündigung:</b> ordentliche Kündigung zum nächstmöglichen Zeitpunkt</div>
            <div><b>Vertragsende voraussichtlich:</b> {fmtDate(prospective)}</div>
          </InfoBox>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(1)} style={{ ...btnSmall(c), padding: "12px 14px" }}>Zurück</button>
            <button
              onClick={async () => { const res = await onConfirm(sub.id); if (res) setDone({ ...res, sub }); }}
              style={{ ...btnPrimary(c, false), flex: 1, width: "auto", background: c.warn, borderColor: c.warn }}
            >
              jetzt kündigen
            </button>
          </div>
        </>
      )}
    </ShopModal>
  );
}

/* ---------- Rechtstexte: immer Deutsch, Platzhalter in orange ---------- */
function LegalModal({ c, fontScale, flags, tab, setTab, onClose }) {
  const tabs = [["impressum", "Impressum"], ["datenschutz", "Datenschutz"], ["agb", "AGB"], ["widerruf", "Widerruf"]];
  const H = ({ children }) => <div style={{ fontWeight: 700, marginTop: 14, marginBottom: 4 }}>{children}</div>;
  const P = ({ children }) => <div style={{ marginBottom: 6 }}>{children}</div>;
  const Ph = ({ children }) => <span style={{ color: c.warn }}>{children}</span>;

  return (
    <ShopModal c={c} fontScale={fontScale} title="Rechtliches" onClose={onClose} maxWidth={560} z={96}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {tabs.map(([k, l]) => (
          <button
            key={k} onClick={() => setTab(k)}
            style={{ ...btnSmall(c), background: tab === k ? c.accent : c.surface, color: tab === k ? "#fff" : c.text, borderColor: tab === k ? c.accent : c.border }}
          >
            {l}
          </button>
        ))}
      </div>

      {LEGAL_DRAFT && (
        <InfoBox c={c} tone="warn">
          <b>Entwurf:</b> Angaben in orangen Klammern sind Platzhalter und müssen vor dem Livegang durch rechtlich geprüfte Texte ersetzt werden.
        </InfoBox>
      )}

      {tab === "impressum" && (
        <>
          <H>Angaben gemäß § 5 DDG</H>
          <P><Ph>{OPERATOR.name}</Ph><br /><Ph>{OPERATOR.street}</Ph><br /><Ph>{OPERATOR.city}</Ph></P>
          <H>Kontakt</H>
          <P>E-Mail: <Ph>{OPERATOR.email}</Ph><br />Telefon: <Ph>{OPERATOR.phone}</Ph></P>
          <H>Vertretung und Registereintrag</H>
          <P><Ph>[Nur bei Gesellschaft: Rechtsform, Vertretungsberechtigte, Registergericht und Registernummer]</Ph></P>
          <H>Umsatzsteuer-ID</H>
          <P><Ph>[USt-IdNr. nach § 27a UStG, falls vorhanden]</Ph></P>
          <H>Verbraucherstreitbeilegung</H>
          <P><Ph>[Hinweis zur Teilnahme oder Nichtteilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle]</Ph></P>
        </>
      )}

      {tab === "datenschutz" && (
        <>
          <H>Verantwortlicher</H>
          <P><Ph>{OPERATOR.name}</Ph>, <Ph>{OPERATOR.street}</Ph>, <Ph>{OPERATOR.city}</Ph>, E-Mail: <Ph>{OPERATOR.email}</Ph></P>
          <H>Welche Daten wir verarbeiten und wofür</H>
          <P>Kontodaten (Vorname, Nachname, Geburtsdatum, Adresse, E-Mail-Adresse, Benutzername) zur Bereitstellung Ihres Kontos (Art. 6 Abs. 1 lit. b DSGVO).</P>
          <P>Hochgeladene Briefe, Fotos und Anhänge sowie die daraus erzeugten Übersetzungen und Antwortentwürfe zur Erbringung der Leistung (Art. 6 Abs. 1 lit. b DSGVO). Briefe können besonders schützenswerte Daten enthalten, zum Beispiel Gesundheitsdaten. Diese verarbeiten wir nur auf Grundlage Ihrer ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO).</P>
          <P>Bestell- und Zahlungsdaten zur Vertragsabwicklung und zur Erfüllung gesetzlicher Aufbewahrungspflichten (Art. 6 Abs. 1 lit. b und c DSGVO).</P>
          <H>Empfänger und Dienstleister</H>
          <P>
            Hosting unseres Servers: <Ph>[Anbieter, Serverstandort in der EU]</Ph>. KI-gestützte Texterkennung, Übersetzung und Antwortentwurf: {SERVER_CFG?.aiProvider === "bedrock"
              ? <>Amazon Web Services EMEA SARL (Luxemburg) mit dem KI-Modell Claude von Anthropic über Amazon Bedrock; die Verarbeitung erfolgt in Rechenzentren in der EU <Ph>[mit AWS-Vertrag abgleichen]</Ph>.</>
              : <>Anthropic <Ph>[Vertragspartner und Serverstandort laut Vertrag eintragen; bei Verarbeitung in den USA: Rechtsgrundlage der Übermittlung angeben]</Ph>.</>}
            {" "}Briefinhalte werden dafür nur übertragen und nicht auf unserem Server gespeichert. Zahlungsabwicklung: Stripe Payments Europe, Ltd. (Irland); die Zahlungsdaten gibst du direkt bei Stripe ein, wir erhalten sie nicht.
            E-Mail-Versand (Anmeldelinks, Bestellbestätigungen, Newsletter): <Ph>[Anbieter]</Ph>. Cloud-Backup nur auf Ihre ausdrückliche Veranlassung: <Ph>[Anbieter]</Ph>.
            Mit allen Dienstleistern bestehen Auftragsverarbeitungsverträge nach Art. 28 DSGVO <Ph>[vor Livegang abschließen]</Ph>.
          </P>
          <H>Übermittlung in Drittländer</H>
          <P><Ph>[Falls zutreffend: Drittland, Rechtsgrundlage bzw. Garantien]</Ph></P>
          <H>Speicherdauer und Löschung</H>
          <P>Ihre Briefe und Fälle bleiben gespeichert, bis Sie sie löschen. Sie können in der App jederzeit alle Ihre Daten selbst vollständig löschen. Bestelldaten bewahren wir so lange auf, wie gesetzliche Aufbewahrungspflichten bestehen <Ph>[Fristen eintragen]</Ph>.</P>
          <H>Ihre Rechte</H>
          <P>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Erteilte Einwilligungen können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren <Ph>[zuständige Behörde eintragen]</Ph>.</P>
          <H>Dateiablage auf dem Gerät</H>
          <P>Fotos, PDFs und andere Dateien, die du hinzufügst, werden auf deinem Gerät gespeichert und nicht auf unseren Servern. Zum Auslesen (Texterkennung, Absender, Aktenzeichen, Fristen) wird der Inhalt an den KI-Dienst <Ph>[Anbieter, Serverstandort]</Ph> gesendet (Art. 6 Abs. 1 lit. b DSGVO; bei Gesundheitsdaten Art. 9 Abs. 2 lit. a DSGVO).</P>
          <H>Cloud-Anbindung (freiwillig)</H>
          <P>Du kannst Google Drive, Microsoft OneDrive und Dropbox mit der App verbinden, um Dateien zu holen oder zu sichern; iCloud nutzt du über das Teilen-Menü deines Geräts. Das ist standardmäßig ausgeschaltet. Rechtsgrundlage ist deine ausdrückliche Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit durch Trennen der Verbindung widerrufen kannst. Die Dateien gehen direkt von deinem Gerät in dein Konto beim jeweiligen Anbieter, nicht über unseren Server. Die Anbieter können Daten in Drittländer außerhalb der EU übertragen (z. B. USA); es gelten deren Datenschutzbestimmungen. Beim Verbinden wird ein Skript des Anbieters nachgeladen. Zugangsdaten für die Clouds werden nicht gespeichert und gelten nur für die laufende Sitzung. Vor dem Speichern in eine Cloud kannst du die Dateien mit einem eigenen Passwort verschlüsseln. <Ph>[Angaben zu Auftragsverarbeitung und Drittlandübermittlung vor Livegang prüfen]</Ph></P>
          <H>Unser Server: Konto, Erinnerungen, Bestellungen</H>
          <P>Auf unserem Server speichern wir nur: eine zufällige Gerätekennung für die Sitzung, deine E-Mail-Adresse bzw. Profil-Adresse (wenn du dich anmeldest), welche Briefe freigeschaltet sind (nur eine zufällige Brief-Kennung, kein Inhalt), Bestellungen sowie – nur wenn du sie einschaltest – Zeitpunkte für Push-Erinnerungen und dein Kalender-Abo. Über „Alle Daten löschen“ wird dein Konto auf dem Server gelöscht; Bestellungen bewahren wir ohne Kontobezug nur so lange auf, wie es gesetzlich vorgeschrieben ist.</P>
          <H>Anmeldung mit Universal Profile (LUKSO)</H>
          <P>Bei der Anmeldung mit einem Universal Profile signierst du eine Anmeldenachricht mit deiner Wallet-Erweiterung. Wir speichern die Adresse deines Universal Profile. Diese Adresse ist auf der Blockchain öffentlich einsehbar und kann Personen zugeordnet werden. Deine Briefe und Dateien werden nicht mit dieser Adresse veröffentlicht. Rechtsgrundlage: Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) bzw. Vertragserfüllung (lit. b). Die Signatur wird auf unserem Server <Ph>[Server eintragen]</Ph> geprüft. Optional kannst du eine E-Mail-Adresse verknüpfen (Fristerinnerungen, Kontowiederherstellung); die Verknüpfung wird erst nach Bestätigung per Link wirksam und kann jederzeit entfernt werden.</P>
          <H>Tracking und Analyse</H>
          {flags.tracking ? (
            <P>Mit Ihrer Einwilligung verwenden wir <Ph>[Dienste und Zwecke eintragen]</Ph>. Ohne Einwilligung werden keine Skripte geladen. Sie können Ihre Entscheidung jederzeit in den Einstellungen ändern.</P>
          ) : (
            <P>Die App setzt derzeit keine Tracking- oder Analysedienste ein. Es werden keine externen Schriftarten nachgeladen.</P>
          )}
          {flags.newsletter && (
            <>
              <H>Newsletter</H>
              <P>Wenn Sie den Newsletter bestellen, verwenden wir Ihre E-Mail-Adresse erst nach Bestätigung im Double-Opt-In-Verfahren (Art. 6 Abs. 1 lit. a DSGVO). Anmeldung, Bestätigung und Abmeldung werden protokolliert. Jede Mail enthält einen Abmeldelink.</P>
            </>
          )}
          <H>Datensicherheit</H>
          <P><Ph>[Beschreibung der technischen und organisatorischen Maßnahmen, unter anderem Verschlüsselung]</Ph></P>
        </>
      )}

      {tab === "agb" && (
        <>
          <H>Geltungsbereich und Vertragssprache</H>
          <P>Diese AGB gelten für die Nutzung der App durch Verbraucher. Vertragssprache ist Deutsch.</P>
          <H>Leistung</H>
          <P>Die App bietet KI-gestützte Texterkennung, Übersetzung, Ordnung von Behördenpost, Fristenerkennung und Entwürfe für Antwortschreiben. Die Ergebnisse können Fehler enthalten. Die App erbringt keine Rechtsdienstleistung im Sinne des Rechtsdienstleistungsgesetzes und ersetzt keine Rechtsberatung. Antwortentwürfe werden nie automatisch versendet; Sie prüfen jeden Entwurf und bestätigen den Versand selbst.</P>
          <H>Preise</H>
          <P>Die ersten {FREE_LETTERS} Briefe sind kostenlos; kostenlose Briefe dürfen höchstens 10 Seiten haben. Danach kostet jeder Brief bis 10 Seiten {fmtEUR(BASE_PRICE)}, jede weitere Seite {fmtEUR(EXTRA_PAGE_PRICE)}. Alle Preise sind Gesamtpreise einschließlich aller Steuern.</P>
          <H>Zahlung</H>
          <P>Zahlung per PayPal, Visa, Mastercard oder Debitkarte/Girocard. Der Betrag wird mit der Bestellung fällig.</P>
          {flags.subscription && (
            <>
              <H>Abonnement</H>
              <P>{SUB_PLAN.name}: {fmtEUR(SUB_PLAN.price)} pro Monat. Erste Laufzeit: {SUB_PLAN.termText}. {SUB_PLAN.renewalText} Sie können über die Schaltfläche „Verträge hier kündigen“ in der App kündigen.</P>
            </>
          )}
          <H>Widerruf</H>
          <P>Es gilt die Widerrufsbelehrung.</P>
          {flags.usSales && (
            <>
              <H>Mindestalter</H>
              <P>Die App ist nicht für Kinder unter 13 Jahren bestimmt.</P>
            </>
          )}
          <H>Haftung</H>
          <P>(1) Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei der Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz sowie im Umfang einer von uns übernommenen Garantie.</P>
          <P>(2) Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht ist unsere Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Wesentlich sind Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung Sie regelmäßig vertrauen dürfen.</P>
          <P>(3) Im Übrigen ist unsere Haftung für leichte Fahrlässigkeit ausgeschlossen.</P>
          <P>(4) Die App erbringt keine Rechtsberatung und ersetzt keinen Anwalt. Übersetzungen, erkannte Fristen und Antwortentwürfe werden automatisiert mit KI erstellt und können Fehler enthalten. Maßgeblich ist stets das deutsche Originalschreiben. Sie prüfen Fristen und Entwürfe selbst und entscheiden selbst, ob und was Sie absenden.</P>
          <P>(5) Die vorstehenden Regelungen gelten auch zugunsten unserer gesetzlichen Vertreter und Erfüllungsgehilfen.</P>
          <P><Ph>[Entwurf der Haftungsregelung – vor Verwendung anwaltlich prüfen lassen]</Ph></P>
          <H>Schlussbestimmungen</H>
          <P><Ph>[Anwendbares Recht, Gerichtsstand und salvatorische Klausel rechtlich prüfen lassen]</Ph></P>
        </>
      )}

      {tab === "widerruf" && (
        <>
          <H>Widerrufsrecht</H>
          <P><Ph>[Hier die gesetzliche Muster-Widerrufsbelehrung nach Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB in der aktuell gültigen Fassung einsetzen, einschließlich des Hinweises auf die Online-Widerrufsfunktion.]</Ph></P>
          <H>Online widerrufen</H>
          <P>In der App können Sie Ihren Vertrag über die Schaltfläche „Vertrag widerrufen“ widerrufen. Sie ist während der Widerrufsfrist dauerhaft sichtbar und außerdem im Menü unter „Käufe & Widerruf“ erreichbar. Nach dem Absenden erhalten Sie eine Eingangsbestätigung.</P>
          <H>Vorzeitiger Beginn der Ausführung</H>
          <P>Wenn Sie im Bestellvorgang ausdrücklich zugestimmt haben, dass wir sofort mit der Ausführung beginnen, und bestätigt haben, dass Sie dadurch Ihr Widerrufsrecht verlieren, richten sich die Rechtsfolgen nach § 356 BGB. <Ph>[Wortlaut rechtlich prüfen lassen]</Ph></P>
        </>
      )}
    </ShopModal>
  );
}

/* ---------- Consent-Banner (§ 25 TDDDG): "Ablehnen" gleich sichtbar wie "Akzeptieren" ---------- */
function ConsentBanner({ c, fontScale, onChoose, openLegal }) {
  const btn = { ...btnSmall(c), flex: 1, justifyContent: "center", padding: "11px 12px", fontWeight: 600, fontSize: 13, background: c.accent, color: "#fff", borderColor: c.accent };
  return (
    <div
      dir="ltr"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 97, background: c.surface, color: c.text,
        borderTop: `1px solid ${c.border}`, padding: 14, boxShadow: "0 -6px 24px rgba(0,0,0,.2)", textAlign: "left", fontSize: 12.5 * fontScale,
      }}
    >
      <div style={{ marginBottom: 10 }}>
        Wir möchten mit Ihrer Einwilligung <span style={{ color: c.warn }}>[Zweck eintragen]</span> nutzen. Bis zu Ihrer Entscheidung werden keine Skripte geladen.{" "}
        <LinkBtn c={c} onClick={() => openLegal("datenschutz")}>Datenschutzerklärung</LinkBtn>
      </div>
      {/* Hier gilt: Analyse-/Tracking-Skripte erst laden, wenn shop.consent.status === "accepted" */}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn} onClick={() => onChoose("declined")}>Ablehnen</button>
        <button style={btn} onClick={() => onChoose("accepted")}>Alle akzeptieren</button>
      </div>
    </div>
  );
}

/* ---------- Newsletter: nicht vorangehakt, Double-Opt-In, Protokoll (§ 7 UWG) ---------- */
function NewsletterBlock({ c, fontScale, list, onRequest, onConfirm, onUnsubscribe, openLegal }) {
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());
  const consentText = "Ich möchte den Newsletter per E-Mail erhalten und kann mich jederzeit abmelden.";
  const muted = { color: c.textMuted, fontSize: 11.5 * fontScale, marginTop: 6 };
  return (
    <div dir="ltr" style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${c.border}`, textAlign: "left", fontSize: 12.5 * fontScale }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Newsletter</div>
      <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail-Adresse"
        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, boxSizing: "border-box", marginBottom: 8 }}
      />
      <CheckRow checked={agree} onChange={setAgree}>
        {consentText} (<LinkBtn c={c} onClick={() => openLegal("datenschutz")}>Datenschutz</LinkBtn>)
      </CheckRow>
      <button
        disabled={!valid || !agree}
        onClick={() => { onRequest(email.trim(), consentText); setEmail(""); setAgree(false); }}
        style={btnPrimary(c, !valid || !agree)}
      >
        Anmelden
      </button>
      <div style={muted}>Double-Opt-In: Sie erhalten eine Bestätigungsmail und sind erst nach Klick auf den Link angemeldet.</div>

      {list.map((n) => (
        <div key={n.id} style={{ border: `1px solid ${c.border}`, borderRadius: 8, padding: 8, marginTop: 8 }}>
          <div>{n.email}</div>
          <div style={{ color: c.textMuted, fontSize: 11.5 * fontScale }}>
            {n.status === "pending" && "Bestätigung ausstehend"}
            {n.status === "confirmed" && `Bestätigt am ${fmtDateTime(n.confirmedAt)}`}
            {n.status === "unsubscribed" && `Abgemeldet am ${fmtDateTime(n.unsubscribedAt)}`}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {n.status === "pending" && !SERVER_URL && <button onClick={() => onConfirm(n.id)} style={btnSmall(c)}>Bestätigungslink öffnen (Demo)</button>}
            {n.status !== "unsubscribed" && <button onClick={() => onUnsubscribe(n.id)} style={btnSmall(c)}>Abmelden</button>}
          </div>
        </div>
      ))}
      <div style={muted}>Jede Newsletter-Mail enthält einen Abmeldelink und die Impressumsangaben.</div>
    </div>
  );
}

/* =====================================================================
   DATEIEN · AUSLESEN · ZUORDNUNG · CLOUDS · VERSCHLÜSSELUNG · UP-LOGIN
   ===================================================================== */

/* ---------- Betreiber-Konfiguration (nach Registrierung bei den Anbietern eintragen) ---------- */
const CLOUD_CONFIG = {
  gdrive: { clientId: "", apiKey: "" },   // Google Cloud Console: OAuth-Client (Web) + API-Key für den Picker
  onedrive: { clientId: "" },             // Microsoft Entra: App-Registrierung, Plattform "Single-page application"
  dropbox: { appKey: "" },                // Dropbox App Console (Zugriffsart je nach Wunsch "App folder" oder "Full Dropbox")
};
const SERVER_URL = "";                    // Dein Briefe-Server (Ordner briefe-server/), z. B. "https://api.deine-domain.de". Leer = Demo bzw. Claude-Umgebung
const FEEDBACK_ENDPOINT = SERVER_URL ? SERVER_URL + "/feedback" : "";   // anonyme Bewertungen (nur mit Zustimmung)
const PUSH_ENDPOINT = SERVER_URL;                 // Dein Push-Server (siehe push-server/): POST /subscribe, POST /unsubscribe. Leer = Push nicht eingerichtet
let PUSH_VAPID_KEY = "";  // wird bei eingerichtetem Server automatisch von dort übernommen                // Öffentlicher VAPID-Schlüssel des Push-Servers
const PUSH_SW_URL = "./sw.js";            // Service-Worker-Datei (liegt im selben Ordner wie die App)

const CLOUD_META = {
  gdrive: {
    label: "Google Drive", company: "Google Ireland Limited (Irland) / Google LLC (USA)",
    privacy: "https://policies.google.com/privacy",
    scope: "Zugriff nur auf Dateien, die du in der Auswahl markierst, und auf den Ordner „Briefe-App“, den diese App selbst anlegt.",
  },
  onedrive: {
    label: "Microsoft OneDrive", company: "Microsoft Ireland Operations Limited (Irland) / Microsoft Corporation (USA)",
    privacy: "https://privacy.microsoft.com/privacystatement",
    scope: "Lesezugriff auf deine OneDrive-Dateien (zum Auswählen) und ein eigener App-Ordner zum Speichern.",
  },
  dropbox: {
    label: "Dropbox", company: "Dropbox, Inc. (USA)",
    privacy: "https://www.dropbox.com/privacy",
    scope: "Zugriff auf Dateien in deinem Dropbox-Konto laut Freigabe-Bildschirm von Dropbox (Lesen und Schreiben).",
  },
  icloud: {
    label: "iCloud Drive (Apple)", company: "Apple Distribution International Ltd. (Irland) / Apple Inc. (USA)",
    privacy: "https://www.apple.com/legal/privacy/de-ww/",
    scope: "Apple bietet Web-Apps keine eigene Schnittstelle. Nutze das Teilen-Menü bzw. die Dateien-Auswahl deines Geräts.",
  },
};
const DIRECT_PROVIDERS = ["gdrive", "onedrive", "dropbox"];
const DEFAULT_CLOUD = { consent: {}, encrypt: true, auto: null };
const DEFAULT_ACCOUNT = null;

/* ---------- Dateiablage auf dem Gerät (IndexedDB, Fallback Arbeitsspeicher) ---------- */
const memFiles = new Map();
let fileDbPromise = null;
function fileDb() {
  if (fileDbPromise) return fileDbPromise;
  fileDbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open("briefe-app-files", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      try { navigator.storage?.persist?.(); } catch (e) {}
    } catch (e) { resolve(null); }
  });
  return fileDbPromise;
}
async function fileSave(id, blob) {
  const db = await fileDb();
  if (!db) { memFiles.set(id, blob); return "memory"; }
  return new Promise((res) => {
    try {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(blob, id);
      tx.oncomplete = () => res("device");
      tx.onerror = () => { memFiles.set(id, blob); res("memory"); };
    } catch (e) { memFiles.set(id, blob); res("memory"); }
  });
}
async function fileGet(id) {
  if (memFiles.has(id)) return memFiles.get(id);
  const db = await fileDb();
  if (!db) return null;
  return new Promise((res) => {
    try {
      const r = db.transaction("files").objectStore("files").get(id);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}

/* ---------- Datei-Helfer ---------- */
const fileExt = (n) => (String(n).split(".").pop() || "").toLowerCase();
const isImage = (f) => (f.type || "").startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(fileExt(f.name));
const isPdf = (f) => f.type === "application/pdf" || fileExt(f.name) === "pdf";
const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
const MIME_BY_EXT = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  txt: "text/plain", csv: "text/csv", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const guessType = (name) => MIME_BY_EXT[fileExt(name)] || "application/octet-stream";

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

// Große Fotos werden nur fürs Auslesen verkleinert; das gespeicherte Original bleibt unverändert.
async function imageForApi(file) {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.85));
    return { media_type: "image/jpeg", data: await blobToBase64(blob) };
  } catch (e) {
    const mt = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type) ? file.type : null;
    if (!mt) throw e;
    return { media_type: mt, data: await blobToBase64(file) };
  }
}

/* ---------- Word/Excel/Text lesen (minimaler ZIP-Leser, ohne externe Bibliothek) ---------- */
async function zipEntryText(buf, wanted) {
  const dv = new DataView(buf); const u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    if (name === wanted) {
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      const data = u8.subarray(start, start + csize);
      if (method === 0) return dec.decode(data);
      if (method === 8) {
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return dec.decode(await new Response(stream).arrayBuffer());
      }
      return null;
    }
    p += 46 + nlen + elen + clen;
  }
  return null;
}
const xmlText = (x) => x
  .replace(/<\/w:p>|<w:br\/>/g, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

async function officeText(file) {
  const ext = fileExt(file.name);
  try {
    if (ext === "docx") { const x = await zipEntryText(await file.arrayBuffer(), "word/document.xml"); return x ? xmlText(x).slice(0, 20000) : ""; }
    if (ext === "xlsx") { const s = await zipEntryText(await file.arrayBuffer(), "xl/sharedStrings.xml"); return s ? xmlText(s.replace(/<\/si>/g, "\n")).slice(0, 20000) : ""; }
    if (["txt", "csv", "md"].includes(ext) || (file.type || "").startsWith("text/")) return (await file.text()).slice(0, 20000);
  } catch (e) {}
  return "";
}

/* ---------- Brief auslesen (KI) ---------- */
async function askClaudeBlocks(content, maxTokens = 4000) {
  if (typeof window !== "undefined" && window.__briefeAI) return window.__briefeAI({ content, maxTokens });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, messages: [{ role: "user", content }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.type === "error") throw new Error("ai " + res.status);
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}
const EXTRACT_PROMPT = `Du liest ein Schreiben (Behörden- oder Firmenpost, meist Deutsch). Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, ohne Markdown und ohne Erklärung, mit genau diesen Feldern:
{"subject": "kurzer Betreff", "sender": "Absender (Organisation)", "caseNumber": "Aktenzeichen, Geschäftszeichen oder Kundennummer, sonst null", "letterDate": "YYYY-MM-DD oder null", "deadline": "YYYY-MM-DD, nur wenn ein Fristdatum ausdrücklich genannt ist, sonst null", "deadlineNote": "Frist nur als Zeitspanne (z. B. 'innerhalb von 14 Tagen nach Zugang'), sonst null", "pages": Seitenanzahl als Zahl, "text": "vollständige Texterkennung des Schreibens im Original, Absätze mit Zeilenumbruch"}
Erfinde nichts. Was nicht im Dokument steht, ist null.`;

function parseJsonLoose(raw) {
  const m = String(raw).replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}
async function extractLetter(files) {
  const content = []; let extraText = "";
  for (const f of files) {
    if (isImage(f)) {
      const im = await imageForApi(f);
      content.push({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } });
    } else if (isPdf(f)) {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: await blobToBase64(f) } });
    } else {
      const tx = await officeText(f);
      if (tx) extraText += `\n\n--- ${f.name} ---\n${tx}`;
    }
  }
  if (!content.length && !extraText) return null;
  for (let a = 0; a < 2; a++) {
    try { const j = parseJsonLoose(await aiTask("extract", { blocks: content, extraText })); if (j) return j; } catch (e) {}
  }
  return null;
}

function buildLetter(files, info, fileMeta) {
  const today = localIso();
  const okDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d : null);
  const clean = (v) => (v && String(v).toLowerCase() !== "null" ? String(v) : null);
  return {
    id: "l" + Date.now() + Math.random().toString(36).slice(2, 6),
    subject: clean(info?.subject) || files[0].name.replace(/\.[^.]+$/, ""),
    sender: clean(info?.sender) || "Unbekannt",
    caseNumber: clean(info?.caseNumber) || "—",
    date: okDate(info?.letterDate) || today,
    receivedDate: today,
    uploadedAt: new Date().toISOString(),
    deadline: okDate(info?.deadline),
    deadlineNote: clean(info?.deadlineNote),
    original: clean(info?.text) || "(Der Text konnte nicht gelesen werden. Das Original ist als Datei gespeichert.)",
    translation: "", reply: "", note: "",
    pages: Math.max(1, Number(info?.pages) || files.filter(isImage).length || 1),
    files: fileMeta,
    extracted: !!info,
  };
}

/* ---------- Automatische Zuordnung: sicher (Aktenzeichen) / unsicher (Absender → fragen) / neu ---------- */
const normNo = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, "");
const normSender = (s) => (s || "").toLowerCase()
  .replace(/\b(gmbh|ag|e\.?\s?v\.?|kg|mbh|ug|der|die|das|und)\b/g, " ")
  .replace(/[^a-zäöüß0-9]+/g, " ").trim();
function matchCase(cases, info) {
  const no = normNo(info?.caseNumber);
  if (no.length >= 4) {
    const hit = cases.find((cs) => cs.letters.some((l) => normNo(l.caseNumber) === no));
    if (hit) return { type: "sure", caseId: hit.id };
  }
  const sn = normSender(info?.sender);
  if (sn.length >= 3) {
    const cand = cases.filter((cs) => cs.letters.some((l) => {
      const o = normSender(l.sender);
      return o.length >= 3 && (o === sn || o.includes(sn) || sn.includes(o));
    }));
    if (cand.length) return { type: "ask", candidates: cand.map((x) => x.id) };
  }
  return { type: "new" };
}
const FALLBACK_COLORS = ["#1E5B4F", "#B5502A", "#3E5C8A", "#7A4E8C", "#8A6D1E", "#2F7D5B"];
const newCaseFor = (letter, index) => ({
  id: "c" + Date.now() + Math.random().toString(36).slice(2, 5),
  name: letter.sender && letter.sender !== "Unbekannt" ? `${letter.sender} – ${letter.subject}` : letter.subject,
  status: "open", color: FALLBACK_COLORS[index % FALLBACK_COLORS.length], letters: [letter],
});

/* ---------- Verschlüsselung (AES-GCM 256, Schlüssel per PBKDF2 aus Passwort) ---------- */
async function deriveKey(pass, salt) {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptBlob(blob, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await blob.arrayBuffer()));
  const out = new Uint8Array(32 + ct.length);
  out.set(new TextEncoder().encode("BAE1"), 0); out.set(salt, 4); out.set(iv, 20); out.set(ct, 32);
  return new Blob([out], { type: "application/octet-stream" });
}
async function decryptBlob(blob, pass, type) {
  const u = new Uint8Array(await blob.arrayBuffer());
  if (new TextDecoder().decode(u.subarray(0, 4)) !== "BAE1") throw new Error("format");
  const key = await deriveKey(pass, u.subarray(4, 20));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.subarray(20, 32) }, key, u.subarray(32));
  return new Blob([pt], { type: type || "application/octet-stream" });
}

/* ---------- Cloud-Anbindung (Anmeldung direkt im Browser des Nutzers, Daten gehen nicht über deinen Server) ---------- */
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}
const redirectUri = () => window.location.origin + window.location.pathname;
function oauthPopup(url, ru) {
  return new Promise((resolve, reject) => {
    const w = window.open(url, "cloud-login", "width=480,height=660");
    if (!w) return reject(new Error("popup"));
    const timer = setInterval(() => {
      try {
        if (w.closed) { clearInterval(timer); return reject(new Error("cancel")); }
        if (w.location.href.startsWith(ru)) { const u = new URL(w.location.href); clearInterval(timer); w.close(); resolve(u); }
      } catch (e) { /* noch auf der Seite des Anbieters */ }
    }, 400);
  });
}
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error("script"));
    document.head.appendChild(s);
  });
}
const dbxArg = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (ch) => "\\u" + ("0000" + ch.charCodeAt(0).toString(16)).slice(-4));

async function cloudConnect(provider) {
  const ru = redirectUri();
  if (provider === "dropbox") {
    const key = CLOUD_CONFIG.dropbox.appKey; if (!key) throw new Error("not-configured");
    const { verifier, challenge } = await pkcePair(); const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
    const url = `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(key)}&response_type=code&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(ru)}&state=${state}`;
    const res = await oauthPopup(url, ru);
    if (res.searchParams.get("state") !== state) throw new Error("state");
    const r = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: res.searchParams.get("code"), grant_type: "authorization_code", client_id: key, code_verifier: verifier, redirect_uri: ru }),
    });
    const j = await r.json(); if (!j.access_token) throw new Error("token"); return j.access_token;
  }
  if (provider === "onedrive") {
    const id = CLOUD_CONFIG.onedrive.clientId; if (!id) throw new Error("not-configured");
    const { verifier, challenge } = await pkcePair(); const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
    const scope = "Files.Read Files.ReadWrite.AppFolder";
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(id)}&response_type=code&redirect_uri=${encodeURIComponent(ru)}&response_mode=query&scope=${encodeURIComponent(scope)}&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`;
    const res = await oauthPopup(url, ru);
    if (res.searchParams.get("state") !== state) throw new Error("state");
    const r = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: id, scope, code: res.searchParams.get("code"), redirect_uri: ru, grant_type: "authorization_code", code_verifier: verifier }),
    });
    const j = await r.json(); if (!j.access_token) throw new Error("token"); return j.access_token;
  }
  if (provider === "gdrive") {
    const { clientId } = CLOUD_CONFIG.gdrive; if (!clientId) throw new Error("not-configured");
    await loadScript("https://accounts.google.com/gsi/client");
    return new Promise((res, rej) => {
      const tc = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: "https://www.googleapis.com/auth/drive.file",
        callback: (r) => (r.access_token ? res(r.access_token) : rej(new Error(r.error || "token"))),
        error_callback: (e) => rej(new Error(e?.type || "cancel")),
      });
      tc.requestAccessToken();
    });
  }
  throw new Error("unsupported");
}

async function cloudUpload(provider, token, name, blob) {
  const auth = { Authorization: "Bearer " + token };
  if (provider === "dropbox") {
    const r = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/octet-stream", "Dropbox-API-Arg": dbxArg({ path: "/Briefe-App/" + name, mode: "add", autorename: true }) },
      body: blob,
    });
    if (!r.ok) throw new Error("upload"); return;
  }
  if (provider === "gdrive") {
    const q = encodeURIComponent("name='Briefe-App' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    let folder = (await (await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, { headers: auth })).json()).files?.[0]?.id;
    if (!folder) {
      folder = (await (await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Briefe-App", mimeType: "application/vnd.google-apps.folder" }),
      })).json()).id;
    }
    const boundary = "b" + Math.random().toString(36).slice(2);
    const meta = JSON.stringify({ name, parents: folder ? [folder] : undefined });
    const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${blob.type || "application/octet-stream"}\r\n\r\n`, blob, `\r\n--${boundary}--`]);
    const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST", headers: { ...auth, "Content-Type": `multipart/related; boundary=${boundary}` }, body,
    });
    if (!r.ok) throw new Error("upload"); return;
  }
  if (provider === "onedrive") {
    const enc = encodeURIComponent(name);
    if (blob.size <= 4 * 1024 * 1024) {
      const r = await fetch(`https://graph.microsoft.com/v1.0/me/drive/special/approot:/${enc}:/content`, {
        method: "PUT", headers: { ...auth, "Content-Type": blob.type || "application/octet-stream" }, body: blob,
      });
      if (!r.ok) throw new Error("upload"); return;
    }
    const s = await fetch(`https://graph.microsoft.com/v1.0/me/drive/special/approot:/${enc}:/createUploadSession`, {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } }),
    });
    const sj = await s.json(); if (!sj.uploadUrl) throw new Error("upload");
    const r = await fetch(sj.uploadUrl, { method: "PUT", headers: { "Content-Range": `bytes 0-${blob.size - 1}/${blob.size}` }, body: blob });
    if (!r.ok) throw new Error("upload"); return;
  }
  throw new Error("unsupported");
}

async function cloudList(provider, token, folder) {
  const auth = { Authorization: "Bearer " + token };
  if (provider === "dropbox") {
    const r = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ path: folder || "", limit: 200 }),
    });
    const j = await r.json();
    return (j.entries || []).map((e) => ({ id: e.path_lower, name: e.name, folder: e[".tag"] === "folder", size: e.size || 0 }));
  }
  if (provider === "onedrive") {
    const u = folder ? `https://graph.microsoft.com/v1.0/me/drive/items/${folder}/children?$top=200` : "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=200";
    const j = await (await fetch(u, { headers: auth })).json();
    return (j.value || []).map((e) => ({ id: e.id, name: e.name, folder: !!e.folder, size: e.size || 0 }));
  }
  return [];
}
async function cloudDownload(provider, token, item) {
  const auth = { Authorization: "Bearer " + token };
  let r;
  if (provider === "dropbox") r = await fetch("https://content.dropboxapi.com/2/files/download", { method: "POST", headers: { ...auth, "Dropbox-API-Arg": dbxArg({ path: item.id }) } });
  else if (provider === "onedrive") r = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${item.id}/content`, { headers: auth });
  else if (provider === "gdrive") r = await fetch(`https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`, { headers: auth });
  if (!r || !r.ok) throw new Error("download");
  return await r.blob();
}
// Google: Auswahlfenster von Google – die App sieht nur die Dateien, die der Nutzer dort markiert.
async function gdrivePick(token) {
  const { apiKey } = CLOUD_CONFIG.gdrive; if (!apiKey) throw new Error("not-configured");
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise((res) => window.gapi.load("picker", res));
  return new Promise((res) => {
    const g = window.google.picker;
    new g.PickerBuilder()
      .addView(new g.DocsView().setIncludeFolders(true)).enableFeature(g.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(token).setDeveloperKey(apiKey)
      .setCallback((d) => {
        if (d.action === g.Action.PICKED) res(d.docs.map((x) => ({ id: x.id, name: x.name, size: x.sizeBytes ? Number(x.sizeBytes) : 0 })));
        else if (d.action === g.Action.CANCEL) res([]);
      }).build().setVisible(true);
  });
}

/* ---------- Anmeldung mit LUKSO Universal Profile (SIWE / EIP-4361, Prüfung per EIP-1271 auf dem Server) ---------- */
const toHexUtf8 = (s) => "0x" + Array.from(new TextEncoder().encode(s)).map((b) => b.toString(16).padStart(2, "0")).join("");
function upProvider() { return typeof window !== "undefined" ? (window.lukso || window.ethereum || null) : null; }
async function upLogin(link) {
  const prov = upProvider(); if (!prov) throw new Error("no-provider");
  const accounts = await prov.request({ method: "eth_requestAccounts" });
  const address = accounts?.[0]; if (!address) throw new Error("no-account");
  let chainId = 42;
  try { chainId = parseInt(await prov.request({ method: "eth_chainId" }), 16) || 42; } catch (e) {}
  let nonce = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (SERVER_URL) { try { nonce = (await srv("/auth/nonce")).nonce; } catch (e) { throw new Error("verify"); } }
  const message = `${location.host} wants you to sign in with your Ethereum account:\n${address}\n\nAnmeldung bei der Briefe-App\n\nURI: ${location.origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
  const signature = await prov.request({ method: "personal_sign", params: [toHexUtf8(message), address] });
  let verified = false; let email = null;
  if (SERVER_URL) {
    try { const r = await srv("/auth/verify", { message, signature, address, link: !!link }); verified = r.ok === true; email = r.email || null; }
    catch (e) { throw new Error(e.status === 409 ? "up-used" : "verify"); }
  }
  return { address, chainId, verified, email };
}
const shortAddr = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");

/* =====================================================================
   DIALOGE: Hinzufügen · Zuordnen · Originale · Clouds · Konto
   ===================================================================== */

function AppModal({ c, fontScale, title, onClose, children, maxWidth = 520, z = 95, rtl }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: z, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div
        dir={rtl ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}
        style={{
          background: c.surface, color: c.text, borderRadius: 14, border: `1px solid ${c.border}`, width: "100%", maxWidth,
          maxHeight: "92vh", overflowY: "auto", padding: 18, boxSizing: "border-box", fontSize: 13 * fontScale, lineHeight: 1.5,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 * fontScale }}>{title}</h3>
          <X size={18} style={{ cursor: "pointer", flexShrink: 0 }} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

function NoticeToast({ c, fontScale, text, onClose }) {
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(onClose, 7000);
    return () => clearTimeout(id);
  }, [text]);
  if (!text) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", left: 12, right: 12, bottom: 16, margin: "0 auto", maxWidth: 460, zIndex: 98, cursor: "pointer",
        background: c.text, color: c.bg, padding: "11px 14px", borderRadius: 12, fontSize: 13 * fontScale, boxShadow: "0 6px 24px rgba(0,0,0,.3)",
      }}
    >
      {text}
    </div>
  );
}

/* ---------- Briefe hinzufügen (Kamera / Dateien / Cloud) ---------- */
function IntakeModal({ c, t, fontScale, rtl, files, asPages, setAsPages, onCamera, onPick, onFiles, onCloud, onRemove, onStart, onClose, progress }) {
  // Das Datei-Feld liegt direkt unter dem Finger (nicht per Programm ausgelöst): so lassen es auch App-Ansichten zu
  const hiddenInput = { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" };
  const pick = (e) => { const fl = Array.from(e.target.files || []); e.target.value = ""; if (fl.length) onFiles(fl); };
  const busy = !!progress;
  const big = { ...btnSmall(c), flex: "1 1 140px", justifyContent: "center", padding: "12px 10px", opacity: busy ? 0.5 : 1 };
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.intakeTitle} onClose={busy ? () => {} : onClose}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ ...big, position: "relative", overflow: "hidden" }}>
          <Camera size={15} /> {files.length ? t.addPage : t.takePhoto}
          {!busy && <input type="file" accept="image/*" capture="environment" onChange={pick} style={hiddenInput} aria-label={t.takePhoto} />}
        </label>
        <label style={{ ...big, position: "relative", overflow: "hidden" }}>
          <Paperclip size={15} /> {t.chooseFiles}
          {!busy && <input type="file" multiple onChange={pick} style={hiddenInput} aria-label={t.chooseFiles} />}
        </label>
        <button disabled={busy} onClick={onCloud} style={big}><Cloud size={15} /> {t.fromCloud}</button>
      </div>
      {files.length === 0 ? (
        <div style={{ color: c.textMuted, marginBottom: 12 }}>{t.noFilesYet}</div>
      ) : (
        <div style={{ marginBottom: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", border: `1px solid ${c.border}`, borderRadius: 8, marginBottom: 6 }}>
              <FileText size={15} color={c.textMuted} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="ltr">{f.name}</span>
              <span style={{ color: c.textMuted, fontSize: 11.5 * fontScale, flexShrink: 0 }}>{fmtSize(f.size)}</span>
              {!busy && <X size={15} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => onRemove(i)} />}
            </div>
          ))}
        </div>
      )}
      {files.length > 1 && <CheckRow checked={asPages} onChange={setAsPages}>{t.pagesOfOne}</CheckRow>}
      <InfoBox c={c}>{t.intakeLocalNote}</InfoBox>
      <button disabled={busy || !files.length} onClick={onStart} style={btnPrimary(c, busy || !files.length)}>
        {busy
          ? t.intakeReading.replace("{n}", Math.min(progress.done + 1, progress.total)).replace("{total}", progress.total)
          : t.startIntake}
      </button>
    </AppModal>
  );
}

/* ---------- Nachfrage bei unsicherer Zuordnung ---------- */
function AssignModal({ c, t, fontScale, rtl, item, cases, left, onChoose }) {
  const [choice, setChoice] = useState("");
  const l = item.letter;
  const cand = cases.filter((cs) => item.candidates.includes(cs.id));
  const others = cases.filter((cs) => !item.candidates.includes(cs.id));
  const newName = l.sender && l.sender !== "Unbekannt" ? `${l.sender} – ${l.subject}` : l.subject;
  const Radio = ({ value, children }) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: `1px solid ${choice === value ? c.accent : c.border}`, background: choice === value ? c.accentSoft : "transparent" }}>
      <input type="radio" name="assign" checked={choice === value} onChange={() => setChoice(value)} />
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
    </label>
  );
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.assignTitle} onClose={() => {}} z={96}>
      <InfoBox c={c}>
        <div style={{ fontWeight: 700 }}>{l.subject}</div>
        <div style={{ color: c.textMuted, fontSize: 12 * fontScale }} dir="ltr">{l.sender} · {l.caseNumber} · {l.date}</div>
        {left > 0 && <div style={{ color: c.textMuted, fontSize: 11.5 * fontScale, marginTop: 4 }}>+ {left}</div>}
      </InfoBox>
      {cand.length > 0 && <div style={{ color: c.textMuted, marginBottom: 8 }}>{t.assignWhySender}</div>}
      {cand.map((cs) => <Radio key={cs.id} value={cs.id}>{cs.name}</Radio>)}
      <Radio value="new">{t.assignNew}: <span style={{ color: c.textMuted }}>{newName}</span></Radio>
      {others.length > 0 && (
        <div style={{ margin: "8px 0 12px" }}>
          <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginBottom: 4 }}>{t.assignOther}</div>
          <select
            value={others.some((o) => o.id === choice) ? choice : ""}
            onChange={(e) => e.target.value && setChoice(e.target.value)}
            style={{ width: "100%", padding: 9, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text }}
          >
            <option value="">—</option>
            {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}
      <button disabled={!choice} onClick={() => onChoose(choice)} style={btnPrimary(c, !choice)}>{t.assignDo}</button>
    </AppModal>
  );
}

/* ---------- Originaldateien eines Briefs ---------- */
function FilesPanel({ c, t, fontScale, letter, files, actions }) {
  const [prev, setPrev] = useState(null);
  const attRef = useRef(null);
  const envRef = useRef(null);
  useEffect(() => () => { if (prev?.url) URL.revokeObjectURL(prev.url); }, [prev]);
  const view = async (f) => {
    const blob = await actions.get(f);
    if (!blob) return actions.notify(t.noticeMissing);
    setPrev({ url: URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: f.type })), f });
  };
  return (
    <Panel c={c} title={t.filesTitle} fontScale={fontScale} actions={
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input ref={attRef} type="file" multiple style={{ display: "none" }} onChange={(e) => { actions.add(letter, Array.from(e.target.files || []), "attachment"); e.target.value = ""; }} />
        <input ref={envRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { actions.add(letter, Array.from(e.target.files || []), "envelope"); e.target.value = ""; }} />
        <button style={btnSmall(c)} onClick={() => attRef.current?.click()}><Paperclip size={13} /> {t.addAttachment}</button>
        <button style={btnSmall(c)} onClick={() => envRef.current?.click()}><Camera size={13} /> {t.addEnvelope}</button>
      </div>
    }>
      {files.length === 0 && <div style={{ color: c.textMuted }}>—</div>}
      {files.map((f) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <FileText size={15} color={c.textMuted} />
          <span style={{ flex: "1 1 160px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="ltr">{f.name}</span>
          {f.kind === "envelope" && <span style={{ background: c.accentSoft, color: c.accent, borderRadius: 999, padding: "1px 8px", fontSize: 11 * fontScale }}>{t.envelope}</span>}
          <span style={{ color: c.textMuted, fontSize: 11.5 * fontScale }}>{fmtSize(f.size)}</span>
          <button style={btnSmall(c)} onClick={() => view(f)}>{t.view}</button>
          <button style={btnSmall(c)} onClick={() => actions.download(f)}><Download size={13} /> {t.download}</button>
          {typeof navigator !== "undefined" && navigator.share && <button style={btnSmall(c)} onClick={() => actions.share(f)}><Share2 size={13} /> {t.shareFile}</button>}
          <button style={btnSmall(c)} onClick={() => actions.cloud(f)}><Cloud size={13} /> {t.toCloud}</button>
        </div>
      ))}
      {prev && (
        <div style={{ marginTop: 8 }}>
          {isImage(prev.f) ? (
            <img src={prev.url} alt={prev.f.name} style={{ maxWidth: "100%", borderRadius: 8, border: `1px solid ${c.border}` }} />
          ) : isPdf(prev.f) ? (
            <iframe title={prev.f.name} src={prev.url} style={{ width: "100%", height: 480, border: `1px solid ${c.border}`, borderRadius: 8 }} />
          ) : null}
          <div style={{ marginTop: 6 }}>
            <a href={prev.url} target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>{t.openNewTab}</a>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ---------- Dateien & Clouds ---------- */
function CloudModal({ c, t, fontScale, rtl, tab, setTab, cloud, setCloud, tokens, setTokens, pass, setPass, exportFiles, onImported, onClose, notify, getBlob }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState(null);
  const [browse, setBrowse] = useState(null);
  const [sel, setSel] = useState(() => Object.fromEntries(exportFiles.map((f) => [f.id, true])));
  const errText = (e) => ({
    "not-configured": "Diese Anbindung ist vom Betreiber noch nicht eingerichtet.",
    popup: "Das Anmelde-Fenster wurde blockiert. Bitte Pop-ups erlauben.",
    cancel: "Abgebrochen.", token: "Die Anmeldung beim Anbieter ist fehlgeschlagen.",
    upload: "Hochladen fehlgeschlagen.", download: "Herunterladen fehlgeschlagen.",
  })[e?.message] || "Das hat nicht geklappt. Bitte erneut versuchen.";
  const noPass = "Bitte zuerst ein Passwort für die Verschlüsselung eingeben (unter „Verbindungen“) oder die Verschlüsselung ausschalten.";

  const doConnect = async (p) => {
    setErr(""); setBusy(p);
    try {
      const tok = await cloudConnect(p);
      setTokens((x) => ({ ...x, [p]: tok }));
      setCloud((cl) => ({ ...cl, consent: { ...cl.consent, [p]: cl.consent[p] || { at: new Date().toISOString() } } }));
      setDraft(null);
    } catch (e) { setErr(errText(e)); }
    setBusy("");
  };
  const doDisconnect = (p) => {
    setTokens((x) => { const n = { ...x }; delete n[p]; return n; });
    setCloud((cl) => { const consent = { ...cl.consent }; delete consent[p]; return { ...cl, consent, auto: cl.auto === p ? null : cl.auto }; });
    setBrowse(null);
  };

  const chosen = exportFiles.filter((f) => sel[f.id]);
  const prepare = async (f) => {
    const blob = await getBlob(f);
    if (!blob) throw new Error("missing");
    if (cloud.encrypt) { if (!pass) throw new Error("nopass"); return { name: f.name + ".enc", blob: await encryptBlob(blob, pass) }; }
    return { name: f.name, blob: blob.type ? blob : new Blob([blob], { type: f.type }) };
  };
  const exportTo = async (p) => {
    setErr(""); setBusy(p); let ok = 0;
    try {
      for (const f of chosen) { const { name, blob } = await prepare(f); await cloudUpload(p, tokens[p], name, blob); ok++; }
      notify(t.noticeSaved.replace("{n}", ok).replace("{name}", CLOUD_META[p].label));
    } catch (e) { setErr(e.message === "nopass" ? noPass : errText(e)); }
    setBusy("");
  };
  const exportSystem = async () => {
    setErr("");
    try {
      const prepared = [];
      for (const f of chosen) { const { name, blob } = await prepare(f); prepared.push(new File([blob], name, { type: blob.type })); }
      if (navigator.canShare?.({ files: prepared })) await navigator.share({ files: prepared });
      else prepared.forEach((f) => { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
    } catch (e) { if (e.name !== "AbortError") setErr(e.message === "nopass" ? noPass : errText(e)); }
  };

  const finishImport = async (blobs) => {
    const out = [];
    for (const { name, blob } of blobs) {
      if (name.toLowerCase().endsWith(".enc")) {
        if (!pass) { setErr("Verschlüsselte Datei: bitte unter „Verbindungen“ das Passwort eingeben."); return; }
        const real = name.slice(0, -4);
        try { out.push(new File([await decryptBlob(blob, pass, guessType(real))], real, { type: guessType(real) })); }
        catch (e) { setErr("Entschlüsseln fehlgeschlagen (falsches Passwort?)."); return; }
      } else out.push(new File([blob], name, { type: blob.type || guessType(name) }));
    }
    onImported(out);
  };
  const openBrowse = async (p, stack = []) => {
    setErr(""); setBrowse({ provider: p, stack, items: [], sel: {}, loading: true });
    try {
      const items = await cloudList(p, tokens[p], stack.length ? stack[stack.length - 1].id : "");
      setBrowse({ provider: p, stack, items, sel: {}, loading: false });
    } catch (e) { setErr(errText(e)); setBrowse(null); }
  };
  const takeSelected = async () => {
    setErr(""); setBusy("dl");
    try {
      const blobs = [];
      for (const it of browse.items.filter((i) => browse.sel[i.id])) blobs.push({ name: it.name, blob: await cloudDownload(browse.provider, tokens[browse.provider], it) });
      if (blobs.length) await finishImport(blobs);
    } catch (e) { setErr(errText(e)); }
    setBusy("");
  };
  const pickGoogle = async () => {
    setErr(""); setBusy("gdrive");
    try {
      const docs = await gdrivePick(tokens.gdrive); const blobs = [];
      for (const d of docs) blobs.push({ name: d.name, blob: await cloudDownload("gdrive", tokens.gdrive, d) });
      if (blobs.length) await finishImport(blobs);
    } catch (e) { setErr(errText(e)); }
    setBusy("");
  };

  const tabs = [["import", t.cloudTabImport], ["export", t.cloudTabExport], ["conn", t.cloudTabConn]];
  const connectedList = DIRECT_PROVIDERS.filter((p) => tokens[p]);
  const sysInput = useRef(null);

  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.cloudsMenu} onClose={onClose} maxWidth={560}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setErr(""); }} style={{ ...btnSmall(c), background: tab === k ? c.accent : c.surface, color: tab === k ? "#fff" : c.text, borderColor: tab === k ? c.accent : c.border }}>{l}</button>
        ))}
      </div>
      {err && <InfoBox c={c} tone="warn">{err}</InfoBox>}

      {/* ----- Holen aus ----- */}
      {tab === "import" && (
        <>
          <input ref={sysInput} type="file" multiple style={{ display: "none" }}
            onChange={(e) => { const fl = Array.from(e.target.files || []); e.target.value = ""; if (fl.length) finishImport(fl.map((f) => ({ name: f.name, blob: f }))); }} />
          <button onClick={() => sysInput.current?.click()} style={{ ...btnSmall(c), width: "100%", justifyContent: "center", padding: "12px 10px", marginBottom: 6 }}>
            <Paperclip size={15} /> {t.systemPicker}
          </button>
          <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginBottom: 14 }}>{t.systemPickerHint}</div>

          {DIRECT_PROVIDERS.map((p) => (
            <div key={p} style={{ marginBottom: 8 }}>
              {tokens[p] ? (
                <button disabled={!!busy} onClick={() => (p === "gdrive" ? pickGoogle() : openBrowse(p))} style={{ ...btnSmall(c), width: "100%", justifyContent: "center", padding: "11px 10px" }}>
                  <Cloud size={15} /> {CLOUD_META[p].label}
                </button>
              ) : (
                <button onClick={() => setTab("conn")} style={{ ...btnSmall(c), width: "100%", justifyContent: "center", padding: "11px 10px", color: c.textMuted }}>
                  <Cloud size={15} /> {CLOUD_META[p].label} · {t.notConnected}
                </button>
              )}
            </div>
          ))}

          {browse && (
            <div style={{ marginTop: 10, border: `1px solid ${c.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }} dir="ltr">
                <span style={{ fontWeight: 700 }}>{CLOUD_META[browse.provider].label}</span>
                <span style={{ cursor: "pointer", color: c.accent }} onClick={() => openBrowse(browse.provider, [])}>/</span>
                {browse.stack.map((s, i) => (
                  <span key={s.id} style={{ cursor: "pointer", color: c.accent }} onClick={() => openBrowse(browse.provider, browse.stack.slice(0, i + 1))}>{s.name} /</span>
                ))}
              </div>
              {browse.loading ? <div style={{ color: c.textMuted }}>…</div> : (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {browse.items.length === 0 && <div style={{ color: c.textMuted }}>—</div>}
                  {browse.items.map((it) => (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderBottom: `1px solid ${c.border}` }}>
                      {it.folder ? <Folder size={15} color={c.accent} /> : <input type="checkbox" checked={!!browse.sel[it.id]} onChange={(e) => setBrowse((b) => ({ ...b, sel: { ...b.sel, [it.id]: e.target.checked } }))} />}
                      <span
                        dir="ltr" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: it.folder ? "pointer" : "default" }}
                        onClick={() => it.folder && openBrowse(browse.provider, [...browse.stack, { id: it.id, name: it.name }])}
                      >{it.name}</span>
                      {!it.folder && <span style={{ color: c.textMuted, fontSize: 11.5 * fontScale }}>{fmtSize(it.size)}</span>}
                    </div>
                  ))}
                </div>
              )}
              <button disabled={busy === "dl" || !Object.values(browse.sel).some(Boolean)} onClick={takeSelected} style={{ ...btnPrimary(c, busy === "dl" || !Object.values(browse.sel).some(Boolean)), marginTop: 10 }}>
                {t.takeSelected}
              </button>
            </div>
          )}
        </>
      )}

      {/* ----- Sichern in ----- */}
      {tab === "export" && (
        <>
          {exportFiles.length === 0 ? (
            <div style={{ color: c.textMuted }}>{t.noFilesYet}</div>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                {exportFiles.map((f) => (
                  <label key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <input type="checkbox" checked={!!sel[f.id]} onChange={(e) => setSel((s) => ({ ...s, [f.id]: e.target.checked }))} />
                    <span dir="ltr" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <span style={{ color: c.textMuted, fontSize: 11.5 * fontScale }}>{fmtSize(f.size)}</span>
                  </label>
                ))}
              </div>
              <CheckRow checked={cloud.encrypt} onChange={(v) => setCloud((cl) => ({ ...cl, encrypt: v }))}>{t.encryptLabel}</CheckRow>
              {cloud.encrypt && (
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={t.passLabel} autoComplete="off"
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, boxSizing: "border-box", marginBottom: 10 }} />
              )}
              <button disabled={!chosen.length} onClick={exportSystem} style={{ ...btnSmall(c), width: "100%", justifyContent: "center", padding: "12px 10px", marginBottom: 8 }}>
                <Share2 size={15} /> {t.systemShare}
              </button>
              <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginBottom: 12 }}>{t.systemShareHint}</div>
              {DIRECT_PROVIDERS.map((p) => (
                <button key={p} disabled={!tokens[p] || !chosen.length || !!busy} onClick={() => exportTo(p)} style={{ ...btnSmall(c), width: "100%", justifyContent: "center", padding: "11px 10px", marginBottom: 8, opacity: tokens[p] ? 1 : 0.55 }}>
                  <Cloud size={15} /> {CLOUD_META[p].label}{tokens[p] ? "" : " · " + t.notConnected}
                </button>
              ))}
            </>
          )}
        </>
      )}

      {/* ----- Verbindungen ----- */}
      {tab === "conn" && (
        <>
          <InfoBox c={c}>{t.connIntro}</InfoBox>
          {["gdrive", "onedrive", "dropbox", "icloud"].map((p) => {
            const m = CLOUD_META[p]; const direct = p !== "icloud"; const live = !!tokens[p];
            const configured = direct && Object.values(CLOUD_CONFIG[p]).every(Boolean);
            return (
              <div key={p} style={{ border: `1px solid ${c.border}`, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <b>{m.label}</b>
                  <span style={{ fontSize: 12 * fontScale, color: live ? c.accent : c.textMuted }}>
                    {!direct ? "" : live ? t.connected : cloud.consent[p] ? t.notConnected + " (Einwilligung gespeichert)" : !configured ? t.notConfigured : t.notConnected}
                  </span>
                </div>
                {!direct && <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginTop: 4 }}>{m.scope}</div>}
                {direct && !live && draft?.provider !== p && (
                  <button onClick={() => (cloud.consent[p] ? doConnect(p) : setDraft({ provider: p, ok: false }))} disabled={!!busy} style={{ ...btnSmall(c), marginTop: 8 }}>{t.connect}</button>
                )}
                {direct && live && <button onClick={() => doDisconnect(p)} style={{ ...btnSmall(c), marginTop: 8, color: c.warn }}>{t.disconnect}</button>}
                {direct && !live && draft?.provider === p && (
                  <div style={{ marginTop: 10, fontSize: 12.5 * fontScale }} dir="ltr">
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Einwilligung zur Verbindung mit {m.label}</div>
                    <div style={{ marginBottom: 4 }}><b>Anbieter:</b> {m.company}. Der Anbieter kann Daten in Länder außerhalb der EU übertragen (z. B. USA).</div>
                    <div style={{ marginBottom: 4 }}><b>Was passiert:</b> Dateien werden direkt zwischen deinem Gerät und deinem Konto beim Anbieter übertragen, nicht über unseren Server. Beim Verbinden wird ein Skript des Anbieters nachgeladen. {m.scope}</div>
                    <div style={{ marginBottom: 4 }}>Briefe können sensible Daten enthalten (z. B. Gesundheitsdaten). Verschlüssele sie deshalb vor dem Speichern in einer Cloud.</div>
                    <div style={{ marginBottom: 8 }}><a href={m.privacy} target="_blank" rel="noopener noreferrer" style={{ color: c.accent }}>Datenschutzerklärung von {m.label}</a></div>
                    <CheckRow checked={draft.ok} onChange={(v) => setDraft({ provider: p, ok: v })}>{t.consentLabel} (Art. 6 Abs. 1 lit. a DSGVO)</CheckRow>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setDraft(null)} style={btnSmall(c)}>{t.cancel}</button>
                      <button disabled={!draft.ok || !!busy} onClick={() => doConnect(p)} style={{ ...btnPrimary(c, !draft.ok || !!busy), flex: 1, width: "auto" }}>{busy === p ? "…" : t.connect}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
            <CheckRow checked={cloud.encrypt} onChange={(v) => setCloud((cl) => ({ ...cl, encrypt: v }))}>{t.encryptLabel}</CheckRow>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={t.passLabel} autoComplete="off"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, boxSizing: "border-box" }} />
            <div style={{ color: c.textMuted, fontSize: 12 * fontScale, margin: "6px 0 12px" }}>{t.passHint}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>{t.autoUpload}</span>
              <select value={cloud.auto || ""} onChange={(e) => setCloud((cl) => ({ ...cl, auto: e.target.value || null }))}
                style={{ padding: 8, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text }}>
                <option value="">{t.off}</option>
                {connectedList.map((p) => <option key={p} value={p}>{CLOUD_META[p].label}</option>)}
              </select>
            </div>
          </div>
        </>
      )}
    </AppModal>
  );
}

/* ---------- Konto: Anmeldung mit Universal Profile / E-Mail, E-Mail-Verknüpfung ---------- */
function AuthModal({ c, t, fontScale, rtl, account, setAccount, onClose, openLegal }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [mailConsent, setMailConsent] = useState(false);
  const validMail = /^\S+@\S+\.\S+$/.test(email.trim());
  const hasProv = !!upProvider();
  const upErr = (e) => ({
    "no-provider": "Keine UP-Browser-Erweiterung gefunden. Installiere die Universal Profile Browser Extension und lade die Seite neu.",
    verify: "Die Signatur wurde vom Server nicht bestätigt.",
    "up-used": "Dieses Universal Profile gehört schon zu einem anderen Konto.",
  })[e?.message] || (e?.code === 4001 ? "Abgebrochen." : "Die Anmeldung hat nicht geklappt.");

  const doUp = async (link) => {
    setErr(""); setBusy(true);
    try {
      const r = await upLogin(link);
      const now = new Date().toISOString();
      setAccount((a) => (link && a ? { ...a, upAddress: r.address, chainId: r.chainId, upVerified: r.verified, linkedAt: now } : { method: "up", upAddress: r.address, chainId: r.chainId, upVerified: r.verified, loginAt: now, email: null }));
    } catch (e) { setErr(upErr(e)); }
    setBusy(false);
  };
  const requestMail = async (asLogin) => {
    if (SERVER_URL) {
      setBusy(true); setErr("");
      try { await srv("/auth/email/start", { email: email.trim(), mode: asLogin && !account ? "login" : "link" }); setErr(t.mailSent); }
      catch (e) { setErr(t.serverFail); setBusy(false); return; }
      setBusy(false);
    }
    const entry = { address: email.trim(), status: "pending", requestedAt: new Date().toISOString() };
    setAccount((a) => (asLogin && !a ? { method: "email", loginAt: new Date().toISOString(), email: entry } : { ...a, email: entry }));
    setEmail(""); setMailConsent(false);
  };
  const confirmMail = () => setAccount((a) => ({ ...a, email: { ...a.email, status: "confirmed", confirmedAt: new Date().toISOString() } }));
  const removeMail = () => setAccount((a) => ({ ...a, email: null }));

  const MailForm = ({ asLogin }) => (
    <>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail-Adresse" autoComplete="email"
        style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, boxSizing: "border-box", marginBottom: 8 }} />
      <CheckRow checked={mailConsent} onChange={setMailConsent}>{t.mailConsent}</CheckRow>
      <button disabled={!validMail || !mailConsent} onClick={() => requestMail(asLogin)} style={btnPrimary(c, !validMail || !mailConsent)}>{asLogin ? t.emailLogin : t.linkEmail}</button>
    </>
  );

  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={account ? t.accountTitle : t.signIn} onClose={onClose}>
      {err && <InfoBox c={c} tone="warn">{err}</InfoBox>}

      {!account && (
        <>
          <InfoBox c={c}>
            <div dir="ltr" style={{ fontSize: 12.5 * fontScale }}>
              <b>Hinweis zum Datenschutz:</b> Die Adresse deines Universal Profile ist öffentlich auf der Blockchain sichtbar und kann Personen zugeordnet werden. Wir speichern nur diese Adresse und – wenn du sie angibst – deine E-Mail-Adresse. Deine Briefe werden nie mit der Adresse öffentlich verknüpft.{" "}
              <LinkBtn c={c} onClick={() => openLegal("datenschutz")}>Datenschutzerklärung</LinkBtn>
            </div>
          </InfoBox>
          <CheckRow checked={consent} onChange={setConsent}>{t.upConsent}</CheckRow>
          <button disabled={!consent || busy} onClick={() => doUp(false)} style={btnPrimary(c, !consent || busy)}>
            {busy ? "…" : t.upLogin}
          </button>
          {!hasProv && <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginTop: 6 }}>{t.upNoProvider}</div>}
          <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginTop: 6 }}>{t.upMobileHint}</div>
          <div style={{ margin: "16px 0 8px", paddingTop: 14, borderTop: `1px solid ${c.border}`, fontWeight: 700 }}>{t.emailLogin}</div>
          <MailForm asLogin />
          <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginTop: 8 }}>{t.demoAuthNote}</div>
        </>
      )}

      {account && (
        <>
          <InfoBox c={c}>
            {account.upAddress && (
              <div dir="ltr">
                <b>Universal Profile:</b> {shortAddr(account.upAddress)}{" "}
                <span style={{ color: account.upVerified ? c.accent : c.warn }}>
                  ({account.upVerified ? "Signatur geprüft" : "nicht serverseitig geprüft – Demo"})
                </span>
              </div>
            )}
            {account.email && (
              <div dir="ltr"><b>E-Mail:</b> {account.email.address}{" "}
                <span style={{ color: account.email.status === "confirmed" ? c.accent : c.warn }}>({account.email.status === "confirmed" ? "bestätigt" : "Bestätigung ausstehend"})</span>
              </div>
            )}
          </InfoBox>

          {account.email?.status === "pending" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: c.textMuted, marginBottom: 6 }}>{t.mailPending}</div>
              {!SERVER_URL && <button onClick={confirmMail} style={btnSmall(c)}>{t.demoConfirm}</button>}
            </div>
          )}
          {account.email?.status === "confirmed" && <div style={{ marginBottom: 12, color: c.textMuted }}>{t.mailConfirmedNote}</div>}
          {account.email && <button onClick={removeMail} style={{ ...btnSmall(c), color: c.warn, marginBottom: 12 }}>{t.unlinkEmail}</button>}
          {!account.email && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.linkEmail}</div>
              <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginBottom: 8 }}>{t.linkEmailWhy}</div>
              <MailForm asLogin={false} />
            </div>
          )}
          {!account.upAddress && (
            <div style={{ marginBottom: 12 }}>
              <button disabled={busy} onClick={() => doUp(true)} style={btnSmall(c)}>{busy ? "…" : t.linkUp}</button>
              {!hasProv && <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginTop: 6 }}>{t.upNoProvider}</div>}
            </div>
          )}
          <button onClick={() => { setAccount(null); onClose(); }} style={{ ...btnPrimary(c, false), background: c.surface, color: c.warn, borderColor: c.warn }}>{t.logout}</button>
          <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginTop: 8 }}>{t.demoAuthNote}</div>
        </>
      )}
    </AppModal>
  );
}

/* =====================================================================
   FALL-ANSICHT · KACHELN · SORTIERUNG · SUCHE · FRISTEN · PDF · BACKUP
   ===================================================================== */

/* ---------- Kachel-Felder (global voreingestellt, vom Nutzer anpassbar) ---------- */
const TILE_FIELD_KEYS = {
  subject: "fSubject", sender: "fSender", caseNumber: "fCaseNumber", date: "fDate", receivedDate: "fReceived",
  deadline: "fDeadline", pages: "fPages", note: "fNote", uploadedAt: "fUploaded",
};
const DEFAULT_TILE_FIELDS = [
  { id: "subject", on: true }, { id: "caseNumber", on: true }, { id: "date", on: true }, { id: "deadline", on: true },
  { id: "sender", on: false }, { id: "receivedDate", on: false }, { id: "pages", on: false }, { id: "note", on: false }, { id: "uploadedAt", on: false },
];
const DEFAULT_PREFS = {
  tileFields: DEFAULT_TILE_FIELDS,
  layout: null,                 // null = automatisch (Handy neu, Desktop klassisch) · "classic" · "new"
  letterSort: { key: "date", dir: "desc" },
  showDemo: true,
  exportFormat: "pdf",
  exportOriginals: true,
  casePdfPhotos: true,
  fbShare: false,
  remind: { enabled: false, days: [7, 3, 1], time: "09:00", fired: {}, sendSubject: false, autoCalendar: true, calSub: false, calToken: "" },
};
function mergePrefs(saved) {
  const p = { ...DEFAULT_PREFS, ...(saved || {}) };
  const known = DEFAULT_TILE_FIELDS.map((f) => f.id);
  const have = (p.tileFields || []).filter((f) => known.includes(f.id));
  const missing = DEFAULT_TILE_FIELDS.filter((f) => !have.some((h) => h.id === f.id)).map((f) => ({ ...f, on: false }));
  p.tileFields = [...have, ...missing];
  p.letterSort = { ...DEFAULT_PREFS.letterSort, ...(saved?.letterSort || {}) };
  p.remind = { ...DEFAULT_PREFS.remind, ...(saved?.remind || {}) };
  return p;
}
const DEMO_CASE_IDS = ["c1", "c2", "c3"];
const DEMO_LETTER_IDS = ["l1"];
// Ein Beispielfall, in dem schon echte Briefe liegen, wird zum echten Fall (sonst fehlten sie im Backup und würden mit den Beispieldaten gelöscht)
const normalizeCases = (arr) => (Array.isArray(arr) ? arr.map((cs) => (DEMO_CASE_IDS.includes(cs.id)
  ? { ...cs, demo: cs.letters.every((l) => DEMO_LETTER_IDS.includes(l.id)) } : cs)) : arr);

function fmtD(d, lang) {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString(lang || "de", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch (e) { return d; }
}
function fieldValue(id, l, lang, daysUntil) {
  switch (id) {
    case "subject": return l.subject || "";
    case "sender": return l.sender && l.sender !== "Unbekannt" ? l.sender : "";
    case "caseNumber": return l.caseNumber && l.caseNumber !== "—" ? l.caseNumber : "";
    case "date": return fmtD(l.date, lang);
    case "receivedDate": return fmtD(l.receivedDate, lang);
    case "deadline": {
      if (l.deadline) { const d = daysUntil(l.deadline); return fmtD(l.deadline, lang) + (d !== null ? ` (${d} T)` : ""); }
      return l.deadlineNote || "";
    }
    case "pages": return l.pages ? String(l.pages) : "";
    case "note": return l.note || "";
    case "uploadedAt": return fmtD((l.uploadedAt || "").slice(0, 10), lang);
    default: return "";
  }
}

/* ---------- Sortierung ---------- */
function sortLetters(list, key, dir) {
  const mul = dir === "asc" ? 1 : -1;
  const val = (l) => {
    switch (key) {
      case "date": return l.date || "";
      case "caseNumber": return l.caseNumber && l.caseNumber !== "—" ? l.caseNumber.toLowerCase() : "";
      case "sender": return (l.sender || "").toLowerCase();
      case "subject": return (l.subject || "").toLowerCase();
      case "deadline": return l.deadline || "";
      default: return "";
    }
  };
  return [...list].sort((a, b) => {
    const va = val(a), vb = val(b);
    if (!va && !vb) return 0;
    if (!va) return 1;            // leere Werte stehen immer unten
    if (!vb) return -1;
    return va.localeCompare(vb, "de", { numeric: true }) * mul;
  });
}
const caseDate = (cs) => cs.letters.reduce((m, l) => ((l.date || "") > m ? l.date : m), "");
const caseNo = (cs) => cs.letters.map((l) => l.caseNumber).find((n) => n && n !== "—") || "";
const todayIso = () => localIso();
function caseDeadline(cs) {
  const ds = cs.letters.map((l) => l.deadline).filter(Boolean).sort();
  return ds.find((d) => d >= todayIso()) || ds[ds.length - 1] || "";
}

/* ---------- Suche ---------- */
function letterMatches(l, terms) {
  const hay = [l.subject, l.sender, l.caseNumber, l.original, l.translation, l.reply, l.note, (l.files || []).map((f) => f.name).join(" ")]
    .join("\n").toLowerCase();
  return terms.some((tm) => hay.includes(tm));
}

/* ---------- Fristen: Kalender-Datei mit Alarmen (.ics) ---------- */
const icsEsc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function buildIcs(letters, remind) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Briefe-App//DE", "CALSCALE:GREGORIAN", "X-PUBLISHED-TTL:PT1H", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"];
  const [hh, mm] = String(remind.time || "09:00").split(":").map(Number);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  for (const l of letters) {
    if (!l.deadline) continue;
    const nxt = new Date(l.deadline + "T12:00:00"); nxt.setDate(nxt.getDate() + 1);
    const de = `${nxt.getFullYear()}${String(nxt.getMonth() + 1).padStart(2, "0")}${String(nxt.getDate()).padStart(2, "0")}`;
    lines.push(
      "BEGIN:VEVENT", `UID:${l.id}-frist@briefe-app`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${l.deadline.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${de}`,
      `SUMMARY:${icsEsc("Frist: " + l.subject)}`,
      `DESCRIPTION:${icsEsc([l.sender, l.caseNumber].filter((x) => x && x !== "—" && x !== "Unbekannt").join(" · "))}`
    );
    for (const d of remind.days) {
      const mins = d * 1440 - (hh * 60 + (mm || 0));
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(`Frist in ${d} Tag(en): ${l.subject}`)}`,
        mins >= 0 ? `TRIGGER:-PT${mins}M` : `TRIGGER;RELATED=START:PT${-mins}M`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Blob([lines.join("\r\n")], { type: "text/calendar" });
}

/* ---------- PDF über den Druckdialog (kein externer Dienst nötig) ---------- */
const escHtml = (s) => String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
function printDocument(title, bodyHtml) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;margin:24mm 20mm;color:#000}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body>${bodyHtml}</body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
  return true;
}

/* ---------- Backup ---------- */
async function fileDelete(id) {
  memFiles.delete(id);
  const db = await fileDb();
  if (!db) return;
  try { db.transaction("files", "readwrite").objectStore("files").delete(id); } catch (e) {}
}
function base64ToBlob(b64, type) {
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: type || "application/octet-stream" });
}
async function buildBackup(cases, prefs) {
  const real = cases.filter((cs) => !cs.demo);
  const files = {};
  for (const cs of real) for (const l of cs.letters) for (const f of l.files || []) {
    if (files[f.id]) continue;
    const b = await fileGet(f.id);
    if (b) files[f.id] = { name: f.name, type: f.type, data: await blobToBase64(b) };
  }
  return new Blob([JSON.stringify({ app: "briefe-app", version: 1, createdAt: new Date().toISOString(), cases: real, prefs, files })], { type: "application/json" });
}
async function readBackup(file, pass) {
  let text;
  if (file.name.toLowerCase().endsWith(".enc")) {
    if (!pass) throw new Error("nopass");
    text = await (await decryptBlob(file, pass, "application/json")).text();
  } else text = await file.text();
  const bk = JSON.parse(text);
  if (bk.app !== "briefe-app" || !(Array.isArray(bk.cases) || Array.isArray(bk.profiles))) throw new Error("format");
  return bk;
}
async function buildBackupAll(api, activeCases, activePrefs) {
  const files = {}; const profiles = [];
  for (const p of api.profiles) {
    const cs = (p.id === api.activeId ? activeCases : await api.readCases(p.id)).filter((x) => !x.demo);
    let prefs = activePrefs;
    if (p.id !== api.activeId) { try { prefs = JSON.parse((await sGet(PK("briefe-app-prefs", p.id))) || "null"); } catch (e) { prefs = null; } }
    profiles.push({ id: p.id, name: p.name, cases: cs, prefs });
    for (const c0 of cs) for (const l of c0.letters) for (const f of l.files || []) {
      if (files[f.id]) continue;
      const b = await fileGet(f.id);
      if (b) files[f.id] = { name: f.name, type: f.type, data: await blobToBase64(b) };
    }
  }
  return new Blob([JSON.stringify({ app: "briefe-app", version: 2, createdAt: new Date().toISOString(), profiles, files })], { type: "application/json" });
}
function mergeBackup(cases, bk) {
  const out = cases.map((cs) => ({ ...cs, letters: [...cs.letters] }));
  let addedCases = 0, addedLetters = 0;
  for (const bc of bk.cases) {
    const ex = out.find((cs) => cs.id === bc.id);
    if (!ex) { out.push(bc); addedCases++; addedLetters += bc.letters.length; continue; }
    for (const bl of bc.letters) if (!ex.letters.some((l) => l.id === bl.id)) { ex.letters.push(bl); addedLetters++; }
  }
  return { cases: out, addedCases, addedLetters };
}

/* =====================================================================
   FALL-ANSICHT UND DIALOGE (Stufe 1)
   ===================================================================== */

/* ---------- Brief-Kachel / Brief-Zeile: zeigt nur die vom Nutzer gewählten Felder ---------- */
function LetterTile({ c, t, fontScale, letter, fields, onOpen, daysUntil, uiLang, list, caseColor }) {
  const rows = fields
    .filter((f) => f.on)
    .map((f) => ({ id: f.id, label: t[TILE_FIELD_KEYS[f.id]], value: fieldValue(f.id, letter, uiLang, daysUntil) }))
    .filter((r) => r.value);
  const dl = letter.deadline ? daysUntil(letter.deadline) : null;
  const urgent = dl !== null && dl <= 7 && dl >= 0;
  const [first, ...rest] = rows;
  const valStyle = (r) => ({ color: r.id === "deadline" && urgent ? c.warn : c.text, fontWeight: r.id === "deadline" && urgent ? 700 : 400 });

  if (list) {
    return (
      <div onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1px solid ${c.border}`, background: c.surface, cursor: "pointer" }}>
        <div style={{ width: 8, alignSelf: "stretch", minHeight: 34, borderRadius: 4, background: caseColor }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {first && <div style={{ fontWeight: 600, fontSize: 13 * fontScale, overflow: "hidden", textOverflow: "ellipsis" }}>{first.value}</div>}
          {rest.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", fontSize: 11.5 * fontScale, color: c.textMuted }}>
              {rest.map((r) => <span key={r.id}>{r.label}: <span style={valStyle(r)}>{r.value}</span></span>)}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div onClick={onOpen} style={{ border: `1px solid ${c.border}`, borderRadius: 16, background: c.surface, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 44, background: caseColor, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <FileText size={20} color="#fff" style={{ opacity: 0.9 }} />
        {urgent && (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 10.5, color: c.warn, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={11} /> {dl}T
          </div>
        )}
      </div>
      <div style={{ padding: 12 }}>
        {first && <div style={{ fontWeight: 700, fontSize: 13 * fontScale, lineHeight: 1.3, marginBottom: rest.length ? 6 : 0, wordBreak: "break-word" }}>{first.value}</div>}
        {rest.map((r) => (
          <div key={r.id} style={{ fontSize: 11.5 * fontScale, color: c.textMuted, lineHeight: 1.45, wordBreak: "break-word" }}>
            {r.label}: <span style={valStyle(r)}>{r.value}</span>
          </div>
        ))}
        {rows.length === 0 && <div style={{ color: c.textMuted, fontSize: 12 * fontScale }}>—</div>}
      </div>
    </div>
  );
}

/* ---------- Fall-Ansicht: Liste der Briefe dieses Falls ---------- */
function CaseView({ c, t, fontScale, cs, translatedName, letters, view, sort, setSort, fields, onBack, onOpenLetter, onCustomize, onToggleStatus, onAdd, onExport, onCasePdf, daysUntil, uiLang, isMobile, isRTL, searching }) {
  const sortOpts = [["date", t.sortDate], ["caseNumber", t.fCaseNumber], ["sender", t.fSender], ["deadline", t.sortDeadline], ["subject", t.fSubject]];
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <button onClick={onBack} style={{ ...btnSmall(c), marginBottom: 12 }}>
        <ChevronRight size={14} style={{ transform: isRTL ? "none" : "rotate(180deg)" }} /> {t.home}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ width: 10, alignSelf: "stretch", minHeight: 38, borderRadius: 5, background: cs.color }} />
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 19 * fontScale }}>{cs.name}</h2>
          {uiLang !== "de" && <div style={{ fontSize: 12.5 * fontScale, color: c.accent }}>{translatedName || "…"}</div>}
          <div style={{ fontSize: 12 * fontScale, color: c.textMuted }}>{nLetters(cs.letters.length, t)}</div>
        </div>
        <button onClick={onToggleStatus} style={btnSmall(c)}>
          {cs.status === "done" ? <FolderCheck size={14} /> : <Check size={14} />} {cs.status === "done" ? t.done : t.open}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <span style={{ fontSize: 12 * fontScale, color: c.textMuted }}>{t.sortBy}</span>
        <select value={sort.key} onChange={(e) => setSort({ ...sort, key: e.target.value })} style={{ ...selectStyle(c), fontSize: 12.5 * fontScale }}>
          {sortOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button onClick={() => setSort({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })} title={sort.dir === "asc" ? t.ascending : t.descending} style={btnSmall(c)}>
          {sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {sort.dir === "asc" ? t.ascending : t.descending}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onCustomize} style={btnSmall(c)}><SlidersHorizontal size={14} /> {t.customizeTiles}</button>
        <button onClick={onCasePdf} style={btnSmall(c)}><FileText size={14} /> {t.casePdf}</button>
        <button onClick={onExport} style={btnSmall(c)}><Download size={14} /> {t.exportCase}</button>
        <button onClick={onAdd} style={{ ...btnSmall(c), background: c.accent, color: "#fff", borderColor: c.accent }}><Upload size={14} /> {t.upload}</button>
      </div>

      {letters.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: c.textMuted }}>{searching ? t.noHits : t.caseEmpty}</div>
      ) : view === "tiles" ? (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(150px,1fr))" : "repeat(auto-fill, minmax(230px,1fr))", gap: isMobile ? 10 : 16 }}>
          {letters.map((l) => (
            <LetterTile key={l.id} c={c} t={t} fontScale={fontScale} letter={l} fields={fields} onOpen={() => onOpenLetter(l.id)} daysUntil={daysUntil} uiLang={uiLang} caseColor={cs.color} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {letters.map((l) => (
            <LetterTile key={l.id} list c={c} t={t} fontScale={fontScale} letter={l} fields={fields} onOpen={() => onOpenLetter(l.id)} daysUntil={daysUntil} uiLang={uiLang} caseColor={cs.color} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Kachel anpassen: Felder an/aus und verschieben ---------- */
function TileFieldsModal({ c, t, fontScale, rtl, fields, setFields, sampleLetter, caseColor, uiLang, daysUntil, onClose }) {
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields]; [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
  };
  const toggle = (id) => setFields(fields.map((f) => (f.id === id ? { ...f, on: !f.on } : f)));
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.customizeTiles} onClose={onClose} maxWidth={480}>
      <div style={{ color: c.textMuted, marginBottom: 12 }}>{t.customizeHint}</div>
      {fields.map((f, i) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", border: `1px solid ${c.border}`, borderRadius: 8, marginBottom: 6, opacity: f.on ? 1 : 0.65 }}>
          <input type="checkbox" checked={f.on} onChange={() => toggle(f.id)} style={{ width: 18, height: 18 }} />
          <span style={{ flex: 1 }}>{t[TILE_FIELD_KEYS[f.id]]}</span>
          <button disabled={i === 0} onClick={() => move(i, -1)} style={{ ...btnSmall(c), padding: "4px 7px", opacity: i === 0 ? 0.35 : 1 }}><ArrowUp size={14} /></button>
          <button disabled={i === fields.length - 1} onClick={() => move(i, 1)} style={{ ...btnSmall(c), padding: "4px 7px", opacity: i === fields.length - 1 ? 0.35 : 1 }}><ArrowDown size={14} /></button>
        </div>
      ))}
      <button onClick={() => setFields(DEFAULT_TILE_FIELDS)} style={{ ...btnSmall(c), marginTop: 4, marginBottom: 14 }}>{t.resetDefault}</button>
      <div style={{ fontSize: 12 * fontScale, color: c.textMuted, marginBottom: 6 }}>{t.previewWord}</div>
      <div style={{ maxWidth: 260 }}>
        <LetterTile c={c} t={t} fontScale={fontScale} letter={sampleLetter} fields={fields} onOpen={() => {}} daysUntil={daysUntil} uiLang={uiLang} caseColor={caseColor} />
      </div>
      <button onClick={onClose} style={{ ...btnPrimary(c, false), marginTop: 14 }}>{t.doneWriting}</button>
    </AppModal>
  );
}

/* ---------- Brief bearbeiten (Zugangsdatum, Frist, Notiz, Fall wechseln, löschen) ---------- */
function LetterEditModal({ c, t, fontScale, rtl, letter, cases, onSave, onDelete, onClose }) {
  const [f, setF] = useState({
    subject: letter.subject || "", sender: letter.sender || "", caseNumber: letter.caseNumber === "—" ? "" : letter.caseNumber || "",
    date: letter.date || "", receivedDate: letter.receivedDate || "", deadline: letter.deadline || "", deadlineNote: letter.deadlineNote || "",
    pages: letter.pages || 1, note: letter.note || "", caseId: letter.caseId,
  });
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const inp = { width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, boxSizing: "border-box", fontFamily: "inherit", fontSize: 13 * fontScale };
  const Row = ({ label, children }) => (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12 * fontScale, color: c.textMuted, marginBottom: 3 }}>{label}</div>
      {children}
    </label>
  );
  const save = () => onSave(letter, {
    subject: f.subject.trim() || letter.subject, sender: f.sender.trim() || "Unbekannt", caseNumber: f.caseNumber.trim() || "—",
    date: f.date || letter.date, receivedDate: f.receivedDate || letter.receivedDate, deadline: f.deadline || null,
    deadlineNote: f.deadline ? null : (f.deadlineNote.trim() || null), pages: Math.max(1, Number(f.pages) || 1), note: f.note.trim(),
  }, f.caseId);
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.editLetter} onClose={onClose} maxWidth={500}>
      <Row label={t.fSubject}><input style={inp} value={f.subject} onChange={set("subject")} /></Row>
      <Row label={t.fSender}><input style={inp} value={f.sender} onChange={set("sender")} /></Row>
      <Row label={t.fCaseNumber}><input style={inp} value={f.caseNumber} onChange={set("caseNumber")} dir="ltr" /></Row>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Row label={t.fDate}><input type="date" style={inp} value={f.date} onChange={set("date")} /></Row>
        <Row label={t.fReceived}><input type="date" style={inp} value={f.receivedDate} onChange={set("receivedDate")} /></Row>
        <Row label={t.fDeadline}><input type="date" style={inp} value={f.deadline} onChange={set("deadline")} /></Row>
        <Row label={t.fPages}><input type="number" min="1" style={inp} value={f.pages} onChange={set("pages")} /></Row>
      </div>
      {!f.deadline && <Row label={t.deadlineNoteLabel}><input style={inp} value={f.deadlineNote} onChange={set("deadlineNote")} /></Row>}
      <Row label={t.fNote}><textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={f.note} onChange={set("note")} /></Row>
      <Row label={t.moveToCase}>
        <select style={inp} value={f.caseId} onChange={set("caseId")}>
          {cases.map((cs) => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
        </select>
      </Row>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={onClose} style={btnSmall(c)}>{t.cancel}</button>
        <button onClick={save} style={{ ...btnPrimary(c, false), flex: 1, width: "auto" }}>{t.save}</button>
      </div>
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} style={{ ...btnSmall(c), color: c.warn, borderColor: c.warn }}><Trash2 size={13} /> {t.deleteLetter}</button>
        ) : (
          <>
            <div style={{ color: c.warn, marginBottom: 8 }}>{t.deleteConfirm}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDel(false)} style={btnSmall(c)}>{t.cancel}</button>
              <button onClick={() => onDelete(letter)} style={{ ...btnSmall(c), background: c.warn, color: "#fff", borderColor: c.warn }}>{t.deleteLetter}</button>
            </div>
          </>
        )}
      </div>
    </AppModal>
  );
}

/* ---------- Fristen & Erinnerungen ---------- */
function RemindersModal({ c, t, fontScale, rtl, items, remind, setRemind, onOpenLetter, uiLang, daysUntil, onClose, notify, pushState, calState }) {
  const pushReady = !!PUSH_ENDPOINT && pushSupported();
  const supported = typeof Notification !== "undefined";
  const perm = supported ? Notification.permission : "denied";
  const enable = async () => {
    if (!supported) return;
    let p = Notification.permission;
    if (p === "default") { try { p = await Notification.requestPermission(); } catch (e) {} }
    if (p === "granted") setRemind({ ...remind, enabled: true }); else notify(t.remindersDenied);
  };
  const toggleDay = (d) => {
    const days = remind.days.includes(d) ? remind.days.filter((x) => x !== d) : [...remind.days, d].sort((a, b) => b - a);
    setRemind({ ...remind, days });
  };
  const saveIcs = (list, name) => {
    const blob = buildIcs(list, remind);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.remindersTitle} onClose={onClose} maxWidth={560}>
      {items.length === 0 ? (
        <div style={{ color: c.textMuted, marginBottom: 12 }}>{t.remindersNone}</div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {items.map((l) => {
            const d = daysUntil(l.deadline);
            return (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1px solid ${c.border}`, borderRadius: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <div onClick={() => onOpenLetter(l.id)} style={{ flex: "1 1 180px", minWidth: 0, cursor: "pointer" }}>
                  <div style={{ fontWeight: 600 }}>{l.subject}</div>
                  <div style={{ fontSize: 11.5 * fontScale, color: c.textMuted }}>{l.caseName}{l.caseNumber && l.caseNumber !== "—" ? " · " + l.caseNumber : ""}</div>
                </div>
                <div style={{ fontSize: 12.5 * fontScale, fontWeight: 700, color: d < 0 ? c.warn : d <= 7 ? c.warn : c.text }}>
                  {fmtD(l.deadline, uiLang)} · {d < 0 ? t.overdue : d === 0 ? t.todayWord : t.daysLeft.replace("{n}", d)}
                </div>
                <button onClick={() => saveIcs([l], "frist.ics")} style={btnSmall(c)}><Calendar size={13} /> {t.toCalendar}</button>
              </div>
            );
          })}
          <button onClick={() => saveIcs(items, "fristen.ics")} style={btnSmall(c)}><Calendar size={13} /> {t.allToCalendar}</button>
        </div>
      )}

      <div style={{ paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
        <CheckRow checked={remind.autoCalendar !== false} onChange={(v) => setRemind({ ...remind, autoCalendar: v })}>{t.autoCalLabel}</CheckRow>
        <div style={{ color: c.textMuted, fontSize: 12 * fontScale, margin: "2px 0 12px" }}>{t.autoCalInfo}</div>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>{t.remindDays}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {[14, 7, 3, 2, 1, 0].map((d) => (
            <button key={d} onClick={() => toggleDay(d)} style={{ ...btnSmall(c), background: remind.days.includes(d) ? c.accent : c.surface, color: remind.days.includes(d) ? "#fff" : c.text, borderColor: remind.days.includes(d) ? c.accent : c.border }}>
              {d === 0 ? t.todayWord : d}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span>{t.remindTime}</span>
          <input type="time" value={remind.time} onChange={(e) => setRemind({ ...remind, time: e.target.value || "09:00" })}
            style={{ padding: 8, borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text }} />
        </div>
        {supported ? (
          remind.enabled && perm === "granted" ? (
            <button onClick={() => setRemind({ ...remind, enabled: false })} style={btnSmall(c)}><Bell size={13} /> {t.remindersOff}</button>
          ) : (
            <button onClick={enable} style={btnSmall(c)}><Bell size={13} /> {t.remindersOn}</button>
          )
        ) : (
          <div style={{ color: c.textMuted }}>{t.remindersNoSupport}</div>
        )}
        {!!PUSH_ENDPOINT && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
            <CheckRow checked={!!remind.calSub} onChange={(v) => setRemind({ ...remind, calSub: v })}>{t.calSubLabel}</CheckRow>
            <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginBottom: 8 }}>{t.calSubInfo}</div>
            {remind.calSub && calState === "on" && remind.calToken && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: c.accent, fontWeight: 700 }}>{t.calSubOk}</span>
                <button onClick={() => { window.location.href = calUrl(remind.calToken, true); }} style={btnSmall(c)}><Calendar size={13} /> {t.calSubOpen}</button>
                <button onClick={() => { try { navigator.clipboard.writeText(calUrl(remind.calToken, false)); notify(t.calSubCopied); } catch (e) {} }} style={btnSmall(c)}>{t.calSubCopy}</button>
              </div>
            )}
            {remind.calSub && calState === "fail" && <div style={{ color: c.warn }}>{t.calSubFail}</div>}
          </div>
        )}
        {pushReady && (
          <div style={{ marginTop: 10 }}>
            <CheckRow checked={!!remind.sendSubject} onChange={(v) => setRemind({ ...remind, sendSubject: v })}>{t.pushSubjectLabel}</CheckRow>
            <div style={{ color: c.textMuted, fontSize: 12 * fontScale }}>{t.pushConsent}</div>
            {remind.enabled && pushState === "sending" && <div style={{ marginTop: 6 }}>{t.pushSending}</div>}
            {remind.enabled && pushState === "on" && <div style={{ marginTop: 6, color: c.accent, fontWeight: 700 }}>{t.pushOn}</div>}
            {remind.enabled && pushState === "fail" && <div style={{ marginTop: 6, color: c.warn }}>{t.pushFail}</div>}
            {/iPhone|iPad/.test(navigator.userAgent) && !window.matchMedia?.("(display-mode: standalone)").matches && <div style={{ marginTop: 6, color: c.warn }}>{t.pushIos}</div>}
          </div>
        )}
        <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginTop: 8 }}>{pushReady ? "" : t.remindersHint}</div>
      </div>
    </AppModal>
  );
}

/* ---------- Backup ---------- */
function BackupModal({ c, t, fontScale, rtl, cloud, setCloud, pass, setPass, busy, onSave, onCloud, onRestore, onClose, multi, allProfiles, setAllProfiles }) {
  const inputRef = useRef(null);
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.backupTitle} onClose={onClose}>
      <InfoBox c={c}>{t.backupInfo}</InfoBox>
      {multi && <CheckRow checked={allProfiles} onChange={setAllProfiles}>{t.backupAllProfiles}</CheckRow>}
      <CheckRow checked={cloud.encrypt} onChange={(v) => setCloud((cl) => ({ ...cl, encrypt: v }))}>{t.encryptLabel}</CheckRow>
      {cloud.encrypt && (
        <>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={t.passLabel} autoComplete="off"
            style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, boxSizing: "border-box", marginBottom: 6 }} />
          <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginBottom: 10 }}>{t.passHint}</div>
        </>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button disabled={busy} onClick={onSave} style={{ ...btnSmall(c), justifyContent: "center", padding: "12px 10px" }}><Download size={15} /> {t.backupSave}</button>
        <button disabled={busy} onClick={onCloud} style={{ ...btnSmall(c), justifyContent: "center", padding: "12px 10px" }}><Cloud size={15} /> {t.backupCloud}</button>
        <input ref={inputRef} type="file" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onRestore(f); }} />
        <button disabled={busy} onClick={() => inputRef.current?.click()} style={{ ...btnSmall(c), justifyContent: "center", padding: "12px 10px" }}><Upload size={15} /> {t.backupRestore}</button>
      </div>
      {busy && <div style={{ color: c.textMuted, marginTop: 10 }}>…</div>}
    </AppModal>
  );
}

/* ---------- Hintergrund-Erinnerungen (Web Push) ---------- */
const pushSupported = () => typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof window !== "undefined" && "PushManager" in window;
function b64ToU8(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
}
function buildPushSchedule(items, remind, t) {
  const [hh, mm] = String(remind.time || "09:00").split(":").map(Number);
  const out = []; const now = Date.now();
  for (const l of items) for (const d of remind.days) {
    const at = new Date(l.deadline + "T00:00:00"); at.setDate(at.getDate() - d); at.setHours(hh, mm || 0, 0, 0);
    if (at.getTime() <= now) continue;
    out.push({
      key: `${l.id}:${d}`, at: at.getTime(),
      title: d === 0 ? t.remindToday : t.remindTitle.replace("{d}", d),
      body: remind.sendSubject ? l.subject : t.fDeadline,
    });
  }
  return out;
}
async function pushSub(create) {
  const reg = await navigator.serviceWorker.register(PUSH_SW_URL);
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(PUSH_VAPID_KEY) });
  return sub;
}
async function pushSync(schedule) {
  const sub = await pushSub(true);
  const r = await fetch(PUSH_ENDPOINT.replace(/\/$/, "") + "/subscribe", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), schedule, profile: ACTIVE_PROFILE }),
  });
  if (!r.ok) throw new Error("push " + r.status);
}
// Meldet nur die Erinnerungen dieses Profils ab; das Gerät bleibt für andere Profile angemeldet
async function pushOff(profile = ACTIVE_PROFILE) {
  const sub = await pushSub(false);
  if (!sub) return;
  try {
    await fetch(PUSH_ENDPOINT.replace(/\/$/, "") + "/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, profile }) });
  } catch (e) {}
}

/* ---------- Kalender-Abo (Server liefert die .ics unter geheimer Adresse) ---------- */
const makeCalToken = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const calBase = () => PUSH_ENDPOINT.replace(/\/$/, "");
const calUrl = (token, webcal) => { const u = `${calBase()}/cal/${token}.ics`; return webcal ? u.replace(/^https?:/, "webcal:") : u; };
// Ohne Betreff-Freigabe steht im Kalender nur "Frist"; Absender und Aktenzeichen werden nie übertragen
const calItems = (items, remind, t) => items.map((l) => ({ id: l.id, deadline: l.deadline, subject: remind.sendSubject ? l.subject : t.fDeadline, sender: "", caseNumber: "" }));
async function calSync(token, ics) {
  const r = await fetch(`${calBase()}/cal/sync`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ics }) });
  if (!r.ok) throw new Error("cal " + r.status);
}
async function calDelete(token) {
  await fetch(`${calBase()}/cal/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
}

/* =====================================================================
   EXPORT: ZIP mit Ordner je Fall · je Brief PDF und/oder Textdatei · Originale · Übersicht.csv
   Alles läuft auf dem Gerät, ohne Server und ohne Fremdbibliothek.
   ===================================================================== */

/* ---------- ZIP (unkomprimiert, UTF-8-Dateinamen) ---------- */
const CRC_TABLE = (() => {
  const tb = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let x = n; for (let k = 0; k < 8; k++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1; tb[n] = x >>> 0; }
  return tb;
})();
function crc32(u8) {
  let x = 0xffffffff;
  for (let i = 0; i < u8.length; i++) x = CRC_TABLE[(x ^ u8[i]) & 0xff] ^ (x >>> 8);
  return (x ^ 0xffffffff) >>> 0;
}
function dosDateTime(d) {
  const tm = ((d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)) & 0xffff;
  const dt = (((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return [tm, dt];
}
function makeZip(entries) {
  if (entries.length > 65000) throw new Error("toolarge");
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.path); const data = e.data; const crc = crc32(data); const [tm, dt] = dosDateTime(e.date || new Date());
    const isDir = e.path.endsWith("/");
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
    cd.setUint16(12, tm, true); cd.setUint16(14, dt, true); cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, name.length, true);
    cd.setUint32(38, isDir ? 0x10 : 0, true); cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
    if (offset > 0xfff00000) throw new Error("toolarge");
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

/* ---------- PDF: Seiten werden mit der Schrift des Geräts gezeichnet (jede Sprache, auch rechts-nach-links) ---------- */
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/;
function isRtlText(s) { for (const ch of s) { if (RTL_CHAR.test(ch)) return true; if (LTR_CHAR.test(ch)) return false; } return false; }
const PDF_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Naskh Arabic", Tahoma, Arial, sans-serif';
function wrapLine(ctx, text, max) {
  const fits = (x) => ctx.measureText(x).width <= max;
  const lines = []; let cur = "";
  for (const tok of text.split(/(\s+)/)) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) { if (cur) cur += " "; continue; }
    if (fits(cur + tok)) { cur += tok; continue; }
    if (cur.trim()) { lines.push(cur.trimEnd()); cur = ""; }
    if (fits(tok)) { cur = tok; continue; }
    for (const ch of tok) { if (!fits(cur + ch) && cur) { lines.push(cur); cur = ch; } else cur += ch; }   // überlange Wörter (z. B. Links) umbrechen
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines.length ? lines : [""];
}
const pdfStr = (x) => {
  let h = "FEFF";
  for (const ch of String(x || "")) {
    const cp = ch.codePointAt(0);
    if (cp > 0xffff) { const v = cp - 0x10000; h += (0xd800 + (v >> 10)).toString(16).padStart(4, "0") + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, "0"); }
    else h += cp.toString(16).padStart(4, "0");
  }
  return `<${h.toUpperCase()}>`;
};
function jpegPdf(images, W, H, title) {
  const enc = new TextEncoder(); const parts = []; const offs = []; let pos = 0;
  const push = (x) => { const u = typeof x === "string" ? enc.encode(x) : x; parts.push(u); pos += u.length; };
  const obj = (n, body) => { offs[n] = pos; push(`${n} 0 obj\n`); for (const b of body) push(b); push("\nendobj\n"); };
  push("%PDF-1.4\n%âãÏÓ\n");
  const n = images.length;
  const d = new Date(); const pad = (v) => String(v).padStart(2, "0");
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Kids [${images.map((_, i) => `${4 + 3 * i} 0 R`).join(" ")}] /Count ${n} >>`]);
  obj(3, [`<< /Title ${pdfStr(title)} /Producer (Briefe-App) /CreationDate (D:${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}) >>`]);
  images.forEach((img, i) => {
    const p = 4 + 3 * i;
    obj(p, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${i} ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`]);
    obj(p + 1, [`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`, img, "\nendstream"]);
    const cs = `q 595.28 0 0 841.89 0 0 cm /Im${i} Do Q`;
    obj(p + 2, [`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`]);
  });
  const size = 4 + 3 * n; const xref = pos;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let k = 1; k < size; k++) push(String(offs[k]).padStart(10, "0") + " 00000 n \n");
  push(`trailer\n<< /Size ${size} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: "application/pdf" });
}
async function renderPdf(blocks, title, footer) {
  const W = 1240, H = 1754, M = 110, PW = W - 2 * M;           // A4 mit 150 dpi
  const styles = { h1: [40, 700, 1.3], h2: [29, 700, 1.4], meta: [23, 400, 1.5], small: [21, 400, 1.45], p: [25, 400, 1.55] };
  const images = []; let cv = null; let ctx = null; let y = 0;
  // Jede fertige Seite wird sofort zu JPEG komprimiert und freigegeben (wenig Speicher auch bei vielen Seiten)
  const finish = async () => {
    if (!cv) return;
    ctx.font = `400 18px ${PDF_FONT}`; ctx.fillStyle = "#777"; ctx.direction = "ltr"; ctx.textAlign = "center";
    ctx.fillText(`${footer} · ${images.length + 1}`, W / 2, H - M / 2);
    const jpg = await new Promise((res, rej) => cv.toBlob((bl) => (bl ? res(bl) : rej(new Error("jpeg"))), "image/jpeg", 0.82));
    images.push(new Uint8Array(await jpg.arrayBuffer()));
    cv.width = 1; cv.height = 1; cv = null;
  };
  const newPage = async () => {
    await finish();
    cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); y = M;
  };
  const drawText = async (b) => {
    const [size, weight, lhf] = styles[b.type] || styles.p; const lh = Math.round(size * lhf);
    if (b.type === "h2") { y += 26; if (y + lh * 3 > H - M) await newPage(); }
    if (b.type === "h1" && y > M) y += 10;
    const font = `${weight} ${size}px ${PDF_FONT}`;
    ctx.font = font;
    for (const para of String(b.text ?? "").replace(/\r/g, "").split("\n")) {
      const rtl = isRtlText(para);
      ctx.direction = rtl ? "rtl" : "ltr";
      for (const line of para.trim() === "" ? [""] : wrapLine(ctx, para, PW)) {
        if (y + lh > H - M) { await newPage(); ctx.font = font; ctx.direction = rtl ? "rtl" : "ltr"; }
        y += lh;
        if (!line) continue;
        ctx.fillStyle = b.type === "meta" || b.type === "small" ? "#444" : "#111";
        ctx.textAlign = rtl ? "right" : "left";
        ctx.fillText(line, rtl ? W - M : M, y - Math.round(lh * 0.3));
      }
    }
    if (b.type === "h2") { ctx.fillStyle = "#bbb"; ctx.fillRect(M, y + 6, PW, 2); y += 16; }
    if (b.type === "h1") y += 8;
  };
  await newPage();
  for (const b of blocks) {
    if (b.type === "pagebreak") { if (y > M) await newPage(); continue; }
    if (b.type === "image") {
      let bmp = null;
      try { bmp = await createImageBitmap(b.blob); } catch (e) {}
      if (!bmp) { await drawText({ type: "small", text: b.fail }); continue; }
      await newPage();
      await drawText({ type: "small", text: b.caption });
      const avH = H - M - y - 20; const sc = Math.min(PW / bmp.width, avH / bmp.height);
      const w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
      ctx.drawImage(bmp, M + Math.round((PW - w) / 2), y + 10, w, h);
      try { bmp.close(); } catch (e) {}
      y = H;                                                         // nächster Inhalt auf neuer Seite
      continue;
    }
    await drawText(b);
  }
  await finish();
  return jpegPdf(images, W, H, title);
}

/* ---------- Ganzer Fall als eine PDF (für Anwalt, Beratungsstelle, Amt) ---------- */
async function buildCasePdf(cs, { photos, t, lang }) {
  const footer = t.exportedOn.replace("{d}", fmtD(todayIso(), lang));
  const letters = [...cs.letters].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const blocks = [{ type: "h1", text: cs.name }, { type: "meta", text: `${nLetters(letters.length, t)} · ${fmtD(todayIso(), lang)}` }, { type: "h2", text: t.casePdfToc }];
  letters.forEach((l, i) => blocks.push({ type: "p", text: `${i + 1}. ${fmtD(l.date, lang)} – ${l.subject}${l.deadline ? ` – ${t.fDeadline}: ${fmtD(l.deadline, lang)}` : ""}` }));
  for (const l of letters) {
    blocks.push({ type: "pagebreak" }, ...letterDocBlocks(l, cs, t, lang));
    if (!photos) continue;
    for (const f of l.files || []) {
      const pre = f.kind === "envelope" ? t.exEnvelope : f.kind === "attachment" ? t.exAttachment : t.exOriginal;
      if (!(f.type || "").startsWith("image/")) { blocks.push({ type: "small", text: t.casePdfSeparate.replace("{n}", f.name) }); continue; }
      const b = await fileGet(f.id);
      if (!b) blocks.push({ type: "small", text: t.casePdfMissing.replace("{n}", f.name) });
      else blocks.push({ type: "image", blob: b, caption: `${pre}: ${f.name}`, fail: t.casePdfImgFail.replace("{n}", f.name) });
    }
  }
  return renderPdf(blocks, cs.name, footer);
}

/* ---------- Inhalt je Brief (gleich für PDF und Textdatei) ---------- */
function letterDocBlocks(l, cs, t, lang) {
  const v = (x) => (x && x !== "—" && x !== "Unbekannt" ? x : "");
  const langName = (code) => (code ? LANGS.find((x) => x.code === code)?.label || code : "");
  const meta = [
    [t.caseWord, cs.name], [t.fSender, v(l.sender)], [t.fCaseNumber, v(l.caseNumber)], [t.fDate, fmtD(l.date, lang)],
    [t.fReceived, fmtD(l.receivedDate, lang)], [t.fDeadline, [fmtD(l.deadline, lang), l.deadlineNote].filter(Boolean).join(" – ")],
    [t.fPages, l.pages ? String(l.pages) : ""], [t.filesWord, (l.files || []).map((f) => f.name).join(", ")], [t.fNote, l.note],
  ].filter(([, x]) => x);
  const out = [{ type: "h1", text: l.subject || "—" }, ...meta.map(([k, x]) => ({ type: "meta", text: `${k}: ${x}` }))];
  out.push({ type: "h2", text: t.secOriginal }, { type: "p", text: l.original || "" });
  if (l.translation) out.push({ type: "h2", text: t.secTranslation + (l.translationLang ? ` (${langName(l.translationLang)})` : "") }, { type: "small", text: t.aiLabelTranslation }, { type: "p", text: l.translation });
  if (l.reply) out.push(
    { type: "h2", text: t.secReply },
    { type: "small", text: t.aiLabelReply + " · " + (l.replyConfirmedAt ? t.confirmedOn.replace("{d}", fmtD(l.replyConfirmedAt.slice(0, 10), lang)) : t.draftNotConfirmed) },
    { type: "p", text: l.reply }
  );
  if (l.replyLog?.length) out.push({ type: "h2", text: t.logTitle }, { type: "small", text: l.replyLog.map((e) => `${fmtDT(e.at, lang)} – ${logLabel(e, t)}`).join("\n") });
  if (l.replyTranslation) out.push({ type: "h2", text: t.secReplyTr + (l.replyTranslationLang ? ` (${langName(l.replyTranslationLang)})` : "") }, { type: "p", text: l.replyTranslation });
  return out;
}
function blocksToText(blocks, footer) {
  const out = [];
  for (const b of blocks) {
    if (b.type === "h1") out.push(b.text, "=".repeat(Math.min(60, [...b.text].length)));
    else if (b.type === "h2") out.push("", "", b.text, "-".repeat(Math.min(60, [...b.text].length)));
    else out.push(b.text);
  }
  out.push("", "", footer);
  return out.join("\n");
}
const textBytes = (x) => new TextEncoder().encode("﻿" + String(x).replace(/\r?\n/g, "\r\n"));   // BOM + CRLF: öffnet überall korrekt
const safeName = (x) => String(x || "").replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "").slice(0, 80) || "_";
// CSV-Zelle; Werte, die mit = + - @ beginnen, werden entschärft, damit Excel sie nicht als Formel ausführt
const csvCell = (x) => { let v = String(x ?? ""); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return `"${v.replace(/"/g, '""')}"`; };
const exportSizeEstimate = (cases, originals) =>
  cases.reduce((n, cs) => n + cs.letters.reduce((a, l) => a + 250000 + (originals ? (l.files || []).reduce((b, f) => b + (f.size || 0), 0) : 0), 0), 0);

async function buildExportZip(cases, { format, originals, t, lang, onProgress }) {
  if (exportSizeEstimate(cases, originals) > 1.8e9) throw new Error("toolarge");
  const root = `Briefe-Export-${todayIso()}/`;
  const footer = t.exportedOn.replace("{d}", fmtD(todayIso(), lang));
  const entries = []; const used = new Set(); const missing = [];
  const add = (path, data) => entries.push({ path: root + path, data, date: new Date() });
  const uniq = (p) => { let q = p, i = 2; while (used.has(q.toLowerCase())) q = p.replace(/(\.[^./ ]+)?$/, (m) => ` (${i++})${m}`); used.add(q.toLowerCase()); return q; };
  const head = [t.caseWord, t.fSubject, t.fSender, t.fCaseNumber, t.fDate, t.fReceived, t.fDeadline, t.fPages, t.filesWord, t.fNote, t.exFolder];
  const rows = [head]; let done = 0;
  for (let ci = 0; ci < cases.length; ci++) {
    const cs = cases[ci];
    const cf = uniq(`${String(ci + 1).padStart(2, "0")} ${safeName(cs.name)}`);
    const letters = [...cs.letters].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (!letters.length) add(cf + "/", new Uint8Array(0));
    for (const l of letters) {
      const lf = uniq(`${cf}/${l.date || "0000-00-00"} ${safeName(l.subject)}`);
      const blocks = letterDocBlocks(l, cs, t, lang);
      if (format !== "txt") add(`${lf}/${safeName(t.exLetterFile)}.pdf`, new Uint8Array(await (await renderPdf(blocks, l.subject, footer)).arrayBuffer()));
      if (format !== "pdf") add(`${lf}/${safeName(t.exLetterFile)}.txt`, textBytes(blocksToText(blocks, footer)));
      if (originals) for (const f of l.files || []) {
        const b = await fileGet(f.id);
        if (!b) { missing.push(`${cs.name} / ${l.subject}: ${f.name}`); continue; }
        const pre = f.kind === "envelope" ? t.exEnvelope : f.kind === "attachment" ? t.exAttachment : t.exOriginal;
        add(uniq(`${lf}/${safeName(pre)} - ${safeName(f.name)}`), new Uint8Array(await b.arrayBuffer()));
      }
      const v = (x) => (x && x !== "—" && x !== "Unbekannt" ? x : "");
      rows.push([cs.name, l.subject, v(l.sender), v(l.caseNumber), fmtD(l.date, lang), fmtD(l.receivedDate, lang),
        [fmtD(l.deadline, lang), l.deadlineNote].filter(Boolean).join(" – "), l.pages || "", (l.files || []).map((f) => f.name).join(", "), l.note || "", lf]);
      onProgress?.(++done);
      await new Promise((r) => setTimeout(r, 0));                  // Oberfläche bleibt bedienbar
    }
  }
  add(`${safeName(t.exOverview)}.csv`, textBytes(rows.map((r) => r.map(csvCell).join(";")).join("\n")));
  if (missing.length) add(`${safeName(t.exNotes)}.txt`, textBytes([t.exMissing, "", ...missing].join("\n")));
  return makeZip(entries);
}

/* ---------- Export-Dialog ---------- */
function ExportModal({ c, t, fontScale, rtl, cases, initialIds, format, setFormat, originals, setOriginals, progress, ready, onBuild, onDownload, onShare, onCloud, onReset, onClose }) {
  const [sel, setSel] = useState(initialIds && initialIds.length ? initialIds : cases.map((cs) => cs.id));
  const busy = !!progress;
  const chosen = cases.filter((cs) => sel.includes(cs.id));
  const est = exportSizeEstimate(chosen, originals);
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const radio = (val, label) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: `1px solid ${format === val ? c.accent : c.border}`, background: format === val ? c.accentSoft : "transparent" }}>
      <input type="radio" name="exfmt" checked={format === val} onChange={() => setFormat(val)} disabled={busy} /> <span>{label}</span>
    </label>
  );
  const big = { ...btnSmall(c), justifyContent: "center", padding: "12px 10px" };
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.exportTitle} onClose={busy ? () => {} : onClose} maxWidth={540}>
      {ready ? (
        <>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.exportReady}</div>
          <div style={{ color: c.textMuted, marginBottom: 12 }} dir="ltr">{ready.name} · {fmtSize(ready.blob.size)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={onDownload} style={{ ...big, background: c.accent, color: "#fff", borderColor: c.accent }}><Download size={15} /> {t.exportDownload}</button>
            <button onClick={onShare} style={big}><Share2 size={15} /> {t.exportShare}</button>
            <button onClick={onCloud} style={big}><Cloud size={15} /> {t.exportCloud}</button>
            <button onClick={onReset} style={{ ...btnSmall(c), justifyContent: "center" }}>{t.exportAgain}</button>
          </div>
        </>
      ) : (
        <>
          {cases.length === 0 ? <div style={{ color: c.textMuted, marginBottom: 12 }}>{t.exportNoCases}</div> : (
            <div style={{ marginBottom: 12 }}>
              <CheckRow checked={sel.length === cases.length} onChange={(v) => setSel(v ? cases.map((cs) => cs.id) : [])}><b>{t.exportAllCases}</b></CheckRow>
              <div style={{ maxHeight: 190, overflowY: "auto", paddingInlineStart: 8 }}>
                {cases.map((cs) => (
                  <CheckRow key={cs.id} checked={sel.includes(cs.id)} onChange={() => toggle(cs.id)}>
                    {cs.name} <span style={{ color: c.textMuted }}>({nLetters(cs.letters.length, t)})</span>
                  </CheckRow>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.exportFormatLabel}</div>
          {radio("pdf", t.fmtPdf)}{radio("txt", t.fmtTxt)}{radio("both", t.fmtBoth)}
          <div style={{ marginTop: 10 }}><CheckRow checked={originals} onChange={setOriginals}>{t.exportOriginals}</CheckRow></div>
          <InfoBox c={c}>{t.exportPdfNote}</InfoBox>
          <div style={{ color: est > 3e8 ? c.warn : c.textMuted, fontSize: 12 * fontScale, marginBottom: 10 }}>
            {(est > 3e8 ? t.exportSizeWarn : t.exportSize).replace("{s}", "~" + fmtSize(est))}
          </div>
          <button disabled={busy || !chosen.length} onClick={() => onBuild(sel)} style={btnPrimary(c, busy || !chosen.length)}>
            {busy ? t.exportBusy.replace("{n}", progress.done).replace("{total}", progress.total) : t.exportBuild}
          </button>
        </>
      )}
    </AppModal>
  );
}

/* =====================================================================
   PROFILE (mehrere Nutzer) · APP-SPERRE (PIN/Biometrie) · ALLE DATEN LÖSCHEN
   ===================================================================== */
let ACTIVE_PROFILE = "main";
// Speicherschlüssel je Profil; das erste Profil nutzt die alten Schlüssel, damit vorhandene Daten erhalten bleiben
const PK = (k, id = ACTIVE_PROFILE) => (id === "main" ? k : `${k}@${id}`);
const PROFILE_KEYS = ["briefe-app-cases", "briefe-app-prefs", "briefe-app-cloud", "briefe-app-account", "briefe-app-lang", "briefe-app-onboarded", "briefe-app-session"];
const sGet = async (k) => { try { const r = await window.storage?.get(k); return r?.value ?? null; } catch (e) { return null; } };
const sSet = async (k, v) => { try { await window.storage?.set(k, v); } catch (e) {} };
const sDel = async (k) => { try { if (window.storage?.delete) await window.storage.delete(k); else await window.storage?.set(k, ""); } catch (e) {} };
const PROFILE_COLORS = ["#1E5B4F", "#B5502A", "#3D5A99", "#7A4E9C", "#2E7D6B", "#9C6B2E"];
const DEFAULT_PROFILES = () => ({ list: [{ id: "main", name: "", color: PROFILE_COLORS[0], lock: null }], last: "main" });
const profileLabel = (p, t) => p.name || t.profileDefaultName;

function detectLang() {
  try {
    for (const d of (navigator.languages || [navigator.language || ""]).map((x) => String(x).toLowerCase())) {
      const hit = LANGS.find((l) => l.code === d) || LANGS.find((l) => l.code === d.split("-")[0]);
      if (hit) return hit.code;
    }
  } catch (e) {}
  return "de";
}
// Texte für Profilauswahl und Sperrbildschirm (bevor die eigentliche App geladen ist)
async function gateStrings(profileId) {
  const lang = (await sGet(PK("briefe-app-lang", profileId))) || detectLang();
  const rtl = RTL_LANGS.includes(lang);
  if (UI_STRINGS[lang]) return { t: UI_STRINGS[lang], rtl };
  try { const cache = JSON.parse((await sGet("briefe-app-ui-" + lang)) || "{}"); return { t: { ...UI_STRINGS.de, ...(cache.strings || {}) }, rtl }; }
  catch (e) { return { t: UI_STRINGS.de, rtl: false }; }
}

/* ---------- PIN: nur ein Prüfwert (PBKDF2) wird gespeichert, nie die PIN selbst ---------- */
const cryptoOk = () => typeof crypto !== "undefined" && !!crypto.subtle;
const u8ToB64 = (u8) => btoa(String.fromCharCode(...u8));
async function pinHash(pin, saltB64, iter = 150000) {
  const salt = saltB64 ? b64ToU8(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, key, 256);
  return { salt: u8ToB64(salt), hash: u8ToB64(new Uint8Array(bits)), iter };
}
/* ---------- Biometrie über die Geräte-Sperre (WebAuthn, Fingerabdruck/Gesicht) ---------- */
async function bioAvailable() {
  try { return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())); } catch (e) { return false; }
}
async function bioRegister(name) {
  if (!(await bioAvailable())) throw new Error("nobio");
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "Briefe-App" },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: name || "Briefe-App", displayName: name || "Briefe-App" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
    timeout: 60000, attestation: "none",
  } });
  return u8ToB64(new Uint8Array(cred.rawId));
}
async function bioVerify(idB64) {
  const a = await navigator.credentials.get({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: "public-key", id: b64ToU8(idB64) }],
    userVerification: "required", timeout: 60000,
  } });
  return !!(new Uint8Array(a.response.authenticatorData)[32] & 0x04);   // UV-Flag: Gerät hat den Nutzer geprüft
}

/* ---------- Löschen ---------- */
async function wipeProfileData(id) {
  try { for (const cs of JSON.parse((await sGet(PK("briefe-app-cases", id))) || "[]")) for (const l of cs.letters || []) for (const f of l.files || []) await fileDelete(f.id); } catch (e) {}
  // Konto auf dem Server löschen (Sitzungen, Freischaltungen; Bestellungen nur ohne Kontobezug wegen Aufbewahrungspflicht)
  if (SERVER_URL) {
    const tok = await sGet(PK("briefe-app-session", id));
    if (tok) { try { await fetch(SERVER_URL + "/account/delete", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: "{}" }); } catch (e) {} }
    if (id === ACTIVE_PROFILE) SESSION = null;
  }
  if (PUSH_ENDPOINT) {
    try { const p = JSON.parse((await sGet(PK("briefe-app-prefs", id))) || "{}"); if (p?.remind?.calToken) await calDelete(p.remind.calToken); } catch (e) {}
    if (pushSupported()) { try { await pushOff(id); } catch (e) {} }
  }
  for (const k of PROFILE_KEYS) await sDel(PK(k, id));
}
async function wipeEverything(profiles) {
  for (const p of profiles.list) await wipeProfileData(p.id);
  if (PUSH_ENDPOINT && pushSupported()) { try { const sub = await pushSub(false); if (sub) await sub.unsubscribe(); } catch (e) {} }
  for (const k of ["briefe-app-profiles", "briefe-app-shop", ...LANGS.map((l) => "briefe-app-ui-" + l.code)]) await sDel(k);
  memFiles.clear();
  try { const db = await fileDb(); db?.close(); fileDbPromise = null; indexedDB.deleteDatabase("briefe-app-files"); } catch (e) {}
}

/* ---------- Hülle: Profil wählen → ggf. entsperren → App ---------- */
export default function BriefeApp() {
  const [profiles, setProfilesRaw] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [gen, setGen] = useState(0);            // neu laden (z. B. nach "Alles löschen")
  const [coreGen, setCoreGen] = useState(0);    // App neu aufbauen
  const [gate, setGate] = useState({ t: UI_STRINGS.de, rtl: false });
  const opened = useRef(new Set());              // Profile, die in dieser Sitzung schon entsperrt waren
  const hiddenAt = useRef(0);
  const profilesRef = useRef(null); profilesRef.current = profiles;
  const dark = typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
  const c = dark ? palette.dark : palette.light;

  const saveProfiles = (p) => { setProfilesRaw(p); profilesRef.current = p; sSet("briefe-app-profiles", JSON.stringify(p)); };
  const updateProfile = (id, patch) => { const p = profilesRef.current; saveProfiles({ ...p, list: p.list.map((x) => (x.id === id ? { ...x, ...patch } : x)) }); };
  const enter = (p) => {
    ACTIVE_PROFILE = p.id; SESSION = null; setActiveId(p.id);
    const open = !p.lock || opened.current.has(p.id);
    setUnlocked(!p.lock);
    if (open) opened.current.add(p.id);
    gateStrings(p.id).then(setGate);
  };

  useEffect(() => {
    (async () => {
      let p = null;
      try { p = JSON.parse((await sGet("briefe-app-profiles")) || "null"); } catch (e) {}
      if (!p?.list?.length) p = DEFAULT_PROFILES();
      setProfilesRaw(p);
      if (p.list.length === 1) enter(p.list[0]);
      else { setActiveId(null); setGate(await gateStrings(p.last || p.list[0].id)); }
    })();
  }, [gen]);

  // Automatisch sperren, wenn die App eine Zeit lang im Hintergrund war
  useEffect(() => {
    const onVis = () => {
      const p = profilesRef.current?.list.find((x) => x.id === activeId);
      if (document.hidden) hiddenAt.current = Date.now();
      else if (p?.lock && hiddenAt.current && Date.now() - hiddenAt.current >= (p.lock.after ?? 1) * 60000) setUnlocked(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [activeId]);

  if (!profiles) return <div style={{ background: c.bg, height: "100vh" }} />;
  const active = profiles.list.find((p) => p.id === activeId);

  const api = {
    profiles: profiles.list, activeId, active,
    switchTo: (id) => { const p = profiles.list.find((x) => x.id === id); if (!p || id === activeId) return; saveProfiles({ ...profiles, last: id }); enter(p); },
    add: (name) => {
      const id = "p" + Date.now().toString(36);
      saveProfiles({ ...profiles, list: [...profiles.list, { id, name, color: PROFILE_COLORS[profiles.list.length % PROFILE_COLORS.length], lock: null }] });
      return id;
    },
    ensure: (id, name) => { const p = profilesRef.current; if (!p.list.some((x) => x.id === id)) saveProfiles({ ...p, list: [...p.list, { id, name, color: PROFILE_COLORS[p.list.length % PROFILE_COLORS.length], lock: null }] }); },
    rename: (id, name) => updateProfile(id, { name }),
    remove: async (id) => {
      await wipeProfileData(id);
      let list = profilesRef.current.list.filter((p) => p.id !== id);
      if (!list.length) list = DEFAULT_PROFILES().list;
      saveProfiles({ list, last: list[0].id });
      opened.current.delete(id);
      if (id === activeId) { setCoreGen((g) => g + 1); enter(list[0]); }
    },
    setLock: (id, lock) => updateProfile(id, { lock }),
    lockNow: () => setUnlocked(false),
    wipeAll: async () => {
      await wipeEverything(profilesRef.current);
      ACTIVE_PROFILE = "main"; opened.current = new Set();
      setProfilesRaw(null); setActiveId(null); setUnlocked(false); setCoreGen((g) => g + 1); setGen((g) => g + 1);
    },
    readCases: async (id) => { try { return JSON.parse((await sGet(PK("briefe-app-cases", id))) || "[]"); } catch (e) { return []; } },
    writeCases: (id, cases) => sSet(PK("briefe-app-cases", id), JSON.stringify(cases)),
  };

  if (!active) return <ProfilePicker c={c} t={gate.t} rtl={gate.rtl} profiles={profiles.list} onChoose={(id) => api.switchTo(id)} />;
  const showCore = unlocked || opened.current.has(active.id);
  return (
    <>
      {showCore && <BriefeCore key={active.id + ":" + coreGen} profileApi={api} />}
      {active.lock && !unlocked && (
        <LockScreen
          c={c} t={gate.t} rtl={gate.rtl} profile={active} multi={profiles.list.length > 1}
          onUnlock={() => { updateProfile(active.id, { lock: { ...active.lock, fails: 0, until: 0 } }); opened.current.add(active.id); setUnlocked(true); }}
          onFail={() => {
            const fails = (active.lock.fails || 0) + 1;
            const until = fails >= 5 ? Date.now() + Math.min(3600, 30 * 2 ** (fails - 5)) * 1000 : 0;
            updateProfile(active.id, { lock: { ...active.lock, fails, until } });
          }}
          onSwitch={() => { setActiveId(null); }}
          onForgotDelete={() => api.remove(active.id)}
        />
      )}
    </>
  );
}

function GateShell({ c, rtl, children }) {
  return (
    <div dir={rtl ? "rtl" : "ltr"} style={{ position: "fixed", inset: 0, zIndex: 10000, background: c.bg, color: c.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', system-ui, sans-serif", boxSizing: "border-box", overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>{children}</div>
    </div>
  );
}
function ProfilePicker({ c, t, rtl, profiles, onChoose }) {
  return (
    <GateShell c={c} rtl={rtl}>
      <h2 style={{ marginTop: 0 }}>{t.profileWho}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
        {profiles.map((p) => (
          <button key={p.id} onClick={() => onChoose(p.id)} style={{ width: 120, padding: "16px 8px", borderRadius: 14, border: `1px solid ${c.border}`, background: c.surface, color: c.text, cursor: "pointer" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: p.color, color: "#fff", fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              {(profileLabel(p, t)[0] || "?").toUpperCase()}
            </div>
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileLabel(p, t)}</div>
            {p.lock && <Lock size={13} style={{ marginTop: 4, opacity: 0.6 }} />}
          </button>
        ))}
      </div>
    </GateShell>
  );
}
function LockScreen({ c, t, rtl, profile, multi, onUnlock, onFail, onSwitch, onForgotDelete }) {
  const [pin, setPin] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false); const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const wait = Math.max(0, Math.ceil(((profile.lock.until || 0) - now) / 1000));
  const tryPin = async () => {
    if (busy || wait || !pin) return;
    setBusy(true); setErr("");
    try {
      const h = await pinHash(pin, profile.lock.salt, profile.lock.iter);
      if (h.hash === profile.lock.hash) onUnlock(); else { setErr(t.pinWrong); setPin(""); onFail(); }
    } catch (e) { setErr(t.lockNoCrypto); }
    setBusy(false);
  };
  const tryBio = async () => { try { if (await bioVerify(profile.lock.bio)) onUnlock(); } catch (e) {} };
  const inp = { width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.surface, color: c.text, fontSize: 22, letterSpacing: 8, textAlign: "center", boxSizing: "border-box" };
  return (
    <GateShell c={c} rtl={rtl}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: profile.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><Lock size={24} /></div>
      <h2 style={{ margin: "0 0 4px" }}>{t.unlockTitle}</h2>
      <div style={{ color: c.textMuted, marginBottom: 16 }}>{profileLabel(profile, t)}</div>
      {!forgot ? (
        <>
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} placeholder={t.pinEnter} aria-label={t.pinEnter}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && tryPin()} style={inp} autoFocus />
          {wait > 0 && <div style={{ color: c.warn, marginTop: 8 }}>{t.pinWait.replace("{n}", wait)}</div>}
          {err && !wait && <div style={{ color: c.warn, marginTop: 8 }}>{err}</div>}
          <button disabled={busy || !!wait || pin.length < 4} onClick={tryPin} style={{ ...btnPrimary(c, busy || !!wait || pin.length < 4), marginTop: 12 }}>{t.unlockBtn}</button>
          {profile.lock.bio && <button onClick={tryBio} style={{ ...btnSmall(c), margin: "10px auto 0", justifyContent: "center", width: "100%", padding: "11px" }}><Fingerprint size={16} /> {t.bioBtn}</button>}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, gap: 8 }}>
            <button onClick={() => setForgot(true)} style={{ background: "none", border: "none", color: c.textMuted, cursor: "pointer", textDecoration: "underline" }}>{t.pinForgot}</button>
            {multi && <button onClick={onSwitch} style={{ background: "none", border: "none", color: c.textMuted, cursor: "pointer", textDecoration: "underline" }}>{t.profileSwitch}</button>}
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: "start", marginBottom: 14 }}>{t.pinForgotInfo}</div>
          <button onClick={onForgotDelete} style={{ ...btnPrimary(c, false), background: c.warn, borderColor: c.warn }}>{t.profileDelete}</button>
          <button onClick={() => setForgot(false)} style={{ ...btnSmall(c), margin: "10px auto 0", justifyContent: "center", width: "100%" }}>{t.cancel}</button>
        </>
      )}
    </GateShell>
  );
}

/* ---------- Einstellungen: Profile ---------- */
function ProfilesModal({ c, t, fontScale, rtl, api, onClose }) {
  const [name, setName] = useState(""); const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);
  const inp = { flex: 1, minWidth: 0, padding: "9px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontFamily: "inherit" };
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.profilesTitle} onClose={busy ? () => {} : onClose}>
      <InfoBox c={c}>{t.profilesInfo}</InfoBox>
      {api.profiles.map((p) => (
        <div key={p.id} style={{ border: `1px solid ${p.id === api.activeId ? c.accent : c.border}`, borderRadius: 10, padding: "9px 10px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{(profileLabel(p, t)[0] || "?").toUpperCase()}</div>
            {edit?.id === p.id ? (
              <>
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={inp} autoFocus />
                <button onClick={() => { api.rename(p.id, edit.name.trim()); setEdit(null); }} style={btnSmall(c)}><Check size={13} /></button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{profileLabel(p, t)} {p.lock && <Lock size={12} style={{ opacity: 0.6 }} />}</span>
                {p.id === api.activeId ? <span style={{ color: c.accent, fontSize: 12 * fontScale, fontWeight: 700 }}>{t.profileActive}</span>
                  : <button onClick={() => { api.switchTo(p.id); onClose(); }} style={btnSmall(c)}>{t.profileSwitch}</button>}
                <button onClick={() => setEdit({ id: p.id, name: p.name })} title={t.profileRename} style={btnSmall(c)}><Pencil size={13} /></button>
                <button onClick={() => setDel(p.id)} title={t.profileDelete} style={{ ...btnSmall(c), color: c.warn }}><Trash2 size={13} /></button>
              </>
            )}
          </div>
          {del === p.id && (
            <div style={{ marginTop: 8, color: c.warn }}>
              {t.profileDeleteConfirm.replace("{n}", profileLabel(p, t))}
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button disabled={busy} onClick={async () => { setBusy(true); await api.remove(p.id); setBusy(false); setDel(null); }} style={{ ...btnSmall(c), color: "#fff", background: c.warn, borderColor: c.warn }}>{t.profileDelete}</button>
                <button onClick={() => setDel(null)} style={btnSmall(c)}>{t.cancel}</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.profileName} style={inp} />
        <button disabled={!name.trim()} onClick={() => { api.add(name.trim()); setName(""); }} style={{ ...btnSmall(c), opacity: name.trim() ? 1 : 0.5 }}><Plus size={14} /> {t.profileAdd}</button>
      </div>
    </AppModal>
  );
}

/* ---------- Einstellungen: App-Sperre ---------- */
function LockSettingsModal({ c, t, fontScale, rtl, profile, onSave, notify, onClose }) {
  const lock = profile.lock;
  const [cur, setCur] = useState(""); const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [after, setAfter] = useState(lock?.after ?? 1); const [bio, setBio] = useState(!!lock?.bio); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [bioOk, setBioOk] = useState(false);
  useEffect(() => { bioAvailable().then(setBioOk); }, []);
  const inp = { width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, boxSizing: "border-box", marginBottom: 8, letterSpacing: 4 };
  const digits = (set) => (e) => set(e.target.value.replace(/\D/g, "").slice(0, 8));
  const checkCur = async () => !lock || (await pinHash(cur, lock.salt, lock.iter)).hash === lock.hash;
  const save = async () => {
    setErr(""); setBusy(true);
    try {
      if (!(await checkCur())) { setErr(t.pinWrong); setBusy(false); return; }
      let base = lock;
      if (p1 || !lock) {
        if (!/^\d{4,8}$/.test(p1)) { setErr(t.pinShort); setBusy(false); return; }
        if (p1 !== p2) { setErr(t.pinMismatch); setBusy(false); return; }
        base = await pinHash(p1);
      }
      let bioId = bio ? lock?.bio || null : null;
      if (bio && !bioId) { try { bioId = await bioRegister(profileLabel(profile, t)); } catch (e) { notify(t.bioFail); bioId = null; } }
      onSave({ salt: base.salt, hash: base.hash, iter: base.iter, after: Number(after), bio: bioId, fails: 0, until: 0 });
      notify(t.lockSaved); onClose();
    } catch (e) { setErr(t.lockNoCrypto); }
    setBusy(false);
  };
  const remove = async () => {
    setErr(""); setBusy(true);
    try { if (!(await checkCur())) { setErr(t.pinWrong); setBusy(false); return; } onSave(null); notify(t.lockRemoved); onClose(); } catch (e) { setErr(t.lockNoCrypto); }
    setBusy(false);
  };
  if (!cryptoOk()) return <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.lockTitle} onClose={onClose}><InfoBox c={c}>{t.lockNoCrypto}</InfoBox></AppModal>;
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.lockTitle} onClose={onClose}>
      <InfoBox c={c}>{t.lockInfo}</InfoBox>
      {lock && <input type="password" inputMode="numeric" value={cur} onChange={digits(setCur)} placeholder={t.pinCurrent} aria-label={t.pinCurrent} style={inp} />}
      <input type="password" inputMode="numeric" value={p1} onChange={digits(setP1)} placeholder={t.pinNew} aria-label={t.pinNew} style={inp} />
      <input type="password" inputMode="numeric" value={p2} onChange={digits(setP2)} placeholder={t.pinRepeat} aria-label={t.pinRepeat} style={inp} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 10px", flexWrap: "wrap" }}>
        <span>{t.lockAfter}</span>
        <select value={after} onChange={(e) => setAfter(Number(e.target.value))} style={selectStyle(c)}>
          {[0, 1, 5, 15].map((m) => <option key={m} value={m}>{m === 0 ? t.lockAfterNow : t.lockAfterMin.replace("{n}", m)}</option>)}
        </select>
      </div>
      {bioOk && <CheckRow checked={bio} onChange={setBio}>{t.bioLabel}</CheckRow>}
      <div style={{ color: c.textMuted, fontSize: 12 * fontScale, marginBottom: 10 }}>{t.lockHonest}</div>
      {err && <div style={{ color: c.warn, marginBottom: 8 }}>{err}</div>}
      <button disabled={busy} onClick={save} style={btnPrimary(c, busy)}>{lock ? t.lockChange : t.lockSet}</button>
      {lock && <button disabled={busy} onClick={remove} style={{ ...btnSmall(c), marginTop: 10, color: c.warn, width: "100%", justifyContent: "center" }}>{t.lockRemove}</button>}
    </AppModal>
  );
}

/* ---------- Alle Daten löschen ---------- */
function WipeModal({ c, t, fontScale, rtl, multi, onExport, onWipeProfile, onWipeAll, onClose }) {
  const [scope, setScope] = useState(multi ? "profile" : "all"); const [word, setWord] = useState(""); const [busy, setBusy] = useState(false);
  const ok = word.trim().toUpperCase() === String(t.wipeWord).toUpperCase();
  const radio = (val, label) => (
    <label style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", border: `1px solid ${scope === val ? c.warn : c.border}`, borderRadius: 8, marginBottom: 6, cursor: "pointer" }}>
      <input type="radio" name="wipe" checked={scope === val} onChange={() => setScope(val)} /> {label}
    </label>
  );
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={t.wipeTitle} onClose={busy ? () => {} : onClose}>
      <InfoBox c={c}>{t.wipeInfo}</InfoBox>
      <button onClick={onExport} style={{ ...btnSmall(c), width: "100%", justifyContent: "center", padding: "11px", marginBottom: 12 }}><Download size={14} /> {t.wipeExportFirst}</button>
      {multi && <>{radio("profile", t.wipeScopeProfile)}{radio("all", t.wipeScopeAll)}</>}
      <div style={{ margin: "10px 0 6px" }}>{t.wipeType.replace("{w}", t.wipeWord)}</div>
      <input value={word} onChange={(e) => setWord(e.target.value)} aria-label={t.wipeType.replace("{w}", t.wipeWord)}
        style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text, boxSizing: "border-box", marginBottom: 10 }} />
      <button disabled={!ok || busy} onClick={async () => { setBusy(true); if (scope === "all") await onWipeAll(); else await onWipeProfile(); setBusy(false); }}
        style={{ ...btnPrimary(c, !ok || busy), background: ok ? c.warn : undefined, borderColor: ok ? c.warn : undefined }}>{busy ? "…" : t.wipeBtn}</button>
    </AppModal>
  );
}

/* =====================================================================
   VERLAUF · BEWERTUNG · EINFÜHRUNG · FALL-PDF-DIALOG
   ===================================================================== */
const fmtDT = (iso, lang) => { try { return new Date(iso).toLocaleString(lang || "de", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return iso; } };
const logLabel = (e, t) => {
  const m = { generated: t.logGenerated, edited: t.logEdited, confirmed: t.logConfirmed, pdf: t.logPdf, mail: t.logMail, share: t.logShare, translated: t.logTranslated };
  return (m[e.a] || e.a) + (e.lang ? ` (${LANGS.find((x) => x.code === e.lang)?.label || e.lang})` : "");
};
function ReplyLog({ c, t, fontScale, log, uiLang }) {
  const [open, setOpen] = useState(false); const [show, setShow] = useState(null);
  if (!log?.length) return null;
  const items = [...log].map((e, i) => ({ ...e, i })).reverse();
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen((o) => !o)} style={btnSmall(c)}><History size={13} /> {t.logTitle} ({log.length})</button>
      {open && (
        <div style={{ marginTop: 8, borderInlineStart: `2px solid ${c.border}`, paddingInlineStart: 10 }}>
          {items.map((e) => (
            <div key={e.i} style={{ fontSize: 12 * fontScale, marginBottom: 6 }}>
              <span style={{ color: c.textMuted }} dir="ltr">{fmtDT(e.at, uiLang)}</span> · {logLabel(e, t)}
              {e.text && (
                <button onClick={() => setShow(show === e.i ? null : e.i)} style={{ background: "none", border: "none", color: c.accent, cursor: "pointer", textDecoration: "underline", fontSize: 12 * fontScale }}>
                  {show === e.i ? t.logHide : t.logShow}
                </button>
              )}
              {show === e.i && <pre style={{ ...preStyle(c, fontScale), fontSize: 11.5 * fontScale, background: c.bg, padding: 8, borderRadius: 6, marginTop: 4 }} dir="ltr">{e.text}</pre>}
            </div>
          ))}
          <div style={{ fontSize: 11 * fontScale, color: c.textMuted }}>{t.logInfo}</div>
        </div>
      )}
    </div>
  );
}
function FeedbackBar({ c, t, fontScale, value, onRate }) {
  const [comment, setComment] = useState(value?.c || ""); const [open, setOpen] = useState(false);
  const on = (v) => (value?.v === v ? { background: v > 0 ? c.accent : c.warn, color: "#fff", borderColor: v > 0 ? c.accent : c.warn } : {});
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 8, fontSize: 12 * fontScale, color: c.textMuted }}>
      <span>{t.fbAsk}</span>
      <button aria-label={t.fbGood} title={t.fbGood} onClick={() => { onRate({ v: 1, c: comment }); setOpen(false); }} style={{ ...btnSmall(c), ...on(1) }}><ThumbsUp size={13} /></button>
      <button aria-label={t.fbBad} title={t.fbBad} onClick={() => { onRate({ v: -1, c: comment }); setOpen(true); }} style={{ ...btnSmall(c), ...on(-1) }}><ThumbsDown size={13} /></button>
      {value && !open && <span>{t.fbThanks}</span>}
      {open && (
        <div style={{ display: "flex", gap: 6, width: "100%" }}>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.fbComment} aria-label={t.fbComment}
            style={{ flex: 1, minWidth: 0, padding: "7px 9px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.bg, color: c.text }} />
          <button onClick={() => { onRate({ v: value?.v ?? -1, c: comment }); setOpen(false); }} style={btnSmall(c)}>{t.fbSave}</button>
        </div>
      )}
    </div>
  );
}
function Onboarding({ c, t, fontScale, rtl, uiLang, setUiLang, translating, onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: Languages, title: t.obLangTitle, text: t.obLangText, lang: true },
    { icon: Camera, title: t.obAddTitle, text: t.obAddText },
    { icon: Sparkles, title: t.obReadTitle, text: t.obReadText },
    { icon: Bell, title: t.obDeadTitle, text: t.obDeadText },
    { icon: Lock, title: t.obPrivTitle, text: t.obPrivText },
  ];
  const s0 = steps[step]; const Icon = s0.icon; const last = step === steps.length - 1;
  return (
    <div dir={rtl ? "rtl" : "ltr"} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: c.surface, color: c.text, borderRadius: 16, width: "100%", maxWidth: 440, padding: 22, boxSizing: "border-box", fontSize: 14 * fontScale, lineHeight: 1.55 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: c.accentSoft, color: c.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={22} /></div>
          <button onClick={onDone} style={{ background: "none", border: "none", color: c.textMuted, cursor: "pointer", textDecoration: "underline" }}>{t.obSkip}</button>
        </div>
        <h2 style={{ margin: "6px 0 8px", fontSize: 19 * fontScale }}>{s0.title}</h2>
        <div>{s0.text}</div>
        {s0.lang && (
          <div style={{ marginTop: 14 }}>
            <LanguagePicker c={c} fontScale={fontScale} value={uiLang} onChange={setUiLang} options={LANGS} />
            {translating && <div style={{ color: c.textMuted, marginTop: 8 }}>{t.obTranslating}</div>}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "18px 0 14px" }}>
          {steps.map((_, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === step ? c.accent : c.border }} />)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {step > 0 && <button onClick={() => setStep(step - 1)} style={{ ...btnSmall(c), flex: 1, justifyContent: "center", padding: 11 }}>{t.obBack}</button>}
          <button onClick={() => (last ? onDone() : setStep(step + 1))} style={{ ...btnPrimary(c, false), flex: 2 }}>{last ? t.obStart : t.obNext}</button>
        </div>
      </div>
    </div>
  );
}
function CasePdfModal({ c, t, fontScale, rtl, cs, photos, setPhotos, busy, onBuild, onClose }) {
  if (!cs) return null;
  return (
    <AppModal c={c} fontScale={fontScale} rtl={rtl} title={`${t.casePdf}: ${cs.name}`} onClose={onClose}>
      <InfoBox c={c}>{t.casePdfInfo}</InfoBox>
      <CheckRow checked={photos} onChange={setPhotos}>{t.casePdfPhotos}</CheckRow>
      <button disabled={busy || !cs.letters.length} onClick={onBuild} style={btnPrimary(c, busy || !cs.letters.length)}>{busy ? t.casePdfBusy : t.casePdfBuild}</button>
    </AppModal>
  );
}

/* =====================================================================
   SERVER-ANBINDUNG · KI-AUFGABEN
   ===================================================================== */
let SESSION = null;          // Sitzung des aktiven Profils (gespeichert unter briefe-app-session)
let SERVER_CFG = null;       // öffentliche Einstellungen des Servers (/config)
async function srv(pathname, body, retried) {
  if (!SESSION) SESSION = await sGet(PK("briefe-app-session"));
  if (!SESSION) {
    const r = await fetch(SERVER_URL + "/session/anon", { method: "POST" });
    if (!r.ok) throw Object.assign(new Error("session"), { status: r.status });
    SESSION = (await r.json()).token;
    await sSet(PK("briefe-app-session"), SESSION);
  }
  const r = await fetch(SERVER_URL + pathname, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + SESSION },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && j.error === "session" && !retried) { SESSION = null; await sDel(PK("briefe-app-session")); return srv(pathname, body, true); }
  if (!r.ok) throw Object.assign(new Error(j.error || "http " + r.status), { status: r.status, data: j });
  return j;
}
// Gleiche Anweisungen wie im Server (briefe-server/lib/ai.js). Mit Server baut dieser sie selbst.
function buildAiRequest(kind, p) {
  switch (kind) {
    case "extract": return { content: [...p.blocks, { type: "text", text: EXTRACT_PROMPT + (p.extraText ? "\n\nTextinhalt der Datei(en):" + p.extraText : "") }], max: 16000 };
    case "translate": return { prompt: `Übersetze den folgenden deutschen Behördenbrief exakt und vollständig nach ${p.lang}. Übernimm Datumsangaben, Beträge, Aktenzeichen, Kontonummern, Namen und Adressen unverändert (gleiche Ziffern, gleiche Schreibweise, keine Umrechnung in andere Kalender oder Währungen). Gib NUR die Übersetzung zurück, keine Erklärungen, keine Einleitung:\n\n${p.text}`, max: 16000 };
    case "reply": return { prompt: `Du hilfst, einen formellen deutschen Antwortbrief an eine Behörde zu entwerfen. Nutze AUSSCHLIESSLICH die Fakten aus dem Originalbrief und der Nutzerangabe unten. Erfinde keine Gesetze, keine Fristen, keine Zusagen, die nicht belegt sind. Formuliere höflich und sachlich auf Deutsch.${p.history ? `\n\nBisheriger Verlauf dieses Falls (nur als Hintergrund, nichts daraus erfinden):\n${p.history}` : ""}\n\nOriginalbrief:\n${p.original}\n\nAngabe des Nutzers (was er antworten möchte, evtl. in eigener Sprache formuliert):\n${p.note || "(keine zusätzliche Angabe, bitte allgemein und vorsichtig formulieren, ggf. um Fristverlängerung bitten falls thematisch passend)"}\n\nGib NUR den fertigen Brieftext zurück, ohne Erklärung.`, max: 4000 };
    case "replyTranslate": return { prompt: `Übersetze den folgenden deutschen Antwortbrief exakt und vollständig nach ${p.lang}, damit der Nutzer ihn vor dem Absenden prüfen kann. Gib NUR die Übersetzung zurück, keine Erklärungen:\n\n${p.text}`, max: 8000 };
    case "ui": return { prompt: `Übersetze die Werte (nicht die Schlüssel) dieses JSON-Objekts mit App-Oberflächentexten nach ${p.lang}. Platzhalter in geschweiften Klammern wie {n}, {d}, {total} unverändert übernehmen. Namen wie Briefe-App, Google Drive, OneDrive, Dropbox, iCloud, LUKSO, Universal Profile, PDF, E-Mail-Adressen und URLs nicht übersetzen. Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt mit exakt denselben Schlüsseln, ohne Markdown:\n\n${JSON.stringify(p.part)}`, max: 8000 };
    case "search": return { prompt: `Nenne bis zu 10 deutsche Suchbegriffe (Übersetzung und Synonyme; verwende bei Verben und Nomen den Wortstamm, damit Beugungen mitgefunden werden), mit denen man in deutschen Behördenbriefen nach "${String(p.q).replace(/"/g, "'")}" suchen würde. Antworte NUR mit einem JSON-Array aus Strings.`, max: 400 };
    case "caseName": return { prompt: `Übersetze NUR diesen kurzen Titel eines Behördenfalls nach ${p.lang}, gib nur die Übersetzung zurück ohne Anführungszeichen, ohne Erklärung: "${String(p.name).replace(/"/g, "'")}"`, max: 200 };
    case "check": return { prompt: CHECK_PROMPT(p.lang) + `\n\nDEUTSCHES ORIGINAL:\n${p.original}\n\nÜBERSETZUNG:\n${p.translation}`, max: 2000 };
    default: throw new Error("kind");
  }
}
// Gegenprobe durch die KI: vergleicht Original und Übersetzung (Text muss mit lib/ai.js auf dem Server übereinstimmen)
const CHECK_PROMPT = (lang) => `Du prüfst die Übersetzung eines deutschen Behördenbriefs. Vergleiche das deutsche Original mit der Übersetzung. Prüfe: Fehlt etwas? Wurde etwas hinzugefügt? Ist ein Datum, eine Frist, ein Betrag, ein Aktenzeichen, ein Name oder die Bedeutung eines Satzes verändert? Antworte auf ${lang}. Wenn du keine Abweichung findest, antworte mit einem einzigen kurzen Satz, dass keine Abweichungen gefunden wurden. Sonst liste die Abweichungen kurz auf und zitiere dabei die Stelle aus dem deutschen Original. Erfinde nichts und bewerte den Inhalt des Briefs nicht.`;
async function aiTask(kind, p) {
  if (SERVER_URL) return (await srv("/ai/" + kind, p)).text;
  const r = buildAiRequest(kind, p);
  return r.content ? askClaudeBlocks(r.content, r.max) : askClaude(r.prompt, r.max);
}

/* =====================================================================
   GEGENPROBE DER ÜBERSETZUNG
   Ohne KI: Datumsangaben, Beträge, Kontonummern und das Aktenzeichen aus dem
   Original müssen mit denselben Ziffern in der Übersetzung stehen.
   ===================================================================== */
const toLatinDigits = (s) => String(s || "").replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x0660).replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x06F0).replace(/[\u066B]/g, ",").replace(/[\u066C]/g, ".");
// Zahl in einheitliche Form bringen: "1.234,50" / "1,234.50" / "1 234,5" → "1234.5"
function canonNumber(raw) {
  let x = String(raw).replace(/[\s\u00A0\u202F']/g, "");
  const m = x.match(/^(.*?)[.,](\d{1,2})$/);
  let int = x, dec = "";
  if (m && /\d/.test(m[1])) { int = m[1]; dec = m[2]; }
  int = int.replace(/[.,]/g, "").replace(/^0+(?=\d)/, ""); dec = dec.replace(/0+$/, "");
  return dec ? int + "." + dec : int;
}
const DE_MONTHS = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
function criticalItems(letter) {
  const text = String(letter?.original || ""); const out = []; const seen = new Set();
  const add = (kind, raw, key) => { const k = kind + ":" + JSON.stringify(key); if (!seen.has(k)) { seen.add(k); out.push({ kind, raw: raw.trim(), key }); } };
  for (const m of text.matchAll(/(?<![\d.])(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})(?!\d)/g)) if (+m[1] <= 31 && +m[2] <= 12) add("date", m[0], [+m[1], +m[2], +m[3]]);
  for (const m of text.matchAll(new RegExp("(?<!\\d)(\\d{1,2})\\.\\s?(" + DE_MONTHS.join("|") + ")\\s+(\\d{4})(?!\\d)", "gi"))) add("date", m[0], [+m[1], DE_MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[3]]);
  for (const m of text.matchAll(/(?<![\d.,])(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s?(?:€|EUR\b|Euro\b)/g)) add("amount", m[0], canonNumber(m[1]));
  for (const m of text.matchAll(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g)) add("iban", m[0], m[0].replace(/\s/g, "").toUpperCase());
  const cn = String(letter?.caseNumber || "").trim();
  if (cn && /\d/.test(cn)) add("case", cn, cn.replace(/\s/g, "").toLowerCase());
  return out;
}
function checkTranslation(letter) {
  const items = criticalItems(letter);
  const tr = toLatinDigits(letter?.translation || "");
  const squeezed = tr.replace(/[\s\u00A0\u202F]/g, "");
  const numbers = new Set((tr.match(/\d[\d.,\s\u00A0\u202F']*\d|\d/g) || []).flatMap((n) => [canonNumber(n), ...n.split(/[\s\u00A0\u202F]+/).map(canonNumber)]));
  const tokens = new Set(tr.match(/\d+/g) || []);
  const has = (it) => {
    if (it.kind === "amount") return numbers.has(it.key);
    if (it.kind === "iban") return squeezed.toUpperCase().includes(it.key);
    if (it.kind === "case") return squeezed.toLowerCase().includes(it.key);
    const [d, mo, y] = it.key; const p = (n) => `0?${n}`;
    const num = [new RegExp(`(?<!\\d)${p(d)}\\s?[./-]\\s?${p(mo)}\\s?[./-]\\s?${y}(?!\\d)`), new RegExp(`(?<!\\d)${p(mo)}\\s?[./-]\\s?${p(d)}\\s?[./-]\\s?${y}(?!\\d)`), new RegExp(`(?<!\\d)${y}\\s?[./-]\\s?${p(mo)}\\s?[./-]\\s?${p(d)}(?!\\d)`)];
    if (num.some((re) => re.test(tr))) return true;
    // Monat als Wort (z. B. "28 November 2026"): Tag und Jahr müssen als eigene Zahlen vorkommen
    return tokens.has(String(y)) && (tokens.has(String(d)) || tokens.has(String(d).padStart(2, "0")));
  };
  return { items, missing: items.filter((it) => !has(it)) };
}
function TranslationCheck({ c, t, fontScale, letter, busy, onAiCheck }) {
  const { items, missing } = useMemo(() => checkTranslation(letter), [letter.original, letter.translation, letter.caseNumber]);
  const ok = missing.length === 0;
  const chk = letter.translationCheck && letter.translationCheck.text ? letter.translationCheck : null;
  return (
    <div style={{ border: `1px solid ${ok ? c.border : c.warn}`, borderRadius: 10, padding: "10px 12px", marginTop: 10, fontSize: 12.5 * fontScale, lineHeight: 1.5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: ok ? c.accent : c.warn }}>
        {ok ? <Check size={15} /> : <AlertTriangle size={15} />} {t.checkTitle}
      </div>
      {items.length === 0 && <div style={{ color: c.textMuted }}>{t.checkNone}</div>}
      {items.length > 0 && ok && <div>{t.checkOk.replace("{n}", items.length)}</div>}
      {!ok && (
        <>
          <div>{t.checkMissing}</div>
          <ul dir="ltr" style={{ margin: "4px 0 6px", paddingInlineStart: 20 }}>{missing.map((it, i) => <li key={i}>{it.raw}</li>)}</ul>
          <div style={{ fontWeight: 600 }}>{t.checkCompare}</div>
        </>
      )}
      <div style={{ marginTop: 8 }}>
        <button onClick={onAiCheck} disabled={busy} style={btnSmall(c)}><Sparkles size={13} /> {busy ? "…" : t.checkAi}</button>
      </div>
      {chk && (
        <div style={{ marginTop: 8 }}>
          <pre style={{ ...preStyle(c, fontScale), margin: 0 }} dir={RTL_LANGS.includes(chk.lang) ? "rtl" : "ltr"}>{chk.text}</pre>
          <AiLabel c={c} t={t} fontScale={fontScale} text={t.checkAiLabel} />
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   ESKALATION · FALLVERLAUF · KI-KENNZEICHNUNG
   ===================================================================== */
// Kritische Briefe erkennt die App ohne KI an festen Begriffen (lieber einmal zu viel zur Beratung schicken)
const CRITICAL_PATTERNS = [
  ["escCourt", /(klage|sozialgericht|verwaltungsgericht|amtsgericht|landgericht|arbeitsgericht|mündliche[nr]? verhandlung|ladung zum termin)/],
  ["escCriminal", /(strafanzeige|strafbefehl|staatsanwaltschaft|ermittlungsverfahren|beschuldigte|vorladung|bußgeldbescheid|haftbefehl)/],
  ["escEnforcement", /(zwangsvollstreckung|vollstreckungsbescheid|mahnbescheid|pfändung|gerichtsvollzieher|vermögensauskunft)/],
  ["escHousing", /(räumung|fristlose kündigung|kündigung des mietverhältnisses|kündigung ihres mietverhältnisses)/],
  ["escBenefits", /(leistungsminderung|sanktion|einstellung der leistung|leistungen werden eingestellt|erstattungsbescheid|rückforderung)/],
  ["escResidence", /(ausweisung|abschiebung|ausreisepflicht|aufenthaltsbeendigung|abschiebungsandrohung)/],
];
function criticalReasons(l, daysUntil) {
  if (!l) return [];
  const hay = `${l.subject || ""}\n${l.original || ""}`.toLowerCase();
  const out = CRITICAL_PATTERNS.filter(([, re]) => re.test(hay)).map(([k]) => k);
  if (l.deadline && typeof daysUntil === "function") { const d = daysUntil(l.deadline); if (d !== null && d <= 7) out.push("escDeadline"); }
  return out;
}
function EscalationBox({ c, t, fontScale, reasons }) {
  return (
    <div role="alert" style={{ border: `2px solid ${c.warn}`, borderRadius: 10, padding: "12px 14px", margin: "10px 0 12px", background: c.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: c.warn, marginBottom: 6 }}><AlertTriangle size={16} /> {t.escTitle}</div>
      <div style={{ marginBottom: 6 }}>{t.escIntro}</div>
      <ul style={{ margin: "0 0 10px", paddingInlineStart: 20 }}>{reasons.map((r) => <li key={r}>{t[r]}</li>)}</ul>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.escHelpTitle}</div>
      <ul style={{ margin: "0 0 8px", paddingInlineStart: 20, fontSize: 12.5 * fontScale }}>
        {["escHelp1", "escHelp2", "escHelp3", "escHelp4", "escHelp5"].map((k) => <li key={k} style={{ marginBottom: 3 }}>{t[k]}</li>)}
      </ul>
      <div style={{ fontSize: 12 * fontScale, fontWeight: 600 }}>{t.escDeadlineHint}</div>
    </div>
  );
}
// Bisheriger Verlauf des Falls für die Antwort (ältere Briefe und bestätigte Antworten, gekürzt)
function caseHistory(cs, currentId) {
  if (!cs) return "";
  const parts = [];
  for (const l of [...cs.letters].filter((x) => x.id !== currentId).sort((a, b) => (a.date || "").localeCompare(b.date || ""))) {
    parts.push(`--- Brief vom ${l.date || "?"}: ${l.subject || ""} (Absender: ${l.sender || "?"}) ---\n${String(l.original || "").slice(0, 3000)}`);
    if (l.reply && l.replyConfirmedAt) parts.push(`--- Unsere Antwort darauf (bestätigt am ${l.replyConfirmedAt.slice(0, 10)}) ---\n${String(l.reply).slice(0, 2000)}`);
  }
  const all = parts.join("\n\n");
  return all.length > 20000 ? all.slice(all.length - 20000) : all;   // bei sehr langen Fällen die neuesten Teile
}
function AiLabel({ c, t, fontScale, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 * fontScale, color: c.textMuted, marginTop: 6 }}>
      <span style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: "0 5px", fontWeight: 700, fontSize: 10.5 * fontScale }}>KI</span> {text}
    </div>
  );
}
