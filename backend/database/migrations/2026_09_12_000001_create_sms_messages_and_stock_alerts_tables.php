<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /** گزارش هر پیامکی که ارسال یا (در حالت آزمایشی) فقط ثبت شده */
        Schema::create('sms_messages', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20);
            $table->string('event', 40);
            $table->text('message');
            $table->string('status', 20); // sent | failed | logged
            $table->string('provider', 30);
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });

        /**
         * «موجود شد خبرم کن». مدل‌های کالا با هر ویرایش از نو ساخته می‌شوند و شناسه‌شان
         * عوض می‌شود، پس به‌جای شناسه‌ی مدل، عنوانش نگه داشته می‌شود.
         */
        Schema::create('stock_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('variant_title')->default('');
            $table->string('phone', 20)->default('');
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'product_id', 'variant_title']);
            $table->index(['product_id', 'notified_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_alerts');
        Schema::dropIfExists('sms_messages');
    }
};
