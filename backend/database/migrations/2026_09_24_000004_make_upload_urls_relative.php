<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * نشانی تصویرهای آپلودشده را از کامل به نسبی برمی‌گرداند.
 *
 * تا امروز آپلود، نشانیِ همان لحظه را ذخیره می‌کرد (`http://<آی‌پی>/storage/…`).
 * نتیجه‌اش دو خرابی بود: نکست میزبانِ ناشناس را برای تصویر قبول نمی‌کند، و بعد از
 * رفتن روی دامنه و https، مرورگر تصویرِ http را روی صفحه‌ی امن اصلاً باز نمی‌کند.
 *
 * الگو عمداً هر میزبانی را می‌گیرد، نه فقط آی‌پی امروز، تا داده‌ی دستگاه‌های
 * توسعه هم با همین یک مهاجرت درست شود.
 */
return new class extends Migration
{
    /** ستون‌های متنی و ستون‌های jsonb که ممکن است نشانی تصویر داشته باشند */
    private const TEXT_COLUMNS = [
        'brands' => 'logo',
        'categories' => 'icon',
        'repair_issues' => 'icon',
        'order_items' => 'image',
    ];

    private const JSON_COLUMNS = [
        'products' => 'images',
        'repair_requests' => 'photos',
        'site_documents' => 'payload',
    ];

    private const PATTERN = 'https?://[^/"[:space:]]+/storage/';

    public function up(): void
    {
        foreach (self::TEXT_COLUMNS as $table => $column) {
            DB::statement(sprintf(
                'update %1$s set %2$s = regexp_replace(%2$s, %3$s, \'/storage/\') where %2$s ~ %3$s',
                $table,
                $column,
                "'".self::PATTERN."'",
            ));
        }

        foreach (self::JSON_COLUMNS as $table => $column) {
            DB::statement(sprintf(
                'update %1$s set %2$s = regexp_replace(%2$s::text, %3$s, \'/storage/\', \'g\')::jsonb where %2$s::text ~ %3$s',
                $table,
                $column,
                "'".self::PATTERN."'",
            ));
        }
    }

    /**
     * برگشت ندارد: میزبانی که در نشانی‌ها بود دیگر جایی ذخیره نیست، و مهم‌تر
     * اینکه برگرداندنش همان خرابی را برمی‌گرداند.
     */
    public function down(): void {}
};
