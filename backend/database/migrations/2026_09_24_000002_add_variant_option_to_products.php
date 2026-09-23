<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ویژگی‌ای که مدل‌های کالا بر اساسش فرق می‌کنند.
     *
     * پیش‌تر فقط «حافظه» (ستون storage) ممکن بود، که برای گوشی جواب می‌داد و برای
     * کفش و ساعت نه. نام ویژگی روی خود کالا می‌نشیند (همه‌ی مدل‌ها یک ویژگی را
     * دارند) و مقدارش روی هر مدل.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('variant_label', 30)->nullable()->after('condition');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->renameColumn('storage', 'option_value');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->renameColumn('option_value', 'storage');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('variant_label');
        });
    }
};
