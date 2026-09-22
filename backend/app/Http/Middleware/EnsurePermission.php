<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * گارد دسترسی پنل.
 *
 * تا امروز دسترسی‌ها فقط در مرورگر چک می‌شدند، یعنی عملاً هیچ: کافی بود کسی
 * درخواست را دستی بزند. هر مسیر پنل باید از اینجا رد شود.
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin() || $user->status !== 'active') {
            return response()->json(['message' => 'دسترسی ندارید'], 403);
        }

        if (! $user->can($permission)) {
            return response()->json(['message' => 'برای این بخش دسترسی ندارید'], 403);
        }

        return $next($request);
    }
}
