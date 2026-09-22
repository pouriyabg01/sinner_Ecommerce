<?php

namespace App\Support;

use App\Models\SiteDocument;

/**
 * روش‌های تحویل دستگاه در فرم تعمیر از تنظیمات سایت خوانده می‌شوند تا فرم و
 * سرور یک قاعده داشته باشند؛ وگرنه روشی که ادمین خاموش کرده بود، با درخواست
 * مستقیم به سرور همچنان پذیرفته می‌شد.
 *
 * شناسه‌ها ثابت‌اند (ستون `pickup_method` و گزارش‌ها روی همین سه مقدارند) و فقط
 * عنوان، توضیح، آیکون و روشن/خاموش بودنشان ویرایش می‌شود.
 */
class RepairPickup
{
    /** همتای DEFAULT_REPAIR_SETTINGS در فرانت */
    public const DEFAULTS = [
        'title' => 'دستگاه را چگونه به دست ما می‌رسانید؟',
        'methods' => [
            ['id' => 'courier', 'enabled' => true, 'label' => 'پیک رایگان درب منزل', 'hint' => 'پیک سینر در بازه‌ی زمانی انتخابی شما مراجعه و دستگاه را تحویل می‌گیرد.', 'icon' => 'home'],
            ['id' => 'post', 'enabled' => true, 'label' => 'ارسال با پست', 'hint' => 'دستگاه را با پست ارسال کنید؛ هزینه‌ی بازگشت بر عهده‌ی ماست.', 'icon' => 'package-check'],
            ['id' => 'in_person', 'enabled' => true, 'label' => 'تحویل حضوری در فروشگاه', 'hint' => 'به شعبه مراجعه کنید؛ عیب‌یابی در حضور شما انجام می‌شود.', 'icon' => 'store'],
        ],
    ];

    /**
     * تنظیماتِ ذخیره‌شده روی پیش‌فرض می‌نشیند: مجموعه و ترتیب شناسه‌ها همیشه همان
     * پیش‌فرض می‌ماند، پس نه روش ناشناخته‌ای ساخته می‌شود و نه روشی گم.
     */
    public static function settings(?array $saved = null): array
    {
        $saved ??= SiteDocument::payloadFor('settings')['repair'] ?? [];
        $stored = collect($saved['methods'] ?? [])->keyBy('id');
        $title = trim((string) ($saved['title'] ?? ''));

        return [
            'title' => $title !== '' ? $title : self::DEFAULTS['title'],
            'methods' => array_map(function (array $fallback) use ($stored) {
                $method = $stored->get($fallback['id']);

                if (! $method) {
                    return $fallback;
                }

                $label = trim((string) ($method['label'] ?? ''));

                return [
                    'id' => $fallback['id'],
                    'enabled' => (bool) ($method['enabled'] ?? $fallback['enabled']),
                    'label' => $label !== '' ? $label : $fallback['label'],
                    'hint' => (string) ($method['hint'] ?? $fallback['hint']),
                    'icon' => (string) (($method['icon'] ?? '') ?: $fallback['icon']),
                ];
            }, self::DEFAULTS['methods']),
        ];
    }

    /** پیام خطا اگر این روش تحویل فعال نباشد، وگرنه null */
    public static function rejectionFor(string $id): ?string
    {
        $method = collect(self::settings()['methods'])->firstWhere('id', $id);

        return ($method && ($method['enabled'] ?? false)) ? null : 'این روش تحویل در حال حاضر فعال نیست';
    }
}
