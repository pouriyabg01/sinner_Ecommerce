#!/usr/bin/env bash
# بازگرداندن بسته‌ی داده روی سرور. از ریشه‌ی پروژه اجرا شود:
#   bash scripts/import-data.sh deploy-data-XXXXXX
set -euo pipefail

cd "$(dirname "$0")/.."
PACK="${1:?نام پوشه‌ی بسته را بده}"

DB_USER="$(grep -m1 '^DB_USERNAME=' .env | cut -d= -f2-)"
DB_NAME="$(grep -m1 '^DB_DATABASE=' .env | cut -d= -f2-)"

echo "== پایگاه داده =="
docker compose exec -T postgres pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists < "$PACK/database.dump"

echo "== تصویرهای آپلودشده =="
docker run --rm -v sinner_storage:/data -v "$PWD/$PACK:/in" alpine \
  sh -c 'tar xzf /in/uploads.tgz -C /data'

echo "== مهاجرت‌های احتمالی تازه =="
docker compose exec -T backend php artisan migrate --force
docker compose restart backend

echo "تمام شد."
