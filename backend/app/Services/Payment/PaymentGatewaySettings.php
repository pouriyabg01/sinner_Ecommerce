<?php

namespace App\Services\Payment;

use App\Models\SiteDocument;
use App\Support\SitePayments;
use Illuminate\Support\Facades\Crypt;

/**
 * تنظیمات درگاه در سند جداگانه‌ی `payment_gateway` ذخیره می‌شود — نه در سند
 * `settings`، چون آن یکی بدون ورود خوانده می‌شود و شناسه‌ی پذیرنده نباید به
 * مرورگر برسد. مقدارهای نشان‌دار به‌عنوان secret رمزنگاری‌شده می‌نشینند.
 *
 * هر درگاه اعتبارنامه‌ی خودش را جدا نگه می‌دارد، پس عوض کردن درگاه فعال
 * مقادیر درگاه قبلی را پاک نمی‌کند.
 */
class PaymentGatewaySettings
{
    public const DOCUMENT = 'payment_gateway';

    /** درگاه فعال؛ وقتی هنوز چیزی ذخیره نشده همان پیش‌فرض پکیج */
    public static function driver(): string
    {
        $stored = SiteDocument::payloadFor(self::DOCUMENT)['driver'] ?? null;

        return PaymentGateways::exists((string) $stored) ? (string) $stored : 'zarinpal';
    }

    /**
     * درگاه دمو در تنظیمات عمومی سایت می‌نشیند نه اینجا، چون محرمانه نیست و
     * صفحه‌ی تسویه باید بداند قرار است به بانک برود یا به صفحه‌ی ساختگی.
     */
    public static function demo(): array
    {
        return SitePayments::settings()['demo'];
    }

    public static function demoEnabled(): bool
    {
        return (bool) self::demo()['enabled'];
    }

    /** مقدارهای خام یک درگاه با رمزگشایی — فقط برای صدا زدن درگاه، هرگز برای پاسخ API */
    public static function credentials(?string $driver = null): array
    {
        $driver ??= self::driver();
        $stored = SiteDocument::payloadFor(self::DOCUMENT)['credentials'][$driver] ?? [];
        $secrets = PaymentGateways::secretKeys($driver);

        $values = [];
        foreach (PaymentGateways::fields($driver) as $field) {
            $raw = $stored[$field['key']] ?? null;
            $values[$field['key']] = in_array($field['key'], $secrets, true)
                ? self::decrypt($raw)
                : trim((string) $raw);
        }

        foreach (PaymentGateways::toggles($driver) as $toggle) {
            $values[$toggle['key']] = (bool) ($stored[$toggle['key']] ?? false);
        }

        foreach (PaymentGateways::choices($driver) as $choice) {
            $allowed = PaymentGateways::choiceValues($driver, $choice['key']);
            $saved = $stored[$choice['key']] ?? null;
            $values[$choice['key']] = in_array($saved, $allowed, true) ? $saved : $choice['default'];
        }

        return $values;
    }

    /** درگاه وقتی آماده است که همه‌ی فیلدهایش پر باشند؛ درگاه بدون فیلد همیشه آماده است */
    public static function isConfigured(?string $driver = null): bool
    {
        $driver ??= self::driver();
        $values = self::credentials($driver);

        foreach (PaymentGateways::fields($driver) as $field) {
            if (($values[$field['key']] ?? '') === '') {
                return false;
            }
        }

        return true;
    }

    /** نسخه‌ی پنل: مقدار محرمانه فقط به‌صورت «ذخیره شده یا نه» بیرون می‌رود */
    public static function forAdmin(): array
    {
        $stored = SiteDocument::payloadFor(self::DOCUMENT);
        $saved = [];

        foreach (array_keys(PaymentGateways::usable()) as $driver) {
            $values = self::credentials($driver);
            $entry = [];

            foreach (PaymentGateways::fields($driver) as $field) {
                $entry[$field['key']] = $field['secret'] ? '' : $values[$field['key']];
                $entry[$field['key'].'Set'] = ($values[$field['key']] ?? '') !== '';
            }

            foreach (PaymentGateways::toggles($driver) as $toggle) {
                $entry[$toggle['key']] = $values[$toggle['key']];
            }

            foreach (PaymentGateways::choices($driver) as $choice) {
                $entry[$choice['key']] = $values[$choice['key']];
            }

            $saved[$driver] = $entry;
        }

        return [
            'driver' => self::driver(),
            'credentials' => $saved,
            'configured' => collect(array_keys(PaymentGateways::usable()))
                ->mapWithKeys(fn ($d) => [$d => self::isConfigured($d)])->all(),
            'catalog' => PaymentGateways::catalog(),
        ];
    }

    /**
     * ذخیره‌ی یک درگاه. فیلد محرمانه‌ی خالی یعنی «همان قبلی بماند» — پنل هیچ‌وقت
     * مقدار قبلی را در دست ندارد که بتواند دوباره بفرستد.
     */
    public static function save(string $driver, array $input): void
    {
        $stored = SiteDocument::payloadFor(self::DOCUMENT);
        $current = $stored['credentials'][$driver] ?? [];
        $entry = $current;

        foreach (PaymentGateways::fields($driver) as $field) {
            $value = trim((string) ($input[$field['key']] ?? ''));

            if (! $field['secret']) {
                $entry[$field['key']] = $value;

                continue;
            }

            if ($value !== '') {
                $entry[$field['key']] = Crypt::encryptString($value);
            }
        }

        foreach (PaymentGateways::toggles($driver) as $toggle) {
            $entry[$toggle['key']] = (bool) ($input[$toggle['key']] ?? false);
        }

        foreach (PaymentGateways::choices($driver) as $choice) {
            $allowed = PaymentGateways::choiceValues($driver, $choice['key']);
            $value = $input[$choice['key']] ?? null;
            $entry[$choice['key']] = in_array($value, $allowed, true) ? $value : $choice['default'];
        }

        SiteDocument::store(self::DOCUMENT, [
            'driver' => $driver,
            'credentials' => [$driver => $entry] + ($stored['credentials'] ?? []),
        ]);
    }

    /** پاک کردن مقدار یک فیلد محرمانه — چون فرستادن خالی یعنی «دست نزن» */
    public static function forget(string $driver, string $key): void
    {
        $stored = SiteDocument::payloadFor(self::DOCUMENT);
        unset($stored['credentials'][$driver][$key]);

        SiteDocument::store(self::DOCUMENT, $stored);
    }

    private static function decrypt(?string $value): string
    {
        if (! $value) {
            return '';
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return '';
        }
    }
}
