<?php

namespace App\Support;

use App\Models\SiteDocument;
use App\Services\Payment\PaymentGateways;
use App\Services\Payment\PaymentGatewaySettings;

/**
 * روش‌های پرداخت از تنظیمات سایت خوانده می‌شوند تا صفحه‌ی تسویه و سرور یک
 * قاعده داشته باشند. تا پیش از این فقط صفحه‌ی تسویه روش خاموش را پنهان می‌کرد
 * و سفارش مستقیم به سرور، همان روش را می‌پذیرفت.
 */
class SitePayments
{
    /** همتای DEFAULT_PAYMENT_SETTINGS در فرانت؛ فروشگاهی که هنوز تنظیمات ذخیره نکرده همین را دارد */
    public const DEFAULTS = [
        'methods' => [
            ['id' => 'online', 'enabled' => true, 'label' => 'پرداخت اینترنتی', 'hint' => 'انتقال به درگاه بانکی', 'minTotal' => 0, 'maxTotal' => 0],
            ['id' => 'cod', 'enabled' => true, 'label' => 'پرداخت در محل', 'hint' => 'هنگام تحویل به پیک', 'minTotal' => 0, 'maxTotal' => 50000000],
            ['id' => 'installment', 'enabled' => true, 'label' => 'خرید اقساطی', 'hint' => 'با بررسی اعتبارسنجی', 'minTotal' => 20000000, 'maxTotal' => 0],
        ],
        'gateway' => ['provider' => 'zarinpal'],
        'demo' => ['enabled' => true, 'outcome' => 'ask', 'delayMs' => 1200],
    ];

    public static function settings(?array $saved = null): array
    {
        $payment = $saved ?? SiteDocument::payloadFor('settings')['payment'] ?? [];

        $driver = PaymentGatewaySettings::driver();

        return [
            'methods' => self::withoutOnlineLimits($payment['methods'] ?? self::DEFAULTS['methods']),
            // این پاسخ بدون ورود خوانده می‌شود، پس فقط نام درگاه بیرون می‌رود
            // و هیچ‌کدام از مقدارهای پذیرنده — آن‌ها در سند جداگانه‌اند.
            'gateway' => [
                'provider' => $driver,
                'label' => PaymentGateways::label($driver),
                'ready' => PaymentGatewaySettings::isConfigured($driver),
            ],
            'demo' => ($payment['demo'] ?? []) + self::DEFAULTS['demo'],
        ];
    }

    /**
     * پرداخت اینترنتی سقف و کف مبلغ ندارد: درگاه هر مبلغی را می‌پذیرد و
     * محدود کردنش فقط جلوی خرید را می‌گرفت. مقدار قدیمیِ ذخیره‌شده هم نادیده می‌رود.
     */
    private static function withoutOnlineLimits(array $methods): array
    {
        return array_map(function (array $method) {
            if (($method['id'] ?? null) === 'online') {
                $method['minTotal'] = 0;
                $method['maxTotal'] = 0;
            }

            return $method;
        }, $methods);
    }

    /**
     * پیام خطا اگر این روش برای این مبلغ قابل استفاده نباشد، وگرنه null.
     * مبلغ همان مبلغ نهایی سفارش است — همان عددی که صفحه‌ی تسویه می‌سنجد.
     */
    public static function rejectionFor(string $id, int $total): ?string
    {
        $method = collect(self::settings()['methods'])->firstWhere('id', $id);

        if (! $method || ! ($method['enabled'] ?? false)) {
            return 'این روش پرداخت در حال حاضر فعال نیست';
        }

        $label = $method['label'] ?: $id;
        $min = (int) ($method['minTotal'] ?? 0);
        $max = (int) ($method['maxTotal'] ?? 0);

        if ($min > 0 && $total < $min) {
            return "«{$label}» برای سفارش‌های از ".Digits::money($min).' تومان به بالاست';
        }

        if ($max > 0 && $total > $max) {
            return "«{$label}» تا سقف ".Digits::money($max).' تومان است';
        }

        return null;
    }
}
