<?php

namespace App\Services\Sms;

use App\Models\Order;
use App\Models\Product;
use App\Models\RepairRequest;
use App\Models\SiteDocument;
use App\Models\SmsMessage;
use App\Models\StockAlert;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

use function Illuminate\Support\defer;

/**
 * ارسال پیامک رویدادها. پیامک بعد از فرستادن پاسخ به کاربر ارسال می‌شود (defer)، پس
 * کندی یا خرابی سرویس پیامک ثبت سفارش را کند یا خراب نمی‌کند. هر ارسال، موفق یا
 * ناموفق، در گزارش پیامک‌ها ثبت می‌شود.
 */
class SmsSender
{
    /** فقط اگر ارسال پیامک و همین رویداد روشن باشد */
    public function notify(string $event, ?string $phone, array $vars = []): void
    {
        $settings = SmsSettings::load();
        $config = $settings['events'][$event] ?? null;

        if (! $settings['enabled'] || ! $phone || ! $config || ! $config['enabled']) {
            return;
        }

        $text = $this->render($config['template'], $vars);
        defer(fn () => $this->deliver($settings, $phone, $text, $event));
    }

    /** ارسال فوری برای دکمه‌ی «پیامک آزمایشی» — با تنظیمات ذخیره‌شده، حتی اگر ارسال خاموش باشد */
    public function sendNow(string $phone, string $text, string $event = 'test'): SmsMessage
    {
        return $this->deliver(SmsSettings::load(), $phone, $text, $event);
    }

    public function render(string $template, array $vars): string
    {
        $vars['site'] ??= SiteDocument::payloadFor('settings')['siteName'] ?? 'سینر';

        return strtr($template, collect($vars)->mapWithKeys(fn ($value, $key) => ['{'.$key.'}' => (string) $value])->all());
    }

    public function otp(string $phone, string $code): void
    {
        $this->notify('otp', $phone, ['code' => $code]);
    }

    public function order(Order $order, string $event): void
    {
        $order->loadMissing('user');
        $this->notify($event, $order->user?->phone, [
            'name' => $order->user?->full_name ?? '',
            'code' => $order->code,
            'total' => number_format((int) $order->total),
            'tracking' => $order->tracking_code ?: 'به‌زودی اعلام می‌شود',
        ]);
    }

    public function repair(RepairRequest $repair, string $event): void
    {
        $repair->loadMissing('user');
        $this->notify($event, $repair->user?->phone, [
            'name' => $repair->user?->full_name ?? '',
            'code' => $repair->code,
            'cost' => $repair->final_cost ? number_format((int) $repair->final_cost) : 'به‌زودی اعلام می‌شود',
            'warranty' => (string) $repair->warranty_days,
        ]);
    }

    public function backInStock(StockAlert $alert, Product $product): void
    {
        $alert->loadMissing('user');
        $this->notify('back_in_stock', $alert->user?->phone ?: $alert->phone, [
            'name' => $alert->user?->full_name ?? '',
            'product' => $product->title,
            'link' => rtrim((string) config('app.frontend_url'), '/').'/product/'.$product->slug,
        ]);
    }

    private function deliver(array $settings, string $phone, string $text, string $event): SmsMessage
    {
        $status = 'logged';
        $error = null;

        if ($settings['provider'] !== 'log') {
            try {
                $this->viaProvider($settings, $phone, $text);
                $status = 'sent';
            } catch (\Throwable $e) {
                $status = 'failed';
                $error = mb_substr($e->getMessage(), 0, 500);
                Log::warning('SMS delivery failed', ['provider' => $settings['provider'], 'event' => $event, 'error' => $error]);
            }
        }

        return SmsMessage::create([
            'phone' => $phone,
            'event' => $event,
            'message' => $text,
            'status' => $status,
            'provider' => $settings['provider'],
            'error' => $error,
        ]);
    }

    /**
     * هر سرویس API خودش را دارد. این پیاده‌سازی‌ها از مستندات عمومی هر سرویس نوشته شده‌اند
     * و با اولین پیامک آزمایشی از پنل (با اطلاعات واقعی سرویس) باید تأیید شوند.
     */
    private function viaProvider(array $s, string $phone, string $text): void
    {
        $http = Http::timeout(10)->acceptJson();

        match ($s['provider']) {
            'kavenegar' => $this->expect(
                $http->asForm()->post("https://api.kavenegar.com/v1/{$s['apiKey']}/sms/send.json", [
                    'receptor' => $phone, 'sender' => $s['sender'], 'message' => $text,
                ]),
                fn ($json) => ($json['return']['status'] ?? null) === 200,
                fn ($json) => $json['return']['message'] ?? null,
            ),
            'smsir' => $this->expect(
                $http->withHeaders(['X-API-KEY' => $s['apiKey']])->post('https://api.sms.ir/v1/send/bulk', [
                    'lineNumber' => $s['sender'], 'messageText' => $text, 'mobiles' => [$phone],
                ]),
                fn ($json) => ($json['status'] ?? null) === 1,
                fn ($json) => $json['message'] ?? null,
            ),
            'melipayamak' => $this->expect(
                $http->asForm()->post('https://rest.payamak-panel.com/api/SendSMS/SendSMS', [
                    'username' => $s['username'], 'password' => $s['password'],
                    'to' => $phone, 'from' => $s['sender'], 'text' => $text, 'isflash' => 'false',
                ]),
                fn ($json) => (int) ($json['RetStatus'] ?? 0) === 1,
                fn ($json) => $json['StrRetStatus'] ?? null,
            ),
            'ghasedak' => $this->expect(
                $http->asForm()->withHeaders(['apikey' => $s['apiKey']])->post('https://api.ghasedak.me/v2/sms/send/simple', [
                    'message' => $text, 'receptor' => $phone, 'linenumber' => $s['sender'],
                ]),
                fn ($json) => ($json['result']['code'] ?? null) === 200,
                fn ($json) => $json['result']['message'] ?? null,
            ),
            default => throw new \RuntimeException('سرویس پیامک انتخاب نشده است'),
        };
    }

    private function expect(Response $response, callable $ok, callable $message): void
    {
        $json = $response->json() ?? [];
        if (! $response->successful() || ! $ok($json)) {
            throw new \RuntimeException(($message($json) ?: 'پاسخ نامعتبر از سرویس').' (HTTP '.$response->status().')');
        }
    }
}
