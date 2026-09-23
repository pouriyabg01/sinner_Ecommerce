<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteDocument;
use App\Support\HtmlSanitizer;
use App\Support\RepairPickup;
use App\Support\SitePayments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * محتوای صفحه‌ی اصلی، درباره‌ما و تنظیمات سایت.
 * هر سه سندِ کاملی‌اند که یکجا خوانده و یکجا نوشته می‌شوند.
 */
class CmsController extends Controller
{
    public function home(): JsonResponse
    {
        // سندهای ذخیره‌شده پیش از پاک‌سازی هم نباید اسکریپت به صفحه برسانند
        return response()->json(self::sanitizeHome(SiteDocument::payloadFor('home', ['sections' => []])));
    }

    public function saveHome(Request $request): JsonResponse
    {
        return response()->json(SiteDocument::store('home', self::sanitizeHome($request->all())));
    }

    /** HTML سکشن «متن آزاد» بی‌واسطه در صفحه‌ی اصلی نشانده می‌شود */
    private static function sanitizeHome(array $home): array
    {
        foreach ($home['sections'] ?? [] as $i => $section) {
            if (is_array($section) && ($section['type'] ?? null) === 'rich_text' && isset($section['props']['html'])) {
                $home['sections'][$i]['props']['html'] = HtmlSanitizer::clean((string) $section['props']['html']);
            }
        }

        return $home;
    }

    public function about(): JsonResponse
    {
        return response()->json(SiteDocument::payloadFor('about'));
    }

    public function saveAbout(Request $request): JsonResponse
    {
        return response()->json(SiteDocument::store('about', $request->all()));
    }

    /** تنظیماتِ ذخیره‌شده پیش از اضافه شدن روش‌های ورود، این بخش را ندارند؛ پیش‌فرض هر دو روشن است */
    private const DEFAULT_AUTH = ['otp' => true, 'password' => true];

    /**
     * اسکلت سند تنظیمات.
     *
     * روی نصب تازه (پایگاه داده‌ی خالی، بدون داده‌ی نمونه) این سند اصلاً وجود ندارد
     * و پاسخِ ناقص، سمت سایت به خطا می‌خورد؛ مثلاً نبودِ brand کل صفحه را می‌انداخت.
     * پس هر کلیدی که ذخیره نشده باشد، از اینجا پر می‌شود.
     */
    private const DEFAULT_SETTINGS = [
        'siteName' => 'سینر',
        'tagline' => '',
        'brand' => ['mark' => '', 'favicon' => '', 'wordmark' => 'SINNER', 'caption' => ''],
        'phone' => '',
        'email' => '',
        'address' => '',
        'socials' => [],
        'announcement' => ['enabled' => false, 'text' => '', 'href' => ''],
        'shipping' => ['freeThreshold' => 0, 'cost' => 0],
        'footer' => ['description' => '', 'badges' => ['enabled' => false, 'items' => []], 'columns' => []],
        'theme' => ['brandHue' => '#00b392', 'emberHue' => '#ff5c3e', 'radius' => 'soft', 'darkMode' => 'system'],
    ];

