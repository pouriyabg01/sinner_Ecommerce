<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * آپلود تصویر.
 *
 * بدون این، تصویرها به data URL تبدیل می‌شدند و چند صد کیلوبایت base64 داخل
 * همان JSON تنظیمات ذخیره می‌شد.
 */
class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'max:2048'],
        ]);

        $path = $request->file('file')->store('uploads', 'public');

        /*
         * نشانی نسبی و نه کامل. `asset()` نشانیِ همین لحظه را داخل پایگاه داده
         * می‌پخت: تصویرهای آپلودشده روی `http://<آی‌پی>` بعد از رفتن به دامنه و
         * https همچنان به نشانی قدیمی اشاره می‌کردند، و مرورگر روی صفحه‌ی امن
         * اصلاً تصویر http را باز نمی‌کند. نسبی یعنی هر جا که سایت بالا بیاید،
         * تصویر هم از همان‌جا خوانده می‌شود.
         */
        return response()->json([
            'url' => '/storage/'.$path,
            'path' => $path,
        ], 201);
    }
}
