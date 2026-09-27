<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * توکن تأیید نشانی ایمیل — دقیقاً به شکل `password_reset_tokens`.
 *
 * کلید روی خودِ ایمیل است نه شناسه‌ی کاربر: اگر کسی ایمیلش را عوض کرد، توکن
 * نشانی قبلی باید بی‌اثر شود، نه اینکه نشانی تازه را تأیید کند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_verifications', function (Blueprint $table) {
            $table->string('email')->primary();
            // خودِ توکن ذخیره نمی‌شود؛ لو رفتن این جدول نباید یعنی تأیید جعلی
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verifications');
    }
};
