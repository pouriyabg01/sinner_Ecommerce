#!/bin/sh
# پیش از بالا آمدن PHP، پایگاه‌داده باید آماده باشد و مهاجرت‌ها اجرا شده باشند.
set -e

if [ "$1" = "php-fpm" ]; then
  echo "[entrypoint] در انتظار پایگاه داده…"
  tries=0
  until php -r '
    $dsn = sprintf("pgsql:host=%s;port=%s;dbname=%s", getenv("DB_HOST"), getenv("DB_PORT") ?: 5432, getenv("DB_DATABASE"));
    try { new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD")); exit(0); } catch (Throwable $e) { exit(1); }
  ' 2>/dev/null; do
    tries=$((tries + 1))
    if [ "$tries" -gt 60 ]; then
      echo "[entrypoint] پایگاه داده بالا نیامد" >&2
      exit 1
    fi
    sleep 2
  done

  # کش تنظیمات از اجرای قبلی نباید بماند؛ متغیرهای محیطی ممکن است عوض شده باشند.
  php artisan config:clear >/dev/null 2>&1 || true

  php artisan migrate --force

  # فقط بار اول و فقط اگر خواسته شده باشد؛ روی داده‌ی واقعی نباید اجرا شود.
  if [ "$DB_SEED" = "true" ]; then
    php artisan db:seed --force
  fi

  # public/storage در تصویر ساخته نمی‌شود چون مقصدش یک ولوم مشترک است.
  [ -L public/storage ] || php artisan storage:link

  php artisan config:cache
  php artisan route:cache
  php artisan view:cache

  chown -R www-data:www-data storage bootstrap/cache
fi

exec docker-php-entrypoint "$@"
