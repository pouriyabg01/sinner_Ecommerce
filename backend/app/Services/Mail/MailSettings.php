<?php

namespace App\Services\Mail;

use App\Models\SiteDocument;
use Illuminate\Support\Facades\Crypt;

/**
 * تنظیمات ایمیل در سند جداگانه‌ی `mail` — نه در تنظیمات سایت، چون آن سند عمومی خوانده
 * می‌شود و رمز سرویس نباید به مرورگر برسد. همتای `SmsSettings` است و عمداً همان شکل را
 * دارد تا پنلش هم مثل پنل پیامک باشد.
 *
 * چرا اینجا و نه در `.env`؟ چون تغییر تنظیمات نباید یعنی ورود به سرور، ویرایش فایل و
 * ساخت دوباره‌ی ظرف؛ مدیر باید از پنل عوضش کند و با ایمیل آزمایشی امتحان کند.
 */
class MailSettings
{
    /** `log` حالت آزمایشی است: ایمیل واقعاً ارسال نمی‌شود و فقط در گزارش ثبت می‌شود */
    public const MAILERS = ['log', 'smtp'];

    public const ENCRYPTIONS = ['tls', 'ssl', 'none'];

    /** رویدادهایی که ایمیل می‌فرستند؛ عنوان و متن پیش‌فرض را ادمین در پنل عوض می‌کند */
    public const EVENTS = [
        'newsletter.confirm' => [
            'label' => 'تأیید عضویت در خبرنامه',
            'hint' => 'بلافاصله بعد از ثبت ایمیل در فرم خبرنامه',
            'placeholders' => ['link', 'site'],
            'subject' => 'تأیید عضویت در خبرنامه‌ی {site}',
            'body' => "برای عضویت در خبرنامه‌ی {site} روی دکمه‌ی زیر بزنید.\n\nاگر شما این درخواست را نداده‌اید، این نامه را نادیده بگیرید؛ بدون تأیید شما هیچ ایمیلی فرستاده نمی‌شود.",
            'cta' => 'تأیید عضویت',
        ],
        'newsletter.welcome' => [
            'label' => 'خوش‌آمد خبرنامه',
            'hint' => 'بعد از اینکه کاربر عضویتش را تأیید کرد',
            'placeholders' => ['link', 'site'],
            'subject' => 'عضویت شما در خبرنامه‌ی {site} ثبت شد',
            'body' => "از این به بعد تخفیف‌ها و کالاهای تازه را برایتان می‌فرستیم.\n\nهر وقت خواستید، با لینک پایین همین نامه‌ها می‌توانید عضویت را لغو کنید.",
            'cta' => 'رفتن به فروشگاه',
        ],
        'order.placed' => [
            'label' => 'ثبت سفارش',
            'hint' => 'بعد از پرداخت موفق، یا بلافاصله برای پرداخت در محل و اقساطی',
            'placeholders' => ['name', 'code', 'total', 'link', 'site'],
            'subject' => 'سفارش {code} ثبت شد',
            'body' => "{name} عزیز،\n\nسفارش {code} به مبلغ {total} تومان ثبت شد و در حال آماده‌سازی است. وضعیت سفارش را از پنل کاربری‌تان دنبال کنید.",
            'cta' => 'پیگیری سفارش',
        ],
        'order.shipped' => [
            'label' => 'ارسال سفارش',
            'hint' => 'وقتی وضعیت سفارش «ارسال شده» می‌شود',
            'placeholders' => ['name', 'code', 'tracking', 'link', 'site'],
            'subject' => 'سفارش {code} ارسال شد',
            'body' => "{name} عزیز،\n\nسفارش {code} تحویل پست شد. کد رهگیری مرسوله: {tracking}",
            'cta' => 'پیگیری سفارش',
        ],
        'order.delivered' => [
            'label' => 'تحویل سفارش',
            'hint' => 'وقتی وضعیت سفارش «تحویل داده شد» می‌شود',
            'placeholders' => ['name', 'code', 'link', 'site'],
            'subject' => 'سفارش {code} تحویل داده شد',
            'body' => "{name} عزیز،\n\nسفارش {code} تحویل داده شد. از خرید شما سپاسگزاریم.\n\nاگر از کالا راضی بودید، ثبت نظرتان به بقیه کمک می‌کند.",
            'cta' => 'ثبت نظر',
        ],
        'order.cancelled' => [
            'label' => 'لغو سفارش',
            'hint' => 'وقتی سفارش لغو می‌شود',
            'placeholders' => ['name', 'code', 'link', 'site'],
            'subject' => 'سفارش {code} لغو شد',
            'body' => "{name} عزیز،\n\nسفارش {code} لغو شد. اگر مبلغی پرداخت کرده‌اید، طی چند روز کاری به حساب شما بازمی‌گردد.",
            'cta' => 'مشاهده‌ی سفارش‌ها',
        ],
        'password.reset' => [
            'label' => 'بازیابی رمز عبور',
            'hint' => 'وقتی کاربر در صفحه‌ی ورود «رمزم را فراموش کرده‌ام» را می‌زند',
            'placeholders' => ['name', 'link', 'minutes', 'site'],
            'subject' => 'بازیابی رمز عبور {site}',
            'body' => "{name} عزیز،\n\nبرای انتخاب رمز تازه روی دکمه‌ی زیر بزنید. این لینک تا {minutes} دقیقه معتبر است.\n\nاگر شما درخواست نداده‌اید، این نامه را نادیده بگیرید؛ رمز فعلی‌تان تغییری نمی‌کند.",
            'cta' => 'انتخاب رمز تازه',
        ],
    ];

