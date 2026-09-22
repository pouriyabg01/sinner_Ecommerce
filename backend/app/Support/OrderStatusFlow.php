<?php

namespace App\Support;

/**
 * ترتیب وضعیت سفارش.
 *
 * تا پیش از این پنل هر وضعیتی را می‌پذیرفت و می‌شد سفارشِ «در انتظار پرداخت»
 * را یکباره «تحویل داده شد» کرد — یعنی مرحله‌های بسته‌بندی و ارسال هیچ‌وقت در
 * تاریخچه ثبت نمی‌شد و مشتری هم پیامک ارسال نمی‌گرفت.
 *
 * اینجا منبع واحد است: سرور جهش را رد می‌کند و پنل هم فهرست وضعیت‌های مجاز را
 * از همین می‌گیرد، پس گزینه‌ی نامعتبر اصلاً در فرم دیده نمی‌شود.
 */
class OrderStatusFlow
{
    public const LABELS = [
        'pending_payment' => 'در انتظار پرداخت',
        'processing' => 'در حال بررسی',
        'packing' => 'آماده‌سازی بسته',
        'shipped' => 'ارسال شده',
        'delivered' => 'تحویل داده شد',
        'cancelled' => 'لغو شده',
        'returned' => 'مرجوع شده',
    ];

    /**
     * از هر وضعیت، فقط این‌ها در دسترس‌اند.
     * لغو تا پیش از ارسال ممکن است؛ بعد از ارسال دیگر «مرجوعی» است نه «لغو».
     */
    public const TRANSITIONS = [
        'pending_payment' => ['processing', 'cancelled'],
        'processing' => ['packing', 'cancelled'],
        'packing' => ['shipped', 'cancelled'],
        'shipped' => ['delivered', 'returned'],
        'delivered' => ['returned'],
        'cancelled' => [],
        'returned' => [],
    ];

    /** وضعیت‌هایی که از این وضعیت می‌شود به آن‌ها رفت */
    public static function nextFor(string $status): array
    {
        return self::TRANSITIONS[$status] ?? [];
    }

    public static function allows(string $from, string $to): bool
    {
        return in_array($to, self::nextFor($from), true);
    }

    public static function label(string $status): string
    {
        return self::LABELS[$status] ?? $status;
    }

    /** پیام خطای فارسی برای جهش غیرمجاز، وگرنه null */
    public static function rejectionFor(string $from, string $to): ?string
    {
        if ($from === $to || self::allows($from, $to)) {
            return null;
        }

        $next = self::nextFor($from);

        if ($next === []) {
            return 'سفارش «'.self::label($from).'» وضعیت پایانی است و دیگر تغییر نمی‌کند';
        }

        return 'از «'.self::label($from).'» نمی‌شود مستقیم به «'.self::label($to).'» رفت؛ مرحله‌ی بعدی: '
            .implode(' یا ', array_map(fn ($s) => '«'.self::label($s).'»', $next));
    }
}
