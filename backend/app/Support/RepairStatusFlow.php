<?php

namespace App\Support;

/**
 * ترتیب وضعیت درخواست تعمیر.
 *
 * دو تفاوت با سفارش دارد:
 *
 * ۱) بعضی مرحله‌ها دست ادمین نیست. «در انتظار تأیید شما» را فقط خودِ مشتری جلو
 *    می‌برد (تأیید یا انصراف) و «در انتظار پرداخت» با پرداخت موفق رد می‌شود.
 *    این‌ها در {@see self::CUSTOMER_ONLY} جدا شده‌اند تا در فرم پنل دیده نشوند.
 *
 * ۲) مرحله‌ی «زمان پیک تعیین شد» فقط برای تحویل با پیک معنی دارد؛ مشتری‌ای که
 *    حضوری می‌آورد مستقیم به «دستگاه دریافت شد» می‌رود.
 */
class RepairStatusFlow
{
    public const LABELS = [
        'submitted' => 'ثبت شد',
        'pickup_scheduled' => 'زمان پیک تعیین شد',
        'received' => 'دستگاه دریافت شد',
        'diagnosing' => 'در حال عیب‌یابی',
        'quoted' => 'اعلام هزینه',
        'awaiting_approval' => 'در انتظار تأیید شما',
        'awaiting_payment' => 'در انتظار پرداخت',
        'repairing' => 'در حال تعمیر',
        'ready' => 'آماده تحویل',
        'returning' => 'در حال ارسال به شما',
        'completed' => 'تکمیل شده',
        'rejected' => 'انصراف / غیرقابل تعمیر',
    ];

    public const TRANSITIONS = [
        'submitted' => ['pickup_scheduled', 'received', 'rejected'],
        'pickup_scheduled' => ['received', 'rejected'],
        'received' => ['diagnosing', 'rejected'],
        'diagnosing' => ['quoted', 'rejected'],
        'quoted' => ['awaiting_approval', 'rejected'],
        // تصمیمِ مشتری است: یا تأیید می‌کند و به پرداخت می‌رود، یا منصرف می‌شود
        'awaiting_approval' => ['awaiting_payment', 'rejected'],
        // با پرداخت موفق خودکار جلو می‌رود؛ ادمین هم می‌تواند دستی ثبت کند (پرداخت حضوری)
        'awaiting_payment' => ['repairing', 'rejected'],
        'repairing' => ['ready', 'rejected'],
        'ready' => ['returning', 'completed'],
        'returning' => ['completed'],
        'completed' => [],
        'rejected' => [],
    ];

    /**
     * وضعیت‌هایی که ادمین نباید دستی بگذارد.
     *
     * «در انتظار پرداخت» را تأیید مشتری می‌سازد — اگر ادمین خودش بگذاردش، مشتری
     * هزینه‌ای را می‌بیند که هرگز تأیید نکرده است.
     */
    public const CUSTOMER_ONLY = ['awaiting_payment'];

    /**
     * وضعیت‌هایی که بدون هزینه‌ی نهایی معنی ندارند.
     *
     * «اعلام هزینه» بدون عدد یعنی اعلامِ هیچ، و «در انتظار تأیید شما» مشتری را
     * پای تأیید مبلغی می‌نشاند که وجود ندارد — همان‌جا هم تأییدش رد می‌شد و
     * درخواست بی‌آنکه کسی بفهمد گیر می‌کرد.
     */
    public const REQUIRES_FINAL_COST = ['quoted', 'awaiting_approval'];

    /** دلیل اینکه این وضعیت با داده‌های فعلی قابل ثبت نیست، وگرنه null */
    public static function requirementFor(string $status, ?int $finalCost): ?string
    {
        if (in_array($status, self::REQUIRES_FINAL_COST, true) && (int) $finalCost < 1) {
            return 'برای «'.self::label($status).'» اول باید هزینه‌ی نهایی را وارد کنید';
        }

        return null;
    }

    public static function nextFor(string $status): array
    {
        return self::TRANSITIONS[$status] ?? [];
    }

    /** وضعیت‌های بعدی‌ای که ادمین اجازه‌ی گذاشتنشان را دارد */
    public static function nextForAdmin(string $status): array
    {
        return array_values(array_diff(self::nextFor($status), self::CUSTOMER_ONLY));
    }

    public static function allows(string $from, string $to): bool
    {
        return in_array($to, self::nextFor($from), true);
    }

    public static function label(string $status): string
    {
        return self::LABELS[$status] ?? $status;
    }

    /** پیام خطای فارسی برای تغییر غیرمجاز توسط ادمین، وگرنه null */
    public static function rejectionForAdmin(string $from, string $to, ?int $finalCost = null): ?string
    {
        if ($from === $to) {
            return null;
        }

        if ($requirement = self::requirementFor($to, $finalCost)) {
            return $requirement;
        }

        if (in_array($to, self::CUSTOMER_ONLY, true)) {
            return '«'.self::label($to).'» را تأیید خودِ مشتری می‌سازد و دستی قابل ثبت نیست';
        }

        if (self::allows($from, $to)) {
            return null;
        }

        $next = self::nextForAdmin($from);

        if ($next === []) {
            return 'درخواست «'.self::label($from).'» وضعیت پایانی است و دیگر تغییر نمی‌کند';
        }

        return 'از «'.self::label($from).'» نمی‌شود مستقیم به «'.self::label($to).'» رفت؛ مرحله‌ی بعدی: '
            .implode(' یا ', array_map(fn ($s) => '«'.self::label($s).'»', $next));
    }
}
