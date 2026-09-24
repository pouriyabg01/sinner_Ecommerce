<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignSend;
use App\Models\NewsletterSubscriber;
use App\Services\Mail\MailSender;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * ارسال یک اطلاع‌رسانی به همه‌ی مشترکان.
 *
 * هر بار فقط یک دسته‌ی کوچک فرستاده می‌شود و بعد کار خودش را دوباره در صف می‌گذارد.
 * سه دلیل: کار طولانی به سقف زمانی صف نمی‌خورد؛ سرویس ایمیل با صدها نامه‌ی پشت‌سرهم
 * ما را محدود نمی‌کند؛ و اگر وسط کار چیزی بترکد، دسته‌های فرستاده‌شده دوباره فرستاده
 * نمی‌شوند چون هر گیرنده در `campaign_sends` ردیف دارد.
 */
class SendCampaign implements ShouldQueue
{
    use Queueable;

    private const CHUNK = 50;

    private const PAUSE_SECONDS = 5;

    public function __construct(public int $campaignId) {}

    public function handle(MailSender $mail): void
    {
        $campaign = Campaign::find($this->campaignId);

        if (! $campaign || $campaign->status !== 'sending') {
            return;
        }

        // زیرپرس‌وجو و نه فهرست شناسه‌ها: با هزاران مشترک، فهرست هم حافظه می‌خورد و هم پرس‌وجو را باد می‌کند
        $batch = NewsletterSubscriber::active()
            ->whereNotIn('id', CampaignSend::where('campaign_id', $campaign->id)->select('subscriber_id'))
            ->orderBy('id')
            ->limit(self::CHUNK)
            ->get();

        if ($batch->isEmpty()) {
            $campaign->update(['status' => 'sent', 'sent_at' => now()]);

            return;
        }

        foreach ($batch as $subscriber) {
            $message = $mail->campaign($campaign, $subscriber);

            CampaignSend::create([
                'campaign_id' => $campaign->id,
                'subscriber_id' => $subscriber->id,
                'status' => $message->status,
                'error' => $message->error,
            ]);

            $campaign->increment($message->status === 'failed' ? 'failed_count' : 'sent_count');
        }

        self::dispatch($campaign->id)->delay(now()->addSeconds(self::PAUSE_SECONDS));
    }
}
