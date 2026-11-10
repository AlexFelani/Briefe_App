#!/bin/sh
# Tägliche Sicherung der Server-Datenbank, verschlüsselt (Passwort in /opt/briefe-server/.backup-pass, nur für root lesbar).
# Beispiel-Cronjob: 15 3 * * * /opt/briefe-server/deploy/backup.sh
set -e
cd /opt/briefe-server
STAMP=$(date +%Y-%m-%d)
mkdir -p backups
sqlite3 data/briefe.db ".backup 'backups/briefe-$STAMP.db'"
gpg --batch --yes --pinentry-mode loopback --passphrase-file .backup-pass -c "backups/briefe-$STAMP.db"
rm "backups/briefe-$STAMP.db"
find backups -name '*.gpg' -mtime +30 -delete
