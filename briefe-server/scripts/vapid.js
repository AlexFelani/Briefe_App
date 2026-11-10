// Erzeugt die Schlüssel für Push-Erinnerungen. Ausgabe in die Datei .env übernehmen.
const { generateVapidKeys } = require("../lib/webpush");
const k = generateVapidKeys();
console.log(`VAPID_PUBLIC=${k.publicKey}\nVAPID_PRIVATE=${k.privateKey}`);
