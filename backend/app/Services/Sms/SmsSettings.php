<?php

namespace App\Services\Sms;

use App\Models\SiteDocument;
use Illuminate\Support\Facades\Crypt;

/**
 * تنظیمات پیامک در سند جداگانه‌ی `sms` — نه در تنظیمات سایت، چون آن سند عمومی خوانده
 * می‌شود و کلید سرویس نباید به مرورگر برسد. کلید و رمز رمزنگاری‌شده ذخیره می‌شوند.
 */
class SmsSettings
{
    /** `log` حالت آزمایشی است: پیامک واقعاً ارسال نمی‌شود و فقط در گزارش ثبت می‌شود */
    public const PROVIDERS = ['log', 'kavenegar', 'smsir', 'melipayamak', 'ghasedak'];

    /** رویدادهایی که پیامک می‌فرستند؛ متن پیش‌فرض را ادمین در پنل عوض می‌کند */
    public const EVENTS = [
        'otp' => [
            'label' => 'کد ورود',
            'hint' => 'وقتی کاربر با کد پیامکی وارد می‌شود',
            'placeholders' => ['code', 'site'],
            'template' => "کد ورود شما به {site}: {code}\nاین کد را در اختیار دیگران قرار ندهید.",
        ],
        'order.placed' => [
            'label' => 'ثبت سفارش',
            'hint' => 'بعد از پرداخت موفق، یا بلافاصله برای پرداخت در محل و اقساطی',
            'placeholders' => ['name', 'code', 'total', 'site'],
            'template' => "{name} عزیز، سفارش {code} به مبلغ {total} تومان ثبت شد و در حال آماده‌سازی است.\n{site}",
        ],
        'order.shipped' => [
            'label' => 'ارسال سفارش',
            'hint' => 'وقتی وضعیت سفارش «ارسال شده» می‌شود',
            'placeholders' => ['name', 'code', 'tracking', 'site'],
            'template' => "سفارش {code} ارسال شد. کد رهگیری مرسوله: {tracking}\n{site}",
        ],
        'order.delivered' => [
            'label' => 'تحویل سفارش',
            'hint' => 'وقتی وضعیت سفارش «تحویل داده شد» می‌شود',
            'placeholders' => ['name', 'code', 'site'],
            'template' => "سفارش {code} تحویل داده شد. از خرید شما سپاسگزاریم.\n{site}",
        ],
        'order.cancelled' => [
            'label' => 'لغو سفارش',
            'hint' => 'وقتی سفارش لغو می‌شود',
            'placeholders' => ['name', 'code', 'site'],
            'template' => "سفارش {code} لغو شد. اگر مبلغی پرداخت کرده‌اید، به حساب شما بازگردانده می‌شود.\n{site}",
        ],
        'repair.submitted' => [
            'label' => 'ثبت درخواست تعمیر',
            'hint' => 'بلافاصله بعد از ثبت درخواست',
            'placeholders' => ['name', 'code', 'site'],
            'template' => "درخواست تعمیر شما با کد پیگیری {code} ثبت شد. به‌زودی برای هماهنگی تماس می‌گیریم.\n{site}",
        ],
        'repair.quoted' => [
            'label' => 'اعلام هزینه‌ی تعمیر',
            'hint' => 'وقتی وضعیت تعمیر «در انتظار تأیید شما» می‌شود',
            'placeholders' => ['name', 'code', 'cost', 'site'],
            'template' => "هزینه‌ی تعمیر {code}: {cost} تومان. برای تأیید به پنل کاربری سر بزنید.\n{site}",
        ],
        'repair.ready' => [
            'label' => 'آماده بودن دستگاه',
            'hint' => 'وقتی وضعیت تعمیر «آماده تحویل» می‌شود',
            'placeholders' => ['name', 'code', 'site'],
            'template' => "دستگاه شما ({code}) تعمیر شد و آماده‌ی تحویل است.\n{site}",
        ],
        'repair.completed' => [
            'label' => 'تکمیل تعمیر',
            'hint' => 'وقتی وضعیت تعمیر «تکمیل شده» می‌شود',
            'placeholders' => ['name', 'code', 'warranty', 'site'],
            'template' => "تعمیر {code} تکمیل و تحویل شد. گارانتی تعمیر: {warranty} روز.\n{site}",
        ],
        'back_in_stock' => [
            'label' => 'موجود شدن کالا',
            'hint' => 'برای کسانی که «موجود شد خبرم کن» را زده‌اند',
            'placeholders' => ['name', 'product', 'link', 'site'],
            'template' => "{product} که منتظرش بودید موجود شد:\n{link}\n{site}",
        ],
    ];

    /** تنظیمات کامل با کلید و رمزِ رمزگشایی‌شده — فقط برای ارسال، هرگز برای پاسخ API */
    public static function load(): array
    {
        $stored = SiteDocument::payloadFor('sms');

        return [
            'enabled' => (bool) ($stored['enabled'] ?? false),
            'provider' => in_array($stored['provider'] ?? null, self::PROVIDERS, true) ? $stored['provider'] : 'log',
            'sender' => (string) ($stored['sender'] ?? ''),
            'username' => (string) ($stored['username'] ?? ''),
            'apiKey' => self::decrypt($stored['apiKey'] ?? null),
            'password' => self::decrypt($stored['password'] ?? null),
            'events' => self::events($stored['events'] ?? []),
        ];
    }

    /** نسخه‌ی پنل: کلید و رمز فقط به‌صورت «ذخیره شده است یا نه» */
    public static function forAdmin(): array
    {
        $settings = self::load();

        return [
            'enabled' => $settings['enabled'],
            'provider' => $settings['provider'],
            'sender' => $settings['sender'],
            'username' => $settings['username'],
            'apiKeySet' => $settings['apiKey'] !== '',
            'passwordSet' => $settings['password'] !== '',
            'events' => $settings['events'],
            'catalog' => collect(self::EVENTS)->map(fn ($event, $key) => [
                'key' => $key,
                'label' => $event['label'],
                'hint' => $event['hint'],
                'placeholders' => $event['placeholders'],
            ])->values(),
        ];
    }

    /** کلید یا رمزِ خالی یعنی «همان قبلی بماند» — پنل آن‌ها را هیچ‌وقت برنمی‌گرداند */
    public static function save(array $input): void
    {
        $current = SiteDocument::payloadFor('sms');

        SiteDocument::store('sms', [
            'enabled' => (bool) $input['enabled'],
            'provider' => $input['provider'],
            'sender' => trim((string) ($input['sender'] ?? '')),
            'username' => trim((string) ($input['username'] ?? '')),
            'apiKey' => filled($input['apiKey'] ?? null) ? Crypt::encryptString(trim($input['apiKey'])) : ($current['apiKey'] ?? null),
            'password' => filled($input['password'] ?? null) ? Crypt::encryptString($input['password']) : ($current['password'] ?? null),
            'events' => self::events($input['events'] ?? []),
        ]);
    }

    private static function events(array $stored): array
    {
        return collect(self::EVENTS)->map(fn ($event, $key) => [
            'enabled' => (bool) ($stored[$key]['enabled'] ?? true),
            'template' => trim((string) ($stored[$key]['template'] ?? '')) ?: $event['template'],
        ])->all();
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