    public function settings(): JsonResponse
    {
        $settings = SiteDocument::payloadFor('settings');
        // کلیدهای جاافتاده از اسکلت پر می‌شوند؛ آنچه ذخیره شده دست نمی‌خورد
        $settings += self::DEFAULT_SETTINGS;
        // این سه، خودشان سند تودرتو دارند؛ کلید جاافتاده‌ی داخلی هم باید پر شود
        foreach (['brand', 'footer', 'theme', 'announcement', 'shipping'] as $key) {
            $settings[$key] = ($settings[$key] ?? []) + self::DEFAULT_SETTINGS[$key];
        }
        $settings['footer']['badges'] = ($settings['footer']['badges'] ?? []) + self::DEFAULT_SETTINGS['footer']['badges'];
        $settings['auth'] = ($settings['auth'] ?? []) + self::DEFAULT_AUTH;
        // فروشگاهی که هنوز تنظیمات پرداخت را ذخیره نکرده هم باید روش‌های پیش‌فرض را بگیرد
        $settings['payment'] = SitePayments::settings($settings['payment'] ?? null);
        // فرم تعمیر هم باید روش‌های تحویل را داشته باشد، حتی روی تنظیماتِ ذخیره‌شده‌ی قدیمی
        $settings['repair'] = RepairPickup::settings($settings['repair'] ?? null);

        return response()->json($settings);
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $request->validate([
            'auth.otp' => ['sometimes', 'boolean'],
            'auth.password' => ['sometimes', 'boolean'],
            'shipping.freeThreshold' => ['sometimes', 'integer', 'min:0', 'max:1000000000'],
            'shipping.cost' => ['sometimes', 'integer', 'min:0', 'max:100000000'],
            'payment.methods' => ['sometimes', 'array', 'min:1'],
            'payment.methods.*.id' => ['required', 'in:online,cod,installment'],
            'payment.methods.*.enabled' => ['required', 'boolean'],
            'payment.methods.*.label' => ['required', 'string', 'max:60'],
            'payment.methods.*.hint' => ['sometimes', 'nullable', 'string', 'max:120'],
            'payment.methods.*.minTotal' => ['required', 'integer', 'min:0'],
            'payment.methods.*.maxTotal' => ['required', 'integer', 'min:0'],
            'payment.demo.enabled' => ['sometimes', 'boolean'],
            'payment.demo.outcome' => ['sometimes', 'in:ask,success,failed,cancelled'],
            'payment.demo.delayMs' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'repair.title' => ['sometimes', 'nullable', 'string', 'max:120'],
            'repair.methods' => ['sometimes', 'array', 'min:1'],
            'repair.methods.*.id' => ['required', 'in:courier,post,in_person'],
            'repair.methods.*.enabled' => ['required', 'boolean'],
            'repair.methods.*.label' => ['required', 'string', 'max:60'],
            'repair.methods.*.hint' => ['sometimes', 'nullable', 'string', 'max:160'],
            'repair.methods.*.icon' => ['sometimes', 'nullable', 'string', 'max:40'],
        ], [
            'payment.methods.*.label.required' => 'عنوان روش پرداخت نمی‌تواند خالی بماند',
            'repair.methods.*.label.required' => 'عنوان روش تحویل نمی‌تواند خالی بماند',
        ]);

        $payload = $request->all();
        $auth = ($payload['auth'] ?? []) + self::DEFAULT_AUTH;

        // خاموش شدن هر دو روش یعنی هیچ‌کس، حتی خود ادمین، دیگر نمی‌تواند وارد شود
        if (! $auth['otp'] && ! $auth['password']) {
            return response()->json([
                'message' => 'دست‌کم یکی از روش‌های ورود باید روشن بماند',
                'errors' => ['auth' => ['دست‌کم یکی از روش‌های ورود باید روشن بماند']],
            ], 422);
        }

        $payload['auth'] = ['otp' => (bool) $auth['otp'], 'password' => (bool) $auth['password']];

        if (isset($payload['payment'])) {
            $payment = SitePayments::settings($payload['payment']);

            // با خاموش بودن همه‌ی روش‌ها، مشتری سبد پر دارد ولی راهی برای پرداخت ندارد
            if (! collect($payment['methods'])->contains(fn ($m) => (bool) ($m['enabled'] ?? false))) {
                return response()->json([
                    'message' => 'دست‌کم یک روش پرداخت باید روشن بماند',
                    'errors' => ['payment.methods' => ['دست‌کم یک روش پرداخت باید روشن بماند']],
                ], 422);
            }

            // سقف کمتر از کف یعنی روشی که هیچ سفارشی شرطش را ندارد
            foreach ($payment['methods'] as $i => $method) {
                $min = (int) ($method['minTotal'] ?? 0);
                $max = (int) ($method['maxTotal'] ?? 0);
                if ($min > 0 && $max > 0 && $max < $min) {
                    return response()->json([
                        'message' => 'حداکثر مبلغ نمی‌تواند از حداقل مبلغ کمتر باشد',
                        'errors' => ["payment.methods.{$i}.maxTotal" => ['حداکثر مبلغ نمی‌تواند از حداقل مبلغ کمتر باشد']],
                    ], 422);
                }
            }

            $payload['payment'] = $payment;
        }

        if (isset($payload['repair'])) {
            $repair = RepairPickup::settings($payload['repair']);

            // با خاموش بودن هر سه روش، مشتری در مرحله‌ی تحویل هیچ گزینه‌ای ندارد
            if (! collect($repair['methods'])->contains(fn ($m) => (bool) ($m['enabled'] ?? false))) {
                return response()->json([
                    'message' => 'دست‌کم یک روش تحویل دستگاه باید روشن بماند',
                    'errors' => ['repair.methods' => ['دست‌کم یک روش تحویل دستگاه باید روشن بماند']],
                ], 422);
            }

            $payload['repair'] = $repair;
        }

        return response()->json(SiteDocument::store('settings', $payload));
    }
}
