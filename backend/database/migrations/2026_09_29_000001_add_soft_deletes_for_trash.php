<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * سطل زباله‌ی پنل: حذف دیگر ردیف را نمی‌برد، فقط تاریخِ حذف را می‌نویسد.
 *
 * یکتاییِ نامک و کد باید فقط بین ردیف‌های زنده برقرار بماند، وگرنه کالایی که
 * در سطل است جای نامک خودش را برای همیشه می‌گرفت و ساختن دوباره‌ی همان نامک
 * خطا می‌داد. پستگرس نمایه‌ی یکتای شرطی دارد و همین را حل می‌کند.
 */
return new class extends Migration
{
    private const TABLES = ['products', 'categories', 'brands', 'tags', 'discounts', 'repair_issues', 'media'];

    private const UNIQUES = [
        ['products', 'slug', 'products_slug_unique'],
        ['categories', 'slug', 'categories_slug_unique'],
        ['brands', 'slug', 'brands_slug_unique'],
        ['tags', 'title', 'tags_title_unique'],
        ['discounts', 'code', 'discounts_code_unique'],
        ['media', 'path', 'media_path_unique'],
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::hasColumn($table, 'deleted_at')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->softDeletes()->index();
                });
            }
        }

        foreach (self::UNIQUES as [$table, $column, $index]) {
            DB::statement("alter table {$table} drop constraint if exists {$index}");
            DB::statement("drop index if exists {$index}");
            DB::statement("create unique index {$index} on {$table} ({$column}) where deleted_at is null");
        }
    }

    public function down(): void
    {
        foreach (self::UNIQUES as [$table, $column, $index]) {
            DB::statement("drop index if exists {$index}");
            // برگشت فقط وقتی ممکن است که ردیف حذف‌شده‌ای با نامک تکراری نمانده باشد
            DB::statement("alter table {$table} add constraint {$index} unique ({$column})");
        }

        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropSoftDeletes();
            });
        }
    }
};
