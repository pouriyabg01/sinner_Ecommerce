<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /** گزارش هر ایمیلی که ارسال یا (در حالت آزمایشی) فقط ثبت شده — همتای `sms_messages` */
        Schema::create('email_messages', function (Blueprint $table) {
            $table->id();
            $table->string('to_address');
            $table->string('event', 40);
            $table->string('subject');
            $table->text('body');
            $table->string('status', 20); // sent | failed | logged
            $table->string('mailer', 20);
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });

        /**
         * مشترکان خبرنامه. عضویت دومرحله‌ای است: با ثبت ایمیل ردیف `pending` ساخته
         * می‌شود و تا وقتی روی لینک تأیید نزده‌اند هیچ اطلاع‌رسانی‌ای نمی‌گیرند.
         * `token` هم برای تأیید است و هم برای لغو عضویت، پس تصادفی و یکتاست.
         */
        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('token', 64)->unique();
            $table->string('status', 20)->default('pending'); // pending | active | unsubscribed
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('unsubscribed_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });

        /** هر اطلاع‌رسانی یک ردیف؛ تا فرستاده نشده پیش‌نویس است و آزادانه ویرایش می‌شود */
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('subject');
            $table->text('body');
            $table->string('cta_label')->default('');
            $table->string('cta_url')->default('');
            $table->string('status', 20)->default('draft'); // draft | sending | sent
            $table->unsignedInteger('recipients')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        /**
         * برای هر گیرنده یک ردیف. اگر ارسال وسط کار بترکد و دوباره اجرا شود، این
         * جدول جلوی ایمیل تکراری را می‌گیرد — کلید یکتا همین کار را می‌کند.
         */
        Schema::create('campaign_sends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscriber_id')->constrained('newsletter_subscribers')->cascadeOnDelete();
            $table->string('status', 20); // sent | failed | logged
            $table->text('error')->nullable();
            $table->timestamps();

            $table->unique(['campaign_id', 'subscriber_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_sends');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('newsletter_subscribers');
        Schema::dropIfExists('email_messages');
    }
};
