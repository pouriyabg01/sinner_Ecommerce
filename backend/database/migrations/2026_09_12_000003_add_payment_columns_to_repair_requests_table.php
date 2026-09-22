<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * هزینه‌ی تعمیر تا اینجا فقط یک عدد روی درخواست بود و راهی برای پرداختش نداشت.
 * این ستون‌ها همان چیزی را برای تعمیر نگه می‌دارند که سفارش دارد: تأیید مشتری،
 * و تراکنشی که بشود موقع بازگشت از بانک تأییدش کرد.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('repair_requests', function (Blueprint $table) {
            // لحظه‌ای که مشتری برآورد را پذیرفت — پیش از آن هیچ پرداختی ساخته نمی‌شود
            $table->timestamp('approved_at')->nullable()->after('warranty_days');
            $table->string('payment_status')->default('unpaid')->after('approved_at');
            $table->string('payment_driver')->nullable()->after('payment_status');
            $table->string('payment_transaction_id')->nullable()->after('payment_driver');
            $table->string('payment_ref')->nullable()->after('payment_transaction_id');
            $table->timestamp('payment_verified_at')->nullable()->after('payment_ref');

            $table->index('payment_transaction_id');
        });
    }

    public function down(): void
    {
        Schema::table('repair_requests', function (Blueprint $table) {
            $table->dropIndex(['payment_transaction_id']);
            $table->dropColumn([
                'approved_at', 'payment_status', 'payment_driver',
                'payment_transaction_id', 'payment_ref', 'payment_verified_at',
            ]);
        });
    }
};
