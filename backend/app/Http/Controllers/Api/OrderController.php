<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SiteDocument;
use App\Services\Mail\MailSender;
use App\Services\Sms\SmsSender;
use App\Support\Digits;
use App\Support\SitePayments;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * بررسی کد تخفیف روی همین سبد.
     *
     * سبد فرستاده می‌شود چون کد می‌تواند محدود به چند کالا یا دسته باشد، و مبلغ را
     * سرور حساب می‌کند نه مرورگر — وگرنه کافی است کاربر پاسخ را دستکاری کند.
     */
    public function validateDiscount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'lines' => ['array'],
            'lines.*.productId' => ['required'],
            'lines.*.lineTotal' => ['required', 'integer', 'min:0'],
        ]);

        $invalid = fn (string $message) => response()->json(['message' => $message], 422);

        $discount = Discount::with(['products', 'categories', 'users'])
            ->whereRaw('lower(code) = ?', [mb_strtolower(trim(Digits::english($data['code'])))])
            ->where('active', true)
            ->first();

        if (! $discount) {
            return $invalid('کد تخفیف نامعتبر است');
        }

        if ($discount->starts_at->isFuture()) {
            return $invalid('این کد تخفیف هنوز فعال نشده است');
        }

        if ($discount->ends_at->isPast()) {
            return $invalid('این کد تخفیف منقضی شده است');
        }

        if ($discount->usage_limit > 0 && $discount->used_count >= $discount->usage_limit) {
            return $invalid('ظرفیت استفاده از این کد تخفیف پر شده است');
        }

        // کد شخصی. این مسیر عمومی است، پس کاربر از توکنِ اختیاری شناخته می‌شود
        $user = $request->user('sanctum');
        if (! $discount->availableTo($user)) {
            return $invalid($user ? 'این کد تخفیف برای حساب شما نیست' : 'برای استفاده از این کد وارد حساب خود شوید');
        }

        $amount = $this->discountAmount($discount, $data['lines'] ?? []);

        if ($amount === null) {
            return $invalid('این کد تخفیف روی کالاهای سبد شما اعمال نمی‌شود');
        }

        return response()->json([
            'discount' => $discount->toApi(),
            'amount' => $amount,
        ]);
    }

    /** null یعنی کد روی هیچ‌کدام از کالاهای سبد اعمال نمی‌شود */
    private function discountAmount(Discount $discount, array $lines): ?int
    {
        $productIds = $discount->products->map(fn ($p) => (string) $p->id)->all();
        $categoryIds = $discount->categories->map(fn ($c) => (string) $c->id)->all();

        $eligible = $lines;
        if ($productIds || $categoryIds) {
            // دسته از خود کالا خوانده می‌شود، نه از چیزی که مرورگر فرستاده.
            // شناسه‌ی غیرعددی نباید به کوئری روی ستون bigint برسد.
            $ids = array_filter(array_map(fn ($line) => (string) $line['productId'], $lines), 'ctype_digit');
            $categoryOf = $categoryIds && $ids
                ? Product::whereIn('id', $ids)->pluck('category_id', 'id')->map(fn ($id) => (string) $id)->all()
                : [];

            $eligible = array_filter($lines, fn ($line) => in_array((string) $line['productId'], $productIds, true)
                || in_array($categoryOf[(string) $line['productId']] ?? null, $categoryIds, true));
        }

        if (! $eligible) {
            return null;
        }

        $base = array_sum(array_column($eligible, 'lineTotal'));

        return $discount->type === 'percent'
            ? (int) round($base * $discount->value / 100)
            : (int) min($discount->value, $base);
    }

    /**
     * ثبت سفارش.
     *
     * هیچ مبلغی از کلاینت پذیرفته نمی‌شود: قیمت هر قلم از خود مدل کالا خوانده
     * می‌شود، تخفیف دوباره سنجیده می‌شود و هزینه‌ی ارسال از تنظیمات سایت می‌آید.
     * موجودی هم در همان تراکنش کم می‌شود تا دو خریدارِ همزمان یک کالا را دوبار
     * نفروشیم.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.variantId' => ['required'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
            'paymentMethod' => ['required', 'in:online,cod,installment'],
            'addressSummary' => ['required', 'string'],
            'preferredDeliveryDate' => ['nullable', 'bail', 'date_format:Y-m-d', 'after_or_equal:today', 'before_or_equal:today +14 days'],
            'discountCode' => ['nullable', 'string'],
        ], [
            'preferredDeliveryDate.date_format' => 'تاریخ تحویل معتبر نیست',
            'preferredDeliveryDate.after_or_equal' => 'تاریخ تحویل نمی‌تواند در گذشته باشد',
            'preferredDeliveryDate.before_or_equal' => 'تاریخ تحویل را حداکثر تا دو هفته‌ی آینده می‌شود انتخاب کرد',
        ]);

        try {
            $order = DB::transaction(function () use ($data, $request) {
                $subtotal = 0;
                $items = [];

                foreach ($data['lines'] as $line) {
                    /** lockForUpdate تا موجودی وسط دو سفارش همزمان منفی نشود */
                    $variant = ProductVariant::whereKey($line['variantId'])->lockForUpdate()->first();
                    if (! $variant) {
                        abort(422, 'یکی از کالاهای سبد دیگر موجود نیست');
                    }

                    $product = Product::with('variants')->find($variant->product_id);
                    if (! $product || $product->status !== 'active' || $product->category_id === null) {
                        abort(422, 'کالای «'.($product?->title ?? $variant->title).'» دیگر در فروشگاه نیست');
                    }

                    if ($variant->stock < $line['quantity']) {
                        abort(422, "موجودی «{$product->title} — {$variant->title}» کافی نیست");
                    }

                    $variant->decrement('stock', $line['quantity']);

                    $subtotal += $variant->price * $line['quantity'];
                    $items[] = [
                        'product_id' => $product->id,
                        'product_variant_id' => $variant->id,
                        'title' => $product->title,
                        'variant_title' => $variant->title,
                        'image' => $product->images[0] ?? '',
                        'unit_price' => $variant->price,
                        'quantity' => $line['quantity'],
                    ];

                    $product->syncPricingFromVariants();
                }

                $discountAmount = 0;
                $discountModel = null;

                if (! empty($data['discountCode'])) {
                    $discountModel = Discount::with(['products', 'categories', 'users'])
                        ->whereRaw('lower(code) = ?', [mb_strtolower(trim(Digits::english($data['discountCode'])))])
                        ->where('active', true)
                        ->first();

                    if ($discountModel
                        && $discountModel->starts_at->isPast()
                        && $discountModel->ends_at->isFuture()
                        && ($discountModel->usage_limit === 0 || $discountModel->used_count < $discountModel->usage_limit)
                        && $discountModel->availableTo($request->user())
                    ) {
                        $lines = array_map(fn ($item) => [
                            'productId' => (string) $item['product_id'],
                            'lineTotal' => $item['unit_price'] * $item['quantity'],
                        ], $items);

                        $discountAmount = $this->discountAmount($discountModel, $lines) ?? 0;
                        if ($discountAmount > 0) {
                            $discountModel->increment('used_count');
                        }
                    }
                }

                $shipping = $this->shippingCost($subtotal - $discountAmount);
                $total = max(0, $subtotal - $discountAmount + $shipping);

                // روش خاموش یا خارج از بازه‌ی مبلغ فقط در صفحه‌ی تسویه پنهان می‌شد؛ درخواست مستقیم آن را می‌پذیرفت
                if ($rejection = SitePayments::rejectionFor($data['paymentMethod'], $total)) {
                    throw ValidationException::withMessages(['paymentMethod' => $rejection]);
                }

                $status = $data['paymentMethod'] === 'online' ? 'pending_payment' : 'processing';

                $order = Order::create([
                    'code' => 'SN-'.random_int(10000, 99999),
                    'user_id' => $request->user()->id,
                    'subtotal' => $subtotal,
                    'discount' => $discountAmount,
                    'discount_id' => $discountAmount > 0 ? $discountModel?->id : null,
                    'shipping_cost' => $shipping,
                    'total' => $total,
                    'status' => $status,
                    'payment_method' => $data['paymentMethod'],
                    'payment_status' => 'unpaid',
                    'address_summary' => $data['addressSummary'],
                    'preferred_delivery_date' => $data['preferredDeliveryDate'] ?? null,
                    'timeline' => [['status' => $status, 'at' => now()->toIso8601String()]],
                ]);

                $order->items()->createMany($items);

                return $order;
            });
        } catch (HttpResponseException $e) {
            throw $e;
        }

        // پرداخت اینترنتی بعد از تراکنش موفق پیامک می‌گیرد، نه همین حالا
        if ($order->status === 'processing') {
            app(SmsSender::class)->order($order, 'order.placed');
            app(MailSender::class)->order($order, 'order.placed');
        }

        return response()->json((new OrderResource($order->load('items')))->resolve(), 201);
    }

    /** قواعد ارسال از تنظیمات سایت می‌آید تا متن نوار اعلان و رفتار از هم جدا نیفتند */
    private function shippingCost(int $payable): int
    {
        $shipping = SiteDocument::payloadFor('settings')['shipping'] ?? [];
        $threshold = (int) ($shipping['freeThreshold'] ?? 0);
        $cost = (int) ($shipping['cost'] ?? 0);

        return $threshold > 0 && $payable >= $threshold ? 0 : $cost;
    }

    public function show(Request $request, string $code): JsonResponse
    {
        $code = Digits::code($code);
        // شناسه‌ی عددی هم پذیرفته می‌شود؛ رشته‌ی غیرعددی نباید به ستون bigint برسد
        $order = Order::with('items')
            ->where('code', $code)
            ->when(ctype_digit($code), fn ($q) => $q->orWhere('id', $code))
            ->first();

        if (! $order) {
            return response()->json(['message' => 'سفارش پیدا نشد'], 404);
        }

        // سفارش دیگران را فقط ادمین می‌بیند
        $user = $request->user();
        if ($order->user_id !== $user?->id && ! $user?->isAdmin()) {
            return response()->json(['message' => 'سفارش پیدا نشد'], 404);
        }

        return response()->json((new OrderResource($order))->resolve());
    }
}
