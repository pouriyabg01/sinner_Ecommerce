<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * وضعیت کالا: نو، استوک یا کارکرده.
     *
     * جدا از `is_new` است: آن یعنی «تازه به فروشگاه اضافه شده» و برچسب تبلیغاتی
     * است، این یعنی «دست‌دوم نیست» و روی تصمیم خرید اثر می‌گذارد.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('condition')->default('new')->after('stock');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('condition');
        });
    }
};
