<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * برای بخش‌هایی که هر ادمینی لازمشان دارد و دسترسیِ جدا برایشان معنا ندارد —
 * فعلاً فقط کتابخانه‌ی تصویرها.
 *
 * کسی که کالا، برند یا صفحه‌ی اصلی را ویرایش می‌کند ناچار باید تصویر هم بگذارد،
 * پس دسترسیِ مستقل برایش فقط یک تیکِ اضافه بود که همیشه باید زده می‌شد.
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin() || $user->status !== 'active') {
            return response()->json(['message' => 'دسترسی ندارید'], 403);
        }

        return $next($request);
    }
}
