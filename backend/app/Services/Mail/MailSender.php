<?php

namespace App\Services\Mail;

use App\Models\Campaign;
use App\Models\EmailMessage;
use App\Models\NewsletterSubscriber;
use App\Models\Order;
use App\Models\SiteDocument;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

use function Illuminate\Support\defer;

/**
 * ارسال ایمیل رویدادها. مثل پیامک، ارسال بعد از فرستادن پاسخ به کاربر انجام می‌شود
 * (defer) تا کندی یا خرابی سرویس ایمیل ثبت سفارش را کند یا خراب نکند. هر ارسال،
 * موفق یا ناموفق، در گزارش ایمیل‌ها ثبت می‌شود.
 *
 * اطلاع‌رسانی‌های انبوه از این کلاس رد نمی‌شوند؛ آن‌ها صف دارند (`SendCampaignEmail`).
 */
class MailSender
{
    /** فقط اگر ارسال ایمیل و همین رویداد روشن باشد */
    public function notify(string $event, ?string $email, array $vars = [], array $options = []): void
    {
        $settings = MailSettings::load();
        $config = $settings['events'][$event] ?? null;

        if (! $settings['enabled'] || ! $email || ! $config || ! $config['enabled']) {
            return;
        }

        $subject = $this->render($config['subject'], $vars);
        $body = $this->render($config['body'], $vars);

        // دکمه فقط وقتی معنا دارد که رویداد لینکی برای رفتن داشته باشد
        $link = (string) ($vars['link'] ?? '');
        $options += [
            'ctaUrl' => $link,
            'ctaLabel' => $link ? (MailSettings::EVENTS[$event]['cta'] ?? '') : '',
        ];

        defer(fn () => $this->deliver($settings, $email, $subject, $body, $event, $options));
    }

    /** ارسال فوری برای دکمه‌ی «ایمیل آزمایشی» — با تنظیمات ذخیره‌شده، حتی اگر ارسال خاموش باشد */
    public function sendNow(string $email, string $subject, string $body, string $event = 'test', array $options = []): EmailMessage
    {
        return $this->deliver(MailSettings::load(), $email, $subject, $body, $event, $options);
    }

    public function render(string $template, array $vars): string
    {
        $vars['site'] ??= $this->siteName();

        return strtr($template, collect($vars)->mapWithKeys(fn ($value, $key) => ['{'.$key.'}' => (string) $value])->all());
    }

    /* ------------------------------ رویدادهای سایت ------------------------------ */

    public function order(Order $order, string $event): void
    {
        $order->loadMissing('user');
        $this->notify($event, $order->user?->email, [
            'name' => $order->user?->full_name ?? '',
            'code' => $order->code,
            'total' => number_format((int) $order->total),
            'tracking' => $order->tracking_code ?: 'به‌زودی اعلام می‌شود',
            'link' => $this->frontend('/profile/orders'),
        ]);
    }

    public function passwordReset(User $user, string $token, int $minutes): void
    {
        $this->notify('password.reset', $user->email, [
            'name' => $user->full_name ?: $user->name,
            'minutes' => (string) $minutes,
            'link' => $this->frontend('/login/reset?token='.$token.'&email='.urlencode($user->email)),
        ]);
    }

    public function newsletterConfirm(NewsletterSubscriber $subscriber): void
    {
        $this->notify('newsletter.confirm', $subscriber->email, [
            'link' => $this->frontend('/newsletter/confirm/'.$subscriber->token),
        ]);
    }

    public function newsletterWelcome(NewsletterSubscriber $subscriber): void
    {
        $this->notify('newsletter.welcome', $subscriber->email, [
            'link' => $this->frontend('/'),
        ], ['unsubscribeUrl' => $this->unsubscribeUrl($subscriber)]);
    }

    /**
     * یک نامه از یک اطلاع‌رسانی انبوه. برخلاف بقیه، منتظر نتیجه می‌ماند و آن را برمی‌گرداند
     * تا کارِ صف بداند این گیرنده موفق بوده یا نه و شمارنده‌ها درست بمانند.
     */
    public function campaign(Campaign $campaign, NewsletterSubscriber $subscriber): EmailMessage
    {
        return $this->deliver(
            MailSettings::load(),
            $subscriber->email,
            $campaign->subject,
            $campaign->body,
            'campaign',
            [
                'ctaLabel' => $campaign->cta_label,
                'ctaUrl' => $campaign->cta_url,
                'unsubscribeUrl' => $this->unsubscribeUrl($subscriber),
            ],
        );
    }

