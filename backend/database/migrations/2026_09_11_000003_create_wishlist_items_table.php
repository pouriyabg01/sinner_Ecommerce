<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * علاقه‌مندی‌های هر کاربر. روی سرور است نه در مرورگر، تا روی گوشی و کامپیوتر
 * یکی باشد. کالای حذف‌شده خودکار از لیست می‌رود؛ کالای غیرفعال می‌ماند و فقط
 * نمایش داده نمی‌شود، تا با فعال شدن دوباره برگردد.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlist_items', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlist_items');
    }
};
