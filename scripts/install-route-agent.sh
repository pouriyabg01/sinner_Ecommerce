#!/usr/bin/env bash
# نصب سرویسی که مسیر مستقیمِ سرور را خودکار نگه می‌دارد.
#
# بدون این، هر بار که وای‌فای یا فیلترشکن عوض می‌شود مسیر از بین می‌رود و
# اتصال به سرور قطع می‌شود.
#
#   sudo bash scripts/install-route-agent.sh
#   sudo bash scripts/install-route-agent.sh --remove
set -euo pipefail

cd "$(dirname "$0")/.."
LABEL=com.sinner.serverroute
TARGET="/Library/LaunchDaemons/$LABEL.plist"

if [ "$(id -u)" -ne 0 ]; then
  echo "با sudo اجرا کن:  sudo bash $0" >&2
  exit 1
fi

launchctl bootout system "$TARGET" 2>/dev/null || true

if [ "${1:-}" = "--remove" ]; then
  rm -f "$TARGET"
  echo "سرویس برداشته شد."
  exit 0
fi

install -m 644 -o root -g wheel "scripts/$LABEL.plist" "$TARGET"
launchctl bootstrap system "$TARGET"
echo "سرویس نصب شد. از این به بعد مسیر سرور خودکار نگه داشته می‌شود."
sleep 2
route -n get 94.184.43.155 | sed -n '/interface/p;/gateway/p'