    public function unsubscribeUrl(NewsletterSubscriber $subscriber): string
    {
        return $this->frontend('/newsletter/unsubscribe/'.$subscriber->token);
    }

    /* --------------------------------- ارسال --------------------------------- */

    private function deliver(array $settings, string $to, string $subject, string $body, string $event, array $options = []): EmailMessage
    {
        $html = $this->html($subject, $body, $options);
        $status = 'logged';
        $error = null;

        try {
            /*
             * فرستنده‌ی بی‌نام یعنی نامه یا رد می‌شود یا در هرزنامه می‌نشیند، پس
             * نبودنش خطاست نه پیش‌فرض.
             */
            $from = $settings['fromAddress'] ?: throw new \RuntimeException('نشانی فرستنده تنظیم نشده است');

            $mailer = Mail::build($this->transport($settings));
            $mailer->html($html, function ($message) use ($to, $subject, $from, $settings, $options) {
                $message->to($to)->subject($subject)->from($from, $settings['fromName'] ?: $this->siteName());

                /*
                 * سرآیند استاندارد لغو عضویت: صندوق‌های بزرگ کنار خود نامه دکمه‌ی
                 * «لغو عضویت» نشان می‌دهند و کاربر به‌جای «هرزنامه» آن را می‌زند.
                 */
                if ($options['unsubscribeUrl'] ?? null) {
                    $message->getHeaders()->addTextHeader('List-Unsubscribe', '<'.$options['unsubscribeUrl'].'>');
                    $message->getHeaders()->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
                }
            });

            $status = $settings['mailer'] === 'log' ? 'logged' : 'sent';
        } catch (\Throwable $e) {
            $status = 'failed';
            $error = mb_substr($e->getMessage(), 0, 500);
            Log::warning('Email delivery failed', ['mailer' => $settings['mailer'], 'event' => $event, 'error' => $error]);
        }

        return EmailMessage::create([
            'to_address' => $to,
            'event' => $event,
            'subject' => $subject,
            'body' => $body,
            'status' => $status,
            'mailer' => $settings['mailer'],
            'error' => $error,
        ]);
    }

    private function transport(array $settings): array
    {
        if ($settings['mailer'] === 'log') {
            return ['transport' => 'log'];
        }

        return [
            'transport' => 'smtp',
            'host' => $settings['host'],
            'port' => $settings['port'],
            'encryption' => $settings['encryption'] === 'none' ? null : $settings['encryption'],
            'username' => $settings['username'] ?: null,
            'password' => $settings['password'] ?: null,
            'timeout' => 15,
        ];
    }

    private function html(string $subject, string $body, array $options): string
    {
        return view('emails.layout', [
            'title' => $subject,
            'preview' => mb_substr(trim(preg_replace('/\s+/u', ' ', $body)), 0, 120),
            'bodyHtml' => $this->paragraphs($body),
            'ctaLabel' => (string) ($options['ctaLabel'] ?? ''),
            'ctaUrl' => (string) ($options['ctaUrl'] ?? ''),
            'unsubscribeUrl' => (string) ($options['unsubscribeUrl'] ?? ''),
            'siteName' => $this->siteName(),
            'siteUrl' => $this->frontend('/'),
            'accent' => $this->accent(),
        ])->render();
    }

    /**
     * متن ساده‌ی پنل به پاراگراف تبدیل می‌شود: خط خالی یعنی پاراگراف تازه، تک‌خط یعنی
     * شکستن خط. همه‌چیز escape می‌شود، پس هر تگی که ادمین (یا یک مقدار ورودی) بنویسد
     * متن می‌ماند نه کد.
     */
    private function paragraphs(string $body): string
    {
        return collect(preg_split('/\n\s*\n/u', trim($body)))
            ->filter(fn ($block) => trim($block) !== '')
            ->map(fn ($block) => '<p style="margin:0 0 14px 0;">'.nl2br(e(trim($block))).'</p>')
            ->implode('');
    }

    private function siteName(): string
    {
        return SiteDocument::payloadFor('settings')['siteName'] ?? 'سینر';
    }

    /**
     * رنگ اصلی ظاهر سایت، تا نامه با خود سایت یکی به نظر برسد. اعتبارسنجی لازم است
     * چون این مقدار از پنل می‌آید و مستقیم داخل استایل نامه می‌نشیند.
     */
    private function accent(): string
    {
        $brand = (string) (SiteDocument::payloadFor('settings')['theme']['brandHue'] ?? '');

        return preg_match('/^#[0-9a-f]{6}$/i', $brand) ? $brand : '#00b392';
    }

    private function frontend(string $path): string
    {
        return rtrim((string) config('app.frontend_url'), '/').$path;
    }
}