    /** تنظیمات کامل با رمزِ رمزگشایی‌شده — فقط برای ارسال، هرگز برای پاسخ API */
    public static function load(): array
    {
        $stored = SiteDocument::payloadFor('mail');

        return [
            'enabled' => (bool) ($stored['enabled'] ?? false),
            'mailer' => in_array($stored['mailer'] ?? null, self::MAILERS, true) ? $stored['mailer'] : 'log',
            'host' => (string) ($stored['host'] ?? ''),
            'port' => (int) ($stored['port'] ?? 587),
            'encryption' => in_array($stored['encryption'] ?? null, self::ENCRYPTIONS, true) ? $stored['encryption'] : 'tls',
            'username' => (string) ($stored['username'] ?? ''),
            'password' => self::decrypt($stored['password'] ?? null),
            'fromAddress' => (string) ($stored['fromAddress'] ?? ''),
            'fromName' => (string) ($stored['fromName'] ?? ''),
            'events' => self::events($stored['events'] ?? []),
        ];
    }

    /** نسخه‌ی پنل: رمز فقط به‌صورت «ذخیره شده است یا نه» */
    public static function forAdmin(): array
    {
        $settings = self::load();

        return [
            'enabled' => $settings['enabled'],
            'mailer' => $settings['mailer'],
            'host' => $settings['host'],
            'port' => $settings['port'],
            'encryption' => $settings['encryption'],
            'username' => $settings['username'],
            'passwordSet' => $settings['password'] !== '',
            'fromAddress' => $settings['fromAddress'],
            'fromName' => $settings['fromName'],
            'events' => $settings['events'],
            'catalog' => collect(self::EVENTS)->map(fn ($event, $key) => [
                'key' => $key,
                'label' => $event['label'],
                'hint' => $event['hint'],
                'placeholders' => $event['placeholders'],
            ])->values(),
        ];
    }

    /** رمزِ خالی یعنی «همان قبلی بماند» — پنل آن را هیچ‌وقت برنمی‌گرداند */
    public static function save(array $input): void
    {
        $current = SiteDocument::payloadFor('mail');

        SiteDocument::store('mail', [
            'enabled' => (bool) $input['enabled'],
            'mailer' => $input['mailer'],
            'host' => trim((string) ($input['host'] ?? '')),
            'port' => (int) ($input['port'] ?? 587),
            'encryption' => $input['encryption'] ?? 'tls',
            'username' => trim((string) ($input['username'] ?? '')),
            'password' => filled($input['password'] ?? null) ? Crypt::encryptString($input['password']) : ($current['password'] ?? null),
            'fromAddress' => trim((string) ($input['fromAddress'] ?? '')),
            'fromName' => trim((string) ($input['fromName'] ?? '')),
            'events' => self::events($input['events'] ?? []),
        ]);
    }

    private static function events(array $stored): array
    {
        return collect(self::EVENTS)->map(fn ($event, $key) => [
            'enabled' => (bool) ($stored[$key]['enabled'] ?? true),
            'subject' => trim((string) ($stored[$key]['subject'] ?? '')) ?: $event['subject'],
            'body' => trim((string) ($stored[$key]['body'] ?? '')) ?: $event['body'],
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
