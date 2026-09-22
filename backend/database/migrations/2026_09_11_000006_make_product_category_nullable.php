<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * کالا می‌تواند بدون دسته بماند: وقتی دسته‌اش حذف شده ولی ادمین خواسته خود کالاها
 * بمانند. چنین کالایی تا دسته‌ی تازه نگیرد در فروشگاه نمایش داده نمی‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->foreignId('category_id')->nullable()->change();
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnUpdate()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->foreignId('category_id')->nullable(false)->change();
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnUpdate()->restrictOnDelete();
        });
    }
};
