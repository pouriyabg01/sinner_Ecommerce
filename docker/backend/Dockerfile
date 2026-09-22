# کانتکست ساخت، ریشه‌ی پروژه است (نه پوشه‌ی backend)، چون فایل‌های تنظیمات
# داکر زیر docker/ جمع شده‌اند.

# ---------- مرحله‌ی وابستگی‌ها ----------
# وابستگی‌ها جدا نصب می‌شوند تا تا وقتی composer.lock عوض نشده لایه‌ی کش بماند
# و هر تغییر کد، دوباره کل پکیج‌ها را دانلود نکند.
FROM composer:2 AS vendor

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY backend/ ./
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# ---------- تصویر نهایی ----------
FROM php:8.4-fpm-alpine

# pdo_pgsql برای پستگرس، intl برای تاریخ شمسی در آمار، opcache برای سرعت.
RUN apk add --no-cache postgresql-dev icu-dev \
 && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
 && docker-php-ext-install -j"$(nproc)" pdo_pgsql pgsql intl bcmath opcache \
 && apk del .build-deps \
 && rm -rf /tmp/*

COPY docker/backend/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/backend/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

WORKDIR /var/www/html
COPY --from=vendor /app /var/www/html

# لاراول فقط در storage و bootstrap/cache می‌نویسد؛ بقیه‌ی کد خواندنی است.
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
      storage/logs storage/app/public bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 9000
ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]
