<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * جدول‌های ماژول کاتالوگ.
 *
 * شکل داده عیناً از تایپ‌های فرانت گرفته شده (`front end/src/types/catalog.ts`)
 * تا پاسخ API با چیزی که صفحه‌ها انتظار دارند یکی باشد.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('icon')->default('');
            $table->text('description')->default('');
            /**
             * کلید مشخصاتی که فیلترها و ستون‌های صفحه‌ی مقایسه‌ی این دسته از
             * رویشان ساخته می‌شود. آرایه‌ی ساده است و هیچ‌وقت جداگانه کوئری
             * نمی‌شود، پس jsonb به‌جای یک جدول واسط.
             */
            $table->jsonb('spec_keys')->default('[]');
            $table->timestamps();
        });

        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('logo')->default('');
            $table->timestamps();
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('title')->unique();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('title_en')->default('');
            $table->foreignId('category_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('brand_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();

            /**
             * قیمت و موجودی از مدل‌ها ساخته می‌شوند (ارزان‌ترین مدل و جمع
             * موجودی‌ها) و هیچ‌وقت از کلاینت پذیرفته نمی‌شوند. اینجا ذخیره
             * می‌شوند تا فهرست و مرتب‌سازی نیازی به join و aggregate نداشته باشد.
             */
            $table->unsignedBigInteger('price')->default(0);
            $table->unsignedBigInteger('compare_at_price')->nullable();
            $table->unsignedInteger('stock')->default(0);

            $table->decimal('rating', 2, 1)->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->jsonb('images')->default('[]');
            $table->text('short_description')->default('');
            $table->text('description')->default('');
            /** ردیف‌های مشخصات فنی: key/label/value/score */
            $table->jsonb('specs')->default('[]');
            $table->boolean('is_new')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
            $table->index(['category_id', 'status']);
        });

        // فیلتر روی مشخصات فنی مستقیم روی jsonb می‌نشیند؛ بدون این ایندکس،
        // هر فیلتر یک اسکن کامل جدول است.
        DB::statement('CREATE INDEX products_specs_gin ON products USING gin (specs jsonb_path_ops)');

        /**
         * جست‌وجوی فارسی. پستگرس پیکربندی متنی فارسی ندارد، ولی trigram روی
         * نام کالا هم غلط املایی را تحمل می‌کند و هم «سامسونگ» را داخل
         * «گوشی سامسونگ گلکسی» پیدا می‌کند — چیزی که LIKE با ایندکس نمی‌دهد.
         */
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX products_title_trgm ON products USING gin (title gin_trgm_ops)');
        DB::statement('CREATE INDEX products_title_en_trgm ON products USING gin (title_en gin_trgm_ops)');

        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('color_name')->nullable();
            $table->string('color_hex', 9)->nullable();
            $table->string('storage')->nullable();
            $table->unsignedBigInteger('price');
            $table->unsignedInteger('stock')->default(0);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'position']);
        });

        Schema::create('product_tag', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['product_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_tag');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('categories');
    }
};
