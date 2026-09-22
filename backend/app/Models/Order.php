<?php

namespace App\Models;

use App\Contracts\Payable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model implements Payable
{
    protected $fillable = [
        'code', 'user_id', 'subtotal', 'discount', 'discount_id', 'shipping_cost', 'total',
        'status', 'payment_method', 'payment_status', 'payment_ref', 'address_summary',
        'payment_driver', 'payment_transaction_id', 'payment_verified_at',
        'preferred_delivery_date', 'tracking_code', 'timeline',
    ];

    protected $casts = [
        'timeline' => 'array',
        'preferred_delivery_date' => 'date',
        'payment_verified_at' => 'datetime',
        'subtotal' => 'integer',
        'discount' => 'integer',
        'shipping_cost' => 'integer',
        'total' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** یک مرحله به تاریخچه اضافه می‌کند و وضعیت را جلو می‌برد */
    public function pushTimeline(string $status, ?string $note = null): void
    {
        $entry = array_filter(['status' => $status, 'at' => now()->toIso8601String(), 'note' => $note]);
        $this->timeline = [...($this->timeline ?? []), $entry];
        $this->status = $status;
    }

    /* ------------------------------ قرارداد پرداخت ------------------------------ */

    public function payableCode(): string
    {
        return $this->code;
    }

    public function payableAmount(): int
    {
        return (int) $this->total;
    }

    public function payableTitle(): string
    {
        return 'پرداخت سفارش '.$this->code;
    }

    public function payableUser(): ?User
    {
        return $this->user;
    }

    public function payableType(): string
    {
        return 'order';
    }

    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }

    public function markPaid(string $referenceId): void
    {
        $this->payment_status = 'paid';
        $this->payment_ref = $referenceId;
        $this->payment_verified_at = now();
        $this->pushTimeline('processing', 'پرداخت با موفقیت انجام شد');
        $this->save();
    }

    public function markPaymentFailed(string $status, string $note): void
    {
        $this->payment_status = $status;
        $this->pushTimeline('pending_payment', $note);
        $this->save();
    }
}
