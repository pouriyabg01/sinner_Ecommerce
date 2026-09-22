<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * رأی نظرها دوطرفه شد: پسند و ناپسند.
 * جهت رأی کنار خودِ رأی ذخیره می‌شود و هر رأی‌دهنده همچنان روی هر نظر یک رأی
 * دارد؛ زدن دکمه‌ی دیگر رأی را برمی‌گرداند، نه اینکه رأی دوم بسازد.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('review_helpfuls', function (Blueprint $table) {
            $table->string('vote', 4)->default('up')->after('user_id');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->unsignedInteger('not_helpful_count')->default(0)->after('helpful_count');
        });
    }

    public function down(): void
    {
        Schema::table('review_helpfuls', function (Blueprint $table) {
            $table->dropColumn('vote');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn('not_helpful_count');
        });
    }
};
