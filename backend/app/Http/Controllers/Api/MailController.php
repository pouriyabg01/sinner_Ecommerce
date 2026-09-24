<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailMessage;
use App\Services\Mail\MailSender;
use App\Services\Mail\MailSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** پنل ایمیل: اتصال سرویس، متن رویدادها، ایمیل آزمایشی و گزارش ارسال‌ها */
class MailController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(MailSettings::forAdmin());
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'mailer' => ['required', Rule::in(MailSettings::MAILERS)],
            'host' => ['nullable', 'string', 'max:190'],
            'port' => ['nullable', 'integer', 'between:1,65535'],
            'encryption' => ['nullable', Rule::in(MailSettings::ENCRYPTIONS)],
            'username' => ['nullable', 'string', 'max:190'],
            'password' => ['nullable', 'string', 'max:200'],
            'fromAddress' => ['nullable', 'email', 'max:190'],
            'fromName' => ['nullable', 'string', 'max:100'],
            'events' => ['array'],
            'events.*.enabled' => ['boolean'],
            'events.*.subject' => ['nullable', 'string', 'max:200'],
            'events.*.body' => ['nullable', 'string', 'max:4000'],
        ]);

        MailSettings::save($data);

        return response()->json(MailSettings::forAdmin());
    }

    public function test(Request $request, MailSender $mail): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:190']]);

        $message = $mail->sendNow(
            $data['email'],
            'ایمیل آزمایشی '.($mail->render('{site}', [])),
            "اگر این نامه را می‌بینید، اتصال سرویس ایمیل درست است و نامه‌های سایت به مقصد می‌رسند.\n\nاگر این نامه در پوشه‌ی هرزنامه نشسته بود، یعنی هنوز رکوردهای دی‌ان‌اس فرستنده کامل نیست.",
            'test',
        );

        if ($message->status === 'failed') {
            return response()->json(['message' => 'ارسال ناموفق بود: '.$message->error], 422);
        }

        return response()->json([
            'ok' => true,
            'status' => $message->status,
            'message' => $message->status === 'logged'
                ? 'حالت آزمایشی است؛ ایمیل فقط در گزارش ثبت شد'
                : 'ایمیل آزمایشی ارسال شد',
        ]);
    }

    public function messages(): JsonResponse
    {
        return response()->json(EmailMessage::latest('id')->limit(50)->get()->map(fn (EmailMessage $m) => [
            'id' => (string) $m->id,
            'email' => $m->to_address,
            'event' => $m->event,
            'eventLabel' => MailSettings::EVENTS[$m->event]['label'] ?? match ($m->event) {
                'test' => 'ایمیل آزمایشی',
                'campaign' => 'اطلاع‌رسانی',
                default => $m->event,
            },
            'subject' => $m->subject,
            'body' => $m->body,
            'status' => $m->status,
            'mailer' => $m->mailer,
            'error' => $m->error,
            'createdAt' => $m->created_at?->toIso8601String(),
        ]));
    }
}
