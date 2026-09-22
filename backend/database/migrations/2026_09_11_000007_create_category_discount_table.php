<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * کد تخفیف محدود به چند دسته، کنار محدودیت کالا (discount_product).
 * کد روی کالایی اعمال می‌شود که یا خودش در فهرست کالاهاست یا دسته‌اش در این
 * فهرست؛ هر دو خالی یعنی روی همه‌ی کالاها.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_discount', function (Blueprint $table) {
            $table->foreignId('discount_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->primary(['discount_id', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_discount');
    }
};
