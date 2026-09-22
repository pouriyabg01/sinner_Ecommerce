<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RepairRequestResource;
use App\Models\RepairIssue;
use App\Models\RepairRequest;
use App\Services\Sms\SmsSender;
use App\Support\Digits;
use App\Support\RepairPickup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class RepairController extends Controller
{
    /** فرم ثبت تعمیر فقط مشکلات همان نوع دستگاه را می‌خواهد */
    public function issues(Request $request): JsonResponse
    {
        $kind = $request->query('deviceKind');

        $issues = RepairIssue::query()
            ->when($kind, fn ($q) => $q->whereRaw('device_kinds @> ?', [json_encode([$kind])]))
            ->get();

        return response()->json($issues->map(fn (RepairIssue $issue) => [
            'id' => (string) $issue->id,
            'deviceKinds' => $issue->device_kinds ?? [],
            'title' => $issue->title,
            'hint' => $issue->hint,
            'icon' => $issue->icon,
            'estimatedMin' => (int) $issue->estimated_min,
            'estimatedMax' => (int) $issue->estimated_max,
            'estimatedDays' => (int) $issue->estimated_days,
        ]));
    }

    /** برآورد هزینه از روی مشکلات انتخاب‌شده — سرور حساب می‌کند، نه فرم */
    public function estimate(Request $request): JsonResponse
    {
        $data = $request->validate(['issueIds' => ['array']]);

        return response()->json($this->estimateFor($data['issueIds'] ?? []));
    }

    private function estimateFor(array $issueIds): array
    {
        $issues = RepairIssue::whereIn('id', $issueIds)->get();

        if ($issues->isEmpty()) {
            return ['min' => 0, 'max' => 0, 'days' => 0];
        }

        return [
            'min' => (int) $issues->sum('estimated_min'),
            'max' => (int) $issues->sum('estimated_max'),
            'days' => (int) $issues->max('estimated_days'),
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'deviceKind' => ['required', 'in:mobile,laptop,console,tablet,desktop,other'],
            'deviceBrand' => ['nullable', 'string', 'max:60'],
            'deviceModel' => ['nullable', 'string', 'max:60'],
            'issueIds' => ['array'],
            'issueDescription' => ['nullable', 'string', 'max:2000'],
            'photos' => ['array'],
            'pickupMethod' => ['required', 'in:courier,post,in_person'],
            'addressSummary' => ['nullable', 'string'],
            'preferredDate' => ['nullable', 'date'],
        ]);

        // روشی که ادمین در تنظیمات خاموش کرده، با درخواست مستقیم هم نباید ثبت شود
        if ($rejection = RepairPickup::rejectionFor($data['pickupMethod'])) {
            return response()->json([
                'message' => $rejection,
                'errors' => ['pickupMethod' => [$rejection]],
            ], 422);
        }

        $estimate = $this->estimateFor($data['issueIds'] ?? []);

        $repair = RepairRequest::create([
            'code' => 'RP-'.random_int(10000, 99999),
            'user_id' => $request->user()->id,
            'device_kind' => $data['deviceKind'],
            'device_brand' => $data['deviceBrand'] ?? '',
            'device_model' => $data['deviceModel'] ?? '',
            'issue_description' => $data['issueDescription'] ?? '',
            'photos' => $data['photos'] ?? [],
            'pickup_method' => $data['pickupMethod'],
            'address_summary' => $data['addressSummary'] ?? '',
            'preferred_date' => $data['preferredDate'] ?? null,
            'status' => 'submitted',
            'estimated_min' => $estimate['min'],
            'estimated_max' => $estimate['max'],
            'warranty_days' => 0,
            'timeline' => [['status' => 'submitted', 'at' => now()->toIso8601String()]],
        ]);

        $repair->issues()->sync($data['issueIds'] ?? []);
        app(SmsSender::class)->repair($repair, 'repair.submitted');

        return response()->json((new RepairRequestResource($repair->load('issues')))->resolve(), 201);
    }

    /** پیگیری با کد رهگیری — بدون ورود هم کار می‌کند، چون کد خودش راز است */
    public function track(string $code): JsonResponse
    {
        // مشتری ممکن است کد را با ارقام فارسی یا حروف کوچک تایپ کند
        $repair = RepairRequest::with('issues')->where('code', Digits::code($code))->first();

        if (! $repair) {
            return response()->json(['message' => 'درخواستی با این کد پیدا نشد'], 404);
        }

        // این مسیر عمومی است و فقط با کد باز می‌شود؛ نشانی، عکس‌ها و شرح مشتری نباید با حدس زدن کد لو برود
        return response()->json(Arr::except(
            (new RepairRequestResource($repair))->resolve(),
            ['userId', 'addressSummary', 'photos', 'issueDescription'],
        ));
    }

    /**
     * تصمیم مشتری درباره‌ی برآورد هزینه.
     *
     * تا پیش از این پیامک «برای تأیید به پنل کاربری سر بزنید» فرستاده می‌شد ولی
     * هیچ راهی برای تأیید وجود نداشت و هزینه‌ی تعمیر هم هیچ‌وقت پرداخت نمی‌شد.
     *
     * تأیید، درخواست را به «در انتظار پرداخت» می‌برد و از آنجا همان درگاهی که
     * برای فروشگاه تنظیم شده پول را می‌گیرد.
     */
    public function decide(Request $request, string $code): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:300'],
        ]);

        $repair = RepairRequest::with('issues')
            ->where('code', Digits::code($code))
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $repair) {
            return response()->json(['message' => 'درخواست تعمیر پیدا نشد'], 404);
        }

        if ($repair->status !== 'awaiting_approval') {
            return response()->json([
                'message' => 'این درخواست در مرحله‌ی تأیید هزینه نیست',
            ], 422);
        }

        if ($data['decision'] === 'reject') {
            $repair->pushTimeline('rejected', trim((string) ($data['reason'] ?? '')) ?: 'مشتری هزینه‌ی تعمیر را نپذیرفت');
            $repair->save();

            return response()->json(RepairRequestResource::make($repair->fresh('issues'))->resolve());
        }

        // بدون هزینه‌ی نهایی، تأیید یعنی پذیرفتن مبلغی که هنوز اعلام نشده
        if (! $repair->final_cost) {
            return response()->json([
                'message' => 'هزینه‌ی نهایی هنوز ثبت نشده است؛ با پشتیبانی تماس بگیرید',
            ], 422);
        }

        $repair->approved_at = now();
        $repair->pushTimeline('awaiting_payment', 'مشتری هزینه‌ی تعمیر را تأیید کرد');
        $repair->save();

        return response()->json(RepairRequestResource::make($repair->fresh('issues'))->resolve());
    }
}
