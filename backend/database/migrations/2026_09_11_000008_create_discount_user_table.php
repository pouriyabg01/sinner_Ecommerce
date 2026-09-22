<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * کد تخفیف شخصی: فقط کاربران این فهرست می‌توانند از آن استفاده کنند؛ خالی یعنی
 * همه. این «چه کسی» است و جدا از محدودیت «روی چه کالایی» (کالا/دسته) سنجیده می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discount_user', function (Blueprint $table) {
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['discount_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_user');
    }
};
