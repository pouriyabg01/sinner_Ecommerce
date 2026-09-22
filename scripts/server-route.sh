#!/usr/bin/env bash
# ترافیکِ سرور را از فیلترشکن بیرون می‌گذارد.
#
# مشکل: سرور در ایران است و اتصالِ آمده از فیلترشکن را قطع می‌کند، ولی
# فیلترشکن باید روشن بماند. راه‌حل: فقط همین یک نشانی از مسیر مستقیم برود.
#
#   sudo bash scripts/server-route.sh            # اضافه کردن
#   sudo bash scripts/server-route.sh --remove   # برداشتن
#
# بعد از هر بار وصل شدن دوباره‌ی فیلترشکن یا عوض شدن وای‌فای، دوباره اجرا شود.
set -euo pipefail

SERVER_IP="${SERVER_IP:-94.184.43.155}"
IFACE="${IFACE:-en0}"

if [ "$(id -u)" -ne 0 ]; then
  echo "با sudo اجرا کن:  sudo bash $0" >&2
  exit 1
fi

GATEWAY="$(ipconfig getoption "$IFACE" router 2>/dev/null || true)"
if [ -z "$GATEWAY" ]; then
  echo "درگاه شبکه‌ی $IFACE پیدا نشد؛ آیا به وای‌فای وصلی؟" >&2
  exit 1
fi

route -n delete -host "$SERVER_IP" >/dev/null 2>&1 || true

if [ "${1:-}" = "--remove" ]; then
  echo "مسیر مستقیم برداشته شد؛ از این به بعد $SERVER_IP هم از تونل می‌رود."
  exit 0
fi

route -n add -host "$SERVER_IP" "$GATEWAY" >/dev/null
echo "مسیر مستقیم اضافه شد: $SERVER_IP  →  $GATEWAY (روی $IFACE)"
route -n get "$SERVER_IP" | sed -n '/interface/p;/gateway/p'
