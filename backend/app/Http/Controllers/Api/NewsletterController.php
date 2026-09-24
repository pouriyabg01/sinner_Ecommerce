<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendCampaign;
use App\Models\Campaign;
use App\Models\NewsletterSubscriber;
use App\Services\Mail\MailSender;
use App\Services\Mail\MailSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * خبرنامه: عضویت عمومی و مدیریت اطلاع‌رسانی‌ها در پنل.
 *
 * عضویت دومرحله‌ای است. ثبت ایمیل کافی نیست؛ تا وقتی صاحب ایمیل روی لینک تأیید نزده
 * باشد `pending` می‌ماند و هیچ اطلاع‌رسانی‌ای نمی‌گیرد. این هم جلوی ثبت ایمیل دیگران
 * را می‌گیرد و هم تنها چیزی است که نمی‌گذارد نشانی فرستنده‌ی سایت سوخته شود.
 */
class NewsletterController extends Controller
{
    /* --------------------------------- عمومی --------------------------------- */

    public function subscribe(Request $request, MailSender $mail): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:190']]);
        $email = mb_strtolower(trim($data['email']));

        $subscriber = NewsletterSubscriber::firstOrNew(['email' => $email]);

        /*
         * پاسخ برای عضو فعال هم «ثبت شد» است نه «قبلاً عضو بودید»: این فرم عمومی
         * است و نباید بشود با آن فهمید کدام ایمیل در فهرست ما هست.
         */
        if ($subscriber->exists && $subscriber->status === 'active') {
            return response()->json(['ok' => true, 'status' => 'active']);
        }

        // توکن با هر تلاش تازه می‌شود تا لینک نامه‌های قبلی از کار بیفتد
        $subscriber->fill([
            'token' => NewsletterSubscriber::newToken(),
            'status' => 'pending',
            'confirmed_at' => null,
            'unsubscribed_at' => null,
        ])->save();

        $mail->newsletterConfirm($subscriber);

