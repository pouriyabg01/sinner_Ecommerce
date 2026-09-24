<?php

namespace App\Http\Controllers\Api;

use App\Contracts\Payable;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\RepairRequest;
use App\Services\Payment\GatewayException;
use App\Services\Payment\PaymentGateway;
use App\Services\Payment\PaymentGatewaySettings;
use App\Services\Mail\MailSender;
use App\Services\Sms\SmsSender;
use App\Support\Digits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * مسیر پرداخت: شروع تراکنش، بازگشت از بانک، و درگاه دمو.
 *
 * دو چیز پرداخت می‌شوند — سفارش فروشگاه و هزینه‌ی تعمیر — و هر دو
 * {@see Payable} هستند، پس مسیر یکی است.
 *
 * قاعده‌ی ثابت: «پرداخت شد» فقط از تأیید سمت سرور درمی‌آید. مرورگر می‌تواند
 * هر چیزی ادعا کند، پس نتیجه‌ای که از آن می‌آید جز در حالت دمو پذیرفته نیست.
 */
class PaymentController extends Controller
{
    public function __construct(private readonly PaymentGateway $gateway) {}

    /**
     * شروع پرداخت. در حالت دمو به صفحه‌ی ساختگی می‌رود، وگرنه تراکنش نزد درگاه
     * ساخته می‌شود و فرم انتقال به بانک برمی‌گردد تا مرورگر submit کند.
     */
    public function start(Request $request, string $type, string $code): JsonResponse
    {
        $payable = $this->ownedPayable($request, $type, $code);

        if (! $payable) {
            return response()->json(['message' => 'موردی برای پرداخت پیدا نشد'], 404);
        }

        if ($rejection = $this->notPayableReason($payable)) {
            return response()->json(['message' => $rejection], 422);
        }

        if (PaymentGatewaySettings::demoEnabled()) {
            return response()->json(['mode' => 'demo'] + PaymentGatewaySettings::demo());
        }

        try {
            $form = $this->gateway->purchase($payable, route('payment.callback', [
                'type' => $payable->payableType(),
                'code' => $payable->payableCode(),
            ]));
        } catch (GatewayException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // درگاه‌های ایرانی بعضاً POST با فیلد مخفی می‌خواهند، پس فرم کامل برمی‌گردد
        return response()->json([
            'mode' => 'gateway',
            'action' => $form->getAction(),
            'method' => strtoupper($form->getMethod()),
            'inputs' => (object) $form->getInputs(),
        ]);
    }

    /**
     * بازگشت از بانک. بانک این را صدا می‌زند — بدون کوکی و بدون توکن — پس مسیر
     * عمومی است و هویت از روی همان تراکنشی می‌آید که موقع رفتن ذخیره شد.
     */
    public function callback(Request $request, string $type, string $code): RedirectResponse
    {
        $payable = $this->findPayable($type, $code);

        if (! $payable) {
            return $this->backToShop($type, 'not_found');
        }

        // بانک گاهی callback را دوبار می‌زند؛ موردِ تأییدشده نباید دوباره verify شود
        if ($payable->isPaid()) {
            return $this->backToShop($type, 'success', $payable);
        }

        /*
         * موردی که هیچ‌وقت به درگاه نرفته، تراکنشی هم برای تأیید ندارد. بدون این
         * بررسی، هر کسی با حدس زدن کد پیگیری می‌توانست این مسیر را صدا بزند —
         * و درایورهای تست (مثل local) چنین تأییدی را قبول می‌کنند.
         */
        if (! $payable->payment_driver || ! $payable->payment_transaction_id) {
            return $this->backToShop($type, 'failed', $payable, 'برای این مورد تراکنشی ثبت نشده است');
        }

        try {
            $referenceId = $this->gateway->verify($payable);
        } catch (GatewayException $e) {
            $payable->markPaymentFailed('failed', $e->getMessage());

            return $this->backToShop($type, 'failed', $payable, $e->getMessage());
        }

        $payable->markPaid($referenceId);
        $this->announcePayment($payable);

        return $this->backToShop($type, 'success', $payable);
    }

    /**
     * درگاه دمو: نتیجه را خودِ صفحه‌ی تسویه می‌فرستد. فقط تا وقتی دمو روشن است
     * کار می‌کند — وگرنه هر کاربری می‌توانست پرداختش را «انجام‌شده» کند.
     */
    public function demo(Request $request, string $type, string $code): JsonResponse
    {
        if (! PaymentGatewaySettings::demoEnabled()) {
            return response()->json(['message' => 'درگاه آزمایشی خاموش است'], 422);
        }

        $data = $request->validate(['outcome' => ['required', 'in:success,failed,cancelled']]);
        $payable = $this->ownedPayable($request, $type, $code);

        if (! $payable) {
            return response()->json(['message' => 'موردی برای پرداخت پیدا نشد'], 404);
        }

        if ($rejection = $this->notPayableReason($payable)) {
            return response()->json(['message' => $rejection], 422);
        }

        if ($data['outcome'] === 'success') {
            $payable->forceFill(['payment_driver' => 'demo'])->save();
            $payable->markPaid((string) random_int(100000000000, 999999999999));
            $this->announcePayment($payable);
        } else {
            $payable->markPaymentFailed(
                $data['outcome'],
                $data['outcome'] === 'cancelled' ? 'کاربر از پرداخت منصرف شد' : 'پرداخت ناموفق بود',
            );
        }

        return response()->json($this->payableResponse($payable));
    }

    /** دلیل اینکه این مورد الان قابل پرداخت نیست، وگرنه null */
    private function notPayableReason(Payable $payable): ?string
    {
        if ($payable->isPaid()) {
            return 'این مورد قبلاً پرداخت شده است';
        }

        if ($payable instanceof Order && $payable->payment_method !== 'online') {
            return 'این سفارش پرداخت اینترنتی نیست';
        }

        /*
         * هزینه‌ی تعمیر تا وقتی مشتری برآورد را تأیید نکرده قابل پرداخت نیست —
         * وگرنه می‌شد قبل از تأیید، مبلغی را که هنوز قبول نشده از مشتری گرفت.
         */
        if ($payable instanceof RepairRequest && $payable->status !== 'awaiting_payment') {
            return 'این درخواست در مرحله‌ی پرداخت نیست';
        }

        if ($payable->payableAmount() < 1) {
            return 'مبلغ قابل پرداخت ثبت نشده است';
        }

        return null;
    }

    private function announcePayment(Payable $payable): void
    {
        if ($payable instanceof Order) {
            app(SmsSender::class)->order($payable->fresh('items'), 'order.placed');
            app(MailSender::class)->order($payable->fresh('items'), 'order.placed');
        }
    }

    private function payableResponse(Payable $payable): array
    {
        return $payable instanceof Order
            ? (new OrderResource($payable->fresh('items')))->resolve()
            : ['code' => $payable->payableCode(), 'status' => $payable->fresh()->status, 'paymentStatus' => $payable->payment_status];
    }

    /** موردِ خودِ کاربر؛ مالِ دیگران اصلاً پیدا نمی‌شود */
    private function ownedPayable(Request $request, string $type, string $code): ?Payable
    {
        $payable = $this->findPayable($type, $code);

        return $payable && $payable->user_id === $request->user()?->id ? $payable : null;
    }

    private function findPayable(string $type, string $code): ?Payable
    {
        $code = Digits::code($code);

        if ($type === 'repair') {
            return RepairRequest::where('code', $code)->first();
        }

        return Order::with('items')
            ->where('code', $code)
            ->when(ctype_digit($code), fn ($q) => $q->orWhere('id', $code))
            ->first();
    }

    /** برگرداندن مشتری به صفحه‌ی نتیجه در فرانت */
    private function backToShop(string $type, string $status, ?Payable $payable = null, ?string $message = null): RedirectResponse
    {
        $query = array_filter([
            'status' => $status,
            'type' => $type,
            'code' => $payable?->payableCode(),
            'ref' => $payable?->payment_ref,
            'message' => $message,
        ]);

        return redirect()->away(
            rtrim(config('app.frontend_url'), '/').'/checkout/callback?'.http_build_query($query)
        );
    }
}
