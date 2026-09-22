<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** روزی که مشتری برای تحویل خواسته؛ خالی یعنی زودترین زمان ممکن */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->date('preferred_delivery_date')->nullable()->after('address_summary');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('preferred_delivery_date');
        });
    }
};
