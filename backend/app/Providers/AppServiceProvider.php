<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $tooMany = fn () => response()->json([
            'message' => 'تعداد درخواست‌ها زیاد است؛ چند دقیقه‌ی دیگر دوباره امتحان کنید',
        ], 429);

        // ورود و ثبت‌نام: جلوی حدس زدن رمز یک حساب، و حمله‌ی گسترده از یک آی‌پی
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(5)
                ->by('login:'.mb_strtolower((string) $request->input('identifier')).'|'.$request->ip())
                ->response($tooMany),
            Limit::perMinute(30)->by('login-ip:'.$request->ip())->response($tooMany),
        ]);

        // هر کد پیامکی هزینه دارد؛ بدون سقف، هر کسی می‌توانست برای یک شماره پیامک پشت پیامک بفرستد
        RateLimiter::for('otp', fn (Request $request) => [
            Limit::perMinutes(10, 3)->by('otp:'.$request->input('phone'))->response($tooMany),
            Limit::perHour(20)->by('otp-ip:'.$request->ip())->response($tooMany),
        ]);

        // کد پیگیری تعمیر و کد تخفیف را نباید بشود با امتحان کردن پشت‌سرهم پیدا کرد
        RateLimiter::for('lookup', fn (Request $request) => Limit::perMinute(20)
            ->by('lookup:'.$request->ip())
            ->response($tooMany));
    }
}
