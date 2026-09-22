<?php

namespace App\Contracts;

use App\Models\User;

/**
 * چیزی که می‌شود پولش را از درگاه گرفت — سفارش فروشگاه یا هزینه‌ی تعمیر.
 *
 * درگاه و مسیر بازگشت از بانک با همین قرارداد کار می‌کنند، نه با مدل مشخص، تا
 * تعمیر هم بدون تکرار کل مسیر پرداخت (تراکنش، تأیید سمت سرور، جلوگیری از
 * تأیید دوباره) همان درگاهِ تنظیم‌شده را داشته باشد.
 */
interface Payable
{
    /** کد پیگیری که به مشتری نشان داده می‌شود */
    public function payableCode(): string;

    /** مبلغ قابل پرداخت به تومان */
    public function payableAmount(): int;

    /** توضیحی که روی صفحه‌ی بانک می‌نشیند */
    public function payableTitle(): string;

    public function payableUser(): ?User;

    /** پرداخت‌شده یا نه — برای جلوگیری از پرداخت و تأیید دوباره */
    public function isPaid(): bool;

    /** فقط بعد از تأیید سمت سرور صدا زده می‌شود */
    public function markPaid(string $referenceId): void;

    /** `$status` یکی از failed یا cancelled است */
    public function markPaymentFailed(string $status, string $note): void;

    /** نوعِ پرداخت در آدرس بازگشت از بانک: order یا repair */
    public function payableType(): string;
}
