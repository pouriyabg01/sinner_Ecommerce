<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * رأی «مفید بود» روی نظرها.
 *
 * بدون این جدول، دکمه فقط یک عدد نمایشی بود. هر رأی‌دهنده با یک اثر انگشت
 * ذخیره می‌شود: کاربر واردشده با شناسه‌اش و مهمان با درهم‌سازی آی‌پی — خودِ
 * آی‌پی نگه داشته نمی‌شود. کلید یکتا یعنی هر کس روی هر نظر یک رأی دارد و
 * کلیک دوباره رأی را پس می‌گیرد.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_helpfuls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('voter_hash', 64);
            $table->timestamps();

            $table->unique(['review_id', 'voter_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_helpfuls');
    }
};
