<?php

namespace App\Models;

use App\Contracts\Payable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class RepairRequest extends Model implements Payable
{
    protected $fillable = [
        'code', 'user_id', 'device_kind', 'device_brand', 'device_model', 'issue_description',
        'photos', 'pickup_method', 'address_summary', 'preferred_date', 'status',
        'estimated_min', 'estimated_max', 'final_cost', 'technician_note', 'warranty_days', 'timeline',
        'approved_at', 'payment_status', 'payment_driver', 'payment_transaction_id',
        'payment_ref', 'payment_verified_at',
    ];

    protected $casts = [
        'photos' => 'array',
        'timeline' => 'array',
        'preferred_date' => 'date',
        'estimated_min' => 'integer',
        'estimated_max' => 'integer',
        'final_cost' => 'integer',
        'warranty_days' => 'integer',
        'approved_at' => 'datetime',
        'payment_verified_at' => 'datetime',
    ];

    public function issues(): BelongsToMany
    {
        return $this->belongsToMany(RepairIssue::class, 'repair_request_issue');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pushTimeline(string $status, ?string $note = null): void
    {
        $entry = array_filter(['status' => $status, 'at' => now()->toIso8601String(), 'note' => $note]);
        $this->timeline = [...($this->timeline ?? []), $entry];
        $this->status = $status;
    }

    /* ------------------------------ قرارداد پرداخت ------------------------------ */

    /**
     * هزینه‌ی نهایی همان چیزی است که ادمین بعد از عیب‌یابی ثبت کرده و مشتری
     * تأییدش کرده — برآورد اولیه (کف و سقف) هیچ‌وقت مبنای پرداخت نیست.
     */
    public function payableAmount(): int
    {
        return (int) ($this->final_cost ?? 0);
    }

    public function payableCode(): string
    {
        return $this->code;
    }

    public function payableTitle(): string
    {
        return 'هزینه تعمیر '.$this->code;
    }

    public function payableUser(): ?User
    {
        return $this->user;
    }

    public function payableType(): string
    {
        return 'repair';
    }

    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }

    /** پرداخت موفق، تعمیر را وارد مرحله‌ی کار می‌کند */
    public function markPaid(string $referenceId): void
    {
        $this->payment_status = 'paid';
        $this->payment_ref = $referenceId;
        $this->payment_verified_at = now();
        $this->pushTimeline('repairing', 'هزینه‌ی تعمیر پرداخت شد');
        $this->save();
    }

    /** پرداخت ناموفق درخواست را عقب نمی‌برد؛ همان «در انتظار پرداخت» می‌ماند */
    public function markPaymentFailed(string $status, string $note): void
    {
        $this->payment_status = $status;
        $this->pushTimeline('awaiting_payment', $note);
        $this->save();
    }
}
