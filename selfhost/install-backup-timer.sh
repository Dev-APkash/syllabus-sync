#!/bin/bash
# Schedules backup.sh to run every night (around 3:30 AM) with a systemd timer. Run once,
# from this folder, as the user that runs Syllabus Sync (it asks for your sudo password):
#
#   bash install-backup-timer.sh
#
# Backups go to ~/syllabus-sync-backups (newest 7 kept). Missed runs (machine off at 3:30)
# happen at the next start. To remove it again:
#   sudo systemctl disable --now syllabus-sync-backup.timer
#   sudo rm /etc/systemd/system/syllabus-sync-backup.service /etc/systemd/system/syllabus-sync-backup.timer
set -euo pipefail
cd "$(dirname "$0")"

[ -f backup.sh ] && [ -f .env ] || { echo "Run this from the selfhost folder of a set-up install."; exit 1; }
dir="$PWD"
user="$(id -un)"
id -nG "$user" | grep -qw docker || {
  echo "$user isn't in the docker group, so the backup couldn't stop and start the app."
  exit 1
}

sudo tee /etc/systemd/system/syllabus-sync-backup.service >/dev/null <<EOF
[Unit]
Description=Back up Syllabus Sync
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
User=$user
WorkingDirectory=$dir
ExecStart=/usr/bin/bash $dir/backup.sh
EOF

sudo tee /etc/systemd/system/syllabus-sync-backup.timer >/dev/null <<EOF
[Unit]
Description=Back up Syllabus Sync every night

[Timer]
OnCalendar=*-*-* 03:30:00
RandomizedDelaySec=15min
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now syllabus-sync-backup.timer
echo "Nightly backup scheduled. Next run:"
systemctl list-timers syllabus-sync-backup.timer --no-pager
echo
echo "Run one now with:  sudo systemctl start syllabus-sync-backup.service"
echo "See how it went:   journalctl -u syllabus-sync-backup.service -n 20 --no-pager"
