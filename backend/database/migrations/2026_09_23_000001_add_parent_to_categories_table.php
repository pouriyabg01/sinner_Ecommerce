<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * دسته‌بندی مادر.
     *
     * حذف مادر، زیردسته‌ها را پاک نمی‌کند بلکه خودشان مادر می‌شوند (nullOnDelete)؛
     * پاک کردن زنجیره‌ای یعنی حذف یک دسته می‌توانست نصف کاتالوگ را ببرد.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('id')->constrained('categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
        });
    }
};
