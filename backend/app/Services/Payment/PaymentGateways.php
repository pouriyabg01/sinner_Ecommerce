<?php

namespace App\Services\Payment;

/**
 * فهرست درگاه‌های پشتیبانی‌شده و فیلدهایی که هرکدام لازم دارند.
 *
 * این کلاس منبع واحد است: پنل فرم را از روی همین می‌سازد، اعتبارسنجی همین را
 * می‌پذیرد و {@see PaymentGatewaySettings} همین کلیدها را به درایور shetabit
 * پاس می‌دهد. اضافه کردن درگاه تازه یعنی فقط یک ردیف اینجا — نه تغییر در پنل.
 *
 * نام کلیدها عمداً همان چیزی است که درایور پکیج انتظار دارد؛ عوض کردنشان یعنی
 * مقدار به دست درایور نمی‌رسد.
 */
class PaymentGateways
{
    /**
     * هر درگاه: برچسب فارسی، آدرس پنل ارائه‌دهنده و فیلدهایش.
     * `secret` یعنی مقدار رمزنگاری‌شده ذخیره می‌شود و هرگز به پنل برنمی‌گردد.
     */
    public const DRIVERS = [
        'local' => [
            'label' => 'درگاه تست پکیج',
            'note' => 'صفحه‌ی پرداخت ساختگی خودِ پکیج. پولی جابه‌جا نمی‌شود و شناسه‌ی پذیرنده نمی‌خواهد.',
            'fields' => [],
        ],

        /* ------------------------- درگاه‌های واسط (PSP) ------------------------- */
        'zarinpal' => [
            'label' => 'زرین‌پال',
            'site' => 'https://zarinpal.com',
            'note' => 'شناسه‌ی پذیرنده کد ۳۶ کاراکتری پنل زرین‌پال است.',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده (Merchant ID)', 'secret' => true],
            ],
            'choices' => [
                [
                    'key' => 'mode',
                    'label' => 'حالت درگاه',
                    'default' => 'normal',
                    'options' => [
                        ['value' => 'normal', 'label' => 'عادی (تراکنش واقعی)'],
                        ['value' => 'sandbox', 'label' => 'تست (Sandbox)'],
                        ['value' => 'zaringate', 'label' => 'زرین‌گیت (درگاه مستقیم)'],
                    ],
                ],
            ],
        ],
        'zibal' => [
            'label' => 'زیبال',
            'site' => 'https://zibal.ir',
            'note' => 'برای تست می‌توانید شناسه‌ی پذیرنده را zibal بگذارید.',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده (Merchant)', 'secret' => true],
            ],
        ],
        'idpay' => [
            'label' => 'آیدی‌پی',
            'site' => 'https://idpay.ir',
            'note' => 'این درگاه در نسخه‌ی فعلی پکیج درایور ندارد و فعلاً قابل استفاده نیست.',
            'unavailable' => true,
            'fields' => [],
        ],
        'nextpay' => [
            'label' => 'نکست‌پی',
            'site' => 'https://nextpay.org',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'کلید API (api_key)', 'secret' => true],
            ],
        ],
        'payping' => [
            'label' => 'پی‌پینگ',
            'site' => 'https://payping.ir',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'توکن API', 'secret' => true],
            ],
        ],
        'vandar' => [
            'label' => 'وندار',
            'site' => 'https://vandar.io',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'کلید API (api_key)', 'secret' => true],
            ],
        ],
        'paystar' => [
            'label' => 'پی‌استار',
            'site' => 'https://paystar.ir',
            'fields' => [
                ['key' => 'gatewayId', 'label' => 'شناسه درگاه (Gateway ID)', 'secret' => true],
                ['key' => 'signKey', 'label' => 'کلید امضا (Sign Key)', 'secret' => true],
            ],
        ],
        'aqayepardakht' => [
            'label' => 'آقای پرداخت',
            'site' => 'https://aqayepardakht.ir',
            'fields' => [
                ['key' => 'pin', 'label' => 'پین درگاه (PIN)', 'secret' => true],
            ],
            'choices' => [
                [
                    'key' => 'mode',
                    'label' => 'حالت درگاه',
                    'default' => 'normal',
                    'options' => [
                        ['value' => 'normal', 'label' => 'عادی (تراکنش واقعی)'],
                        ['value' => 'sandbox', 'label' => 'تست (Sandbox)'],
                    ],
                ],
            ],
        ],
        'sepordeh' => [
            'label' => 'سپرده',
            'site' => 'https://sepordeh.com',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
            ],
        ],
        'poolam' => [
            'label' => 'پولام',
            'site' => 'https://poolam.ir',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'کلید API', 'secret' => true],
            ],
        ],
        'gooyapay' => [
            'label' => 'گویاپی',
            'site' => 'https://gooyapay.ir',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
            ],
        ],
        'minipay' => [
            'label' => 'مینی‌پی',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
            ],
        ],
        'panapal' => [
            'label' => 'پانا‌پال',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
            ],
        ],
        'payfa' => [
            'label' => 'پی‌فا',
            'site' => 'https://payfa.com',
            'fields' => [
                ['key' => 'apiKey', 'label' => 'کلید API', 'secret' => true],
            ],
        ],
        'bitpay' => [
            'label' => 'بیت‌پی',
            'site' => 'https://bitpay.ir',
            'fields' => [
                ['key' => 'api_token', 'label' => 'توکن API', 'secret' => true],
            ],
        ],
        'atipay' => [
            'label' => 'آتی‌پی',
            'site' => 'https://atipay.net',
            'fields' => [
                ['key' => 'apikey', 'label' => 'کلید API', 'secret' => true],
            ],
        ],
        'parspal' => [
            'label' => 'پارس‌پال',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
            ],
            'toggles' => [
                ['key' => 'sandbox', 'label' => 'حالت تست (Sandbox)'],
            ],
        ],
        'shepa' => [
            'label' => 'شپا',
            'site' => 'https://shepa.com',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'کلید API', 'secret' => true],
            ],
            'toggles' => [
                ['key' => 'sandbox', 'label' => 'حالت تست (Sandbox)'],
            ],
        ],
        'irandargah' => [
            'label' => 'ایران درگاه',
            'site' => 'https://irandargah.com',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
            ],
            'toggles' => [
                ['key' => 'sandbox', 'label' => 'حالت تست (Sandbox)'],
            ],
        ],
        'jibit' => [
            'label' => 'جیبیت',
            'site' => 'https://jibit.ir',
            'fields' => [
                ['key' => 'apiKey', 'label' => 'کلید API', 'secret' => true],
                ['key' => 'apiSecret', 'label' => 'رمز API (Secret)', 'secret' => true],
            ],
        ],
        'digify' => [
            'label' => 'دیجی‌فای',
            'fields' => [
                ['key' => 'baseUrl', 'label' => 'آدرس سرویس (Base URL)'],
                ['key' => 'apiKey', 'label' => 'کلید API', 'secret' => true],
            ],
        ],
        'azki' => [
            'label' => 'ازکی‌وام',
            'site' => 'https://azkivam.com',
            'note' => 'خرید اعتباری/اقساطی.',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
                ['key' => 'key', 'label' => 'کلید (Key)', 'secret' => true],
            ],
        ],
        'toman' => [
            'label' => 'تومان (اعتباری)',
            'site' => 'https://toman.ir',
            'fields' => [
                ['key' => 'shop_slug', 'label' => 'شناسه فروشگاه (Shop Slug)'],
                ['key' => 'auth_code', 'label' => 'کد احراز (Auth Code)', 'secret' => true],
            ],
        ],
        'digipay' => [
            'label' => 'دیجی‌پی',
            'site' => 'https://mydigipay.com',
            'fields' => [
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
                ['key' => 'client_id', 'label' => 'Client ID', 'secret' => true],
                ['key' => 'client_secret', 'label' => 'Client Secret', 'secret' => true],
            ],
        ],
        'snapppay' => [
            'label' => 'اسنپ‌پی',
            'site' => 'https://snapppay.ir',
            'fields' => [
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
                ['key' => 'client_id', 'label' => 'Client ID', 'secret' => true],
                ['key' => 'client_secret', 'label' => 'Client Secret', 'secret' => true],
            ],
        ],
        'torobpay' => [
            'label' => 'ترب‌پی',
            'fields' => [
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
                ['key' => 'client_id', 'label' => 'Client ID', 'secret' => true],
                ['key' => 'client_secret', 'label' => 'Client Secret', 'secret' => true],
            ],
        ],
        'rayanpay' => [
            'label' => 'رایان‌پی',
            'fields' => [
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
                ['key' => 'client_id', 'label' => 'Client ID', 'secret' => true],
            ],
        ],
        'etebarino' => [
            'label' => 'اعتبارینو',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
                ['key' => 'terminalId', 'label' => 'شناسه ترمینال'],
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],

        /* ------------------------- درگاه‌های مستقیم بانکی ------------------------- */
        'behpardakht' => [
            'label' => 'به‌پرداخت ملت',
            'site' => 'https://behpardakht.com',
            'fields' => [
                ['key' => 'terminalId', 'label' => 'شناسه ترمینال (Terminal ID)'],
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],
        'saman' => [
            'label' => 'سامان (SEP)',
            'site' => 'https://sep.ir',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده (Terminal ID)'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],
        'sep' => [
            'label' => 'سامان الکترونیک — صادرات و کشاورزی',
            'fields' => [
                ['key' => 'terminalId', 'label' => 'شناسه ترمینال'],
            ],
        ],
        'sepehr' => [
            'label' => 'سپهر (صادرات)',
            'fields' => [
                ['key' => 'terminalId', 'label' => 'شناسه ترمینال'],
            ],
        ],
        'parsian' => [
            'label' => 'پارسیان',
            'site' => 'https://pec.ir',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'پین درگاه (LoginAccount)', 'secret' => true],
            ],
        ],
        'pasargad' => [
            'label' => 'پاسارگاد',
            'site' => 'https://pep.co.ir',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده (Merchant Code)'],
                ['key' => 'terminalCode', 'label' => 'کد ترمینال (Terminal Code)'],
                ['key' => 'userName', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],
        'sadad' => [
            'label' => 'سداد (ملی)',
            'site' => 'https://sadadpsp.ir',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده (Merchant ID)'],
                ['key' => 'terminalId', 'label' => 'شناسه ترمینال (Terminal ID)'],
                ['key' => 'key', 'label' => 'کلید ترمینال (Terminal Key)', 'secret' => true],
            ],
        ],
        'asanpardakht' => [
            'label' => 'آسان‌پرداخت',
            'site' => 'https://asanpardakht.ir',
            'fields' => [
                ['key' => 'merchantConfigID', 'label' => 'شناسه پیکربندی (MerchantConfigID)'],
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],
        'irankish' => [
            'label' => 'ایران‌کیش',
            'site' => 'https://irankish.com',
            'fields' => [
                ['key' => 'terminalId', 'label' => 'شناسه ترمینال'],
                ['key' => 'acceptorId', 'label' => 'شناسه پذیرنده (Acceptor ID)'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
                ['key' => 'pubKey', 'label' => 'کلید عمومی (Public Key)', 'secret' => true, 'multiline' => true],
            ],
        ],
        'omidpay' => [
            'label' => 'امید (بانک شهر)',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده'],
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],
        'sizpay' => [
            'label' => 'سیزپی',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده (MerchantID)'],
                ['key' => 'terminal', 'label' => 'شناسه ترمینال'],
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
                ['key' => 'SignData', 'label' => 'داده امضا (SignData)', 'secret' => true],
            ],
        ],
        'fanavacard' => [
            'label' => 'فناوا کارت',
            'fields' => [
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],
        'refah' => [
            'label' => 'رفاه',
            'fields' => [
                ['key' => 'terminalNumber', 'label' => 'شماره ترمینال'],
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],
        'daracard' => [
            'label' => 'دارا کارت',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده'],
                ['key' => 'terminalId', 'label' => 'شناسه ترمینال'],
                ['key' => 'username', 'label' => 'نام کاربری'],
                ['key' => 'password', 'label' => 'رمز عبور', 'secret' => true],
            ],
        ],
        'pna' => [
            'label' => 'پرداخت نوین آرین',
            'fields' => [
                ['key' => 'CorporationPin', 'label' => 'پین پذیرنده (Corporation Pin)', 'secret' => true],
            ],
        ],
        'yekpay' => [
            'label' => 'یک‌پی',
            'site' => 'https://yekpay.com',
            'fields' => [
                ['key' => 'merchantId', 'label' => 'شناسه پذیرنده', 'secret' => true],
            ],
        ],
    ];

    /** درگاه‌هایی که می‌شود انتخابشان کرد — آن‌هایی که درایور ندارند کنار می‌روند */
    public static function usable(): array
    {
        return array_filter(self::DRIVERS, fn ($d) => ! ($d['unavailable'] ?? false));
    }

    public static function exists(string $driver): bool
    {
        return isset(self::usable()[$driver]);
    }

    public static function label(string $driver): string
    {
        return self::DRIVERS[$driver]['label'] ?? $driver;
    }

    /** @return array<int, array{key: string, label: string, secret: bool, multiline: bool}> */
    public static function fields(string $driver): array
    {
        return array_map(fn ($f) => $f + ['secret' => false, 'multiline' => false, 'hint' => null],
            self::DRIVERS[$driver]['fields'] ?? []);
    }

    /** @return array<int, array{key: string, label: string}> */
    public static function toggles(string $driver): array
    {
        return array_map(fn ($t) => $t + ['hint' => null], self::DRIVERS[$driver]['toggles'] ?? []);
    }

    /**
     * فیلدهای چندگزینه‌ای. بعضی درگاه‌ها حالت تست را به‌جای یک بولین با یک رشته
     * می‌گیرند (زرین‌پال: normal/sandbox/zaringate)، و فرستادن بولین برایشان
     * بی‌اثر است — یعنی فروشنده فکر می‌کند در حالت تست است ولی نیست.
     *
     * @return array<int, array{key: string, label: string, default: string, options: array}>
     */
    public static function choices(string $driver): array
    {
        return self::DRIVERS[$driver]['choices'] ?? [];
    }

    /** مقدارهای مجاز یک فیلد چندگزینه‌ای */
    public static function choiceValues(string $driver, string $key): array
    {
        $choice = collect(self::choices($driver))->firstWhere('key', $key);

        return collect($choice['options'] ?? [])->pluck('value')->all();
    }

    /** کلیدهایی که مقدارشان باید رمزنگاری‌شده ذخیره شود */
    public static function secretKeys(string $driver): array
    {
        return collect(self::fields($driver))->where('secret', true)->pluck('key')->all();
    }

    /** توضیح فرم برای پنل — بدون هیچ مقدار محرمانه‌ای */
    public static function catalog(): array
    {
        return collect(self::usable())->map(fn ($driver, $key) => [
            'id' => $key,
            'label' => $driver['label'],
            'site' => $driver['site'] ?? null,
            'note' => $driver['note'] ?? null,
            'fields' => self::fields($key),
            'toggles' => self::toggles($key),
            'choices' => self::choices($key),
        ])->values()->all();
    }
}
