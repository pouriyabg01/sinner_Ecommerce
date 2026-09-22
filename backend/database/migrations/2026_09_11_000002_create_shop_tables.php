<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * جدول‌های سفارش، تعمیر، نظر، تخفیف و محتوای سایت.
 * شکل داده از `front end/src/types/*.ts` گرفته شده.
 */
return new class extends Migration
{
    public function up(): void
    {
        /* ---------------------------------- کاربر ---------------------------------- */
        Schema::table('users', function (Blueprint $table) {
            $table->string('full_name')->default('')->after('id');
            $table->string('phone')->unique()->nullable()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            $table->string('role')->default('customer')->after('avatar');
            $table->string('admin_title')->nullable()->after('role');
            /** فقط برای نقش admin؛ مدیر کل بی‌نیاز از فهرست، همه‌چیز را دارد */
            $table->jsonb('permissions')->default('[]')->after('admin_title');
            $table->string('status')->default('active')->after('permissions');

            $table->index('role');
            $table->index('status');
        });

        // نام و ایمیل در لاراول اجباری‌اند ولی اینجا شماره‌ی موبایل شناسه‌ی اصلی است
        DB::statement('ALTER TABLE users ALTER COLUMN name DROP NOT NULL');
        DB::statement('ALTER TABLE users ALTER COLUMN email DROP NOT NULL');
        DB::statement('ALTER TABLE users ALTER COLUMN password DROP NOT NULL');

        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('receiver');
            $table->string('phone');
            $table->string('province');
            $table->string('city');
            $table->string('postal_code');
            $table->text('line');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        /**
         * کد یک‌بارمصرف ورود. خودِ کد هش می‌شود؛ اگر دیتابیس لو برود نباید
         * بشود با آن به حساب کسی وارد شد.
         */
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('phone')->index();
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        /* --------------------------------- تخفیف ---------------------------------- */
        Schema::create('discounts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('type')->default('percent');
            $table->unsignedBigInteger('value');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->unsignedInteger('usage_limit')->default(0);
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // کد محدود به چند کالا؛ خالی بودن یعنی روی همه‌ی کالاها
        Schema::create('discount_product', function (Blueprint $table) {
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['discount_id', 'product_id']);
        });

        /* ---------------------------------- نظر ----------------------------------- */
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name');
            $table->unsignedTinyInteger('rating');
            $table->string('title');
            $table->text('body');
            $table->jsonb('pros')->default('[]');
            $table->jsonb('cons')->default('[]');
            $table->unsignedInteger('helpful_count')->default(0);
            $table->string('status')->default('pending');
            $table->boolean('verified_purchase')->default(false);
            $table->timestamps();

            $table->index(['product_id', 'status']);
        });

        /* --------------------------------- سفارش ---------------------------------- */
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();

            /**
             * همه‌ی مبلغ‌ها روی سرور حساب می‌شوند، نه از روی چیزی که مرورگر
             * فرستاده. بدون این، با یک درخواست دستی می‌شود هر کالایی را به هر
             * قیمتی سفارش داد.
             */
            $table->unsignedBigInteger('subtotal');
            $table->unsignedBigInteger('discount')->default(0);
            $table->foreignId('discount_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('shipping_cost')->default(0);
            $table->unsignedBigInteger('total');

            $table->string('status')->default('pending_payment');
            $table->string('payment_method')->default('online');
            $table->string('payment_status')->default('unpaid');
            $table->string('payment_ref')->nullable();
            $table->text('address_summary')->default('');
            $table->string('tracking_code')->nullable();
            $table->jsonb('timeline')->default('[]');
            $table->timestamps();

            $table->index('status');
            $table->index(['user_id', 'created_at']);
        });

        /**
         * قلم سفارش عنوان و قیمت را در خودش نگه می‌دارد، نه با join به کالا:
         * فاکتور باید همان چیزی بماند که مشتری خرید، حتی اگر بعداً قیمت یا نام
         * کالا عوض شود یا کالا حذف شود.
         */
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('variant_title')->nullable();
            $table->string('image')->default('');
            $table->unsignedBigInteger('unit_price');
            $table->unsignedInteger('quantity');
            $table->timestamps();
        });

        /* --------------------------------- تعمیر ---------------------------------- */
        Schema::create('repair_issues', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('hint')->default('');
            $table->string('icon')->default('');
            $table->jsonb('device_kinds')->default('[]');
            $table->unsignedBigInteger('estimated_min')->default(0);
            $table->unsignedBigInteger('estimated_max')->default(0);
            $table->unsignedSmallInteger('estimated_days')->default(0);
            $table->timestamps();
        });

        Schema::create('repair_requests', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('device_kind');
            $table->string('device_brand')->default('');
            $table->string('device_model')->default('');
            $table->text('issue_description')->default('');
            $table->jsonb('photos')->default('[]');
            $table->string('pickup_method')->default('courier');
            $table->text('address_summary')->default('');
            $table->date('preferred_date')->nullable();
            $table->string('status')->default('submitted');
            $table->unsignedBigInteger('estimated_min')->default(0);
            $table->unsignedBigInteger('estimated_max')->default(0);
            $table->unsignedBigInteger('final_cost')->nullable();
            $table->text('technician_note')->nullable();
            $table->unsignedSmallInteger('warranty_days')->default(0);
            $table->jsonb('timeline')->default('[]');
            $table->timestamps();

            $table->index('status');
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('repair_request_issue', function (Blueprint $table) {
            $table->foreignId('repair_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('repair_issue_id')->constrained()->cascadeOnDelete();
            $table->primary(['repair_request_id', 'repair_issue_id'], 'repair_request_issue_primary');
        });

        /* --------------------------------- محتوا ---------------------------------- */
        /**
         * محتوای صفحه‌ی اصلی، درباره‌ما و تنظیمات سایت. هرکدام یک سند کامل‌اند که
         * همیشه یکجا خوانده و یکجا نوشته می‌شوند و یازده نوع سکشن با props متفاوت
         * دارند؛ جدول‌بندی‌شان کار را چند برابر می‌کرد بدون اینکه چیزی به دست بیاید.
         */
        Schema::create('site_documents', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->jsonb('payload');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_documents');
        Schema::dropIfExists('repair_request_issue');
        Schema::dropIfExists('repair_requests');
        Schema::dropIfExists('repair_issues');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('discount_product');
        Schema::dropIfExists('discounts');
        Schema::dropIfExists('otp_codes');
        Schema::dropIfExists('addresses');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['full_name', 'phone', 'avatar', 'role', 'admin_title', 'permissions', 'status']);
        });
    }
};
