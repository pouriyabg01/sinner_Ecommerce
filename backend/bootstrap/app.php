<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        /*
         * اسناد CMS (تنظیمات، صفحه‌ی اصلی، درباره‌ما) همان‌طور که فرستاده شده‌اند ذخیره
         * می‌شوند. بدون این استثنا، هر رشته‌ی خالی داخلشان (مثل شناسه‌ی پذیرنده یا متن
         * اختیاری) null می‌شد و فرم پنل بار بعد دیگر اعتبارسنجی نمی‌شد.
         */
        $middleware->convertEmptyStringsToNull(except: [
            fn (\Illuminate\Http\Request $request) => $request->is('api/v1/cms/*'),
        ]);

        $middleware->alias(['permission' => \App\Http\Middleware\EnsurePermission::class]);

        // این یک API است و صفحه‌ی ورود ندارد؛ مهمانِ احراز نشده باید ۴۰۱ بگیرد،
        // نه ریدایرکت به روتی که اصلاً وجود ندارد.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
