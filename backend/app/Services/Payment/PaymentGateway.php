<?php

namespace App\Services\Payment;

use App\Contracts\Payable;
use Illuminate\Support\Facades\Log;
use Shetabit\Multipay\Constants\IranCurrency;
use Shetabit\Multipay\Exceptions\InvalidPaymentException;
use Shetabit\Multipay\Exceptions\PurchaseFailedException;
use Shetabit\Multipay\Invoice;
use Shetabit\Multipay\RedirectionForm;
use Shetabit\Payment\Facade\Payment;

/**
 * پل بین چیزِ قابل پرداخت (سفارش یا هزینه‌ی تعمیر) و درگاه واقعی.
 *
 * پیکربندی درایور در لحظه از {@see PaymentGatewaySettings} ساخته می‌شود، نه از
 * فایل `config/payment.php` — تا ادمین بتواند بدون دیپلوی درگاه را عوض کند.
 *
 * مبلغ سفارش تومان است، پس به همه‌ی درایورها TOMAN اعلام می‌شود؛ خود درایور
 * در صورت نیاز به ریال تبدیل می‌کند. جا انداختن این یعنی مبلغ ده برابر یا
 * یک‌دهم از کارت مشتری کم می‌شود.
 */
class PaymentGateway
{
    /**
     * تراکنش را نزد درگاه می‌سازد و فرم انتقال به بانک را برمی‌گرداند.
     * شناسه‌ی تراکنش روی همان رکورد می‌نشیند تا موقع بازگشت قابل تأیید باشد.
     *
     * @throws GatewayException
     */
    public function purchase(Payable $payable, string $callbackUrl): RedirectionForm
    {
        $driver = PaymentGatewaySettings::driver();

        if (! PaymentGatewaySettings::isConfigured($driver)) {
            throw new GatewayException('درگاه پرداخت هنوز تنظیم نشده است. با پشتیبانی تماس بگیرید.');
        }

        $invoice = (new Invoice)
            ->amount($payable->payableAmount())
            ->detail([
                'description' => $payable->payableTitle(),
                'orderId' => $payable->payableCode(),
                'mobile' => $payable->payableUser()?->phone,
                'email' => $payable->payableUser()?->email,
            ]);

        try {
            return Payment::via($driver)
                ->config($this->driverConfig($driver))
                ->callbackUrl($callbackUrl)
                ->purchase($invoice, function ($gateway, $transactionId) use ($payable, $driver) {
                    $payable->forceFill([
                        'payment_driver' => $driver,
                        'payment_transaction_id' => (string) $transactionId,
                    ])->save();
                })
                ->pay();
        } catch (PurchaseFailedException $e) {
            Log::warning('ساخت تراکنش ناموفق بود', ['payable' => $payable->payableCode(), 'driver' => $driver, 'error' => $e->getMessage()]);

            throw new GatewayException($e->getMessage() ?: 'درگاه پرداخت پاسخ نداد. کمی بعد دوباره تلاش کنید.');
        } catch (\Throwable $e) {
            Log::error('خطای غیرمنتظره در اتصال به درگاه', ['payable' => $payable->payableCode(), 'driver' => $driver, 'error' => $e->getMessage()]);

            throw new GatewayException('اتصال به درگاه پرداخت برقرار نشد. کمی بعد دوباره تلاش کنید.');
        }
    }

    /**
     * تأیید تراکنش بعد از بازگشت از بانک. این تنها جایی است که «پرداخت شد» از
     * آن درمی‌آید — نتیجه‌ای که مرورگر ادعا می‌کند هیچ‌وقت ملاک نیست.
     *
     * @return string کد پیگیری بانک
     *
     * @throws GatewayException
     */
    public function verify(Payable $payable): string
    {
        $driver = $payable->payment_driver ?: PaymentGatewaySettings::driver();

        try {
            $receipt = Payment::via($driver)
                ->config($this->driverConfig($driver))
                ->amount($payable->payableAmount())
                ->transactionId($payable->payment_transaction_id)
                ->verify();

            return (string) $receipt->getReferenceId();
        } catch (InvalidPaymentException $e) {
            // بانک تراکنش را رد کرد: انصراف کاربر، موجودی کم، یا تراکنش ناتمام
            throw new GatewayException($e->getMessage() ?: 'پرداخت تأیید نشد.');
        } catch (\Throwable $e) {
            Log::error('تأیید تراکنش با خطا خورد', ['payable' => $payable->payableCode(), 'driver' => $driver, 'error' => $e->getMessage()]);

            throw new GatewayException('تأیید پرداخت ناموفق بود. اگر مبلغ کسر شده، تا ۷۲ ساعت بازمی‌گردد.');
        }
    }

    /**
     * پیکربندی درایور: مقدارهای ذخیره‌شده‌ی ادمین روی پیش‌فرض‌های پکیج.
     * ساختارش همان چیزی است که پکیج انتظار دارد — `drivers.<name>`.
     */
    private function driverConfig(string $driver): array
    {
        $values = array_filter(
            PaymentGatewaySettings::credentials($driver),
            fn ($value) => $value !== '' && $value !== null,
        );

        // مبلغ ما تومان است؛ درایورهایی که واحد را از کانفیگ می‌خوانند باید همین را بدانند
        $values['currency'] = IranCurrency::TOMAN;

        return ['drivers' => [$driver => $values]];
    }
}
