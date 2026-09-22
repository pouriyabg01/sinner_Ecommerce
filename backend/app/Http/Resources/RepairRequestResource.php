<?php

namespace App\Http\Resources;

use App\Support\RepairStatusFlow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RepairRequestResource extends JsonResource
{
    /** پنل بدون شماره‌ی مشتری نمی‌تواند هماهنگ کند، پس در حالت ادمین ضمیمه می‌شود */
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
            'deviceKind' => $this->device_kind,
            'deviceBrand' => $this->device_brand,
            'deviceModel' => $this->device_model,
            'issueIds' => $this->issues->map(fn ($issue) => (string) $issue->id)->values(),
            'issueDescription' => $this->issue_description,
            'photos' => $this->photos ?? [],
            'pickupMethod' => $this->pickup_method,
            'addressSummary' => $this->address_summary,
            'preferredDate' => $this->preferred_date?->toDateString(),
            'status' => $this->status,
            'estimatedCost' => ['min' => (int) $this->estimated_min, 'max' => (int) $this->estimated_max],
            'finalCost' => $this->final_cost !== null ? (int) $this->final_cost : null,
            'technicianNote' => $this->technician_note,
            'warrantyDays' => (int) $this->warranty_days,
            'createdAt' => $this->created_at?->toIso8601String(),
            'timeline' => $this->timeline ?? [],
            'paymentStatus' => $this->payment_status ?? 'unpaid',
            'paymentRef' => $this->payment_ref,
            'approvedAt' => $this->approved_at?->toIso8601String(),
        ];

        if ($this->withCustomer) {
            // پنل فهرست وضعیت‌ها را از سرور می‌گیرد تا گزینه‌ی غیرمجاز اصلاً نشان داده نشود
            $next = RepairStatusFlow::nextForAdmin($this->status);
            $payload['allowedNext'] = $next;

            /*
             * گزینه‌هایی که مرحله‌ی بعدی‌اند ولی الان شرطشان برقرار نیست — با دلیل،
             * تا ادمین به‌جای گزینه‌ی ناپیدا ببیند چرا نمی‌تواند و چه کم است.
             */
            $payload['blockedNext'] = collect($next)
                ->mapWithKeys(fn ($status) => [$status => RepairStatusFlow::requirementFor($status, $this->final_cost)])
                ->filter()
                ->all();

            $payload['customer'] = $this->user ? [
                'id' => (string) $this->user->id,
                'fullName' => $this->user->full_name,
                'phone' => $this->user->phone ?? '',
            ] : null;
        }

        return $payload;
    }
}
