<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsMessage;
use App\Services\Sms\SmsSender;
use App\Services\Sms\SmsSettings;
use App\Support\Digits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** پنل پیامک: اتصال سرویس، متن رویدادها، پیامک آزمایشی و گزارش ارسال‌ها */
class SmsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(SmsSettings::forAdmin());
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'provider' => ['required', Rule::in(SmsSettings::PROVIDERS)],
            'sender' => ['nullable', 'string', 'max:30'],
            'username' => ['nullable', 'string', 'max:60'],
            'apiKey' => ['nullable', 'string', 'max:200'],
            'password' => ['nullable', 'string', 'max:100'],
            'events' => ['array'],
            'events.*.enabled' => ['boolean'],
            'events.*.template' => ['nullable', 'string', 'max:500'],
        ]);

        SmsSettings::save($data);

        return response()->json(SmsSettings::forAdmin());
    }

    public function test(Request $request, SmsSender $sms): JsonResponse
    {
        $request->merge(['phone' => Digits::english(preg_replace('/\s+/', '', (string) $request->input('phone')))]);
        $data = $request->validate(['phone' => ['required', 'regex:/^09\d{9}$/']], [
            'phone.regex' => 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود',
        ]);

        $message = $sms->sendNow(
            $data['phone'],
            $sms->render('پیامک آزمایشی {site} — اگر این پیام را می‌بینید، اتصال سرویس پیامک درست است.', []),
        );

        if ($message->status === 'failed') {
            return response()->json(['message' => 'ارسال ناموفق بود: '.$message->error], 422);
        }

        return response()->json([
            'ok' => true,
            'status' => $message->status,
            'message' => $message->status === 'logged'
                ? 'حالت آزمایشی است؛ پیامک فقط در گزارش ثبت شد'
                : 'پیامک آزمایشی ارسال شد',
        ]);
    }

    public function messages(): JsonResponse
    {
        return response()->json(SmsMessage::latest('id')->limit(50)->get()->map(fn (SmsMessage $m) => [
            'id' => (string) $m->id,
            'phone' => $m->phone,
            'event' => $m->event,
            'eventLabel' => SmsSettings::EVENTS[$m->event]['label'] ?? ($m->event === 'test' ? 'پیامک آزمایشی' : $m->event),
            'message' => $m->message,
            'status' => $m->status,
            'provider' => $m->provider,
            'error' => $m->error,
            'createdAt' => $m->created_at?->toIso8601String(),
        ]));
    }
}
