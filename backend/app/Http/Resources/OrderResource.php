<?php

namespace App\Http\Resources;

use App\Support\OrderStatusFlow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /** پنل بدون نام و شماره‌ی مشتری نمی‌تواند هماهنگ کند، پس در حالت ادمین ضمیمه می‌شود */
    public function __construct($resource, private bool $withCustomer = false)
    {
        parent::__construct($resource);
    }

    public static function forAdmin($resource): self
    {
        return new self($resource, true);
    }

    public function toArray(Request $request): array
    {
        $payload = [
            'id' => (string) $this->id,
            'code' => $this->code,
            'userId' => (string) $this->user_id,
            'items' => $this->items->map(fn ($item) => array_filter([
                'productId' => $item->product_id ? (string) $item->product_id : '',
                'title' => $item->title,
                'image' => $item->image,
                'variantTitle' => $item->variant_title,
                'unitPrice' => (int) $item->unit_price,
                'quantity' => (int) $item->quantity,
            ], fn ($value) => $value !== null))->values(),
            'subtotal' => (int) $this->subtotal,
            'discount' => (int) $this->discount,
            'shippingCost' => (int) $this->shipping_cost,
            'total' => (int) $this->total,
            'status' => $this->status,
            'paymentMethod' => $this->payment_method,
            'paymentStatus' => $this->payment_status,
            'paymentRef' => $this->payment_ref,
            'addressSummary' => $this->address_summary,
            'preferredDeliveryDate' => $this->preferred_delivery_date?->toDateString(),
            'trackingCode' => $this->tracking_code,
            'createdAt' => $this->created_at?->toIso8601String(),
            'timeline' => $this->timeline ?? [],
        ];

        if ($this->withCustomer) {
            // پنل فهرست وضعیت‌ها را از سرور می‌گیرد تا گزینه‌ی غیرمجاز اصلاً نشان داده نشود
            $payload['allowedNext'] = OrderStatusFlow::nextFor($this->status);

            $payload['customer'] = $this->user ? [
                'id' => (string) $this->user->id,
                'fullName' => $this->user->full_name,
                'phone' => $this->user->phone ?? '',
            ] : null;
        }

        return $payload;
    }
}
