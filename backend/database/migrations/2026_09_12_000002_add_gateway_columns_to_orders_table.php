<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * سفارشی که به درگاه می‌رود باید یادش بماند با کدام درگاه و کدام تراکنش رفته،
 * وگرنه موقع بازگشت از بانک راهی برای تأیید همان تراکنش نیست — و عوض شدن
 * درگاه فعال، سفارش‌های نیمه‌تمام قبلی را غیرقابل تأیید می‌کرد.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_driver')->nullable()->after('payment_status');
            $table->string('payment_transaction_id')->nullable()->after('payment_driver');
            $table->timestamp('payment_verified_at')->nullable()->after('payment_ref');

            $table->index('payment_transaction_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['payment_transaction_id']);
            $table->dropColumn(['payment_driver', 'payment_transaction_id', 'payment_verified_at']);
        });
    }
};
