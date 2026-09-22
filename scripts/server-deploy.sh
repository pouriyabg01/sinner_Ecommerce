#!/usr/bin/env bash
# روی سرور اجرا می‌شود، بعد از هر push.
#
# فقط سرویسی را دوباره می‌سازد که کدش عوض شده؛ ساخت بخش جلویی روی سرور
# حدود نیم ساعت طول می‌کشد و نباید بی‌دلیل تکرار شود.
#
#   bash scripts/server-deploy.sh "front end/src/app/page.tsx backend/routes/api.php"
set -euo pipefail

cd "$(dirname "$0")/.."
CHANGED="${1:-}"

services=""
case "$CHANGED" in
  *"front end/"*|*"docker/frontend/"*) services="$services frontend" ;;
esac
case "$CHANGED" in
  *"backend/"*|*"docker/backend/"*) services="$services backend" ;;
esac

echo "== تغییرها =="
echo "$CHANGED" | tr ' ' '\n' | grep -v '^$' | head -20

if [ -n "$services" ]; then
  echo "== ساخت دوباره‌ی:$services =="
  # shellcheck disable=SC2086
  docker compose build $services
fi

echo "== بالا آوردن =="
docker compose up -d

echo "== وضعیت =="
docker compose ps --format '{{.Name}} {{.Status}}'

echo "== آزمون =="
for p in /up /api/v1/products /; do
  printf '%s -> %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "http://127.0.0.1$p")"
done

echo "== پایان: $(date '+%Y-%m-%d %H:%M') =="
