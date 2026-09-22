#!/usr/bin/env bash
# گرفتن یک بسته از داده‌ی همین دستگاه (پایگاه داده + تصویرهای آپلودشده)
# تا روی سرور بازگردانده شود.
#
#   bash scripts/export-data.sh            # از پایگاه داده‌ی توسعه (درگاه ۵۴۳۳)
#   SOURCE=docker bash scripts/export-data.sh   # از پایگاه داده‌ی داکری
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="deploy-data-$(date +%Y%m%d-%H%M)"
mkdir -p "$OUT"

# روی رایانه‌ی خودتان پایگاه داده‌ی توسعه ملاک است؛ روی سرور فقط پایگاه داده‌ی
# داکری وجود دارد، پس خودش تشخیص می‌دهد.
if [ -z "${SOURCE:-}" ]; then
  if docker ps --format '{{.Names}}' | grep -qx sinner-postgres; then SOURCE=dev; else SOURCE=docker; fi
fi

if [ "$SOURCE" = "docker" ]; then
  DB_CONTAINER=sinner-db
  DB_USER="$(grep -m1 '^DB_USERNAME=' .env | cut -d= -f2-)"
  DB_NAME="$(grep -m1 '^DB_DATABASE=' .env | cut -d= -f2-)"
  UPLOADS_FROM=volume
else
  DB_CONTAINER=sinner-postgres
  DB_USER=sinner
  DB_NAME=sinner
  UPLOADS_FROM=path
fi

echo "== پایگاه داده از $DB_CONTAINER =="
docker exec -i "$DB_CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$OUT/database.dump"

echo "== تصویرهای آپلودشده =="
if [ "$UPLOADS_FROM" = "volume" ]; then
  docker run --rm -v sinner_storage:/data -v "$PWD/$OUT:/out" alpine \
    tar czf /out/uploads.tgz -C /data .
else
  tar czf "$OUT/uploads.tgz" -C backend/storage/app/public .
fi

# کلید رمزنگاری باید روی سرور همان باشد، وگرنه کلید سرویس پیامک و هر داده‌ی
# رمزشده‌ی دیگری باز نمی‌شود. روی سرور این فایل نیست و لازم هم نیست.
if [ -f backend/.env ]; then
  echo "== کلید رمزنگاری =="
  grep -m1 '^APP_KEY=' backend/.env > "$OUT/APP_KEY.txt"
fi

du -sh "$OUT"/* 
echo
echo "بسته آماده است: $OUT"
echo "با این دستور روی سرور بگذارش:"
echo "  rsync -avz $OUT/ <کاربر>@<نشانی-سرور>:~/SInner/$OUT/"