        return response()->json(['ok' => true, 'status' => 'pending']);
    }

    public function confirm(string $token, MailSender $mail): JsonResponse
    {
        $subscriber = NewsletterSubscriber::where('token', $token)->first();

        if (! $subscriber) {
            return response()->json(['message' => 'این لینک معتبر نیست یا منقضی شده است'], 404);
        }

        if ($subscriber->status !== 'active') {
            $subscriber->update(['status' => 'active', 'confirmed_at' => now(), 'unsubscribed_at' => null]);
            $mail->newsletterWelcome($subscriber);
        }

        return response()->json(['ok' => true, 'email' => $subscriber->email]);
    }

    public function unsubscribe(string $token): JsonResponse
    {
        $subscriber = NewsletterSubscriber::where('token', $token)->first();

        if (! $subscriber) {
            return response()->json(['message' => 'این لینک معتبر نیست یا منقضی شده است'], 404);
        }

        /*
         * ردیف پاک نمی‌شود: باید بدانیم این ایمیل خودش لغو کرده تا اگر روزی دوباره
         * در فهرستی وارد شد، بی‌اجازه برایش نفرستیم.
         */
        $subscriber->update(['status' => 'unsubscribed', 'unsubscribed_at' => now()]);

        return response()->json(['ok' => true, 'email' => $subscriber->email]);
    }

    /* ---------------------------------- پنل ---------------------------------- */

    public function subscribers(): JsonResponse
    {
        return response()->json([
            'items' => NewsletterSubscriber::latest('id')->limit(500)->get()->map($this->subscriberRow(...)),
            /*
             * با ارسال ایمیلِ خاموش، نامه‌ی تأیید نمی‌رود و هر عضو تازه برای همیشه
             * «در انتظار تأیید» می‌ماند. پنل باید این را بگوید، وگرنه مدیر فقط
             * فهرستی از ردیف‌های راکد می‌بیند و دلیلش را نمی‌داند.
             */
            'mailEnabled' => MailSettings::load()['enabled'],
            'counts' => [
                'active' => NewsletterSubscriber::where('status', 'active')->count(),
                'pending' => NewsletterSubscriber::where('status', 'pending')->count(),
                'unsubscribed' => NewsletterSubscriber::where('status', 'unsubscribed')->count(),
            ],
        ]);
    }

    public function destroySubscriber(NewsletterSubscriber $subscriber): JsonResponse
    {
        $subscriber->delete();

        return response()->json(['ok' => true]);
    }

    public function campaigns(): JsonResponse
    {
        return response()->json(Campaign::latest('id')->get()->map($this->campaignRow(...)));
    }

    public function storeCampaign(Request $request): JsonResponse
    {
        $campaign = Campaign::create($this->campaignData($request));

        // وضعیت و شمارنده‌ها پیش‌فرضِ پایگاه داده‌اند و تا خوانده نشوند خالی‌اند
        return response()->json($this->campaignRow($campaign->refresh()), 201);
    }

    public function updateCampaign(Request $request, Campaign $campaign): JsonResponse
    {
        $this->assertDraft($campaign);
        $campaign->update($this->campaignData($request));

        return response()->json($this->campaignRow($campaign));
    }

    public function destroyCampaign(Campaign $campaign): JsonResponse
    {
        $campaign->delete();

        return response()->json(['ok' => true]);
    }

    /** ارسال آزمایشی به یک نشانی دلخواه، تا قبل از ارسال انبوه ظاهر نامه دیده شود */
    public function testCampaign(Request $request, Campaign $campaign, MailSender $mail): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:190']]);

        $message = $mail->sendNow($data['email'], $campaign->subject, $campaign->body, 'campaign', [
            'ctaLabel' => $campaign->cta_label,
            'ctaUrl' => $campaign->cta_url,
        ]);

        if ($message->status === 'failed') {
            return response()->json(['message' => 'ارسال ناموفق بود: '.$message->error], 422);
        }

        return response()->json(['ok' => true, 'status' => $message->status]);
    }

    public function sendCampaign(Campaign $campaign): JsonResponse
    {
        $this->assertDraft($campaign);

        /*
         * کلید «ارسال ایمیل» در صفحه‌ی ایمیل باید اینجا هم بچربد. بدون این، خاموش‌کردنش
         * فقط جلوی نامه‌های خودکار را می‌گرفت و ارسال انبوه از کنارش رد می‌شد.
         */
        if (! MailSettings::load()['enabled']) {
            return response()->json(['message' => 'ارسال ایمیل خاموش است؛ اول از صفحه‌ی ایمیل روشنش کنید'], 422);
        }

        $recipients = NewsletterSubscriber::active()->count();

        if ($recipients === 0) {
            return response()->json(['message' => 'هیچ مشترک تأییدشده‌ای وجود ندارد'], 422);
        }

        $campaign->update([
            'status' => 'sending',
            'recipients' => $recipients,
            'sent_count' => 0,
            'failed_count' => 0,
            'sent_at' => null,
        ]);

        SendCampaign::dispatch($campaign->id);

        return response()->json($this->campaignRow($campaign->fresh()));
    }

    /* --------------------------------- کمکی‌ها --------------------------------- */

    private function campaignData(Request $request): array
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:8000'],
            'ctaLabel' => ['nullable', 'string', 'max:60'],
            'ctaUrl' => ['nullable', 'url', 'max:500'],
        ]);

        return [
            'subject' => trim($data['subject']),
            'body' => trim($data['body']),
            'cta_label' => trim((string) ($data['ctaLabel'] ?? '')),
            'cta_url' => trim((string) ($data['ctaUrl'] ?? '')),
        ];
    }

    /** نامه‌ی فرستاده‌شده برگشت‌پذیر نیست، پس بعد از شروع ارسال هیچ ویرایشی پذیرفته نمی‌شود */
    private function assertDraft(Campaign $campaign): void
    {
        abort_if($campaign->status !== 'draft', 409, 'این اطلاع‌رسانی فرستاده شده و دیگر تغییر نمی‌کند');
    }

    private function subscriberRow(NewsletterSubscriber $s): array
    {
        return [
            'id' => (string) $s->id,
            'email' => $s->email,
            'status' => $s->status,
            'confirmedAt' => $s->confirmed_at?->toIso8601String(),
            'createdAt' => $s->created_at?->toIso8601String(),
        ];
    }

    private function campaignRow(Campaign $c): array
    {
        return [
            'id' => (string) $c->id,
            'subject' => $c->subject,
            'body' => $c->body,
            'ctaLabel' => $c->cta_label,
            'ctaUrl' => $c->cta_url,
            'status' => $c->status,
            'recipients' => $c->recipients,
            'sentCount' => $c->sent_count,
            'failedCount' => $c->failed_count,
            'sentAt' => $c->sent_at?->toIso8601String(),
            'createdAt' => $c->created_at?->toIso8601String(),
        ];
    }
}
